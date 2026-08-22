"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStoreRegistry } from "@/components/stores/store-registry-context";

type StoreRow = { id: string; name: string; manager?: string };
type DailyInboxTask = { id: string };

type WorkUpdate = {
  id: string;
  task_week: number | null;
  task_date: string | null;
  title: string;
  owner: "company" | "owner" | "store_staff";
  status: string;
  evidence_text: string | null;
  evidence_urls: string[] | null;
};

type TaskWithStore = WorkUpdate & { storeId: string; storeName: string; managerName: string };

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function hasEntry(task: WorkUpdate) {
  return Boolean(task.evidence_text?.trim() || task.evidence_urls?.length);
}

function entryLabel(task: WorkUpdate) {
  if (hasEntry(task)) return "기입완료";
  if (task.task_date && task.task_date < seoulDate()) return "업무 누락";
  return "미기입";
}

export function DailyTasksPage({ stores: fallbackStores }: { stores: StoreRow[]; initialDailyInboxTasks?: DailyInboxTask[] }) {
  const registry = useStoreRegistry();
  const stores = useMemo(() => (registry.stores.length
    ? registry.stores.map((store) => ({ id: store.id, name: store.name, manager: store.managerName ?? "미배정" }))
    : fallbackStores), [fallbackStores, registry.stores]);
  const storeIds = stores.map((store) => store.id).join(",");
  const [selectedDate, setSelectedDate] = useState(seoulDate);
  const [managerFilter, setManagerFilter] = useState("all");
  const [updates, setUpdates] = useState<TaskWithStore[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [memo, setMemo] = useState("");
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const loadTasks = useCallback(async () => {
    if (!stores.length) {
      setUpdates([]);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const results = await Promise.allSettled(stores.map(async (store) => {
        const response = await fetch(`/api/erp/stores/${encodeURIComponent(store.id)}/work-updates`);
        const payload = await response.json().catch(() => ({})) as { updates?: WorkUpdate[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? `${store.name} 업무를 불러오지 못했습니다.`);
        return (payload.updates ?? []).map((task) => ({
          ...task,
          storeId: store.id,
          storeName: store.name,
          managerName: store.manager ?? "미배정",
        }));
      }));
      const failedStores = results
        .flatMap((result, index) => result.status === "rejected" ? [stores[index]?.name ?? "알 수 없는 매장"] : []);
      const next = results
        .flatMap((result) => result.status === "fulfilled" ? result.value : [])
        .sort((a, b) => a.storeName.localeCompare(b.storeName, "ko") || (a.task_date ?? "").localeCompare(b.task_date ?? ""));
      setUpdates(next);
      setSelectedId((current) => next.some((task) => task.id === current && task.task_date === selectedDate && task.owner === "company")
        ? current
        : (next.find((task) => task.task_date === selectedDate && task.owner === "company")?.id ?? ""));
      if (failedStores.length) setMessage(`${failedStores.join(", ")} 업무는 불러오지 못했습니다. 나머지 매장 업무는 표시됩니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "업무 원장을 불러오지 못했습니다.");
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, stores, storeIds]);

  useEffect(() => { void loadTasks(); }, [loadTasks, registry.loading]);

  const managerOptions = useMemo(
    () => [...new Set(stores.map((store) => store.manager?.trim()).filter((manager): manager is string => Boolean(manager)))].sort((a, b) => a.localeCompare(b, "ko")),
    [stores],
  );
  const todayTasks = useMemo(
    () => updates.filter((task) => task.task_date === selectedDate
      && task.owner === "company"
      && (managerFilter === "all" || task.managerName === managerFilter)),
    [updates, selectedDate, managerFilter],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, TaskWithStore[]>();
    for (const task of todayTasks) map.set(task.storeId, [...(map.get(task.storeId) ?? []), task]);
    return [...map.entries()].map(([storeId, tasks]) => ({ storeId, tasks }));
  }, [todayTasks]);
  const enteredCount = todayTasks.filter(hasEntry).length;
  const missingCount = todayTasks.length - enteredCount;
  const selectedTask = todayTasks.find((task) => task.id === selectedId) ?? null;

  useEffect(() => {
    setMemo(selectedTask?.evidence_text ?? "");
    setUrls((selectedTask?.evidence_urls ?? []).join("\n"));
  }, [selectedTask?.id]);

  const selectTask = (task: TaskWithStore) => {
    setSelectedId(task.id);
    setMemo(task.evidence_text ?? "");
    setUrls((task.evidence_urls ?? []).join("\n"));
  };

  const saveEntry = async () => {
    if (!selectedTask) return;
    setSaving(true);
    setMessage("");
    try {
      const evidenceUrls = urls.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      const response = await fetch(`/api/erp/stores/${encodeURIComponent(selectedTask.storeId)}/work-updates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTask.id,
          title: selectedTask.title,
          taskWeek: selectedTask.task_week,
          taskDate: selectedTask.task_date,
          owner: selectedTask.owner,
          publicVisible: true,
          evidenceText: memo,
          evidenceUrls,
        }),
      });
      const payload = await response.json() as { update?: WorkUpdate; error?: string };
      if (!response.ok || !payload.update) throw new Error(payload.error ?? "업무 기입을 저장하지 못했습니다.");
      setUpdates((current) => current.map((task) => task.id === selectedTask.id ? { ...task, ...payload.update } : task));
      setMessage(memo.trim() || evidenceUrls.length ? "기입을 저장했습니다. 사장님 보고서에도 기입완료로 표시됩니다." : "기입 내용이 없어 미기입 상태로 남아 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "업무 기입을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const uploadEvidence = async (file: File | null) => {
    if (!file || !selectedTask) return;
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("workUpdateId", selectedTask.id);
      const response = await fetch(`/api/erp/stores/${encodeURIComponent(selectedTask.storeId)}/work-evidence`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "사진 업로드에 실패했습니다.");
      setUrls((current) => [...current.split(/\r?\n/).map((value) => value.trim()).filter(Boolean), payload.storageUrl].join("\n"));
      setMessage("사진을 올렸습니다. 기입 저장을 누르면 업무 보고서에 반영됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>일일 업무</h1>
          <p>오늘 회사가 해야 할 업무만 모아 관리합니다. 메모 또는 증빙 링크를 저장하면 자동으로 기입완료 처리됩니다.</p>
        </div>
      </div>
      <section className="panel daily-command">
        <div className="section-headline">
          <div>
            <h2>오늘의 업무 원장</h2>
            <p className="plain-text">담당 매장별 업무를 열고 처리 내용을 남기면 사장님 공개 보고서에 같은 내용이 표시됩니다.</p>
          </div>
          <div className="filter-row">
            <select aria-label="담당자 필터" onChange={(event) => setManagerFilter(event.target.value)} value={managerFilter}>
              <option value="all">전체 담당자</option>
              {managerOptions.map((manager) => <option key={manager} value={manager}>{manager}</option>)}
            </select>
            <input aria-label="업무 날짜" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            <button className="btn btn-light" disabled={loading} onClick={() => void loadTasks()} type="button">{loading ? "불러오는 중" : "새로고침"}</button>
          </div>
        </div>
        <div className="task-summary-grid">
          <div className="metric-card"><span>오늘 예정 업무</span><strong>{todayTasks.length}개</strong></div>
          <div className="metric-card success"><span>기입완료</span><strong>{enteredCount}개</strong></div>
          <div className="metric-card danger"><span>미기입 / 누락 확인</span><strong>{missingCount}개</strong></div>
          <div className="metric-card"><span>업무 대상 매장</span><strong>{grouped.length}곳</strong></div>
        </div>
        {message && <p className="plain-text">{message}</p>}
      </section>

      <section className="task-layout">
        <div>
          {grouped.length === 0 ? (
            <section className="panel"><h2>예정된 회사 업무가 없습니다.</h2><p className="plain-text">매장 정보의 주차별 업무를 저장하면 관리 시작일 기준 업무 원장에 표시됩니다.</p></section>
          ) : grouped.map(({ storeId, tasks }) => (
            <section className="panel week-panel" key={storeId}>
              <h2>{tasks[0].storeName} <span>담당 {tasks[0].managerName}</span></h2>
              <div className="task-table daily-task-table">
                {tasks.map((task) => (
                  <button aria-pressed={selectedTask?.id === task.id} className={`task-row-button${selectedTask?.id === task.id ? " is-selected" : ""}`} key={task.id} onClick={() => selectTask(task)} type="button">
                    <span>{task.task_week ? `${task.task_week}주차` : "일정"}</span>
                    <strong>{task.title}</strong>
                    <em className={hasEntry(task) ? "is-written" : "is-missing"}>{entryLabel(task)}</em>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="panel task-detail">
          <h2>업무 기입</h2>
          <p className="plain-text">완료 버튼은 없습니다. 실제 처리 내용이나 증빙을 남긴 경우에만 자동으로 기입완료가 됩니다.</p>
          {selectedTask ? <>
            <div className="info-line"><span>매장</span><strong>{selectedTask.storeName}</strong></div>
            <div className="info-line"><span>업무</span><strong>{selectedTask.title}</strong></div>
            <label className="mock-field"><span>처리 내용</span><textarea onChange={(event) => setMemo(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void saveEntry(); } }} placeholder="사장님에게 보여줄 처리 내용과 변경 사항을 입력하세요. Shift+Enter는 줄바꿈, Ctrl+Enter는 저장입니다." value={memo} /></label>
            <label className="mock-field"><span>사진/문서 증빙 링크 (한 줄에 하나)</span><textarea onChange={(event) => setUrls(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void saveEntry(); } }} placeholder="공유 가능한 사진 또는 문서 링크를 입력하세요." value={urls} /></label>
            <label className="mock-field"><span>사진 증빙 추가 (JPG, PNG, WEBP · 10MB 이하)</span><input accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => uploadEvidence(event.target.files?.[0] ?? null)} type="file" /></label>
            {message ? <p className="plain-text">{message}</p> : null}
            <button className="btn btn-primary" disabled={saving || uploading} onClick={saveEntry} type="button">{saving ? "저장 중" : "기입 저장"}</button>
          </> : <p className="plain-text">왼쪽에서 업무를 선택하면 처리 내용을 작성할 수 있습니다.</p>}
        </aside>
      </section>
    </>
  );
}
