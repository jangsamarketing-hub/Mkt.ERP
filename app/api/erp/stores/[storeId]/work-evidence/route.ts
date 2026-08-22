import { NextResponse } from "next/server";

import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ storeId: string }> };

export const runtime = "nodejs";

const BUCKET = "erp-private-uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = await authenticateRequest(request, { storeId, roles: ["admin", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);

  const formData = await request.formData();
  const file = formData.get("file");
  const workUpdateId = String(formData.get("workUpdateId") ?? "").trim();

  if (!(file instanceof File) || !workUpdateId) {
    return NextResponse.json({ error: "사진 파일과 업무 항목이 필요합니다." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, WEBP 사진만 올릴 수 있습니다." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "사진은 10MB 이하만 올릴 수 있습니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: workUpdate, error: workError } = await supabase
    .from("erp_store_work_updates")
    .select("id")
    .eq("id", workUpdateId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (workError || !workUpdate) {
    return NextResponse.json({ error: "해당 매장 업무를 찾지 못했습니다." }, { status: 404 });
  }

  const path = `${storeId}/work-evidence/${workUpdateId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: `사진 업로드에 실패했습니다: ${uploadError.message}` }, { status: 500 });
  }

  return NextResponse.json({ storageUrl: `storage://${BUCKET}/${path}` });
}
