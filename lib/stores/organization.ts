import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_ORGANIZATION = {
  name: "맞춤장사 OS",
  slug: "custom-business-os",
};

/** Ensures first-time installations can create a store without manual DB seeding. */
export async function ensureActiveOrganizationId(supabase: SupabaseClient) {
  const { data: activeOrganization, error: activeOrganizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("status", "active")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (activeOrganizationError) throw activeOrganizationError;
  if (activeOrganization?.id) return activeOrganization.id;

  const { data: createdOrganization, error: createOrganizationError } = await supabase
    .from("organizations")
    .insert(DEFAULT_ORGANIZATION)
    .select("id")
    .maybeSingle();
  if (!createOrganizationError && createdOrganization?.id) return createdOrganization.id;

  // A second registration request can create the same default row at the same time.
  if (createOrganizationError?.code === "23505") {
    const { data: existingOrganization, error: existingOrganizationError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", DEFAULT_ORGANIZATION.slug)
      .single();
    if (existingOrganizationError) throw existingOrganizationError;
    return existingOrganization.id;
  }
  throw createOrganizationError ?? new Error("기본 조직을 준비하지 못했습니다.");
}
