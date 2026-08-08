import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import {
  buildCreditTransactionUid,
  CREDIT_FINANCE_PARSER_VERSION,
  parseCreditFinanceWorkbook,
} from "@/lib/credit-finance/parser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "erp-private-uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const INSERT_BATCH_SIZE = 500;

function safeFileName(name: string) {
  return name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function monthPath(date: string) {
  return date.slice(0, 7);
}

function workbookContentType(fileName: string) {
  return /\.xlsx$/i.test(fileName)
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/vnd.ms-excel";
}

export async function GET(request: Request) {
  const initialAuth = authenticateRequest(request);
  if (!initialAuth.ok) return authFailureResponse(initialAuth);
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId")?.trim();
    const start = url.searchParams.get("start")?.trim();
    const end = url.searchParams.get("end")?.trim();
    if (!storeId) return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    const storeAuth = authenticateRequest(request, { storeId });
    if (!storeAuth.ok) return authFailureResponse(storeAuth);

    const supabase = getSupabaseAdmin();
    let importQuery = supabase
      .from("erp_card_imports")
      .select("id,store_id,file_name,period_start,period_end,parser_version,status,raw_row_count,normalized_row_count,raw_amount_sum,net_sales,net_payment_count,amount_per_payment,warnings,uploaded_at")
      .eq("store_id", storeId)
      .eq("status", "ready")
      .order("period_start", { ascending: false });
    let summaryQuery = supabase
      .from("erp_card_daily_summary")
      .select("store_id,transaction_date,net_sales,net_payment_count,amount_per_payment")
      .eq("store_id", storeId)
      .order("transaction_date");
    let hourlyQuery = supabase
      .from("erp_card_hourly_summary")
      .select("transaction_date,transaction_hour,net_sales,net_payment_count")
      .eq("store_id", storeId)
      .order("transaction_hour");
    if (start) {
      importQuery = importQuery.gte("period_end", start);
      summaryQuery = summaryQuery.gte("transaction_date", start);
      hourlyQuery = hourlyQuery.gte("transaction_date", start);
    }
    if (end) {
      importQuery = importQuery.lte("period_start", end);
      summaryQuery = summaryQuery.lte("transaction_date", end);
      hourlyQuery = hourlyQuery.lte("transaction_date", end);
    }

    let selectedCustomerQuery = supabase.from("erp_card_transactions").select("card_issuer,masked_card_display").eq("store_id", storeId).eq("transaction_type", "approval").not("masked_card_display", "is", null);
    let priorCustomerQuery = supabase.from("erp_card_transactions").select("card_issuer,masked_card_display").eq("store_id", storeId).eq("transaction_type", "approval").not("masked_card_display", "is", null);
    if (start) {
      selectedCustomerQuery = selectedCustomerQuery.gte("transaction_date", start);
      priorCustomerQuery = priorCustomerQuery.lt("transaction_date", start);
    }
    if (end) selectedCustomerQuery = selectedCustomerQuery.lte("transaction_date", end);
    const [importResult, summaryResult, hourlyResult, selectedCustomerResult, priorCustomerResult] = await Promise.all([importQuery, summaryQuery, hourlyQuery, selectedCustomerQuery, priorCustomerQuery]);
    const firstError = importResult.error ?? summaryResult.error ?? hourlyResult.error ?? selectedCustomerResult.error ?? priorCustomerResult.error;
    if (firstError) throw firstError;

    const daily = summaryResult.data ?? [];
    const totalSales = daily.reduce((sum, row) => sum + Number(row.net_sales ?? 0), 0);
    const netPaymentCount = daily.reduce((sum, row) => sum + Number(row.net_payment_count ?? 0), 0);
    const weekdayMap = new Map<number, { netSales: number; netPaymentCount: number }>();
    daily.forEach((row) => {
      const weekday = new Date(`${row.transaction_date}T00:00:00+09:00`).getDay();
      const current = weekdayMap.get(weekday) ?? { netSales: 0, netPaymentCount: 0 };
      current.netSales += Number(row.net_sales ?? 0);
      current.netPaymentCount += Number(row.net_payment_count ?? 0);
      weekdayMap.set(weekday, current);
    });

    const hourMap = new Map<number, { netSales: number; netPaymentCount: number }>();
    (hourlyResult.data ?? []).forEach((row) => {
      const hour = Number(row.transaction_hour);
      const current = hourMap.get(hour) ?? { netSales: 0, netPaymentCount: 0 };
      current.netSales += Number(row.net_sales ?? 0);
      current.netPaymentCount += Number(row.net_payment_count ?? 0);
      hourMap.set(hour, current);
    });

    const customerKey = (row: { card_issuer: string | null; masked_card_display: string | null }) => row.masked_card_display ? `${row.card_issuer ?? "unknown"}:${row.masked_card_display}` : null;
    const selectedCustomers = new Set((selectedCustomerResult.data ?? []).map(customerKey).filter((value): value is string => Boolean(value)));
    const priorCustomers = new Set((priorCustomerResult.data ?? []).map(customerKey).filter((value): value is string => Boolean(value)));
    const returningCustomerCount = [...selectedCustomers].filter((key) => priorCustomers.has(key)).length;
    const newCustomerCount = selectedCustomers.size - returningCustomerCount;

    return NextResponse.json({
      imports: importResult.data ?? [],
      daily,
      hourly: [...hourMap.entries()].map(([hour, value]) => ({ hour, ...value })),
      weekdays: [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
        weekday,
        ...(weekdayMap.get(weekday) ?? { netSales: 0, netPaymentCount: 0 }),
      })),
      totals: {
        netSales: totalSales,
        netPaymentCount,
        amountPerPayment: netPaymentCount > 0 ? Math.round(totalSales / netPaymentCount) : null,
      },
      customerMetrics: {
        identifiableCustomerCount: selectedCustomers.size,
        newCustomerCount,
        returningCustomerCount,
        returningRate: selectedCustomers.size ? Number(((returningCustomerCount / selectedCustomers.size) * 100).toFixed(1)) : null,
        averageCustomerTicket: selectedCustomers.size ? Math.round(totalSales / selectedCustomers.size) : null,
        basis: "card_mask",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Credit-finance query failed" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const initialAuth = authenticateRequest(request);
  if (!initialAuth.ok) return authFailureResponse(initialAuth);
  let importId = "";
  try {
    const form = await request.formData();
    const storeId = String(form.get("storeId") ?? "").trim();
    const file = form.get("file");
    if (!storeId || !(file instanceof File)) {
      return NextResponse.json({ error: "storeId and XLS file are required" }, { status: 400 });
    }
    const storeAuth = authenticateRequest(request, { storeId });
    if (!storeAuth.ok) return authFailureResponse(storeAuth);
    if (!/\.xlsx?$/i.test(file.name)) {
      return NextResponse.json({ error: "XLS or XLSX file only" }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "XLS file must be 10 MB or smaller" }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sourceHash = createHash("sha256").update(bytes).digest("hex");
    const parsed = parseCreditFinanceWorkbook(bytes);
    const supabase = getSupabaseAdmin();

    const { data: store, error: storeError } = await supabase
      .from("erp_stores")
      .select("id,name")
      .eq("id", storeId)
      .single();
    if (storeError || !store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const { data: duplicate } = await supabase
      .from("erp_card_imports")
      .select("id,store_id,file_name,period_start,period_end,status,net_sales,net_payment_count,amount_per_payment,uploaded_at")
      .eq("store_id", storeId)
      .eq("source_hash", sourceHash)
      .maybeSingle();
    if (duplicate) return NextResponse.json({ import: duplicate, duplicate: true });

    const storagePath = `${storeId}/credit-finance/${monthPath(parsed.periodStart)}/${Date.now()}-${safeFileName(file.name)}`;
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      // Windows browsers often report legacy .xls files as application/octet-stream.
      // The private bucket only permits the explicit Excel MIME types, so trust the
      // already-validated extension rather than the browser-provided MIME value.
      contentType: workbookContentType(file.name),
      upsert: false,
    });
    if (storageError) throw storageError;

    const { data: importRow, error: importError } = await supabase
      .from("erp_card_imports")
      .insert({
        store_id: storeId,
        file_name: file.name,
        source_hash: sourceHash,
        raw_storage_path: storagePath,
        period_start: parsed.periodStart,
        period_end: parsed.periodEnd,
        parser_version: CREDIT_FINANCE_PARSER_VERSION,
        status: "processing",
        raw_row_count: parsed.rawRowCount,
        normalized_row_count: parsed.transactions.length,
        raw_amount_sum: parsed.rawAmountSum,
        net_sales: parsed.netSales,
        net_payment_count: parsed.netPaymentCount,
        amount_per_payment: parsed.amountPerPayment,
        warnings: parsed.warnings,
      })
      .select("id")
      .single();
    if (importError) throw importError;
    importId = importRow.id;

    const uidsByRow = new Map<number, string>();
    for (const transaction of parsed.transactions) {
      uidsByRow.set(transaction.sourceRowNumber, buildCreditTransactionUid(storeId, transaction));
    }
    const records = parsed.transactions.map((transaction) => ({
      import_id: importId,
      store_id: storeId,
      transaction_uid: uidsByRow.get(transaction.sourceRowNumber),
      source_row_number: transaction.sourceRowNumber,
      transaction_type: transaction.transactionType,
      transaction_date: transaction.transactionDate,
      transaction_time: transaction.transactionTime,
      transaction_at: `${transaction.transactionDate}T${transaction.transactionTime}+09:00`,
      card_issuer: transaction.cardIssuer,
      affiliate_name: transaction.affiliateName,
      masked_card_display: transaction.maskedCardDisplay,
      approval_number: transaction.approvalNumber,
      amount_signed: transaction.amountSigned,
      amount_abs: transaction.amountAbs,
      installment: transaction.installment,
      cancellation_match_status: transaction.cancellationMatchStatus,
      matched_transaction_uid: transaction.matchedSourceRowNumber
        ? uidsByRow.get(transaction.matchedSourceRowNumber) ?? null
        : null,
      quality_flags: transaction.qualityFlags,
      raw_row: transaction.rawRow,
    }));

    for (let index = 0; index < records.length; index += INSERT_BATCH_SIZE) {
      const { error } = await supabase
        .from("erp_card_transactions")
        .upsert(records.slice(index, index + INSERT_BATCH_SIZE), { onConflict: "transaction_uid", ignoreDuplicates: true });
      if (error) throw error;
    }

    const { data: readyImport, error: readyError } = await supabase
      .from("erp_card_imports")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", importId)
      .select("id,store_id,file_name,period_start,period_end,status,raw_row_count,normalized_row_count,net_sales,net_payment_count,amount_per_payment,warnings,uploaded_at")
      .single();
    if (readyError) throw readyError;

    return NextResponse.json({ import: readyImport, duplicate: false }, { status: 201 });
  } catch (error) {
    if (importId) {
      const supabase = getSupabaseAdmin();
      await supabase.from("erp_card_imports").update({
        status: "failed",
        parse_error: error instanceof Error ? error.message : "Unknown import failure",
        updated_at: new Date().toISOString(),
      }).eq("id", importId);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Credit-finance upload failed" },
      { status: 500 },
    );
  }
}
