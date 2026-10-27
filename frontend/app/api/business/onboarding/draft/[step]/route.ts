import { NextRequest, NextResponse } from "next/server";
import { OnboardingStep } from "../../../../../constants/businessConstants";
import { ONBOARDING_DRAFT_STATUS } from "../../../../../constants/dbConstants";
import { createClient } from "../../../../../utils/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ step: string }> }) {
  try {
    const { step } = await params;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify that the step is one of the OnboardingStep enum
    if (!Object.values(OnboardingStep).includes(step as OnboardingStep)) {
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    const { data: draft, error } = await supabase
      .from("onboarding_drafts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", ONBOARDING_DRAFT_STATUS.PENDING)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching draft:", error);
      return NextResponse.json({ error: "Failed to fetch draft" }, { status: 409 });
    }

    // If no draft exists, return null
    if (!draft) {
      return NextResponse.json({ step, draftData: null });
    }

    // Check step_validation to determine if this step's data should be returned
    const stepValidation = draft.step_validation?.[step];

    // If step validation exists and marks the step as invalid, return null
    if (stepValidation && stepValidation.valid === false) {
      return NextResponse.json({ step, draftData: null });
    }

    // If step validation doesn't exist or is valid, return the data
    const draftData = draft.draft_data?.[step] || null;

    return NextResponse.json({ step, draftData });
  } catch (error) {
    console.error("Error fetching draft:", error);
    return NextResponse.json({ error: "Failed to fetch draft" }, { status: 409 });
  }
}
