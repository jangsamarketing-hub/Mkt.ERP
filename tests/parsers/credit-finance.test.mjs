import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCreditTransactionUid,
  CREDIT_FINANCE_PARSER_VERSION,
  parseCreditFinanceWorkbook
} from "../../lib/credit-finance/parser.ts";
import { buildCreditFinanceFixture } from "../fixtures/credit-finance-fixture.mjs";

test("Credit-finance parser preserves approvals, cancellation and net totals", () => {
  const parsed = parseCreditFinanceWorkbook(buildCreditFinanceFixture());

  assert.equal(CREDIT_FINANCE_PARSER_VERSION, "credit-finance-v1");
  assert.equal(parsed.sheetName, "기간별승인내역_세부내역");
  assert.equal(parsed.periodStart, "2026-07-01");
  assert.equal(parsed.periodEnd, "2026-07-01");
  assert.equal(parsed.rawRowCount, 3);
  assert.equal(parsed.rawAmountSum, 100000);
  assert.equal(parsed.netSales, 100000);
  assert.equal(parsed.netPaymentCount, 1);
  assert.equal(parsed.amountPerPayment, 100000);
  assert.equal(parsed.transactions.length, 3);
  assert.equal(parsed.transactions[2].transactionType, "cancellation");
  assert.equal(parsed.transactions[2].cancellationMatchStatus, "matched");
  assert.equal(parsed.transactions[2].matchedSourceRowNumber, parsed.transactions[1].sourceRowNumber);
  assert.deepEqual(parsed.warnings, []);
});

test("Credit transaction UID is deterministic and source-row specific", () => {
  const transaction = parseCreditFinanceWorkbook(buildCreditFinanceFixture()).transactions[0];
  const first = buildCreditTransactionUid("store-test", "source-hash", transaction);
  const second = buildCreditTransactionUid("store-test", "source-hash", transaction);
  const differentRow = buildCreditTransactionUid("store-test", "source-hash", { ...transaction, sourceRowNumber: transaction.sourceRowNumber + 1 });

  assert.equal(first, second);
  assert.notEqual(first, differentRow);
  assert.match(first, /^[a-f0-9]{64}$/);
});
