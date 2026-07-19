import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { analyzeWeeklyCoverage, listMissingDates, listUnavailableDates } from "../lib/ingestion/weekly-coverage.ts";

const paths = process.argv.slice(2);
if (!paths.length) {
  console.error("Usage: npm run verify:place-periods -- <naver-json-path> [...more-json-paths]");
  process.exitCode = 2;
} else {
  const samples = await Promise.all(paths.map(async (path) => {
    const bytes = await readFile(path);
    const data = JSON.parse(bytes.toString("utf8"));
    return {
      file: basename(path),
      hash: createHash("sha256").update(bytes).digest("hex"),
      storeFingerprint: createHash("sha256").update([
        data.store?.business_key,
        data.store?.store_key,
        data.store?.store_name,
      ].join("|")).digest("hex").slice(0, 16),
      schemaVersion: data.schema_version,
      collectorVersion: data.collector?.version,
      period: data.period,
      coverage: data.coverage,
      quality: data.quality,
      dailySalesRows: data.modules?.sales?.dailySales ?? [],
      reconciliationMissingDates: data.modules?.sales?.reconciliation?.missingDates ?? [],
      weeklyTotal: data.modules?.sales?.periodTotal?.amount ?? null,
    };
  }));

  assert.equal(new Set(samples.map((sample) => sample.storeFingerprint)).size, 1, "Samples are not from one store.");
  assert.equal(new Set(samples.map((sample) => sample.schemaVersion)).size, 1, "Schema version drift detected.");
  assert.equal(new Set(samples.map((sample) => sample.hash)).size, samples.length, "Exact duplicate file detected.");

  const weeks = samples.filter((sample) => sample.period?.period_type === "week");
  const sortedWeeks = [...weeks].sort((a, b) => a.period.start_date.localeCompare(b.period.start_date));
  const weeklyCoverage = sortedWeeks.length
    ? analyzeWeeklyCoverage(
      sortedWeeks.map((sample) => ({ startDate: sample.period.start_date, endDate: sample.period.end_date, sourceId: sample.hash.slice(0, 12) })),
      sortedWeeks[0].period.start_date,
      sortedWeeks[sortedWeeks.length - 1].period.end_date,
    )
    : null;

  console.log(JSON.stringify({
    samples: samples.map((sample) => ({
      file: sample.file,
      hash: sample.hash,
      schemaVersion: sample.schemaVersion,
      collectorVersion: sample.collectorVersion,
      period: sample.period,
      moduleCoverage: Object.fromEntries(Object.entries(sample.coverage ?? {}).map(([module, value]) => [module, value.status])),
      dailySalesAbsentDates: listMissingDates(
        sample.period.start_date,
        sample.period.end_date,
        sample.dailySalesRows.map((row) => row.date).filter(Boolean),
      ),
      dailySalesUnavailableDates: listUnavailableDates(
        sample.period.start_date,
        sample.period.end_date,
        sample.dailySalesRows,
      ),
      reconciliationMissingDates: sample.reconciliationMissingDates,
      weeklyTotal: sample.weeklyTotal,
    })),
    weeklyCoverage,
  }, null, 2));
}
