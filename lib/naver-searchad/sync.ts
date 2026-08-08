import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchSearchAdReadOnlySnapshot } from "./read-only";
import { decryptCredential } from "@/lib/security/credential-vault";

function kstDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const value = new Date(`${values.year}-${values.month}-${values.day}T00:00:00+09:00`);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

export type SearchAdSyncResult = { ok: boolean; status: string; message: string; statDate: string };

export async function syncStoreSearchAd(storeId: string, options: { runKind: "daily" | "manual"; statDate?: string }) : Promise<SearchAdSyncResult> {
  const supabase = getSupabaseAdmin();
  const statDate = options.statDate ?? kstDate(options.runKind === "daily" ? -1 : 0);
  const { data: identifier, error: identifierError } = await supabase
    .from("store_external_identifiers")
    .select("identifier_value")
    .eq("store_id", storeId)
    .eq("identifier_type", "naver_searchad_customer_id")
    .eq("is_primary", true)
    .maybeSingle();
  if (identifierError) throw identifierError;
  if (!identifier?.identifier_value) return { ok: false, status: "skipped", message: "검색광고 Customer ID가 아직 연결되지 않았습니다.", statDate };

  const { data: credential, error: credentialError } = await supabase
    .from("erp_store_external_credentials")
    .select("username,secret_ciphertext")
    .eq("store_id", storeId)
    .eq("credential_kind", "searchad_api")
    .maybeSingle();
  if (credentialError) throw credentialError;
  if (!credential?.username || !credential.secret_ciphertext) {
    return { ok: false, status: "skipped", message: "이 매장의 검색광고 Access License와 Secret Key를 먼저 저장해주세요.", statDate };
  }

  const { data: run, error: runError } = await supabase
    .from("erp_searchad_sync_runs")
    .insert({ store_id: storeId, run_kind: options.runKind, requested_for_date: statDate })
    .select("id")
    .single();
  if (runError) throw runError;

  try {
    const snapshot = await fetchSearchAdReadOnlySnapshot(String(identifier.identifier_value), statDate, {
      accessLicense: credential.username,
      secretKey: decryptCredential(credential.secret_ciphertext),
    });
    const rows = snapshot.campaigns.map((row) => ({
      store_id: storeId,
      stat_date: statDate,
      campaign_id: row.campaignId,
      campaign_name: row.campaignName,
      campaign_type: row.campaignType,
      campaign_status: row.campaignStatus,
      daily_budget: row.dailyBudget,
      impressions: row.impressions,
      clicks: row.clicks,
      ad_spend: row.adSpend,
      ctr: row.ctr,
      average_cpc: row.averageCpc,
      average_rank: row.averageRank,
      conversions: row.conversions,
      raw_metrics: row.rawMetrics,
      synced_at: new Date().toISOString(),
    }));
    if (rows.length) {
      const { error } = await supabase.from("erp_searchad_campaign_daily_stats").upsert(rows, { onConflict: "store_id,stat_date,campaign_id" });
      if (error) throw error;
    }
    const { error: accountError } = await supabase.from("erp_searchad_account_snapshots").insert({
      store_id: storeId,
      sync_run_id: run.id,
      customer_id: snapshot.customerId,
      campaign_count: snapshot.campaignCount,
      active_campaign_count: snapshot.activeCampaignCount,
      biz_money_balance: snapshot.balance,
      balance_status: snapshot.balanceStatus,
      raw_account: snapshot.rawAccount,
    });
    if (accountError) throw accountError;
    const { error: doneError } = await supabase.from("erp_searchad_sync_runs").update({ status: "succeeded", finished_at: new Date().toISOString() }).eq("id", run.id);
    if (doneError) throw doneError;
    return { ok: true, status: "succeeded", message: `${statDate} 검색광고 성과를 저장했습니다.`, statDate };
  } catch (error) {
    const message = error instanceof Error ? error.message : "검색광고 수집에 실패했습니다.";
    await supabase.from("erp_searchad_sync_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: message }).eq("id", run.id);
    return { ok: false, status: "failed", message, statDate };
  }
}

export async function getEnabledSearchAdStoreIds() {
  const { data, error } = await getSupabaseAdmin().from("erp_searchad_sync_configs").select("store_id").eq("enabled", true);
  if (error) throw error;
  return (data ?? []).map((row) => String(row.store_id));
}
