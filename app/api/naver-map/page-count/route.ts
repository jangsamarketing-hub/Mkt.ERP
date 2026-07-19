import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";

export const runtime = "nodejs";

function inferPageCount(payload: unknown): number | null {
  const seen = new Set<unknown>();
  const scan = (value: unknown): number | null => {
    if (!value || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = scan(item);
        if (found !== null) return found;
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    const directKeys = ["totalPage", "pageCount", "totalPages", "lastPage"];
    for (const key of directKeys) {
      const numberValue = Number(record[key]);
      if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
    }

    const total = Number(record.totalCount ?? record.total ?? record.count);
    if (Number.isFinite(total) && total > 0) return Math.max(1, Math.ceil(total / 50));

    for (const item of Object.values(record)) {
      const found = scan(item);
      if (found !== null) return found;
    }
    return null;
  };

  return scan(payload);
}

export async function GET(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim();

  if (!keyword) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  const url = new URL("https://map.naver.com/p/api/search/allSearch");
  url.searchParams.set("query", keyword);
  url.searchParams.set("type", "all");
  url.searchParams.set("searchCoord", "126.9783882;37.5666103");
  url.searchParams.set("boundary", "");

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json, text/plain, */*",
        referer: "https://map.naver.com/",
        "user-agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });
    const payload = await response.json();

    if (payload?.result?.ncaptcha || payload?.ncaptcha) {
      return NextResponse.json({ keyword, pageCount: null, status: "blocked" });
    }

    return NextResponse.json({
      keyword,
      pageCount: inferPageCount(payload),
      status: "ok",
    });
  } catch {
    return NextResponse.json({ keyword, pageCount: null, status: "failed" });
  }
}
