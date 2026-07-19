import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseCreditFinanceWorkbook } from "../lib/credit-finance/parser.ts";

const [jsonPath, creditPath] = process.argv.slice(2);
if (!jsonPath || !creditPath) {
  console.error("Usage: npm run verify:samples -- <naver-json-path> <credit-xls-path>");
  process.exitCode = 2;
} else {
  const naver = JSON.parse(await readFile(jsonPath, "utf8"));
  assert.equal(naver.schema_version, "2.0.0");
  assert.equal(naver.collector?.version, "1.4.1");
  assert.equal(naver.period?.period_type, "month");
  assert.equal(naver.coverage?.smartCall?.status, "summary_only");

  const credit = parseCreditFinanceWorkbook(await readFile(creditPath));
  assert.equal(credit.rawRowCount, 1457);
  assert.equal(credit.transactions.length, 1457);
  assert.equal(credit.rawAmountSum, 128910000);
  assert.equal(credit.netSales, 128910000);

  console.log(JSON.stringify({
    naver: {
      schemaVersion: naver.schema_version,
      collectorVersion: naver.collector.version,
      period: naver.period,
      smartCall: naver.coverage.smartCall.status
    },
    credit: {
      periodStart: credit.periodStart,
      periodEnd: credit.periodEnd,
      rawRowCount: credit.rawRowCount,
      netSales: credit.netSales,
      netPaymentCount: credit.netPaymentCount,
      amountPerPayment: credit.amountPerPayment,
      warningCount: credit.warnings.length
    }
  }, null, 2));
}
