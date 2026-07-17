import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type PlaceUploadPayload = {
  storeId: string;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  summary?: Record<string, unknown>;
  keywords?: Array<{ keyword: string; visitCount: number }>;
  channels?: Array<{ channel: string; visitCount: number }>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PlaceUploadPayload;
    if (!body.storeId || !body.fileName || !body.periodStart || !body.periodEnd) {
      return NextResponse.json({ error: "storeId, fileName, periodStart and periodEnd are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: upload, error: uploadError } = await supabase
      .from("erp_place_csv_uploads")
      .insert({
        store_id: body.storeId,
        file_name: body.fileName,
        period_start: body.periodStart,
        period_end: body.periodEnd,
        summary: body.summary ?? {},
      })
      .select("id,store_id,file_name,period_start,period_end,uploaded_at")
      .single();

    if (uploadError) throw uploadError;

    const keywords = (body.keywords ?? []).filter((row) => row.keyword.trim());
    if (keywords.length) {
      const { error } = await supabase.from("erp_place_keyword_rows").insert(
        keywords.map((row) => ({
          upload_id: upload.id,
          store_id: body.storeId,
          keyword: row.keyword.trim(),
          visit_count: Math.max(0, Number(row.visitCount) || 0),
          period_start: body.periodStart,
          period_end: body.periodEnd,
        })),
      );
      if (error) throw error;
    }

    const channels = (body.channels ?? []).filter((row) => row.channel.trim());
    if (channels.length) {
      const { error } = await supabase.from("erp_place_channel_rows").insert(
        channels.map((row) => ({
          upload_id: upload.id,
          store_id: body.storeId,
          channel: row.channel.trim(),
          visit_count: Math.max(0, Number(row.visitCount) || 0),
          period_start: body.periodStart,
          period_end: body.periodEnd,
        })),
      );
      if (error) throw error;
    }

    return NextResponse.json({ upload });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Place upload failed" },
      { status: 500 },
    );
  }
}
