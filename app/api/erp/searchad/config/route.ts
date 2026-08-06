import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function validTimes(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) throw new Error("dailySyncTimes must contain 1 to 3 times");
  const times = Array.from(new Set(value.map((item) => String(item).trim()))).sort();
  if (times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error("dailySyncTimes must use HH:MM");
  return times.map((time) => `${time}:00`);
}

export async function PUT(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const body = await request.json() as Record<string, unknown>;
    const storeId = String(body.storeId ?? "").trim();
    if (!storeId) throw new Error("storeId is required");
    const dailySyncTimes = validTimes(body.dailySyncTimes);
    const enabled = Boolean(body.enabled);
    const { data, error } = await getSupabaseAdmin().from("erp_searchad_sync_configs").upsert({
      store_id: storeId,
      enabled,
      daily_sync_times: dailySyncTimes,
      timezone: "Asia/Seoul",
    }, { onConflict: "store_id" }).select("enabled,daily_sync_times,timezone,updated_at").single();
    if (error) throw error;
    return NextResponse.json({ config: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SearchAd config failed" }, { status: 400 });
  }
}
