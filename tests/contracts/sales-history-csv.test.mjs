import assert from "node:assert/strict";
import test from "node:test";
import { convertSalesHistoryCsvToBatch } from "../../lib/jangsadoctor/csv-to-batch.ts";
import { previewSalesHistoryBatch } from "../../lib/jangsadoctor/batch-contract.ts";

test("CSV daily rows convert to the same safe batch preview format", () => {
  const csv = [
    "source_company_id,store_name,record_type,date,hour,total_amount,payment_count,customer_unit_price,collection_status,error",
    "1001,테스트 매장,daily,2026-07-01,,100000,2,50000,collected,",
    "1001,테스트 매장,daily,2026-07-02,,0,0,0,collected,",
    "1002,두번째 매장,daily,2026-07-01,,200000,4,50000,collected,",
  ].join("\n");
  const converted = convertSalesHistoryCsvToBatch(csv);
  const preview = previewSalesHistoryBatch(converted.payload);
  assert.equal(converted.dailyRowCount, 3);
  assert.equal(preview.valid, true);
  assert.equal(preview.storeCount, 2);
  assert.equal(preview.revenue.zeroAmountRowCount, 1);
});

test("CSV rows marked as errors are retained out of the importable batch", () => {
  const csv = [
    "source_company_id,store_name,record_type,date,hour,total_amount,payment_count,customer_unit_price,collection_status,error",
    "1001,테스트 매장,daily,2026-07-01,,100000,2,50000,collected,",
    "1001,테스트 매장,daily,2026-07-02,,0,0,0,failed,source error",
  ].join("\n");
  const converted = convertSalesHistoryCsvToBatch(csv);
  assert.equal(converted.dailyRowCount, 1);
  assert.equal(converted.errorRowCount, 1);
});
