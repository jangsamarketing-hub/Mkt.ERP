import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  balanceAlertLevel,
  isBalanceThresholdOpen,
  shouldEmailBalanceThreshold,
} from "./balance-policy";

const THRESHOLDS = [50_000, 100_000] as const;

type Snapshot = {
  id: string;
  store_id: string;
  captured_at: string;
  biz_money_balance: number | string | null;
  balance_status: string;
};

type OpenAlert = {
  id: string;
  store_id: string;
  threshold_won: number;
  notified_at: string | null;
};

export type BalanceMonitorItem = {
  storeId: string;
  storeName: string;
  managerName: string | null;
  balanceWon: number | null;
  capturedAt: string | null;
  balanceStatus: string;
  alertLevel: "critical" | "warning" | "normal" | "unavailable";
  openThresholds: number[];
};

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function emailSettings() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = (process.env.BALANCE_ALERT_EMAIL_TO ?? "").split(",").map((address) => address.trim()).filter(Boolean);
  const from = process.env.BALANCE_ALERT_EMAIL_FROM?.trim();
  return { apiKey, to, from, enabled: Boolean(apiKey && to.length && from) };
}

async function sendAlertEmail(params: { storeName: string; balanceWon: number; thresholdWon: number }) {
  const settings = emailSettings();
  if (!settings.enabled) return { sent: false, error: "Email environment is not configured." };

  const subject = `[장사 ERP] ${params.storeName} 비즈머니 잔액 ${params.balanceWon.toLocaleString("ko-KR")}원`;
  const html = `<p><strong>${params.storeName}</strong>의 네이버 검색광고 비즈머니 잔액이 <strong>${params.balanceWon.toLocaleString("ko-KR")}원</strong>입니다.</p><p>경고 기준: ${params.thresholdWon.toLocaleString("ko-KR")}원 이하</p>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: settings.from, to: settings.to, subject, html }),
  });
  if (!response.ok) return { sent: false, error: `Email delivery failed (${response.status}).` };
  return { sent: true, error: null };
}

export async function getBalanceMonitorItems(): Promise<BalanceMonitorItem[]> {
  const supabase = getSupabaseAdmin();
  const [{ data: stores, error: storesError }, { data: snapshots, error: snapshotsError }, { data: alerts, error: alertsError }] = await Promise.all([
    supabase.from("erp_stores").select("id,name,manager_name").in("lifecycle_status", ["active", "paused"]).order("name"),
    supabase.from("erp_searchad_account_snapshots").select("id,store_id,captured_at,biz_money_balance,balance_status").order("captured_at", { ascending: false }),
    supabase.from("erp_searchad_balance_alerts").select("store_id,threshold_won").eq("status", "open"),
  ]);
  if (storesError) throw storesError;
  if (snapshotsError) throw snapshotsError;
  // Keep the read-only monitor usable until the additive alert migration is applied.
  // PostgREST reports a newly-added but not yet exposed table as PGRST205,
  // while direct Postgres reports it as 42P01. Either state should not block
  // the read-only balance screen before the optional alert ledger is applied.
  if (alertsError && alertsError.code !== "42P01" && alertsError.code !== "PGRST205") throw alertsError;

  const latestByStore = new Map<string, Snapshot>();
  for (const snapshot of (snapshots ?? []) as Snapshot[]) if (!latestByStore.has(snapshot.store_id)) latestByStore.set(snapshot.store_id, snapshot);
  const thresholdsByStore = new Map<string, number[]>();
  for (const alert of alerts ?? []) thresholdsByStore.set(alert.store_id, [...(thresholdsByStore.get(alert.store_id) ?? []), Number(alert.threshold_won)]);

  return (stores ?? []).map((store) => {
    const snapshot = latestByStore.get(store.id);
    const balanceWon = asNumber(snapshot?.biz_money_balance);
    const alertLevel = balanceAlertLevel(balanceWon, snapshot?.balance_status ?? "unavailable");
    return {
      storeId: store.id,
      storeName: store.name,
      managerName: store.manager_name ?? null,
      balanceWon,
      capturedAt: snapshot?.captured_at ?? null,
      balanceStatus: snapshot?.balance_status ?? "unavailable",
      alertLevel,
      openThresholds: thresholdsByStore.get(store.id) ?? [],
    };
  }).sort((a, b) => (a.balanceWon ?? Number.POSITIVE_INFINITY) - (b.balanceWon ?? Number.POSITIVE_INFINITY));
}

export async function evaluateBalanceAlerts() {
  const supabase = getSupabaseAdmin();
  const items = await getBalanceMonitorItems();
  const { data: alerts, error: alertsError } = await supabase
    .from("erp_searchad_balance_alerts")
    .select("id,store_id,threshold_won,notified_at")
    .eq("status", "open");
  if (alertsError) throw alertsError;
  const openAlerts = (alerts ?? []) as OpenAlert[];
  const existing = new Map(openAlerts.map((alert) => [`${alert.store_id}:${alert.threshold_won}`, alert]));
  const results: Array<{ storeId: string; action: string }> = [];

  for (const item of items) {
    if (item.balanceWon === null || item.balanceStatus !== "available") continue;
    const shouldOpen = new Set(THRESHOLDS.filter((threshold) => isBalanceThresholdOpen(item.balanceWon!, threshold)));
    for (const threshold of THRESHOLDS) {
      const key = `${item.storeId}:${threshold}`;
      const current = existing.get(key);
      if (shouldOpen.has(threshold)) {
        if (!current) {
          const snapshotResult = await supabase.from("erp_searchad_account_snapshots").select("id").eq("store_id", item.storeId).order("captured_at", { ascending: false }).limit(1).maybeSingle();
          if (snapshotResult.error) throw snapshotResult.error;
          const email = shouldEmailBalanceThreshold(threshold)
            ? await sendAlertEmail({ storeName: item.storeName, balanceWon: item.balanceWon, thresholdWon: threshold })
            : { sent: false, error: null };
          const insertResult = await supabase.from("erp_searchad_balance_alerts").insert({
            store_id: item.storeId,
            snapshot_id: snapshotResult.data?.id ?? null,
            threshold_won: threshold,
            balance_won: item.balanceWon,
            notified_at: email.sent ? new Date().toISOString() : null,
            notification_channel: email.sent ? "email" : null,
            notification_error: email.error,
          });
          if (insertResult.error) throw insertResult.error;
          results.push({ storeId: item.storeId, action: email.sent ? `opened_and_emailed_${threshold}` : `opened_${threshold}` });
        } else {
          const email = shouldEmailBalanceThreshold(threshold) && !current.notified_at
            ? await sendAlertEmail({ storeName: item.storeName, balanceWon: item.balanceWon, thresholdWon: threshold })
            : null;
          const updateResult = await supabase.from("erp_searchad_balance_alerts").update({
            balance_won: item.balanceWon,
            last_detected_at: new Date().toISOString(),
            ...(email?.sent ? { notified_at: new Date().toISOString(), notification_channel: "email", notification_error: null } : {}),
            ...(email && !email.sent ? { notification_error: email.error } : {}),
          }).eq("id", current.id);
          if (updateResult.error) throw updateResult.error;
          if (email?.sent) results.push({ storeId: item.storeId, action: `emailed_${threshold}` });
        }
      } else if (current) {
        const updateResult = await supabase.from("erp_searchad_balance_alerts").update({ status: "resolved", resolved_at: new Date().toISOString(), last_detected_at: new Date().toISOString() }).eq("id", current.id);
        if (updateResult.error) throw updateResult.error;
        results.push({ storeId: item.storeId, action: `resolved_${threshold}` });
      }
    }
  }
  return { results, emailConfigured: emailSettings().enabled };
}
