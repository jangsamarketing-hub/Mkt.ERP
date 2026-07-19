export const STORE_LIFECYCLE_STATUSES = ["active", "paused", "archived"] as const;
export const STORE_ENVIRONMENTS = ["production", "sample", "test"] as const;
export const EXTERNAL_IDENTIFIER_TYPES = [
  "naver_place_mid",
  "naver_place_id",
  "naver_searchad_customer_id",
  "credit_finance_merchant_group",
  "credit_finance_mid",
] as const;

export type StoreLifecycleStatus = (typeof STORE_LIFECYCLE_STATUSES)[number];
export type StoreEnvironment = (typeof STORE_ENVIRONMENTS)[number];
export type ExternalIdentifierType = (typeof EXTERNAL_IDENTIFIER_TYPES)[number];

export type CanonicalStore = {
  id: string;
  organizationId: string | null;
  name: string;
  clientName: string | null;
  managerName: string | null;
  category: string | null;
  region: string | null;
  contractStartDate: string | null;
  contractPeriodWeeks: number;
  managementStartDate: string | null;
  naverMid: string | null;
  naverPlaceUrl: string | null;
  memo: string | null;
  lifecycleStatus: StoreLifecycleStatus;
  environment: StoreEnvironment;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StoreRecord = Record<string, unknown>;

export class StoreValidationError extends Error {}

function optionalText(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function requiredText(value: unknown, field: string) {
  const normalized = optionalText(value);
  if (!normalized) throw new StoreValidationError(`${field} is required`);
  return normalized;
}

function optionalDate(value: unknown, field: string) {
  const normalized = optionalText(value);
  if (normalized === undefined || normalized === null) return normalized;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new StoreValidationError(`${field} must be YYYY-MM-DD`);
  }
  return normalized;
}

function contractWeeks(value: unknown) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 52) {
    throw new StoreValidationError("contractPeriodWeeks must be an integer from 1 to 52");
  }
  return parsed;
}

function oneOf<T extends readonly string[]>(value: unknown, values: T, field: string) {
  if (value === undefined) return undefined;
  if (!values.includes(String(value) as T[number])) {
    throw new StoreValidationError(`${field} is invalid`);
  }
  return String(value) as T[number];
}

export function toCanonicalStore(record: StoreRecord): CanonicalStore {
  return {
    id: String(record.id ?? ""),
    organizationId: optionalText(record.organization_id) ?? null,
    name: String(record.name ?? ""),
    clientName: optionalText(record.client_name) ?? null,
    managerName: optionalText(record.manager_name) ?? null,
    category: optionalText(record.category) ?? null,
    region: optionalText(record.region) ?? null,
    contractStartDate: optionalText(record.contract_start_date) ?? null,
    contractPeriodWeeks: Number(record.contract_period_weeks ?? 4),
    managementStartDate: optionalText(record.management_start_date ?? record.contract_start_date) ?? null,
    naverMid: optionalText(record.naver_mid) ?? null,
    naverPlaceUrl: optionalText(record.naver_place_url) ?? null,
    memo: optionalText(record.memo) ?? null,
    lifecycleStatus: (optionalText(record.lifecycle_status) ?? "active") as StoreLifecycleStatus,
    environment: (optionalText(record.environment) ?? "production") as StoreEnvironment,
    archivedAt: optionalText(record.archived_at) ?? null,
    createdAt: optionalText(record.created_at) ?? null,
    updatedAt: optionalText(record.updated_at) ?? null,
  };
}

export function buildStoreInsert(body: StoreRecord, organizationId: string) {
  const lifecycleStatus = oneOf(body.lifecycleStatus, STORE_LIFECYCLE_STATUSES, "lifecycleStatus") ?? "active";
  const environment = oneOf(body.environment, STORE_ENVIRONMENTS, "environment") ?? "production";
  return {
    organization_id: organizationId,
    name: requiredText(body.name, "name"),
    client_name: optionalText(body.clientName) ?? null,
    manager_name: optionalText(body.managerName) ?? null,
    category: optionalText(body.category) ?? null,
    region: optionalText(body.region) ?? null,
    contract_start_date: optionalDate(body.contractStartDate, "contractStartDate") ?? null,
    contract_period_weeks: contractWeeks(body.contractPeriodWeeks) ?? 4,
    management_start_date: optionalDate(body.managementStartDate, "managementStartDate") ?? null,
    naver_mid: optionalText(body.naverMid) ?? null,
    naver_place_url: optionalText(body.naverPlaceUrl) ?? null,
    memo: optionalText(body.memo) ?? null,
    lifecycle_status: lifecycleStatus,
    environment,
    archived_at: lifecycleStatus === "archived" ? new Date().toISOString() : null,
    account_data: {},
  };
}

export function buildStorePatch(body: StoreRecord) {
  const patch: StoreRecord = {};
  const mappings: Array<[string, string]> = [
    ["name", "name"],
    ["clientName", "client_name"],
    ["managerName", "manager_name"],
    ["category", "category"],
    ["region", "region"],
    ["naverMid", "naver_mid"],
    ["naverPlaceUrl", "naver_place_url"],
    ["memo", "memo"],
  ];

  for (const [input, column] of mappings) {
    if (body[input] !== undefined) {
      patch[column] = input === "name" ? requiredText(body[input], input) : optionalText(body[input]) ?? null;
    }
  }
  if (body.contractStartDate !== undefined) patch.contract_start_date = optionalDate(body.contractStartDate, "contractStartDate") ?? null;
  if (body.managementStartDate !== undefined) patch.management_start_date = optionalDate(body.managementStartDate, "managementStartDate") ?? null;
  if (body.contractPeriodWeeks !== undefined) patch.contract_period_weeks = contractWeeks(body.contractPeriodWeeks);
  if (body.environment !== undefined) patch.environment = oneOf(body.environment, STORE_ENVIRONMENTS, "environment");
  if (body.lifecycleStatus !== undefined) {
    const status = oneOf(body.lifecycleStatus, STORE_LIFECYCLE_STATUSES, "lifecycleStatus");
    patch.lifecycle_status = status;
    patch.archived_at = status === "archived" ? new Date().toISOString() : null;
  }
  if (!Object.keys(patch).length) throw new StoreValidationError("no supported fields supplied");
  return patch;
}

export function validateExternalIdentifier(body: StoreRecord) {
  const identifierType = oneOf(body.identifierType, EXTERNAL_IDENTIFIER_TYPES, "identifierType");
  if (!identifierType) throw new StoreValidationError("identifierType is required");
  return {
    identifier_type: identifierType,
    identifier_value: requiredText(body.identifierValue, "identifierValue"),
    label: optionalText(body.label) ?? null,
    is_primary: body.isPrimary === undefined ? true : Boolean(body.isPrimary),
    metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {},
  };
}
