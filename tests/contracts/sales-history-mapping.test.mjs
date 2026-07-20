import assert from "node:assert/strict";
import test from "node:test";
import { buildSalesHistoryMappingPreview } from "../../lib/jangsadoctor/mapping.ts";

test("mapping preview never auto-links a same-name candidate", () => {
  const preview = buildSalesHistoryMappingPreview(
    [
      { sourceCompanyId: "1001", storeName: "맛똥삼" },
      { sourceCompanyId: "1002", storeName: "새 매장" },
    ],
    [
      { id: "store-a", name: "맛똥삼", environment: "production", lifecycleStatus: "active", managerName: "담당자" },
      { id: "store-b", name: "다른 매장", environment: "sample", lifecycleStatus: "active", managerName: null },
    ],
    [],
  );
  assert.equal(preview.rows[0].status, "candidate_found");
  assert.equal(preview.rows[0].linkedStoreId, null);
  assert.deepEqual(preview.rows[0].candidateStoreIds, ["store-a"]);
  assert.equal(preview.rows[1].status, "unmatched");
});

test("mapping preview preserves an existing source-company link", () => {
  const preview = buildSalesHistoryMappingPreview(
    [{ sourceCompanyId: "1001", storeName: "이름이 바뀐 매장" }],
    [{ id: "store-a", name: "현재 매장명", environment: "production", lifecycleStatus: "active", managerName: null }],
    [{ sourceCompanyId: "1001", storeId: "store-a" }],
  );
  assert.equal(preview.rows[0].status, "already_linked");
  assert.equal(preview.rows[0].linkedStoreId, "store-a");
});
