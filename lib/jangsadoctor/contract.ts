import { createHash } from "node:crypto";

export const JANGSADOCTOR_SCHEMA_VERSION = "1.0.0" as const;

export type ImportIssue = {
  path: string;
  code: string;
  message: string;
};

export type JangsadoctorPreview = {
  valid: boolean;
  sourceCompanyId: string | null;
  storeName: string | null;
  snapshotHash: string | null;
  revenue: {
    rowCount: number;
    totalAmount: number | null;
    totalCount: number | null;
    missingDates: string[];
    zeroAmountDates: string[];
  };
  errors: ImportIssue[];
  warnings: ImportIssue[];
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(list: ImportIssue[], path: string, code: string, message: string) {
  list.push({ path, code, message });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateOnly(value: unknown) {
  const normalized = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized ? null : normalized;
}

function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const finish = new Date(`${end}T00:00:00Z`);
  while (cursor <= finish) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

export function previewJangsadoctorImport(input: unknown): JangsadoctorPreview {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const emptyRevenue = { rowCount: 0, totalAmount: null, totalCount: null, missingDates: [] as string[], zeroAmountDates: [] as string[] };
  if (!isRecord(input)) {
    issue(errors, "$", "invalid_payload", "JSON object is required");
    return { valid: false, sourceCompanyId: null, storeName: null, snapshotHash: null, revenue: emptyRevenue, errors, warnings };
  }

  if (input.schema_version !== JANGSADOCTOR_SCHEMA_VERSION) {
    issue(errors, "schema_version", "unsupported_schema", `schema_version must be ${JANGSADOCTOR_SCHEMA_VERSION}`);
  }
  if (input.snapshot_type !== "initial_snapshot" && input.snapshot_type !== "incremental_snapshot") {
    issue(errors, "snapshot_type", "invalid_snapshot_type", "snapshot_type must be initial_snapshot or incremental_snapshot");
  }
  const source = isRecord(input.source) ? input.source : {};
  if (source.system !== "jangsadoctor_erp") issue(errors, "source.system", "invalid_source", "source.system must be jangsadoctor_erp");

  const store = isRecord(input.store) ? input.store : {};
  const sourceCompanyId = text(store.source_company_id) || null;
  const storeName = text(store.store_name) || null;
  if (!sourceCompanyId) issue(errors, "store.source_company_id", "missing_store_key", "source_company_id is required");
  if (!storeName) issue(errors, "store.store_name", "missing_store_name", "store_name is required");

  const platformAccounts = Array.isArray(input.platform_accounts) ? input.platform_accounts : [];
  if (!Array.isArray(input.platform_accounts)) issue(errors, "platform_accounts", "invalid_accounts", "platform_accounts must be an array");
  platformAccounts.forEach((account, index) => {
    if (!isRecord(account) || account.password_value !== null) {
      issue(errors, `platform_accounts[${index}].password_value`, "credential_rejected", "password_value must be null and is never accepted");
    }
  });

  const revenue = isRecord(input.revenue) ? input.revenue : {};
  const daily = Array.isArray(revenue.daily) ? revenue.daily : [];
  if (!Array.isArray(revenue.daily)) issue(errors, "revenue.daily", "invalid_daily_rows", "revenue.daily must be an array");
  const periodStart = dateOnly(revenue.period_start);
  const periodEnd = dateOnly(revenue.period_end);
  if (revenue.status === "collected" && (!periodStart || !periodEnd)) issue(errors, "revenue.period", "invalid_period", "collected revenue requires valid period_start and period_end");
  if (periodStart && periodEnd && periodStart > periodEnd) issue(errors, "revenue.period", "invalid_period_order", "period_start must not be later than period_end");

  let totalAmount = 0;
  let totalCount = 0;
  let hasUnknownAmount = false;
  let hasUnknownCount = false;
  let previousDate = "";
  const seenDates = new Set<string>();
  const zeroAmountDates: string[] = [];
  daily.forEach((row, index) => {
    if (!isRecord(row)) {
      issue(errors, `revenue.daily[${index}]`, "invalid_daily_row", "daily row must be an object");
      return;
    }
    const businessDate = dateOnly(row.date);
    if (!businessDate) issue(errors, `revenue.daily[${index}].date`, "invalid_date", "date must be YYYY-MM-DD");
    else {
      if (seenDates.has(businessDate)) issue(errors, `revenue.daily[${index}].date`, "duplicate_date", "duplicate daily revenue date");
      if (previousDate && businessDate <= previousDate) issue(errors, `revenue.daily[${index}].date`, "unordered_date", "daily revenue must be strictly ascending by date");
      seenDates.add(businessDate);
      previousDate = businessDate;
    }
    if (row.total === null) hasUnknownAmount = true;
    else if (typeof row.total !== "number" || !Number.isFinite(row.total)) issue(errors, `revenue.daily[${index}].total`, "invalid_amount", "total must be a number or null");
    else {
      totalAmount += row.total;
      if (row.total === 0 && businessDate) zeroAmountDates.push(businessDate);
      if (row.total < 0) issue(warnings, `revenue.daily[${index}].total`, "negative_amount", "negative daily amount retained for review");
    }
    if (row.count === null) hasUnknownCount = true;
    else if (typeof row.count !== "number" || !Number.isFinite(row.count) || row.count < 0) issue(errors, `revenue.daily[${index}].count`, "invalid_count", "count must be a non-negative number or null");
    else totalCount += row.count;
  });

  const summary = isRecord(revenue.summary) ? revenue.summary : {};
  if (summary.row_count !== daily.length) issue(errors, "revenue.summary.row_count", "summary_mismatch", "summary.row_count must equal daily row count");
  if (!hasUnknownAmount && summary.total_amount !== totalAmount) issue(errors, "revenue.summary.total_amount", "summary_mismatch", "summary.total_amount must equal daily total");
  if (!hasUnknownCount && summary.total_count !== totalCount) issue(errors, "revenue.summary.total_count", "summary_mismatch", "summary.total_count must equal daily count");

  const missingDates = periodStart && periodEnd ? datesBetween(periodStart, periodEnd).filter((day) => !seenDates.has(day)) : [];
  if (missingDates.length) issue(warnings, "revenue.daily", "missing_dates", `${missingDates.length} date(s) missing from collected period`);

  return {
    valid: errors.length === 0,
    sourceCompanyId,
    storeName,
    snapshotHash: errors.length ? null : `sha256:${createHash("sha256").update(stableJson(input)).digest("hex")}`,
    revenue: {
      rowCount: daily.length,
      totalAmount: hasUnknownAmount ? null : totalAmount,
      totalCount: hasUnknownCount ? null : totalCount,
      missingDates,
      zeroAmountDates,
    },
    errors,
    warnings,
  };
}
