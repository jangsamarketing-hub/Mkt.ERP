import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mondayOf(dateText: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? new Date(`${dateText}T00:00:00Z`) : new Date();
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return date;
}

export async function GET(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const url = new URL(request.url);
    const currentMonday = mondayOf(url.searchParams.get("date") ?? "");
    const firstMonday = new Date(currentMonday);
    firstMonday.setUTCDate(firstMonday.getUTCDate() - 21);
    const lastSunday = new Date(currentMonday);
    lastSunday.setUTCDate(lastSunday.getUTCDate() + 6);

    const supabase = getSupabaseAdmin();
    const [{ data: stores, error: storeError }, { data: uploads, error: uploadError }] = await Promise.all([
      supabase.from("erp_stores").select("id,name,manager_name,category,region,naver_mid").order("name"),
      supabase
        .from("erp_place_csv_uploads")
        .select("id,store_id,period_start,period_end,summary")
        .eq("status", "ready")
        .eq("is_current", true)
        .gte("period_start", isoDate(firstMonday))
        .lte("period_end", isoDate(lastSunday))
        .order("period_start"),
    ]);
    if (storeError) throw storeError;
    if (uploadError) throw uploadError;

    const result = (stores ?? []).map((store) => {
      const storeUploads = (uploads ?? []).filter((upload) => upload.store_id === store.id);
      const weeklyInflow = Array.from({ length: 4 }, (_, index) => {
        const weekStart = new Date(firstMonday);
        weekStart.setUTCDate(weekStart.getUTCDate() + index * 7);
        const upload = storeUploads.find((item) => item.period_start === isoDate(weekStart));
        const summary = upload?.summary as { placeInflow?: number | null } | null;
        return summary?.placeInflow ?? null;
      });
      return {
        id: store.id,
        name: store.name,
        managerName: store.manager_name,
        category: store.category,
        region: store.region,
        naverMid: store.naver_mid,
        weeklyInflow,
        currentInflow: weeklyInflow[3],
        previousInflow: weeklyInflow[2],
      };
    });

    return NextResponse.json({
      range: { start: isoDate(firstMonday), end: isoDate(lastSunday) },
      stores: result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dashboard query failed" },
      { status: 503 },
    );
  }
}
