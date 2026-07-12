"use client";

import { useEffect, useMemo, useState } from "react";
import { DailyTasksPage } from "@/components/daily-tasks/daily-tasks-page";
import { StoreInfoPage } from "@/components/stores/store-info-page";
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
  pageCount: number;
  estimatedStores: number;
  result: "꿀키워드" | "보류" | "저검색";
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

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mini-bars" aria-label="최근 4주 유입량">
      {values.map((value, index) => {
        const height = value === 0 ? 8 : Math.max(16, Math.round((value / max) * 46));
        return (
          <div className="mini-bar-wrap" key={`${value}-${index}`}>
            <div className="mini-bar" style={{ height }} />
            <span>W{3 - index}</span>
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
  return keywords.slice(0, 20).map((keyword, index) => {
    const seed = Array.from(keyword).reduce((sum, char) => sum + char.charCodeAt(0), 0) + index * 17;
    const volume = 40 + (seed % 520);
    const pageCount = 1 + (seed % 5);
    const estimatedStores = pageCount * 50 - 1;
    const result = volume >= 180 && pageCount <= 2 ? "꿀키워드" : volume < 80 ? "저검색" : "보류";
    return { keyword, volume, pageCount, estimatedStores, result };
  });
}

function SalesComboChart() {
  const points = [
    ["06-11", 82, 17],
    ["06-12", 88, 16],
    ["06-13", 116, 18],
    ["06-14", 110, 16],
    ["06-15", 54, 14],
    ["06-16", 38, 6],
    ["06-17", 68, 11],
    ["06-18", 96, 15],
    ["06-19", 112, 23],
    ["06-20", 92, 18],
    ["06-21", 102, 16],
    ["06-22", 74, 12],
    ["06-23", 80, 11],
    ["06-24", 104, 18],
    ["06-25", 58, 13],
    ["06-26", 124, 17],
    ["06-27", 66, 12],
    ["06-28", 76, 13],
    ["06-29", 81, 12],
    ["06-30", 78, 13],
    ["07-01", 96, 16],
    ["07-02", 103, 18],
    ["07-03", 172, 23],
    ["07-04", 104, 18],
    ["07-05", 96, 16],
    ["07-06", 44, 9],
    ["07-07", 42, 10],
    ["07-08", 70, 11],
    ["07-09", 144, 19],
    ["07-10", 62, 12],
  ];

  return (
    <div className="combo-chart">
      <div className="combo-chart-grid">
        {points.map(([date, sales, count]) => (
          <div className="combo-day" key={String(date)}>
            <i style={{ height: `${sales}%` }} />
            <b style={{ bottom: `${Math.max(8, Number(count) * 3.1)}px` }} />
            <span>{date}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span><i className="legend-line" /> 결제수</span>
        <span><i className="legend-bar" /> 총 매출</span>
      </div>
    </div>
  );
}

function TimeSalesChart() {
  return (
    <div className="sales-line-card">
      <svg aria-hidden="true" viewBox="0 0 640 220">
        <defs>
          <linearGradient id="salesArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d="M0 112 C60 132 80 146 120 168 C170 198 230 204 290 198 C355 190 390 166 426 96 C458 36 504 42 536 64 C586 98 604 76 640 36 L640 220 L0 220 Z" fill="url(#salesArea)" />
        <path d="M0 112 C60 132 80 146 120 168 C170 198 230 204 290 198 C355 190 390 166 426 96 C458 36 504 42 536 64 C586 98 604 76 640 36" fill="none" stroke="#2563eb" strokeWidth="3" />
      </svg>
      <div className="chart-axis">
        {["0시", "4시", "8시", "12시", "16시", "20시", "23시"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function StoreContextBar() {
  return (
    <div className="store-context">
      <strong>토종곱창 철산본점</strong>
      <span>MID 20250761</span>
      <span>담당자 박상일(경기)</span>
      <span>관리 4주차</span>
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
        <div className="brand-mark">온</div>
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
  checked: true,
});

function AdminDailyPage({ rows = stores }: { rows?: StoreRow[] }) {
  const [selectedDay, setSelectedDay] = useState("월");
  const [editingRoutineId, setEditingRoutineId] = useState("");
  const [dayRoutines, setDayRoutines] = useState<Record<string, AdminRoutineItem[]>>({
    월: [
      makeRoutine("월", 1, "금일 업무 단톡 공유", "진행 사항 안내 및 주간 보고서 작성 사항 확인"),
      makeRoutine("월", 2, "재계약 딜레이 확인", "ERP 확인 후 특이사항 사수에게 요청"),
      makeRoutine("월", 3, "장사닥터 재계약 갱신 여부 체크", "전 주 재계약 완료 후 업무 최신화 사항 확인"),
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
      makeRoutine("금", 3, "장사닥터 재계약 갱신", "완료 업체 정리"),
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

function Dashboard({ setView, rows = stores }: { setView: (view: ViewId) => void; rows?: StoreRow[] }) {
  const [selectedDate, setSelectedDate] = useState("2026-07-12");
  const [appliedDate, setAppliedDate] = useState("2026-07-12");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<DashboardSort>("week");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const dashboardRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = rows.filter((store) => {
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
  }, [rows, searchTerm, sortMode, sortDirection]);

  const toggleSort = (mode: DashboardSort) => {
    if (sortMode === mode) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortMode(mode);
    setSortDirection("asc");
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
            <button className="btn btn-light" onClick={() => setView("store")} type="button">
              <Building2 size={16} />
              업체 추가
            </button>
            <button className="btn btn-light" onClick={() => setView("questionnaire")} type="button">
              <LinkIcon size={16} />
              정보안내문
            </button>
          </div>
        }
      />

      <div className="filter-row toolbar">
        <div className="field">
          <label htmlFor="date">기준일</label>
          <input className="date-input" id="date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setAppliedDate(selectedDate)} type="button">
          적용
        </button>
        <span className="applied-date">적용 기준일 {appliedDate}</span>
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
              <th><button className="table-sort" onClick={() => toggleSort("inflow")} type="button">네이버 유입 / 4주 그래프 {sortArrow("inflow")}</button></th>
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
                  <button className="text-link" onClick={() => setView("store")} type="button">
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
                    onClick={() => setView("ad")}
                  />
                </td>
                <td>
                  <div className="inflow-combo">
                    <SignalButton
                      label="유입"
                      previous={store.previous.naverInflow}
                      value={store.naverInflow}
                      onClick={() => setView("inflow")}
                    />
                    <MiniBars values={store.weeklyInflow} />
                  </div>
                </td>
                <td>
                  <SignalButton
                    label="매출"
                    previous={store.previous.sales}
                    suffix="원"
                    value={store.sales}
                    onClick={() => setView("sales")}
                  />
                </td>
                <td>
                  <TaskWeeks values={store.weeklyTasks} onClick={() => setView("tasks")} />
                </td>
                <td>
                  <div className="link-stack">
                    <button className="mini-link" onClick={() => setView("owner")} type="button">
                      사장님 보고서
                    </button>
                    <button className="mini-link" onClick={() => setView("store")} type="button">
                      매장 정보
                    </button>
                    <button className="mini-link" onClick={() => setView("questionnaire")} type="button">
                      정보안내문
                    </button>
                    <button className="mini-link strong-link" onClick={() => setView("weeklyFlow")} type="button">
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
  return (
    <>
      <PageHeader title="네이버 광고 상세" description="비즈머니 잔액, 광고 성과, 캠페인 상태를 확인하는 예시 화면입니다." />
      <StoreContextBar />
      <section className="panel automation-panel">
        <h2>키워드 세트 기반 광고 자동화</h2>
        <p className="plain-text">키워드 조합/분석 페이지에서 만든 50개 태그용, 1000개 파워링크용 키워드 세트를 바탕으로 이후 자동화될 기능입니다.</p>
        <div className="automation-actions">
          <button className="btn btn-light" type="button">검색광고 태그 등록 자동화 준비중</button>
          <button className="btn btn-light" type="button">파워링크 키워드 세팅 자동화 준비중</button>
          <button className="btn btn-light" type="button">캠페인/광고그룹 생성 준비중</button>
          <button className="btn btn-light" type="button">제외키워드 입력 자동화 준비중</button>
        </div>
      </section>
      <div className="detail-grid">
        <MetricCard label="비즈머니 잔액" value="54,253원" tone="red" />
        <MetricCard label="노출수" value="116,014" />
        <MetricCard label="클릭수" value="2,597" />
        <MetricCard label="CPC" value="156원" />
      </div>
      <section className="panel">
        <h2>캠페인 목록</h2>
        <div className="list-table">
          {["장가 플레이스_메인", "장가 플레이스_중위", "장가 플레이스_하위"].map((item, index) => (
            <div className="list-row" key={item}>
              <strong>{item}</strong>
              <span className="chip green">광고 ON</span>
              <span>일예산 {(index + 7).toLocaleString()}0,000원</span>
              <span>잔여 예산 {index === 0 ? "0원" : "확인중"}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function InflowPage() {
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

  const tagSet = generatedKeywords.slice(0, 50);
  const powerlinkSet = generatedKeywords.slice(0, 1000);
  const analysisRows = makeKeywordAnalysisRows(generatedKeywords);

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

  return (
    <>
      <PageHeader
        title="네이버 유입 통계 및 키워드 분석"
        description="플레이스 CSV 업로드 후 기간별 유입 키워드, 유입 채널, 증감 데이터를 확인합니다."
        actions={
          <button className="btn btn-light" type="button">
            <Download size={16} />
            종합 CSV 다운로드
          </button>
        }
      />
      <StoreContextBar />
      <div className="filter-row toolbar">
        <input className="date-input" type="date" defaultValue="2026-06-01" />
        <input className="date-input" type="date" defaultValue="2026-06-30" />
        <button className="btn btn-primary" type="button">
          조회
        </button>
        <button className="btn btn-light" type="button">
          주간
        </button>
        <button className="btn btn-light" type="button">
          월간
        </button>
      </div>
      <div className="detail-grid">
        <MetricCard label="플레이스 유입" value="2,326" tone="red" />
        <MetricCard label="예약·주문 신청" value="6" />
        <MetricCard label="스마트콜 통화" value="0" tone="yellow" />
        <MetricCard label="리뷰 등록" value="29" />
      </div>
      <section className="panel two-col">
        <ScrollableMetricList title="유입 키워드" rows={inflowKeywords} />
        <ScrollableMetricList title="유입 채널" rows={inflowChannels} />
      </section>
      <section className="panel two-col">
        <ScrollableMetricList title="기간별 증감 유입키워드" rows={inflowKeywords.slice(0, 12)} showDiff />
        <ScrollableMetricList title="기간별 증감 유입채널" rows={inflowChannels} showDiff />
      </section>
      <section className="panel">
        <div className="section-headline">
          <h2>매장별 키워드 조합기</h2>
          <div className="filter-row">
            <button className="btn btn-primary" onClick={generateKeywords} type="button">
              조합 생성
            </button>
            <button className="btn btn-light" onClick={() => downloadKeywordCsv("tag-keywords-50.csv", tagSet)} type="button">
              태그용 CSV
            </button>
            <button className="btn btn-light" onClick={() => downloadKeywordCsv("powerlink-keywords-1000.csv", powerlinkSet)} type="button">
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
            <span className="muted-note">생성 {generatedKeywords.length.toLocaleString("ko-KR")}개 · 태그 {tagSet.length}개 · 파워링크 {powerlinkSet.length}개</span>
          </div>
        </div>
        <div className="keyword-output-grid">
          <div>
            <h3>태그용 50개 세트</h3>
            <div className="set-preview">
              {tagSet.map((keyword, index) => (
                <span key={`${keyword}-${index}`}>{keyword}</span>
              ))}
            </div>
          </div>
          <div>
            <h3>파워링크용 1000개 세트</h3>
            <div className="set-preview">
              {powerlinkSet.map((keyword, index) => (
                <span key={`${keyword}-${index}`}>{keyword}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="panel">
        <h2>검색광고 API 조회수 + 지도 노출 매장수 분석</h2>
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
              <span>{row.volume}</span>
              <span>{row.pageCount}</span>
              <span>{row.estimatedStores}</span>
              <em className={row.result === "꿀키워드" ? "good-text" : ""}>{row.result}</em>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function SalesPage() {
  return (
    <>
      <PageHeader title="여신금융 매출 데이터" description="엑셀 업로드 기반 매출, 신규/재방문, 목표매출 필요 고객수를 확인합니다." />
      <StoreContextBar />
      <div className="success-banner">
        <span>여신금융 ID 설정이 완료되었습니다.</span>
        <button className="btn btn-orange" type="button">재설정</button>
      </div>
      <div className="filter-row toolbar">
        <span>시작일:</span>
        <input className="date-input" type="date" defaultValue="2026-06-11" />
        <span>종료일:</span>
        <input className="date-input" type="date" defaultValue="2026-07-11" />
        <button className="btn btn-light" type="button">주간 데이터</button>
        <button className="btn btn-light" type="button">월간 데이터</button>
        <button className="btn btn-primary" type="button">조회</button>
      </div>
      <div className="detail-grid">
        <MetricCard label="총 매출" value="33,646,500원" tone="red" />
        <MetricCard label="신규 고객" value="214명" tone="green" />
        <MetricCard label="재방문율" value="57.2%" />
        <MetricCard label="평균 객단가" value="67,293원" />
      </div>
      <section className="panel">
        <div className="section-headline">
          <h2>날짜별 매출 + 결제수</h2>
          <div className="small-tabs">
            <button className="active" type="button">일간</button>
            <button type="button">주간</button>
            <button type="button">월간</button>
          </div>
        </div>
        <SalesComboChart />
      </section>
      <section className="panel two-col">
        <div>
          <h2>시간대별 매출</h2>
          <TimeSalesChart />
        </div>
        <div>
          <h2>요일별 매출</h2>
          <BarSet labels={["월", "화", "수", "목", "금", "토", "일"]} values={[420, 250, 230, 338, 488, 558, 386]} />
        </div>
      </section>
      <section className="panel two-col">
        <div>
          <h2>기간별 매출 통계</h2>
          <div className="stat-pill-grid">
            <strong>최저 <span>382,500원</span></strong>
            <strong>평균 <span>886,263원</span></strong>
            <strong>최고 <span>1,719,500원</span></strong>
          </div>
        </div>
        <div>
          <h2>객단가 통계</h2>
          <div className="stat-pill-grid green">
            <strong>최저 <span>40,210원</span></strong>
            <strong>평균 <span>58,563.66원</span></strong>
            <strong>최고 <span>82,513.33원</span></strong>
          </div>
        </div>
      </section>
      <section className="panel goal-planner">
        <h2>개월 목표 · 광고비 계산</h2>
        <div className="goal-line-forecast">
          <div className="goal-chart-caption">
            <strong>현재 → 6개월 목표 추정</strong>
            <span>목표 개월수, 목표 매출, 목표 재방문률, 목표 객단가를 입력하면 월별 필요 고객수가 역산되는 영역입니다.</span>
          </div>
          <svg viewBox="0 0 1120 280" role="img" aria-label="목표 매출 기반 필요 고객수 추정 그래프">
            {[0, 1, 2, 3].map((line) => (
              <line className="goal-grid-line" key={line} x1="48" x2="1072" y1={50 + line * 55} y2={50 + line * 55} />
            ))}
            {["현재", "1개월", "2개월", "3개월", "4개월", "5개월", "6개월"].map((label, index) => (
              <text key={label} x={72 + index * 160} y="246">{label}</text>
            ))}
            <path className="goal-line sales" d="M72 180 L232 160 L392 140 L552 120 L712 100 L872 80 L1032 60" />
            <path className="goal-line new" d="M72 200 L232 185 L392 170 L552 155 L712 140 L872 124 L1032 108" />
            <path className="goal-line revisit" d="M72 224 L232 219 L392 214 L552 209 L712 204 L872 199 L1032 194" />
            {[72, 232, 392, 552, 712, 872, 1032].map((x, index) => (
              <g key={x}>
                <circle className="goal-point sales" cx={x} cy={180 - index * 20} r="4" />
                <circle className="goal-point new" cx={x} cy={200 - index * 15.3} r="4" />
                <circle className="goal-point revisit" cx={x} cy={224 - index * 5} r="4" />
              </g>
            ))}
          </svg>
          <div className="goal-hover-card">
            <strong>1개월</strong>
            <span>매출 41,930,833원</span>
            <span>신규 629명</span>
            <span>재방문 55명</span>
          </div>
          <div className="goal-legend">
            <span><i className="pink" /> 목표 매출</span>
            <span><i className="purple" /> 필요 신규</span>
            <span><i className="teal" /> 필요 재방문</span>
          </div>
        </div>
        <div className="goal-panels">
          <div className="goal-form-card">
            <h3>현재 매출 관련 · 전월 합계</h3>
            <InfoLine label="매출" value="38,317,000원" />
            <InfoLine label="재방문" value="50명" />
            <InfoLine label="신규" value="575명" />
            <InfoLine label="재방문률" value="8%" />
            <InfoLine label="객단가" value="61,307원" />
          </div>
          <div className="goal-form-card">
            <h3>N개월 뒤 목표</h3>
            <label className="mock-field"><span>목표까지 개월 수</span><input readOnly value="6" /></label>
            <label className="mock-field"><span>목표 매출</span><input readOnly value="60,000,000원" /></label>
            <label className="mock-field"><span>목표 재방문률</span><input readOnly value="8%" /></label>
            <label className="mock-field"><span>목표 객단가</span><input readOnly value="61,307원" /></label>
            <InfoLine label="목표 신규" value="900명" />
            <InfoLine label="목표 재방문" value="78명" />
          </div>
        </div>
        <div className="ad-estimate-card">
          <label className="mock-field"><span>종합 CAC</span><input defaultValue="2,180원" /></label>
          <InfoLine label="증분 신규" value="54명/월" />
          <InfoLine label="광고비" value="117,720원/월" />
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
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [templateEditing, setTemplateEditing] = useState(false);
  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? stores[0];

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
        <select value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
        <strong>{selectedStore.name}</strong>
        <span>담당자 {selectedStore.manager}</span>
        <span>{selectedStore.week}</span>
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

export default function HomePage() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [previousView, setPreviousView] = useState<ViewId>("dashboard");
  const [storeRows, setStoreRows] = useState<StoreRow[]>(stores);
  const navigateTo = (view: ViewId) => {
    setPreviousView(activeView);
    setActiveView(view);
  };
  const goBack = () => setActiveView(previousView);

  useEffect(() => {
    const savedRows = window.localStorage.getItem("erp:store-rows");
    if (!savedRows) return;
    try {
      setStoreRows(JSON.parse(savedRows) as StoreRow[]);
    } catch {
      window.localStorage.removeItem("erp:store-rows");
    }
  }, []);

  const saveStoreRow = (profile: { storeName: string; manager: string; contractPeriod: string; memo: string }) => {
    const normalizedName = profile.storeName.trim() || "신규 매장";
    setStoreRows((currentRows) => {
      const nextRow: StoreRow = {
        id: `store-${normalizedName}`,
        week: profile.contractPeriod === "4주" ? "1주차" : "신규",
        name: normalizedName,
        manager: profile.manager || "미배정",
        bizMoney: null,
        naverInflow: null,
        sales: null,
        previous: { bizMoney: null, naverInflow: null, sales: null },
        weeklyInflow: [0, 0, 0, 0],
        weeklyTasks: [0, 0, 0, 0],
        memo: profile.memo,
      };
      const exists = currentRows.some((row) => row.name === normalizedName);
      const nextRows = exists ? currentRows.map((row) => (row.name === normalizedName ? { ...row, ...nextRow, id: row.id } : row)) : [...currentRows, nextRow];
      window.localStorage.setItem("erp:store-rows", JSON.stringify(nextRows));
      return nextRows;
    });
  };

  const content = useMemo(() => {
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
        return <StoreInfoPage weeklyTasks={weeklyTasks} onBack={goBack} setView={navigateTo} onSaveStore={saveStoreRow} />;
      case "questionnaire":
        return <QuestionnairePage />;
      case "weeklyFlow":
        return <WeeklyFlowPage setView={navigateTo} />;
      default:
        return <Dashboard setView={navigateTo} rows={storeRows} />;
    }
  }, [activeView, previousView, storeRows]);

  return (
    <div className="erp-shell">
      <Sidebar activeView={activeView} setView={navigateTo} />
      <main className="main">{content}</main>
    </div>
  );
}





