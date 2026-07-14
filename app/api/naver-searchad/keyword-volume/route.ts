import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SearchAdKeyword = {
  relKeyword?: string;
  monthlyPcQcCnt?: string | number;
  monthlyMobileQcCnt?: string | number;
};

function makeSignature(timestamp: string, method: string, uri: string, secretKey: string) {
  return crypto
    .createHmac("sha256", secretKey)
    .update(`${timestamp}.${method}.${uri}`)
    .digest("base64");
}

function toNumber(value: string | number | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  if (String(value).includes("<")) return 0;
  return Number(String(value).replace(/[^\d]/g, "")) || 0;
}

export async function POST(request: Request) {
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID;
  const accessLicense = process.env.NAVER_SEARCHAD_ACCESS_LICENSE;
  const secretKey = process.env.NAVER_SEARCHAD_SECRET_KEY;

  if (!customerId || !accessLicense || !secretKey) {
    return NextResponse.json(
      { error: "NAVER_SEARCHAD_CUSTOMER_ID, NAVER_SEARCHAD_ACCESS_LICENSE, NAVER_SEARCHAD_SECRET_KEY are required" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const keywords = Array.from(new Set((body.keywords ?? []).map((keyword: unknown) => String(keyword).trim()).filter(Boolean))) as string[];
  if (keywords.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const rows: { keyword: string; volume: number; pc: number; mobile: number }[] = [];
  const chunks = Array.from({ length: Math.ceil(keywords.length / 5) }, (_, index) => keywords.slice(index * 5, index * 5 + 5));

  for (const chunk of chunks) {
    const method = "GET";
    const uri = "/keywordstool";
    const timestamp = Date.now().toString();
    const url = new URL(`https://api.searchad.naver.com${uri}`);
    url.searchParams.set("hintKeywords", chunk.join(","));
    url.searchParams.set("showDetail", "1");

    const response = await fetch(url, {
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": accessLicense,
        "X-Customer": customerId,
        "X-Signature": makeSignature(timestamp, method, uri, secretKey),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "searchad request failed", status: response.status }, { status: 502 });
    }

    const payload = await response.json();
    const keywordList = (payload.keywordList ?? []) as SearchAdKeyword[];
    for (const [index, item] of keywordList.entries()) {
      const returnedKeyword = item.relKeyword ?? "";
      const keyword = chunk.includes(returnedKeyword) ? returnedKeyword : chunk[index] ?? returnedKeyword;
      if (!keyword) continue;
      const pc = toNumber(item.monthlyPcQcCnt);
      const mobile = toNumber(item.monthlyMobileQcCnt);
      rows.push({ keyword, pc, mobile, volume: pc + mobile });
    }
  }

  return NextResponse.json({ rows });
}
