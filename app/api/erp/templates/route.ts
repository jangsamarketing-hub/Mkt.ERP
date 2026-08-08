import { NextResponse } from "next/server";
import { authenticateRequest, authFailureResponse } from "@/lib/auth/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const TEMPLATE_KEYS = new Set(["store_profile", "owner_report", "information_guide"]);

function templateKey(value: unknown) {
  const key = String(value ?? "").trim();
  if (!TEMPLATE_KEYS.has(key)) throw new Error("Unknown template key");
  return key;
}

function normalizeTemplate(body: Record<string, unknown>) {
  const key = templateKey(body.templateKey);
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const definition = body.definition;
  if (!title || title.length > 120) throw new Error("Title is required");
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) throw new Error("Definition must be an object");
  return { template_key: key, title, description, definition };
}

export async function GET(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin", "staff"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("erp_admin_templates")
      .select("template_key,title,description,definition,updated_at")
      .order("template_key");
    if (error) throw error;
    return NextResponse.json({ templates: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Template query failed" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const auth = authenticateRequest(request, { roles: ["admin"] });
  if (!auth.ok) return authFailureResponse(auth);
  try {
    const template = normalizeTemplate(await request.json() as Record<string, unknown>);
    const { data, error } = await getSupabaseAdmin()
      .from("erp_admin_templates")
      .upsert(template, { onConflict: "template_key" })
      .select("template_key,title,description,definition,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Template save failed" }, { status: 400 });
  }
}
