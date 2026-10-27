import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { ADMIN_USER_IDS } from "@/app/constants/dbConstants";

interface SlugBody {
  slug?: string;
}

const SLUG_RE = /^[a-z0-9-]{3,100}$/;

function isSlugUniqueViolation(error: { code?: string; details?: string | null; message: string }) {
  if (error.code !== "23505") {
    return false;
  }

  const details = `${error.message} ${error.details ?? ""}`.toLowerCase();
  return details.includes("slug");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_USER_IDS.includes(user.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: SlugBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = body.slug?.trim();
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "Slug must be 3-100 chars, lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }

  const { data: existing, error: existingErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .neq("id", businessId)
    .limit(1);

  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from("businesses")
    .update({ slug, updated_at: new Date().toISOString() })
    .eq("id", businessId);

  if (updateError && isSlugUniqueViolation(updateError)) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true, businessId, slug });
}
