import { NextResponse } from "next/server";
import { ONBOARDING_DRAFT_STATUS } from "../../../../constants/dbConstants";
import { createClient } from "../../../../utils/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: draft, error: draftError } = await supabase
    .from("onboarding_drafts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", ONBOARDING_DRAFT_STATUS.PENDING)
    .maybeSingle();

  if (draftError || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Log draft data for review
  console.log("Draft data for review:", {
    draftId: draft.id,
    userId: draft.user_id,
    businessId: draft.business_id,
    currentStep: draft.current_step,
    draftData: draft.draft_data,
    stepValidation: draft.step_validation,
    lastSavedAt: draft.last_saved_at,
    createdAt: draft.created_at,
    status: draft.status,
  });

  const { error: submitError } = await supabase
    .from("onboarding_drafts")
    .update({
      status: ONBOARDING_DRAFT_STATUS.SUBMITTED,
      current_step: "awaiting_review",
      last_saved_at: new Date().toISOString(),
    })
    .eq("id", draft.id);

  if (submitError) {
    console.error("Failed to submit application:", submitError);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }

  return NextResponse.json({ message: "Application submitted for review" });
}
