import assert from "node:assert/strict";
import test from "node:test";
import { analyzeWeeklyCoverage, listMissingDates, listUnavailableDates } from "../../lib/ingestion/weekly-coverage.ts";

test("two consecutive Monday-Sunday files have no weekly gap", () => {
  const result = analyzeWeeklyCoverage([
    { startDate: "2026-06-29", endDate: "2026-07-05", sourceId: "week-1" },
    { startDate: "2026-07-06", endDate: "2026-07-12", sourceId: "week-2" },
  ], "2026-06-29", "2026-07-12");

  assert.deepEqual(result.slots.map((slot) => slot.status), ["complete", "complete"]);
  assert.deepEqual(result.gaps, []);
  assert.deepEqual(result.duplicates, []);
  assert.deepEqual(result.invalidPeriods, []);
});

test("a missing middle week is reported instead of treated as zero", () => {
  const result = analyzeWeeklyCoverage([
    { startDate: "2026-06-29", endDate: "2026-07-05" },
    { startDate: "2026-07-13", endDate: "2026-07-19" },
  ], "2026-06-29", "2026-07-19");

  assert.deepEqual(result.gaps.map(({ startDate, endDate }) => ({ startDate, endDate })), [
    { startDate: "2026-07-06", endDate: "2026-07-12" },
  ]);
});

test("same weekly period is marked duplicate and malformed periods are rejected", () => {
  const result = analyzeWeeklyCoverage([
    { startDate: "2026-07-06", endDate: "2026-07-12", sourceId: "first" },
    { startDate: "2026-07-06", endDate: "2026-07-12", sourceId: "second" },
    { startDate: "2026-07-07", endDate: "2026-07-13", sourceId: "invalid" },
  ], "2026-07-06", "2026-07-12");

  assert.equal(result.duplicates[0].importCount, 2);
  assert.deepEqual(result.duplicates[0].sourceIds, ["first", "second"]);
  assert.equal(result.invalidPeriods[0].reason, "start_date_is_not_monday");
});

test("daily detail gaps are checked independently from a valid weekly total", () => {
  assert.deepEqual(
    listMissingDates("2026-06-29", "2026-07-05", ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"]),
    ["2026-06-29", "2026-06-30"],
  );
});

test("a dated row with a missing value is unavailable rather than actual zero", () => {
  assert.deepEqual(
    listUnavailableDates("2026-06-01", "2026-06-03", [
      { date: "2026-06-01", amount: 1000, valueStatus: "available" },
      { date: "2026-06-02", amount: 0, valueStatus: "available" },
      { date: "2026-06-03", amount: null, valueStatus: "missing" },
    ]),
    ["2026-06-03"],
  );
});
