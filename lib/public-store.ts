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

export async function getPublicStore(identifier: string): Promise<PublicStore | null> {
  const normalizedIdentifier = identifier.trim();
  const isNaverMid = /^\d{1,20}$/.test(normalizedIdentifier);
  const isLegacyPublicUid = /^[a-z0-9]{16,64}$/i.test(normalizedIdentifier);
  if (!isNaverMid && !isLegacyPublicUid) return null;

  let query = getSupabaseAdmin()
    .from("erp_stores")
    .select("id,name,category,region,naver_mid,public_uid,management_start_date,contract_period_weeks,lifecycle_status")
    .eq("lifecycle_status", "active")
    .limit(1);

  query = isNaverMid
    ? query.eq("naver_mid", normalizedIdentifier)
    : query.eq("public_uid", normalizedIdentifier);

  const { data, error } = await query.maybeSingle();
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

// Old opaque-UID links remain valid while new links use the easier-to-share Naver MID.
export const getPublicStoreByUid = getPublicStore;

export function formatWon(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0)).toLocaleString("ko-KR")}원`;
}
