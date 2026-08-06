"use client";

import { FormEvent, useState } from "react";

type InformationField = {
  key: string;
  label: string;
  required?: boolean;
  type?: "tel";
  multiline?: boolean;
};

const fields: InformationField[] = [
  { key: "storeName", label: "업체명", required: true },
  { key: "ownerName", label: "대표자명", required: true },
  { key: "ownerPhone", label: "대표님 연락처", required: true, type: "tel" },
  { key: "storeAddress", label: "매장 주소" },
  { key: "storePhone", label: "매장 연락처", type: "tel" },
  { key: "businessHours", label: "운영시간" },
  { key: "breakTime", label: "브레이크타임" },
  { key: "closedDays", label: "휴무일" },
  { key: "placeUrl", label: "네이버 플레이스 URL" },
  { key: "placeMid", label: "네이버 플레이스 MID" },
  { key: "instagramHandle", label: "인스타그램 계정" },
  { key: "kakaoChannelUrl", label: "카카오톡 채널 주소" },
  { key: "mainMenus", label: "대표 메뉴와 꼭 팔고 싶은 메뉴", multiline: true },
  { key: "averageOrderValue", label: "현재 객단가" },
  { key: "tableCount", label: "테이블 수" },
  { key: "peakHours", label: "주력 시간대" },
  { key: "targetCustomers", label: "주요 고객층과 방문 상황", multiline: true },
  { key: "repeatCustomerRate", label: "단골 고객 비중" },
  { key: "monthlySalesTarget", label: "월 목표 매출" },
  { key: "storeStrengths", label: "매장 강점과 차별점", multiline: true },
  { key: "currentConcerns", label: "현재 가장 고민되는 문제", multiline: true },
  { key: "competitors", label: "경쟁 매장" },
  { key: "desiredKeywords", label: "희망 키워드", multiline: true },
  { key: "avoidMarketing", label: "하지 않았으면 하는 마케팅", multiline: true },
  { key: "expectedOutcome", label: "기대하는 성과", multiline: true },
  { key: "brandStory", label: "브랜드 스토리와 꼭 알리고 싶은 이야기", multiline: true },
  { key: "additionalRequests", label: "추가 요청사항", multiline: true },
];

export function PublicStoreInformationForm({ mid, storeName }: { mid: string; storeName: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({ storeName });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

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
      if (!response.ok) throw new Error(payload.error ?? "정보안내문 저장에 실패했습니다.");
      setStatus("정보안내문을 전달했습니다. 담당 매니저가 확인 후 매장 준비에 반영합니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "정보안내문 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="public-information-form" onSubmit={submit}>
      <p className="public-form-notice">{storeName}의 마케팅 준비를 위한 정보안내문입니다. 비밀번호, 인증번호, 카드번호는 입력하지 마세요.</p>
      {fields.map((field) => (
        <label className="public-form-field" key={field.key}>
          <span>{field.label}{field.required ? " *" : ""}</span>
          {field.multiline ? (
            <textarea value={answers[field.key] ?? ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })} />
          ) : (
            <input required={field.required} type={field.type ?? "text"} value={answers[field.key] ?? ""} onChange={(event) => setAnswers({ ...answers, [field.key]: event.target.value })} />
          )}
        </label>
      ))}
      <button className="public-submit-button" disabled={saving} type="submit">{saving ? "전송 중" : "정보안내문 전달"}</button>
      {status && <p className="public-form-status" role="status">{status}</p>}
    </form>
  );
}
