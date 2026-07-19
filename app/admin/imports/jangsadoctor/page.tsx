"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { convertSalesHistoryCsvToBatch } from "@/lib/jangsadoctor/csv-to-batch";

type PreviewIssue = { path: string; code: string; message: string };
type BatchStore = {
  sourceCompanyId: string | null;
  storeName: string | null;
  rowCount: number;
  totalAmount: number | null;
  totalCount: number | null;
  unprovidedDateCount: number;
  zeroAmountRowCount: number;
  errorCount: number;
  warningCount: number;
};

type PreviewResponse = {
  mode: "preview" | "batch_preview";
  valid: boolean;
  storeMatch: { decision: string; sourceCompanyId: string | null; storeName: string | null };
  revenue: { rowCount: number; totalAmount: number | null; totalCount: number | null; missingDates: string[]; zeroAmountDates: string[]; unprovidedDateCount?: number; zeroAmountRowCount?: number };
  batch?: { storeCount: number; validStoreCount: number; unprovidedDateCount: number; stores: BatchStore[] };
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
  return value === null ? "확인 필요" : new Intl.NumberFormat("ko-KR").format(value);
}

export default function SalesHistoryImportPreviewPage() {
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [message, setMessage] = useState("장사 ERP JSON 또는 CSV를 붙여넣거나 올리세요. 미리보기는 DB를 변경하지 않습니다.");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const parsedLabel = useMemo(() => payload.trim() ? `${payload.length.toLocaleString("ko-KR")}자 입력됨` : "입력 없음", [payload]);

  const loadExample = () => {
    setPayload(JSON.stringify(examplePayload, null, 2));
    setResult(null);
    setMessage("비식별 예시 JSON을 불러왔습니다. 미리보기 검사를 누르면 됩니다.");
  };

  const loadImportFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    const text = await file.text();
    if (fileName.endsWith(".csv")) {
      const converted = convertSalesHistoryCsvToBatch(text);
      setPayload(JSON.stringify(converted.payload, null, 2));
      setResult(null);
      setMessage(`${file.name}을 ${converted.dailyRowCount.toLocaleString("ko-KR")}개 일별 매출 행으로 변환했습니다. 제외 ${converted.skippedRowCount}행 · 오류 제외 ${converted.errorRowCount}행. 이제 미리보기 검사를 누르세요.`);
      return;
    }
    if (!fileName.endsWith(".json")) throw new Error("장사 ERP 과거 매출 JSON 또는 CSV 파일만 올릴 수 있습니다.");
    setPayload(text);
    setResult(null);
    setMessage(`${file.name}을 불러왔습니다. 아직 DB에는 저장되지 않았습니다.`);
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await loadImportFile(file);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    try {
      await loadImportFile(file);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
    }
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
    setMessage("매장 연결키, 날짜 중복, 합계, 미제공 날짜를 검사하고 있습니다.");
    try {
      const response = await fetch("/api/admin/migrations/jangsadoctor/preview", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(body),
      });
      const data = await response.json() as PreviewResponse & { error?: string };
      if (!response.ok && !data.valid) {
        setResult(data);
        setMessage(data.error ?? "반영 전 검사에서 수정할 항목을 찾았습니다.");
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "미리보기 요청에 실패했습니다.");
      setResult(data);
      setMessage("검사가 끝났습니다. 이 화면에서는 어떤 DB 데이터도 변경하지 않습니다.");
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
          <h1 className="mt-2 text-3xl font-bold">장사 ERP 과거 매출 미리보기</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">기존 장사 ERP의 매장별 일매출 이력을 저장 전에 검수합니다. 기존 매장과 이름만으로 자동 연결하지 않으며, 미제공 날짜는 0원으로 바꾸지 않습니다.</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">1. 과거 매출 파일 불러오기</h2>
              <p className="mt-1 text-sm text-slate-500">{parsedLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={loadExample} type="button">비식별 예시 불러오기</button>
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">JSON · CSV 파일 선택<input accept="application/json,.json,text/csv,.csv" className="hidden" onChange={loadFile} type="file" /></label>
            </div>
          </div>
          <div className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <p className="font-semibold">JSON 또는 CSV 파일을 여기에 끌어다 놓으세요</p>
            <p className="mt-1 text-sm text-slate-500">기존 장사 ERP 과거 일매출 파일만 검사합니다. XLS/XLSX 여신금융 파일은 기존 여신금융 매출 탭에서 올리세요.</p>
          </div>
          <textarea className="mt-4 min-h-80 w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none ring-sky-500 focus:ring-2" onChange={(event) => setPayload(event.target.value)} placeholder='{"schema_version":"1.0.0", ...}' value={payload} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">{message}</p>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300" disabled={loading} onClick={preview} type="button">{loading ? "검사 중" : "미리보기 검사"}</button>
          </div>
        </section>

        {result && <section className="space-y-4">
          <div className={`rounded-2xl border p-5 ${result.valid ? "border-blue-200 bg-blue-50" : "border-rose-200 bg-rose-50"}`}>
            <h2 className="text-lg font-bold">{result.valid ? "반영 전 검증 통과" : "수정이 필요한 항목이 있습니다"}</h2>
            <p className="mt-1 text-sm">실제 저장은 다음 단계에서 매장 연결을 관리자 확인한 뒤에만 할 수 있습니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label={result.mode === "batch_preview" ? "장사 ERP 매장" : "장사 ERP 업체"} value={result.storeMatch.storeName ?? "확인 필요"} detail={result.mode === "batch_preview" ? `검증 통과 ${result.batch?.validStoreCount ?? 0}개` : result.storeMatch.sourceCompanyId ?? "연결키 없음"} />
            <Metric label="일별 매출 행" value={`${result.revenue.rowCount.toLocaleString("ko-KR")}일`} detail={`합계 ${formatNumber(result.revenue.totalAmount)}원 · ${formatNumber(result.revenue.totalCount)}건`} />
            <Metric label="반영 상태" value="저장 전" detail="검수만 완료, DB 변경 없음" />
          </div>
          {result.mode === "batch_preview" && result.batch && <BatchTable stores={result.batch.stores} />}
          <div className="grid gap-4 md:grid-cols-2">
            <IssueList empty="경고 없음" issues={result.warnings} title="확인할 경고" />
            <IssueList empty="오류 없음" issues={result.errors} title="반영 전 오류" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><b>날짜 상태:</b> 미제공 {result.mode === "batch_preview" ? `${result.batch?.unprovidedDateCount ?? 0}일` : result.revenue.missingDates.length ? result.revenue.missingDates.join(", ") : "없음"} / 실제 0원 {result.mode === "batch_preview" ? `${result.revenue.zeroAmountRowCount ?? 0}일` : result.revenue.zeroAmountDates.length ? result.revenue.zeroAmountDates.join(", ") : "없음"}</div>
        </section>}
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><strong className="mt-1 block text-lg">{value}</strong><span className="text-xs text-slate-500">{detail}</span></article>;
}

function BatchTable({ stores }: { stores: BatchStore[] }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-4"><h3 className="font-bold">매장별 검수 결과</h3><p className="mt-1 text-sm text-slate-500">이름만으로 기존 매장에 합치지 않습니다. 다음 단계에서 매장별로 연결합니다.</p></div><div className="max-h-96 overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">매장</th><th className="px-4 py-3">일수</th><th className="px-4 py-3">매출 합계</th><th className="px-4 py-3">미제공</th><th className="px-4 py-3">상태</th></tr></thead><tbody>{stores.map((store) => <tr className="border-t border-slate-100" key={store.sourceCompanyId ?? store.storeName}><td className="px-4 py-3"><strong className="block">{store.storeName ?? "확인 필요"}</strong><span className="text-xs text-slate-500">{store.sourceCompanyId ?? "연결키 없음"}</span></td><td className="px-4 py-3">{store.rowCount}</td><td className="px-4 py-3">{formatNumber(store.totalAmount)}원</td><td className="px-4 py-3">{store.unprovidedDateCount}일</td><td className="px-4 py-3">{store.errorCount ? <span className="text-rose-600">오류 {store.errorCount}</span> : store.warningCount ? <span className="text-amber-700">확인 {store.warningCount}</span> : <span className="text-blue-700">정상</span>}</td></tr>)}</tbody></table></div></section>;
}

function IssueList({ empty, issues, title }: { empty: string; issues: PreviewIssue[]; title: string }) {
  const visible = issues.slice(0, 20);
  return <article className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold">{title}</h3>{issues.length === 0 ? <p className="mt-3 text-sm text-slate-500">{empty}</p> : <><p className="mt-2 text-sm text-slate-500">총 {issues.length}건 중 처음 20건을 표시합니다.</p><ul className="mt-3 space-y-2 text-sm">{visible.map((item) => <li className="rounded-lg bg-slate-50 p-2" key={`${item.path}-${item.code}`}><b>{item.path}</b> · {item.message}</li>)}</ul></>}</article>;
}
