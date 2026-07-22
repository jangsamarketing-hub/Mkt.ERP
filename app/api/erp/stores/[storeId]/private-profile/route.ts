import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ storeId: string }> };

const MAX_PHONE_LENGTH = 40;
const MAX_BUSINESS_NUMBER_LENGTH = 40;
const MAX_NOTES_LENGTH = 10_000;

function optionalText(value: unknown, maxLength: number, fieldName: string) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (text.length > maxLength) throw new Error(`${fieldName} is too long`);
  return text || null;
}

function privateProfileAuth(request: Request, storeId: string) {
  return authenticateRequest(request, { storeId, roles: ["admin", "staff"] });
}

export async function GET(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = privateProfileAuth(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("erp_store_private_profiles")
      .select("store_id,owner_phone,business_registration_number,special_notes,business_registration_storage_path,updated_at")
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ profile: data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Private profile query failed" },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const auth = privateProfileAuth(request, storeId);
  if (!auth.ok) return authFailureResponse(auth);

  try {
    const body = await request.json() as Record<string, unknown>;
    const ownerPhone = optionalText(body.ownerPhone, MAX_PHONE_LENGTH, "ownerPhone");
    const businessRegistrationNumber = optionalText(
      body.businessRegistrationNumber,
      MAX_BUSINESS_NUMBER_LENGTH,
      "businessRegistrationNumber",
    );
    const specialNotes = optionalText(body.specialNotes, MAX_NOTES_LENGTH, "specialNotes");

    const { data, error } = await getSupabaseAdmin()
      .from("erp_store_private_profiles")
      .upsert({
        store_id: storeId,
        owner_phone: ownerPhone,
        business_registration_number: businessRegistrationNumber,
        special_notes: specialNotes,
      }, { onConflict: "store_id" })
      .select("store_id,owner_phone,business_registration_number,special_notes,business_registration_storage_path,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Private profile update failed";
    return NextResponse.json({ error: message }, { status: message.includes("too long") ? 400 : 500 });
  }
}
