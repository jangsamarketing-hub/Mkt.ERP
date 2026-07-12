"use client";

import { useEffect, useMemo, useState } from "react";

type TaskItem = {
  week: 1 | 2 | 3 | 4;
  date: string;
  day: string;
  name: string;
  status: "완료" | "대기중" | "미완료";
};

type StoreTaskItem = TaskItem & {
  id: string;
};

type SetupItem = {
  id: string;
  label: string;
  percent: number;
  dueDate: string;
  completed: boolean;
};

type ChannelChecks = {
  naver: boolean;
  daangn: boolean;
  instagram: boolean;
  google: boolean;
  photoDate: string;
  influencerDate: string;
  photoHistory: string[];
  influencerHistory: string[];
};

type StoreViewId = "dashboard" | "owner" | "questionnaire";

type StoreProfile = {
  clientName: string;
  storeName: string;
  industry: string;
  region: string;
  manager: string;
  startDate: string;
  contractPeriod: string;
  naverId: string;
  naverPassword: string;
  naverCustomerId: string;
  naverAccessLicense: string;
  naverSecretKey: string;
  placeUrl: string;
  placeMid: string;
  instagramId: string;
  instagramPassword: string;
  googleId: string;
  googlePassword: string;
  kakaoMapId: string;
  kakaoMapPassword: string;
  kakaoChannelUrl: string;
  cardSalesId: string;
  cardSalesPassword: string;
  ownerPersonality: string;
  salesHistorySummary: string;
  renewalScore: string;
  coreNeeds: string;
  coreAnxiety: string;
  informationIntro: string;
  informationRequestMessage: string;
  informationQuestions: string[];
  memo: string;
};

const defaultStoreProfile: StoreProfile = {
  clientName: "토종곱창",
  storeName: "토종곱창 철산본점",
  industry: "음식점",
  region: "광명 철산",
  manager: "박상일(경기)",
  startDate: "2026-06-15",
  contractPeriod: "4주",
  naverId: "owner_naver01",
  naverPassword: "pw-visible-1234",
  naverCustomerId: "4174476",
  naverAccessLicense: "0100000000cef01f6f3a...",
  naverSecretKey: "secret-visible-key",
  placeUrl: "https://map.naver.com/...",
  placeMid: "20250761",
  instagramId: "@cheolsan_gopchang",
  instagramPassword: "insta-pw",
  googleId: "owner@gmail.com",
  googlePassword: "google-pw",
  kakaoMapId: "kakao_map_owner",
  kakaoMapPassword: "kakao-pw",
  kakaoChannelUrl: "@토종곱창철산",
  cardSalesId: "card_sales_owner",
  cardSalesPassword: "card-pw",
  ownerPersonality: "속도와 결과를 중요하게 보는 편. 보고는 짧고 숫자 중심 선호.",
  salesHistorySummary: "최초 상담에서 유입 하락과 리뷰 정체를 핵심 문제로 언급. 4주 안에 체감되는 변화 요청.",
  renewalScore: "7",
  coreNeeds: "네이버 유입 회복, 리뷰 신뢰도 강화, 주간 보고 체계",
  coreAnxiety: "광고비만 쓰고 매출 변화가 없는 상황",
  informationIntro: "사장님 안녕하세요. 마케팅 시작 전 매장 정보와 계정 정보를 확인하기 위한 작성용 페이지입니다.",
  informationRequestMessage: "아래 링크에 매장 정보, 운영시간, 대표 메뉴, 계정 정보를 작성해주시면 초기 마케팅 방향성과 세팅에 반영하겠습니다.",
  informationQuestions: [
    "매장명과 대표자명을 입력해주세요.",
    "매장 주소와 네이버 플레이스 URL을 입력해주세요.",
    "대표 메뉴와 꼭 팔고 싶은 메뉴를 알려주세요.",
    "운영시간, 브레이크타임, 휴무일을 알려주세요.",
    "주요 고객층과 가장 많이 오는 상황을 알려주세요.",
    "네이버, 인스타그램, 구글, 카카오맵 계정 정보를 입력해주세요.",
    "매장 강점과 현재 가장 고민되는 문제를 알려주세요.",
  ],
  memo: "--260712--\n정보안내문에서 받은 계정과 내부 등록 정보를 함께 관리합니다.",
};

const defaultManagers = ["박상일(경기)", "박규상", "강정원", "김재영"];
const industryOptions = [
  "한식",
  "중식",
  "일식",
  "양식",
  "아시안",
  "고기류",
  "치킨",
  "분식",
  "주점",
  "카페/디저트",
  "베이커리",
  "배달전문",
  "프랜차이즈",
  "기타 음식점",
];

const blankStoreProfile: StoreProfile = {
  ...defaultStoreProfile,
  clientName: "",
  storeName: "",
  industry: "",
  region: "",
  manager: "",
  startDate: "2026-07-12",
  contractPeriod: "4주",
  naverId: "",
  naverPassword: "",
  naverCustomerId: "",
  naverAccessLicense: "",
  naverSecretKey: "",
  placeUrl: "",
  placeMid: "",
  instagramId: "",
  instagramPassword: "",
  googleId: "",
  googlePassword: "",
  kakaoMapId: "",
  kakaoMapPassword: "",
  kakaoChannelUrl: "",
  cardSalesId: "",
  cardSalesPassword: "",
  ownerPersonality: "",
  salesHistorySummary: "",
  renewalScore: "",
  coreNeeds: "",
  coreAnxiety: "",
  memo: "",
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function getDayLabel(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);
  return weekdayLabels[parsedDate.getDay()] ?? "";
}

function formatMemoDate(date = new Date()) {
  const year = String(date.getFullYear()).slice(2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function isMonday(date: string) {
  return new Date(`${date}T00:00:00`).getDay() === 1;
}

function hydrateTasks(tasks: TaskItem[]) {
  return tasks
    .map((task, index) => ({ ...task, id: `${task.week}-${task.date}-${index}` }))
    .sort((a, b) => a.week - b.week || a.date.localeCompare(b.date));
}

function sortTasksByDate(tasks: StoreTaskItem[]) {
  return [...tasks].sort((a, b) => a.week - b.week || a.date.localeCompare(b.date));
}

function getSetupSignal(percent: number) {
  if (percent < 30) return "red";
  if (percent < 60) return "orange";
  if (percent < 80) return "yellow";
  return "green";
}

function getDueClass(date: string, completed: boolean) {
  if (completed) return "";
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "";
}

function Field({ label, field, profile, setProfile, type = "text" }: {
  label: string;
  field: keyof StoreProfile;
  profile: StoreProfile;
  setProfile: (profile: StoreProfile) => void;
  type?: string;
}) {
  return (
    <label className="store-field">
      <span>{label}</span>
      <input
        type={type}
        value={profile[field]}
        onChange={(event) => setProfile({ ...profile, [field]: event.target.value })}
      />
    </label>
  );
}

function ReadLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="store-read-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StoreInfoPage({
  weeklyTasks,
  onBack,
  setView,
  onSaveStore,
}: {
  weeklyTasks: TaskItem[];
  onBack: () => void;
  setView: (view: StoreViewId) => void;
  onSaveStore?: (profile: Pick<StoreProfile, "storeName" | "manager" | "contractPeriod" | "memo">) => void;
}) {
  const [profile, setProfile] = useState<StoreProfile>(defaultStoreProfile);
  const [storeTasks, setStoreTasks] = useState<StoreTaskItem[]>(() => hydrateTasks(weeklyTasks));
  const [memoDraft, setMemoDraft] = useState("");
  const [selectedMemoDate, setSelectedMemoDate] = useState("");
  const [managerOptions, setManagerOptions] = useState(defaultManagers);
  const [newManager, setNewManager] = useState("");
  const [setupItems, setSetupItems] = useState<SetupItem[]>([
    { id: "cover-photo", label: "대문사진", percent: 70, dueDate: "2026-07-15", completed: false },
    { id: "cover-video", label: "대문영상", percent: 60, dueDate: "2026-07-15", completed: false },
    { id: "main-keyword", label: "대표키워드", percent: 45, dueDate: "2026-07-16", completed: false },
    { id: "description", label: "상세설명", percent: 80, dueDate: "2026-07-17", completed: false },
    { id: "route-hook", label: "찾아오는길 후킹", percent: 90, dueDate: "2026-07-15", completed: true },
    { id: "coupon-hook", label: "쿠폰 후킹", percent: 80, dueDate: "2026-07-20", completed: false },
    { id: "notice-hook", label: "공지사항 후킹", percent: 50, dueDate: "2026-07-18", completed: false },
    { id: "top-menu", label: "메뉴 상단 3개", percent: 35, dueDate: "2026-07-18", completed: false },
    { id: "menu-seo-aeo", label: "메뉴 SEO AEO", percent: 25, dueDate: "2026-07-12", completed: false },
    { id: "set-bait-menu", label: "세트, 미끼메뉴", percent: 30, dueDate: "2026-07-19", completed: false },
  ]);
  const [channelChecks, setChannelChecks] = useState<ChannelChecks>({
    naver: true,
    daangn: false,
    instagram: false,
    google: false,
    photoDate: "2026-06-20",
    influencerDate: "2026-05-01",
    photoHistory: ["2026-06-20"],
    influencerHistory: ["2026-05-01"],
  });  const [savedAt, setSavedAt] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<1 | 2 | 3 | 4>(4);
  const ownerReportUrl = useMemo(() => `https://장사닥터.com/companies/${profile.placeMid}/detail`, [profile.placeMid]);
  const informationUrl = useMemo(() => `https://장사닥터.com/information-questions/${profile.placeMid}`, [profile.placeMid]);

  useEffect(() => {
    const savedProfile = window.localStorage.getItem("erp:store-profile");
    const savedTasks = window.localStorage.getItem("erp:store-weekly-tasks");
    if (savedProfile) {
      try {
        setProfile({ ...defaultStoreProfile, ...(JSON.parse(savedProfile) as StoreProfile) });
      } catch {
        window.localStorage.removeItem("erp:store-profile");
      }
    }
    if (savedTasks) {
      try {
        setStoreTasks(JSON.parse(savedTasks) as StoreTaskItem[]);
      } catch {
        window.localStorage.removeItem("erp:store-weekly-tasks");
      }
    }
  }, []);

  const saveProfile = () => {
    window.localStorage.setItem("erp:store-profile", JSON.stringify(profile));
    window.localStorage.setItem("erp:store-weekly-tasks", JSON.stringify(storeTasks));
    onSaveStore?.(profile);
    setSavedAt(new Date().toLocaleString("ko-KR"));
  };

  const resetProfile = () => {
    setProfile(blankStoreProfile);
    setStoreTasks([]);
    window.localStorage.removeItem("erp:store-profile");
    window.localStorage.removeItem("erp:store-weekly-tasks");
    setSavedAt("");
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setSavedAt("링크 복사 완료");
  };

  const updateTask = (id: string, patch: Partial<StoreTaskItem>) => {
    setStoreTasks((tasks) =>
      sortTasksByDate(tasks.map((task) => {
        if (task.id !== id) return task;
        const nextTask = { ...task, ...patch };
        return patch.date ? { ...nextTask, day: getDayLabel(patch.date) } : nextTask;
      })),
    );
  };

  const addTask = () => {
    const today = new Date().toISOString().slice(0, 10);
    setStoreTasks((tasks) => sortTasksByDate([
      ...tasks,
      {
        id: `custom-${Date.now()}`,
        week: selectedWeek,
        date: today,
        day: getDayLabel(today),
        name: "새 업무",
        status: "대기중",
      },
    ]));
  };

  const deleteTask = (id: string) => {
    setStoreTasks((tasks) => tasks.filter((task) => task.id !== id));
  };

  const moveTask = (id: string, direction: -1 | 1) => {
    setStoreTasks((tasks) => {
      const sameWeekTasks = tasks.filter((task) => task.week === selectedWeek);
      const otherTasks = tasks.filter((task) => task.week !== selectedWeek);
      const index = sameWeekTasks.findIndex((task) => task.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= sameWeekTasks.length) return tasks;
      const nextTasks = [...sameWeekTasks];
      [nextTasks[index], nextTasks[nextIndex]] = [nextTasks[nextIndex], nextTasks[index]];
      return [...otherTasks, ...nextTasks];
    });
  };

  const addQuestion = () => {
    setProfile({ ...profile, informationQuestions: [...profile.informationQuestions, "새 질문을 입력해주세요."] });
  };

  const updateQuestion = (index: number, value: string) => {
    setProfile({
      ...profile,
      informationQuestions: profile.informationQuestions.map((question, questionIndex) => (questionIndex === index ? value : question)),
    });
  };

  const deleteQuestion = (index: number) => {
    setProfile({
      ...profile,
      informationQuestions: profile.informationQuestions.filter((_, questionIndex) => questionIndex !== index),
    });
  };

  const appendMemo = () => {
    const nextMemo = memoDraft.trim();
    if (!nextMemo) return;
    const entry = `--${formatMemoDate()}--\n${nextMemo}`;
    setProfile({ ...profile, memo: profile.memo ? `${entry}\n\n${profile.memo}` : entry });
    setMemoDraft("");
  };

  const addManager = () => {
    const manager = newManager.trim();
    if (!manager || managerOptions.includes(manager)) return;
    setManagerOptions((options) => [...options, manager]);
    setProfile({ ...profile, manager });
    setNewManager("");
  };

  const updateStartDate = (date: string) => {
    if (!isMonday(date)) {
      setSavedAt("관리 시작일은 월요일만 선택합니다.");
      return;
    }
    setProfile({ ...profile, startDate: date });
  };

  const memoDates = useMemo(() => {
    const matches = profile.memo.match(/--\d{6}--/g) ?? [];
    return Array.from(new Set(matches.map((match) => match.replaceAll("-", ""))));
  }, [profile.memo]);

  const visibleMemo = useMemo(() => {
    if (!selectedMemoDate) return profile.memo;
    const marker = `--${selectedMemoDate}--`;
    const startIndex = profile.memo.indexOf(marker);
    if (startIndex < 0) return "";
    const nextIndex = profile.memo.indexOf("--", startIndex + marker.length);
    return nextIndex < 0 ? profile.memo.slice(startIndex) : profile.memo.slice(startIndex, nextIndex).trim();
  }, [profile.memo, selectedMemoDate]);

  const visibleTasks = useMemo(
    () => storeTasks.filter((task) => task.week === selectedWeek),
    [storeTasks, selectedWeek],
  );

  const updateSetupItem = (id: string, patch: Partial<SetupItem>) => {
    setSetupItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const influencerDays = Math.floor((Date.now() - new Date(`${channelChecks.influencerDate}T00:00:00`).getTime()) / 86400000);

  const updateChannelHistoryDate = (
    dateKey: "photoDate" | "influencerDate",
    historyKey: "photoHistory" | "influencerHistory",
    value: string,
  ) => {
    setChannelChecks((checks) => ({
      ...checks,
      [dateKey]: value,
      [historyKey]: Array.from(new Set([...checks[historyKey], value])).filter(Boolean).sort(),
    }));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>매장 정보 및 계정 관리</h1>
          <p>정보안내문에서 받은 계정, 내부 등록 정보, 보고서 링크, 업무 리스트를 함께 관리합니다.</p>
        </div>
        <div className="filter-row">
          <button className="btn btn-light" onClick={onBack} type="button">뒤로가기</button>
          <button className="btn btn-light" onClick={resetProfile} type="button">초기화</button>
          <button className="btn btn-primary" onClick={saveProfile} type="button">저장</button>
        </div>
      </div>

      <section className="store-summary-strip">
        <strong>{profile.storeName}</strong>
        <span>MID {profile.placeMid}</span>
        <span>담당자 {profile.manager}</span>
        <span>관리 {profile.contractPeriod}</span>
        {savedAt && <em>{savedAt}</em>}
      </section>

      <section className="panel store-form-grid">
        <div>
          <h2>기본 정보</h2>
          <Field label="클라이언트명" field="clientName" profile={profile} setProfile={setProfile} />
          <Field label="매장명" field="storeName" profile={profile} setProfile={setProfile} />
          <label className="store-field">
            <span>업종</span>
            <select value={profile.industry} onChange={(event) => setProfile({ ...profile, industry: event.target.value })}>
              {industryOptions.map((industry) => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </label>
          <Field label="지역" field="region" profile={profile} setProfile={setProfile} />
          <label className="store-field">
            <span>담당자</span>
            <select value={profile.manager} onChange={(event) => setProfile({ ...profile, manager: event.target.value })}>
              {managerOptions.map((manager) => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
          </label>
          <div className="store-field manager-add-row">
            <span>담당자 추가</span>
            <div>
              <input value={newManager} onChange={(event) => setNewManager(event.target.value)} placeholder="새 담당자명" />
              <button className="btn btn-light" onClick={addManager} type="button">추가</button>
            </div>
          </div>
          <label className="store-field">
            <span>관리 시작일</span>
            <input min="2026-01-05" step={7} type="date" value={profile.startDate} onChange={(event) => updateStartDate(event.target.value)} />
          </label>
          <label className="store-field">
            <span>계약/관리 기간</span>
            <select value={profile.contractPeriod} onChange={(event) => setProfile({ ...profile, contractPeriod: event.target.value })}>
              {["4주", "8주", "12주", "16주", "24주", "상시관리"].map((period) => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
          </label>
          <Field label="재계약 감도점수" field="renewalScore" profile={profile} setProfile={setProfile} />
          <Field label="핵심 니즈" field="coreNeeds" profile={profile} setProfile={setProfile} />
          <Field label="핵심 불안" field="coreAnxiety" profile={profile} setProfile={setProfile} />
        </div>

        <div>
          <h2>플레이스/공유 링크</h2>
          <Field label="플레이스 URL" field="placeUrl" profile={profile} setProfile={setProfile} />
          <Field label="플레이스 MID" field="placeMid" profile={profile} setProfile={setProfile} />
          <ReadLine label="사장님 보고서" value={ownerReportUrl} />
          <div className="store-link-actions">
            <button className="btn btn-light" onClick={() => copyText(ownerReportUrl)} type="button">복사</button>
            <button className="btn btn-primary" onClick={() => setView("owner")} type="button">바로가기</button>
          </div>
          <ReadLine label="정보안내문" value={informationUrl} />
          <div className="store-link-actions">
            <button className="btn btn-light" onClick={() => copyText(informationUrl)} type="button">복사</button>
            <button className="btn btn-primary" onClick={() => setView("questionnaire")} type="button">바로가기</button>
          </div>
        </div>

        <div>
          <h2>네이버/검색광고</h2>
          <Field label="네이버 ID" field="naverId" profile={profile} setProfile={setProfile} />
          <Field label="네이버 PW" field="naverPassword" profile={profile} setProfile={setProfile} />
          <Field label="Customer ID" field="naverCustomerId" profile={profile} setProfile={setProfile} />
          <Field label="Access License" field="naverAccessLicense" profile={profile} setProfile={setProfile} />
          <Field label="Secret Key" field="naverSecretKey" profile={profile} setProfile={setProfile} />
        </div>

        <div>
          <h2>SNS/외부 계정</h2>
          <Field label="인스타그램 ID" field="instagramId" profile={profile} setProfile={setProfile} />
          <Field label="인스타그램 PW" field="instagramPassword" profile={profile} setProfile={setProfile} />
          <Field label="구글 ID" field="googleId" profile={profile} setProfile={setProfile} />
          <Field label="구글 PW" field="googlePassword" profile={profile} setProfile={setProfile} />
          <Field label="카카오맵 ID" field="kakaoMapId" profile={profile} setProfile={setProfile} />
          <Field label="카카오맵 PW" field="kakaoMapPassword" profile={profile} setProfile={setProfile} />
          <Field label="카카오톡 채널" field="kakaoChannelUrl" profile={profile} setProfile={setProfile} />
          <Field label="여신금융 ID" field="cardSalesId" profile={profile} setProfile={setProfile} />
          <Field label="여신금융 PW" field="cardSalesPassword" profile={profile} setProfile={setProfile} />
        </div>
      </section>

      <section className="panel">
        <h2>사장님 성향/영업 히스토리</h2>
        <label className="mock-field">
          <span>사장님 성향</span>
          <textarea
            className="store-memo"
            value={profile.ownerPersonality}
            onChange={(event) => setProfile({ ...profile, ownerPersonality: event.target.value })}
          />
        </label>
        <label className="mock-field">
          <span>최초 영업 히스토리 핵심 요약</span>
          <textarea
            className="store-memo"
            value={profile.salesHistorySummary}
            onChange={(event) => setProfile({ ...profile, salesHistorySummary: event.target.value })}
          />
        </label>
      </section>

      <section className="panel">
        <h2>매장 세팅 상태 체크</h2>
        <p className="plain-text">세팅 진행률, 수정 마감일, 광고/촬영/먹플루언서 진행 이력을 내부 관리합니다.</p>
        <div className="setup-check-grid">
          {setupItems.map((item) => (
            <div className={`setup-check-row ${getDueClass(item.dueDate, item.completed)}`} key={item.id}>
              <strong>{item.label}</strong>
              <select value={item.percent} onChange={(event) => updateSetupItem(item.id, { percent: Number(event.target.value) })}>
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((percent) => (
                  <option key={percent} value={percent}>{percent}%</option>
                ))}
              </select>
              <span className={`setup-signal ${getSetupSignal(item.percent)}`}>{item.percent}%</span>
              <input type="date" value={item.dueDate} onChange={(event) => updateSetupItem(item.id, { dueDate: event.target.value })} />
              <label>
                <input checked={item.completed} onChange={(event) => updateSetupItem(item.id, { completed: event.target.checked })} type="checkbox" />
                완료
              </label>
            </div>
          ))}
        </div>
        <div className="channel-check-grid">
          {[
            ["naver", "네이버 광고"],
            ["daangn", "당근 광고"],
            ["instagram", "인스타 광고"],
            ["google", "구글 광고"],
          ].map(([key, label]) => (
            <label key={key}>
              <input
                checked={Boolean(channelChecks[key as "naver" | "daangn" | "instagram" | "google"])}
                onChange={(event) => setChannelChecks({ ...channelChecks, [key]: event.target.checked })}
                type="checkbox"
              />
              {label}
            </label>
          ))}
          <label>
            전문사진촬영일
            <input
              type="date"
              value={channelChecks.photoDate}
              onChange={(event) => updateChannelHistoryDate("photoDate", "photoHistory", event.target.value)}
            />
            <span className="history-chip-list">
              {channelChecks.photoHistory.map((date) => <em key={date}>{date}</em>)}
            </span>
          </label>
          <label className={influencerDays >= 60 ? "influencer-warning" : ""}>
            먹플루언서 진행일
            <input
              type="date"
              value={channelChecks.influencerDate}
              onChange={(event) => updateChannelHistoryDate("influencerDate", "influencerHistory", event.target.value)}
            />
            <span>{influencerDays}일 경과</span>
            <span className="history-chip-list">
              {channelChecks.influencerHistory.map((date) => <em key={date}>{date}</em>)}
            </span>
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>정보안내문 커스터마이징</h2>
        <div className="section-headline">
          <p className="plain-text">사장님에게 보내는 정보안내문 질문 리스트입니다. 전체 문항은 정보안내문 화면에서도 다시 관리합니다.</p>
          <button className="btn btn-primary" onClick={addQuestion} type="button">질문 추가</button>
        </div>
        <label className="mock-field">
          <span>상단 안내 문구</span>
          <textarea
            className="store-memo"
            value={profile.informationIntro}
            onChange={(event) => setProfile({ ...profile, informationIntro: event.target.value })}
          />
        </label>
        <div className="question-list">
          {profile.informationQuestions.map((question, index) => (
            <div className="question-row" key={`${question}-${index}`}>
              <span>{index + 1}</span>
              <input value={question} onChange={(event) => updateQuestion(index, event.target.value)} />
              <button className="btn btn-light" onClick={() => deleteQuestion(index)} type="button">삭제</button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-headline">
          <h2>주차별 업무 리스트</h2>
          <button className="btn btn-primary" onClick={addTask} type="button">업무 추가</button>
        </div>
        <div className="store-week-tabs">
          {[1, 2, 3, 4].map((week) => (
            <button className={week === selectedWeek ? "active" : ""} key={week} onClick={() => setSelectedWeek(week as 1 | 2 | 3 | 4)} type="button">
              {week}주차
            </button>
          ))}
        </div>
        <div className="task-table compact-list editable-list">
          {visibleTasks.map((task) => (
            <div className="task-row-editable" key={task.id}>
              <div className="task-order-buttons">
                <button className="btn btn-light" onClick={() => moveTask(task.id, -1)} type="button">위</button>
                <button className="btn btn-light" onClick={() => moveTask(task.id, 1)} type="button">아래</button>
              </div>
              <input type="date" value={task.date} onChange={(event) => updateTask(task.id, { date: event.target.value })} />
              <span>{task.day}</span>
              <input value={task.name} onChange={(event) => updateTask(task.id, { name: event.target.value })} />
              <select value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as StoreTaskItem["status"] })}>
                <option>완료</option>
                <option>대기중</option>
                <option>미완료</option>
              </select>
              <button className="btn btn-light" onClick={() => deleteTask(task.id)} type="button">삭제</button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>내부 메모</h2>
        <p className="plain-text">클라이언트에게 보이지 않는 내부 특이사항입니다. 새 메모는 날짜 구분선과 함께 위에 쌓입니다.</p>
        <div className="memo-date-strip">
          <input className="date-input" type="date" onChange={(event) => setSelectedMemoDate(event.target.value.replaceAll("-", "").slice(2))} />
          <button className="btn btn-light" onClick={() => setSelectedMemoDate("")} type="button">전체 보기</button>
          {memoDates.length ? memoDates.map((date) => (
            <button className={selectedMemoDate === date ? "memo-date active" : "memo-date"} key={date} onClick={() => setSelectedMemoDate(date)} type="button">
              {date}
            </button>
          )) : <em>기록 있는 날짜 없음</em>}
        </div>
        <div className="memo-write-row">
          <textarea
            className="store-memo"
            placeholder="이 매장의 특이사항, 약속, 주의할 점을 입력하세요."
            value={memoDraft}
            onChange={(event) => setMemoDraft(event.target.value)}
          />
          <button className="btn btn-primary" onClick={appendMemo} type="button">메모 추가</button>
        </div>
        <textarea className="store-memo note-log" value={visibleMemo} onChange={(event) => setProfile({ ...profile, memo: event.target.value })} readOnly={Boolean(selectedMemoDate)} />
        <p className="plain-text">현재는 브라우저 임시 저장입니다. 다음 단계에서 Supabase DB 저장으로 교체합니다.</p>
      </section>
    </>
  );
}

