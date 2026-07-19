import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildStoreInsert,
  buildStorePatch,
  StoreValidationError,
  toCanonicalStore,
  validateExternalIdentifier,
} from "../../lib/stores/registry.ts";

test("legacy erp_stores rows normalize without changing their canonical id", () => {
  const store = toCanonicalStore({
    id: "11111111-1111-4111-8111-111111111111",
    name: "기존 매장",
    manager_name: "담당자",
    contract_start_date: "2026-07-01",
    contract_period_weeks: 4,
    naver_mid: "123456",
  });
  assert.equal(store.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(store.lifecycleStatus, "active");
  assert.equal(store.environment, "production");
  assert.equal(store.managementStartDate, "2026-07-01");
});

test("store creation uses one organization and validates lifecycle fields", () => {
  const insert = buildStoreInsert({
    name: "신규 매장",
    contractPeriodWeeks: 4,
    managementStartDate: "2026-07-19",
    lifecycleStatus: "active",
    environment: "production",
  }, "22222222-2222-4222-8222-222222222222");
  assert.equal(insert.organization_id, "22222222-2222-4222-8222-222222222222");
  assert.equal(insert.lifecycle_status, "active");
  assert.equal(insert.archived_at, null);
  assert.throws(() => buildStoreInsert({ name: "X", environment: "demo" }, "org"), StoreValidationError);
});

test("archive is reversible metadata, not a hard delete", () => {
  const archive = buildStorePatch({ lifecycleStatus: "archived" });
  assert.equal(archive.lifecycle_status, "archived");
  assert.match(String(archive.archived_at), /^\d{4}-\d{2}-\d{2}T/);
  const restore = buildStorePatch({ lifecycleStatus: "active" });
  assert.equal(restore.archived_at, null);
});

test("external identifiers are typed and cannot be blank", () => {
  assert.deepEqual(validateExternalIdentifier({
    identifierType: "naver_searchad_customer_id",
    identifierValue: " 123-456 ",
  }), {
    identifier_type: "naver_searchad_customer_id",
    identifier_value: "123-456",
    label: null,
    is_primary: true,
    metadata: {},
  });
  assert.throws(() => validateExternalIdentifier({ identifierValue: "123" }), StoreValidationError);
});

test("Stage 1C migrations separate schema, backfill, and invariant enforcement", async () => {
  const base = new URL("../../supabase/migrations/", import.meta.url);
  const schema = await readFile(new URL("20260719101740_canonical_store_registry_schema.sql", base), "utf8");
  const backfill = await readFile(new URL("20260719101811_canonical_store_registry_backfill.sql", base), "utf8");
  const constraints = await readFile(new URL("20260719101907_canonical_store_registry_constraints.sql", base), "utf8");
  assert.match(schema, /add column if not exists organization_id/i);
  assert.doesNotMatch(schema, /update public\.erp_stores/i);
  assert.match(backfill, /update public\.erp_stores/i);
  assert.match(constraints, /alter column organization_id set not null/i);
});
