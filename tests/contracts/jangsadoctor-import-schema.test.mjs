import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Jangsadoctor import migration remains additive and protects browser access", async () => {
  const migration = await readFile(new URL("../../supabase/migrations/20260719112000_jangsadoctor_import_control_plane.sql", import.meta.url), "utf8");
  assert.match(migration, /create table if not exists public\.store_external_links/i);
  assert.match(migration, /unique \(source_system, source_company_id\)/i);
  assert.match(migration, /create table if not exists public\.erp_import_runs/i);
  assert.match(migration, /create table if not exists public\.erp_jangsadoctor_sales_daily/i);
  assert.match(migration, /unique \(store_id, business_date\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on public\.erp_import_runs from anon, authenticated/i);
  assert.doesNotMatch(migration, /alter table public\.erp_stores\s+drop/i);
  assert.doesNotMatch(migration, /delete from public\.erp_/i);
});
