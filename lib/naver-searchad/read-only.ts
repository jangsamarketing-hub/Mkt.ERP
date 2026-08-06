import crypto from "node:crypto";

const SEARCHAD_BASE_URL = "https://api.searchad.naver.com";

type Campaign = {
  nccCampaignId?: string;
  name?: string;
  campaignTp?: string;
  status?: string;
  userLock?: boolean;
  dailyBudget?: number;
};

type StatRow = {
  id?: string;
  impCnt?: number;
  clkCnt?: number;
  salesAmt?: number;
  ctr?: number;
  cpc?: number;
  avgRnk?: number;
  ccnt?: number;
};

export type SearchAdCampaignDailyStat = {
  campaignId: string;
  campaignName: string | null;
  campaignType: string | null;
  campaignStatus: string | null;
  dailyBudget: number | null;
  impressions: number;
  clicks: number;
  adSpend: number;
  ctr: number | null;
  averageCpc: number | null;
  averageRank: number | null;
  conversions: number | null;
  rawMetrics: StatRow;
};

export type SearchAdReadOnlyResult = {
  customerId: string;
  campaigns: SearchAdCampaignDailyStat[];
  campaignCount: number;
  activeCampaignCount: number;
  balance: number | null;
  balanceStatus: "available" | "unavailable" | "failed";
  rawAccount: Record<string, unknown>;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function makeSignature(timestamp: string, method: string, uri: string, secretKey: string) {
  return crypto.createHmac("sha256", secretKey).update(`${timestamp}.${method}.${uri}`).digest("base64");
}

function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function requestSearchAd<T>(customerId: string, uri: string, search: URLSearchParams = new URLSearchParams()) {
  const accessLicense = requiredEnv("NAVER_SEARCHAD_ACCESS_LICENSE");
  const secretKey = requiredEnv("NAVER_SEARCHAD_SECRET_KEY");
  const timestamp = Date.now().toString();
  const url = new URL(`${SEARCHAD_BASE_URL}${uri}`);
  search.forEach((value, key) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": accessLicense,
      "X-Customer": customerId,
      "X-Signature": makeSignature(timestamp, "GET", uri, secretKey),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Naver SearchAd ${uri} failed (${response.status})${body ? `: ${body.slice(0, 300)}` : ""}`);
  }
  return response.json() as Promise<T>;
}

async function requestOptionalBalance(customerId: string) {
  // The official report API does not document a common balance endpoint for every account.
  // Keep the value explicitly unavailable until the pilot account proves an approved endpoint.
  return { balance: null, status: "unavailable" as const, raw: {} };
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export async function fetchSearchAdReadOnlySnapshot(customerId: string, statDate: string): Promise<SearchAdReadOnlyResult> {
  const campaigns = await requestSearchAd<Campaign[]>(customerId, "/ncc/campaigns");
  const validCampaigns = campaigns.filter((campaign) => Boolean(campaign.nccCampaignId));
  const statsById = new Map<string, StatRow>();

  for (const campaignBatch of chunk(validCampaigns, 100)) {
    const ids = campaignBatch.map((campaign) => campaign.nccCampaignId!).join(",");
    const params = new URLSearchParams({
      ids,
      fields: '["impCnt","clkCnt","salesAmt","ctr","cpc","avgRnk","ccnt"]',
      timeIncrement: "allDays",
      timeRange: JSON.stringify({ since: statDate, until: statDate }),
    });
    const payload = await requestSearchAd<{ data?: StatRow[] }>(customerId, "/stats", params);
    for (const row of payload.data ?? []) if (row.id) statsById.set(row.id, row);
  }

  const rows = validCampaigns.map((campaign) => {
    const campaignId = campaign.nccCampaignId!;
    const stat = statsById.get(campaignId) ?? {};
    const impressions = numberOrNull(stat.impCnt) ?? 0;
    const clicks = numberOrNull(stat.clkCnt) ?? 0;
    const adSpend = numberOrNull(stat.salesAmt) ?? 0;
    return {
      campaignId,
      campaignName: campaign.name ?? null,
      campaignType: campaign.campaignTp ?? null,
      campaignStatus: campaign.status ?? (campaign.userLock ? "OFF" : "ON"),
      dailyBudget: numberOrNull(campaign.dailyBudget),
      impressions,
      clicks,
      adSpend,
      ctr: numberOrNull(stat.ctr) ?? (impressions ? (clicks / impressions) * 100 : null),
      averageCpc: numberOrNull(stat.cpc) ?? (clicks ? adSpend / clicks : null),
      averageRank: numberOrNull(stat.avgRnk),
      conversions: numberOrNull(stat.ccnt),
      rawMetrics: stat,
    } satisfies SearchAdCampaignDailyStat;
  });

  const balance = await requestOptionalBalance(customerId);
  return {
    customerId,
    campaigns: rows,
    campaignCount: rows.length,
    activeCampaignCount: rows.filter((row) => row.campaignStatus !== "OFF").length,
    balance: balance.balance,
    balanceStatus: balance.status,
    rawAccount: { campaigns, balance: balance.raw },
  };
}
