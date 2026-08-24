import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const FIXED_DAILY_SYNC_TIMES = ["10:00:00", "17:00:00"];

export async function PUT(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as Record<string, unknown>;
    const storeId = String(body.storeId ?? "").trim();
    if (!storeId) throw new Error("storeId is required");
    const enabled = Boolean(body.enabled);
    const { data, error } = await getSupabaseAdmin().from("erp_searchad_sync_configs").upsert({
      store_id: storeId,
      enabled,
      daily_sync_times: FIXED_DAILY_SYNC_TIMES,
      timezone: "Asia/Seoul",
    }, { onConflict: "store_id" }).select("enabled,daily_sync_times,timezone,updated_at").single();
    if (error) throw error;
    return NextResponse.json({ config: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SearchAd config failed" }, { status: 400 });
  }
}
