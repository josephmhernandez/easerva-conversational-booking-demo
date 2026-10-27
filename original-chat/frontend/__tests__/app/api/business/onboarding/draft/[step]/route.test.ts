/**
 * Unit Tests for Business Onboarding Draft [step] API Route
 *
 * Tests the GET API route that retrieves specific step data from onboarding drafts,
 * including validation checks to return null for invalid steps.
 */

import { GET } from "@/app/api/business/onboarding/draft/[step]/route";
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

describe("Business Onboarding Draft [step] API Route - GET", () => {
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
      data: { user: { id: mockUserId } },
      error: null,
    });
  });

  // Helper to create mock request
  const createMockRequest = (step: string): NextRequest => {
    return new Request(`http://localhost/api/business/onboarding/draft/${step}`, {
      method: "GET",
    }) as unknown as NextRequest;
  };

  // Helper to create mock params
  const createMockParams = (step: string) => {
    return { params: Promise.resolve({ step }) };
  };

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_INFO);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_INFO);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" }, { status: 401 });
    });
  });

  describe("Step Validation", () => {
    it("should return 400 for invalid step enum value", async () => {
      const mockRequest = createMockRequest("invalid_step");
      const mockParams = createMockParams("invalid_step");

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Invalid step" }, { status: 400 });
    });

    it("should accept valid OnboardingStep enum values", async () => {
      const mockDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        draft_data: {
          [OnboardingStep.BUSINESS_INFO]: { name: "Test" },
        },
        step_validation: {
          [OnboardingStep.BUSINESS_INFO]: { valid: true, completed: true },
        },
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockDraft,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_INFO);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_INFO);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({
        step: OnboardingStep.BUSINESS_INFO,
        draftData: { name: "Test" },
      });
    });
  });

  describe("Valid Step Data", () => {
    it("should return data for valid step with completed validation", async () => {
      const stepData = { name: "Test Business", slug: "test-business" };
      const mockDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        draft_data: {
          [OnboardingStep.BUSINESS_INFO]: stepData,
        },
        step_validation: {
          [OnboardingStep.BUSINESS_INFO]: {
            valid: true,
            completed: true,
            last_updated: "2023-01-01T00:00:00Z",
          },
        },
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockDraft,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_INFO);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_INFO);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({
        step: OnboardingStep.BUSINESS_INFO,
        draftData: stepData,
      });
    });

    it("should return data for step without validation entry", async () => {
      const stepData = { address: "123 Main St" };
      const mockDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        draft_data: {
          [OnboardingStep.BUSINESS_LOCATION]: stepData,
        },
        step_validation: {
          // No entry for BUSINESS_LOCATION
        },
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockDraft,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_LOCATION);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_LOCATION);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({
        step: OnboardingStep.BUSINESS_LOCATION,
        draftData: stepData,
      });
    });
  });

  describe("Invalid Step Data", () => {
    it("should return null for invalid step even if data exists", async () => {
      const mockDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        draft_data: {
          [OnboardingStep.SERVICE_LOCATION]: { services: ["old-service"] },
        },
        step_validation: {
          [OnboardingStep.SERVICE_LOCATION]: {
            valid: false,
            completed: false,
            last_updated: "2023-01-01T00:00:00Z",
          },
        },
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockDraft,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.SERVICE_LOCATION);
      const mockParams = createMockParams(OnboardingStep.SERVICE_LOCATION);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({
        step: OnboardingStep.SERVICE_LOCATION,
        draftData: null,
      });
    });

    it("should return null for step marked as invalid after update", async () => {
      const mockDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        draft_data: {
          [OnboardingStep.BUSINESS_LOCATION]: { address: "123 Main" },
          [OnboardingStep.BUSINESS_TEAM_MEMBERS]: { members: [{ name: "John" }] },
        },
        step_validation: {
          [OnboardingStep.BUSINESS_LOCATION]: {
            valid: true,
            completed: true,
            last_updated: "2023-01-02T00:00:00Z",
          },
          [OnboardingStep.BUSINESS_TEAM_MEMBERS]: {
            valid: false,
            completed: false,
            last_updated: "2023-01-02T00:00:00Z",
          },
        },
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockDraft,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_TEAM_MEMBERS);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_TEAM_MEMBERS);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({
        step: OnboardingStep.BUSINESS_TEAM_MEMBERS,
        draftData: null,
      });
    });
  });

  describe("Missing Data", () => {
    it("should return null when no draft exists", async () => {
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

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_INFO);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_INFO);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({
        step: OnboardingStep.BUSINESS_INFO,
        draftData: null,
      });
    });

    it("should return null when step data does not exist in draft_data", async () => {
      const mockDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        draft_data: {
          [OnboardingStep.BUSINESS_INFO]: { name: "Test" },
          // BUSINESS_LOCATION is missing
        },
        step_validation: {
          [OnboardingStep.BUSINESS_INFO]: { valid: true, completed: true },
        },
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockDraft,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_LOCATION);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_LOCATION);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({
        step: OnboardingStep.BUSINESS_LOCATION,
        draftData: null,
      });
    });
  });

  describe("Step Validation Edge Cases", () => {
    it("should handle missing step_validation object gracefully", async () => {
      const stepData = { name: "Test" };
      const mockDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        draft_data: {
          [OnboardingStep.BUSINESS_INFO]: stepData,
        },
        // step_validation is missing entirely
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockDraft,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_INFO);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_INFO);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({
        step: OnboardingStep.BUSINESS_INFO,
        draftData: stepData,
      });
    });

    it("should treat step with valid=true as valid", async () => {
      const stepData = { services: ["service-1"] };
      const mockDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        draft_data: {
          [OnboardingStep.SERVICE_LOCATION]: stepData,
        },
        step_validation: {
          [OnboardingStep.SERVICE_LOCATION]: {
            valid: true,
            completed: false, // completed doesn't matter for validation
          },
        },
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockDraft,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.SERVICE_LOCATION);
      const mockParams = createMockParams(OnboardingStep.SERVICE_LOCATION);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith({
        step: OnboardingStep.SERVICE_LOCATION,
        draftData: stepData,
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "OTHER_ERROR", message: "Database error" },
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_INFO);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_INFO);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Failed to fetch draft" },
        { status: 409 }
      );
    });

    it("should handle unexpected errors", async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const mockRequest = createMockRequest(OnboardingStep.BUSINESS_INFO);
      const mockParams = createMockParams(OnboardingStep.BUSINESS_INFO);

      await GET(mockRequest, mockParams);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Failed to fetch draft" },
        { status: 409 }
      );
    });
  });

  describe("Multiple Steps Scenario", () => {
    it("should return correct data for each step based on validation", async () => {
      const mockDraft = {
        id: mockDraftId,
        business_id: mockBusinessId,
        draft_data: {
          [OnboardingStep.BUSINESS_INFO]: { name: "Test" },
          [OnboardingStep.BUSINESS_LOCATION]: { address: "123 Main" },
          [OnboardingStep.BUSINESS_TEAM_MEMBERS]: { members: [] },
          [OnboardingStep.SERVICE_LOCATION]: { services: [] },
        },
        step_validation: {
          [OnboardingStep.BUSINESS_INFO]: { valid: true, completed: true },
          [OnboardingStep.BUSINESS_LOCATION]: { valid: true, completed: true },
          [OnboardingStep.BUSINESS_TEAM_MEMBERS]: { valid: false, completed: false },
          [OnboardingStep.SERVICE_LOCATION]: { valid: false, completed: false },
        },
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockDraft,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      // Test BUSINESS_INFO (valid)
      const request1 = createMockRequest(OnboardingStep.BUSINESS_INFO);
      const params1 = createMockParams(OnboardingStep.BUSINESS_INFO);
      await GET(request1, params1);
      expect(NextResponse.json).toHaveBeenLastCalledWith({
        step: OnboardingStep.BUSINESS_INFO,
        draftData: { name: "Test" },
      });

      jest.clearAllMocks();
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // Test BUSINESS_LOCATION (valid)
      const request2 = createMockRequest(OnboardingStep.BUSINESS_LOCATION);
      const params2 = createMockParams(OnboardingStep.BUSINESS_LOCATION);
      await GET(request2, params2);
      expect(NextResponse.json).toHaveBeenLastCalledWith({
        step: OnboardingStep.BUSINESS_LOCATION,
        draftData: { address: "123 Main" },
      });

      jest.clearAllMocks();
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // Test BUSINESS_TEAM_MEMBERS (invalid)
      const request3 = createMockRequest(OnboardingStep.BUSINESS_TEAM_MEMBERS);
      const params3 = createMockParams(OnboardingStep.BUSINESS_TEAM_MEMBERS);
      await GET(request3, params3);
      expect(NextResponse.json).toHaveBeenLastCalledWith({
        step: OnboardingStep.BUSINESS_TEAM_MEMBERS,
        draftData: null,
      });

      jest.clearAllMocks();
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // Test SERVICE_LOCATION (invalid)
      const request4 = createMockRequest(OnboardingStep.SERVICE_LOCATION);
      const params4 = createMockParams(OnboardingStep.SERVICE_LOCATION);
      await GET(request4, params4);
      expect(NextResponse.json).toHaveBeenLastCalledWith({
        step: OnboardingStep.SERVICE_LOCATION,
        draftData: null,
      });
    });
  });
});
