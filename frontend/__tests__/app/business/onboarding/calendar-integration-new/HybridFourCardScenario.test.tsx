import CalendarIntegrationPage from "@/app/business/onboarding/calendar-integration-new/CalendarIntegrationPage";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";

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

import { OnboardingStep } from "@/app/constants/businessConstants";

describe("CalendarIntegrationPage - Hybrid Strategy four-card scenario", () => {
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

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: OnboardingStep.BUSINESS_LOCATION,
              draftData: {
                "serviceTypes.physical": {
                  addresses: [
                    {
                      id: "main",
                      name: "Main Location",
                      city: "",
                      line1: "",
                      state: "",
                      country: "",
                      zipCode: "",
                      timezone: "",
                      isValidated: true,
                    },
                    {
                      id: "location-1758376721088",
                      name: "Sub Plano location",
                      city: "",
                      line1: "",
                      state: "",
                      country: "",
                      zipCode: "",
                      timezone: "",
                      isValidated: true,
                    },
                  ],
                },
              },
            }),
        });
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: { selectedStrategy: "hybrid" } }),
        });
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: OnboardingStep.BUSINESS_TEAM_MEMBERS,
              draftData: {
                main: {
                  teamMembers: [
                    {
                      id: "17599263113090",
                      fullName: "Chloe Davis",
                      email: "chloe@salonstyle.com",
                      role: "Senior Stylist",
                      locationId: "main",
                      takesBookings: true,
                    },
                    {
                      id: "17599263113091",
                      fullName: "Ethan Miller",
                      email: "ethan@salonstyle.com",
                      role: "Men's Barber & Stylist",
                      locationId: "main",
                      takesBookings: true,
                    },
                    {
                      id: "17599263113092",
                      fullName: "Olivia Harris",
                      email: "olivia@salonstyle.com",
                      role: "Junior Colorist",
                      locationId: "main",
                      takesBookings: true,
                    },
                  ],
                },
                "location-1758376721088": {
                  teamMembers: [
                    {
                      id: "17599263362920",
                      fullName: "Noah Thompson",
                      email: "noah@salonstyle.com",
                      role: "Hair Assistant",
                      locationId: "location-1758376721088",
                      takesBookings: true,
                    },
                  ],
                },
              },
            }),
        });
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ draftData: {} }) });
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ draftData: {} }) });
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: { configurations: [] } }),
        });
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              draftData: {
                cronofyCalendars: [],
                calendarAssignments: [],
                pendingEmployeeConnections: [],
              },
            }),
        });
      }
      if (url.includes(OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "employee_service_assignment",
              draftData: {
                services: [
                  {
                    id: "1759926523173",
                    name: "hair cut",
                    category: "Beauty",
                    anonymous: false,
                    basePrice: 75,
                    locations: ["physical"],
                    baseDuration: "60",
                    requiresEmployee: true,
                  },
                  {
                    id: "1759926602690",
                    name: "coloring",
                    category: "Beauty",
                    anonymous: false,
                    basePrice: 0,
                    locations: ["physical"],
                    baseDuration: "180",
                    requiresEmployee: true,
                  },
                  {
                    id: "1759926604705",
                    name: "haircut and shave",
                    category: "Beauty",
                    anonymous: false,
                    basePrice: 100,
                    locations: ["physical"],
                    baseDuration: "60",
                    requiresEmployee: true,
                  },
                ],
                employees: [
                  {
                    id: "17599263113090",
                    role: "Senior Stylist",
                    email: "chloe@salonstyle.com",
                    fullName: "Chloe Davis",
                    locationId: "main",
                    takesBookings: true,
                  },
                  {
                    id: "17599263113091",
                    role: "Men's Barber & Stylist",
                    email: "ethan@salonstyle.com",
                    fullName: "Ethan Miller",
                    locationId: "main",
                    takesBookings: true,
                  },
                  {
                    id: "17599263113092",
                    role: "Junior Colorist",
                    email: "olivia@salonstyle.com",
                    fullName: "Olivia Harris",
                    locationId: "main",
                    takesBookings: true,
                  },
                  {
                    id: "17599263362920",
                    role: "Hair Assistant",
                    email: "noah@salonstyle.com",
                    fullName: "Noah Thompson",
                    locationId: "location-1758376721088",
                    takesBookings: true,
                  },
                ],
                locations: [
                  {
                    id: "main",
                    name: "Main Location",
                    type: "physical",
                    address: "4510 Mill Pond Ct, Colleyville, TX 76034-3678",
                  },
                  {
                    id: "location-1758376721088",
                    name: "Sub Plano location",
                    type: "physical",
                    address: "8610 Southwestern blvd. , Dallas, TX 75206",
                  },
                ],
                assignments: [
                  // Main location: 3 employees
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926523173",
                    employeeId: "17599263113090",
                    locationId: "main",
                  },
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926602690",
                    employeeId: "17599263113090",
                    locationId: "main",
                  },
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926604705",
                    employeeId: "17599263113090",
                    locationId: "main",
                  },

                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926523173",
                    employeeId: "17599263113091",
                    locationId: "main",
                  },
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926602690",
                    employeeId: "17599263113091",
                    locationId: "main",
                  },
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926604705",
                    employeeId: "17599263113091",
                    locationId: "main",
                  },

                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926523173",
                    employeeId: "17599263113092",
                    locationId: "main",
                  },
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926602690",
                    employeeId: "17599263113092",
                    locationId: "main",
                  },
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926604705",
                    employeeId: "17599263113092",
                    locationId: "main",
                  },

                  // Sub Plano location: 1 employee
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926523173",
                    employeeId: "17599263362920",
                    locationId: "location-1758376721088",
                  },
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926602690",
                    employeeId: "17599263362920",
                    locationId: "location-1758376721088",
                  },
                  {
                    enabled: true,
                    visible: true,
                    serviceId: "1759926604705",
                    employeeId: "17599263362920",
                    locationId: "location-1758376721088",
                  },
                ],
              },
            }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders only four unique employee-location cards", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    await waitFor(() => {
      const cards = screen.getAllByTestId("combo-card");
      expect(cards).toHaveLength(4);
    });
  });
});
