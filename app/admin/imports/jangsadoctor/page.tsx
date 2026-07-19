"use client";

import { ChangeEvent, useMemo, useState } from "react";

type PreviewIssue = { path: string; code: string; message: string };

type PreviewResponse = {
  mode: "preview";
  valid: boolean;
  storeMatch: { decision: string; sourceCompanyId: string | null; storeName: string | null };
  changes: { store: { create: number; update: number; unchanged: number }; revenueDaily: { create: number; update: number; unchanged: number; rejected: number } };
  revenue: { rowCount: number; totalAmount: number | null; totalCount: number | null; missingDates: string[]; zeroAmountDates: string[] };
  snapshotHash: string | null;
  warnings: PreviewIssue[];
  errors: PreviewIssue[];
  commitAvailable: boolean;
};

const examplePayload = {
  schema_version: "1.0.0",
  snapshot_type: "initial_snapshot",
  source: { system: "jangsadoctor_erp" },
  store: { source_company_id: "TEST_STORE_001", store_name: "테스트 매장" },
  platform_accounts: [{ platform: "naver", password_value: null }],
  revenue: {
    status: "collected",
    period_start: "2026-07-01",
    period_end: "2026-07-03",
    daily: [
      { date: "2026-07-01", total: 1250000, count: 12 },
      { date: "2026-07-02", total: 0, count: 0 },
      { date: "2026-07-03", total: 1430000, count: 14 },
    ],
    summary: { row_count: 3, total_amount: 2680000, total_count: 26 },
  },
};

function formatNumber(value: number | null) {
  return value === null ? "미집계" : new Intl.NumberFormat("ko-KR").format(value);
}

export default function JangsadoctorImportPreviewPage() {
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [message, setMessage] = useState("장사닥터 JSON을 붙여넣거나 파일을 선택하세요. preview는 DB를 변경하지 않습니다.");
  const [loading, setLoading] = useState(false);
  const parsedLabel = useMemo(() => payload.trim() ? `${payload.length.toLocaleString("ko-KR")}자 입력됨` : "입력 없음", [payload]);

  const loadExample = () => {
    setPayload(JSON.stringify(examplePayload, null, 2));
    setResult(null);
    setMessage("비식별 예시 JSON을 불러왔습니다. ‘미리보기 검사’를 누르면 됩니다.");
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setMessage("JSON 파일만 선택할 수 있습니다.");
      return;
    }
    setPayload(await file.text());
    setResult(null);
    setMessage(`${file.name}을 불러왔습니다. 아직 DB에는 저장되지 않았습니다.`);
  };

  const preview = async () => {
    setResult(null);
    if (!payload.trim()) {
      setMessage("검사할 JSON이 없습니다.");
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch {
      setMessage("JSON 형식이 올바르지 않습니다.");
      return;
    }
    setLoading(true);
    setMessage("보안·중복·매출 기간을 검사 중입니다…");
    try {
      const response = await fetch("/api/admin/migrations/jangsadoctor/preview", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(body),
      });
      const data = await response.json() as PreviewResponse & { error?: string };
      if (!response.ok && !data.valid) {
        setResult(data);
        setMessage(data.error ?? "반영 전 검증에서 수정할 항목을 찾았습니다.");
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "Preview failed");
      setResult(data);
      setMessage("검사가 끝났습니다. 이 화면에서는 어떠한 DB 데이터도 변경하지 않습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "미리보기 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-slate-950 p-7 text-white shadow-sm">
          <p className="text-sm font-semibold text-sky-300">맞춤장사 OS · 관리자 전용</p>
          <h1 className="mt-2 text-3xl font-bold">장사닥터 ERP 데이터 미리보기</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">업체 정보와 일별 매출 JSON을 반영 전에 검사합니다. 비밀번호 원문, 날짜 중복, 합계 불일치는 자동으로 막고, 이 단계에서는 운영 DB를 변경하지 않습니다.</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">1. JSON 불러오기</h2>
              <p className="mt-1 text-sm text-slate-500">{parsedLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={loadExample} type="button">비식별 예시 불러오기</button>
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">JSON 파일 선택<input accept="application/json,.json" className="hidden" onChange={loadFile} type="file" /></label>
            </div>
          </div>
          <textarea className="mt-4 min-h-80 w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none ring-sky-500 focus:ring-2" onChange={(event) => setPayload(event.target.value)} placeholder='{"schema_version":"1.0.0", ...}' value={payload} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">{message}</p>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300" disabled={loading} onClick={preview} type="button">{loading ? "검사 중…" : "미리보기 검사"}</button>
          </div>
        </section>

        {result && <section className="space-y-4">
          <div className={`rounded-2xl border p-5 ${result.valid ? "border-blue-200 bg-blue-50" : "border-rose-200 bg-rose-50"}`}>
            <h2 className="text-lg font-bold">{result.valid ? "반영 전 검증 통과" : "수정이 필요한 항목이 있습니다"}</h2>
            <p className="mt-1 text-sm">매장 자동 병합은 하지 않습니다. 실제 반영은 다음 단계에서 관리자 확인 후에만 가능합니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">장사닥터 업체</p><strong className="mt-1 block text-lg">{result.storeMatch.storeName ?? "확인 필요"}</strong><span className="text-xs text-slate-500">{result.storeMatch.sourceCompanyId ?? "연결키 없음"}</span></article>
            <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">일별 매출 행</p><strong className="mt-1 block text-lg">{result.revenue.rowCount}일</strong><span className="text-xs text-slate-500">합계 {formatNumber(result.revenue.totalAmount)}원 · {formatNumber(result.revenue.totalCount)}건</span></article>
            <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">반영 상태</p><strong className="mt-1 block text-lg">저장 전</strong><span className="text-xs text-slate-500">commit 기능은 아직 열리지 않았습니다</span></article>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <IssueList empty="경고 없음" issues={result.warnings} title="확인할 경고" />
            <IssueList empty="오류 없음" issues={result.errors} title="반영 전 오류" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><b>날짜 상태:</b> 누락 {result.revenue.missingDates.length ? result.revenue.missingDates.join(", ") : "없음"} / 0원 {result.revenue.zeroAmountDates.length ? result.revenue.zeroAmountDates.join(", ") : "없음"}</div>
        </section>}
      </section>
    </main>
  );
}

function IssueList({ empty, issues, title }: { empty: string; issues: PreviewIssue[]; title: string }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold">{title}</h3>{issues.length === 0 ? <p className="mt-3 text-sm text-slate-500">{empty}</p> : <ul className="mt-3 space-y-2 text-sm">{issues.map((item) => <li className="rounded-lg bg-slate-50 p-2" key={`${item.path}-${item.code}`}><b>{item.path}</b> · {item.message}</li>)}</ul>}</article>;
}
