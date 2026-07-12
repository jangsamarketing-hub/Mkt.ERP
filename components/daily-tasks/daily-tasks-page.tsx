"use client";

import { useEffect, useState } from "react";

type StoreRow = {
  id: string;
  week: "1주차" | "2주차" | "3주차" | "4주차" | "신규";
  name: string;
};

type DailyInboxTask = {
  id: string;
  storeId: string;
  task: string;
  dueDate: string;
  urgent: boolean;
  important: boolean;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

type DailyTasksPageProps = {
  stores: StoreRow[];
  initialDailyInboxTasks: DailyInboxTask[];
};

function getWeekClass(week: StoreRow["week"]) {
  if (week === "1주차") return "week-badge week-1";
  if (week === "2주차") return "week-badge week-2";
  if (week === "3주차") return "week-badge week-3";
  if (week === "4주차") return "week-badge week-4";
  return "week-badge week-new";
}

export function DailyTasksPage({ stores, initialDailyInboxTasks }: DailyTasksPageProps) {
  const today = "2026-07-12";
  const [inboxTasks, setInboxTasks] = useState<DailyInboxTask[]>(() => initialDailyInboxTasks);
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? "");
  const [taskName, setTaskName] = useState("사장님 요청: 신메뉴 사진 교체");
  const [quickTaskName, setQuickTaskName] = useState("");
  const [dueDate, setDueDate] = useState(today);
  const activeTasks = inboxTasks.filter((task) => !task.completed);
  const completedTasks = inboxTasks.filter((task) => task.completed);
  const storeTaskCounts = stores.map((store) => ({
    store,
    total: inboxTasks.filter((task) => task.storeId === store.id).length,
    active: activeTasks.filter((task) => task.storeId === store.id).length,
  }));
  const cautionStores = storeTaskCounts.filter((item) => item.total === 0);
  const getStoreName = (storeId: string) => stores.find((store) => store.id === storeId)?.name ?? "업체 미지정";
  const getDeadlineClass = (date: string) => (date < today ? "overdue" : date === today ? "today" : "");
  const getPriorityLabel = (task: DailyInboxTask) => {
    if (task.urgent && task.important) return "긴급+중요";
    if (task.urgent) return "긴급";
    if (task.important) return "중요";
    return "일반";
  };
  const matrixGroups = [
    { title: "중요 + 긴급", subtitle: "지금 바로 처리", className: "priority-0", tasks: activeTasks.filter((task) => task.urgent && task.important) },
    { title: "중요", subtitle: "일정 잡고 처리", className: "priority-1", tasks: activeTasks.filter((task) => !task.urgent && task.important) },
    { title: "긴급", subtitle: "빠르게 처리/위임", className: "priority-2", tasks: activeTasks.filter((task) => task.urgent && !task.important) },
    { title: "일반", subtitle: "여유될 때", className: "priority-3", tasks: activeTasks.filter((task) => !task.urgent && !task.important) },
  ];

  useEffect(() => {
    const savedTasks = window.localStorage.getItem("erp:daily-inbox-tasks");
    if (!savedTasks) return;
    try {
      const parsedTasks = JSON.parse(savedTasks) as DailyInboxTask[];
      setInboxTasks(parsedTasks);
    } catch {
      window.localStorage.removeItem("erp:daily-inbox-tasks");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("erp:daily-inbox-tasks", JSON.stringify(inboxTasks));
  }, [inboxTasks]);

  const addInboxTask = () => {
    const trimmedTask = taskName.trim();
    if (!trimmedTask || !selectedStoreId) return;
    setInboxTasks((current) => [
      {
        id: `inbox-${Date.now()}`,
        storeId: selectedStoreId,
        task: trimmedTask,
        dueDate,
        urgent: false,
        important: false,
        completed: false,
        createdAt: today,
      },
      ...current,
    ]);
    setTaskName("");
  };

  const addQuickTask = () => {
    const trimmedTask = quickTaskName.trim();
    if (!trimmedTask || !selectedStoreId) return;
    setInboxTasks((current) => [
      {
        id: `inbox-${Date.now()}`,
        storeId: selectedStoreId,
        task: trimmedTask,
        dueDate,
        urgent: false,
        important: false,
        completed: false,
        createdAt: today,
      },
      ...current,
    ]);
    setQuickTaskName("");
  };

  const updateInboxTask = (id: string, patch: Partial<DailyInboxTask>) => {
    setInboxTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  };

  const toggleInboxTask = (id: string, field: "urgent" | "important") => {
    setInboxTasks((current) => current.map((task) => (task.id === id ? { ...task, [field]: !task[field] } : task)));
  };

  const completeInboxTask = (id: string) => {
    setInboxTasks((current) => current.map((task) => (task.id === id ? { ...task, completed: true, completedAt: today } : task)));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>일일 업무</h1>
          <p>업체별 약속 업무, 필수 소통, 우선순위 매트릭스를 공용으로 관리합니다.</p>
        </div>
      </div>
      <div className="daily-tabs">
        <button className="active" type="button">긴급·중요 업무 리스트</button>
        <button type="button">이번 주 필수 소통</button>
        <button type="button">업무 매트릭스</button>
        <button type="button">업체 관리</button>
      </div>
      <section className="panel daily-command">
        <div>
          <h2>일일 대시보드</h2>
          <p className="plain-text">2026년 7월 12일 일요일 · 지연됨 103건</p>
        </div>
        <div className="filter-row">
          <select className="search-input" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <input className="search-input" onChange={(event) => setQuickTaskName(event.target.value)} placeholder="업무명 입력 후 바로 추가" value={quickTaskName} />
          <button className="btn btn-primary" onClick={addQuickTask} type="button">+ 업무 추가</button>
        </div>
      </section>
      <section className="panel">
        <div className="section-headline">
          <h2>업무 수집함</h2>
          <span className="muted-note">업체 선택 + 업무명 입력 후 수집함에 쌓이고, 🚨/★ 토글로 분류합니다.</span>
        </div>
        <div className="task-capture-row">
          <select value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <input onChange={(event) => setTaskName(event.target.value)} placeholder="업무명 입력" value={taskName} />
          <input onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
          <button className="btn btn-primary" onClick={addInboxTask} type="button">수집함 추가</button>
        </div>
        <div className="inbox-list">
          {activeTasks.map((task) => (
            <div className={`inbox-row ${getDeadlineClass(task.dueDate)}`} key={task.id}>
              <strong>{getStoreName(task.storeId)}</strong>
              <input className="inline-task-input" onChange={(event) => updateInboxTask(task.id, { task: event.target.value })} value={task.task} />
              <button className={task.urgent ? "toggle-on danger" : "toggle-off"} onClick={() => toggleInboxTask(task.id, "urgent")} type="button">🚨</button>
              <button className={task.important ? "toggle-on star" : "toggle-off"} onClick={() => toggleInboxTask(task.id, "important")} type="button">★</button>
              <input className={`inline-date-input ${getDeadlineClass(task.dueDate)}`} onChange={(event) => updateInboxTask(task.id, { dueDate: event.target.value })} type="date" value={task.dueDate} />
              <button onClick={() => completeInboxTask(task.id)} type="button">완료</button>
            </div>
          ))}
        </div>
      </section>
      <div className="daily-layout wide">
        <section className="panel">
          <div className="section-headline">
            <h2>긴급·중요 업무 리스트</h2>
            <span className="muted-note">업체와 매칭된 약속 업무가 완료/가이드/히스토리로 남습니다.</span>
          </div>
          <div className="daily-task-list">
            {activeTasks.filter((task) => task.urgent || task.important).map((task) => (
              <div className={`daily-task-row ${getDeadlineClass(task.dueDate)}`} key={task.id}>
                <input type="checkbox" readOnly />
                <strong>{getStoreName(task.storeId)}</strong>
                <span className="week-chip">{stores.find((store) => store.id === task.storeId)?.week ?? "신규"}</span>
                <span>{task.task}</span>
                <em>{task.dueDate < today ? "기한 지남" : task.dueDate === today ? "오늘 마감" : task.dueDate}</em>
                <button type="button">가이드</button>
                <button onClick={() => completeInboxTask(task.id)} type="button">완료</button>
                <small>{getPriorityLabel(task)}</small>
              </div>
            ))}
            {activeTasks.filter((task) => task.urgent || task.important).length === 0 && <p className="plain-text">긴급하거나 중요한 업무가 없습니다.</p>}
          </div>
        </section>
        <section className="panel">
          <h2>업무 우선순위 매트릭스</h2>
          <div className="matrix-grid todo-style">
            {matrixGroups.map((group) => (
              <div className={`matrix-card ${group.className}`} key={group.title}>
                <strong>{group.title}</strong>
                <span>{group.subtitle}</span>
                {group.tasks.map((task) => (
                  <label className="matrix-task" key={task.id}>
                    <input type="checkbox" readOnly />
                    {getStoreName(task.storeId)} · {task.task}
                    <b>★</b>
                  </label>
                ))}
                {group.tasks.length === 0 && <span className="empty-note">업무 없음</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <h2>업체 관리 · 업무 매칭</h2>
        <div className="client-task-list">
          {stores.slice(0, 5).map((store, index) => (
            <div className="client-task-row" key={store.id}>
              <strong>{store.name}</strong>
              <span className={getWeekClass(store.week)}>{store.week}</span>
              <span>{activeTasks.filter((task) => task.storeId === store.id).length}건 진행중</span>
              <div className="mini-progress"><i style={{ width: `${40 + index * 10}%` }} /></div>
              <button onClick={() => {
                setSelectedStoreId(store.id);
                setTaskName(`${store.name} 추가 업무`);
              }} type="button">업무 추가</button>
            </div>
          ))}
        </div>
        <div className="daily-history-grid">
          <div>
            <h3>일마감 히스토리</h3>
            {completedTasks.length === 0 && <p className="plain-text">오늘 완료 처리된 추가 업무가 없습니다.</p>}
            {completedTasks.map((task) => (
              <div className="history-row" key={task.id}>
                <strong>{getStoreName(task.storeId)}</strong>
                <span>{task.task}</span>
                <em>{task.completedAt ?? today}</em>
              </div>
            ))}
          </div>
          <div>
            <h3>관리 요망 매장</h3>
            {cautionStores.length === 0 && <p className="plain-text">현재 모든 매장에 추가 업무 또는 히스토리가 있습니다.</p>}
            {cautionStores.map(({ store }) => (
              <div className="caution-store-row" key={store.id}>
                <strong>{store.name}</strong>
                <span>추가 업무/소통 히스토리 없음</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
