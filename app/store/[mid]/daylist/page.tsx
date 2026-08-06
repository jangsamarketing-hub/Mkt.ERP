import { notFound } from "next/navigation";
import { formatWon, getPublicStore } from "@/lib/public-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type PageProps = { params: Promise<{ mid: string }> };

export default async function PublicDaylistPage({ params }: PageProps) {
  const { mid } = await params;
  const store = await getPublicStore(mid);
  if (!store) notFound();

  const supabase = getSupabaseAdmin();
  const [dailyResult, inflowResult, setupMonthsResult] = await Promise.all([
    supabase.from("erp_card_daily_summary").select("transaction_date,net_sales,net_payment_count").eq("store_id", store.id).order("transaction_date", { ascending: false }).limit(7),
    supabase.from("erp_place_csv_uploads").select("period_start,period_end,summary").eq("store_id", store.id).eq("status", "ready").order("period_end", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("erp_store_setup_months").select("month_start").eq("store_id", store.id).order("month_start", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (dailyResult.error) throw dailyResult.error;
  if (inflowResult.error) throw inflowResult.error;
  if (setupMonthsResult.error) throw setupMonthsResult.error;

  const latestMonth = setupMonthsResult.data?.month_start ?? null;
  const setupResult = latestMonth
    ? await supabase.from("erp_store_setup_items").select("label,completed,progress_percent,due_date").eq("store_id", store.id).eq("month_start", latestMonth).order("sort_order")
    : { data: [], error: null };
  if (setupResult.error) throw setupResult.error;

  const dailyRows = dailyResult.data ?? [];
  const totalSales = dailyRows.reduce((sum, row) => sum + Number(row.net_sales ?? 0), 0);
  const totalPayments = dailyRows.reduce((sum, row) => sum + Number(row.net_payment_count ?? 0), 0);
  const summary = (inflowResult.data?.summary ?? {}) as Record<string, unknown>;
  const completed = (setupResult.data ?? []).filter((item) => item.completed).length;
  const setupCount = setupResult.data?.length ?? 0;

  return (
    <main className="public-store-shell">
      <header className="public-store-header"><span>장사ERP</span><strong>매장 진행 리포트</strong></header>
      <section className="public-store-hero">
        <p>{store.category ?? "음식점"}{store.region ? ` · ${store.region}` : ""}</p>
        <h1>{store.name}</h1>
        <span>관리 시작일 {store.managementStartDate ?? "확인 중"} · {store.contractPeriodWeeks}주 관리</span>
      </section>
      <section className="public-metric-grid">
        <article><span>최근 집계 매출</span><strong>{dailyRows.length ? formatWon(totalSales) : "미수집"}</strong><small>{dailyRows.length ? `${dailyRows.length}일 데이터 기준` : "여신금융 파일 업로드 후 표시"}</small></article>
        <article><span>최근 결제건수</span><strong>{dailyRows.length ? `${totalPayments.toLocaleString("ko-KR")}건` : "미수집"}</strong><small>{dailyRows.length ? "기간 내 실제 승인 데이터" : "데이터가 아직 없습니다"}</small></article>
        <article><span>네이버 플레이스 유입</span><strong>{typeof summary.placeInflow === "number" ? Number(summary.placeInflow).toLocaleString("ko-KR") : "미수집"}</strong><small>{inflowResult.data ? `${inflowResult.data.period_start}~${inflowResult.data.period_end}` : "네이버 파일 업로드 후 표시"}</small></article>
        <article><span>이번 관리월 진행</span><strong>{setupCount ? `${completed}/${setupCount}` : "준비 중"}</strong><small>{latestMonth ? `${latestMonth.slice(0, 7)} 기준` : "관리월을 만든 뒤 표시"}</small></article>
      </section>
      <section className="public-section">
        <div className="public-section-heading"><h2>관리 진행 현황</h2><p>우리 팀이 진행 중인 항목입니다.</p></div>
        {setupCount ? <div className="public-task-list">{(setupResult.data ?? []).map((item) => <div key={item.label}><span>{item.completed ? "완료" : "진행 중"}</span><strong>{item.label}</strong><em>{item.completed ? "완료" : `${item.progress_percent}%`}</em></div>)}</div> : <p className="public-empty">아직 공개할 관리 항목이 준비되지 않았습니다.</p>}
      </section>
      <footer className="public-store-footer">장사ERP · 매장 맞춤 성장 구조를 함께 만듭니다.</footer>
    </main>
  );
}
