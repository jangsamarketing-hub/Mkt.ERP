import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ storeId: string }> };

export const runtime = "nodejs";

const BUCKET = "erp-private-uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function safeFileName(name: string) {
  return name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function extensionIsAllowed(name: string) {
  return /\.(pdf|jpe?g|png|webp)$/i.test(name);
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = authenticateRequest(request, { storeId, roles: ["admin", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);

  let uploadedPath = "";
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Business registration file must be 10 MB or smaller" }, { status: 413 });
    }
    if (!extensionIsAllowed(file.name) || (file.type && !ALLOWED_FILE_TYPES.has(file.type))) {
      return NextResponse.json({ error: "PDF, JPG, PNG, or WEBP file only" }, { status: 415 });
    }

    const supabase = getSupabaseAdmin();
    const { data: store, error: storeError } = await supabase.from("erp_stores").select("id").eq("id", storeId).maybeSingle();
    if (storeError) throw storeError;
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const bytes = Buffer.from(await file.arrayBuffer());
    uploadedPath = `${storeId}/business-registration/${Date.now()}-${safeFileName(file.name)}`;
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(uploadedPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (storageError) throw storageError;

    const { data, error } = await supabase
      .from("erp_store_private_profiles")
      .upsert({ store_id: storeId, business_registration_storage_path: uploadedPath }, { onConflict: "store_id" })
      .select("business_registration_storage_path,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ attachment: data }, { status: 201 });
  } catch (error) {
    if (uploadedPath) await getSupabaseAdmin().storage.from(BUCKET).remove([uploadedPath]);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Business registration upload failed" },
      { status: 500 },
    );
  }
}
