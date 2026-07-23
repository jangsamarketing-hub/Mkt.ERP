export type AnalyticsGranularity = "day" | "week" | "month";

export type TimeBucket = {
  key: string;
  label: string;
  start: string;
  end: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function dateFrom(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date();
}

function mondayOf(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function normalizeGranularity(value: string | null): AnalyticsGranularity {
  return value === "day" || value === "month" ? value : "week";
}

export function buildTimeBuckets(
  referenceDate: string,
  granularity: AnalyticsGranularity,
  count = 4,
): TimeBucket[] {
  const anchor = dateFrom(referenceDate);
  const buckets: TimeBucket[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    if (granularity === "day") {
      const start = new Date(anchor);
      start.setUTCDate(start.getUTCDate() - offset);
      const date = formatDate(start);
      buckets.push({ key: date, label: offset === 0 ? "기준일" : `${offset}일 전`, start: date, end: date });
      continue;
    }

    if (granularity === "week") {
      const start = mondayOf(anchor);
      start.setUTCDate(start.getUTCDate() - offset * 7);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 6);
      buckets.push({
        key: formatDate(start),
        label: offset === 0 ? "기준주" : `${offset}주 전`,
        start: formatDate(start),
        end: formatDate(end),
      });
      continue;
    }

    const start = monthStart(anchor);
    start.setUTCMonth(start.getUTCMonth() - offset);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    buckets.push({
      key: formatDate(start).slice(0, 7),
      label: offset === 0 ? "기준월" : `${offset}개월 전`,
      start: formatDate(start),
      end: formatDate(end),
    });
  }

  return buckets;
}

export function granularityLabel(granularity: AnalyticsGranularity) {
  if (granularity === "day") return "일";
  if (granularity === "month") return "월";
  return "주";
}
