import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parsePlaceInsightCsv, PLACE_CSV_PARSER_VERSION } from "../../lib/place-csv/parser.ts";

const fixtureUrl = new URL("../fixtures/place-weekly.csv", import.meta.url);

test("Place CSV parser keeps weekly metrics and quoted keywords stable", async () => {
  const parsed = parsePlaceInsightCsv(await readFile(fixtureUrl, "utf8"));

  assert.equal(PLACE_CSV_PARSER_VERSION, "place-insight-v1");
  assert.equal(parsed.storeName, "회귀검증 테스트매장");
  assert.deepEqual([parsed.periodStart, parsed.periodEnd, parsed.granularity], ["2026-07-13", "2026-07-19", "weekly"]);
  assert.equal(parsed.metrics.placeInflow.current, 1000);
  assert.equal(parsed.metrics.placeInflow.previous, 900);
  assert.equal(parsed.keywords[0].label, "테스트매장, 점심");
  assert.equal(parsed.keywords[0].previous, 250);
  assert.deepEqual(parsed.hours.map((row) => row.hour), [12, 18]);
  assert.deepEqual(parsed.weekdays.map((row) => row.label), ["월", "화", "수", "목", "금", "토", "일"]);
  assert.deepEqual(parsed.warnings, []);
});

test("Place CSV parser distinguishes missing modules from numeric zero", () => {
  const csv = `[매장 정보]\nstoreName,빈 모듈 테스트\n[기간 정보]\nstartDate,2026-07-13\nendDate,2026-07-19\ngranularity,weekly\n[1. 리포트 요약 지표]\nmetricKey,label,current,previous,diff,rate,source\nplaceInflow,플레이스 유입,0,,,,fixture\n`;
  const parsed = parsePlaceInsightCsv(csv);

  assert.equal(parsed.metrics.placeInflow.current, 0);
  assert.equal(parsed.keywords.length, 0);
  assert.equal(parsed.channels.length, 0);
  assert.ok(parsed.warnings.includes("유입 키워드 데이터가 없습니다."));
  assert.ok(parsed.warnings.includes("유입 채널 데이터가 없습니다."));
});

test("Place CSV parser rejects a missing period", () => {
  assert.throws(() => parsePlaceInsightCsv("[매장 정보]\nstoreName,테스트"), /기간 정보를 찾지 못했습니다/);
});
