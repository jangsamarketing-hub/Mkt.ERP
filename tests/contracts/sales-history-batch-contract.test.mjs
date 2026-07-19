import assert from "node:assert/strict";
import test from "node:test";
import { previewSalesHistoryBatch } from "../../lib/jangsadoctor/batch-contract.ts";

function buildBatch() {
  return {
    schema_version: "1.0.0",
    snapshot_type: "all_stores_cardsales_analytics_last_year",
    stores: [
      {
        source_company_id: "1001",
        store_name: "테스트 1호점",
        daily: [
          { date: "2026-07-01", total: 100000, count: 2 },
          { date: "2026-07-03", total: 0, count: 0 },
        ],
        summary: { row_count: 2, total_amount: 100000, total_payment_count: 2 },
      },
      {
        source_company_id: "1002",
        store_name: "테스트 2호점",
        daily: [{ date: "2026-07-01", total: 200000, count: 4 }],
        summary: { row_count: 1, total_amount: 200000, total_payment_count: 4 },
      },
    ],
  };
}

test("batch preview preserves unprovided days separately from zero sales", () => {
  const preview = previewSalesHistoryBatch(buildBatch());
  assert.equal(preview.valid, true);
  assert.equal(preview.storeCount, 2);
  assert.equal(preview.revenue.rowCount, 3);
  assert.equal(preview.revenue.totalAmount, 300000);
  assert.equal(preview.revenue.totalCount, 6);
  assert.equal(preview.revenue.unprovidedDateCount, 1);
  assert.equal(preview.revenue.zeroAmountRowCount, 1);
  assert.equal(preview.stores[0].unprovidedDateCount, 1);
  assert.ok(preview.snapshotHash?.startsWith("sha256:"));
});

test("batch preview rejects duplicate source keys and inconsistent summaries", () => {
  const batch = buildBatch();
  batch.stores[1].source_company_id = "1001";
  batch.stores[1].summary.total_amount = 1;
  const preview = previewSalesHistoryBatch(batch);
  assert.equal(preview.valid, false);
  assert.ok(preview.errors.some((item) => item.code === "duplicate_store_key"));
  assert.ok(preview.errors.some((item) => item.code === "summary_mismatch"));
});
