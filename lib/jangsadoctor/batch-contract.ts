import { createHash } from "node:crypto";

export type BatchIssue = {
  path: string;
  code: string;
  message: string;
};

export type SalesHistoryStorePreview = {
  sourceCompanyId: string | null;
  storeName: string | null;
  rowCount: number;
  totalAmount: number | null;
  totalCount: number | null;
  unprovidedDateCount: number;
  zeroAmountRowCount: number;
  errors: BatchIssue[];
  warnings: BatchIssue[];
};

export type SalesHistoryBatchPreview = {
  valid: boolean;
  snapshotHash: string | null;
  storeCount: number;
  validStoreCount: number;
  revenue: {
    rowCount: number;
    totalAmount: number | null;
    totalCount: number | null;
    unprovidedDateCount: number;
    zeroAmountRowCount: number;
  };
  stores: SalesHistoryStorePreview[];
  errors: BatchIssue[];
  warnings: BatchIssue[];
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addIssue(list: BatchIssue[], path: string, code: string, message: string) {
  list.push({ path, code, message });
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateValue(value: unknown) {
  const normalized = stringValue(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized ? null : normalized;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function daysBetween(start: string, end: string) {
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  return Math.floor((last.valueOf() - first.valueOf()) / 86_400_000) + 1;
}

function previewStore(value: unknown, index: number): SalesHistoryStorePreview {
  const errors: BatchIssue[] = [];
  const warnings: BatchIssue[] = [];
  const path = `stores[${index}]`;

  if (!isRecord(value)) {
    addIssue(errors, path, "invalid_store", "매장 항목은 객체여야 합니다.");
    return { sourceCompanyId: null, storeName: null, rowCount: 0, totalAmount: null, totalCount: null, unprovidedDateCount: 0, zeroAmountRowCount: 0, errors, warnings };
  }

  const sourceCompanyId = stringValue(value.source_company_id) || null;
  const storeName = stringValue(value.store_name) || null;
  if (!sourceCompanyId) addIssue(errors, `${path}.source_company_id`, "missing_store_key", "매장 연결키가 없습니다.");
  if (!storeName) addIssue(errors, `${path}.store_name`, "missing_store_name", "매장명이 없습니다.");

  const daily = Array.isArray(value.daily) ? value.daily : [];
  if (!Array.isArray(value.daily)) addIssue(errors, `${path}.daily`, "invalid_daily_rows", "일별 매출 목록이 배열이 아닙니다.");

  const dates = new Set<string>();
  let totalAmount = 0;
  let totalCount = 0;
  let zeroAmountRowCount = 0;
  let amountUnknown = false;
  let countUnknown = false;
  daily.forEach((row, rowIndex) => {
    const rowPath = `${path}.daily[${rowIndex}]`;
    if (!isRecord(row)) {
      addIssue(errors, rowPath, "invalid_daily_row", "일별 매출 행은 객체여야 합니다.");
      return;
    }
    const date = dateValue(row.date);
    if (!date) addIssue(errors, `${rowPath}.date`, "invalid_date", "날짜는 YYYY-MM-DD 형식이어야 합니다.");
    else if (dates.has(date)) addIssue(errors, `${rowPath}.date`, "duplicate_date", "같은 날짜가 중복되어 있습니다.");
    else dates.add(date);

    if (row.total === null || row.total === undefined) amountUnknown = true;
    else if (typeof row.total !== "number" || !Number.isFinite(row.total)) addIssue(errors, `${rowPath}.total`, "invalid_amount", "매출은 숫자 또는 빈 값이어야 합니다.");
    else {
      totalAmount += row.total;
      if (row.total === 0) zeroAmountRowCount += 1;
      if (row.total < 0) addIssue(warnings, `${rowPath}.total`, "negative_amount", "음수 매출은 검토 후에만 반영할 수 있습니다.");
    }

    if (row.count === null || row.count === undefined) countUnknown = true;
    else if (typeof row.count !== "number" || !Number.isFinite(row.count) || row.count < 0) addIssue(errors, `${rowPath}.count`, "invalid_count", "결제 건수는 0 이상의 숫자 또는 빈 값이어야 합니다.");
    else totalCount += row.count;
  });

  const summary = isRecord(value.summary) ? value.summary : {};
  if (summary.row_count !== undefined && summary.row_count !== daily.length) addIssue(errors, `${path}.summary.row_count`, "summary_mismatch", "요약 일수와 실제 행 수가 다릅니다.");
  if (!amountUnknown && summary.total_amount !== undefined && summary.total_amount !== totalAmount) addIssue(errors, `${path}.summary.total_amount`, "summary_mismatch", "요약 매출과 일별 매출 합계가 다릅니다.");
  if (!countUnknown && summary.total_payment_count !== undefined && summary.total_payment_count !== totalCount) addIssue(errors, `${path}.summary.total_payment_count`, "summary_mismatch", "요약 결제건수와 일별 결제건수 합계가 다릅니다.");

  const sortedDates = [...dates].sort();
  const unprovidedDateCount = sortedDates.length > 1 ? Math.max(0, daysBetween(sortedDates[0], sortedDates.at(-1)!) - sortedDates.length) : 0;
  if (unprovidedDateCount) addIssue(warnings, `${path}.daily`, "unprovided_dates", `일별 데이터가 제공되지 않은 날짜가 ${unprovidedDateCount}일 있습니다. 0원으로 처리하지 않습니다.`);

  return {
    sourceCompanyId,
    storeName,
    rowCount: daily.length,
    totalAmount: amountUnknown ? null : totalAmount,
    totalCount: countUnknown ? null : totalCount,
    unprovidedDateCount,
    zeroAmountRowCount,
    errors,
    warnings,
  };
}

export function isSalesHistoryBatch(value: unknown): value is JsonRecord & { stores: unknown[] } {
  return isRecord(value) && value.snapshot_type === "all_stores_cardsales_analytics_last_year" && Array.isArray(value.stores);
}

export function previewSalesHistoryBatch(input: unknown): SalesHistoryBatchPreview {
  const errors: BatchIssue[] = [];
  const warnings: BatchIssue[] = [];
  if (!isRecord(input) || !isSalesHistoryBatch(input)) {
    addIssue(errors, "$", "invalid_batch", "장사 ERP 일괄 일매출 JSON 형식이 아닙니다.");
    return { valid: false, snapshotHash: null, storeCount: 0, validStoreCount: 0, revenue: { rowCount: 0, totalAmount: null, totalCount: null, unprovidedDateCount: 0, zeroAmountRowCount: 0 }, stores: [], errors, warnings };
  }

  if (input.schema_version !== "1.0.0") addIssue(errors, "schema_version", "unsupported_schema", "현재 지원하는 일괄 파일 버전은 1.0.0입니다.");

  const stores = input.stores.map(previewStore);
  const sourceIds = new Set<string>();
  stores.forEach((store, index) => {
    if (store.sourceCompanyId) {
      if (sourceIds.has(store.sourceCompanyId)) addIssue(errors, `stores[${index}].source_company_id`, "duplicate_store_key", "같은 매장 연결키가 파일 안에 중복되어 있습니다.");
      sourceIds.add(store.sourceCompanyId);
    }
    errors.push(...store.errors);
    warnings.push(...store.warnings);
  });

  const amountUnknown = stores.some((store) => store.totalAmount === null);
  const countUnknown = stores.some((store) => store.totalCount === null);
  return {
    valid: errors.length === 0,
    snapshotHash: errors.length ? null : `sha256:${createHash("sha256").update(stableJson(input)).digest("hex")}`,
    storeCount: stores.length,
    validStoreCount: stores.filter((store) => store.errors.length === 0).length,
    revenue: {
      rowCount: stores.reduce((sum, store) => sum + store.rowCount, 0),
      totalAmount: amountUnknown ? null : stores.reduce((sum, store) => sum + (store.totalAmount ?? 0), 0),
      totalCount: countUnknown ? null : stores.reduce((sum, store) => sum + (store.totalCount ?? 0), 0),
      unprovidedDateCount: stores.reduce((sum, store) => sum + store.unprovidedDateCount, 0),
      zeroAmountRowCount: stores.reduce((sum, store) => sum + store.zeroAmountRowCount, 0),
    },
    stores,
    errors,
    warnings,
  };
}
