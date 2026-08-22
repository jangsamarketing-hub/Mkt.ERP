"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  storeId: string;
  storeName: string;
  managerName: string | null;
  balanceWon: number | null;
  capturedAt: string | null;
  balanceStatus: string;
  alertLevel: "critical" | "warning" | "normal" | "unavailable";
  openThresholds: number[];
};

function currency(value: number | null) {
  return value === null ? "데이터 없음" : `${Math.floor(value).toLocaleString("ko-KR")}원`;
}

function dateLabel(value: string | null) {
  if (!value) return "미수집";
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(new Date(value));
}

export function BalanceMonitorPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("잔액 원장을 불러오는 중입니다.");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/erp/searchad/balance-monitor", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "잔액 원장을 불러오지 못했습니다.");
    setItems(data.items ?? []);
    setMessage(`마지막 확인 ${dateLabel(data.checkedAt)} · 낮은 잔액부터 정렬`);
  }, []);

  useEffect(() => { load().catch((error) => setMessage(error instanceof Error ? error.message : "잔액 원장을 불러오지 못했습니다.")); }, [load]);

  async function evaluate() {
    setLoading(true);
    try {
      const response = await fetch("/api/erp/searchad/balance-monitor", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "경고 상태를 확인하지 못했습니다.");
      setMessage(data.emailConfigured ? "경고 이력을 확인했습니다. 신규 경고만 이메일로 발송합니다." : "경고 이력을 확인했습니다. 이메일 환경변수 설정 전에는 화면 경고만 기록합니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "경고 상태를 확인하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-header">
        <div>
          <p className="eyebrow">검색광고 운영 보조</p>
          <h1>비즈머니 잔액 모니터</h1>
          <p>연결된 매장의 최신 검색광고 잔액을 낮은 금액 순으로 확인합니다.</p>
        </div>
        <button type="button" className="button-primary" onClick={evaluate} disabled={loading}>{loading ? "확인 중" : "경고 상태 확인"}</button>
      </section>

      <section className="notice-card">{message}</section>
      <section className="balance-guide" aria-label="잔액 경고 기준">
        <span className="balance-dot critical" /> 50,000원 이하 즉시 경고
        <span className="balance-dot warning" /> 100,000원 이하 주의
        <span className="balance-dot normal" /> 100,000원 초과 정상
      </section>

      <section className="balance-list">
        {items.map((item) => (
          <article key={item.storeId} className={`balance-item ${item.alertLevel}`}>
            <div className="balance-item-main">
              <span className={`balance-dot ${item.alertLevel}`} />
              <div><h2>{item.storeName}</h2><p>{item.managerName ? `담당 ${item.managerName}` : "담당자 미배정"} · 최신 수집 {dateLabel(item.capturedAt)}</p></div>
            </div>
            <div className="balance-amount"><strong>{currency(item.balanceWon)}</strong><small>{item.alertLevel === "critical" ? "즉시 확인" : item.alertLevel === "warning" ? "주의 필요" : item.alertLevel === "normal" ? "정상" : "API 수집 필요"}</small></div>
            <a className="button-secondary" href={`/?storeId=${item.storeId}`}>매장 보기</a>
          </article>
        ))}
        {!items.length && <div className="empty-state">검색광고가 연결된 활성 매장이 없습니다.</div>}
      </section>
    </main>
  );
}
