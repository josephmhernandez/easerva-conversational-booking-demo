/**
 * Unit Tests for Business Onboarding Draft API Route
 *
 * Tests the POST API route that handles saving and invalidating onboarding draft data,
 * including step validation and subsequent step invalidation logic.
 */

import { POST } from "@/app/api/business/onboarding/draft/route";
import { OnboardingStep } from "@/app/constants/businessConstants";
import { NextResponse } from "next/server";

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

describe("Business Onboarding Draft API Route - POST", () => {
  const mockUserId = "test-user-id";
  const mockBusinessId = "test-business-id";
  const mockDraftId = "test-draft-id";

  beforeEach(() => {
    jest.clearAllMocks();
    (NextResponse.json as jest.Mock).mockImplementation((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
    }));

    // Default auth success
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId, email: "test@example.com" } },
      error: null,
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const mockRequest = new Request("http://localhost/api/business/onboarding/draft", {
        method: "POST",
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_INFO,
          stepData: { name: "Test" },
          currentStep: OnboardingStep.BUSINESS_INFO,
        }),
      });

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" }, { status: 401 });
    });
  });

  describe("BUSINESS_INFO Step - Non-Critical", () => {
    it("should save BUSINESS_INFO without invalidating any steps", async () => {
      // Mock existing draft with completed subsequent steps
      const existingDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        user_id: mockUserId,
        current_step: OnboardingStep.SERVICE_LOCATION,
        draft_data: {
          [OnboardingStep.BUSINESS_INFO]: { name: "Old Name" },
          [OnboardingStep.BUSINESS_LOCATION]: { address: "123 Main St" },
          [OnboardingStep.SERVICE_LOCATION]: { services: [] },
        },
        step_validation: {
          [OnboardingStep.BUSINESS_INFO]: { valid: true, completed: true },
          [OnboardingStep.BUSINESS_LOCATION]: { valid: true, completed: true },
          [OnboardingStep.SERVICE_LOCATION]: { valid: true, completed: true },
        },
        status: "draft",
      };

      // Mock database queries
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingDraft,
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: existingDraft,
          error: null,
        }),
      });

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === "onboarding_drafts") {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      const mockRequest = new Request("http://localhost/api/business/onboarding/draft", {
        method: "POST",
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_INFO,
          stepData: { name: "New Name", slug: "new-name" },
          currentStep: OnboardingStep.BUSINESS_INFO,
        }),
      });

      await POST(mockRequest);

      // Verify update was called
      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];

      // BUSINESS_INFO should be valid
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_INFO]).toEqual({
        valid: true,
        completed: true,
        last_updated: expect.any(String),
      });

      // All other steps should remain valid (not invalidated)
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);
      expect(updateCall.step_validation[OnboardingStep.SERVICE_LOCATION].valid).toBe(true);
    });
  });

  describe("BUSINESS_LOCATION Step - Critical", () => {
    it("should invalidate all subsequent steps when BUSINESS_LOCATION is updated", async () => {
      const existingDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        user_id: mockUserId,
        current_step: OnboardingStep.CARD_STUDIO,
        draft_data: {
          [OnboardingStep.BUSINESS_INFO]: { name: "Test" },
          [OnboardingStep.BUSINESS_LOCATION]: { address: "Old Address" },
          [OnboardingStep.BUSINESS_TEAM_MEMBERS]: { members: [] },
          [OnboardingStep.SERVICE_LOCATION]: { services: [] },
          [OnboardingStep.CARD_STUDIO]: { cards: [] },
        },
        step_validation: {
          [OnboardingStep.BUSINESS_INFO]: { valid: true, completed: true },
          [OnboardingStep.BUSINESS_LOCATION]: { valid: true, completed: true },
          [OnboardingStep.BUSINESS_TEAM_MEMBERS]: { valid: true, completed: true },
          [OnboardingStep.SERVICE_LOCATION]: { valid: true, completed: true },
          [OnboardingStep.CARD_STUDIO]: { valid: true, completed: true },
        },
        status: "draft",
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingDraft,
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: existingDraft,
          error: null,
        }),
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      }));

      const mockRequest = new Request("http://localhost/api/business/onboarding/draft", {
        method: "POST",
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_LOCATION,
          stepData: { address: "New Address" },
          currentStep: OnboardingStep.BUSINESS_LOCATION,
        }),
      });

      await POST(mockRequest);

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];

      // BUSINESS_LOCATION should be valid
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);

      // All subsequent steps should be invalid
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_RESOURCES].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_SERVICE_TEMPLATES].valid).toBe(
        false
      );
      expect(updateCall.step_validation[OnboardingStep.SERVICE_LOCATION].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT].valid).toBe(
        false
      );
      expect(updateCall.step_validation[OnboardingStep.CARD_ASSIGNMENT_STRATEGY].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.CARD_STUDIO].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.BOOKING_STRATEGY].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.CALENDAR_MANAGEMENT].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.CALENDAR_INTEGRATION_NEW].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_EMPLOYEE_AVAILABILITY].valid).toBe(
        false
      );

      // BUSINESS_INFO should remain valid
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_INFO].valid).toBe(true);
    });

    it("should reset current_step if it was ahead of updated step", async () => {
      const existingDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        user_id: mockUserId,
        current_step: OnboardingStep.CARD_STUDIO,
        draft_data: {
          [OnboardingStep.BUSINESS_LOCATION]: { address: "Old" },
        },
        step_validation: {},
        status: "draft",
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingDraft,
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: existingDraft,
          error: null,
        }),
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      }));

      const mockRequest = new Request("http://localhost/api/business/onboarding/draft", {
        method: "POST",
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_LOCATION,
          stepData: { address: "New Address" },
          currentStep: OnboardingStep.BUSINESS_LOCATION,
        }),
      });

      await POST(mockRequest);

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];

      // current_step should be reset to BUSINESS_LOCATION
      expect(updateCall.current_step).toBe(OnboardingStep.BUSINESS_LOCATION);
    });
  });

  describe("Middle Step Updates", () => {
    it("should only invalidate steps after SERVICE_LOCATION when it is updated", async () => {
      const existingDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        user_id: mockUserId,
        current_step: OnboardingStep.BOOKING_STRATEGY,
        draft_data: {
          [OnboardingStep.BUSINESS_INFO]: { name: "Test" },
          [OnboardingStep.BUSINESS_LOCATION]: { address: "123 Main" },
          [OnboardingStep.SERVICE_LOCATION]: { services: ["old"] },
          [OnboardingStep.CARD_STUDIO]: { cards: [] },
        },
        step_validation: {
          [OnboardingStep.BUSINESS_INFO]: { valid: true, completed: true },
          [OnboardingStep.BUSINESS_LOCATION]: { valid: true, completed: true },
          [OnboardingStep.SERVICE_LOCATION]: { valid: true, completed: true },
          [OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT]: { valid: true, completed: true },
          [OnboardingStep.CARD_STUDIO]: { valid: true, completed: true },
        },
        status: "draft",
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingDraft,
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: existingDraft,
          error: null,
        }),
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      }));

      const mockRequest = new Request("http://localhost/api/business/onboarding/draft", {
        method: "POST",
        body: JSON.stringify({
          step: OnboardingStep.SERVICE_LOCATION,
          stepData: { services: ["new"] },
          currentStep: OnboardingStep.SERVICE_LOCATION,
        }),
      });

      await POST(mockRequest);

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];

      // Steps before SERVICE_LOCATION should remain valid
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_INFO].valid).toBe(true);
      expect(updateCall.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);

      // SERVICE_LOCATION itself should be valid
      expect(updateCall.step_validation[OnboardingStep.SERVICE_LOCATION].valid).toBe(true);

      // Steps after SERVICE_LOCATION should be invalid
      expect(updateCall.step_validation[OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT].valid).toBe(
        false
      );
      expect(updateCall.step_validation[OnboardingStep.CARD_ASSIGNMENT_STRATEGY].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.CARD_STUDIO].valid).toBe(false);
      expect(updateCall.step_validation[OnboardingStep.BOOKING_STRATEGY].valid).toBe(false);
    });
  });

  describe("New Draft Creation", () => {
    it("should create new draft with invalidated subsequent steps", async () => {
      // Mock no existing draft
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockDraftId },
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === "businesses") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockBusinessId },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: mockSelect,
          insert: mockInsert,
        };
      });

      const mockRequest = new Request("http://localhost/api/business/onboarding/draft", {
        method: "POST",
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_LOCATION,
          stepData: { address: "123 Main St" },
          currentStep: OnboardingStep.BUSINESS_LOCATION,
        }),
      });

      await POST(mockRequest);

      expect(mockInsert).toHaveBeenCalled();
      const insertCall = mockInsert.mock.calls[0][0];

      // BUSINESS_LOCATION should be valid
      expect(insertCall.step_validation[OnboardingStep.BUSINESS_LOCATION].valid).toBe(true);

      // All subsequent steps should be invalid
      expect(insertCall.step_validation[OnboardingStep.BUSINESS_TEAM_MEMBERS].valid).toBe(false);
      expect(insertCall.step_validation[OnboardingStep.BUSINESS_RESOURCES].valid).toBe(false);
    });
  });

  describe("Non-Pending Draft Handling", () => {
    it("should create a new draft when no pending draft exists", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const businessInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockBusinessId },
            error: null,
          }),
        }),
      });

      const draftInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockDraftId },
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === "businesses") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 0,
                error: null,
              }),
            }),
            insert: businessInsert,
          };
        }
        if (table === "onboarding_drafts") {
          return {
            select: mockSelect,
            insert: draftInsert,
          };
        }
        return {};
      });

      const mockRequest = new Request("http://localhost/api/business/onboarding/draft", {
        method: "POST",
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_INFO,
          stepData: { name: "Test" },
          currentStep: OnboardingStep.BUSINESS_INFO,
        }),
      });

      await POST(mockRequest);

      expect(businessInsert).toHaveBeenCalled();
      expect(draftInsert).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: mockDraftId,
                business_id: mockBusinessId,
                draft_data: {},
                step_validation: {},
                status: "draft",
              },
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      }));

      const mockRequest = new Request("http://localhost/api/business/onboarding/draft", {
        method: "POST",
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_INFO,
          stepData: { name: "Test" },
          currentStep: OnboardingStep.BUSINESS_INFO,
        }),
      });

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Failed to save draft" },
        { status: 500 }
      );
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const mockRequest = new Request("http://localhost/api/business/onboarding/draft", {
        method: "POST",
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_INFO,
          stepData: { name: "Test" },
          currentStep: OnboardingStep.BUSINESS_INFO,
        }),
      });

      await POST(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Internal server error" },
        { status: 500 }
      );
    });
  });
});
