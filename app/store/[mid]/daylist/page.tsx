import { notFound } from "next/navigation";
import { getPublicStore } from "@/lib/public-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type PageProps = { params: Promise<{ mid: string }> };

type PublicTask = {
  id: string;
  label: string;
  due_date: string | null;
  completed: boolean;
  progress_percent: number;
};

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", weekday: "short" }).format(new Date(`${date}T00:00:00+09:00`));
}

function daysBetween(start: string, end: string) {
  return Math.floor((new Date(`${end}T00:00:00+09:00`).getTime() - new Date(`${start}T00:00:00+09:00`).getTime()) / 86_400_000);
}

export default async function PublicDaylistPage({ params }: PageProps) {
  const { mid } = await params;
  const store = await getPublicStore(mid);
  if (!store) notFound();

  const supabase = getSupabaseAdmin();
  const [dailyResult, inflowResult, taskResult] = await Promise.all([
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
      .from("erp_store_setup_items")
      .select("id,label,due_date,completed,progress_percent")
      .eq("store_id", store.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true }),
  ]);
  if (dailyResult.error) throw dailyResult.error;
  if (inflowResult.error) throw inflowResult.error;
  if (taskResult.error) throw taskResult.error;

  const dailyRows = dailyResult.data ?? [];
  const recentSales = dailyRows.reduce((sum, row) => sum + Number(row.net_sales ?? 0), 0);
  const recentPayments = dailyRows.reduce((sum, row) => sum + Number(row.net_payment_count ?? 0), 0);
  const inflowSummary = (inflowResult.data?.summary ?? {}) as Record<string, unknown>;
  const placeInflow = typeof inflowSummary.placeInflow === "number" ? inflowSummary.placeInflow : null;
  const tasks = (taskResult.data ?? []) as PublicTask[];
  const completedCount = tasks.filter((task) => task.completed).length;
  const startDate = store.managementStartDate;
  const tasksByWeek = new Map<number, PublicTask[]>();

  tasks.forEach((task) => {
    const week = startDate && task.due_date
      ? Math.max(1, Math.min(store.contractPeriodWeeks, Math.floor(daysBetween(startDate, task.due_date) / 7) + 1))
      : 1;
    tasksByWeek.set(week, [...(tasksByWeek.get(week) ?? []), task]);
  });

  const weeks = Array.from({ length: store.contractPeriodWeeks }, (_, index) => index + 1);

  return (
    <main className="public-store-shell">
      <header className="public-store-header"><span>장사 ERP</span><strong>사장님 업무 보고서</strong></header>
      <section className="public-store-hero">
        <p>{store.category ?? "음식점"}{store.region ? ` · ${store.region}` : ""}</p>
        <h1>{store.name}의 관리 리포트</h1>
        <span>{store.managementStartDate ? `관리 시작일 ${store.managementStartDate}` : "관리 시작일 확인 중"} · {store.contractPeriodWeeks}주 관리</span>
      </section>
      <section className="public-metric-grid">
        <article><span>최근 집계 매출</span><strong>{dailyRows.length ? formatWon(recentSales) : "미수집"}</strong><small>{dailyRows.length ? `최근 ${dailyRows.length}일 승인 데이터` : "여신금융 파일 등록 후 표시"}</small></article>
        <article><span>최근 결제건수</span><strong>{dailyRows.length ? `${recentPayments.toLocaleString("ko-KR")}건` : "미수집"}</strong><small>{dailyRows.length ? "기간 내 승인 데이터" : "데이터가 아직 없습니다"}</small></article>
        <article><span>네이버 플레이스 유입</span><strong>{placeInflow === null ? "미수집" : placeInflow.toLocaleString("ko-KR")}</strong><small>{inflowResult.data ? `${inflowResult.data.period_start} ~ ${inflowResult.data.period_end}` : "네이버 파일 등록 후 표시"}</small></article>
        <article><span>업무 완료</span><strong>{tasks.length ? `${completedCount}/${tasks.length}` : "준비 중"}</strong><small>{tasks.length ? "저장된 관리 업무 기준" : "공개할 업무가 아직 없습니다"}</small></article>
      </section>
      <section className="public-section">
        <div className="public-section-heading"><h2>주차별 업무 진행 내용</h2><p>회사가 실제로 저장한 업무와 완료 상태만 표시합니다.</p></div>
        {tasks.length ? weeks.map((week) => {
          const weekTasks = tasksByWeek.get(week) ?? [];
          if (!weekTasks.length) return null;
          return (
            <section className="public-work-week" key={week}>
              <h3>{week}주차</h3>
              <div className="public-work-table">
                <div className="public-work-head"><span>날짜</span><span>업무 이름</span><span>상태</span></div>
                {weekTasks.map((task) => (
                  <div className="public-work-row" key={task.id}>
                    <span>{task.due_date ? formatDate(task.due_date) : "일정 미정"}</span>
                    <strong>{task.label}</strong>
                    <em className={task.completed ? "done" : "pending"}>{task.completed ? "완료" : task.progress_percent > 0 ? `진행 ${task.progress_percent}%` : "예정"}</em>
                  </div>
                ))}
              </div>
            </section>
          );
        }) : <p className="public-empty">아직 공개할 업무가 없습니다. 관리자가 업무를 저장하면 이 보고서에 표시됩니다.</p>}
      </section>
      <footer className="public-store-footer">장사 ERP · 매장에 맞는 성장 구조를 함께 만듭니다.</footer>
    </main>
  );
}
