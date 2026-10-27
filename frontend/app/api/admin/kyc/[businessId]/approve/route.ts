import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { ADMIN_USER_IDS } from "@/app/constants/dbConstants";

type KycAction = "approve" | "rejected" | "changes_requested";

interface ApproveRequestBody {
  action: KycAction;
  notes?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_USER_IDS.includes(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body
  let body: ApproveRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, notes } = body;

  if (!action || !["approve", "rejected", "changes_requested"].includes(action)) {
    return NextResponse.json(
      { error: "action must be one of: approve, rejected, changes_requested" },
      { status: 400 }
    );
  }

  if ((action === "rejected" || action === "changes_requested") && !notes?.trim()) {
    return NextResponse.json(
      { error: "Notes are required when rejecting or requesting changes" },
      { status: 400 }
    );
  }

  try {
    if (action === "approve") {
      // Update businesses table: set kyc_approved = true
      const { error: businessError } = await supabase
        .from("businesses")
        .update({
          kyc_approved: true,
          kyc_approved_at: new Date().toISOString(),
          kyc_approved_by: user.id,
          kyc_notes: notes ?? null,
          is_active: true,
        })
        .eq("id", businessId);

      if (businessError) {
        console.error("KYC approve — businesses update error:", businessError);
        return NextResponse.json({ error: businessError.message }, { status: 500 });
      }

      // Update onboarding_drafts: set status = approved
      const { error: draftError } = await supabase
        .from("onboarding_drafts")
        .update({ status: "approved" })
        .eq("business_id", businessId);

      if (draftError) {
        console.error("KYC approve — onboarding_drafts update error:", draftError);
        return NextResponse.json({ error: draftError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Business approved",
        businessId,
      });
    } else {
      // rejected or changes_requested
      const { error: businessError } = await supabase
        .from("businesses")
        .update({
          kyc_approved: false,
          kyc_notes: notes,
        })
        .eq("id", businessId);

      if (businessError) {
        console.error("KYC reject — businesses update error:", businessError);
        return NextResponse.json({ error: businessError.message }, { status: 500 });
      }

      const { error: draftError } = await supabase
        .from("onboarding_drafts")
        .update({ status: action })
        .eq("business_id", businessId);

      if (draftError) {
        console.error("KYC reject — onboarding_drafts update error:", draftError);
        return NextResponse.json({ error: draftError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: action === "rejected" ? "Business rejected" : "Changes requested",
        businessId,
      });
    }
  } catch (err) {
    console.error("KYC action unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
