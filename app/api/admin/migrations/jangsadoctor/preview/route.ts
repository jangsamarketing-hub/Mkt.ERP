import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { previewJangsadoctorImport } from "@/lib/jangsadoctor/contract";
import { isSalesHistoryBatch, previewSalesHistoryBatch } from "@/lib/jangsadoctor/batch-contract";

function isUuid(value: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function POST(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!isUuid(idempotencyKey)) {
    return NextResponse.json({ error: "Idempotency-Key UUID header is required" }, { status: 400 });
  }

  try {
    const payload = await request.json();
    if (isSalesHistoryBatch(payload)) {
      const preview = previewSalesHistoryBatch(payload);
      return NextResponse.json({
        mode: "batch_preview",
        idempotencyKey,
        valid: preview.valid,
        storeMatch: { decision: "manual_review_required", sourceCompanyId: null, storeName: `${preview.storeCount}개 매장` },
        changes: {
          store: { create: 0, update: 0, unchanged: 0 },
          revenueDaily: { create: preview.revenue.rowCount, update: 0, unchanged: 0, rejected: preview.errors.length },
        },
        revenue: { ...preview.revenue, missingDates: [], zeroAmountDates: [] },
        batch: {
          storeCount: preview.storeCount,
          validStoreCount: preview.validStoreCount,
          unprovidedDateCount: preview.revenue.unprovidedDateCount,
          stores: preview.stores.map((store) => ({
            sourceCompanyId: store.sourceCompanyId,
            storeName: store.storeName,
            rowCount: store.rowCount,
            totalAmount: store.totalAmount,
            totalCount: store.totalCount,
            unprovidedDateCount: store.unprovidedDateCount,
            zeroAmountRowCount: store.zeroAmountRowCount,
            errorCount: store.errors.length,
            warningCount: store.warnings.length,
          })),
        },
        snapshotHash: preview.snapshotHash,
        warnings: preview.warnings,
        errors: preview.errors,
        commitAvailable: false,
      }, { status: preview.valid ? 200 : 422 });
    }

    const preview = previewJangsadoctorImport(payload);
    return NextResponse.json({
      mode: "preview",
      idempotencyKey,
      valid: preview.valid,
      storeMatch: {
        decision: "manual_review_required",
        sourceCompanyId: preview.sourceCompanyId,
        storeName: preview.storeName,
      },
      changes: {
        store: { create: 0, update: 0, unchanged: 0 },
        revenueDaily: { create: preview.revenue.rowCount, update: 0, unchanged: 0, rejected: preview.errors.length },
      },
      revenue: preview.revenue,
      snapshotHash: preview.snapshotHash,
      warnings: preview.warnings,
      errors: preview.errors,
      commitAvailable: false,
    }, { status: preview.valid ? 200 : 422 });
  } catch {
    return NextResponse.json({ error: "JSON payload is required" }, { status: 400 });
  }
}
