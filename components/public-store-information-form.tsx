"use client";

import { FormEvent, useMemo, useState } from "react";

type InformationField = {
  key: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  type?: "tel" | "url" | "number";
};

type InformationSection = {
  title: string;
  description: string;
  fields: InformationField[];
};

const sections: InformationSection[] = [
  {
    title: "1. 기본 정보",
    description: "계약과 매장 원장에 사용할 기본 정보를 작성해주세요.",
    fields: [
      { key: "storeName", label: "업체명", required: true },
      { key: "ownerName", label: "대표자명", required: true },
      { key: "ownerPhone", label: "대표님 연락처", required: true, type: "tel" },
      { key: "storeAddress", label: "매장 주소" },
      { key: "storePhone", label: "매장 연락처", type: "tel" },
      { key: "businessHours", label: "운영시간" },
      { key: "breakTime", label: "브레이크 타임" },
      { key: "closedDays", label: "휴무일" },
    ],
  },
  {
    title: "2. 네이버·플레이스",
    description: "플레이스 분석과 순위 추적에 필요한 공개 식별 정보입니다.",
    fields: [
      { key: "naverId", label: "네이버 ID" },
      { key: "placeUrl", label: "네이버 플레이스 URL", type: "url" },
      { key: "placeMid", label: "플레이스 MID" },
      { key: "searchAdCustomerId", label: "검색광고 Customer ID" },
      { key: "placeManagementStatus", label: "현재 플레이스 관리 상태", multiline: true },
    ],
  },
  {
    title: "3. SNS·외부 채널",
    description: "현재 운영 중인 채널과 링크를 적어주세요.",
    fields: [
      { key: "instagramHandle", label: "인스타그램 계정" },
      { key: "kakaoChannelUrl", label: "카카오톡 채널 주소", type: "url" },
      { key: "googleBusinessUrl", label: "구글 매장 링크", type: "url" },
      { key: "deliveryApps", label: "사용 중인 배달앱·외부 채널", multiline: true },
    ],
  },
  {
    title: "4. 매장 운영 정보",
    description: "매출과 고객 흐름을 이해하기 위한 운영 정보입니다.",
    fields: [
      { key: "mainMenus", label: "대표 메뉴와 잘 나가는 메뉴", multiline: true },
      { key: "averageOrderValue", label: "현재 객단가" },
      { key: "tableCount", label: "테이블 수", type: "number" },
      { key: "peakHours", label: "주력 시간대" },
      { key: "targetCustomers", label: "주력 고객층과 방문 상황", multiline: true },
      { key: "repeatCustomerRate", label: "단골 고객 비중" },
      { key: "monthlySalesTarget", label: "월 목표 매출" },
    ],
  },
  {
    title: "5. 마케팅 방향",
    description: "우리 매장에 맞는 전략을 잡기 위한 질문입니다.",
    fields: [
      { key: "currentConcerns", label: "현재 가장 고민되는 문제", multiline: true },
      { key: "storeStrengths", label: "매장 강점·차별점", multiline: true },
      { key: "competitors", label: "경쟁 매장" },
      { key: "desiredKeywords", label: "희망 키워드", multiline: true },
      { key: "avoidMarketing", label: "하지 않았으면 하는 마케팅", multiline: true },
      { key: "expectedOutcome", label: "기대하는 성과", multiline: true },
    ],
  },
  {
    title: "6. 대표님·브랜드 스토리",
    description: "사장님과 매장의 이야기를 마케팅 메시지에 반영합니다.",
    fields: [
      { key: "ownerCareer", label: "대표님 업력·이력" },
      { key: "openingReason", label: "창업 계기" },
      { key: "brandStory", label: "브랜드 스토리", multiline: true },
      { key: "specialIngredients", label: "특별 식재료·조리 방식", multiline: true },
      { key: "mediaHistory", label: "방송·언론·수상 이력" },
    ],
  },
  {
    title: "7. 메뉴·가격",
    description: "콘텐츠와 광고 문구에 사용할 메뉴 정보를 적어주세요.",
    fields: [
      { key: "menuOne", label: "대표 메뉴 1" },
      { key: "menuTwo", label: "대표 메뉴 2" },
      { key: "menuThree", label: "대표 메뉴 3" },
      { key: "setMenus", label: "세트 메뉴" },
      { key: "seasonMenus", label: "시즌 메뉴" },
    ],
  },
  {
    title: "8. 리뷰·이벤트",
    description: "고객 재방문과 리뷰 동선을 진단합니다.",
    fields: [
      { key: "reviewEventStatus", label: "리뷰 이벤트 운영 여부", multiline: true },
      { key: "reviewBenefit", label: "현재 제공 혜택", multiline: true },
      { key: "returnVisitMethod", label: "재방문 유도 방식", multiline: true },
      { key: "customerNotes", label: "고객 반응 또는 자주 받는 요청", multiline: true },
    ],
  },
  {
    title: "9. 추가 요청",
    description: "사전에 꼭 알아야 할 요청이나 주의사항을 적어주세요.",
    fields: [
      { key: "additionalRequests", label: "사장님 요청사항", multiline: true },
      { key: "avoidExpressions", label: "주의해야 할 표현", multiline: true },
      { key: "additionalNotes", label: "기타 메모", multiline: true },
    ],
  },
];

export function PublicStoreInformationForm({ mid, storeName }: { mid: string; storeName: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({ storeName });
  const [activeSection, setActiveSection] = useState(0);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const completedSections = useMemo(() => sections.map((section) => {
    const filled = section.fields.filter((field) => answers[field.key]?.trim()).length;
    return { filled, total: section.fields.length };
  }), [answers]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch(`/api/public/stores/${encodeURIComponent(mid)}/information`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "정보안내문 제출에 실패했습니다.");
      setStatus("제출이 완료되었습니다. 담당 매니저가 확인 후 매장 준비에 반영합니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "정보안내문 제출에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const section = sections[activeSection];
  return (
    <form className="public-information-form" onSubmit={submit}>
      <p className="public-form-notice">{storeName} 마케팅 시작 전 정보안내문입니다. 비밀번호, 인증번호, 카드번호는 이 링크에 입력하지 마세요.</p>
      <div className="steps" aria-label="정보안내문 진행 단계">
        {sections.map((item, index) => {
          const progress = completedSections[index];
          const state = progress.filled === 0 ? "empty" : progress.filled === progress.total ? "complete" : "partial";
          return <button className={`step-button ${state} ${activeSection === index ? "active" : ""}`} key={item.title} onClick={() => setActiveSection(index)} type="button">{index + 1}</button>;
        })}
      </div>
      <section className="form-section public-form-section">
        <h3>{section.title}</h3>
        <p className="plain-text">{section.description}</p>
        {section.fields.map((field) => (
          <label className="public-form-field" key={field.key}>
            <span>{field.label}{field.required ? " *" : ""}</span>
            {field.multiline ? (
              <textarea value={answers[field.key] ?? ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })} />
            ) : (
              <input required={field.required} type={field.type ?? "text"} value={answers[field.key] ?? ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })} />
            )}
          </label>
        ))}
      </section>
      <div className="filter-row public-form-actions">
        <button className="btn btn-light" disabled={activeSection === 0} onClick={() => setActiveSection((current) => Math.max(0, current - 1))} type="button">이전</button>
        {activeSection < sections.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setActiveSection((current) => Math.min(sections.length - 1, current + 1))} type="button">다음</button>
        ) : (
          <button className="public-submit-button" disabled={saving} type="submit">{saving ? "제출 중" : "정보안내문 제출"}</button>
        )}
      </div>
      {status && <p className="public-form-status" role="status">{status}</p>}
    </form>
  );
}
