import test from "node:test";
import assert from "node:assert/strict";
import {
  balanceAlertLevel,
  isBalanceThresholdOpen,
  LOW_BALANCE_EMAIL_THRESHOLD_WON,
  LOW_BALANCE_WARNING_THRESHOLD_WON,
  shouldEmailBalanceThreshold,
} from "../../lib/naver-searchad/balance-policy.ts";

test("balance traffic light keeps the 50,000 won boundary out of the email-critical state", () => {
  assert.equal(balanceAlertLevel(49_999), "critical");
  assert.equal(balanceAlertLevel(50_000), "warning");
  assert.equal(balanceAlertLevel(100_000), "warning");
  assert.equal(balanceAlertLevel(100_001), "normal");
  assert.equal(balanceAlertLevel(null), "unavailable");
  assert.equal(balanceAlertLevel(200_000, "failed"), "unavailable");
});

test("only a balance below 50,000 won opens the email threshold", () => {
  assert.equal(isBalanceThresholdOpen(49_999, LOW_BALANCE_EMAIL_THRESHOLD_WON), true);
  assert.equal(isBalanceThresholdOpen(50_000, LOW_BALANCE_EMAIL_THRESHOLD_WON), false);
  assert.equal(isBalanceThresholdOpen(100_000, LOW_BALANCE_WARNING_THRESHOLD_WON), true);
  assert.equal(shouldEmailBalanceThreshold(LOW_BALANCE_EMAIL_THRESHOLD_WON), true);
  assert.equal(shouldEmailBalanceThreshold(LOW_BALANCE_WARNING_THRESHOLD_WON), false);
});
