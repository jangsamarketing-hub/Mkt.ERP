export type BalanceAlertLevel = "critical" | "warning" | "normal" | "unavailable";

export const LOW_BALANCE_EMAIL_THRESHOLD_WON = 50_000;
export const LOW_BALANCE_WARNING_THRESHOLD_WON = 100_000;

export function balanceAlertLevel(balanceWon: number | null, balanceStatus = "available"): BalanceAlertLevel {
  if (balanceWon === null || balanceStatus !== "available") return "unavailable";
  if (balanceWon < LOW_BALANCE_EMAIL_THRESHOLD_WON) return "critical";
  if (balanceWon <= LOW_BALANCE_WARNING_THRESHOLD_WON) return "warning";
  return "normal";
}

export function isBalanceThresholdOpen(balanceWon: number, thresholdWon: number) {
  return thresholdWon === LOW_BALANCE_EMAIL_THRESHOLD_WON
    ? balanceWon < thresholdWon
    : balanceWon <= thresholdWon;
}

export function shouldEmailBalanceThreshold(thresholdWon: number) {
  return thresholdWon === LOW_BALANCE_EMAIL_THRESHOLD_WON;
}
