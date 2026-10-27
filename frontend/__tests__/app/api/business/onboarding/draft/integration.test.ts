/**
 * Integration Tests for Onboarding Draft Step Invalidation
 *
 * Tests the complete workflow of saving steps and verifying that
 * invalidation logic works correctly across POST and GET endpoints.
 */

import { GET } from "@/app/api/business/onboarding/draft/[step]/route";
import { POST } from "@/app/api/business/onboarding/draft/route";
import { OnboardingStep } from "@/app/constants/businessConstants";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mock Next.js
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock("@/app/utils/supabase/server", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe("Onboarding Draft Step Invalidation - Integration Tests", () => {
  const mockUserId = "test-user-id";
  const mockBusinessId = "test-business-id";
  const mockDraftId = "test-draft-id";

  // This will simulate the database state
  let databaseState: {
    draft_data: Record<string, any>;
    step_validation: Record<string, { valid: boolean; completed: boolean; last_updated: string }>;
    current_step: string;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (NextResponse.json as jest.Mock).mockImplementation((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
      data,
    }));

    // Default auth success
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId, email: "test@example.com" } },
      error: null,
    });

    // Initialize database state
    databaseState = {
      draft_data: {},
      step_validation: {},
      current_step: OnboardingStep.BUSINESS_INFO,
    };
  });

  // Helper to create mock request
  const createPOSTRequest = (step: string, stepData: any, currentStep: string) => {
    return new Request("http://localhost/api/business/onboarding/draft", {
      method: "POST",
      body: JSON.stringify({ step, stepData, currentStep }),
    });
  };

  const createGETRequest = (step: string): NextRequest => {
    return new Request(`http://localhost/api/business/onboarding/draft/${step}`, {
      method: "GET",
    }) as unknown as NextRequest;
  };

  const createGETParams = (step: string) => {
    return { params: Promise.resolve({ step }) };
  };

  // Helper to setup mocks that interact with databaseState
  const setupDatabaseMocks = () => {
    // Mock Supabase queries - these need to read from current databaseState
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === "onboarding_drafts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockImplementation(() => {
                  // Return current database state
                  return Promise.resolve({
                    data: {
                      id: mockDraftId,
                      business_id: mockBusinessId,
                      user_id: mockUserId,
                      status: "pending",
                      draft_data: { ...databaseState.draft_data },
                      step_validation: { ...databaseState.step_validation },
                      current_step: databaseState.current_step,
                    },
                    error: null,
                  });
                }),
              }),
            }),
          }),
          update: jest.fn().mockImplementation((updateData) => {
            // Update simulated database
            if (updateData.draft_data) {
              databaseState.draft_data = updateData.draft_data;
            }
            if (updateData.step_validation) {
              databaseState.step_validation = updateData.step_validation;
            }
            if (updateData.current_step !== undefined) {
              databaseState.current_step = updateData.current_step;
            }

            return {
              eq: jest.fn().mockResolvedValue({
                data: {
                  id: mockDraftId,
                  business_id: mockBusinessId,
                  draft_data: databaseState.draft_data,
                  step_validation: databaseState.step_validation,
                  current_step: databaseState.current_step,
                },
                error: null,
              }),
            };
          }),
        };
      }
      // For businesses table (used in first-time creation)
      return {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    });
  };

  describe("Full Workflow: Progressive Step Completion", () => {
    it("should allow completing steps in order without invalidation", async () => {
      setupDatabaseMocks();

      // Step 1: Save BUSINESS_INFO
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_INFO,
          { name: "Test Business", slug: "test-business" },
          OnboardingStep.BUSINESS_INFO
        )
      );

      expect(databaseState.step_validation[OnboardingStep.BUSINESS_INFO]).toMatchObject({
        valid: true,
        completed: true,
      });

      // Step 2: Save BUSINESS_LOCATION
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_LOCATION,
          { address: "123 Main St" },
          OnboardingStep.BUSINESS_LOCATION
        )
      );

      expect(databaseState.step_validation[OnboardingStep.BUSINESS_LOCATION]).toMatchObject({
        valid: true,
        completed: true,
      });

      // All subsequent steps should be invalid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS].valid).toBe(false);
      expect(databaseState.step_validation[OnboardingStep.SERVICE_LOCATION].valid).toBe(false);

      // Step 3: Save BUSINESS_TEAM_MEMBERS
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_TEAM_MEMBERS,
          { members: [{ name: "John Doe" }] },
          OnboardingStep.BUSINESS_TEAM_MEMBERS
        )
      );

      expect(databaseState.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS]).toMatchObject({
        valid: true,
        completed: true,
      });

      // BUSINESS_INFO and BUSINESS_LOCATION should still be valid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_INFO].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);
    });
  });

  describe("Full Workflow: Backward Navigation and Update", () => {
    it("should invalidate subsequent steps when going back and updating", async () => {
      setupDatabaseMocks();

      // Complete multiple steps in order
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_INFO,
          { name: "Test Business" },
          OnboardingStep.BUSINESS_INFO
        )
      );

      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_LOCATION,
          { address: "123 Main St" },
          OnboardingStep.BUSINESS_LOCATION
        )
      );

      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_TEAM_MEMBERS,
          { members: [{ name: "John" }] },
          OnboardingStep.BUSINESS_TEAM_MEMBERS
        )
      );

      await POST(
        createPOSTRequest(
          OnboardingStep.SERVICE_LOCATION,
          { services: ["service-1"] },
          OnboardingStep.SERVICE_LOCATION
        )
      );

      await POST(
        createPOSTRequest(
          OnboardingStep.CARD_STUDIO,
          { cards: [{ id: "card-1" }] },
          OnboardingStep.CARD_STUDIO
        )
      );

      // Verify all steps are valid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.SERVICE_LOCATION].valid).toBe(true);

      // Now go back and update BUSINESS_LOCATION
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_LOCATION,
          { address: "456 New St" },
          OnboardingStep.BUSINESS_LOCATION
        )
      );

      // BUSINESS_LOCATION should still be valid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);

      // All subsequent steps should be invalid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS].valid).toBe(false);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_RESOURCES].valid).toBe(false);
      expect(databaseState.step_validation[OnboardingStep.SERVICE_LOCATION].valid).toBe(false);
      expect(databaseState.step_validation[OnboardingStep.CARD_STUDIO].valid).toBe(false);

      // BUSINESS_INFO should remain valid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_INFO].valid).toBe(true);
    });
  });

  describe("Full Workflow: GET Returns Correct Data", () => {
    it("should return valid data for valid steps and null for invalid steps", async () => {
      setupDatabaseMocks();

      // Complete several steps
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_INFO,
          { name: "Test Business" },
          OnboardingStep.BUSINESS_INFO
        )
      );

      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_LOCATION,
          { address: "123 Main St" },
          OnboardingStep.BUSINESS_LOCATION
        )
      );

      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_TEAM_MEMBERS,
          { members: [{ name: "John" }] },
          OnboardingStep.BUSINESS_TEAM_MEMBERS
        )
      );

      // Update BUSINESS_LOCATION which should invalidate BUSINESS_TEAM_MEMBERS
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_LOCATION,
          { address: "456 New St" },
          OnboardingStep.BUSINESS_LOCATION
        )
      );

      // Now test GET endpoints

      // BUSINESS_LOCATION should return data
      await GET(
        createGETRequest(OnboardingStep.BUSINESS_LOCATION),
        createGETParams(OnboardingStep.BUSINESS_LOCATION)
      );
      let lastCall = (NextResponse.json as jest.Mock).mock.calls[
        (NextResponse.json as jest.Mock).mock.calls.length - 1
      ][0];
      expect(lastCall.draftData).toEqual({ address: "456 New St" });

      // BUSINESS_TEAM_MEMBERS should return null (invalidated)
      await GET(
        createGETRequest(OnboardingStep.BUSINESS_TEAM_MEMBERS),
        createGETParams(OnboardingStep.BUSINESS_TEAM_MEMBERS)
      );
      lastCall = (NextResponse.json as jest.Mock).mock.calls[
        (NextResponse.json as jest.Mock).mock.calls.length - 1
      ][0];
      expect(lastCall.draftData).toBeNull();

      // BUSINESS_INFO should return data (non-critical)
      await GET(
        createGETRequest(OnboardingStep.BUSINESS_INFO),
        createGETParams(OnboardingStep.BUSINESS_INFO)
      );
      lastCall = (NextResponse.json as jest.Mock).mock.calls[
        (NextResponse.json as jest.Mock).mock.calls.length - 1
      ][0];
      expect(lastCall.draftData).toEqual({ name: "Test Business" });
    });
  });

  describe("Full Workflow: BUSINESS_INFO Updates Don't Invalidate", () => {
    it("should allow updating BUSINESS_INFO without invalidating subsequent steps", async () => {
      setupDatabaseMocks();

      // Complete several steps
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_INFO,
          { name: "Test Business" },
          OnboardingStep.BUSINESS_INFO
        )
      );

      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_LOCATION,
          { address: "123 Main St" },
          OnboardingStep.BUSINESS_LOCATION
        )
      );

      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_TEAM_MEMBERS,
          { members: [{ name: "John" }] },
          OnboardingStep.BUSINESS_TEAM_MEMBERS
        )
      );

      // Verify steps are valid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_INFO].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS].valid).toBe(true);

      // Update BUSINESS_INFO
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_INFO,
          { name: "Updated Business Name" },
          OnboardingStep.BUSINESS_INFO
        )
      );

      // All steps should STILL be valid (BUSINESS_INFO is non-critical)
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_INFO].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS].valid).toBe(true);
    });
  });

  describe("Full Workflow: Middle Step Invalidation", () => {
    it("should only invalidate steps after the updated step, not before", async () => {
      setupDatabaseMocks();

      // Complete steps 1-5
      const steps = [
        { step: OnboardingStep.BUSINESS_INFO, data: { name: "Test" } },
        { step: OnboardingStep.BUSINESS_LOCATION, data: { address: "123 Main" } },
        { step: OnboardingStep.BUSINESS_TEAM_MEMBERS, data: { members: [] } },
        { step: OnboardingStep.BUSINESS_RESOURCES, data: { resources: [] } },
        { step: OnboardingStep.SERVICE_LOCATION, data: { services: [] } },
      ];

      for (const { step, data } of steps) {
        await POST(createPOSTRequest(step, data, step));
      }

      // Verify all are valid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_INFO].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_RESOURCES].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.SERVICE_LOCATION].valid).toBe(true);

      // Update BUSINESS_TEAM_MEMBERS (step 3)
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_TEAM_MEMBERS,
          { members: [{ name: "Jane" }] },
          OnboardingStep.BUSINESS_TEAM_MEMBERS
        )
      );

      // Steps before BUSINESS_TEAM_MEMBERS should remain valid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_INFO].valid).toBe(true);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);

      // BUSINESS_TEAM_MEMBERS itself should be valid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS].valid).toBe(true);

      // Steps after BUSINESS_TEAM_MEMBERS should be invalid
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_RESOURCES].valid).toBe(false);
      expect(databaseState.step_validation[OnboardingStep.BUSINESS_SERVICE_TEMPLATES].valid).toBe(
        false
      );
      expect(databaseState.step_validation[OnboardingStep.SERVICE_LOCATION].valid).toBe(false);
    });
  });

  describe("Full Workflow: Current Step Reset", () => {
    it("should reset current_step when user updates a step before it", async () => {
      setupDatabaseMocks();

      // Complete multiple steps progressing forward
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_LOCATION,
          { address: "123 Main" },
          OnboardingStep.BUSINESS_LOCATION
        )
      );
      databaseState.current_step = OnboardingStep.CARD_STUDIO; // Simulate user progressing to CARD_STUDIO

      // Go back and update BUSINESS_LOCATION
      await POST(
        createPOSTRequest(
          OnboardingStep.BUSINESS_LOCATION,
          { address: "456 New St" },
          OnboardingStep.BUSINESS_LOCATION
        )
      );

      // current_step should be reset to BUSINESS_LOCATION
      expect(databaseState.current_step).toBe(OnboardingStep.BUSINESS_LOCATION);
    });
  });
});
