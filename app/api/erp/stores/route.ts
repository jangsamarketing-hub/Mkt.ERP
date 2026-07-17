import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("erp_stores")
      .select("id,name,client_name,manager_name,category,region,contract_start_date,contract_period_weeks,naver_mid,naver_place_url,memo,created_at,updated_at")
      .order("name");

    if (error) throw error;
    return NextResponse.json({ stores: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Store query failed" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("erp_stores")
      .insert({
        name,
        client_name: body.clientName ?? null,
        manager_name: body.managerName ?? null,
        category: body.category ?? null,
        region: body.region ?? null,
        contract_start_date: body.contractStartDate ?? null,
        contract_period_weeks: Number(body.contractPeriodWeeks ?? 4),
        naver_mid: body.naverMid ?? null,
        naver_place_url: body.naverPlaceUrl ?? null,
        memo: body.memo ?? null,
        account_data: body.accountData ?? {},
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ store: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Store creation failed" },
      { status: 500 },
    );
  }
}
