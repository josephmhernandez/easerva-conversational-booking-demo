// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from "next/server";
import { OnboardingStep } from "../../../../constants/businessConstants";
import { getCanonicalBusinessCategoryByName } from "../../../../constants/businessCategories";
import { ONBOARDING_DRAFT_STATUS } from "../../../../constants/dbConstants";
import { createClient } from "../../../../utils/supabase/server";
import { generateUniqueBusinessSlug } from "../../../../utils/slug";
import {
  extractPrimaryAddressFromBusinessLocationStep,
  toCitySlug,
  toStateAbbr,
  toStateName,
} from "../../../../utils/location";

// Define the onboarding flow order - must match the flow in onboardingSteps.ts
const ONBOARDING_FLOW_ORDER = [
  OnboardingStep.BUSINESS_INFO,
  OnboardingStep.BUSINESS_LOCATION,
  OnboardingStep.BUSINESS_TEAM_MEMBERS,
  OnboardingStep.BUSINESS_RESOURCES,
  OnboardingStep.BUSINESS_SERVICE_TEMPLATES,
  OnboardingStep.SERVICE_LOCATION,
  OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT,
  OnboardingStep.CARD_ASSIGNMENT_STRATEGY,
  OnboardingStep.CARD_STUDIO,
  OnboardingStep.BOOKING_STRATEGY,
  OnboardingStep.CALENDAR_MANAGEMENT,
  OnboardingStep.CALENDAR_INTEGRATION_NEW,
  OnboardingStep.BUSINESS_EMPLOYEE_AVAILABILITY,
];

/**
 * Helper function to get steps that should be invalidated when a given step is updated
 * @param updatedStep - The step that was just updated
 * @returns Array of step names that should be marked as invalid
 */
function getStepsToInvalidate(updatedStep: string): string[] {
  // BUSINESS_INFO is non-critical and doesn't invalidate subsequent steps
  if (updatedStep === OnboardingStep.BUSINESS_INFO) {
    return [];
  }

  // Find the step index by comparing string values (enum values are strings at runtime)
  const stepIndex = ONBOARDING_FLOW_ORDER.findIndex(
    (step) => step === updatedStep || step === (updatedStep as OnboardingStep)
  );

  if (stepIndex === -1) {
    console.warn(
      `Step "${updatedStep}" not found in ONBOARDING_FLOW_ORDER. Available steps:`,
      ONBOARDING_FLOW_ORDER.map((s) => s.toString())
    );
    return [];
  }

  // Return all steps after the current one
  const stepsToInvalidate = ONBOARDING_FLOW_ORDER.slice(stepIndex + 1);
  console.log(
    `Invalidating steps after "${updatedStep}" (index ${stepIndex}):`,
    stepsToInvalidate.map((s) => s.toString())
  );
  return stepsToInvalidate;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { step, stepData, currentStep } = body;

    // Check if user already has a business/draft
    const { data: existingDraft, error: draftError } = await supabase
      .from("onboarding_drafts")
      .select("*, businesses(*)")
      .eq("user_id", user.id)
      .eq("status", ONBOARDING_DRAFT_STATUS.PENDING)
      .maybeSingle();

    if (draftError) {
      console.warn("Error fetching draft:", draftError);
    }

    let businessId: string;
    let draftId: string;

    if (existingDraft) {
      // Update existing draft
      businessId = existingDraft.business_id;
      draftId = existingDraft.id;

      // Merge the step data
      const updatedDraftData = {
        ...existingDraft.draft_data,
        [step]: stepData,
      };

      // Determine which steps need to be invalidated
      const stepsToInvalidate = getStepsToInvalidate(step);

      // Build updated step_validation object
      const updatedStepValidation = {
        ...existingDraft.step_validation,
        [step]: {
          valid: true,
          completed: true,
          last_updated: new Date().toISOString(),
        },
      };

      // Mark all subsequent steps as invalid AND clear their data
      stepsToInvalidate.forEach((stepToInvalidate) => {
        updatedStepValidation[stepToInvalidate] = {
          valid: false,
          completed: false,
          last_updated: new Date().toISOString(),
        };
        // Clear the draft data for invalidated steps
        delete updatedDraftData[stepToInvalidate];
      });

      // Determine the appropriate current_step value
      // If the current_step is ahead of the updated step, reset it to the updated step
      const currentStepIndex = ONBOARDING_FLOW_ORDER.indexOf(
        existingDraft.current_step as OnboardingStep
      );
      const updatedStepIndex = ONBOARDING_FLOW_ORDER.indexOf(step as OnboardingStep);
      const newCurrentStep =
        currentStepIndex > updatedStepIndex
          ? step // Reset to the updated step
          : currentStep || existingDraft.current_step;

      // Update draft
      const { error: updateError } = await supabase
        .from("onboarding_drafts")
        .update({
          draft_data: updatedDraftData,
          current_step: newCurrentStep,
          last_saved_at: new Date().toISOString(),
          step_validation: updatedStepValidation,
        })
        .eq("id", draftId);

      if (updateError) {
        console.error("Error updating draft:", updateError);
        return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
      }

      // Update business with key fields from step 1
      if (step === "business_info" && stepData.name) {
        const categorySlug = stepData.category
          ? (getCanonicalBusinessCategoryByName(stepData.category)?.slug ?? null)
          : null;

        if (stepData.category && !categorySlug) {
          return NextResponse.json({ error: "Invalid business category" }, { status: 400 });
        }

        const generatedSlug = await generateUniqueBusinessSlug(
          supabase as never,
          stepData.name,
          businessId
        );

        const { error: businessUpdateError } = await supabase
          .from("businesses")
          .update({
            name: stepData.name,
            slug: generatedSlug,
            category: stepData.category,
            category_slug: categorySlug,
            description: stepData.description,
            phone: stepData.phone,
            email: stepData.email,
            website: stepData.website,
            tags: stepData.tags,
            logo_url: stepData.logoUrl, // You'll need to handle file upload separately
            updated_at: new Date().toISOString(),
          })
          .eq("id", businessId);

        if (businessUpdateError) {
          console.error("Error updating business:", businessUpdateError);
          return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
        }
      }
    } else {
      // Create new business and draft
      const categorySlug = stepData.category
        ? (getCanonicalBusinessCategoryByName(stepData.category)?.slug ?? null)
        : null;

      if (stepData.category && !categorySlug) {
        return NextResponse.json({ error: "Invalid business category" }, { status: 400 });
      }

      const generatedSlug = stepData.name
        ? await generateUniqueBusinessSlug(supabase as never, stepData.name)
        : "";

      // First create skeleton business record
      const { data: newBusiness, error: businessError } = await supabase
        .from("businesses")
        .insert({
          owner_id: user.id,
          name: stepData.name || "",
          slug: generatedSlug,
          category: stepData.category || "",
          category_slug: categorySlug,
          description: stepData.description || "",
          phone: stepData.phone || "",
          email: stepData.email || user.email,
          website: stepData.website || "",
          tags: stepData.tags || [],
          logo_url: stepData.logoUrl || null,
          approval_status: "pending",
          is_active: false,
          // onboarding_step: "business_info",
        })
        .select()
        .single();

      if (businessError) {
        console.error("Error creating business:", businessError);
        return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
      }

      businessId = newBusiness.id;

      // Determine which steps need to be invalidated (for new drafts, this sets baseline)
      const stepsToInvalidate = getStepsToInvalidate(step);

      // Build step_validation object
      const stepValidation: Record<
        string,
        { valid: boolean; completed: boolean; last_updated: string }
      > = {
        [step]: {
          valid: true,
          completed: true,
          last_updated: new Date().toISOString(),
        },
      };

      // Mark all subsequent steps as invalid (ensures clean state)
      // Note: For new drafts, we don't need to clear data since it doesn't exist yet
      stepsToInvalidate.forEach((stepToInvalidate) => {
        stepValidation[stepToInvalidate] = {
          valid: false,
          completed: false,
          last_updated: new Date().toISOString(),
        };
      });

      // Create draft record
      const { data: newDraft, error: createDraftError } = await supabase
        .from("onboarding_drafts")
        .insert({
          user_id: user.id,
          business_id: businessId,
          current_step: currentStep || step,
          draft_data: {
            [step]: stepData,
          },
          step_validation: stepValidation,
        })
        .select()
        .single();

      if (createDraftError) {
        console.error("Error creating draft:", createDraftError);
        return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
      }

      draftId = newDraft.id;
    }

    return NextResponse.json({
      success: true,
      businessId,
      draftId,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Unexpected error in draft save:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET endpoint to retrieve draft
export async function GET() {
  console.log("JOEY: STOP YOU'RE GETTING ALL DATA");
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: draft, error } = await supabase
      .from("onboarding_drafts")
      .select("*, businesses(*)")
      .eq("user_id", user.id)
      .eq("status", ONBOARDING_DRAFT_STATUS.PENDING)
      .maybeSingle();

    // console.log("JOEY draft", draft);
    console.log("JOEY error", error);
    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching draft:", error);
      return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 });
    }

    return NextResponse.json({
      draft: draft || null,
    });
  } catch (error) {
    console.error("Unexpected error fetching draft:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
