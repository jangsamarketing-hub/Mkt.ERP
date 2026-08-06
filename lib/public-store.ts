import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PublicStore = {
  id: string;
  name: string;
  category: string | null;
  region: string | null;
  naverMid: string;
  publicUid: string;
  managementStartDate: string | null;
  contractPeriodWeeks: number;
};

export async function getPublicStoreByUid(uid: string): Promise<PublicStore | null> {
  const normalizedUid = uid.trim();
  if (!/^[a-z0-9]{16,64}$/i.test(normalizedUid)) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("erp_stores")
    .select("id,name,category,region,naver_mid,public_uid,management_start_date,contract_period_weeks,lifecycle_status")
    .eq("public_uid", normalizedUid)
    .eq("lifecycle_status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.public_uid) return null;
  return {
    id: String(data.id),
    name: String(data.name),
    category: data.category ? String(data.category) : null,
    region: data.region ? String(data.region) : null,
    naverMid: data.naver_mid ? String(data.naver_mid) : "",
    publicUid: String(data.public_uid),
    managementStartDate: data.management_start_date ? String(data.management_start_date) : null,
    contractPeriodWeeks: Number(data.contract_period_weeks ?? 4),
  };
}

export function formatWon(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0)).toLocaleString("ko-KR")}원`;
}
