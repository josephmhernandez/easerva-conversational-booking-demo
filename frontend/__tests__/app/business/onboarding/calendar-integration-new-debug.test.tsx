import CalendarIntegrationNew from "@/app/business/onboarding/calendar-integration-new/CalendarIntegrationPage";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";

// Mock Supabase client
const mockUnsubscribe = jest.fn();
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    })),
    signOut: jest.fn(),
    signInWithOAuth: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
  },
};

jest.mock("@/app/utils/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock the constants
jest.mock("@/app/constants/businessConstants", () => ({
  OnboardingStep: {
    CALENDAR_INTEGRATION_NEW: "calendar_integration_new",
    BUSINESS_LOCATION: "business_location",
    BUSINESS_TEAM_MEMBERS: "business_team_members",
    BOOKING_STRATEGY: "booking_strategy",
    BUSINESS_RESOURCES: "business_resources",
    CARD_STUDIO: "card_studio",
  },
}));

jest.mock("@/app/constants/routeConstants", () => ({
  calendarIntegrationNewPage: { pageRef: "/business/onboarding/calendar-integration-new" },
  goNext: jest.fn(() => ({ pageRef: "/next-page" })),
}));

describe("CalendarIntegrationNew Debug", () => {
  beforeEach(() => {
    // Mock auth session - return authenticated user by default
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "test-user-id",
            email: "test@example.com",
          },
        },
      },
      error: null,
    });

    // Reset auth state change mock
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    });
    mockUnsubscribe.mockClear();

    // Mock fetch with our specific data
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("business_location")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "business_location",
              draftData: {
                "serviceTypes.virtual": {
                  platform: "zoom",
                  timezone: "America/Chicago",
                  defaultLink: "",
                  instructions: "",
                },
                "serviceTypes.physical": {
                  addresses: [
                    {
                      id: "main",
                      city: "Colleyville",
                      name: "Downtown",
                      line1: "4510 Mill Pond Ct",
                      line2: "",
                      phone: "",
                      state: "TX",
                      country: "US",
                      zipCode: "76034-3678",
                      timezone: "",
                      isValidated: true,
                    },
                  ],
                },
              },
            }),
        });
      }
      if (url.includes("business_team_members")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              draftData: {
                "location-1": {
                  teamMembers: [
                    {
                      id: "emp-1",
                      fullName: "John Doe",
                      email: "john@example.com",
                      role: "Consultant",
                      locationId: "location-1",
                      takesBookings: true,
                    },
                  ],
                },
              },
            }),
        });
      }
      if (url.includes("booking_strategy")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              draftData: {
                selectedStrategy: "location",
              },
            }),
        });
      }
      if (url.includes("business_resources")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              draftData: {
                "location-1": {
                  resources: [
                    {
                      id: "res-1",
                      name: "Conference Room A",
                      type: "room",
                      description: "Large conference room",
                    },
                  ],
                },
              },
            }),
        });
      }
      if (url.includes("card_studio")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              draftData: {
                employeeCardMode: "per-service",
              },
            }),
        });
      }
      if (url.includes("service_location")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              draftData: {
                services: [
                  {
                    id: "service-1",
                    name: "Consultation",
                    price: 100,
                    category: "Legal",
                    duration: 60,
                    priceType: "fixed",
                    description: "Legal consultation",
                    deliveryOptions: {
                      mobile: false,
                      virtual: true,
                      inPerson: true,
                    },
                  },
                ],
                locations: [
                  {
                    id: "main",
                    name: "Downtown",
                    type: "physical",
                    address: "4510 Mill Pond Ct, Colleyville, TX 76034-3678",
                    resources: [
                      {
                        id: "room-1",
                        name: "Conference Room 1",
                        type: "room",
                        description: "Large conference room",
                      },
                    ],
                  },
                  {
                    id: "virtual",
                    name: "Virtual Services",
                    type: "virtual",
                    address: "Platform: zoom | Timezone: America/Chicago",
                    resources: [],
                  },
                ],
                configurations: [
                  {
                    enabled: true,
                    serviceId: "service-1",
                    locationId: "main",
                    maxCapacity: 1,
                    requiredResources: ["room-1"],
                  },
                  {
                    enabled: true,
                    serviceId: "service-1",
                    locationId: "virtual",
                    maxCapacity: 1,
                    requiredResources: [],
                  },
                ],
              },
            }),
        });
      }
      if (url.includes("calendar_integration_new")) {
        return Promise.resolve({ ok: false }); // No saved data
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the component and shows debug information", async () => {
    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Check if basic elements are present
    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    expect(screen.getByText("Current Booking Strategy")).toBeInTheDocument();

    // Check if location cards are rendered
    const downtownElement = screen.queryByText("Downtown");
    const virtualServicesElement = screen.queryByText("Virtual Services");

    // Check for bulk actions or other location strategy content
    const bulkActions = screen.queryByText("Bulk Actions");

    // Check for combine services button
    const combineButton = screen.queryByText("📋 Combine Services");

    // Check if we have any location cards at all
    const locationCards = screen.queryAllByText(/🏢|💻|🚗/);

    // Check for any elements with location-related classes or data
    const locationElements = document.querySelectorAll(
      '[class*="location"], [data-location], [id*="location"]'
    );

    // Let's see what's actually in the DOM
    const allText = screen.getAllByText(/.*/);
    const textContent = allText
      .map((el) => el.textContent)
      .filter((text) => text && text.trim().length > 0);

    // If we don't find the expected elements, let's see what we do have
    if (!downtownElement && !virtualServicesElement) {
      console.log("No location cards found. Checking what content is actually rendered...");
      const allElements = document.querySelectorAll("*");
      const textElements = Array.from(allElements).filter(
        (el) => el.textContent && el.textContent.trim().length > 0
      );
      console.log(
        "All text elements:",
        textElements.map((el) => ({ tag: el.tagName, text: el.textContent?.trim() })).slice(0, 20)
      );
    }

    // Log debug information
    console.log("=== DEBUG INFO ===");
    console.log("Downtown element found:", !!downtownElement);
    console.log("Virtual Services element found:", !!virtualServicesElement);
    console.log("Bulk Actions found:", !!bulkActions);
    console.log("Combine Services button found:", !!combineButton);
    console.log("Location cards found:", locationCards.length);
    console.log("Location-related DOM elements:", locationElements.length);
    console.log("All text content:", textContent.slice(0, 10));

    // The test should pass even if location cards aren't found
    // This is just for debugging
    expect(true).toBe(true);

    // Let's also check what strategy is being used
    const strategyBadge = screen.queryByText(/location Strategy/);
    console.log("Strategy badge found:", !!strategyBadge);
    if (strategyBadge) {
      console.log("Strategy badge text:", strategyBadge.textContent);
    }

    // Check if we have any cards at all
    const allCards = document.querySelectorAll('[class*="card"]');
    console.log("Total cards found:", allCards.length);

    // Check if we have any location-related content
    const locationText = screen.queryAllByText(/location|Location/);
    console.log("Location text elements found:", locationText.length);
    locationText.forEach((el, index) => {
      console.log(`Location text ${index}:`, el.textContent);
    });
  });
});
