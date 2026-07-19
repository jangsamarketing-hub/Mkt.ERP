import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fixtureUrl = new URL("../fixtures/naver-place-json-2.0.0.sanitized.json", import.meta.url);

test("Naver JSON 2.0 fixture preserves period, module and partial-collection semantics", async () => {
  const sample = JSON.parse(await readFile(fixtureUrl, "utf8"));

  assert.equal(sample.schema_version, "2.0.0");
  assert.equal(sample.collector.version, "1.4.1");
  assert.deepEqual(sample.period, {
    start_date: "2026-06-01",
    end_date: "2026-06-30",
    period_type: "month",
    day_count: 30
  });
  assert.deepEqual(Object.keys(sample.modules), ["report", "place", "sales", "smart_call", "reservation", "reviews", "ai_review"]);
  assert.equal(sample.coverage.smartCall.status, "summary_only");
  assert.equal(sample.modules.smart_call.collection.detailEnabled, false);
  assert.ok(sample.quality.blockedModules.includes("smartCallDetail"));
});
