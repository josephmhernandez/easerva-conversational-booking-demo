/**
 * Unit Tests for Business Onboarding Review API Route
 *
 * Tests the API route that processes and flattens business application data
 * for admin review, including authentication, data processing, and error handling.
 */

import { GET } from "@/app/api/business/onboarding/review/route";
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

describe("Business Onboarding Review API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NextResponse.json as jest.Mock).mockImplementation((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
    }));
  });

  // Helper function to create mock Supabase query chain
  const createMockQuery = (mockData: any, mockError: any = null) => {
    const mockEq = jest.fn().mockResolvedValue({
      data: mockData,
      error: mockError,
    });
    const mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
    });

    return { mockSelect, mockEq };
  };

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" }, { status: 401 });
    });

    it("should return 401 when user is not admin", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "different-user-id" } },
        error: null,
      });

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" }, { status: 401 });
    });

    it("should allow access for admin user", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
        error: null,
      });

      const mockSelect = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      await GET();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("onboarding_drafts");
      expect(mockSelect).toHaveBeenCalledWith("*");
    });
  });

  describe("Data Fetching", () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
        error: null,
      });
    });

    it("should return empty array when no drafts found", async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith({
        applications: [],
      });
    });

    it("should handle database errors gracefully", async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { code: "OTHER_ERROR", message: "Database error" },
      });
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { code: "OTHER_ERROR", message: "Database error" },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith({ applications: [] }, { status: 200 });
    });

    it("should handle PGRST116 error (no rows)", async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith({
        applications: [],
      });
    });
  });

  describe("Data Processing", () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
        error: null,
      });
    });

    it("should process minimal application data correctly", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            description: "A test business",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: ["tech", "startup"],
          },
        },
        step_validation: {
          business_info: { completed: true },
          business_location: { completed: false },
        },
      };

      createMockQuery([mockDraft]);

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith({
        applications: [
          expect.objectContaining({
            id: "draft-1",
            businessInfo: expect.objectContaining({
              name: "Test Business",
              slug: "test-business",
              category: "Technology",
            }),
            locations: [],
            services: [],
            employees: [],
            cards: [],
            bookingCombinations: [],
            summary: expect.objectContaining({
              totalLocations: 0,
              totalServices: 0,
              totalEmployees: 0,
              totalCards: 0,
              totalBookingCombinations: 0,
              completedSteps: 1,
              totalSteps: 2,
            }),
          }),
        ],
      });
    });

    it("should process physical locations correctly", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            description: "A test business",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          business_location: {
            "serviceTypes.physical": {
              addresses: [
                {
                  id: "location-1",
                  name: "Main Office",
                  line1: "123 Main St",
                  line2: "Suite 100",
                  city: "San Francisco",
                  state: "CA",
                  zipCode: "94105",
                  phone: "415-555-0123",
                },
              ],
            },
          },
          business_resources: {
            "location-1": {
              name: "Main Office",
              type: "physical",
              resources: [
                {
                  id: "resource-1",
                  name: "Conference Room A",
                  type: "room",
                  description: "Large conference room",
                },
              ],
            },
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.locations).toHaveLength(1);
      expect(application.locations[0]).toEqual({
        id: "location-1",
        name: "Main Office",
        type: "physical",
        address: "123 Main St, Suite 100, San Francisco, CA 94105",
        resources: [
          {
            id: "resource-1",
            name: "Conference Room A",
            type: "room",
            description: "Large conference room",
          },
        ],
      });
    });

    it("should process mobile and virtual locations correctly", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            description: "A test business",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          business_location: {
            "serviceTypes.mobile": {
              serviceArea: {
                type: "radius_zip_code",
                radius: 50,
              },
            },
            "serviceTypes.virtual": {
              virtualSettings: {
                platform: "Zoom",
                timezone: "America/Los_Angeles",
              },
            },
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.locations).toHaveLength(2);

      const mobileLocation = application.locations.find((l: any) => l.type === "mobile");
      expect(mobileLocation).toEqual({
        id: "mobile-service",
        name: "Mobile Service",
        type: "mobile",
        address: "Mobile Service Area",
        resources: [],
      });

      const virtualLocation = application.locations.find((l: any) => l.type === "virtual");
      expect(virtualLocation).toEqual({
        id: "virtual-service",
        name: "Virtual Services",
        type: "virtual",
        address: "Zoom Platform",
        resources: [],
      });
    });

    it("should process services with relationships correctly", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            description: "A test business",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          business_services: [
            {
              id: "service-1",
              name: "Consultation",
              category: "Consulting",
              description: "Business consultation",
              duration: 60,
              pricing: {
                type: "fixed",
                displayText: "$150",
              },
              price: 150,
            },
          ],
          service_location: {
            configurations: [
              {
                serviceId: "service-1",
                locationId: "location-1",
                enabled: true,
              },
            ],
          },
          employee_service_assignment: {
            assignments: [
              {
                serviceId: "service-1",
                employeeId: "employee-1",
                enabled: true,
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.services).toHaveLength(1);
      expect(application.services[0]).toEqual({
        id: "service-1",
        name: "Consultation",
        category: "Consulting",
        description: "Business consultation",
        duration: 60,
        pricing: {
          type: "fixed",
          amount: 150,
          min: undefined,
          max: undefined,
          displayText: "$150",
        },
        locations: ["location-1"],
        employees: ["employee-1"],
      });
    });

    it("should process employees correctly", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            description: "A test business",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          booking_strategy: {
            employees: [
              {
                id: "employee-1",
                fullName: "John Doe",
                role: "Senior Consultant",
                email: "john@test.com",
                locationId: "location-1",
                takesBookings: true,
              },
            ],
          },
          employee_service_assignment: {
            assignments: [
              {
                serviceId: "service-1",
                employeeId: "employee-1",
                enabled: true,
              },
              {
                serviceId: "service-2",
                employeeId: "employee-1",
                enabled: true,
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.employees).toHaveLength(1);
      expect(application.employees[0]).toEqual({
        id: "employee-1",
        fullName: "John Doe",
        role: "Senior Consultant",
        email: "john@test.com",
        locationId: "location-1",
        takesBookings: true,
        services: ["service-1", "service-2"],
      });
    });

    it("should process cards correctly", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            description: "A test business",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          card_studio: {
            cards: [
              {
                id: "card-1",
                name: "Business Card",
                type: "business",
                headline: "Welcome to Our Business",
                tagline: "Quality Service",
                description: "Professional services",
                serviceIds: ["service-1"],
                locationId: "location-1",
                employeeId: undefined,
                mediaUrl: "https://example.com/image.jpg",
                price: "$100",
                ctaText: "Book Now",
                isComplete: true,
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.cards).toHaveLength(1);
      expect(application.cards[0]).toEqual({
        id: "card-1",
        name: "Business Card",
        type: "business",
        headline: "Welcome to Our Business",
        tagline: "Quality Service",
        description: "Professional services",
        serviceIds: ["service-1"],
        locationId: "location-1",
        employeeId: undefined,
        mediaUrl: "https://example.com/image.jpg",
        price: "$100",
        ctaText: "Book Now",
        isComplete: true,
      });
    });

    it("should handle missing optional data gracefully", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {}, // Empty data
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application).toEqual({
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        businessInfo: {
          name: "",
          slug: "",
          category: "",
          description: "",
          phone: "",
          email: "",
          website: "",
          logoUrl: undefined,
          tags: [],
        },
        calendarManagement: {
          employeeCalendars: [],
          locationCalendars: [],
          resourceCalendars: [],
          summary: {
            totalEmployeeCalendars: 0,
            totalLocationCalendars: 0,
            totalResourceCalendars: 0,
            unconfiguredCount: 0,
          },
        },
        locations: [],
        services: [],
        employees: [],
        cards: [],
        bookingCombinations: [],
        summary: {
          totalLocations: 0,
          totalServices: 0,
          totalEmployees: 0,
          totalCards: 0,
          totalBookingCombinations: 0,
          completedSteps: 0,
          totalSteps: 0,
        },
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
        error: null,
      });
    });

    it("should handle unexpected errors gracefully", async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error("Unexpected database error");
      });

      await GET();

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Internal server error" },
        { status: 500 }
      );
    });

    it("should handle malformed draft data", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: null,
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      // Should not throw and should return processed data
      expect(NextResponse.json).toHaveBeenCalledWith({
        applications: expect.arrayContaining([
          expect.objectContaining({
            id: "draft-1",
          }),
        ]),
      });
    });
  });

  describe("Data Consistency", () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
        error: null,
      });
    });

    it("should maintain referential integrity between services and locations", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            description: "A test business",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          business_services: [
            {
              id: "service-1",
              name: "Service 1",
              category: "Test",
              description: "Test service",
              duration: 30,
            },
          ],
          service_location: {
            configurations: [
              {
                serviceId: "service-1",
                locationId: "location-1",
                enabled: true,
              },
              {
                serviceId: "service-1",
                locationId: "location-2",
                enabled: false, // Should not be included
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];
      const service = application.services[0];

      expect(service.locations).toEqual(["location-1"]);
      expect(service.locations).not.toContain("location-2");
    });

    it("should maintain referential integrity between employees and services", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            description: "A test business",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          booking_strategy: {
            employees: [
              {
                id: "employee-1",
                fullName: "John Doe",
                role: "Consultant",
                email: "john@test.com",
                locationId: "location-1",
                takesBookings: true,
              },
            ],
          },
          employee_service_assignment: {
            assignments: [
              {
                serviceId: "service-1",
                employeeId: "employee-1",
                enabled: true,
              },
              {
                serviceId: "service-2",
                employeeId: "employee-1",
                enabled: false, // Should not be included
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];
      const employee = application.employees[0];

      expect(employee.services).toEqual(["service-1"]);
      expect(employee.services).not.toContain("service-2");
    });
  });

  describe("Card Matching Logic", () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
        error: null,
      });
    });

    it("should match cards with exact employee + location + service IDs", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          card_studio: {
            cards: [
              {
                id: "card-1",
                name: "Employee Card 1",
                type: "employee",
                headline: "Test",
                tagline: "Test",
                description: "Test",
                serviceIds: ["service-1"],
                locationId: "location-1",
                employeeId: "employee-1",
                ctaText: "Book Now",
                isComplete: true,
              },
              {
                id: "card-2",
                name: "Employee Card 2",
                type: "employee",
                headline: "Test",
                tagline: "Test",
                description: "Test",
                serviceIds: ["service-1"],
                locationId: "location-2",
                employeeId: "employee-1",
                ctaText: "Book Now",
                isComplete: true,
              },
            ],
          },
          calendar_integration_new: {
            serviceLocationCombos: [
              {
                id: "combo-1",
                employeeId: "employee-1",
                locationId: "location-1",
                locationName: "Location 1",
                address: "123 Main St",
                cardType: "employee-location",
                logicType: "any",
                services: [
                  {
                    id: "service-1",
                    name: "Service 1",
                    price: 100,
                    locationId: "location-1",
                    requiredResources: [],
                  },
                ],
                employees: [],
                resources: [],
                requirements: [
                  {
                    id: "employee-1",
                    name: "Employee 1",
                    type: "employee",
                    displayName: "Employee 1",
                  },
                ],
                combiningAllowed: false,
                combinedFromServices: [],
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.bookingCombinations).toHaveLength(1);
      expect(application.bookingCombinations[0].associatedCardId).toBe("card-1");
    });

    it("should handle combinations without matching cards", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          card_studio: {
            cards: [
              {
                id: "card-1",
                name: "Employee Card 1",
                type: "employee",
                headline: "Test",
                tagline: "Test",
                description: "Test",
                serviceIds: ["service-2"], // Different service
                locationId: "location-1",
                employeeId: "employee-1",
                ctaText: "Book Now",
                isComplete: true,
              },
            ],
          },
          calendar_integration_new: {
            serviceLocationCombos: [
              {
                id: "combo-1",
                employeeId: "employee-1",
                locationId: "location-1",
                locationName: "Location 1",
                address: "123 Main St",
                cardType: "employee-location",
                logicType: "any",
                services: [
                  {
                    id: "service-1",
                    name: "Service 1",
                    price: 100,
                    locationId: "location-1",
                    requiredResources: [],
                  },
                ],
                employees: [],
                resources: [],
                requirements: [
                  {
                    id: "employee-1",
                    name: "Employee 1",
                    type: "employee",
                    displayName: "Employee 1",
                  },
                ],
                combiningAllowed: false,
                combinedFromServices: [],
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.bookingCombinations).toHaveLength(1);
    });
  });

  describe("Calendar Management Processing", () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
        error: null,
      });
    });

    it("should only include calendars used in booking combinations", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          calendar_integration_new: {
            serviceLocationCombos: [
              {
                id: "combo-1",
                employeeId: "employee-1",
                locationId: "location-1",
                locationName: "Location 1",
                address: "123 Main St",
                cardType: "employee-location",
                logicType: "any",
                services: [
                  {
                    id: "service-1",
                    name: "Service 1",
                    price: 100,
                    locationId: "location-1",
                    requiredResources: [],
                  },
                ],
                employees: [],
                resources: [],
                requirements: [
                  {
                    id: "employee-1",
                    name: "Employee 1",
                    type: "employee",
                    displayName: "Employee 1",
                  },
                ],
                combiningAllowed: false,
                combinedFromServices: [],
              },
            ],
            employeeCalendars: [
              {
                id: "employee-1",
                fullName: "Employee 1",
                email: "emp1@test.com",
              },
              {
                id: "employee-2",
                fullName: "Employee 2",
                email: "emp2@test.com",
              },
            ],
            calendarAssignments: [
              {
                entityId: "employee-1",
                entityType: "employee",
                calendarId: "cal-123",
                isPending: false,
                calendarName: "Test Calendar",
                provider: "Google",
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.calendarManagement.employeeCalendars).toHaveLength(1);
      expect(application.calendarManagement.employeeCalendars[0].id).toBe("employee-1");
    });

    it("should correctly identify unconfigured calendars", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          calendar_integration_new: {
            serviceLocationCombos: [
              {
                id: "combo-1",
                employeeId: "employee-1",
                locationId: "location-1",
                locationName: "Location 1",
                address: "123 Main St",
                cardType: "employee-location",
                logicType: "any",
                services: [
                  {
                    id: "service-1",
                    name: "Service 1",
                    price: 100,
                    locationId: "location-1",
                    requiredResources: [],
                  },
                ],
                employees: [],
                resources: [],
                requirements: [
                  {
                    id: "employee-1",
                    name: "Employee 1",
                    type: "employee",
                    displayName: "Employee 1",
                  },
                ],
                combiningAllowed: false,
                combinedFromServices: [],
              },
            ],
            employeeCalendars: [
              {
                id: "employee-1",
                fullName: "Employee 1",
                email: "emp1@test.com",
              },
            ],
            calendarAssignments: [
              {
                entityId: "employee-1",
                entityType: "employee",
                calendarId: "configure_later",
                isPending: true,
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.calendarManagement.employeeCalendars[0].needsConfiguration).toBe(true);
      expect(application.calendarManagement.employeeCalendars[0].isConfigured).toBe(false);
      expect(application.calendarManagement.summary.unconfiguredCount).toBe(1);
    });

    it("should calculate summary counts correctly", async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        business_id: "business-1",
        status: "submitted",
        current_step: "review",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        last_saved_at: "2023-01-01T00:00:00Z",
        draft_data: {
          business_info: {
            name: "Test Business",
            slug: "test-business",
            category: "Technology",
            phone: "123-456-7890",
            email: "test@example.com",
            website: "https://test.com",
            tags: [],
          },
          calendar_integration_new: {
            serviceLocationCombos: [
              {
                id: "combo-1",
                employeeId: "employee-1",
                locationId: "location-1",
                locationName: "Location 1",
                address: "123 Main St",
                cardType: "employee-location",
                logicType: "any",
                services: [
                  {
                    id: "service-1",
                    name: "Service 1",
                    price: 100,
                    locationId: "location-1",
                    requiredResources: [],
                  },
                ],
                employees: [],
                resources: [
                  { id: "resource-1", name: "Resource 1", type: "vehicle", description: "Test" },
                ],
                requirements: [
                  {
                    id: "employee-1",
                    name: "Employee 1",
                    type: "employee",
                    displayName: "Employee 1",
                  },
                ],
                combiningAllowed: false,
                combinedFromServices: [],
              },
            ],
            employeeCalendars: [
              {
                id: "employee-1",
                fullName: "Employee 1",
                email: "emp1@test.com",
              },
            ],
            locationCalendars: [
              {
                id: "location-1",
                name: "Location 1",
                calendar: {
                  calendarId: "cal-456",
                  calendarName: "Location Calendar",
                  provider: "Google",
                },
              },
            ],
            resourceCalendars: [
              {
                id: "resource-1",
                name: "Resource 1",
                type: "vehicle",
                calendar: {
                  calendarId: "configure_later",
                },
              },
            ],
            calendarAssignments: [
              {
                entityId: "employee-1",
                entityType: "employee",
                calendarId: "cal-123",
                isPending: false,
                calendarName: "Employee Calendar",
                provider: "Google",
              },
              {
                entityId: "location-1",
                entityType: "location",
                calendarId: "cal-456",
                isPending: false,
                calendarName: "Location Calendar",
                provider: "Google",
              },
            ],
          },
        },
        step_validation: {},
      };

      createMockQuery([mockDraft]);

      await GET();

      const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
      const application = callArgs.applications[0];

      expect(application.calendarManagement.summary.totalEmployeeCalendars).toBe(1);
      expect(application.calendarManagement.summary.totalLocationCalendars).toBe(1);
      expect(application.calendarManagement.summary.totalResourceCalendars).toBe(1);
      expect(application.calendarManagement.summary.unconfiguredCount).toBe(1); // Only resource is unconfigured
    });
  });
});
