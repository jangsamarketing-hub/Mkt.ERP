import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PublicStore = {
  id: string;
  name: string;
  category: string | null;
  region: string | null;
  naverMid: string;
  managementStartDate: string | null;
  contractPeriodWeeks: number;
};

export async function getPublicStoreByMid(mid: string): Promise<PublicStore | null> {
  const normalizedMid = mid.trim();
  if (!normalizedMid || normalizedMid.length > 120) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("erp_stores")
    .select("id,name,category,region,naver_mid,management_start_date,contract_period_weeks,lifecycle_status")
    .eq("naver_mid", normalizedMid)
    .eq("lifecycle_status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.naver_mid) return null;
  return {
    id: String(data.id),
    name: String(data.name),
    category: data.category ? String(data.category) : null,
    region: data.region ? String(data.region) : null,
    naverMid: String(data.naver_mid),
    managementStartDate: data.management_start_date ? String(data.management_start_date) : null,
    contractPeriodWeeks: Number(data.contract_period_weeks ?? 4),
  };
}

export function formatWon(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0)).toLocaleString("ko-KR")}원`;
}
