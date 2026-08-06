"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { DailyTasksPage } from "@/components/daily-tasks/daily-tasks-page";
import { LogoutButton } from "@/components/auth/logout-button";
import { StoreInfoPage } from "@/components/stores/store-info-page";
import { StoreRegistryProvider, useStoreRegistry } from "@/components/stores/store-registry-context";
import { CanonicalStore } from "@/lib/stores/registry";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Home,
  KeyRound,
  LineChart,
  Link as LinkIcon,
  MapPinned,
  Megaphone,
  Search,
  Store,
  Wallet,
} from "lucide-react";

type ViewId = "dashboard" | "ad" | "inflow" | "sales" | "adminDaily" | "daily" | "tasks" | "owner" | "store" | "questionnaire" | "weeklyFlow";
type Signal = "green" | "yellow" | "red" | "gray";

type StoreRow = {
  id: string;
  week: "1주차" | "2주차" | "3주차" | "4주차" | "신규";
  name: string;
  manager: string;
  bizMoney: number | null;
  naverInflow: number | null;
  sales: number | null;
  previous: {
    bizMoney: number | null;
    naverInflow: number | null;
    sales: number | null;
  };
  weeklyInflow: number[];
  weeklyTasks: [number, number, number, number];
  memo: string;
  publicUid?: string | null;
};

type BulkStoreImportResult = {
  imported: number;
  skipped: number;
  failed: number;
};

type TaskItem = {
  week: 1 | 2 | 3 | 4;
  date: string;
  day: string;
  name: string;
  status: "완료" | "대기중" | "미완료";
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

type QuestionnaireSection = [string, string[]];

const stores: StoreRow[] = [
  {
    id: "s1",
    week: "4주차",
    name: "토종곱창 철산본점",
    manager: "박상일(경기)",
    bizMoney: 54253,
    naverInflow: 1890,
    sales: 4037211,
    previous: { bizMoney: 85000, naverInflow: 5725, sales: 5686915 },
    weeklyInflow: [5216, 5481, 5725, 1890],
    weeklyTasks: [100, 100, 100, 100],
    memo: "유입 급감, 광고 예산 확인",
  },
  {
    id: "s2",
    week: "3주차",
    name: "갑탄계 숯불치킨 불당점",
    manager: "박상일(경기)",
    bizMoney: 182000,
    naverInflow: 594,
    sales: 4037211,
    previous: { bizMoney: 201000, naverInflow: 1554, sales: 5686915 },
    weeklyInflow: [1352, 1576, 1554, 594],
    weeklyTasks: [100, 100, 80, 60],
    memo: "네이버 유입 하락",
  },
  {
    id: "s3",
    week: "2주차",
    name: "강릉장칼국수&보쌈 종무로",
    manager: "박규상",
    bizMoney: 316500,
    naverInflow: 898,
    sales: 4578400,
    previous: { bizMoney: 300000, naverInflow: 1806, sales: 4887500 },
    weeklyInflow: [2004, 1871, 1806, 898],
    weeklyTasks: [100, 90, 80, 0],
    memo: "순위 체크, 여신 업로드",
  },
  {
    id: "s4",
    week: "1주차",
    name: "곱창파는 고깃집 공덕본점",
    manager: "강정원",
    bizMoney: 420000,
    naverInflow: 3317,
    sales: 17281700,
    previous: { bizMoney: 315000, naverInflow: 2746, sales: 15591300 },
    weeklyInflow: [906, 2746, 3252, 3317],
    weeklyTasks: [70, 0, 0, 0],
    memo: "상승세, 키워드 추가",
  },
  {
    id: "s5",
    week: "신규",
    name: "농가의식탁",
    manager: "박상일(경기)",
    bizMoney: null,
    naverInflow: null,
    sales: null,
    previous: { bizMoney: null, naverInflow: null, sales: null },
    weeklyInflow: [0, 0, 0, 0],
    weeklyTasks: [15, 0, 0, 0],
    memo: "계정 연결 필요",
  },
];

const initialDailyInboxTasks: DailyInboxTask[] = [
  {
    id: "inbox-1",
    storeId: "s1",
    task: "신메뉴 사진 교체",
    dueDate: "2026-07-11",
    urgent: true,
    important: true,
    completed: false,
    createdAt: "2026-07-10",
  },
  {
    id: "inbox-2",
    storeId: "s2",
    task: "쿠폰 문구 재전달",
    dueDate: "2026-07-12",
    urgent: true,
    important: false,
    completed: false,
    createdAt: "2026-07-11",
  },
  {
    id: "inbox-3",
    storeId: "s3",
    task: "리뷰 답글 확인",
    dueDate: "2026-07-18",
    urgent: false,
    important: true,
    completed: false,
    createdAt: "2026-07-12",
  },
  {
    id: "inbox-4",
    storeId: "s5",
    task: "정보안내문 작성 요청",
    dueDate: "2026-07-20",
    urgent: false,
    important: false,
    completed: false,
    createdAt: "2026-07-12",
  },
];

const navItems: Array<{ id: ViewId; label: string; icon: typeof Home }> = [
  { id: "dashboard", label: "운영 대시보드", icon: Home },
  { id: "ad", label: "네이버 광고", icon: Megaphone },
  { id: "inflow", label: "유입/키워드", icon: LineChart },
  { id: "sales", label: "여신금융 매출", icon: Wallet },
  { id: "adminDaily", label: "관리자 일일업무", icon: ClipboardCheck },
  { id: "daily", label: "일일 업무", icon: ClipboardCheck },
  { id: "tasks", label: "주간 업무", icon: ClipboardCheck },
  { id: "owner", label: "사장님 보고서", icon: FileText },
  { id: "store", label: "매장 정보", icon: KeyRound },
  { id: "questionnaire", label: "정보안내문", icon: LinkIcon },
  { id: "weeklyFlow", label: "매장 주간 데이터 흐름", icon: BarChart3 },
];

const inflowKeywords = [
  ["묵자주막", 92, 18, 24.3],
  ["평택역닭발", 74, -27, -26.7],
  ["평택야장", 66, -60, -47.6],
  ["평택역맛집", 62, -236, -79.2],
  ["평택마신닭발", 59, -13, -18.1],
  ["평택역야장", 52, 18, 52.9],
  ["평택묵자주막", 29, -1, -3.3],
  ["평택역술집", 29, 16, 123.1],
  ["평택닭발", 23, -5, -17.9],
  ["평택국물닭발", 22, 9, 69.2],
  ["평택역족발", 18, -2, -10.0],
  ["평택국물닭발맛집", 14, 9, 180.0],
  ["평택역국물닭발", 13, -7, -35.0],
  ["묵자주막평택역점", 11, 4, 57.1],
  ["국물닭발", 11, 5, 83.3],
  ["음식점", 11, -41, -78.8],
  ["평택역무한리필", 11, -6, -35.3],
  ["평택닭발맛집", 10, 0, 0],
  ["마신닭발", 10, -13, -56.5],
  ["평택역묵자주막", 10, 1, 11.1],
  ["평택포차", 9, 3, 50.0],
  ["무한리필", 9, 2, 28.6],
  ["평택역등갈비", 9, 4, 80.0],
];

const inflowChannels = [
  ["네이버지도", 1287, -949, -42.4],
  ["네이버검색", 863, -463, -34.9],
  ["네이버 플레이스광고", 93, -339, -78.5],
  ["네이버 지역소상공인광고", 31, -125, -80.1],
  ["네이버 블로그", 39, -28, -41.8],
  ["웹사이트", 1, -14, -93.3],
  ["네이버 MY플레이스", 7, -6, -46.2],
  ["인스타그램", 4, -2, -33.3],
  ["네이버 카페", 1, 1, 100.0],
];

const keywordGroups = [
  {
    title: "1 지역/장소키워드",
    sample: "성수동\n성수역\n뚝섬\n서울숲\n성수동카페거리",
  },
  {
    title: "2 수식어",
    sample: "근처\n가까운\n인근\n주변\n주위",
  },
  {
    title: "3 메뉴키워드",
    sample: "제철스시\n메로구이\n오마카세\n사시미\n모리아와세",
  },
  {
    title: "4 특수키워드",
    sample: "이자카야\n술집\n배달\n포장\n혼술",
  },
  {
    title: "5 단독키워드",
    sample: "성수역1번출구\n성수역4번출구",
  },
  {
    title: "6 목표키워드",
    sample: "광명곱창\n광명맛집\n광명저녁추천",
  },
];

const combinationRules = ["1+3", "1+2+3", "1+2+4", "1+4", "2+3", "2+4", "5+3", "5+4", "1+6", "2+6"];
const defaultCombinationRules = ["1+3", "1+2+3", "1+2+4", "1+4", "2+3", "2+4", "5+3", "5+4"];

type KeywordAnalysisRow = {
  keyword: string;
  volume: number;
  pageCount: number | null;
  estimatedStores: number;
  result: "꿀키워드" | "보류" | "저검색" | "지도확인실패" | "지도차단";
  source?: "real" | "estimate";
};

type PlaceCsvUpload = {
  id: string;
  storeId: string;
  storeName: string;
  fileName: string;
  uploadedAt: string;
  weekStart: string;
  weekEnd: string;
  summary: Record<string, number>;
  keywordRows: (string | number)[][];
  channelRows: (string | number)[][];
};

type ServerPlaceUpload = {
  id: string;
  store_id: string;
  file_name: string;
  period_start: string;
  period_end: string;
  uploaded_at: string;
  warnings: string[];
  summary: {
    placeInflow: number | null;
    reservationOrder: number | null;
    smartCall: number | null;
    reviewRegister: number | null;
  };
  keywords: Array<{
    keyword: string;
    visit_count: number;
    previous_count: number | null;
    diff_count: number | null;
    diff_rate: number | null;
  }>;
  channels: Array<{
    channel: string;
    visit_count: number;
    previous_count: number | null;
    diff_count: number | null;
    diff_rate: number | null;
  }>;
};

type DashboardGranularity = "day" | "week" | "month";

type DashboardPlaceStore = {
  id: string;
  name: string;
  managerName: string | null;
  inflowBuckets: Array<number | null>;
  salesBuckets: Array<number | null>;
  currentInflow: number | null;
  previousInflow: number | null;
  currentSales: number | null;
  previousSales: number | null;
};

type GoldenKeywordJob = {
  id: string;
  storeId: string;
  storeName: string;
  createdAt: string;
  keywordCount: number;
  resultCount: number;
  rows: KeywordAnalysisRow[];
};

type ServerCardImport = {
  id: string;
  file_name: string;
  period_start: string;
  period_end: string;
  net_sales: number;
  net_payment_count: number;
  amount_per_payment: number | null;
  uploaded_at: string;
};

type ServerCardData = {
  imports: ServerCardImport[];
  daily: Array<{
    transaction_date: string;
    net_sales: number;
    net_payment_count: number;
    amount_per_payment: number | null;
  }>;
  hourly: Array<{ hour: number; netSales: number; netPaymentCount: number }>;
  weekdays: Array<{ weekday: number; netSales: number; netPaymentCount: number }>;
  totals: { netSales: number; netPaymentCount: number; amountPerPayment: number | null };
};

const tagKeywords = [
  "성수동제철스시",
  "성수역메로구이",
  "뚝섬오마카세",
  "서울숲이자카야",
  "성수역4번출구술집",
  "광명곱창",
  "광명맛집",
  "광명저녁추천",
];

const powerlinkKeywords = [
  "성수동근처제철스시",
  "성수역가까운오마카세",
  "뚝섬주변이자카야",
  "서울숲근처술집",
  "성수동인근혼술",
  "성수역4번출구광명곱창",
  "광명곱창맛집",
  "광명저녁추천술집",
];

const keywordAnalysisRows = [
  ["성수동오마카세", 270, 1, 49, "꿀키워드"],
  ["성수역이자카야", 300, 1, 49, "꿀키워드"],
  ["서울숲술집", 240, 1, 49, "꿀키워드"],
  ["성수동혼술", 110, 1, 49, "꿀키워드"],
  ["근처스시", 80, 3, 149, "보류"],
  ["성수동제철스시", 40, 1, 49, "저검색"],
];

const weeklyTasks: TaskItem[] = [
  ["2026-06-15", "월", "전 주 여신금융 매출 확인", "완료", 1],
  ["2026-06-15", "월", "SEO 재점검(대표,상세,대문사진배치,마이크로,쿠폰)", "완료", 1],
  ["2026-06-15", "월", "마케팅 메세지 송부", "완료", 1],
  ["2026-06-15", "월", "주간 마케팅 성과 보고서 송부", "완료", 1],
  ["2026-06-16", "화", "필요한 배너 취합", "완료", 1],
  ["2026-06-16", "화", "A/B 테스트 결과 보고 및 신소재 진행 (CPC)", "완료", 1],
  ["2026-06-16", "화", "체험단 모집 진행", "완료", 1],
  ["2026-06-16", "화", "네이버 리뷰 답글 작성/추천순 포함", "완료", 1],
  ["2026-06-17", "수", "CPC, 파워링크 제외키워드 입력", "완료", 1],
  ["2026-06-17", "수", "세부 키워드 별 순위 변동 확인 (seo 효과)", "완료", 1],
  ["2026-06-17", "수", "인스타그램 게시물 업로드", "완료", 1],
  ["2026-06-18", "목", "주간 영수증리뷰 활성화 파악", "완료", 1],
  ["2026-06-18", "목", "설문조사 활성화 파악", "완료", 1],
  ["2026-06-18", "목", "포인트닥터 전환 수 체크", "완료", 1],
  ["2026-06-18", "목", "네이버 새소식 업데이트", "완료", 1],
  ["2026-06-18", "목", "당근비지니스 새소식 작성", "완료", 1],
  ["2026-06-19", "금", "업장 변경점 파악", "완료", 1],
  ["2026-06-19", "금", "블로그 상위노출 확인", "완료", 1],
  ["2026-06-19", "금", "각 플렛폼 잔액체크 및 활성화 확인", "완료", 1],
  ["2026-06-22", "월", "전 주 여신금융 매출 확인", "완료", 2],
  ["2026-06-22", "월", "주간 마케팅 성과 보고서 송부", "완료", 2],
  ["2026-06-23", "화", "A/B 테스트 중간점검 (CPC)", "완료", 2],
  ["2026-06-23", "화", "네이버 리뷰 답글 작성/추천순 포함", "완료", 2],
  ["2026-06-23", "화", "체험단 선정 진행", "완료", 2],
  ["2026-06-24", "수", "CPC, 파워링크 제외키워드 입력", "완료", 2],
  ["2026-06-24", "수", "세부 키워드 별 순위 변동 확인 (seo 효과)", "완료", 2],
  ["2026-06-24", "수", "각 플렛폼 잔액체크 및 활성화 확인", "완료", 2],
  ["2026-06-24", "수", "인스타그램 게시물 업로드", "완료", 2],
  ["2026-06-25", "목", "주간 영수증리뷰 활성화 파악", "완료", 2],
  ["2026-06-25", "목", "설문조사 활성화 파악", "완료", 2],
  ["2026-06-25", "목", "포인트닥터 전환 수 체크", "완료", 2],
  ["2026-06-25", "목", "네이버 새소식 업데이트", "완료", 2],
  ["2026-06-25", "목", "당근비지니스 새소식 작성", "완료", 2],
  ["2026-06-26", "금", "블로그 상위노출 확인", "완료", 2],
  ["2026-06-26", "금", "각 플렛폼 잔액체크 및 활성화 확인", "완료", 2],
  ["2026-06-29", "월", "업체 솔루션 기획", "완료", 3],
  ["2026-06-29", "월", "전 주 여신금융 매출 확인", "완료", 3],
  ["2026-06-29", "월", "주간 마케팅 성과 보고서 송부", "완료", 3],
  ["2026-06-30", "화", "A/B 테스트 결과 보고 및 신소재 진행 (CPC)", "완료", 3],
  ["2026-06-30", "화", "네이버 리뷰 답글 작성/추천순 포함", "완료", 3],
  ["2026-07-01", "수", "CPC, 파워링크 제외키워드 입력", "완료", 3],
  ["2026-07-01", "수", "세부 키워드 별 순위 변동 확인 (seo 효과)", "완료", 3],
  ["2026-07-01", "수", "인스타그램 게시물 업로드", "완료", 3],
  ["2026-07-02", "목", "주간 영수증리뷰 활성화 파악", "완료", 3],
  ["2026-07-02", "목", "설문조사 활성화 파악", "완료", 3],
  ["2026-07-02", "목", "포인트닥터 전환 수 체크", "완료", 3],
  ["2026-07-02", "목", "네이버 새소식 업데이트", "완료", 3],
  ["2026-07-02", "목", "당근비지니스 새소식 작성", "완료", 3],
  ["2026-07-03", "금", "업체 솔루션 제공", "완료", 3],
  ["2026-07-03", "금", "블로그 상위노출 확인", "완료", 3],
  ["2026-07-03", "금", "각 플렛폼 잔액체크 및 활성화 확인", "완료", 3],
  ["2026-07-06", "월", "전 주 여신금융 매출 확인", "완료", 4],
  ["2026-07-06", "월", "주간 마케팅 성과 보고서 송부", "완료", 4],
  ["2026-07-07", "화", "A/B 테스트 중간점검 (CPC)", "완료", 4],
  ["2026-07-07", "화", "네이버 리뷰 답글 작성/추천순 포함", "완료", 4],
  ["2026-07-08", "수", "CPC, 파워링크 제외키워드 입력", "완료", 4],
  ["2026-07-08", "수", "네이버 쿠폰 효율 점검 (기준)", "완료", 4],
  ["2026-07-08", "수", "인스타그램 게시물 업로드", "완료", 4],
  ["2026-07-09", "목", "블로그 상위노출 확인", "완료", 4],
  ["2026-07-09", "목", "네이버 새소식 업데이트", "완료", 4],
  ["2026-07-09", "목", "당근비지니스 새소식 작성", "완료", 4],
  ["2026-07-10", "금", "1~4주차 최종보고서 작성", "완료", 4],
  ["2026-07-10", "금", "성장지원 이벤트 결과 안내", "완료", 4],
].map(([date, day, name, status, week]) => ({ date, day, name, status, week } as TaskItem));

function formatNumber(value: number | null, suffix = "") {
  if (value === null) return "데이터 없음";
  return `${value.toLocaleString("ko-KR")}${suffix}`;
}

function getSignal(current: number | null, previous: number | null): Signal {
  if (current === null || previous === null || previous === 0) return "gray";
  const rate = ((current - previous) / previous) * 100;
  if (rate <= -10) return "red";
  if (rate <= -5) return "yellow";
  return "green";
}

function getDiffLabel(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return "업로드 필요";
  const rate = ((current - previous) / previous) * 100;
  const sign = rate > 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}

function getWeekClass(week: StoreRow["week"]) {
  if (week === "1주차") return "week-badge week-1";
  if (week === "2주차") return "week-badge week-2";
  if (week === "3주차") return "week-badge week-3";
  if (week === "4주차") return "week-badge week-4";
  return "week-badge week-new";
}

function MiniBars({ values, labels }: { values: number[]; labels?: string[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mini-bars" aria-label="최근 4주 유입량">
      {values.map((value, index) => {
        const height = value === 0 ? 8 : Math.max(16, Math.round((value / max) * 46));
        return (
          <div className="mini-bar-wrap" key={`${value}-${index}`}>
            <div className="mini-bar" style={{ height }} />
            <span>{labels?.[index] ?? `W${3 - index}`}</span>
          </div>
        );
      })}
    </div>
  );
}

function BarSet({ values, labels, tone = "blue" }: { values: number[]; labels: string[]; tone?: "blue" | "green" | "pink" }) {
  const max = Math.max(...values, 1);
  return (
    <div className="wide-bars">
      {values.map((value, index) => (
        <div className="wide-bar-item" key={`${labels[index]}-${value}`}>
          <span>{labels[index]}</span>
          <div className="wide-bar-track">
            <div className={`wide-bar-fill ${tone}`} style={{ width: `${Math.max(6, (value / max) * 100)}%` }} />
          </div>
          <strong>{value.toLocaleString("ko-KR")}</strong>
        </div>
      ))}
    </div>
  );
}

function downloadKeywordCsv(filename: string, keywords: string[]) {
  const body = keywords.map((keyword) => `"${keyword.replaceAll('"', '""')}"`).join("\n");
  const blob = new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadKeywordColumnCsv(filename: string, keywords: string[], chunkSize: number) {
  const columns = Array.from({ length: Math.ceil(keywords.length / chunkSize) }, (_, index) =>
    keywords.slice(index * chunkSize, (index + 1) * chunkSize),
  );
  const rows = Array.from({ length: chunkSize }, (_, rowIndex) =>
    columns
      .map((column) => {
        const keyword = column[rowIndex] ?? "";
        return `"${keyword.replaceAll('"', '""')}"`;
      })
      .join(","),
  );
  const blob = new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseKeywordLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function normalizeKeyword(keyword: string, removeSpaces: boolean) {
  const normalized = keyword.replace(/\s+/g, " ").trim();
  return removeSpaces ? normalized.replace(/\s/g, "") : normalized;
}

function buildKeywordCombinations(groups: Record<number, string[]>, rules: string[], removeSpaces: boolean) {
  const results: string[] = [];

  rules.forEach((rule) => {
    const indexes = rule.split("+").map((index) => Number(index));
    const combine = (depth: number, parts: string[]) => {
      if (depth === indexes.length) {
        results.push(normalizeKeyword(parts.join(""), removeSpaces));
        return;
      }
      const groupKeywords = groups[indexes[depth]] ?? [];
      groupKeywords.forEach((keyword) => combine(depth + 1, [...parts, keyword]));
    };
    combine(0, []);
  });

  return results.filter(Boolean);
}

function uniqueKeywords(keywords: string[]) {
  return Array.from(new Set(keywords));
}

function makeKeywordAnalysisRows(keywords: string[]): KeywordAnalysisRow[] {
  return keywords.slice(0, 300).map((keyword, index) => {
    const seed = Array.from(keyword).reduce((sum, char) => sum + char.charCodeAt(0), 0) + index * 17;
    const volume = 40 + (seed % 520);
    const pageCount = 1 + (seed % 5);
    const estimatedStores = pageCount * 50 - 1;
    const result = volume >= 180 && pageCount <= 2 ? "꿀키워드" : volume < 80 ? "저검색" : "보류";
    return { keyword, volume, pageCount, estimatedStores, result, source: "estimate" };
  });
}

function getUploadWeekRange(dateText: string) {
  const date = dateText ? new Date(`${dateText}T00:00:00`) : new Date();
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = (value: Date) => value.toISOString().slice(0, 10);
  return { weekStart: format(monday), weekEnd: format(sunday) };
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if ((char === "," || char === "\t") && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^\uFEFF/, "").replace(/^"|"$/g, "").trim());
}

function toCsvNumber(value: unknown) {
  const normalized = String(value ?? "").replace(/[^\d.-]/g, "");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isKnownChannelLabel(label: string) {
  return /(네이버지도|네이버검색|플레이스광고|지역소상공인|블로그|웹사이트|인스타그램|MY플레이스|카페|채널|검색|지도)/.test(label);
}

function parseLooseCsvRows(csvText: string) {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const sectionRows = (sectionTitle: string) => {
    const start = lines.findIndex((line) => line.trim() === sectionTitle);
    if (start < 0) return [];
    const end = lines.findIndex((line, index) => index > start && /^\[.+\]$/.test(line.trim()));
    return lines.slice(start + 1, end < 0 ? undefined : end).filter(Boolean);
  };
  const toCells = splitCsvLine;
  const metricSummary = sectionRows("[1. 리포트 요약 지표]")
    .map(toCells)
    .reduce<Record<string, number>>((summary, cells) => {
      const key = cells[0] ?? "";
      const current = toCsvNumber(cells[2] ?? cells[1]);
      if (key && current) {
        if (/플레이스|유입|방문/.test(key)) summary.placeInflow = current;
        else if (/예약|주문/.test(key)) summary.reservationOrder = current;
        else if (/스마트|전화|통화/.test(key)) summary.smartCall = current;
        else if (/리뷰/.test(key)) summary.reviewRegister = current;
        summary[key] = current;
      }
      return summary;
    }, {});
  const keywordRows = sectionRows("[2. 유입 키워드]")
    .map(toCells)
    .filter((cells) => cells[0] && toCsvNumber(cells[1]) > 0)
    .map((cells) => [cells[0], toCsvNumber(cells[1]), 0, cells[2] ?? ""]);
  const channelRows = sectionRows("[3. 유입 채널]")
    .map(toCells)
    .filter((cells) => cells[0] && toCsvNumber(cells[1]) > 0)
    .map((cells) => [cells[0], toCsvNumber(cells[1]), 0, ""]);

  if (keywordRows.length || channelRows.length) {
    return { summary: metricSummary, keywordRows, channelRows };
  }

  const rows = lines
    .map((line) => splitCsvLine(line).filter(Boolean))
    .filter((cells) => cells.length >= 2);

  const metricRows = rows
    .map((cells) => {
      const label = cells.find((cell) => /[가-힣A-Za-z]/.test(cell)) ?? "";
      const numeric = cells.map(toCsvNumber).find((value) => value > 0);
      return label && numeric ? [label, numeric, 0, ""] : null;
    })
    .filter((row): row is (string | number)[] => Boolean(row));

  const guessedChannelRows = metricRows.filter((row) => isKnownChannelLabel(String(row[0]))).slice(0, 40);
  const guessedKeywordRows = metricRows.filter((row) => !isKnownChannelLabel(String(row[0]))).slice(0, 200);

  return {
    summary: metricSummary,
    keywordRows: guessedKeywordRows,
    channelRows: guessedChannelRows,
  };
}

type SalesChartGranularity = "day" | "week" | "month";
type SalesChartPoint = { key: string; label: string; netSales: number; netPaymentCount: number };

function salesWeekStart(dateText: string) {
  const date = new Date(`${dateText}T00:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return date.toISOString().slice(0, 10);
}

function salesSeries(rows: ServerCardData["daily"], granularity: SalesChartGranularity): SalesChartPoint[] {
  const series = new Map<string, SalesChartPoint>();
  rows.forEach((row) => {
    const key = granularity === "day"
      ? row.transaction_date
      : granularity === "week"
        ? salesWeekStart(row.transaction_date)
        : row.transaction_date.slice(0, 7);
    const current = series.get(key) ?? {
      key,
      label: granularity === "day" ? key.slice(5) : granularity === "week" ? `${key.slice(5)} 주` : key.replace("-", "."),
      netSales: 0,
      netPaymentCount: 0,
    };
    current.netSales += Number(row.net_sales ?? 0);
    current.netPaymentCount += Number(row.net_payment_count ?? 0);
    series.set(key, current);
  });
  return [...series.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function SalesComboChart({ points }: { points: SalesChartPoint[] }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const maxSales = Math.max(...points.map((row) => Number(row.netSales)), 1);
  const maxCount = Math.max(...points.map((row) => Number(row.netPaymentCount)), 1);

  if (!points.length) return <p className="plain-text">선택한 기간에 업로드된 매출 데이터가 없습니다.</p>;

  const hovered = points.find((point) => point.key === hoveredKey) ?? null;

  return (
    <div className="combo-chart">
      {hovered && (
        <div className="combo-tooltip" role="status">
          <strong>{hovered.label}</strong>
          <span>매출 {formatNumber(hovered.netSales)}원</span>
          <span>결제 {formatNumber(hovered.netPaymentCount)}건</span>
        </div>
      )}
      <div className="combo-chart-grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(points.length, 31))}, minmax(18px, 1fr))` }}>
        {points.map((row) => (
          <div className="combo-day" key={row.key} onMouseEnter={() => setHoveredKey(row.key)} onMouseLeave={() => setHoveredKey(null)} tabIndex={0} onFocus={() => setHoveredKey(row.key)} onBlur={() => setHoveredKey(null)}>
            <i style={{ height: `${Math.max(4, (Number(row.netSales) / maxSales) * 100)}%` }} />
            <b style={{ bottom: `${Math.max(8, (Number(row.netPaymentCount) / maxCount) * 88)}px` }} />
            <span>{row.label}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span><i className="legend-line" /> 결제건수</span>
        <span><i className="legend-bar" /> 총 매출</span>
      </div>
    </div>
  );
}

function StoreContextBar() {
  const { stores, selectedStoreId, selectedStore, selectStore, loading } = useStoreRegistry();
  return (
    <div className="store-context">
      <select disabled={loading || !stores.length} value={selectedStoreId} onChange={(event) => selectStore(event.target.value)}>
        {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
      </select>
      <strong>{selectedStore?.name ?? (loading ? "매장 조회 중" : "등록 매장 없음")}</strong>
      <span>MID {selectedStore?.naverMid ?? "미등록"}</span>
      <span>담당자 {selectedStore?.managerName ?? "미배정"}</span>
      <span>관리 {selectedStore?.contractPeriodWeeks ?? 4}주</span>
    </div>
  );
}

function ChartSummary({
  period,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
}: {
  period: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}) {
  return (
    <div className="chart-summary-grid">
      <div><span>조회 기간</span><strong>{period}</strong></div>
      <div><span>{primaryLabel}</span><strong>{primaryValue}</strong></div>
      <div><span>{secondaryLabel}</span><strong>{secondaryValue}</strong></div>
    </div>
  );
}

function SignalButton({
  label,
  value,
  previous,
  suffix,
  onClick,
}: {
  label: string;
  value: number | null;
  previous: number | null;
  suffix?: string;
  onClick: () => void;
}) {
  const signal = getSignal(value, previous);
  return (
    <button className="signal-button" onClick={onClick} type="button">
      <span className="signal-label">
        <i className={`dot ${signal}`} />
        {label}
      </span>
      <strong>{formatNumber(value, suffix)}</strong>
      <em>전주 대비 {getDiffLabel(value, previous)}</em>
    </button>
  );
}

function TaskWeeks({ values, onClick }: { values: [number, number, number, number]; onClick: () => void }) {
  return (
    <button className="task-weeks as-button" onClick={onClick} type="button">
      {values.map((value, index) => (
        <div className="task-week" key={`${value}-${index}`}>
          <span>{index + 1}주</span>
          <div className="task-track">
            <div className={value < 50 ? "task-fill danger" : "task-fill"} style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </button>
  );
}

function Sidebar({ activeView, setView }: { activeView: ViewId; setView: (view: ViewId) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">장사</div>
        <strong>ERP</strong>
      </div>
      <nav className="clean-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`clean-nav-link ${activeView === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="eyebrow">{description}</p>
      </div>
      {actions}
    </div>
  );
}

type AdminRoutineItem = {
  id: string;
  task: string;
  memo: string;
  checked: boolean;
};

const makeRoutine = (day: string, index: number, task: string, memo: string): AdminRoutineItem => ({
  id: `${day}-${index}-${task}`,
  task,
  memo,
  checked: false,
});

function AdminDailyPage({ rows = stores }: { rows?: StoreRow[] }) {
  const todayDay = ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState(todayDay === "토" || todayDay === "일" ? "월" : todayDay);
  const [editingRoutineId, setEditingRoutineId] = useState("");
  const [dayRoutines, setDayRoutines] = useState<Record<string, AdminRoutineItem[]>>({
    월: [
      makeRoutine("월", 1, "금일 업무 단톡 공유", "진행 사항 안내 및 주간 보고서 작성 사항 확인"),
      makeRoutine("월", 2, "재계약 딜레이 확인", "ERP 확인 후 특이사항 사수에게 요청"),
      makeRoutine("월", 3, "재계약 갱신 여부 체크", "전 주 재계약 완료 후 업무 최신화 사항 확인"),
      makeRoutine("월", 4, "주말 문의사항 미답변 체크", "미답변 사수 소통 여부 확인"),
      makeRoutine("월", 5, "네이버 공지사항 확인", "검색광고 포함 변동 확인"),
      makeRoutine("월", 6, "업체 특이사항 확인", "17시 캠페인 확인"),
      makeRoutine("월", 7, "각 업체별 긴급 요청 사항처리", "당일 우선 처리"),
    ],
    화: [
      makeRoutine("화", 1, "금일 업무 단톡 공유", "진행 사항 안내"),
      makeRoutine("화", 2, "각 사수 계획관리 체크", "출근하자마자 확인"),
      makeRoutine("화", 3, "리뷰노트 체험단 선정 여부 확인", "출근하자마자 확인"),
      makeRoutine("화", 4, "순위체크", "15시에 담당자 직접 확인"),
      makeRoutine("화", 5, "각 업체별 긴급 요청 사항처리", "당일 우선 처리"),
    ],
    수: [
      makeRoutine("수", 1, "금일 업무 단톡 공유", "진행 사항 안내"),
      makeRoutine("수", 2, "작일 문의사항 미답변 체크", "1시간마다 점검"),
      makeRoutine("수", 3, "영업자 신규 단톡방 메이드 진행", "입금/정보안내문/담당자 배치"),
      makeRoutine("수", 4, "전 주 재계약 딜레이 위기 업체 최종소통", "미비 업체 최종 투입"),
      makeRoutine("수", 5, "업체 특이사항 확인", "캠페인 확인"),
    ],
    목: [
      makeRoutine("목", 1, "금일 업무 단톡 공유", "재계약 최종 독촉 요청"),
      makeRoutine("목", 2, "부사수 미비사항 체크", "각 담당자 보고 받기"),
      makeRoutine("목", 3, "재계약 업체 현황 파악", "입금 확인 진행 및 사수 확인"),
      makeRoutine("목", 4, "순위체크", "15시에 담당자 직접 확인"),
    ],
    금: [
      makeRoutine("금", 1, "금일 업무 단톡 공유", "재계약 최종 독촉 요청"),
      makeRoutine("금", 2, "금주 재계약 업체 입금 딜레이 체크", "금액 메이드 지시"),
      makeRoutine("금", 3, "재계약 갱신", "완료 업체 정리"),
      makeRoutine("금", 4, "재계약 딜레이 여부 확인", "사유 확인 및 표시 요청"),
      makeRoutine("금", 5, "검색광고 비용 충전 안내", "각 사수 검색광고 비용 확인 요청"),
    ],
  });

  const updateRoutine = (id: string, patch: Partial<AdminRoutineItem>) => {
    setDayRoutines((routines) => ({
      ...routines,
      [selectedDay]: routines[selectedDay].map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addRoutine = () => {
    setDayRoutines((routines) => ({
      ...routines,
      [selectedDay]: [
        ...routines[selectedDay],
        { id: `${selectedDay}-${Date.now()}`, task: "새 루틴 업무", memo: "참고사항을 입력하세요", checked: false },
      ],
    }));
  };

  const deleteRoutine = (id: string) => {
    setDayRoutines((routines) => ({
      ...routines,
      [selectedDay]: routines[selectedDay].filter((item) => item.id !== id),
    }));
  };

  const doneCount = dayRoutines[selectedDay].filter((item) => item.checked).length;

  return (
    <>
      <PageHeader title="관리자 일일업무" description="요일별 루틴 업무와 매장 관리 상태, 매니저 업무 체크를 모니터링합니다." />
      <div className="admin-day-tabs">
        {Object.keys(dayRoutines).map((day) => (
          <button className={selectedDay === day ? "active" : ""} key={day} onClick={() => setSelectedDay(day)} type="button">{day}</button>
        ))}
      </div>
      <section className="admin-daily-grid">
        <div className="panel">
          <div className="section-headline">
            <h2>{selectedDay}요일 루틴 체크리스트</h2>
            <div className="admin-row-actions">
              <strong>{doneCount}/{dayRoutines[selectedDay].length}</strong>
              <button className="btn btn-primary" onClick={addRoutine} type="button">업무 추가</button>
            </div>
          </div>
          <div className="admin-check-table">
            <div className="admin-check-head">
              <span>업무내용</span>
              <span>참고사항</span>
              <span>체크</span>
            </div>
            {dayRoutines[selectedDay].map((item) => {
              const isEditing = editingRoutineId === item.id;
              return (
                <div className="admin-check-row" key={item.id}>
                  {isEditing ? (
                    <input
                      autoFocus
                      className="admin-routine-input"
                      onBlur={() => setEditingRoutineId("")}
                      onChange={(event) => updateRoutine(item.id, { task: event.target.value })}
                      value={item.task}
                    />
                  ) : (
                    <strong onDoubleClick={() => setEditingRoutineId(item.id)}>{item.task}</strong>
                  )}
                  {isEditing ? (
                    <input
                      className="admin-routine-input"
                      onChange={(event) => updateRoutine(item.id, { memo: event.target.value })}
                      value={item.memo}
                    />
                  ) : (
                    <span onDoubleClick={() => setEditingRoutineId(item.id)}>{item.memo}</span>
                  )}
                  <div className="admin-row-actions">
                    <input checked={item.checked} onChange={(event) => updateRoutine(item.id, { checked: event.target.checked })} type="checkbox" />
                    <button className="btn btn-light" onClick={() => deleteRoutine(item.id)} type="button">삭제</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <h2>매장 관리상태 요약</h2>
          <div className="admin-store-status-list">
            {rows.map((store) => (
              <div className="admin-store-status" key={store.id}>
                <strong>{store.name}</strong>
                <span>{store.manager}</span>
                <em className={store.memo.includes("급감") || store.memo.includes("연결") ? "risk" : "stable"}>{store.memo}</em>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

type DashboardSort = "week" | "store" | "manager" | "bizMoney" | "inflow" | "sales";
type SortDirection = "asc" | "desc";

function metricRate(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function Dashboard({
  setView,
  rows = stores,
  onImportStores,
  onCreateStore,
  onBulkCreateStores,
  importStatus,
}: {
  setView: (view: ViewId) => void;
  rows?: StoreRow[];
  onImportStores?: (file: File | undefined) => void;
  onCreateStore?: () => void;
  onBulkCreateStores?: (names: string[]) => Promise<{ created: number; skipped: number; failed: number }>;
  importStatus?: string;
}) {
  const { selectStore } = useStoreRegistry();
  const [selectedDate, setSelectedDate] = useState("2026-07-12");
  const [appliedDate, setAppliedDate] = useState("2026-07-12");
  const [selectedGranularity, setSelectedGranularity] = useState<DashboardGranularity>("week");
  const [appliedGranularity, setAppliedGranularity] = useState<DashboardGranularity>("week");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<DashboardSort>("week");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [placeDashboardStores, setPlaceDashboardStores] = useState<DashboardPlaceStore[]>([]);
  const [dashboardBucketLabels, setDashboardBucketLabels] = useState<string[]>(["3주 전", "2주 전", "1주 전", "기준주"]);
  const [bulkStoreOpen, setBulkStoreOpen] = useState(false);
  const [bulkStoreNames, setBulkStoreNames] = useState("");
  const [bulkStoreStatus, setBulkStoreStatus] = useState("");
  const [bulkStoreSaving, setBulkStoreSaving] = useState(false);

  const submitBulkStoreNames = async () => {
    const names = bulkStoreNames.split(/\r?\n|,/).map((name) => name.trim()).filter(Boolean);
    if (!names.length || !onBulkCreateStores) {
      setBulkStoreStatus("업체명을 한 줄에 하나씩 입력하세요.");
      return;
    }
    setBulkStoreSaving(true);
    setBulkStoreStatus("");
    try {
      const result = await onBulkCreateStores(names);
      setBulkStoreStatus(`${result.created}개 등록 · ${result.skipped}개 중복 제외 · ${result.failed}개 실패`);
      if (!result.failed) setBulkStoreNames("");
    } catch (error) {
      setBulkStoreStatus(error instanceof Error ? error.message : "업체 일괄 등록에 실패했습니다.");
    } finally {
      setBulkStoreSaving(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/erp/dashboard?date=${encodeURIComponent(appliedDate)}&granularity=${appliedGranularity}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("dashboard query failed")))
      .then((payload: { stores?: DashboardPlaceStore[]; buckets?: Array<{ label: string }> }) => {
        if (active) {
          setPlaceDashboardStores(payload.stores ?? []);
          setDashboardBucketLabels(payload.buckets?.map((bucket) => bucket.label) ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setPlaceDashboardStores([]);
          setDashboardBucketLabels([]);
        }
      });
    return () => {
      active = false;
    };
  }, [appliedDate, appliedGranularity]);

  const dashboardSourceRows = useMemo(() => {
    if (!placeDashboardStores.length) return rows;
    const baseRows = new Map(rows.map((store) => [store.name, store]));
    return placeDashboardStores.map((placeStore) => {
      const base = baseRows.get(placeStore.name);
      return {
        id: placeStore.id,
        week: base?.week ?? "신규",
        name: placeStore.name,
        manager: placeStore.managerName || base?.manager || "미배정",
        bizMoney: base?.bizMoney ?? null,
        naverInflow: placeStore.currentInflow,
        sales: placeStore.currentSales,
        previous: {
          bizMoney: base?.previous.bizMoney ?? null,
          naverInflow: placeStore.previousInflow,
          sales: placeStore.previousSales,
        },
        weeklyInflow: placeStore.inflowBuckets.map((value) => value ?? 0),
        weeklyTasks: base?.weeklyTasks ?? [0, 0, 0, 0],
        memo: base?.memo ?? "데이터 연결 대기",
      } satisfies StoreRow;
    });
  }, [placeDashboardStores, rows]);

  const dashboardRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = dashboardSourceRows.filter((store) => {
      const matchesSearch = !normalizedSearch || `${store.name} ${store.manager}`.toLowerCase().includes(normalizedSearch);
      return matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      let result = 0;
      if (sortMode === "week") result = a.week.localeCompare(b.week, "ko-KR");
      if (sortMode === "store") result = a.name.localeCompare(b.name, "ko-KR");
      if (sortMode === "manager") result = a.manager.localeCompare(b.manager, "ko-KR");
      if (sortMode === "bizMoney") result = (a.bizMoney ?? -1) - (b.bizMoney ?? -1);
      if (sortMode === "inflow") result = (metricRate(a.naverInflow, a.previous.naverInflow) ?? -999) - (metricRate(b.naverInflow, b.previous.naverInflow) ?? -999);
      if (sortMode === "sales") result = (metricRate(a.sales, a.previous.sales) ?? -999) - (metricRate(b.sales, b.previous.sales) ?? -999);
      return sortDirection === "asc" ? result : -result;
    });
  }, [dashboardSourceRows, searchTerm, sortMode, sortDirection]);

  const toggleSort = (mode: DashboardSort) => {
    if (sortMode === mode) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortMode(mode);
    setSortDirection("asc");
  };

  const openStoreView = (storeId: string, view: ViewId) => {
    selectStore(storeId);
    setView(view);
  };

  const sortArrow = (mode: DashboardSort) => (
    sortMode === mode ? <span className="sort-arrow" aria-hidden="true">{sortDirection === "asc" ? "▲" : "▼"}</span> : null
  );

  return (
    <>
      <PageHeader
        title="매장 운영 대시보드"
        description="비즈머니·네이버 유입·매출 신호등과 4주 유입량, 주간 업무 현황을 빠르게 봅니다."
        actions={
          <div className="filter-row top-actions">
            <label className="btn btn-light file-action-button">
              <Download size={16} />
              엑셀 업체등록
              <input
                accept=".xlsx,.xls"
                onChange={(event) => onImportStores?.(event.target.files?.[0])}
                type="file"
              />
            </label>
            <a className="btn btn-light" href="/admin/imports/jangsadoctor">
              과거 매출 이관
            </a>
            <button className="btn btn-light" onClick={onCreateStore} type="button">
              <Building2 size={16} />
              업체 추가
            </button>
            <button className="btn btn-light" onClick={() => setBulkStoreOpen((value) => !value)} type="button">
              <Building2 size={16} />
              업체 일괄 추가
            </button>
            <button className="btn btn-light" onClick={() => setView("questionnaire")} type="button">
              <LinkIcon size={16} />
              정보안내문
            </button>
          </div>
        }
      />

      {bulkStoreOpen && (
        <section className="panel">
          <div className="section-headline">
            <div>
              <h2>업체명 일괄 등록</h2>
              <p className="plain-text">한 줄에 하나씩 붙여넣으세요. 매출·네이버·여신금융 데이터는 나중에 매장별로 올릴 수 있습니다.</p>
            </div>
            <button className="btn btn-light" onClick={() => setBulkStoreOpen(false)} type="button">닫기</button>
          </div>
          <textarea className="store-memo" onChange={(event) => setBulkStoreNames(event.target.value)} placeholder={"예시\n맛똥삼 복대점\n온돌오리구이 하남미사본점"} value={bulkStoreNames} />
          <div className="store-link-actions">
            <button className="btn btn-primary" disabled={bulkStoreSaving} onClick={submitBulkStoreNames} type="button">{bulkStoreSaving ? "등록 중" : "업체명 일괄 등록"}</button>
            {bulkStoreStatus && <span className="plain-text">{bulkStoreStatus}</span>}
          </div>
        </section>
      )}

      <div className="filter-row toolbar">
        <div className="field">
          <label htmlFor="date">기준일</label>
          <input className="date-input" id="date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
        <div className="small-tabs" aria-label="대시보드 집계 단위">
          {(["day", "week", "month"] as DashboardGranularity[]).map((granularity) => (
            <button className={selectedGranularity === granularity ? "active" : ""} key={granularity} onClick={() => setSelectedGranularity(granularity)} type="button">
              {granularity === "day" ? "일" : granularity === "week" ? "주" : "월"}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => { setAppliedDate(selectedDate); setAppliedGranularity(selectedGranularity); }} type="button">
          적용
        </button>
        <span className="applied-date">적용 기준일 {appliedDate} · {appliedGranularity === "day" ? "일" : appliedGranularity === "week" ? "주" : "월"} 단위</span>
        {importStatus && <span className="applied-date">{importStatus}</span>}
        <div className="legend">
          <span>
            <i className="dot green" /> 상승/유지
          </span>
          <span>
            <i className="dot yellow" /> 5% 이상 하락
          </span>
          <span>
            <i className="dot red" /> 10% 이상 하락
          </span>
          <span>
            <i className="dot gray" /> 데이터 없음
          </span>
        </div>
        <div className="field search-field">
          <Search size={16} />
          <input className="search-input" placeholder="업체명 또는 담당자 검색" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
      </div>

      <section className="table-wrap" aria-label="매장 운영 현황">
        <table className="ops-table prototype-table">
          <thead>
            <tr>
              <th><button className="table-sort" onClick={() => toggleSort("week")} type="button">주차 {sortArrow("week")}</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("store")} type="button">업체명 {sortArrow("store")}</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("manager")} type="button">담당자 {sortArrow("manager")}</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("bizMoney")} type="button">비즈머니 {sortArrow("bizMoney")}</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("inflow")} type="button">네이버 유입 / 최근 4{appliedGranularity === "day" ? "일" : appliedGranularity === "week" ? "주" : "개월"} {sortArrow("inflow")}</button></th>
              <th><button className="table-sort" onClick={() => toggleSort("sales")} type="button">매출 {sortArrow("sales")}</button></th>
              <th>업무현황</th>
              <th>바로가기</th>
            </tr>
          </thead>
          <tbody>
            {dashboardRows.map((store) => (
              <tr key={store.id}>
                <td>
                  <span className={getWeekClass(store.week)}>{store.week}</span>
                </td>
                <td>
                  <button className="text-link" onClick={() => openStoreView(store.id, "store")} type="button">
                    {store.name}
                  </button>
                </td>
                <td className="manager">{store.manager}</td>
                <td>
                  <SignalButton
                    label="잔액"
                    previous={store.previous.bizMoney}
                    suffix="원"
                    value={store.bizMoney}
                    onClick={() => openStoreView(store.id, "ad")}
                  />
                </td>
                <td>
                  <div className="inflow-combo">
                    <SignalButton
                      label="유입"
                      previous={store.previous.naverInflow}
                      value={store.naverInflow}
                      onClick={() => openStoreView(store.id, "inflow")}
                    />
                    <MiniBars labels={dashboardBucketLabels} values={store.weeklyInflow} />
                  </div>
                </td>
                <td>
                  <SignalButton
                    label="매출"
                    previous={store.previous.sales}
                    suffix="원"
                    value={store.sales}
                    onClick={() => openStoreView(store.id, "sales")}
                  />
                </td>
                <td>
                  <TaskWeeks values={store.weeklyTasks} onClick={() => openStoreView(store.id, "tasks")} />
                </td>
                <td>
                  <div className="link-stack">
                    <button className="mini-link" onClick={() => openStoreView(store.id, "owner")} type="button">
                      사장님 보고서
                    </button>
                    <button className="mini-link" onClick={() => openStoreView(store.id, "store")} type="button">
                      매장 정보
                    </button>
                    <button className="mini-link" onClick={() => openStoreView(store.id, "questionnaire")} type="button">
                      정보안내문
                    </button>
                    <button className="mini-link strong-link" onClick={() => openStoreView(store.id, "weeklyFlow")} type="button">
                      주간 흐름
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function AdPage() {
  const { selectedStoreId, selectedStore } = useStoreRegistry();
  const [data, setData] = useState<{
    config: { enabled: boolean; daily_sync_times: string[]; timezone: string };
    latestSnapshot: { captured_at: string; biz_money_balance: number | null; balance_status: string; campaign_count: number; active_campaign_count: number } | null;
    totals: { impressions: number; clicks: number; spend: number; ctr: number | null; averageCpc: number | null; averageRank: number | null; conversions: number };
    campaigns: { campaign_id: string; campaign_name: string | null; campaign_status: string | null; daily_budget: number | null; impressions: number; clicks: number; ad_spend: number; average_cpc: number | null; average_rank: number | null }[];
    runs: { status: string; requested_for_date: string | null; finished_at: string | null; error_message: string | null }[];
  } | null>(null);
  const [status, setStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [dailyTimes, setDailyTimes] = useState("06:10");

  const load = async () => {
    if (!selectedStoreId) return;
    setStatus("검색광고 데이터를 불러오는 중입니다.");
    try {
      const response = await fetch(`/api/erp/searchad?storeId=${encodeURIComponent(selectedStoreId)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "검색광고 데이터를 불러오지 못했습니다.");
      setData(payload);
      setDailyTimes((payload.config?.daily_sync_times ?? ["06:10:00"]).map((time: string) => time.slice(0, 5)).join(", "));
      setStatus(payload.campaigns?.length ? "저장된 읽기 전용 성과 데이터입니다." : "Customer ID 연결 후 수동 갱신 또는 다음 자동 수집에서 데이터가 표시됩니다.");
    } catch (error) {
      setData(null);
      setStatus(error instanceof Error ? error.message : "검색광고 데이터를 불러오지 못했습니다.");
    }
  };

  useEffect(() => { void load(); }, [selectedStoreId]);

  const saveConfig = async () => {
    if (!selectedStoreId) return;
    const times = dailyTimes.split(",").map((time) => time.trim()).filter(Boolean);
    setSavingConfig(true);
    try {
      const response = await fetch("/api/erp/searchad/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: selectedStoreId, enabled: true, dailySyncTimes: times }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "자동 수집 설정 저장에 실패했습니다.");
      setStatus(`자동 수집 시간 저장: ${(payload.config.daily_sync_times ?? []).map((time: string) => time.slice(0, 5)).join(", ")} (한국 시간)`);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "자동 수집 설정 저장에 실패했습니다.");
    } finally {
      setSavingConfig(false);
    }
  };

  const syncNow = async () => {
    if (!selectedStoreId) return;
    setSyncing(true);
    try {
      const response = await fetch("/api/erp/searchad/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: selectedStoreId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? payload.error ?? "검색광고 수집에 실패했습니다.");
      setStatus(payload.message);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "검색광고 수집에 실패했습니다.");
    } finally {
      setSyncing(false);
    }
  };

  const total = data?.totals;
  return (
    <>
      <PageHeader title="네이버 광고" description="읽기 전용으로 캠페인 성과를 저장합니다. 광고 생성·입찰 변경은 이 단계에서 하지 않습니다." />
      <StoreContextBar />
      <section className="panel">
        <div className="section-headline">
          <div>
            <h2>{selectedStore?.name ?? "매장 선택 필요"} · 읽기 전용 수집</h2>
            <p className="plain-text">기본은 하루 1회입니다. 향후 최대 3개 시간까지 미리 설정할 수 있지만, 현재 Vercel 자동 수집은 06:10 한 번만 실행합니다.</p>
          </div>
          <button className="btn btn-primary" disabled={!selectedStoreId || syncing} onClick={syncNow} type="button">{syncing ? "수집 중" : "지금 읽기 전용 갱신"}</button>
        </div>
        <div className="filter-row">
          <label className="store-field"><span>자동 수집 시간 (한국시간, 쉼표로 최대 3개)</span><input value={dailyTimes} onChange={(event) => setDailyTimes(event.target.value)} placeholder="06:10" /></label>
          <button className="btn btn-light" disabled={!selectedStoreId || savingConfig} onClick={saveConfig} type="button">{savingConfig ? "저장 중" : "자동 수집 설정 저장"}</button>
        </div>
        {status && <p className="plain-text">{status}</p>}
      </section>
      <div className="detail-grid">
        <MetricCard label="비즈머니 잔액" value={data?.latestSnapshot?.balance_status === "available" ? `${Math.round(data.latestSnapshot.biz_money_balance ?? 0).toLocaleString("ko-KR")}원` : "API 검증 필요"} tone={data?.latestSnapshot?.balance_status === "available" ? "green" : "yellow"} />
        <MetricCard label="노출수" value={total ? total.impressions.toLocaleString("ko-KR") : "데이터 없음"} />
        <MetricCard label="클릭수" value={total ? total.clicks.toLocaleString("ko-KR") : "데이터 없음"} />
        <MetricCard label="광고비 / 평균 CPC" value={total ? `${Math.round(total.spend).toLocaleString("ko-KR")}원 / ${total.averageCpc ? `${Math.round(total.averageCpc).toLocaleString("ko-KR")}원` : "미지원"}` : "데이터 없음"} />
        <MetricCard label="평균 순위" value={total?.averageRank ? total.averageRank.toFixed(2) : "미지원"} />
        <MetricCard label="캠페인" value={data?.latestSnapshot ? `${data.latestSnapshot.active_campaign_count}/${data.latestSnapshot.campaign_count}` : "데이터 없음"} />
      </div>
      <section className="panel">
        <h2>캠페인별 일간 성과</h2>
        <div className="list-table">
          {(data?.campaigns ?? []).map((campaign) => (
            <div className="list-row" key={`${campaign.campaign_id}-${campaign.campaign_name}`}>
              <strong>{campaign.campaign_name ?? campaign.campaign_id}</strong>
              <span className={`chip ${campaign.campaign_status === "OFF" ? "orange" : "green"}`}>{campaign.campaign_status === "OFF" ? "광고 OFF" : "광고 ON"}</span>
              <span>노출 {campaign.impressions.toLocaleString("ko-KR")} · 클릭 {campaign.clicks.toLocaleString("ko-KR")}</span>
              <span>광고비 {Math.round(campaign.ad_spend).toLocaleString("ko-KR")}원 · CPC {campaign.average_cpc ? `${Math.round(campaign.average_cpc).toLocaleString("ko-KR")}원` : "미지원"}</span>
              <span>순위 {campaign.average_rank?.toFixed(2) ?? "미지원"} · 일예산 {campaign.daily_budget ? `${Math.round(campaign.daily_budget).toLocaleString("ko-KR")}원` : "미설정"}</span>
            </div>
          ))}
          {!data?.campaigns?.length && <p className="plain-text">아직 저장된 검색광고 성과가 없습니다. 매장 정보에서 Customer ID를 저장한 뒤 ‘지금 읽기 전용 갱신’을 누르세요.</p>}
        </div>
      </section>
    </>
  );
}

function InflowPage() {
  const today = new Date().toISOString().slice(0, 10);
  const {
    stores: erpStores,
    selectedStoreId: selectedInflowStoreId,
    selectedStore: selectedInflowStore,
    selectStore: setSelectedInflowStoreId,
  } = useStoreRegistry();
  const [inflowMode, setInflowMode] = useState<"range" | "weekly" | "monthly">("range");
  const [rangeStart, setRangeStart] = useState("2026-03-01");
  const [rangeEnd, setRangeEnd] = useState(today);
  const [appliedRangeStart, setAppliedRangeStart] = useState("2026-03-01");
  const [appliedRangeEnd, setAppliedRangeEnd] = useState(today);
  const [queryVersion, setQueryVersion] = useState(0);
  const [placeCsvUploads, setPlaceCsvUploads] = useState<ServerPlaceUpload[]>([]);
  const [placeDataStatus, setPlaceDataStatus] = useState("");
  const [goldenKeywordJobs, setGoldenKeywordJobs] = useState<GoldenKeywordJob[]>([]);
  const [activeAnalysisRows, setActiveAnalysisRows] = useState<KeywordAnalysisRow[]>([]);
  const [keywordInputs, setKeywordInputs] = useState<Record<number, string>>(() =>
    Object.fromEntries(keywordGroups.map((group, index) => [index + 1, group.sample])),
  );
  const [selectedRules, setSelectedRules] = useState<string[]>(defaultCombinationRules);
  const [removeSpaces, setRemoveSpaces] = useState(true);
  const [dedupe, setDedupe] = useState(true);
  const [generatedKeywords, setGeneratedKeywords] = useState<string[]>(() => uniqueKeywords(buildKeywordCombinations(
    Object.fromEntries(keywordGroups.map((group, index) => [index + 1, parseKeywordLines(group.sample)])),
    defaultCombinationRules,
    true,
  )));
  const [miningStatus, setMiningStatus] = useState("");

  const tagSet = generatedKeywords.slice(0, 50);
  const powerlinkSet = generatedKeywords.slice(0, 1000);
  const hasSelectedStore = Boolean(selectedInflowStoreId);
  const selectedUploads = placeCsvUploads;
  const hasPlaceData = selectedUploads.length > 0;
  const uploadedSummary = useMemo(() => selectedUploads.reduce((summary, upload) => ({
    placeInflow: summary.placeInflow + (upload.summary.placeInflow ?? 0),
    reservationOrder: summary.reservationOrder + (upload.summary.reservationOrder ?? 0),
    smartCall: summary.smartCall + (upload.summary.smartCall ?? 0),
    reviewRegister: summary.reviewRegister + (upload.summary.reviewRegister ?? 0),
  }), { placeInflow: 0, reservationOrder: 0, smartCall: 0, reviewRegister: 0 }), [selectedUploads]);
  const inflowTrend = useMemo(() => [...selectedUploads]
    .sort((left, right) => left.period_start.localeCompare(right.period_start))
    .map((upload) => ({
      label: `${upload.period_start.slice(5)}~${upload.period_end.slice(5)}`,
      value: upload.summary.placeInflow ?? 0,
    })), [selectedUploads]);
  const displayedKeywords = useMemo(() => {
    const totals = new Map<string, { current: number; previous: number }>();
    selectedUploads.forEach((upload) => upload.keywords.forEach((row) => {
      const current = totals.get(row.keyword) ?? { current: 0, previous: 0 };
      current.current += row.visit_count;
      current.previous += row.previous_count ?? 0;
      totals.set(row.keyword, current);
    }));
    return [...totals.entries()]
      .map(([keyword, value]) => [keyword, value.current, value.current - value.previous, value.previous ? Number((((value.current - value.previous) / value.previous) * 100).toFixed(1)) : 0] as (string | number)[])
      .sort((a, b) => Number(b[1]) - Number(a[1]));
  }, [selectedUploads]);
  const displayedChannels = useMemo(() => {
    const totals = new Map<string, { current: number; previous: number }>();
    selectedUploads.forEach((upload) => upload.channels.forEach((row) => {
      const current = totals.get(row.channel) ?? { current: 0, previous: 0 };
      current.current += row.visit_count;
      current.previous += row.previous_count ?? 0;
      totals.set(row.channel, current);
    }));
    return [...totals.entries()]
      .map(([channel, value]) => [channel, value.current, value.current - value.previous, value.previous ? Number((((value.current - value.previous) / value.previous) * 100).toFixed(1)) : 0] as (string | number)[])
      .sort((a, b) => Number(b[1]) - Number(a[1]));
  }, [selectedUploads]);
  const analysisRows = activeAnalysisRows;
  const storeGoldenJobs = goldenKeywordJobs.filter((job) => job.storeId === selectedInflowStoreId);

  useEffect(() => {
    if (!selectedInflowStoreId) {
      setPlaceCsvUploads([]);
      setPlaceDataStatus("");
      return;
    }
    let active = true;
    setPlaceDataStatus("데이터 조회 중");
    const params = new URLSearchParams({ storeId: selectedInflowStoreId, start: appliedRangeStart, end: appliedRangeEnd });
    fetch(`/api/erp/place-uploads?${params.toString()}`)
      .then((response) => response.ok ? response.json() : response.json().then((payload) => Promise.reject(new Error(payload.error ?? "query failed"))))
      .then((payload: { uploads?: ServerPlaceUpload[] }) => {
        if (!active) return;
        setPlaceCsvUploads(payload.uploads ?? []);
        setPlaceDataStatus(payload.uploads?.length ? `${appliedRangeStart}~${appliedRangeEnd} · ${payload.uploads.length}개 원본 데이터 조회 완료` : "선택한 기간에 데이터가 없습니다.");
      })
      .catch((error: Error) => {
        if (!active) return;
        setPlaceCsvUploads([]);
        setPlaceDataStatus(error.message);
      });
    return () => {
      active = false;
    };
  }, [selectedInflowStoreId, appliedRangeStart, appliedRangeEnd, queryVersion]);

  useEffect(() => {
    try {
      const savedJobs = window.localStorage.getItem("erp-golden-keyword-jobs");
      if (savedJobs) setGoldenKeywordJobs(JSON.parse(savedJobs) as GoldenKeywordJob[]);
    } catch {
      // 브라우저 임시 저장 실패는 화면 사용을 막지 않는다.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("erp-golden-keyword-jobs", JSON.stringify(goldenKeywordJobs));
  }, [goldenKeywordJobs]);

  const toggleRule = (rule: string) => {
    setSelectedRules((rules) => (
      rules.includes(rule) ? rules.filter((item) => item !== rule) : [...rules, rule]
    ));
  };

  const generateKeywords = () => {
    const groups = Object.fromEntries(
      Object.entries(keywordInputs).map(([groupIndex, value]) => [Number(groupIndex), parseKeywordLines(value)]),
    );
    const nextKeywords = buildKeywordCombinations(groups, selectedRules, removeSpaces);
    setGeneratedKeywords(dedupe ? uniqueKeywords(nextKeywords) : nextKeywords);
  };

  const resetKeywords = () => {
    setKeywordInputs(Object.fromEntries(keywordGroups.map((group, index) => [index + 1, group.sample])));
    setSelectedRules(defaultCombinationRules);
    setRemoveSpaces(true);
    setDedupe(true);
    setGeneratedKeywords([]);
    setActiveAnalysisRows([]);
  };

  const uploadPlaceCsv = async (file: File | undefined) => {
    if (!file || !selectedInflowStore) return;
    setPlaceDataStatus("CSV 업로드 및 분석 중");
    const form = new FormData();
    form.append("storeId", selectedInflowStore.id);
    form.append("file", file);
    try {
      const response = await fetch("/api/erp/place-uploads", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "CSV 업로드에 실패했습니다.");
      setRangeStart((current) => payload.upload?.period_start && payload.upload.period_start < current ? payload.upload.period_start : current);
      setRangeEnd((current) => payload.upload?.period_end && payload.upload.period_end > current ? payload.upload.period_end : current);
      setAppliedRangeStart((current) => payload.upload?.period_start && payload.upload.period_start < current ? payload.upload.period_start : current);
      setAppliedRangeEnd((current) => payload.upload?.period_end && payload.upload.period_end > current ? payload.upload.period_end : current);
      setPlaceDataStatus(payload.duplicate ? "이미 업로드된 동일한 주간 CSV입니다." : "CSV 저장 및 분석 완료");
      setQueryVersion((version) => version + 1);
    } catch (error) {
      setPlaceDataStatus(error instanceof Error ? error.message : "CSV 업로드에 실패했습니다.");
    }
  };

  const selectWeeklyRange = () => {
    const { weekStart, weekEnd } = getUploadWeekRange(rangeEnd);
    setInflowMode("weekly");
    setRangeStart(weekStart);
    setRangeEnd(weekEnd);
  };

  const selectMonthlyRange = () => {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(rangeEnd) ? new Date(`${rangeEnd}T00:00:00`) : new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const format = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    setInflowMode("monthly");
    setRangeStart(format(start));
    setRangeEnd(format(end));
  };

  const applyInflowRange = () => {
    if (rangeStart > rangeEnd) {
      setPlaceDataStatus("시작일은 종료일보다 앞서야 합니다.");
      return;
    }
    setAppliedRangeStart(rangeStart);
    setAppliedRangeEnd(rangeEnd);
    setQueryVersion((version) => version + 1);
  };

  const runGoldenKeywordMining = async () => {
    if (!selectedInflowStore || generatedKeywords.length === 0) return;
    setMiningStatus("지도 페이지수 확인 중");
    const targetKeywords = generatedKeywords.slice(0, 300);
    const mapCheckedRows: KeywordAnalysisRow[] = [];

    for (const keyword of targetKeywords) {
      try {
        const response = await fetch(`/api/naver-map/page-count?keyword=${encodeURIComponent(keyword)}`);
        const payload = await response.json();
        const pageCount = typeof payload.pageCount === "number" ? payload.pageCount : null;
        const mapResult: KeywordAnalysisRow["result"] = pageCount === null && payload.status === "blocked" ? "지도차단" : pageCount === null ? "지도확인실패" : "보류";
        mapCheckedRows.push({
          keyword,
          volume: 0,
          pageCount,
          estimatedStores: pageCount ? pageCount * 50 - 1 : 0,
          result: mapResult,
          source: "real",
        });
      } catch {
        mapCheckedRows.push({ keyword, volume: 0, pageCount: null, estimatedStores: 0, result: "지도확인실패", source: "real" });
      }
    }

    const lowCompetitionRows = mapCheckedRows.filter((row) => row.pageCount !== null && row.pageCount < 3);
    const allMapBlocked = mapCheckedRows.length > 0 && mapCheckedRows.every((row) => row.result === "지도차단" || row.result === "지도확인실패");
    const volumeTargets = lowCompetitionRows.length > 0 ? lowCompetitionRows : allMapBlocked ? mapCheckedRows.slice(0, 80) : [];
    setMiningStatus(
      lowCompetitionRows.length > 0
        ? `${lowCompetitionRows.length}개 저경쟁 키워드 검색량 조회 중`
        : allMapBlocked
          ? "지도 확인이 차단되어 검색광고 조회수 기준 임시 분석 중"
          : "저경쟁 키워드가 없어 검색량 조회를 건너뜁니다",
    );

    let volumeMap = new Map<string, number>();
    if (volumeTargets.length > 0) {
      try {
        const response = await fetch("/api/naver-searchad/keyword-volume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: volumeTargets.map((row) => row.keyword) }),
        });
        if (response.ok) {
          const payload = await response.json();
          volumeMap = new Map((payload.rows ?? []).map((row: { keyword: string; volume: number }) => [row.keyword, row.volume]));
        }
      } catch {
        volumeMap = new Map();
      }
    }

    const rows = mapCheckedRows
      .map((row) => {
        const volume = volumeMap.get(row.keyword) ?? row.volume;
        const result: KeywordAnalysisRow["result"] = row.result === "지도차단" ? "지도차단" : row.pageCount === null ? "지도확인실패" : row.pageCount < 3 ? "꿀키워드" : "보류";
        return { ...row, volume, result };
      })
      .sort((a, b) => (a.pageCount ?? 99) - (b.pageCount ?? 99) || b.volume - a.volume)
      .slice(0, 120);
    const job: GoldenKeywordJob = {
      id: `${selectedInflowStore.id}-gold-${Date.now()}`,
      storeId: selectedInflowStore.id,
      storeName: selectedInflowStore.name,
      createdAt: new Date().toISOString(),
      keywordCount: generatedKeywords.length,
      resultCount: rows.filter((row) => row.result === "꿀키워드").length,
      rows,
    };
    setActiveAnalysisRows(rows);
    setGoldenKeywordJobs((jobs) => [job, ...jobs]);
    setMiningStatus(
      allMapBlocked
        ? "완료: 지도 확인이 차단되어 조회수만 표시했습니다. 꿀키워드 확정은 지도 워커 연동이 필요합니다."
        : `완료: 지도 3페이지 미만 ${rows.filter((row) => row.result === "꿀키워드").length}개`,
    );
  };

  return (
    <>
      <PageHeader
        title="네이버 유입 통계 및 키워드 분석"
        description="플레이스 JSON 또는 CSV 업로드 후 기간별 유입 키워드, 유입 채널, 증감 데이터를 확인합니다."
        actions={
          <button className="btn btn-light" type="button">
            <Download size={16} />
            종합 CSV 다운로드
          </button>
        }
      />
      <div className="store-context selectable-context">
        <select value={selectedInflowStoreId} onChange={(event) => setSelectedInflowStoreId(event.target.value)}>
          <option value="">매장을 선택하세요</option>
          {erpStores.map((store) => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
        {selectedInflowStore ? (
          <>
            <span>MID {selectedInflowStore.naverMid || "미등록"}</span>
            <span>담당자 {selectedInflowStore.managerName || "미배정"}</span>
            <span>관리 {selectedInflowStore.contractPeriodWeeks ?? 4}주</span>
          </>
        ) : (
          <span>매장을 선택하면 유입 데이터가 표시됩니다.</span>
        )}
      </div>
      <div className="filter-row toolbar">
        <input className="date-input" type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
        <input className="date-input" type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
        <button className="btn btn-primary" onClick={applyInflowRange} type="button">
          조회
        </button>
        <button className={inflowMode === "weekly" ? "btn btn-primary" : "btn btn-light"} onClick={selectWeeklyRange} type="button">
          주간
        </button>
        <button className={inflowMode === "monthly" ? "btn btn-primary" : "btn btn-light"} onClick={selectMonthlyRange} type="button">
          월간
        </button>
        <span className="muted-note">CSV 주간 데이터는 월요일~일요일 기준으로 누적 후 조회합니다.</span>
      </div>
      <section className="panel csv-upload-panel">
        <div>
          <h2>네이버 플레이스 원본 데이터</h2>
          <p className="plain-text">JSON과 CSV 원본을 매장·기간별로 보관합니다. 같은 기간의 중복 원본은 합산하지 않고 최신 원본을 기준으로 표시합니다.</p>
        </div>
        <div className="csv-upload-controls">
          <label className={selectedInflowStore ? "file-upload-button" : "file-upload-button disabled"}>
            CSV 업로드
            <input
              accept=".csv,text/csv"
              disabled={!selectedInflowStore}
              onChange={(event) => uploadPlaceCsv(event.target.files?.[0])}
              type="file"
            />
          </label>
        </div>
        <div className="upload-history-list">
          {selectedUploads.slice(0, 4).map((upload) => (
            <span key={upload.id}>{upload.period_start}~{upload.period_end} · {upload.file_name}</span>
          ))}
          {selectedInflowStore && selectedUploads.length === 0 && <span>아직 업로드된 JSON 또는 CSV가 없습니다.</span>}
          {!selectedInflowStore && <span>먼저 매장을 선택하세요.</span>}
        </div>
        {placeDataStatus && <p className="plain-text">{placeDataStatus}</p>}
      </section>
      <div className="detail-grid">
        <MetricCard label="플레이스 유입" value={hasPlaceData ? formatNumber(uploadedSummary.placeInflow) : "데이터 없음"} tone={hasPlaceData ? "red" : undefined} />
        <MetricCard label="예약·주문 신청" value={hasPlaceData ? formatNumber(uploadedSummary.reservationOrder) : "데이터 없음"} />
        <MetricCard label="스마트콜 통화" value={hasPlaceData ? formatNumber(uploadedSummary.smartCall) : "데이터 없음"} tone={hasPlaceData ? "yellow" : undefined} />
        <MetricCard label="리뷰 등록" value={hasPlaceData ? formatNumber(uploadedSummary.reviewRegister) : "데이터 없음"} />
      </div>
      {hasPlaceData ? (
        <>
          <section className="panel">
            <div className="section-headline"><h2>기간별 네이버 플레이스 유입</h2></div>
            <ChartSummary
              period={`${appliedRangeStart} ~ ${appliedRangeEnd}`}
              primaryLabel="플레이스 유입"
              primaryValue={`${formatNumber(uploadedSummary.placeInflow)}회`}
              secondaryLabel="조회 원본"
              secondaryValue={`${selectedUploads.length}개`}
            />
            <BarSet labels={inflowTrend.map((row) => row.label)} values={inflowTrend.map((row) => row.value)} />
          </section>
          <section className="panel two-col">
            <ScrollableMetricList title="유입 키워드" rows={displayedKeywords} />
            <ScrollableMetricList title="유입 채널" rows={displayedChannels} />
          </section>
          <section className="panel two-col">
            <ScrollableMetricList title="기간별 증감 유입키워드" rows={displayedKeywords.slice(0, 12)} showDiff />
            <ScrollableMetricList title="기간별 증감 유입채널" rows={displayedChannels} showDiff />
          </section>
        </>
      ) : (
        <section className="panel empty-data-panel">
          <h2>유입 데이터 없음</h2>
          <p className="plain-text">{hasSelectedStore ? "선택한 기간의 주간 CSV를 업로드하세요." : "먼저 매장을 선택하세요."} 업로드하지 않은 기간은 0으로 추정하지 않습니다.</p>
        </section>
      )}
      <section className="panel">
        <div className="section-headline">
          <h2>매장별 키워드 조합기</h2>
          <div className="filter-row">
            <button className="btn btn-primary" onClick={generateKeywords} type="button">
              조합 생성
            </button>
            <button className="btn btn-light" onClick={resetKeywords} type="button">
              초기화
            </button>
            <button className="btn btn-light" onClick={() => downloadKeywordColumnCsv("tag-keywords-50.csv", generatedKeywords, 50)} type="button">
              태그용 CSV
            </button>
            <button className="btn btn-light" onClick={() => downloadKeywordColumnCsv("powerlink-keywords-1000.csv", generatedKeywords, 1000)} type="button">
              파워링크 CSV
            </button>
          </div>
        </div>
        <div className="keyword-input-grid">
          {keywordGroups.map((group) => (
            <label className="keyword-box" key={group.title}>
              <span>{group.title}</span>
              <textarea
                value={keywordInputs[Number(group.title.slice(0, 1))] ?? ""}
                onChange={(event) => setKeywordInputs({ ...keywordInputs, [Number(group.title.slice(0, 1))]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="combo-rule-panel">
          <div className="combo-rule-header">
            <strong>조합 설정</strong>
            <span>기본 조합: 1/3, 1/2/3, 1/2/4, 1/4, 2/3, 2/4, 5/3, 5/4</span>
          </div>
          <div className="combo-rules">
            {combinationRules.map((rule) => (
              <label className="combo-rule" key={rule}>
                <input checked={selectedRules.includes(rule)} onChange={() => toggleRule(rule)} type="checkbox" />
                {rule}
              </label>
            ))}
          </div>
          <div className="combo-options">
            <label>
              <input checked={removeSpaces} onChange={(event) => setRemoveSpaces(event.target.checked)} type="checkbox" />
              키워드 사이 공백 제거
            </label>
            <label>
              <input checked={dedupe} onChange={(event) => setDedupe(event.target.checked)} type="checkbox" />
              중복 제거
            </label>
            <button className="btn btn-primary" onClick={generateKeywords} type="button">
              선택 조합으로 생성
            </button>
            <span className="muted-note">생성 {generatedKeywords.length.toLocaleString("ko-KR")}개 · 태그 CSV는 50개씩 열 분할 · 파워링크 CSV는 1000개씩 열 분할</span>
          </div>
        </div>
        <div className="keyword-output-grid">
          <div>
            <h3>태그용 50개 세트</h3>
            <div className="set-preview">
              {tagSet.map((keyword, index) => (
                <span key={`${keyword}-${index}`}>{keyword}</span>
              ))}
              {tagSet.length === 0 && <span>조합 생성 후 표시됩니다.</span>}
            </div>
          </div>
          <div>
            <h3>파워링크용 1000개 세트</h3>
            <div className="set-preview">
              {powerlinkSet.map((keyword, index) => (
                <span key={`${keyword}-${index}`}>{keyword}</span>
              ))}
              {powerlinkSet.length === 0 && <span>조합 생성 후 표시됩니다.</span>}
            </div>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="section-headline">
          <div>
            <h2>꿀키워드 탐색기</h2>
            <p className="plain-text">현재 조합된 키워드를 매장 히스토리에 남기고, 지도 페이지수가 작은 키워드부터 우선 정렬합니다.</p>
          </div>
          <button className="btn btn-primary" disabled={!selectedInflowStore || generatedKeywords.length === 0} onClick={runGoldenKeywordMining} type="button">
            꿀키워드 탐색기 실행
          </button>
        </div>
        {miningStatus && <p className="mining-status">{miningStatus}</p>}
        <div className="golden-job-list">
          {storeGoldenJobs.slice(0, 3).map((job) => (
            <span key={job.id}>
              {new Date(job.createdAt).toLocaleString("ko-KR")} · {job.keywordCount.toLocaleString("ko-KR")}개 분석 · 꿀키워드 {job.resultCount}개
            </span>
          ))}
          {selectedInflowStore && storeGoldenJobs.length === 0 && <span>이 매장의 꿀키워드 탐색 히스토리가 없습니다.</span>}
          {!selectedInflowStore && <span>매장을 선택하면 탐색 히스토리가 매장별로 저장됩니다.</span>}
        </div>
        <div className="analysis-table">
          <div className="analysis-head">
            <span>키워드</span>
            <span>총 검색량</span>
            <span>페이지수</span>
            <span>추정 매장수</span>
            <span>판정</span>
          </div>
          {analysisRows.map((row) => (
            <div className="analysis-row" key={row.keyword}>
              <strong>{row.keyword}</strong>
              <span>{row.volume ? row.volume.toLocaleString("ko-KR") : row.result === "꿀키워드" ? "조회중/없음" : "-"}</span>
              <span>{row.pageCount ?? (row.result === "지도차단" ? "차단" : "확인실패")}</span>
              <span>{row.estimatedStores ? row.estimatedStores.toLocaleString("ko-KR") : "-"}</span>
              <em className={row.result === "꿀키워드" ? "good-text" : ""}>{row.result}</em>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function SalesPage() {
  const now = new Date();
  const {
    stores: erpStores,
    selectedStoreId: selectedSalesStoreId,
    selectedStore: selectedSalesStore,
    selectStore: setSelectedSalesStoreId,
  } = useStoreRegistry();
  const [rangeStart, setRangeStart] = useState("2026-03-01");
  const [rangeEnd, setRangeEnd] = useState(now.toISOString().slice(0, 10));
  const [appliedRangeStart, setAppliedRangeStart] = useState("2026-03-01");
  const [appliedRangeEnd, setAppliedRangeEnd] = useState(now.toISOString().slice(0, 10));
  const [cardData, setCardData] = useState<ServerCardData | null>(null);
  const [salesUploadMessage, setSalesUploadMessage] = useState("");
  const [queryVersion, setQueryVersion] = useState(0);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesGranularity, setSalesGranularity] = useState<SalesChartGranularity>("day");
  const [goalMonths, setGoalMonths] = useState(6);
  const [targetSales, setTargetSales] = useState(60000000);
  const [targetTicket, setTargetTicket] = useState(90000);
  const [referenceCac, setReferenceCac] = useState(2180);
  useEffect(() => {
    if (!selectedSalesStoreId) {
      setCardData(null);
      setSalesUploadMessage("");
      return;
    }
    const params = new URLSearchParams({ storeId: selectedSalesStoreId, start: appliedRangeStart, end: appliedRangeEnd });
    setSalesLoading(true);
    fetch(`/api/erp/card-uploads?${params}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "매출 데이터를 불러오지 못했습니다.");
        return payload as ServerCardData;
      })
      .then((payload) => {
        setCardData(payload);
        setSalesUploadMessage(payload.imports.length ? `${payload.imports.length}개 원본 파일의 기간 데이터를 조회했습니다.` : "선택한 기간에 업로드된 원본 파일이 없습니다.");
      })
      .catch((error) => setSalesUploadMessage(error instanceof Error ? error.message : "매출 데이터를 불러오지 못했습니다."))
      .finally(() => setSalesLoading(false));
  }, [selectedSalesStoreId, appliedRangeStart, appliedRangeEnd, queryVersion]);

  const applySalesRange = () => {
    if (rangeStart > rangeEnd) {
      setSalesUploadMessage("시작일은 종료일보다 앞서야 합니다.");
      return;
    }
    setAppliedRangeStart(rangeStart);
    setAppliedRangeEnd(rangeEnd);
    setQueryVersion((version) => version + 1);
  };

  const dailyStats = useMemo(() => {
    const sales = (cardData?.daily ?? []).map((row) => Number(row.net_sales)).filter((value) => value > 0);
    const tickets = (cardData?.daily ?? []).map((row) => Number(row.amount_per_payment)).filter((value) => value > 0);
    const summarize = (values: number[]) => values.length ? {
      min: Math.min(...values),
      avg: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
      max: Math.max(...values),
    } : null;
    return { sales: summarize(sales), tickets: summarize(tickets) };
  }, [cardData]);

  const chartPoints = useMemo(
    () => salesSeries(cardData?.daily ?? [], salesGranularity),
    [cardData, salesGranularity],
  );

  const goalPlan = useMemo(() => {
    const currentSales = cardData?.totals.netSales ?? 0;
    const currentPayments = cardData?.totals.netPaymentCount ?? 0;
    const months = Math.max(1, Math.min(12, goalMonths || 1));
    const safeTargetSales = Math.max(0, targetSales || 0);
    const safeTargetTicket = Math.max(1, targetTicket || 1);
    const targetPayments = Math.ceil(safeTargetSales / safeTargetTicket);
    const monthlyAdditionalPayments = Math.max(0, Math.ceil((targetPayments - currentPayments) / months));
    const rows = Array.from({ length: months + 1 }, (_, index) => {
      const ratio = index / months;
      const sales = Math.round(currentSales + (safeTargetSales - currentSales) * ratio);
      const payments = Math.round(currentPayments + (targetPayments - currentPayments) * ratio);
      return { label: index === 0 ? "현재" : `${index}개월`, sales, payments };
    });
    return {
      currentSales,
      currentPayments,
      currentTicket: cardData?.totals.amountPerPayment ?? 0,
      targetPayments,
      monthlyAdditionalPayments,
      estimatedMonthlyBudget: monthlyAdditionalPayments * Math.max(0, referenceCac || 0),
      rows,
    };
  }, [cardData, goalMonths, referenceCac, targetSales, targetTicket]);

  const uploadSalesFile = async (file: File | undefined) => {
    if (!file) return;
    if (!selectedSalesStoreId) {
      setSalesUploadMessage("먼저 매장을 선택하세요.");
      return;
    }
    setSalesLoading(true);
    try {
      const form = new FormData();
      form.append("storeId", selectedSalesStoreId);
      form.append("file", file);
      const response = await fetch("/api/erp/card-uploads", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "업로드에 실패했습니다.");
      const imported = payload.import as ServerCardImport;
      setRangeStart(imported.period_start);
      setRangeEnd(imported.period_end);
      setSalesUploadMessage(payload.duplicate
        ? `${file.name}은 이미 등록된 원본입니다. 저장된 데이터를 불러왔습니다.`
        : `${file.name} 저장 완료 · 순매출 ${formatNumber(Number(imported.net_sales))}원 · 순결제 ${formatNumber(Number(imported.net_payment_count))}건`);
      setQueryVersion((version) => version + 1);
    } catch (error) {
      setSalesUploadMessage(error instanceof Error ? error.message : "엑셀 파일을 처리하지 못했습니다.");
    } finally {
      setSalesLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="여신금융 매출 데이터"
        description="여신금융 원본 엑셀을 매장별로 보관하고 순매출, 순결제건수, 건당 결제액을 확인합니다."
        actions={
          <label className={selectedSalesStore ? "file-upload-button" : "file-upload-button disabled"}>
            {salesLoading ? "처리중" : "엑셀 업로드"}
            <input accept=".xls,.xlsx" disabled={!selectedSalesStore || salesLoading} onChange={(event) => uploadSalesFile(event.target.files?.[0])} type="file" />
          </label>
        }
      />
      <div className="store-context selectable-context">
        <select value={selectedSalesStoreId} onChange={(event) => setSelectedSalesStoreId(event.target.value)}>
          <option value="">매장을 선택하세요</option>
          {erpStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
        </select>
        {selectedSalesStore ? (
          <>
            <span>MID {selectedSalesStore.naverMid || "미등록"}</span>
            <span>담당자 {selectedSalesStore.managerName || "미배정"}</span>
            <span>관리 {selectedSalesStore.contractPeriodWeeks ?? 4}주</span>
          </>
        ) : <span>매장을 선택하면 매출 데이터가 표시됩니다.</span>}
      </div>
      <div className="success-banner">
        <span>{salesUploadMessage || "원본 XLS는 매장별 비공개 저장소와 Supabase 원장에 함께 보관됩니다."}</span>
      </div>
      <div className="filter-row toolbar">
        <span>시작일:</span>
        <input className="date-input" type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
        <span>종료일:</span>
        <input className="date-input" type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
        <button className="btn btn-primary" disabled={!selectedSalesStoreId || salesLoading} onClick={applySalesRange} type="button">조회</button>
        <span className="muted-note">적용 기간 {appliedRangeStart} ~ {appliedRangeEnd}</span>
      </div>
      <div className="detail-grid">
        <MetricCard label="순매출" value={cardData ? `${formatNumber(cardData.totals.netSales)}원` : "데이터 없음"} tone="red" />
        <MetricCard label="순결제건수" value={cardData ? `${formatNumber(cardData.totals.netPaymentCount)}건` : "데이터 없음"} tone="green" />
        <MetricCard label="건당 결제액" value={cardData?.totals.amountPerPayment ? `${formatNumber(cardData.totals.amountPerPayment)}원` : "데이터 없음"} />
        <MetricCard label="업로드 원본" value={selectedSalesStore ? `${cardData?.imports.length ?? 0}개` : "매장 미선택"} />
      </div>
      {cardData && cardData.imports.length > 0 && (
        <section className="panel">
          <div className="section-headline">
            <div>
              <h2>업로드 이력</h2>
              <p className="plain-text">동일 파일은 중복 저장하지 않으며, 계산 결과는 업로드 기간 안에서만 표시합니다.</p>
            </div>
          </div>
          <div className="sales-upload-table">
            <div className="analysis-head">
              <span>원본 파일</span>
              <span>기간 / 순매출</span>
              <span>순결제건수</span>
            </div>
            {cardData.imports.slice(0, 8).map((row) => (
              <div className="analysis-row" key={row.id}>
                <strong>{row.file_name}</strong>
                <span>{row.period_start}~{row.period_end} · {formatNumber(Number(row.net_sales))}원</span>
                <span>{formatNumber(Number(row.net_payment_count))}건</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="panel">
        <div className="section-headline">
          <h2>날짜별 매출 + 결제수</h2>
          <div className="small-tabs">
            {(["day", "week", "month"] as SalesChartGranularity[]).map((granularity) => (
              <button className={salesGranularity === granularity ? "active" : ""} key={granularity} onClick={() => setSalesGranularity(granularity)} type="button">
                {granularity === "day" ? "일간" : granularity === "week" ? "주간" : "월간"}
              </button>
            ))}
          </div>
        </div>
        <ChartSummary
          period={`${appliedRangeStart} ~ ${appliedRangeEnd}`}
          primaryLabel="순매출"
          primaryValue={cardData ? `${formatNumber(cardData.totals.netSales)}원` : "데이터 없음"}
          secondaryLabel="결제건수"
          secondaryValue={cardData ? `${formatNumber(cardData.totals.netPaymentCount)}건` : "데이터 없음"}
        />
        <SalesComboChart points={chartPoints} />
      </section>
      <section className="panel two-col">
        <div>
          <h2>시간대별 매출</h2>
          {cardData?.hourly.length ? (
            <BarSet labels={cardData.hourly.map((row) => `${row.hour}시`)} values={cardData.hourly.map((row) => row.netSales)} />
          ) : <p className="plain-text">선택한 기간에 시간대별 데이터가 없습니다.</p>}
        </div>
        <div>
          <h2>요일별 매출</h2>
          {cardData?.weekdays.length ? (
            <BarSet labels={["월", "화", "수", "목", "금", "토", "일"]} values={cardData.weekdays.map((row) => row.netSales)} tone="green" />
          ) : <p className="plain-text">선택한 기간에 요일별 데이터가 없습니다.</p>}
        </div>
      </section>
      <section className="panel two-col">
        <div>
          <h2>기간별 매출 통계</h2>
          <div className="stat-pill-grid">
            <strong>최저 <span>{dailyStats.sales ? `${formatNumber(dailyStats.sales.min)}원` : "데이터 없음"}</span></strong>
            <strong>평균 <span>{dailyStats.sales ? `${formatNumber(dailyStats.sales.avg)}원` : "데이터 없음"}</span></strong>
            <strong>최고 <span>{dailyStats.sales ? `${formatNumber(dailyStats.sales.max)}원` : "데이터 없음"}</span></strong>
          </div>
        </div>
        <div>
          <h2>건당 결제액 통계</h2>
          <div className="stat-pill-grid green">
            <strong>최저 <span>{dailyStats.tickets ? `${formatNumber(dailyStats.tickets.min)}원` : "데이터 없음"}</span></strong>
            <strong>평균 <span>{dailyStats.tickets ? `${formatNumber(dailyStats.tickets.avg)}원` : "데이터 없음"}</span></strong>
            <strong>최고 <span>{dailyStats.tickets ? `${formatNumber(dailyStats.tickets.max)}원` : "데이터 없음"}</span></strong>
          </div>
        </div>
      </section>
      <section className="panel goal-planner">
        <div className="section-headline">
          <div>
            <h2>개월 목표 · 광고비 참고 계산</h2>
            <p className="plain-text">카드 원장으로 확인 가능한 순매출과 순결제건수만 사용합니다. 신규·재방문 고객은 CRM/POS 식별자가 연결된 뒤 계산합니다.</p>
          </div>
        </div>
        <div className="goal-panels">
          <div className="goal-form-card">
            <h3>현재 선택 기간</h3>
            <InfoLine label="순매출" value={cardData ? `${formatNumber(goalPlan.currentSales)}원` : "데이터 없음"} />
            <InfoLine label="순결제건수" value={cardData ? `${formatNumber(goalPlan.currentPayments)}건` : "데이터 없음"} />
            <InfoLine label="건당 결제액" value={cardData ? `${formatNumber(goalPlan.currentTicket)}원` : "데이터 없음"} />
            <InfoLine label="신규·재방문" value="CRM/POS 연결 필요" />
          </div>
          <div className="goal-form-card">
            <h3>N개월 뒤 목표</h3>
            <label className="mock-field"><span>목표까지 개월 수</span><input max="12" min="1" onChange={(event) => setGoalMonths(Number(event.target.value))} type="number" value={goalMonths} /></label>
            <label className="mock-field"><span>목표 순매출</span><input min="0" onChange={(event) => setTargetSales(Number(event.target.value))} type="number" value={targetSales} /></label>
            <label className="mock-field"><span>목표 건당 결제액</span><input min="1" onChange={(event) => setTargetTicket(Number(event.target.value))} type="number" value={targetTicket} /></label>
            <InfoLine label="필요 결제건수" value={`${formatNumber(goalPlan.targetPayments)}건`} />
            <InfoLine label="월평균 추가 결제" value={`${formatNumber(goalPlan.monthlyAdditionalPayments)}건`} />
          </div>
        </div>
        <div className="goal-chart-grid" aria-label="월별 목표 매출과 결제건수">
          {goalPlan.rows.map((row) => (
            <div className="goal-month-row" key={row.label}>
              <strong>{row.label}</strong>
              <div className="goal-bars">
                <span className="goal-bar pink" style={{ width: `${Math.max(2, targetSales ? (row.sales / Math.max(targetSales, goalPlan.currentSales, 1)) * 100 : 2)}%` }} />
                <span className="goal-bar teal" style={{ width: `${Math.max(2, goalPlan.targetPayments ? (row.payments / Math.max(goalPlan.targetPayments, goalPlan.currentPayments, 1)) * 100 : 2)}%` }} />
              </div>
              <div className="goal-month-values">
                <span>매출 {formatNumber(row.sales)}원</span>
                <span>결제 {formatNumber(row.payments)}건</span>
                <span>{row.label === "현재" ? "기준" : `+${formatNumber(Math.max(0, row.payments - goalPlan.currentPayments))}건`}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="ad-estimate-card">
          <label className="mock-field"><span>참고 획득비용(CAC)</span><input min="0" onChange={(event) => setReferenceCac(Number(event.target.value))} type="number" value={referenceCac} /></label>
          <InfoLine label="월평균 추가 결제" value={`${formatNumber(goalPlan.monthlyAdditionalPayments)}건`} />
          <InfoLine label="참고 광고비" value={`${formatNumber(goalPlan.estimatedMonthlyBudget)}원/월`} />
        </div>
      </section>
    </>
  );
}

function TasksPage() {
  const [selectedTask, setSelectedTask] = useState<TaskItem>(weeklyTasks[1]);
  const completed = weeklyTasks.filter((task) => task.status === "완료").length;

  return (
    <>
      <PageHeader title="주간 업무 작성 화면" description="매니저는 업무 상세를 등록/수정하고, 사장님은 보고서에서 읽기 전용으로 확인합니다." />
      <StoreContextBar />
      <section className="panel">
        <h2>전체 업무 목록표</h2>
        <div className="task-summary-grid">
          <MetricCard label="전체 업무" value={`${weeklyTasks.length}개`} />
          <MetricCard label="완료" value={`${completed}개`} tone="green" />
          <MetricCard label="미완료" value={`${weeklyTasks.length - completed}개`} />
          <MetricCard label="현재 주차" value="4주차" tone="red" />
        </div>
      </section>
      <section className="panel">
        <div className="section-headline">
          <h2>추가 업무 / 약속 히스토리</h2>
          <button className="btn btn-primary" type="button">추가 업무 등록</button>
        </div>
        <div className="promise-list">
          {[
            ["2026-07-12", "사장님 통화", "신메뉴 사진 교체 요청", "2026-07-14까지", "대기중"],
            ["2026-07-11", "카카오톡", "쿠폰 문구 수정 후 재전달", "2026-07-12까지", "완료"],
            ["2026-07-09", "내부 메모", "블로그 상위노출 키워드 재확인", "2026-07-15까지", "대기중"],
          ].map(([date, source, title, due, status]) => (
            <div className="promise-row" key={`${date}-${title}`}>
              <span>{date}</span>
              <strong>{title}</strong>
              <span>{source}</span>
              <span>{due}</span>
              <em>{status}</em>
            </div>
          ))}
        </div>
        <p className="plain-text">나중에는 통화 녹음 파일을 업로드하면 약속 업무가 자동 생성되는 기능으로 확장합니다.</p>
      </section>
      <section className="task-layout">
        <div>
          {[1, 2, 3, 4].map((week) => (
            <section className="panel week-panel" key={week}>
              <h2>
                {week}주차 <span>{getWeekRange(week)}</span>
              </h2>
              <div className="task-table">
                {weeklyTasks
                  .filter((task) => task.week === week)
                  .map((task) => (
                    <button className="task-row-button" key={`${task.date}-${task.name}`} onClick={() => setSelectedTask(task)} type="button">
                      <span>{task.date}</span>
                      <span>{task.day}</span>
                      <strong>{task.name}</strong>
                      <em>{task.status}</em>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="panel task-detail">
          <h2>업무 상세 등록/확인</h2>
          <InfoLine label="날짜" value={`${selectedTask.date} (${selectedTask.day})`} />
          <InfoLine label="작업 이름" value={selectedTask.name} />
          <InfoLine label="상태" value={selectedTask.status} />
          <label className="mock-field">
            <span>매니저 메모</span>
            <textarea readOnly value="여기에 업무 처리 내용, 변경 사항, 사장님에게 보여줄 설명을 입력합니다." />
          </label>
          <div className="mock-photo-grid">
            <div>사진 첨부 1</div>
            <div>사진 첨부 2</div>
          </div>
          <p className="plain-text">내부 관리자는 수정 가능, 사장님 보고서에서는 읽기 전용으로 표시됩니다.</p>
        </aside>
      </section>
    </>
  );
}

function OwnerReportPage() {
  return (
    <>
      <PageHeader title="사장님 보고서 미리보기" description="외부 공유용 읽기 전용 보고서 예시 화면입니다." />
      <StoreContextBar />
      <section className="owner-hero">
        <h2>토종곱창 철산본점의 장가 리포트</h2>
        <p>4주차 · 2026.06.15~2026.07.12</p>
      </section>
      <div className="detail-grid">
        <MetricCard label="영수증 리뷰" value="147/112" tone="green" />
        <MetricCard label="네이버 유입" value="1,890" tone="red" />
        <MetricCard label="이번주 매출" value="4,037,211원" tone="red" />
        <MetricCard label="업무 완료율" value="100%" tone="green" />
      </div>
      <section className="panel">
        <h2>목표 키워드 순위 추적</h2>
        <div className="rank-card-grid">
          {["광명곱창", "광명맛집", "광명저녁추천"].map((keyword, index) => (
            <div className="rank-card" key={keyword}>
              <strong>{keyword}</strong>
              <span>순위 {index === 0 ? "1" : 24 + index}</span>
              <span>저장 1,000+</span>
              <span>영수증 3,828건</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>주차별 업무 진행 내역</h2>
        <div className="owner-week-list">
          {[1, 2, 3, 4].map((week) => (
            <div className="week-panel" key={week}>
              <h2>
                {week}주차 <span>{getWeekRange(week)}</span>
              </h2>
              <div className="task-table compact-list">
                {weeklyTasks
                  .filter((task) => task.week === week)
                  .map((task) => (
                    <div className="task-row-static" key={`${task.date}-${task.name}`}>
                      <span>{task.date}</span>
                      <span>{task.day}</span>
                      <strong>{task.name}</strong>
                      <em>{task.status}</em>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function WeeklyFlowPage({ setView }: { setView: (view: ViewId) => void }) {
  return (
    <>
      <PageHeader
        title="매장 주간 데이터 흐름"
        description="업체별 네이버 유입, 광고, 매출, 신규/재방문 매출을 W0~W3 기준으로 한 줄에서 비교합니다."
        actions={
          <div className="filter-row">
            <button className="btn btn-light" onClick={() => setView("dashboard")} type="button">
              운영 대시보드
            </button>
            <button className="btn btn-light" onClick={() => setView("store")} type="button">
              매장 정보
            </button>
          </div>
        }
      />
      <StoreContextBar />
      <div className="filter-row toolbar">
        <span>날짜 선택</span>
        <input className="date-input" type="date" defaultValue="2026-07-12" />
        <button className="btn btn-primary" type="button">적용</button>
        <div className="field search-field">
          <Search size={16} />
          <input className="search-input" placeholder="업체명 또는 담당자 검색" />
        </div>
      </div>
      <section className="weekly-flow-wrap">
        <div className="weekly-flow-table">
          <div className="weekly-flow-head">
            <strong>업체명</strong>
            <strong>담당자</strong>
            <strong>업무 완료율</strong>
            <strong>네이버 유입</strong>
            <strong>검색광고(클릭률 | 클릭)</strong>
            <strong>파워링크(노출)</strong>
            <strong>매출</strong>
            <strong>신규(매출/비율)</strong>
            <strong>재방문(매출/비율)</strong>
          </div>
          {stores.map((store, index) => (
            <div className="weekly-flow-row" key={store.id}>
              <button className="store-name-link" onClick={() => setView("dashboard")} type="button">
                {store.name}
              </button>
              <span>{store.manager}</span>
              <span>{index === 0 ? "100%" : index === 1 ? "82%" : index === 4 ? "-" : "96%"}</span>
              <MetricStack values={store.weeklyInflow} signalIndex={store.naverInflow ? getSignal(store.naverInflow, store.previous.naverInflow) : "gray"} />
              <MetricStack values={[194, 196, 240, 304]} suffix="건" signalIndex={index === 2 ? "green" : "red"} />
              <MetricStack values={[4294, 5596, 5839, 2336]} signalIndex={index === 2 ? "green" : "red"} />
              <MetricStack values={[4037211, 5686915, 13404021, 4365410]} signalIndex={store.sales ? getSignal(store.sales, store.previous.sales) : "gray"} money />
              <MetricStack values={[3814711, 5105514, 12464118, 3655609]} signalIndex={index === 4 ? "gray" : "red"} money />
              <MetricStack values={[222500, 671401, 939903, 709801]} signalIndex={index === 2 ? "green" : "red"} money />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function QuestionnairePage() {
  const { stores: questionnaireStores, selectedStoreId, selectedStore, selectStore } = useStoreRegistry();
  const defaultQuestionnaireSections: QuestionnaireSection[] = [
    ["1. 기본정보", ["업체명", "대표자명", "대표님 연락처", "매장 주소", "매장 연락처", "운영시간", "브레이크 타임", "휴무일"]],
    ["2. 네이버/플레이스 계정", ["네이버 아이디", "네이버 비밀번호", "플레이스 URL", "플레이스 MID", "검색광고 계정 여부"]],
    ["3. SNS/외부 계정", ["인스타그램 아이디", "인스타그램 비밀번호", "구글 계정", "카카오맵 계정", "카카오톡 채널 주소", "여신금융 아이디/비밀번호"]],
    ["4. 매장 운영 정보", ["대표 메뉴", "객단가", "테이블 수", "주력 시간대", "주력 고객층", "단골 비율", "월 목표 매출"]],
    ["5. 마케팅 방향", ["현재 고민", "강점/차별점", "경쟁 매장", "희망 키워드", "하지 않았으면 하는 마케팅", "기대하는 성과"]],
    ["6. 대표님/브랜드 스토리", ["대표님 업력/이력", "창업 계기", "브랜드 스토리", "특별 식재료", "방송출연 여부", "사장님이 꼭 알리고 싶은 이야기"]],
    ["7. 메뉴/가격", ["대표 메뉴 1", "대표 메뉴 2", "대표 메뉴 3", "세트 메뉴", "시즌 메뉴"]],
    ["8. 리뷰/이벤트", ["리뷰 이벤트 운영 여부", "제공 혜택", "설문조사 문항", "재방문 유도 방식"]],
    ["9. 추가 요청", ["사장님 요청사항", "주의해야 할 표현", "기타 메모"]],
  ];
  const [questionnaireSections, setQuestionnaireSections] = useState(defaultQuestionnaireSections);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [templateEditing, setTemplateEditing] = useState(false);

  const getSectionStatus = (fields: readonly string[]) => {
    const completed = fields.filter((field) => answers[field]?.trim()).length;
    if (completed === 0) return "empty";
    if (completed < fields.length) return "partial";
    return "complete";
  };

  const scrollToSection = (index: number) => {
    document.getElementById(`question-section-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateSectionTitle = (index: number, title: string) => {
    setQuestionnaireSections((sections) => sections.map((section, sectionIndex) => (sectionIndex === index ? [title, section[1]] : section)));
  };

  const updateTemplateField = (sectionIndex: number, fieldIndex: number, value: string) => {
    setQuestionnaireSections((sections) =>
      sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;
        return [section[0], section[1].map((field, currentFieldIndex) => (currentFieldIndex === fieldIndex ? value : field))];
      }),
    );
  };

  const addTemplateField = (sectionIndex: number) => {
    setQuestionnaireSections((sections) =>
      sections.map((section, currentSectionIndex) => (currentSectionIndex === sectionIndex ? [section[0], [...section[1], "새 질문"]] : section)),
    );
  };

  const deleteTemplateField = (sectionIndex: number, fieldIndex: number) => {
    setQuestionnaireSections((sections) =>
      sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;
        return [section[0], section[1].filter((_, currentFieldIndex) => currentFieldIndex !== fieldIndex)];
      }),
    );
  };

  return (
    <>
      <PageHeader
        title="정보안내문 작성용 페이지"
        description="사장님이 매장 운영 정보와 계정을 입력하고, 이 데이터가 매장 정보 화면으로 동기화되는 예시입니다."
        actions={
          <div className="filter-row">
            <button className="btn btn-primary" onClick={() => setTemplateEditing((value) => !value)} type="button">
              {templateEditing ? "작성 모드" : "안내문 양식 수정"}
            </button>
            <button className="btn btn-light" type="button">링크 복사</button>
            <a className="btn btn-light" href="https://xn--3j1b74x8mfjtk.com/information-questions/20250761" rel="noreferrer" target="_blank">
              <ExternalLink size={16} />
              MID 링크
            </a>
          </div>
        }
      />
      <section className="store-summary-strip">
        <select value={selectedStoreId} onChange={(event) => selectStore(event.target.value)}>
          {questionnaireStores.map((store) => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
        <strong>{selectedStore?.name ?? "등록 매장 없음"}</strong>
        <span>담당자 {selectedStore?.managerName ?? "미배정"}</span>
        <span>관리 {selectedStore?.contractPeriodWeeks ?? 4}주</span>
      </section>
      <section className="questionnaire-shell">
        <div className="questionnaire-title">
          <span>Information Guide</span>
          <h2>마케팅 사전 정보 수집</h2>
          <p>네이버 플레이스 세팅, 기자단, 리뷰 작성 등 마케팅 진행에 쓰이는 정보를 사장님께 요청합니다.</p>
        </div>
        <div className="steps">
          {questionnaireSections.map(([, fields], index) => (
            <button className={`step-button ${getSectionStatus(fields)}`} key={index} onClick={() => scrollToSection(index)} type="button">
              {index + 1}
            </button>
          ))}
        </div>
        {questionnaireSections.map(([section, fields], sectionIndex) => (
          <div className="form-section" id={`question-section-${sectionIndex}`} key={section}>
            {templateEditing ? (
              <input className="template-title-input" value={section} onChange={(event) => updateSectionTitle(sectionIndex, event.target.value)} />
            ) : (
              <h3>{section}</h3>
            )}
            {fields.map((field) => (
              <label className="mock-field" key={field}>
                {templateEditing ? (
                  <div className="template-field-row">
                    <input value={field} onChange={(event) => updateTemplateField(sectionIndex, fields.indexOf(field), event.target.value)} />
                    <button className="btn btn-light" onClick={() => deleteTemplateField(sectionIndex, fields.indexOf(field))} type="button">삭제</button>
                  </div>
                ) : (
                  <span>{field}</span>
                )}
                <input
                  className={templateEditing ? "template-answer-hidden" : ""}
                  placeholder={field.includes("비밀번호") ? "사장님 입력값 -> 매장 정보에 동기화" : ""}
                  value={answers[field] ?? ""}
                  onChange={(event) => setAnswers({ ...answers, [field]: event.target.value })}
                />
              </label>
            ))}
            {templateEditing && <button className="btn btn-light full-button" onClick={() => addTemplateField(sectionIndex)} type="button">세부질문 추가</button>}
          </div>
        ))}
      </section>
    </>
  );
}

function ScrollableMetricList({ title, rows, showDiff }: { title: string; rows: (string | number)[][]; showDiff?: boolean }) {
  return (
    <div>
      <h2>{title}</h2>
      <div className="scroll-list">
        {rows.map((row) => (
          <div className="metric-row" key={String(row[0])}>
            <span>{row[0]}</span>
            <strong>{Number(row[1]).toLocaleString("ko-KR")}</strong>
            {showDiff && (
              <>
                <em className={Number(row[2]) < 0 ? "danger-text" : "good-text"}>
                  {Number(row[2]) > 0 ? "+" : ""}
                  {Number(row[2]).toLocaleString("ko-KR")}
                </em>
                <em className={Number(row[3]) < 0 ? "danger-text" : "good-text"}>
                  {Number(row[3]) > 0 ? "+" : ""}
                  {row[3]}%
                </em>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: Signal }) {
  return (
    <div className="metric-tile">
      <span>
        {tone && <i className={`dot ${tone}`} />} {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoLine({ label, value, sync }: { label: string; value: string; sync?: boolean }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong>{value}</strong>
      {sync && <em>정보안내문 동기화</em>}
    </div>
  );
}

function MetricStack({
  values,
  signalIndex,
  money,
  suffix,
}: {
  values: number[];
  signalIndex: Signal;
  money?: boolean;
  suffix?: string;
}) {
  return (
    <span className="metric-stack">
      {values.map((value, index) => (
        <span key={`${index}-${value}`}>
          W{index}: {money ? `${value.toLocaleString("ko-KR")}원` : `${value.toLocaleString("ko-KR")}${suffix ?? ""}`}
          {index === 0 && <i className={`dot ${signalIndex}`} />}
        </span>
      ))}
    </span>
  );
}

function getWeekRange(week: number) {
  if (week === 1) return "(2026-06-15 ~ 2026-06-19)";
  if (week === 2) return "(2026-06-22 ~ 2026-06-26)";
  if (week === 3) return "(2026-06-29 ~ 2026-07-03)";
  return "(2026-07-06 ~ 2026-07-10)";
}

function isTestStoreName(name: string) {
  const compact = name.replace(/\s/g, "");
  return /asdf/i.test(compact) || /^\d{6,}$/.test(compact) || /^[ㄱ-ㅎㅏ-ㅣ]+$/.test(compact);
}

function canonicalStoreToRow(store: CanonicalStore): StoreRow {
  const startDate = store.managementStartDate ? new Date(`${store.managementStartDate}T00:00:00`) : null;
  const elapsedDays = startDate ? Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 86400000)) : null;
  const week = elapsedDays === null ? "신규" : `${Math.min(4, Math.floor(elapsedDays / 7) + 1)}주차` as StoreRow["week"];
  return {
    id: store.id,
    week,
    name: store.name,
    manager: store.managerName ?? "미배정",
    bizMoney: null,
    naverInflow: null,
    sales: null,
    previous: { bizMoney: null, naverInflow: null, sales: null },
    weeklyInflow: [0, 0, 0, 0],
    weeklyTasks: [0, 0, 0, 0],
    memo: store.memo ?? "",
    publicUid: store.publicUid,
  };
}

function extractStoreNamesFromSheet(rows: unknown[][]) {
  const headerCandidates = ["업체명", "매장명", "상호", "가맹점명", "업장명"];
  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => headerCandidates.includes(String(cell ?? "").trim())),
  );
  const headerRow = rows[headerRowIndex] ?? [];
  const storeNameColumn = headerRow.findIndex((cell) => headerCandidates.includes(String(cell ?? "").trim()));

  if (headerRowIndex >= 0 && storeNameColumn >= 0) {
    return rows
      .slice(headerRowIndex + 1)
      .map((row) => String(row[storeNameColumn] ?? "").trim())
      .filter(Boolean);
  }

  return rows
    .flat()
    .map((cell) => String(cell ?? "").trim())
    .filter((value) => value.length >= 2 && !headerCandidates.includes(value));
}

function HomePageContent() {
  const { stores: registryStores, refreshStores, selectStore, error: storeRegistryError } = useStoreRegistry();
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [previousView, setPreviousView] = useState<ViewId>("dashboard");
  const [storeImportStatus, setStoreImportStatus] = useState("");
  const [storeCreateRequest, setStoreCreateRequest] = useState(0);
  const storeRows = useMemo(() => registryStores.map(canonicalStoreToRow), [registryStores]);
  const navigateTo = (view: ViewId) => {
    setPreviousView(activeView);
    setActiveView(view);
  };
  const goBack = () => setActiveView(previousView);
  const createStore = () => {
    setStoreCreateRequest((value) => value + 1);
    navigateTo("store");
  };

  const bulkCreateStores = async (names: string[]) => {
    const response = await fetch("/api/erp/stores/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    });
    const payload = await response.json() as { created?: unknown[]; skipped?: unknown[]; failed?: unknown[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "업체 일괄 등록 실패");
    await refreshStores();
    const result = {
      created: payload.created?.length ?? 0,
      skipped: payload.skipped?.length ?? 0,
      failed: payload.failed?.length ?? 0,
    };
    setStoreImportStatus(`${result.created}개 업체 추가, ${result.skipped}개 중복 제외, ${result.failed}개 실패`);
    return result;
  };

  const importStoresFromExcel = async (file: File | undefined): Promise<BulkStoreImportResult | null> => {
    if (!file) return null;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "" });
    const names = Array.from(new Set(extractStoreNamesFromSheet(sheetRows).filter((name) => !isTestStoreName(name))));

    const result: BulkStoreImportResult = { imported: 0, skipped: 0, failed: 0 };
    const existingNames = new Set(registryStores.map((store) => store.name));
    for (const name of names) {
      if (existingNames.has(name)) {
        result.skipped += 1;
        continue;
      }
      const response = await fetch("/api/erp/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contractPeriodWeeks: 4, lifecycleStatus: "active", environment: "production" }),
      });
      if (response.ok) {
        result.imported += 1;
        existingNames.add(name);
      } else {
        result.failed += 1;
      }
    }
    await refreshStores();
    setStoreImportStatus(`${result.imported}개 업체 추가, ${result.skipped}개 중복 제외, ${result.failed}개 실패`);
    return result;
  };

  const saveStoreRow = async (
    storeId: string | null,
    profile: {
      clientName: string;
      storeName: string;
      industry: string;
      region: string;
      manager: string;
      startDate: string;
      contractPeriod: string;
      placeUrl: string;
      placeMid: string;
      memo: string;
    },
  ) => {
    try {
      const response = await fetch(storeId ? `/api/erp/stores/${encodeURIComponent(storeId)}` : "/api/erp/stores", {
        method: storeId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.storeName,
          clientName: profile.clientName,
          managerName: profile.manager,
          category: profile.industry,
          region: profile.region,
          contractStartDate: profile.startDate || null,
          managementStartDate: profile.startDate || null,
          contractPeriodWeeks: Number.parseInt(profile.contractPeriod, 10) || 4,
          naverMid: profile.placeMid,
          naverPlaceUrl: profile.placeUrl,
          memo: profile.memo,
        }),
      });
      const payload = await response.json() as { store?: { id?: string }; error?: string };
      if (!response.ok) {
        const message = payload.error ?? "매장 저장 실패";
        setStoreImportStatus(message);
        return { ok: false, message };
      }
      await refreshStores();
      const savedStoreId = payload.store?.id ?? storeId ?? undefined;
      if (!storeId && savedStoreId) selectStore(savedStoreId);
      const message = "매장 원장 저장 완료 · 목록과 업로드 선택기에 추가했습니다.";
      setStoreImportStatus(message);
      return { ok: true, message, storeId: savedStoreId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "매장 저장에 실패했습니다.";
      setStoreImportStatus(message);
      return { ok: false, message };
    }
  };

  const archiveStoreRow = async (storeId: string) => {
    const response = await fetch(`/api/erp/stores/${encodeURIComponent(storeId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lifecycleStatus: "archived" }),
    });
    if (!response.ok) {
      const payload = await response.json() as { error?: string };
      setStoreImportStatus(payload.error ?? "매장 보관 실패");
      return;
    }
    await refreshStores();
    setStoreImportStatus("매장을 보관 처리했습니다. 데이터는 삭제되지 않았습니다.");
  };

  const content = (() => {
    switch (activeView) {
      case "ad":
        return <AdPage />;
      case "inflow":
        return <InflowPage />;
      case "sales":
        return <SalesPage />;
      case "adminDaily":
        return <AdminDailyPage rows={storeRows} />;
      case "daily":
        return <DailyTasksPage stores={storeRows} initialDailyInboxTasks={initialDailyInboxTasks} />;
      case "tasks":
        return <TasksPage />;
      case "owner":
        return <OwnerReportPage />;
      case "store":
        return <StoreInfoPage createRequest={storeCreateRequest} stores={storeRows} weeklyTasks={weeklyTasks} onBack={goBack} setView={navigateTo} onSaveStore={saveStoreRow} onArchiveStore={archiveStoreRow} />;
      case "questionnaire":
        return <QuestionnairePage />;
      case "weeklyFlow":
        return <WeeklyFlowPage setView={navigateTo} />;
      default:
        return <Dashboard setView={navigateTo} rows={storeRows} onBulkCreateStores={bulkCreateStores} onCreateStore={createStore} onImportStores={importStoresFromExcel} importStatus={storeImportStatus} />;
    }
  })();

  return (
    <div className="erp-shell">
      <Sidebar activeView={activeView} setView={navigateTo} />
      <main className="main">
        <LogoutButton />
        {storeRegistryError && <p className="registry-error">매장 원장 연결 오류: {storeRegistryError}</p>}
        {content}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <StoreRegistryProvider>
      <HomePageContent />
    </StoreRegistryProvider>
  );
}





