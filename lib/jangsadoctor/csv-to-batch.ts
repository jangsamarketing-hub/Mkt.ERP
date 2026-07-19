type CsvRecord = Record<string, string>;

export type SalesHistoryCsvConversion = {
  payload: Record<string, unknown>;
  inputRowCount: number;
  dailyRowCount: number;
  skippedRowCount: number;
  errorRowCount: number;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const normalized = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (quoted) {
      if (char === '"' && normalized[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  if (quoted) throw new Error("CSV의 큰따옴표가 닫히지 않았습니다.");
  row.push(value.replace(/\r$/, ""));
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function numeric(value: string, row: number, column: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) throw new Error(`CSV ${row}행의 ${column} 값이 숫자가 아닙니다.`);
  return parsed;
}

export function convertSalesHistoryCsvToBatch(text: string): SalesHistoryCsvConversion {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV에 헤더와 매출 행이 필요합니다.");
  const header = rows[0].map((cell) => cell.trim());
  const required = ["source_company_id", "store_name", "record_type", "date", "total_amount", "payment_count", "collection_status", "error"];
  const indexes = Object.fromEntries(required.map((column) => [column, header.indexOf(column)])) as Record<string, number>;
  const missing = required.filter((column) => indexes[column] < 0);
  if (missing.length) throw new Error(`지원하지 않는 CSV 형식입니다. 필수 열: ${missing.join(", ")}`);

  const grouped = new Map<string, { sourceCompanyId: string; storeName: string; daily: { date: string; total: number; count: number }[] }>();
  let dailyRowCount = 0;
  let skippedRowCount = 0;
  let errorRowCount = 0;
  rows.slice(1).forEach((values, offset) => {
    const rowNumber = offset + 2;
    const record = Object.fromEntries(header.map((column, index) => [column, values[index] ?? ""])) as CsvRecord;
    if (record.record_type.trim() !== "daily") {
      skippedRowCount += 1;
      return;
    }
    if (record.error.trim() || record.collection_status.trim() !== "collected") {
      errorRowCount += 1;
      return;
    }
    const sourceCompanyId = record.source_company_id.trim();
    const storeName = record.store_name.trim();
    const date = record.date.trim();
    if (!sourceCompanyId || !storeName || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`CSV ${rowNumber}행의 매장 연결키, 매장명 또는 날짜가 올바르지 않습니다.`);
    const item = grouped.get(sourceCompanyId) ?? { sourceCompanyId, storeName, daily: [] };
    if (item.storeName !== storeName) throw new Error(`CSV ${rowNumber}행의 매장명이 같은 연결키의 기존 매장명과 다릅니다.`);
    item.daily.push({ date, total: numeric(record.total_amount, rowNumber, "total_amount"), count: numeric(record.payment_count, rowNumber, "payment_count") });
    grouped.set(sourceCompanyId, item);
    dailyRowCount += 1;
  });
  if (dailyRowCount === 0) throw new Error("저장할 정상 일별 매출 행이 없습니다.");

  return {
    inputRowCount: rows.length - 1,
    dailyRowCount,
    skippedRowCount,
    errorRowCount,
    payload: {
      schema_version: "1.0.0",
      snapshot_type: "all_stores_cardsales_analytics_last_year",
      source: { system: "jangsadoctor_erp", format: "csv" },
      stores: [...grouped.values()].map((store) => {
        const daily = [...store.daily].sort((left, right) => left.date.localeCompare(right.date));
        return {
          source_company_id: store.sourceCompanyId,
          store_name: store.storeName,
          status: "collected",
          daily,
          summary: {
            row_count: daily.length,
            total_amount: daily.reduce((sum, row) => sum + row.total, 0),
            total_payment_count: daily.reduce((sum, row) => sum + row.count, 0),
          },
        };
      }),
    },
  };
}
