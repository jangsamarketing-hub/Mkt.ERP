export type WeeklyPeriodInput = {
  startDate: string;
  endDate: string;
  sourceId?: string;
};

export type WeeklyCoverageSlot = {
  startDate: string;
  endDate: string;
  status: "complete" | "missing" | "duplicate";
  importCount: number;
  sourceIds: string[];
};

export type WeeklyCoverageResult = {
  slots: WeeklyCoverageSlot[];
  gaps: WeeklyCoverageSlot[];
  duplicates: WeeklyCoverageSlot[];
  invalidPeriods: Array<WeeklyPeriodInput & { reason: string }>;
};

export type DatedValueRow = {
  date?: string | null;
  amount?: number | null;
  valueStatus?: string | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string) {
  if (!ISO_DATE.test(value)) throw new Error(`Invalid ISO date: ${value}`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return date;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function validateWeeklyPeriod(period: WeeklyPeriodInput) {
  try {
    const start = parseIsoDate(period.startDate);
    const end = parseIsoDate(period.endDate);
    if (start.getUTCDay() !== 1) return "start_date_is_not_monday";
    if (end.getUTCDay() !== 0) return "end_date_is_not_sunday";
    if (period.endDate !== addDays(period.startDate, 6)) return "period_is_not_seven_days";
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "invalid_period";
  }
}

export function analyzeWeeklyCoverage(
  periods: WeeklyPeriodInput[],
  expectedStartDate: string,
  expectedEndDate: string,
): WeeklyCoverageResult {
  const expectedStart = parseIsoDate(expectedStartDate);
  const expectedEnd = parseIsoDate(expectedEndDate);
  if (expectedStart.getUTCDay() !== 1) throw new Error("Expected range must start on Monday.");
  if (expectedEnd.getUTCDay() !== 0) throw new Error("Expected range must end on Sunday.");
  if (expectedStart > expectedEnd) throw new Error("Expected range start is after end.");

  const invalidPeriods: WeeklyCoverageResult["invalidPeriods"] = [];
  const byPeriod = new Map<string, WeeklyPeriodInput[]>();

  for (const period of periods) {
    const reason = validateWeeklyPeriod(period);
    if (reason) {
      invalidPeriods.push({ ...period, reason });
      continue;
    }
    const key = `${period.startDate}|${period.endDate}`;
    const matches = byPeriod.get(key) ?? [];
    matches.push(period);
    byPeriod.set(key, matches);
  }

  const slots: WeeklyCoverageSlot[] = [];
  for (let startDate = expectedStartDate; startDate <= expectedEndDate; startDate = addDays(startDate, 7)) {
    const endDate = addDays(startDate, 6);
    const matches = byPeriod.get(`${startDate}|${endDate}`) ?? [];
    slots.push({
      startDate,
      endDate,
      status: matches.length === 0 ? "missing" : matches.length === 1 ? "complete" : "duplicate",
      importCount: matches.length,
      sourceIds: matches.map((match) => match.sourceId).filter((sourceId): sourceId is string => Boolean(sourceId)),
    });
  }

  return {
    slots,
    gaps: slots.filter((slot) => slot.status === "missing"),
    duplicates: slots.filter((slot) => slot.status === "duplicate"),
    invalidPeriods,
  };
}

export function listMissingDates(startDate: string, endDate: string, observedDates: string[]) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (start > end) throw new Error("Date range start is after end.");
  const observed = new Set(observedDates);
  const missing: string[] = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    if (!observed.has(date)) missing.push(date);
  }
  return missing;
}

export function listUnavailableDates(startDate: string, endDate: string, rows: DatedValueRow[]) {
  const unavailable = new Set(listMissingDates(
    startDate,
    endDate,
    rows.map((row) => row.date).filter((date): date is string => Boolean(date)),
  ));

  for (const row of rows) {
    if (!row.date || row.date < startDate || row.date > endDate) continue;
    const hasNumericAmount = typeof row.amount === "number" && Number.isFinite(row.amount);
    if (!hasNumericAmount || row.valueStatus === "missing") unavailable.add(row.date);
  }

  return [...unavailable].sort();
}
