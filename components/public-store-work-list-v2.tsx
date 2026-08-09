"use client";

import { useState } from "react";
import type { PublicStoreWorkItem } from "@/components/public-store-work-list";

function dateLabel(date: string | null) {
  if (!date) return "일정 미정";
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", weekday: "short" })
    .format(new Date(`${date}T00:00:00+09:00`));
}

export function PublicStoreWorkListV2({ items, contractWeeks }: { items: PublicStoreWorkItem[]; contractWeeks: number }) {
  const [openedId, setOpenedId] = useState<string>("");
  const weeks = Array.from({ length: Math.max(1, contractWeeks) }, (_, index) => index + 1);

  if (!items.length) return <p className="public-empty">공개할 업무가 아직 없습니다.</p>;

  return (
    <div className="public-work-list">
      {weeks.map((week) => {
        const weekItems = items.filter((item) => item.week === week);
        if (!weekItems.length) return null;
        return (
          <section className="public-work-week" key={week}>
            <h3>{week}주차 업무</h3>
            {weekItems.map((item) => {
              const written = Boolean(item.evidenceText || item.evidenceUrls.length);
              const opened = openedId === item.id;
              return (
                <article className="public-work-entry" key={item.id}>
                  <button className="public-work-row" onClick={() => setOpenedId(opened ? "" : item.id)} type="button">
                    <span>{dateLabel(item.date)}</span>
                    <strong>{item.title}</strong>
                    <em className={written ? "done" : "pending"}>{written ? "기입완료" : "미기입"}</em>
                  </button>
                  {opened && (
                    <div className="public-work-detail">
                      {item.evidenceText ? <p>{item.evidenceText}</p> : <p>아직 업무 처리 내용이 작성되지 않았습니다.</p>}
                      {item.evidenceUrls.length > 0 && (
                        <ul>{item.evidenceUrls.map((url, index) => <li key={`${url}-${index}`}><a href={url} rel="noreferrer" target="_blank">첨부 자료 {index + 1} 열기</a></li>)}</ul>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
