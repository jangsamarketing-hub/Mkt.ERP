import assert from "node:assert/strict";
import test from "node:test";
import { previewJangsadoctorImport } from "../../lib/jangsadoctor/contract.ts";

function buildPayload() {
  return {
    schema_version: "1.0.0",
    snapshot_type: "initial_snapshot",
    source: { system: "jangsadoctor_erp" },
    store: { source_company_id: "JSD-001", store_name: "테스트 매장" },
    platform_accounts: [{ platform: "naver", password_value: null }],
    revenue: {
      status: "collected",
      period_start: "2026-07-01",
      period_end: "2026-07-03",
      daily: [
        { date: "2026-07-01", total: 100, count: 1 },
        { date: "2026-07-02", total: 0, count: 0 },
        { date: "2026-07-03", total: 300, count: 3 },
      ],
      summary: { row_count: 3, total_amount: 400, total_count: 4 },
    },
  };
}

test("preview validates a safe Jangsadoctor export and separates zero sales from missing dates", () => {
  const preview = previewJangsadoctorImport(buildPayload());
  assert.equal(preview.valid, true);
  assert.equal(preview.sourceCompanyId, "JSD-001");
  assert.equal(preview.revenue.totalAmount, 400);
  assert.deepEqual(preview.revenue.zeroAmountDates, ["2026-07-02"]);
  assert.deepEqual(preview.revenue.missingDates, []);
  assert.match(preview.snapshotHash, /^sha256:/);
});

test("preview rejects credentials, duplicate dates, and mismatched revenue totals", () => {
  const payload = buildPayload();
  payload.platform_accounts[0].password_value = "not-allowed";
  payload.revenue.daily[2].date = "2026-07-02";
  payload.revenue.summary.total_amount = 999;
  const preview = previewJangsadoctorImport(payload);
  assert.equal(preview.valid, false);
  assert.ok(preview.errors.some((item) => item.code === "credential_rejected"));
  assert.ok(preview.errors.some((item) => item.code === "duplicate_date"));
  assert.ok(preview.errors.some((item) => item.code === "summary_mismatch"));
});

test("preview warns for missing dates without treating them as zero", () => {
  const payload = buildPayload();
  payload.revenue.daily.splice(1, 1);
  payload.revenue.summary = { row_count: 2, total_amount: 400, total_count: 4 };
  const preview = previewJangsadoctorImport(payload);
  assert.equal(preview.valid, true);
  assert.deepEqual(preview.revenue.missingDates, ["2026-07-02"]);
  assert.deepEqual(preview.revenue.zeroAmountDates, []);
  assert.ok(preview.warnings.some((item) => item.code === "missing_dates"));
});
