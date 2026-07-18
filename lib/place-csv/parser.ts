export const PLACE_CSV_PARSER_VERSION = "place-insight-v1";

type MetricValue = {
  label: string;
  current: number;
  previous: number | null;
  diff: number | null;
  rate: number | null;
  source?: string;
};

export type PlaceMetricRow = {
  label: string;
  count: number;
  previous: number | null;
  diff: number | null;
  rate: number | null;
  purposeClass?: string;
};

export type ParsedPlaceCsv = {
  storeName: string;
  sourceVersion: string;
  periodStart: string;
  periodEnd: string;
  granularity: string;
  metrics: Record<string, MetricValue>;
  keywords: PlaceMetricRow[];
  channels: PlaceMetricRow[];
  hours: Array<PlaceMetricRow & { hour: number }>;
  weekdays: PlaceMetricRow[];
  warnings: string[];
};

const SECTION = {
  store: "[\uB9E4\uC7A5 \uC815\uBCF4]",
  period: "[\uAE30\uAC04 \uC815\uBCF4]",
  summary: "[1. \uB9AC\uD3EC\uD2B8 \uC694\uC57D \uC9C0\uD45C]",
  keywords: "[2. \uC720\uC785 \uD0A4\uC6CC\uB4DC]",
  channels: "[3. \uC720\uC785 \uCC44\uB110]",
  hours: "[4. \uC2DC\uAC04\uBCC4 \uC720\uC785]",
  weekdays: "[5. \uC694\uC77C\uBCC4 \uC720\uC785]",
  keywordDiff: "[11-1. \uD0A4\uC6CC\uB4DC \uC99D\uAC10]",
  channelDiff: "[11-2. \uCC44\uB110 \uC99D\uAC10]",
  hourDiff: "[11-3. \uC2DC\uAC04\uB300 \uC99D\uAC10]",
  weekdayDiff: "[11-4. \uC694\uC77C \uC99D\uAC10]",
} as const;

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function numberOrNull(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value.replace(/[,%\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function sectionsFromRows(rows: string[][]) {
  const sections = new Map<string, string[][]>();
  let active = "";
  rows.forEach((row) => {
    const first = row[0]?.trim() ?? "";
    if (/^\[.+\]$/.test(first)) {
      active = first;
      sections.set(active, []);
    } else if (active) {
      sections.get(active)?.push(row);
    }
  });
  return sections;
}

function records(section: string[][] | undefined) {
  if (!section?.length) return [];
  const [headers, ...rows] = section;
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function diffMap(section: string[][] | undefined, labelKey: string) {
  return new Map(
    records(section).map((row) => [
      row[labelKey],
      {
        previous: numberOrNull(row.previous),
        diff: numberOrNull(row.diff),
        rate: numberOrNull(row.rate),
      },
    ]),
  );
}

function parseMetricRows(
  section: string[][] | undefined,
  labelKey: string,
  countKey: string,
  diffs: Map<string, { previous: number | null; diff: number | null; rate: number | null }>,
) {
  return records(section)
    .flatMap((row): PlaceMetricRow[] => {
      const label = row[labelKey]?.trim();
      const count = numberOrNull(row[countKey]);
      if (!label || count === null) return [];
      const change = diffs.get(label);
      const metric: PlaceMetricRow = {
        label,
        count,
        previous: change?.previous ?? null,
        diff: change?.diff ?? null,
        rate: change?.rate ?? null,
      };
      const purposeClass = row.purposeClass?.trim();
      if (purposeClass) metric.purposeClass = purposeClass;
      return [metric];
    });
}

export function parsePlaceInsightCsv(text: string): ParsedPlaceCsv {
  const sections = sectionsFromRows(parseCsvRows(text));
  const storeInfo = Object.fromEntries((sections.get(SECTION.store) ?? []).map((row) => [row[0], row[1] ?? ""]));
  const periodInfo = Object.fromEntries((sections.get(SECTION.period) ?? []).map((row) => [row[0], row[1] ?? ""]));
  const warnings: string[] = [];

  const periodStart = periodInfo.startDate?.trim() ?? "";
  const periodEnd = periodInfo.endDate?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    throw new Error("CSV\uC5D0\uC11C \uAE30\uAC04 \uC815\uBCF4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  }

  const startDate = new Date(`${periodStart}T00:00:00Z`);
  const endDate = new Date(`${periodEnd}T00:00:00Z`);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  if (days !== 7) warnings.push(`\uC8FC\uAC04 CSV \uAE30\uAC04\uC774 7\uC77C\uC774 \uC544\uB2D9\uB2C8\uB2E4 (${days}\uC77C).`);
  if (startDate.getUTCDay() !== 1 || endDate.getUTCDay() !== 0) {
    warnings.push("\uAE30\uAC04\uC774 \uC6D4\uC694\uC77C-\uC77C\uC694\uC77C \uAE30\uC900\uC774 \uC544\uB2D9\uB2C8\uB2E4.");
  }

  const metricEntries = records(sections.get(SECTION.summary)).flatMap((row): Array<[string, MetricValue]> => {
    const key = row.metricKey?.trim();
    const current = numberOrNull(row.current);
    if (!key || current === null) return [];
    return [[key, {
      label: row.label?.trim() || key,
      current,
      previous: numberOrNull(row.previous),
      diff: numberOrNull(row.diff),
      rate: numberOrNull(row.rate),
      source: row.source?.trim() || undefined,
    }]];
  });
  const metrics = Object.fromEntries(metricEntries);

  const keywordDiffs = diffMap(sections.get(SECTION.keywordDiff), "keyword");
  const channelDiffs = diffMap(sections.get(SECTION.channelDiff), "channel");
  const hourDiffs = diffMap(sections.get(SECTION.hourDiff), "hour");
  const weekdayDiffs = diffMap(sections.get(SECTION.weekdayDiff), "day");
  const keywords = parseMetricRows(sections.get(SECTION.keywords), "keyword", "pv", keywordDiffs);
  const channels = parseMetricRows(sections.get(SECTION.channels), "channel", "pv", channelDiffs);
  const hours = parseMetricRows(sections.get(SECTION.hours), "hour", "pv", hourDiffs)
    .map((row) => ({ ...row, hour: Number(row.label.replace(/[^\d]/g, "")) }))
    .filter((row) => Number.isInteger(row.hour) && row.hour >= 0 && row.hour <= 23);
  const weekdays = parseMetricRows(sections.get(SECTION.weekdays), "day", "pv", weekdayDiffs);

  if (!keywords.length) warnings.push("\uC720\uC785 \uD0A4\uC6CC\uB4DC \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
  if (!channels.length) warnings.push("\uC720\uC785 \uCC44\uB110 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");

  return {
    storeName: storeInfo.storeName?.trim() ?? "",
    sourceVersion: storeInfo.version?.trim() ?? "",
    periodStart,
    periodEnd,
    granularity: periodInfo.granularity?.trim() ?? "weekly",
    metrics,
    keywords,
    channels,
    hours,
    weekdays,
    warnings,
  };
}
