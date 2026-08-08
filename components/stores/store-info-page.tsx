"use client";

import { useEffect, useMemo, useState } from "react";
import { useStoreRegistry } from "@/components/stores/store-registry-context";

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

type SetupPhoto = {
  id: string;
  month: string;
  date: string;
  title: string;
  fileName: string;
  dataUrl: string;
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

type StoreRow = {
  id: string;
  name: string;
  manager: string;
  week: string;
  memo: string;
  publicUid?: string | null;
};

type GoldenKeywordJob = {
  id: string;
  storeId: string;
  storeName: string;
  createdAt: string;
  keywordCount: number;
  resultCount: number;
  rows: { keyword: string; volume: number; pageCount: number; estimatedStores: number; result: string }[];
};

type CallHistory = {
  id: string;
  storeId: string;
  storeName: string;
  date: string;
  createdAt: string;
  summary: string;
  candidates: string[];
};

type StoreProfile = {
  clientName: string;
  storeName: string;
  ownerPhone: string;
  businessRegistrationNumber: string;
  specialNotes: string;
  businessRegistrationStoragePath: string;
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
  clientName: "",
  storeName: "",
  ownerPhone: "",
  businessRegistrationNumber: "",
  specialNotes: "",
  businessRegistrationStoragePath: "",
  industry: "",
  region: "",
  manager: "",
  startDate: "",
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
  informationIntro: "",
  informationRequestMessage: "",
  informationQuestions: [
    "매장명과 대표자명을 입력해주세요.",
    "매장 주소와 네이버 플레이스 URL을 입력해주세요.",
    "대표 메뉴와 꼭 팔고 싶은 메뉴를 알려주세요.",
    "운영시간, 브레이크타임, 휴무일을 알려주세요.",
    "주요 고객층과 가장 많이 오는 상황을 알려주세요.",
    "네이버, 인스타그램, 구글, 카카오맵 계정 정보를 입력해주세요.",
    "매장 강점과 현재 가장 고민되는 문제를 알려주세요.",
  ],
  memo: "",
};

type SetupMonth = {
  monthStart: string;
};

const formatSetupMonth = (monthStart: string) => {
  const [year, month] = monthStart.split("-");
  if (!year || !month) return "관리월 선택";
  return `${year.slice(2)}.${Number(month)}월`;
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
  onArchiveStore,
  stores,
  createRequest = 0,
}: {
  weeklyTasks: TaskItem[];
  onBack: () => void;
  setView: (view: StoreViewId) => void;
  onSaveStore?: (
    storeId: string | null,
    profile: Pick<StoreProfile, "clientName" | "storeName" | "industry" | "region" | "manager" | "startDate" | "contractPeriod" | "placeUrl" | "placeMid" | "memo">,
  ) => Promise<{ ok: boolean; message: string; storeId?: string }>;
  onArchiveStore?: (storeId: string) => void;
  stores?: StoreRow[];
  createRequest?: number;
}) {
  const { selectedStoreId, selectStore: setSelectedStoreId } = useStoreRegistry();
  const [profile, setProfile] = useState<StoreProfile>(defaultStoreProfile);
  const [creating, setCreating] = useState(false);
  const [goldenKeywordJobs, setGoldenKeywordJobs] = useState<GoldenKeywordJob[]>([]);
  const [registeredGoldenKeywords, setRegisteredGoldenKeywords] = useState<Record<string, boolean>>({});
  const [callHistories, setCallHistories] = useState<CallHistory[]>([]);
  const [storeTasks, setStoreTasks] = useState<StoreTaskItem[]>(() => hydrateTasks(weeklyTasks));
  const [memoDraft, setMemoDraft] = useState("");
  const [selectedMemoDate, setSelectedMemoDate] = useState("");
  const [managerOptions, setManagerOptions] = useState(defaultManagers);
  const [newManager, setNewManager] = useState("");
  const [setupMonths, setSetupMonths] = useState<SetupMonth[]>([]);
  const [selectedSetupMonth, setSelectedSetupMonth] = useState("");
  const [newSetupMonth, setNewSetupMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [setupItemsByMonth, setSetupItemsByMonth] = useState<Record<string, SetupItem[]>>({});
  const [setupStatus, setSetupStatus] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupPhotos, setSetupPhotos] = useState<SetupPhoto[]>([]);
  const [setupPhotoTitle, setSetupPhotoTitle] = useState("비포 화면");
  const [channelChecks, setChannelChecks] = useState<ChannelChecks>({
    naver: true,
    daangn: false,
    instagram: false,
    google: false,
    photoDate: "2026-06-20",
    influencerDate: "2026-05-01",
    photoHistory: ["2026-06-20"],
    influencerHistory: ["2026-05-01"],
  });
  const [savedAt, setSavedAt] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [privateProfileStatus, setPrivateProfileStatus] = useState("");
  const [privateProfileSaving, setPrivateProfileSaving] = useState(false);
  const [latestInformationSubmission, setLatestInformationSubmission] = useState<{ answers: Record<string, string>; submittedAt: string } | null>(null);
  const [informationSubmissionStatus, setInformationSubmissionStatus] = useState("");
  const [businessRegistrationUploading, setBusinessRegistrationUploading] = useState(false);
  const [creditUploadStatus, setCreditUploadStatus] = useState("");
  const [placeUploadStatus, setPlaceUploadStatus] = useState("");
  const [uploading, setUploading] = useState<"credit" | "place" | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<1 | 2 | 3 | 4>(4);
  const setupItems = setupItemsByMonth[selectedSetupMonth] ?? [];
  const monthlySetupPhotos = setupPhotos.filter((photo) => photo.month === selectedSetupMonth);
  const publicStoreUid = stores?.find((store) => store.id === selectedStoreId)?.publicUid?.trim() ?? "";
  const publicStoreIdentifier = /^\d{1,20}$/.test(profile.placeMid.trim())
    ? profile.placeMid.trim()
    : publicStoreUid;
  const ownerReportUrl = useMemo(
    () => publicStoreIdentifier ? `/store/${encodeURIComponent(publicStoreIdentifier)}/report` : "",
    [publicStoreIdentifier],
  );
  const informationUrl = useMemo(
    () => publicStoreIdentifier ? `/store/${encodeURIComponent(publicStoreIdentifier)}/infor` : "",
    [publicStoreIdentifier],
  );

  useEffect(() => {
    const savedTasks = window.localStorage.getItem("erp:store-weekly-tasks");
    const savedSetupPhotos = window.localStorage.getItem("erp:setup-photos");
    const savedGoldenJobs = window.localStorage.getItem("erp-golden-keyword-jobs");
    const savedRegisteredKeywords = window.localStorage.getItem("erp:registered-golden-keywords");
    const savedCallHistories = window.localStorage.getItem("erp:call-histories");
    if (savedTasks) {
      try {
        setStoreTasks(JSON.parse(savedTasks) as StoreTaskItem[]);
      } catch {
        window.localStorage.removeItem("erp:store-weekly-tasks");
      }
    }
    if (savedSetupPhotos) {
      try {
        setSetupPhotos(JSON.parse(savedSetupPhotos) as SetupPhoto[]);
      } catch {
        window.localStorage.removeItem("erp:setup-photos");
      }
    }
    if (savedGoldenJobs) {
      try {
        setGoldenKeywordJobs(JSON.parse(savedGoldenJobs) as GoldenKeywordJob[]);
      } catch {
        window.localStorage.removeItem("erp-golden-keyword-jobs");
      }
    }
    if (savedRegisteredKeywords) {
      try {
        setRegisteredGoldenKeywords(JSON.parse(savedRegisteredKeywords) as Record<string, boolean>);
      } catch {
        window.localStorage.removeItem("erp:registered-golden-keywords");
      }
    }
    if (savedCallHistories) {
      try {
        setCallHistories(JSON.parse(savedCallHistories) as CallHistory[]);
      } catch {
        window.localStorage.removeItem("erp:call-histories");
      }
    }
  }, []);

  useEffect(() => {
    if (!createRequest) return;
    setCreating(true);
    setProfile(blankStoreProfile);
    setStoreTasks([]);
    setSavedAt("");
  }, [createRequest]);

  useEffect(() => {
    if (!selectedStoreId || !stores?.length) return;
    const selectedStore = stores.find((store) => store.id === selectedStoreId);
    if (!selectedStore) return;
    setCreating(false);
    setProfile((current) => ({
      ...current,
      storeName: selectedStore.name,
      manager: selectedStore.manager,
      contractPeriod: selectedStore.week === "신규" ? "4주" : selectedStore.week.replace("차", ""),
      memo: selectedStore.memo || current.memo,
    }));
  }, [selectedStoreId, stores]);

  useEffect(() => {
    if (!selectedStoreId || creating) return;
    let cancelled = false;
    setPrivateProfileStatus("");
    void fetch(`/api/erp/stores/${encodeURIComponent(selectedStoreId)}/private-profile`)
      .then(async (response) => {
        const payload = await response.json() as {
          profile?: {
            owner_phone?: string | null;
            business_registration_number?: string | null;
            special_notes?: string | null;
            business_registration_storage_path?: string | null;
          } | null;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "비공개 매장 정보를 불러오지 못했습니다.");
        if (cancelled || !payload.profile) return;
        setProfile((current) => ({
          ...current,
          ownerPhone: payload.profile?.owner_phone ?? "",
          businessRegistrationNumber: payload.profile?.business_registration_number ?? "",
          specialNotes: payload.profile?.special_notes ?? "",
          businessRegistrationStoragePath: payload.profile?.business_registration_storage_path ?? "",
        }));
      })
      .catch((error) => {
        if (!cancelled) setPrivateProfileStatus(error instanceof Error ? error.message : "비공개 매장 정보를 불러오지 못했습니다.");
      });
    return () => { cancelled = true; };
  }, [selectedStoreId, creating]);

  useEffect(() => {
    if (!selectedStoreId || creating) {
      setLatestInformationSubmission(null);
      return;
    }
    let cancelled = false;
    setInformationSubmissionStatus("");
    void fetch(`/api/erp/stores/${encodeURIComponent(selectedStoreId)}/information-submissions`)
      .then(async (response) => {
        const payload = await response.json() as {
          submission?: { answers?: Record<string, string>; submitted_at?: string } | null;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "정보안내문 제출 내용을 불러오지 못했습니다.");
        if (cancelled) return;
        const submission = payload.submission;
        setLatestInformationSubmission(submission?.answers && submission.submitted_at
          ? { answers: submission.answers, submittedAt: submission.submitted_at }
          : null);
      })
      .catch((error) => {
        if (!cancelled) setInformationSubmissionStatus(error instanceof Error ? error.message : "정보안내문 제출 내용을 불러오지 못했습니다.");
      });
    return () => { cancelled = true; };
  }, [selectedStoreId, creating]);

  useEffect(() => {
    if (!selectedStoreId || creating) return;
    let cancelled = false;
    void fetch(`/api/erp/stores/${encodeURIComponent(selectedStoreId)}/external-identifiers`)
      .then(async (response) => {
        const payload = await response.json() as { identifiers?: { identifier_type: string; identifier_value: string; is_primary: boolean }[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "외부 식별자를 불러오지 못했습니다.");
        const customerId = payload.identifiers?.find((item) => item.identifier_type === "naver_searchad_customer_id" && item.is_primary)?.identifier_value ?? "";
        if (!cancelled) setProfile((current) => ({ ...current, naverCustomerId: customerId }));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [selectedStoreId, creating]);

  useEffect(() => {
    if (!selectedStoreId || creating) {
      setSetupMonths([]);
      setSelectedSetupMonth("");
      setSetupItemsByMonth({});
      return;
    }

    let cancelled = false;
    setSetupStatus("");
    void fetch(`/api/erp/stores/${encodeURIComponent(selectedStoreId)}/setup`)
      .then(async (response) => {
        const payload = await response.json() as {
          months?: { month_start: string }[];
          items?: {
            id: string;
            month_start: string;
            label: string;
            progress_percent: number;
            due_date: string | null;
            completed: boolean;
          }[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "월별 세팅 정보를 불러오지 못했습니다.");
        if (cancelled) return;
        const months = (payload.months ?? []).map((month) => ({ monthStart: month.month_start.slice(0, 7) }));
        const itemsByMonth = (payload.items ?? []).reduce<Record<string, SetupItem[]>>((result, item) => {
          const monthStart = item.month_start.slice(0, 7);
          result[monthStart] = [
            ...(result[monthStart] ?? []),
            {
              id: item.id,
              label: item.label,
              percent: item.progress_percent,
              dueDate: item.due_date ?? "",
              completed: item.completed,
            },
          ];
          return result;
        }, {});
        setSetupMonths(months);
        setSetupItemsByMonth(itemsByMonth);
        setSelectedSetupMonth((current) => (months.some((month) => month.monthStart === current) ? current : (months[months.length - 1]?.monthStart ?? "")));
      })
      .catch((error) => {
        if (!cancelled) setSetupStatus(error instanceof Error ? error.message : "월별 세팅 정보를 불러오지 못했습니다.");
      });

    return () => { cancelled = true; };
  }, [selectedStoreId, creating]);

  useEffect(() => {
    window.localStorage.setItem("erp:setup-photos", JSON.stringify(setupPhotos));
  }, [setupPhotos]);

  useEffect(() => {
    window.localStorage.setItem("erp:registered-golden-keywords", JSON.stringify(registeredGoldenKeywords));
  }, [registeredGoldenKeywords]);

  const saveProfile = async () => {
    if (profileSaving) return;
    if (!profile.storeName.trim()) {
      setSavedAt("업체명을 입력해주세요.");
      return;
    }
    if (!onSaveStore) {
      setSavedAt("매장 저장 기능을 불러오지 못했습니다.");
      return;
    }
    setProfileSaving(true);
    setSavedAt("매장 원장 저장 중...");
    window.localStorage.setItem("erp:store-weekly-tasks", JSON.stringify(storeTasks));
    try {
      const result = await onSaveStore(creating ? null : selectedStoreId, profile);
      const savedStoreId = result.storeId ?? selectedStoreId;
      if (result.ok && savedStoreId && profile.naverCustomerId.trim()) {
        const identifierResponse = await fetch(`/api/erp/stores/${encodeURIComponent(savedStoreId)}/external-identifiers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifierType: "naver_searchad_customer_id",
            identifierValue: profile.naverCustomerId.trim(),
            label: "Naver SearchAd Customer ID",
            isPrimary: true,
          }),
        });
        const identifierPayload = await identifierResponse.json() as { error?: string };
        if (!identifierResponse.ok) throw new Error(identifierPayload.error ?? "검색광고 Customer ID 저장에 실패했습니다.");
      }
      setSavedAt(result.message);
    } catch (error) {
      setSavedAt(error instanceof Error ? error.message : "매장 저장에 실패했습니다.");
    } finally {
      setProfileSaving(false);
    }
  };

  const resetProfile = () => {
    setCreating(true);
    setProfile(blankStoreProfile);
    setStoreTasks([]);
    window.localStorage.removeItem("erp:store-weekly-tasks");
    setSavedAt("");
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(new URL(text, window.location.origin).toString());
    setSavedAt("링크 복사 완료");
  };

  const savePrivateProfile = async () => {
    if (!selectedStoreId || creating) {
      setPrivateProfileStatus("먼저 매장 기본정보를 저장해주세요.");
      return;
    }
    setPrivateProfileSaving(true);
    setPrivateProfileStatus("");
    try {
      const response = await fetch(`/api/erp/stores/${encodeURIComponent(selectedStoreId)}/private-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerPhone: profile.ownerPhone,
          businessRegistrationNumber: profile.businessRegistrationNumber,
          specialNotes: profile.specialNotes,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "비공개 매장 정보 저장에 실패했습니다.");
      setPrivateProfileStatus("비공개 매장 정보를 저장했습니다.");
    } catch (error) {
      setPrivateProfileStatus(error instanceof Error ? error.message : "비공개 매장 정보 저장에 실패했습니다.");
    } finally {
      setPrivateProfileSaving(false);
    }
  };

  const uploadBusinessRegistration = async (file: File | undefined) => {
    if (!file) return;
    if (!selectedStoreId || creating) {
      setPrivateProfileStatus("먼저 매장 기본정보를 저장해주세요.");
      return;
    }
    setBusinessRegistrationUploading(true);
    setPrivateProfileStatus("");
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch(`/api/erp/stores/${encodeURIComponent(selectedStoreId)}/business-registration`, { method: "POST", body: form });
      const payload = await response.json() as { attachment?: { business_registration_storage_path?: string | null }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "사업자등록증 등록에 실패했습니다.");
      setProfile((current) => ({ ...current, businessRegistrationStoragePath: payload.attachment?.business_registration_storage_path ?? "" }));
      setPrivateProfileStatus("사업자등록증을 비공개 보관소에 등록했습니다.");
    } catch (error) {
      setPrivateProfileStatus(error instanceof Error ? error.message : "사업자등록증 등록에 실패했습니다.");
    } finally {
      setBusinessRegistrationUploading(false);
    }
  };

  const uploadStoreFile = async (kind: "credit" | "place", file: File | undefined) => {
    if (!file) return;
    if (!selectedStoreId || creating) {
      setSavedAt("먼저 업체명을 저장한 뒤 파일을 올려주세요.");
      return;
    }
    const endpoint = kind === "credit"
      ? "/api/erp/card-uploads"
      : file.name.toLowerCase().endsWith(".json")
        ? "/api/erp/naver-json-uploads"
        : "/api/erp/place-uploads";
    if (kind === "credit" && !/\.xlsx?$/i.test(file.name)) {
      setCreditUploadStatus("여신금융 원본은 XLS 또는 XLSX 파일만 올릴 수 있습니다.");
      return;
    }
    if (kind === "place" && !/\.(json|csv)$/i.test(file.name)) {
      setPlaceUploadStatus("네이버 플레이스는 현재 JSON 또는 CSV 파일만 올릴 수 있습니다. Excel은 형식 샘플 확인 뒤 추가합니다.");
      return;
    }
    setUploading(kind);
    const form = new FormData();
    form.set("storeId", selectedStoreId);
    form.set("file", file);
    try {
      const response = await fetch(endpoint, { method: "POST", body: form });
      const payload = await response.json() as { error?: string; duplicate?: boolean };
      if (!response.ok) throw new Error(payload.error ?? "파일 등록에 실패했습니다.");
      const message = payload.duplicate ? "같은 원본이 이미 등록되어 있습니다." : "파일을 등록했습니다. 데이터 화면에서 확인할 수 있습니다.";
      if (kind === "credit") setCreditUploadStatus(message);
      else setPlaceUploadStatus(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "파일 등록에 실패했습니다.";
      if (kind === "credit") setCreditUploadStatus(message);
      else setPlaceUploadStatus(message);
    } finally {
      setUploading(null);
    }
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
  const selectedGoldenJobs = useMemo(
    () => goldenKeywordJobs.filter((job) => job.storeId === selectedStoreId || job.storeName === profile.storeName),
    [goldenKeywordJobs, profile.storeName, selectedStoreId],
  );
  const goldenKeywords = useMemo(
    () => selectedGoldenJobs.flatMap((job) => job.rows.filter((row) => row.result === "꿀키워드")).slice(0, 20),
    [selectedGoldenJobs],
  );

  const goldenKeywordKey = (keyword: string) => `${selectedStoreId || profile.storeName}:${keyword}`;

  const toggleRegisteredGoldenKeyword = (keyword: string) => {
    const key = goldenKeywordKey(keyword);
    setRegisteredGoldenKeywords((current) => ({ ...current, [key]: !current[key] }));
  };

  const updateSetupItem = (id: string, patch: Partial<SetupItem>) => {
    if (!selectedSetupMonth) return;
    setSetupItemsByMonth((months) => {
      const items = months[selectedSetupMonth] ?? [];
      return {
        ...months,
        [selectedSetupMonth]: items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      };
    });
  };

  const addSetupItem = () => {
    if (!selectedSetupMonth) {
      setSetupStatus("먼저 관리월을 생성하거나 선택해주세요.");
      return;
    }
    setSetupItemsByMonth((months) => {
      const items = months[selectedSetupMonth] ?? [];
      return {
        ...months,
        [selectedSetupMonth]: [
          ...items,
          {
            id: `setup-${Date.now()}`,
            label: "새 세팅 항목",
            percent: 0,
            dueDate: "",
            completed: false,
          },
        ],
      };
    });
  };

  const deleteSetupItem = (id: string) => {
    setSetupItemsByMonth((months) => {
      const items = months[selectedSetupMonth] ?? [];
      return {
        ...months,
        [selectedSetupMonth]: items.filter((item) => item.id !== id),
      };
    });
  };

  const addSetupPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!selectedSetupMonth) {
      setSetupStatus("관리월을 만든 뒤 사진을 추가해주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSetupPhotos((photos) => [
        {
          id: `setup-photo-${Date.now()}`,
          month: selectedSetupMonth,
          date: new Date().toISOString().slice(0, 10),
          title: setupPhotoTitle.trim() || "비포 화면",
          fileName: file.name,
          dataUrl: String(reader.result ?? ""),
        },
        ...photos,
      ]);
    };
    reader.readAsDataURL(file);
  };

  const deleteSetupPhoto = (id: string) => {
    setSetupPhotos((photos) => photos.filter((photo) => photo.id !== id));
  };

  const createSetupMonth = async () => {
    if (!selectedStoreId || creating) {
      setSetupStatus("매장을 먼저 저장한 뒤 관리월을 만들 수 있습니다.");
      return;
    }
    if (!newSetupMonth) return;
    setSetupSaving(true);
    setSetupStatus("");
    try {
      const response = await fetch(`/api/erp/stores/${encodeURIComponent(selectedStoreId)}/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthStart: newSetupMonth }),
      });
      const payload = await response.json() as { month?: { month_start: string }; error?: string };
      if (!response.ok || !payload.month) throw new Error(payload.error ?? "관리월을 만들지 못했습니다.");
      const monthStart = payload.month.month_start.slice(0, 7);
      setSetupMonths((current) => Array.from(new Set([...current.map((month) => month.monthStart), monthStart])).sort().map((value) => ({ monthStart: value })));
      setSetupItemsByMonth((current) => ({ ...current, [monthStart]: current[monthStart] ?? [] }));
      setSelectedSetupMonth(monthStart);
      setSetupStatus(`${formatSetupMonth(monthStart)} 관리월을 만들었습니다.`);
    } catch (error) {
      setSetupStatus(error instanceof Error ? error.message : "관리월을 만들지 못했습니다.");
    } finally {
      setSetupSaving(false);
    }
  };

  const saveSetupMonth = async () => {
    if (!selectedStoreId || !selectedSetupMonth) return;
    setSetupSaving(true);
    setSetupStatus("");
    try {
      const response = await fetch(`/api/erp/stores/${encodeURIComponent(selectedStoreId)}/setup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthStart: selectedSetupMonth,
          items: setupItems.map((item) => ({
            id: item.id,
            label: item.label,
            percent: item.percent,
            dueDate: item.dueDate || null,
            completed: item.completed,
          })),
        }),
      });
      const payload = await response.json() as {
        items?: { id: string; label: string; progress_percent: number; due_date: string | null; completed: boolean }[];
        error?: string;
      };
      if (!response.ok || !payload.items) throw new Error(payload.error ?? "세팅 항목을 저장하지 못했습니다.");
      setSetupItemsByMonth((current) => ({
        ...current,
        [selectedSetupMonth]: payload.items?.map((item) => ({
          id: item.id,
          label: item.label,
          percent: item.progress_percent,
          dueDate: item.due_date ?? "",
          completed: item.completed,
        })) ?? [],
      }));
      setSetupStatus(`${formatSetupMonth(selectedSetupMonth)} 세팅 항목을 저장했습니다.`);
    } catch (error) {
      setSetupStatus(error instanceof Error ? error.message : "세팅 항목을 저장하지 못했습니다.");
    } finally {
      setSetupSaving(false);
    }
  };

  const deleteSetupMonth = async () => {
    if (!selectedStoreId || !selectedSetupMonth) return;
    if (!window.confirm(`${formatSetupMonth(selectedSetupMonth)}의 세팅 항목을 모두 삭제할까요?`)) return;
    setSetupSaving(true);
    setSetupStatus("");
    try {
      const response = await fetch(`/api/erp/stores/${encodeURIComponent(selectedStoreId)}/setup?monthStart=${encodeURIComponent(selectedSetupMonth)}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "관리월을 삭제하지 못했습니다.");
      setSetupMonths((current) => {
        const next = current.filter((month) => month.monthStart !== selectedSetupMonth);
        setSelectedSetupMonth(next[next.length - 1]?.monthStart ?? "");
        return next;
      });
      setSetupItemsByMonth((current) => {
        const { [selectedSetupMonth]: _removed, ...rest } = current;
        return rest;
      });
      setSetupStatus("관리월과 세팅 항목을 삭제했습니다.");
    } catch (error) {
      setSetupStatus(error instanceof Error ? error.message : "관리월을 삭제하지 못했습니다.");
    } finally {
      setSetupSaving(false);
    }
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
          <button className="btn btn-light" onClick={resetProfile} type="button">신규 매장</button>
          <button className="btn btn-light" disabled={creating || !selectedStoreId} onClick={() => {
            if (window.confirm("이 매장을 업체 목록에서 삭제할까요? 기존 업로드 데이터는 보존되며, 관리자만 나중에 복구할 수 있습니다.")) onArchiveStore?.(selectedStoreId);
          }} type="button">목록에서 삭제</button>
          <button className="btn btn-primary" disabled={profileSaving} onClick={saveProfile} type="button">{profileSaving ? "저장 중" : "저장"}</button>
        </div>
      </div>

      <section className="store-summary-strip">
        {stores?.length ? (
          <select
            className="store-switch-select"
            value={creating ? "" : selectedStoreId}
            onChange={(event) => {
              setCreating(false);
              setSelectedStoreId(event.target.value);
            }}
          >
            {creating && <option value="">신규 매장 작성 중</option>}
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        ) : (
          <strong>{profile.storeName}</strong>
        )}
        <span>MID {profile.placeMid}</span>
        <span>담당자 {profile.manager}</span>
        <span>관리 {profile.contractPeriod}</span>
        {savedAt && <em>{savedAt}</em>}
      </section>

      <section className="panel">
        <div className="section-headline">
          <div>
            <h2>매장 데이터 파일 등록</h2>
            <p className="plain-text">선택한 매장에만 연결됩니다. 같은 원본은 중복 저장하지 않으며, 먼저 매장을 저장해야 합니다.</p>
          </div>
        </div>
        <div className="store-link-actions">
          <label className="btn btn-light">
            {uploading === "credit" ? "여신금융 등록 중" : "여신금융 매출 등록"}
            <input accept=".xls,.xlsx" disabled={uploading !== null} hidden onChange={(event) => uploadStoreFile("credit", event.target.files?.[0])} type="file" />
          </label>
          <span className="plain-text">{creditUploadStatus || "XLS/XLSX · 매장별 카드 매출 원본"}</span>
        </div>
        <div className="store-link-actions">
          <label className="btn btn-light">
            {uploading === "place" ? "네이버 등록 중" : "네이버 플레이스 등록"}
            <input accept=".json,.csv" disabled={uploading !== null} hidden onChange={(event) => uploadStoreFile("place", event.target.files?.[0])} type="file" />
          </label>
          <span className="plain-text">{placeUploadStatus || "JSON 또는 CSV · 기간, 원본, 수집 상태를 매장별로 보관"}</span>
        </div>
        <p className="plain-text">네이버 Excel 형식은 실제 샘플 규격을 확인한 뒤 추가합니다. 현재는 JSON과 CSV만 숫자 데이터로 처리합니다.</p>
      </section>

      <section className="panel">
        <div className="section-headline">
          <div>
            <h2>사장님 정보안내문 최신 제출</h2>
            <p className="plain-text">공유 링크에서 제출한 원본입니다. 내부 확인 후 매장 원장에 반영합니다.</p>
          </div>
        </div>
        {informationSubmissionStatus && <p className="plain-text">{informationSubmissionStatus}</p>}
        {latestInformationSubmission ? (
          <div className="task-table compact-list">
            <p className="plain-text">제출 시각: {new Date(latestInformationSubmission.submittedAt).toLocaleString("ko-KR")}</p>
            {Object.entries(latestInformationSubmission.answers).map(([label, value]) => (
              <div className="task-row-static" key={label}>
                <strong>{label}</strong>
                <span>{value}</span>
              </div>
            ))}
          </div>
        ) : <p className="plain-text">아직 사장님이 제출한 정보안내문이 없습니다.</p>}
      </section>

      <section className="panel">
        <h2>매장 키워드 / 꿀키워드 히스토리</h2>
        <p className="store-help-text">유입/키워드 탭에서 꿀키워드 탐색기를 실행하면 이 매장에 자동으로 쌓입니다.</p>
        <div className="golden-keyword-chip-list">
          {goldenKeywords.map((row) => (
            <button
              className={registeredGoldenKeywords[goldenKeywordKey(row.keyword)] ? "golden-keyword-chip registered" : "golden-keyword-chip"}
              key={`${row.keyword}-${row.volume}`}
              onClick={() => toggleRegisteredGoldenKeyword(row.keyword)}
              type="button"
            >
              <strong>{row.keyword}</strong>
              <span>검색량 {row.volume} · 지도 {row.pageCount}p</span>
              <em>{registeredGoldenKeywords[goldenKeywordKey(row.keyword)] ? "등록완료" : "미등록"}</em>
            </button>
          ))}
          {goldenKeywords.length === 0 && <em>아직 등록된 꿀키워드가 없습니다.</em>}
        </div>
      </section>

      <section className="panel">
        <div className="section-headline">
          <div>
            <h2>통화 히스토리</h2>
            <p className="plain-text">일일 업무에서 저장한 통화 요약과 업무 후보를 이 매장 기준으로 확인합니다.</p>
          </div>
          <strong>{callHistories.filter((history) => history.storeId === selectedStoreId).length}건</strong>
        </div>
        <div className="call-history-list">
          {callHistories.filter((history) => history.storeId === selectedStoreId).map((history) => (
            <details className="call-history-card" key={history.id}>
              <summary>{history.date} · {history.createdAt} · 후보 {history.candidates.length}개</summary>
              <pre>{history.summary}</pre>
            </details>
          ))}
          {callHistories.filter((history) => history.storeId === selectedStoreId).length === 0 && (
            <p className="plain-text">이 매장에 저장된 통화 히스토리가 없습니다.</p>
          )}
        </div>
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
          <ReadLine label="사장님 보고서" value={ownerReportUrl || "매장을 먼저 저장하면 공유 링크가 생성됩니다."} />
          <div className="store-link-actions">
            <button className="btn btn-light" disabled={!ownerReportUrl} onClick={() => copyText(ownerReportUrl)} type="button">복사</button>
            {ownerReportUrl ? (
              <a className="btn btn-primary" href={ownerReportUrl} rel="noreferrer" target="_blank">새 탭에서 열기</a>
            ) : (
              <button className="btn btn-primary" disabled type="button">매장 저장 필요</button>
            )}
          </div>
          <ReadLine label="정보안내문" value={informationUrl || "매장을 먼저 저장하면 공유 링크가 생성됩니다."} />
          <div className="store-link-actions">
            <button className="btn btn-light" disabled={!informationUrl} onClick={() => copyText(informationUrl)} type="button">복사</button>
            {informationUrl ? (
              <a className="btn btn-primary" href={informationUrl} rel="noreferrer" target="_blank">새 탭에서 열기</a>
            ) : (
              <button className="btn btn-primary" disabled type="button">매장 저장 필요</button>
            )}
          </div>
        </div>

        <div>
          <h2>네이버/검색광고</h2>
          <Field label="네이버 ID" field="naverId" profile={profile} setProfile={setProfile} />
          <Field label="Customer ID" field="naverCustomerId" profile={profile} setProfile={setProfile} />
          <p className="plain-text">비밀번호·Secret Key는 이 화면에 입력하거나 저장하지 않습니다. 추후 승인형 연동 설정에서 별도로 연결합니다.</p>
        </div>

        <div>
          <h2>SNS/외부 계정</h2>
          <Field label="인스타그램 ID" field="instagramId" profile={profile} setProfile={setProfile} />
          <Field label="구글 ID" field="googleId" profile={profile} setProfile={setProfile} />
          <Field label="카카오맵 ID" field="kakaoMapId" profile={profile} setProfile={setProfile} />
          <Field label="카카오톡 채널" field="kakaoChannelUrl" profile={profile} setProfile={setProfile} />
          <p className="plain-text">외부 서비스 비밀번호와 금융 로그인 정보는 저장하지 않습니다. 매출 파일은 업로드 방식으로 연결합니다.</p>
        </div>
      </section>

      <section className="panel">
        <div className="section-headline">
          <div>
            <h2>비공개 사장님·사업자 정보</h2>
            <p className="plain-text">관리자와 담당 직원만 해당 매장에서 확인합니다. 사장님 보고서나 공유 링크에는 노출되지 않습니다.</p>
          </div>
          <button className="btn btn-primary" disabled={privateProfileSaving || creating || !selectedStoreId} onClick={savePrivateProfile} type="button">
            {privateProfileSaving ? "저장 중" : "비공개 정보 저장"}
          </button>
        </div>
        <div className="store-form-grid">
          <div>
            <Field label="사장님 연락처" field="ownerPhone" profile={profile} setProfile={setProfile} type="tel" />
            <Field label="사업자등록번호" field="businessRegistrationNumber" profile={profile} setProfile={setProfile} />
          </div>
          <div>
            <div className="store-field">
              <span>사업자등록증</span>
              <span className="store-link-actions">
                <label className="btn btn-light">
                  {businessRegistrationUploading ? "등록 중" : "파일 등록"}
                  <input accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={businessRegistrationUploading || creating || !selectedStoreId} hidden onChange={(event) => uploadBusinessRegistration(event.target.files?.[0])} type="file" />
                </label>
                <em className="plain-text">{profile.businessRegistrationStoragePath ? "등록됨" : "PDF·JPG·PNG·WEBP, 최대 10MB"}</em>
              </span>
            </div>
          </div>
        </div>
        <label className="mock-field">
          <span>매장 특이사항</span>
          <textarea
            className="store-memo"
            placeholder="사장님과의 약속, 주의할 점, 매장 운영상 반드시 알아야 할 내용을 적어주세요."
            value={profile.specialNotes}
            onChange={(event) => setProfile({ ...profile, specialNotes: event.target.value })}
          />
        </label>
        {privateProfileStatus && <p className="plain-text">{privateProfileStatus}</p>}
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
        <div className="section-headline">
          <div>
            <h2>매장 세팅 상태 체크</h2>
            <p className="plain-text">필요한 관리월만 생성해 세팅 진행률과 수정 마감일을 저장합니다.</p>
          </div>
          <div className="inline-actions">
            <input aria-label="새 관리월" onChange={(event) => setNewSetupMonth(event.target.value)} type="month" value={newSetupMonth} />
            <button className="btn btn-light" disabled={setupSaving || creating || !selectedStoreId} onClick={createSetupMonth} type="button">관리월 생성</button>
            <button className="btn btn-primary" disabled={setupSaving || !selectedSetupMonth} onClick={saveSetupMonth} type="button">세팅 저장</button>
            <button className="btn btn-light" disabled={setupSaving || !selectedSetupMonth} onClick={deleteSetupMonth} type="button">관리월 삭제</button>
          </div>
        </div>
        {setupStatus && <p className="plain-text">{setupStatus}</p>}
        <div className="month-tabs" aria-label="월별 세팅 체크">
          {setupMonths.map((month) => (
            <button className={month.monthStart === selectedSetupMonth ? "active" : ""} key={month.monthStart} onClick={() => setSelectedSetupMonth(month.monthStart)} type="button">
              {formatSetupMonth(month.monthStart)}
            </button>
          ))}
          {setupMonths.length === 0 && <p className="plain-text">아직 만든 관리월이 없습니다.</p>}
        </div>
        {selectedSetupMonth && <div className="setup-check-grid">
          {setupItems.map((item) => (
            <div className={`setup-check-row ${getDueClass(item.dueDate, item.completed)}`} key={item.id}>
              <input
                className="setup-label-input"
                value={item.label}
                onChange={(event) => updateSetupItem(item.id, { label: event.target.value })}
              />
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
              <button className="btn btn-light" onClick={() => deleteSetupItem(item.id)} type="button">삭제</button>
            </div>
          ))}
          <button className="btn btn-light" onClick={addSetupItem} type="button">세팅 항목 추가</button>
          {setupItems.length === 0 && <p className="plain-text">세팅 항목을 추가한 뒤 저장해주세요.</p>}
        </div>}
        {selectedSetupMonth && <div className="setup-photo-upload">
          <div>
            <h3>{formatSetupMonth(selectedSetupMonth)} 비포/수정 히스토리 사진</h3>
            <p className="plain-text">1주차 비포, 3주차 검수 화면처럼 스크린샷을 날짜 기준으로 쌓아둡니다.</p>
          </div>
          <input value={setupPhotoTitle} onChange={(event) => setSetupPhotoTitle(event.target.value)} placeholder="사진 제목" />
          <input accept="image/*" onChange={(event) => addSetupPhoto(event.target.files?.[0])} type="file" />
        </div>}
        {selectedSetupMonth && <div className="setup-photo-grid">
          {monthlySetupPhotos.map((photo) => (
            <div className="setup-photo-card" key={photo.id}>
              {photo.dataUrl && <img alt={photo.title} src={photo.dataUrl} />}
              <strong>{photo.title}</strong>
              <span>{photo.date} · {photo.fileName}</span>
              <button className="btn btn-light" onClick={() => deleteSetupPhoto(photo.id)} type="button">삭제</button>
            </div>
          ))}
          {monthlySetupPhotos.length === 0 && <p className="plain-text">아직 이 월에 등록된 히스토리 사진이 없습니다.</p>}
        </div>}
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

