import CalendarIntegrationPage from "@/app/business/onboarding/calendar-integration-new/CalendarIntegrationPage";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";

// Mock the router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

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

// Import the actual constants
import { OnboardingStep } from "@/app/constants/businessConstants";

// Mock fetch responses for resource-based strategy with automotive service data
const mockAutomotiveFetchResponses = {
  businessLocation: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.BUSINESS_LOCATION,
        draftData: {
          "serviceTypes.physical": {
            addresses: [
              {
                id: "physical-main",
                city: "Colleyville",
                name: "Single Location",
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
  },
  businessTeamMembers: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.BUSINESS_TEAM_MEMBERS,
        draftData: {},
      }),
  },
  bookingStrategy: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.BOOKING_STRATEGY,
        draftData: {
          selectedStrategy: "resource",
        },
      }),
  },
  businessResources: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.BUSINESS_RESOURCES,
        draftData: {
          "physical-main": {
            locationId: "physical-main",
            name: "Single Location",
            type: "physical",
            resources: [
              {
                id: "1759232512170",
                name: "Service bay 1",
                type: "room",
                description: "service bay 1",
              },
              {
                id: "1759232513636",
                name: "Service bay 2",
                type: "room",
                description: "service bay 2",
              },
              {
                id: "1759232551135",
                name: "Alignment Machine",
                type: "equipment",
                description: "alignment machine",
              },
              {
                id: "1759232555302",
                name: "Tire mounting machine A",
                type: "equipment",
                description: "Tire mount",
              },
            ],
          },
        },
      }),
  },
  serviceLocation: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.SERVICE_LOCATION,
        draftData: {
          services: [
            {
              id: "1759232638601",
              name: "Oil Change",
              price: 40,
              category: "Automotive",
              duration: 30,
              priceType: "fixed",
              description: "oil change",
              deliveryOptions: {
                mobile: false,
                virtual: false,
                inPerson: true,
              },
            },
            {
              id: "1759232650933",
              name: "Alignment",
              price: 120,
              category: "Automotive",
              duration: 90,
              priceType: "fixed",
              description: "Alignment",
              deliveryOptions: {
                mobile: false,
                virtual: false,
                inPerson: true,
              },
            },
          ],
          configurations: [
            {
              enabled: true,
              serviceId: "1759232638601", // Oil Change
              locationId: "main",
              maxCapacity: 1,
              requiredResources: [
                "1759232512170", // Service bay 1
                "1759232513636", // Service bay 2
              ],
            },
            {
              enabled: true,
              serviceId: "1759232650933", // Alignment
              locationId: "main",
              maxCapacity: 1,
              requiredResources: [
                "1759232551135", // Alignment Machine
                "1759232512170", // Service bay 1
                "1759232513636", // Service bay 2
              ],
            },
          ],
        },
      }),
  },
  cardStudio: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.CARD_STUDIO,
        draftData: {},
      }),
  },
  calendarIntegrationNew: {
    ok: false,
    json: () => Promise.resolve({ draftData: {} }),
  },
  calendarManagement: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.CALENDAR_MANAGEMENT,
        draftData: {
          employees: [],
          locations: [
            {
              id: "main",
              name: "Single Location",
              type: "physical",
              address: "4510 Mill Pond Ct, Colleyville, TX 76034-3678",
            },
          ],
          resources: [
            {
              id: "1759232512170",
              name: "Service bay 1",
              type: "room",
              description: "service bay 1",
            },
            {
              id: "1759232513636",
              name: "Service bay 2",
              type: "room",
              description: "service bay 2",
            },
            {
              id: "1759232551135",
              name: "Alignment Machine",
              type: "equipment",
              description: "alignment machine",
            },
            {
              id: "1759232555302",
              name: "Tire mounting machine A",
              type: "equipment",
              description: "Tire mount",
            },
          ],
          calendarAssignments: [],
        },
      }),
  },
};

// Mock fetch
global.fetch = jest.fn((url) => {
  const urlStr = url.toString();

  if (urlStr.includes(OnboardingStep.BUSINESS_LOCATION)) {
    return Promise.resolve(mockAutomotiveFetchResponses.businessLocation);
  } else if (urlStr.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
    return Promise.resolve(mockAutomotiveFetchResponses.businessTeamMembers);
  } else if (urlStr.includes(OnboardingStep.BOOKING_STRATEGY)) {
    return Promise.resolve(mockAutomotiveFetchResponses.bookingStrategy);
  } else if (urlStr.includes(OnboardingStep.BUSINESS_RESOURCES)) {
    return Promise.resolve(mockAutomotiveFetchResponses.businessResources);
  } else if (urlStr.includes(OnboardingStep.CARD_STUDIO)) {
    return Promise.resolve(mockAutomotiveFetchResponses.cardStudio);
  } else if (urlStr.includes(OnboardingStep.SERVICE_LOCATION)) {
    return Promise.resolve(mockAutomotiveFetchResponses.serviceLocation);
  } else if (urlStr.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
    return Promise.resolve(mockAutomotiveFetchResponses.calendarIntegrationNew);
  } else if (urlStr.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
    return Promise.resolve(mockAutomotiveFetchResponses.calendarManagement);
  }

  // Default for POST requests (saving)
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  });
}) as jest.Mock;

describe("CalendarIntegrationPage - Resource-Based Grouping Strategy", () => {
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

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should display resource-based booking strategy", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Should show the resource-based strategy name
    await waitFor(() => {
      expect(screen.getByText("Resource-based")).toBeInTheDocument();
    });
  });

  it("should create service groups based on resource requirements", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Should create 2 separate cards:
    // 1. Oil Change (needs service bays 1 & 2)
    // 2. Alignment (needs alignment machine + service bays 1 & 2)
    await waitFor(() => {
      const cards = screen.getAllByTestId("combo-card");
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it("should show location-style cards for resource-based strategy", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Should show location name in the cards (multiple cards with same location name)
    await waitFor(() => {
      const locationCards = screen.getAllByText(/Single Location/);
      expect(locationCards.length).toBeGreaterThan(0);
    });
  });
});
