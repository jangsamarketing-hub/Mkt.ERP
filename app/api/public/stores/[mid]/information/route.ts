import { NextResponse } from "next/server";
import { getPublicStoreByUid } from "@/lib/public-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ mid: string }> };

const allowedFields = new Set([
  "ownerName", "ownerPhone", "storeAddress", "mainMenus", "businessHours",
  "targetCustomers", "storeStrengths", "currentConcerns", "desiredKeywords", "additionalRequests",
]);

function normalizeAnswers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("answers is required");
  const result: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!allowedFields.has(key)) continue;
    const text = String(rawValue ?? "").trim();
    if (text.length > 3000) throw new Error(`${key} is too long`);
    if (text) result[key] = text;
  }
  if (!result.ownerName || !result.ownerPhone) throw new Error("대표자명과 사장님 연락처를 입력해주세요.");
  return result;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { mid } = await context.params;
    const store = await getPublicStoreByUid(mid);
    if (!store) return NextResponse.json({ error: "공유 링크를 찾을 수 없습니다." }, { status: 404 });
    const body = await request.json() as { answers?: unknown };
    const answers = normalizeAnswers(body.answers);
    const { error } = await getSupabaseAdmin().from("erp_store_information_submissions").insert({ store_id: store.id, answers });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "정보안내문 저장에 실패했습니다." }, { status: 400 });
  }
}
