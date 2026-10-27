import type { SupabaseClient } from "@supabase/supabase-js";

type SlugLookupClient = Pick<SupabaseClient, "from">;

export function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function slugifyBusinessName(name: string): string {
  return slugifySegment(name);
}

export async function generateUniqueBusinessSlug(
  supabase: SlugLookupClient,
  name: string,
  excludeBusinessId?: string
): Promise<string> {
  const base = slugifyBusinessName(name);
  const fallbackBase = base.length >= 3 ? base : "business";

  let candidate = fallbackBase;
  let suffix = 1;

  while (suffix <= 999) {
    let query = supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("slug", candidate);

    if (excludeBusinessId) {
      query = query.neq("id", excludeBusinessId);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed slug uniqueness check: ${error.message}`);
    }

    if (!count || count === 0) {
      return candidate;
    }

    suffix += 1;
    candidate = `${fallbackBase}-${suffix}`.slice(0, 100);
  }

  throw new Error("Unable to generate unique slug");
}
