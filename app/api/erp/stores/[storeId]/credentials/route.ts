import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { decryptCredential, encryptCredential, secretLast4 } from "@/lib/security/credential-vault";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ storeId: string }> };
type Kind = "naver_login" | "searchad_api";

function getAuth(request: Request, storeId: string) {
  return authenticateRequest(request, { storeId, roles: ["admin", "staff"] });
}

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = getAuth(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("erp_store_external_credentials")
      .select("credential_kind,username,secret_last4,updated_at")
      .eq("store_id", storeId);
    if (error) throw error;
    const rows = new Map((data ?? []).map((row) => [row.credential_kind, row]));
    return NextResponse.json({
      naver: rows.get("naver_login") ?? null,
      searchAd: rows.get("searchad_api") ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Credential query failed" }, { status: 503 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = getAuth(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as Record<string, unknown>;
    const kind = String(body.kind ?? "") as Kind;
    const username = String(body.username ?? "").trim();
    const secret = String(body.secret ?? "");
    if ((kind !== "naver_login" && kind !== "searchad_api") || !secret.trim()) {
      return NextResponse.json({ error: "저장할 계정 종류와 비밀번호 또는 Secret Key가 필요합니다." }, { status: 400 });
    }
    const { error } = await getSupabaseAdmin().from("erp_store_external_credentials").upsert({
      store_id: storeId,
      credential_kind: kind,
      username: username || null,
      secret_ciphertext: encryptCredential(secret.trim()),
      secret_last4: secretLast4(secret.trim()),
    }, { onConflict: "store_id,credential_kind" });
    if (error) throw error;
    return NextResponse.json({ saved: true, configured: true, last4: secretLast4(secret.trim()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Credential save failed" }, { status: 503 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = getAuth(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as Record<string, unknown>;
    const kind = String(body.kind ?? "") as Kind;
    if (kind !== "naver_login" && kind !== "searchad_api") return NextResponse.json({ error: "잘못된 계정 종류입니다." }, { status: 400 });
    const { data, error } = await getSupabaseAdmin()
      .from("erp_store_external_credentials")
      .select("username,secret_ciphertext")
      .eq("store_id", storeId)
      .eq("credential_kind", kind)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "저장된 계정 정보가 없습니다." }, { status: 404 });
    return NextResponse.json({ username: data.username, secret: decryptCredential(data.secret_ciphertext) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Credential reveal failed" }, { status: 503 });
  }
}
