import { notFound } from "next/navigation";
import { PublicStoreWorkItem } from "@/components/public-store-work-list";
import { PublicStoreWorkListV2 } from "@/components/public-store-work-list-v2";
import { getPublicStore } from "@/lib/public-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type PageProps = { params: Promise<{ mid: string }> };

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export default async function PublicDaylistPage({ params }: PageProps) {
  const { mid } = await params;
  const store = await getPublicStore(mid);
  if (!store) notFound();

  const supabase = getSupabaseAdmin();
  const [dailyResult, inflowResult, workResult, adSnapshotResult, adStatsResult] = await Promise.all([
    supabase
      .from("erp_card_daily_summary")
      .select("transaction_date,net_sales,net_payment_count")
      .eq("store_id", store.id)
      .order("transaction_date", { ascending: false })
      .limit(7),
    supabase
      .from("erp_place_csv_uploads")
      .select("period_start,period_end,summary")
      .eq("store_id", store.id)
      .eq("status", "ready")
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("erp_store_work_updates")
      .select("id,task_date,task_week,title,evidence_text,evidence_urls")
      .eq("store_id", store.id)
      .eq("public_visible", true)
      .order("task_week", { ascending: true, nullsFirst: false })
      .order("task_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("erp_searchad_account_snapshots")
      .select("biz_money_balance,balance_status,campaign_count,captured_at")
      .eq("store_id", store.id)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("erp_searchad_campaign_daily_stats")
      .select("impressions,clicks,average_rank")
      .eq("store_id", store.id)
      .order("stat_date", { ascending: false })
      .limit(1000),
  ]);
  if (dailyResult.error) throw dailyResult.error;
  if (inflowResult.error) throw inflowResult.error;
  if (workResult.error) throw workResult.error;
  if (adSnapshotResult.error) throw adSnapshotResult.error;
  if (adStatsResult.error) throw adStatsResult.error;

  const dailyRows = dailyResult.data ?? [];
  const recentSales = dailyRows.reduce((sum, row) => sum + Number(row.net_sales ?? 0), 0);
  const recentPayments = dailyRows.reduce((sum, row) => sum + Number(row.net_payment_count ?? 0), 0);
  const summary = (inflowResult.data?.summary ?? {}) as Record<string, unknown>;
  const placeInflow = typeof summary.placeInflow === "number" ? summary.placeInflow : null;
  const workItems: PublicStoreWorkItem[] = await Promise.all((workResult.data ?? []).map(async (item) => {
    const sourceUrls = Array.isArray(item.evidence_urls)
      ? item.evidence_urls.filter((value): value is string => typeof value === "string")
      : [];
    const evidenceUrls = await Promise.all(sourceUrls.map(async (url) => {
      const prefix = "storage://erp-private-uploads/";
      if (!url.startsWith(prefix)) return url;
      const { data, error } = await supabase.storage
        .from("erp-private-uploads")
        .createSignedUrl(url.slice(prefix.length), 60 * 60);
      return error || !data?.signedUrl ? "" : data.signedUrl;
    }));

    return {
      id: item.id,
      week: Number(item.task_week ?? 1),
      date: item.task_date,
      title: item.title,
      evidenceText: item.evidence_text,
      evidenceUrls: evidenceUrls.filter(Boolean),
    };
  }));
  const writtenCount = workItems.filter((item) => item.evidenceText || item.evidenceUrls.length).length;
  const adRows = adStatsResult.data ?? [];
  const adImpressions = adRows.reduce((sum, row) => sum + Number(row.impressions ?? 0), 0);
  const adClicks = adRows.reduce((sum, row) => sum + Number(row.clicks ?? 0), 0);
  const rankedRows = adRows.filter((row) => Number(row.average_rank ?? 0) > 0);
  const averageRank = rankedRows.length
    ? rankedRows.reduce((sum, row) => sum + Number(row.average_rank), 0) / rankedRows.length
    : null;
  const balance = adSnapshotResult.data?.balance_status === "available"
    ? Math.max(0, Math.floor(Number(adSnapshotResult.data.biz_money_balance ?? 0)))
    : null;

  return (
    <main className="public-store-shell">
      <header className="public-store-header"><span>장사 ERP</span><strong>사장님 업무 보고서</strong></header>
      <img alt="핑크 펭귄 장사 ERP 마스코트" className="public-hero-mascot" src="/brand/pink-penguin-wave.png" />
      <section className="public-store-hero">
        <p>{store.category ?? "음식점"}{store.region ? ` · ${store.region}` : ""}</p>
        <h1>{store.name}의 관리 리포트</h1>
        <span>{store.managementStartDate ? `관리 시작일 ${store.managementStartDate}` : "관리 시작일 확인 중"} · {store.contractPeriodWeeks}주 관리</span>
      </section>
      <section className="public-metric-grid">
        <article><span>최근 집계 매출</span><strong>{dailyRows.length ? formatWon(recentSales) : "미수집"}</strong><small>{dailyRows.length ? `최근 ${dailyRows.length}일 승인 데이터` : "여신금융 파일 등록 후 표시"}</small></article>
        <article><span>최근 결제건수</span><strong>{dailyRows.length ? `${recentPayments.toLocaleString("ko-KR")}건` : "미수집"}</strong><small>{dailyRows.length ? "기간 내 승인 데이터" : "데이터가 아직 없습니다"}</small></article>
        <article><span>네이버 플레이스 유입</span><strong>{placeInflow === null ? "미수집" : placeInflow.toLocaleString("ko-KR")}</strong><small>{inflowResult.data ? `${inflowResult.data.period_start} ~ ${inflowResult.data.period_end}` : "네이버 파일 등록 후 표시"}</small></article>
        <article><span>업무 기입</span><strong>{workItems.length ? `${writtenCount}/${workItems.length}` : "준비 중"}</strong><small>{workItems.length ? "기입 또는 첨부 기준" : "공개할 업무가 없습니다"}</small></article>
      </section>
      <section className="public-section public-ad-summary">
        <div className="public-section-heading">
          <h2>검색광고 요약</h2>
          <p>읽기 전용으로 저장된 최신 검색광고 원장을 표시합니다.</p>
        </div>
        <div className="public-metric-grid">
          <article><span>비즈머니 잔액</span><strong>{balance === null ? "데이터 없음" : formatWon(balance)}</strong><small>{balance !== null && balance <= 100000 ? "충전 확인 필요" : "최근 수집 기준"}</small></article>
          <article><span>노출 · 클릭</span><strong>{adRows.length ? `${adImpressions.toLocaleString("ko-KR")} · ${adClicks.toLocaleString("ko-KR")}` : "데이터 없음"}</strong><small>노출수 · 클릭수</small></article>
          <article><span>평균 노출순위</span><strong>{averageRank === null ? "데이터 없음" : averageRank.toFixed(2)}</strong><small>수집된 캠페인 성과 기준</small></article>
        </div>
      </section>
      <section className="public-section">
        <div className="public-section-heading"><h2>주차별 업무 진행 내용</h2><p>항목을 누르면 회사가 기록한 처리 내용과 첨부 자료를 확인할 수 있습니다.</p></div>
        <PublicStoreWorkListV2 contractWeeks={store.contractPeriodWeeks} items={workItems} />
      </section>
      <footer className="public-store-footer">장사 ERP · 매장에 맞는 성장 구조를 함께 만듭니다.</footer>
    </main>
  );
}
