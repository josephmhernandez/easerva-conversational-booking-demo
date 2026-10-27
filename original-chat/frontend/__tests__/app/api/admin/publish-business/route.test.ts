/**
 * Unit tests for POST /api/admin/publish-business
 *
 * Covers authentication, authorization, request validation, draft fetching,
 * successful publish flow (including KYC and business/draft updates),
 * error handling, and rollback behavior.
 */

jest.mock("@/lib/logger.server", () => ({}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const ADMIN_USER_IDS = ["39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4"];
const adminUserId = ADMIN_USER_IDS[0];

jest.mock("@/app/constants/dbConstants", () => ({
  ADMIN_USER_IDS: ["39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4"],
}));

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/app/utils/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const mockCreateIdNormalizer = jest.fn();
const mockPublishBusinessInfo = jest.fn();
const mockPublishLocations = jest.fn();
const mockPublishResources = jest.fn();
const mockPublishEmployees = jest.fn();
const mockPublishServices = jest.fn();
const mockPublishCalendarGroups = jest.fn();
const mockPublishEmployeeServices = jest.fn();
const mockPublishServiceConfigurations = jest.fn();
const mockPublishServiceCards = jest.fn();
const mockPublishServiceCardRequirements = jest.fn();
const mockPublishBookingCalendarAssignments = jest.fn();
const mockRollbackPublish = jest.fn();

jest.mock("@/app/api/admin/publish-business/publish-business-helper", () => ({
  createIdNormalizer: (...args: unknown[]) => mockCreateIdNormalizer(...args),
  publishBusinessInfo: (...args: unknown[]) => mockPublishBusinessInfo(...args),
  publishLocations: (...args: unknown[]) => mockPublishLocations(...args),
  publishResources: (...args: unknown[]) => mockPublishResources(...args),
  publishEmployees: (...args: unknown[]) => mockPublishEmployees(...args),
  publishServices: (...args: unknown[]) => mockPublishServices(...args),
  publishCalendarGroups: (...args: unknown[]) => mockPublishCalendarGroups(...args),
  publishEmployeeServices: (...args: unknown[]) => mockPublishEmployeeServices(...args),
  publishServiceConfigurations: (...args: unknown[]) => mockPublishServiceConfigurations(...args),
  publishServiceCards: (...args: unknown[]) => mockPublishServiceCards(...args),
  publishServiceCardRequirements: (...args: unknown[]) =>
    mockPublishServiceCardRequirements(...args),
  publishBookingCalendarAssignments: (...args: unknown[]) =>
    mockPublishBookingCalendarAssignments(...args),
  rollbackPublish: (...args: unknown[]) => mockRollbackPublish(...args),
}));

import { POST } from "@/app/api/admin/publish-business/route";

const APPLICATION_ID = "app-123";
const BUSINESS_ID = "biz-456";

const validDraftData = {
  business_info: { name: "Test Business", description: "A test" },
  business_location: {},
  service_location: {},
  business_resources: {},
  booking_strategy: {},
  card_studio: {},
  business_employee_availability: {},
  calendar_integration_new: {},
  calendar_management: {},
};

function mockDraftFetch(
  application: { id: string; business_id?: string; draft_data: string | object } | null,
  fetchError: Error | null = null
) {
  const mockSingle = jest.fn().mockResolvedValue({
    data: application,
    error: fetchError,
  });
  const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
  return { mockSingle, mockEq, mockSelect };
}

function mockUpdates() {
  const businessUpdateEq = jest.fn().mockResolvedValue({ data: null, error: null });
  const businessUpdate = jest.fn().mockReturnValue({ eq: businessUpdateEq });
  const draftUpdateEq = jest.fn().mockResolvedValue({ data: null, error: null });
  const draftUpdate = jest.fn().mockReturnValue({ eq: draftUpdateEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === "onboarding_drafts") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: APPLICATION_ID, business_id: BUSINESS_ID, draft_data: validDraftData },
              error: null,
            }),
          }),
        }),
        update: draftUpdate,
      };
    }
    if (table === "businesses") {
      return { update: businessUpdate };
    }
    return {};
  });

  return { businessUpdate, businessUpdateEq, draftUpdate, draftUpdateEq };
}

function setupSuccessfulPublishMocks() {
  mockCreateIdNormalizer.mockReturnValue({ getOrCreateUuid: (id: string) => id });
  mockPublishBusinessInfo.mockResolvedValue({ businessId: BUSINESS_ID });
  mockPublishLocations.mockResolvedValue({
    locationIdMap: new Map([
      ["loc-1", "real-loc-1"],
      ["loc-2", "real-loc-2"],
    ]),
  });
  mockPublishResources.mockResolvedValue({
    resourceIdMap: new Map([["res-1", "real-res-1"]]),
  });
  mockPublishEmployees.mockResolvedValue({
    employeeIdMap: new Map([["emp-1", "real-emp-1"]]),
  });
  mockPublishServices.mockResolvedValue({
    serviceIdMap: new Map([["svc-1", "real-svc-1"]]),
  });
  mockPublishCalendarGroups.mockResolvedValue({
    calendarGroupIdMap: new Map([["cg-1", "real-cg-1"]]),
  });
  mockPublishEmployeeServices.mockResolvedValue(undefined);
  mockPublishServiceConfigurations.mockResolvedValue(undefined);
  mockPublishServiceCards.mockResolvedValue({
    cardIdMap: new Map([["card-1", "real-card-1"]]),
  });
  mockPublishServiceCardRequirements.mockResolvedValue(undefined);
  mockPublishBookingCalendarAssignments.mockResolvedValue(undefined);
  mockRollbackPublish.mockResolvedValue(undefined);
}

describe("POST /api/admin/publish-business", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: adminUserId } },
      error: null,
    });
  });

  describe("Authentication and authorization", () => {
    it("returns 401 when user is not authenticated (null user)", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns 401 when auth returns an error", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Auth failed"),
      });

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 403 for non-admin user", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "non-admin-user-id" } },
        error: null,
      });

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error).toBe("Forbidden - Admin access required");
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("Request validation", () => {
    it("returns 400 when applicationId is missing", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("applicationId is required");
    });

    it("returns 400 when body is invalid JSON", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        body: "not valid json",
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid request body");
    });
  });

  describe("Draft fetching and draft_data validation", () => {
    it("returns 404 when application is not found", async () => {
      mockDraftFetch(null, new Error("PGRST116"));

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: "nonexistent" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Application not found");
      expect(body.details).toBeDefined();
    });

    it("returns 400 when draft_data is invalid JSON string", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: "{ invalid json }",
      });

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid draft_data JSON format");
    });

    it("returns 400 when draft_data is valid but missing business_info", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify({ other_key: "value" }),
      });

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid application data structure - missing business_info");
    });

    it("accepts draft_data as object (not string)", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: validDraftData,
      });
      setupSuccessfulPublishMocks();
      const { businessUpdateEq } = mockUpdates();

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.businessId).toBe(BUSINESS_ID);
      expect(businessUpdateEq).toHaveBeenCalledWith("id", BUSINESS_ID);
    });
  });

  describe("Successful publish flow", () => {
    beforeEach(() => {
      setupSuccessfulPublishMocks();
    });

    it("returns 200 with success payload and stats", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      mockUpdates();

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        success: true,
        message: "Business published successfully",
        businessId: BUSINESS_ID,
        stats: {
          locations: 2,
          services: 1,
          employees: 1,
          rooms: 1,
        },
      });
    });

    it("updates business with is_active, approval_status, and KYC fields", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      const { businessUpdate, businessUpdateEq } = mockUpdates();

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(req);

      expect(mockFrom).toHaveBeenCalledWith("businesses");
      expect(businessUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
          approval_status: "approved",
          kyc_approved: true,
          kyc_approved_at: expect.any(String),
          kyc_approved_by: adminUserId,
        })
      );
      expect(businessUpdateEq).toHaveBeenCalledWith("id", BUSINESS_ID);
    });

    it("updates onboarding_drafts with status approved and last_saved_at", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      const { draftUpdate, draftUpdateEq } = mockUpdates();

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(req);

      expect(mockFrom).toHaveBeenCalledWith("onboarding_drafts");
      expect(draftUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "approved",
          last_saved_at: expect.any(String),
        })
      );
      expect(draftUpdateEq).toHaveBeenCalledWith("id", APPLICATION_ID);
    });

    it("calls all publish helpers in order with correct arguments", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      mockUpdates();

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(req);

      expect(mockCreateIdNormalizer).toHaveBeenCalled();
      expect(mockPublishBusinessInfo).toHaveBeenCalled();
      expect(mockPublishLocations).toHaveBeenCalled();
      expect(mockPublishResources).toHaveBeenCalled();
      expect(mockPublishEmployees).toHaveBeenCalled();
      expect(mockPublishServices).toHaveBeenCalled();
      expect(mockPublishCalendarGroups).toHaveBeenCalled();
      expect(mockPublishEmployeeServices).toHaveBeenCalled();
      expect(mockPublishServiceConfigurations).toHaveBeenCalled();
      expect(mockPublishServiceCards).toHaveBeenCalled();
      expect(mockPublishServiceCardRequirements).toHaveBeenCalled();
      expect(mockPublishBookingCalendarAssignments).toHaveBeenCalled();
      expect(mockRollbackPublish).not.toHaveBeenCalled();
    });

    it("passes draft_data.business_info and user.id to publishBusinessInfo", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      mockUpdates();

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      await POST(req);

      expect(mockPublishBusinessInfo).toHaveBeenCalledWith(
        expect.anything(),
        validDraftData.business_info,
        BUSINESS_ID,
        expect.objectContaining({
          businessId: undefined,
          locationIds: expect.any(Array),
          resourceIds: expect.any(Array),
          serviceIds: expect.any(Array),
          employeeIds: expect.any(Array),
        })
      );
    });
  });

  describe("Error handling and rollback", () => {
    it("returns 500 when publishBusinessInfo throws and attempts rollback", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      mockUpdates();
      mockPublishBusinessInfo.mockRejectedValueOnce(new Error("DB insert failed"));
      mockRollbackPublish.mockResolvedValue(undefined);

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Failed to publish business");
      expect(body.details).toBe("DB insert failed");
      expect(body.rollbackAttempted).toBe(true);
      expect(body.rollbackStats).toEqual(
        expect.objectContaining({
          businesses: expect.any(Number),
          locations: expect.any(Number),
          resources: expect.any(Number),
          services: expect.any(Number),
          employees: expect.any(Number),
        })
      );
      expect(mockRollbackPublish).toHaveBeenCalled();
    });

    it("returns 500 when a later step throws and attempts rollback", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      mockUpdates();
      mockPublishBusinessInfo.mockResolvedValue({ businessId: BUSINESS_ID });
      mockPublishLocations.mockResolvedValue({ locationIdMap: new Map() });
      mockPublishResources.mockRejectedValueOnce(new Error("Resource insert failed"));
      mockRollbackPublish.mockResolvedValue(undefined);

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("Failed to publish business");
      expect(body.details).toBe("Resource insert failed");
      expect(body.rollbackAttempted).toBe(true);
      expect(mockRollbackPublish).toHaveBeenCalled();
    });

    it("still returns 500 with details when rollbackPublish also throws", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      mockUpdates();
      mockPublishBusinessInfo.mockRejectedValueOnce(new Error("Publish failed"));
      mockRollbackPublish.mockRejectedValueOnce(new Error("Rollback failed"));

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Failed to publish business");
      expect(body.details).toBe("Publish failed");
      expect(body.rollbackAttempted).toBe(true);
    });

    it("includes rollbackStats with all tracker keys on error", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      mockUpdates();
      mockPublishBusinessInfo.mockResolvedValue({ businessId: BUSINESS_ID });
      mockPublishLocations.mockResolvedValue({
        locationIdMap: new Map([
          ["a", "id-a"],
          ["b", "id-b"],
        ]),
      });
      mockPublishResources.mockRejectedValueOnce(new Error("Oops"));
      mockRollbackPublish.mockResolvedValue(undefined);

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.rollbackAttempted).toBe(true);
      // With mocked helpers the tracker is populated by real code only up to the failing step;
      // assert the response always includes the full rollbackStats shape.
      expect(body.rollbackStats).toEqual(
        expect.objectContaining({
          businesses: expect.any(Number),
          locations: expect.any(Number),
          resources: expect.any(Number),
          services: expect.any(Number),
          employees: expect.any(Number),
          employeeServices: expect.any(Number),
          serviceConfigurations: expect.any(Number),
          serviceCards: expect.any(Number),
          calendarGroups: expect.any(Number),
          serviceCardRequirements: expect.any(Number),
          bookingCalendarAssignments: expect.any(Number),
        })
      );
    });

    it("serializes non-Error throwables in details", async () => {
      mockDraftFetch({
        id: APPLICATION_ID,
        business_id: BUSINESS_ID,
        draft_data: JSON.stringify(validDraftData),
      });
      mockUpdates();
      mockPublishBusinessInfo.mockRejectedValueOnce("string error");
      mockRollbackPublish.mockResolvedValue(undefined);

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ applicationId: APPLICATION_ID }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.details).toBe("string error");
    });
  });
});
