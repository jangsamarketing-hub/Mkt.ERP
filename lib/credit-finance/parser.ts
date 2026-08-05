import { createHash } from "node:crypto";
import * as XLSX from "xlsx";

export const CREDIT_FINANCE_PARSER_VERSION = "credit-finance-v1";

export type CreditTransactionType = "approval" | "cancellation";

export type ParsedCreditTransaction = {
  sourceRowNumber: number;
  transactionType: CreditTransactionType;
  transactionDate: string;
  transactionTime: string;
  cardIssuer: string;
  affiliateName: string | null;
  maskedCardDisplay: string | null;
  approvalNumber: string;
  amountSigned: number;
  amountAbs: number;
  installment: string | null;
  cancellationMatchStatus: "matched" | "unmatched" | "not_applicable";
  matchedSourceRowNumber: number | null;
  qualityFlags: string[];
  rawRow: Record<string, string | number | null>;
};

export type ParsedCreditWorkbook = {
  sheetName: string;
  periodStart: string;
  periodEnd: string;
  rawRowCount: number;
  rawAmountSum: number | null;
  netSales: number;
  netPaymentCount: number;
  amountPerPayment: number | null;
  transactions: ParsedCreditTransaction[];
  warnings: string[];
};

const REQUIRED_HEADERS = ["구분", "거래일자", "거래시간", "카드사", "승인번호", "승인금액"];

function clean(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function integer(value: unknown) {
  const parsed = Number(clean(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function dateText(value: unknown) {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const text = clean(value).replace(/[./]/g, "-");
  const match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : "";
}

function timeText(value: unknown) {
  if (typeof value === "number" && value >= 0 && value < 1) {
    const total = Math.round(value * 86_400);
    return `${String(Math.floor(total / 3600) % 24).padStart(2, "0")}:${String(Math.floor(total / 60) % 60).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  const match = clean(value).match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  return match ? `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}:${(match[3] ?? "00").padStart(2, "0")}` : "00:00:00";
}

function findHeaderRow(rows: unknown[][]) {
  return rows.findIndex((row) => REQUIRED_HEADERS.every((header) => row.some((cell) => clean(cell) === header)));
}

function cancellationKey(transaction: Pick<ParsedCreditTransaction, "approvalNumber" | "cardIssuer" | "amountAbs">) {
  return `${transaction.approvalNumber}|${transaction.cardIssuer}|${transaction.amountAbs}`;
}

export function buildCreditTransactionUid(
  storeId: string,
  transaction: ParsedCreditTransaction,
) {
  return createHash("sha256").update([
    storeId,
    transaction.transactionDate,
    transaction.transactionTime,
    transaction.transactionType,
    transaction.approvalNumber,
    transaction.amountAbs,
    transaction.cardIssuer,
    transaction.affiliateName ?? "",
    transaction.maskedCardDisplay ?? "",
    transaction.installment ?? "",
  ].join("|"), "utf8").digest("hex");
}

export function parseCreditFinanceWorkbook(bytes: Buffer): ParsedCreditWorkbook {
  const workbook = XLSX.read(bytes, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets.");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: true,
  });
  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) throw new Error("Required credit-finance headers were not found.");

  const headers = rows[headerIndex].map(clean);
  const column = (name: string) => headers.indexOf(name);
  const warnings: string[] = [];
  const transactions: ParsedCreditTransaction[] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const typeText = clean(row[column("구분")]);
    if (!typeText && row.every((cell) => !clean(cell))) continue;
    if (typeText !== "승인" && typeText !== "취소") {
      warnings.push(`Row ${index + 1}: unsupported transaction type (${typeText || "empty"}).`);
      continue;
    }

    const transactionDate = dateText(row[column("거래일자")]);
    const approvalNumber = clean(row[column("승인번호")]);
    const amount = integer(row[column("승인금액")]);
    const qualityFlags: string[] = [];
    if (!transactionDate) qualityFlags.push("missing_transaction_date");
    if (!approvalNumber) qualityFlags.push("missing_approval_number");
    const amountAbs = amount === null ? null : Math.abs(amount);
    if (amountAbs === null || amountAbs <= 0) qualityFlags.push("invalid_amount");
    if (!transactionDate || amountAbs === null || amountAbs <= 0) {
      warnings.push(`Row ${index + 1}: required transaction value is invalid.`);
      continue;
    }

    const transactionType: CreditTransactionType = typeText === "취소" ? "cancellation" : "approval";
    transactions.push({
      sourceRowNumber: index + 1,
      transactionType,
      transactionDate,
      transactionTime: timeText(row[column("거래시간")]),
      cardIssuer: clean(row[column("카드사")]),
      affiliateName: clean(row[column("제휴카드사")]) || null,
      maskedCardDisplay: clean(row[column("카드번호")]) || null,
      approvalNumber,
      amountSigned: transactionType === "cancellation" ? -amountAbs : amountAbs,
      amountAbs,
      installment: clean(row[column("할부기간")]) || null,
      cancellationMatchStatus: transactionType === "cancellation" ? "unmatched" : "not_applicable",
      matchedSourceRowNumber: null,
      qualityFlags,
      rawRow: Object.fromEntries(headers.map((header, cellIndex) => [header || `column_${cellIndex + 1}`, clean(row[cellIndex]) || null])),
    });
  }

  if (!transactions.length) throw new Error("No valid credit transactions were found.");

  const approvals = new Map<string, ParsedCreditTransaction[]>();
  for (const transaction of transactions) {
    if (transaction.transactionType !== "approval") continue;
    const key = cancellationKey(transaction);
    const candidates = approvals.get(key) ?? [];
    candidates.push(transaction);
    approvals.set(key, candidates);
  }
  for (const transaction of transactions) {
    if (transaction.transactionType !== "cancellation") continue;
    const key = cancellationKey(transaction);
    // The association export can place a cancellation immediately before its
    // matching approval even when both share the same approval number.
    const candidate = (approvals.get(key) ?? [])[0];
    if (candidate) {
      transaction.cancellationMatchStatus = "matched";
      transaction.matchedSourceRowNumber = candidate.sourceRowNumber;
    } else {
      transaction.qualityFlags.push("unmatched_cancellation");
      warnings.push(`Row ${transaction.sourceRowNumber}: cancellation could not be matched.`);
    }
  }

  const dates = transactions.map((transaction) => transaction.transactionDate).sort();
  const netSales = transactions.reduce((sum, transaction) => sum + transaction.amountSigned, 0);
  const approvalsCount = transactions.filter((transaction) => transaction.transactionType === "approval").length;
  const cancellationsCount = transactions.filter((transaction) => transaction.transactionType === "cancellation").length;
  const netPaymentCount = approvalsCount - cancellationsCount;
  const summaryRow = rows[headerIndex - 1] ?? [];
  const rawRowCount = integer(summaryRow[1]) ?? transactions.length;
  const rawAmountSum = integer(summaryRow[3]);
  if (rawRowCount !== transactions.length) warnings.push(`Summary count (${rawRowCount}) differs from parsed count (${transactions.length}).`);
  if (rawAmountSum !== null && rawAmountSum !== netSales) warnings.push(`Summary amount (${rawAmountSum}) differs from net sales (${netSales}).`);

  return {
    sheetName,
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    rawRowCount,
    rawAmountSum,
    netSales,
    netPaymentCount,
    amountPerPayment: netPaymentCount > 0 ? Math.round(netSales / netPaymentCount) : null,
    transactions,
    warnings: [...new Set(warnings)],
  };
}
