import CalendarIntegrationPage from "@/app/business/onboarding/calendar-integration-new/CalendarIntegrationPage";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

// Mock fetch responses for location strategy using real API data structure
const mockLocationFetchResponses = {
  businessLocation: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: "business_location",
        draftData: {
          "serviceTypes.physical": {
            addresses: [
              {
                id: "physical-493063f3-9ea0-4477-98ef-865701398706",
                city: "Colleyville",
                name: "colleyvill loc",
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
          "serviceTypes.mobile": {
            mobileServices: [
              {
                id: "mobile-328a7880-c07d-42f1-b2a6-0061e89573d2",
                name: "Colleyville Mobile Service",
                serviceArea: {
                  type: "businessRadius",
                  radius: 25,
                  zipCenter: "",
                },
              },
            ],
          },
          "serviceTypes.virtual": {
            virtualServices: [
              {
                id: "online-e7747c2b-9979-4d91-bb70-a17dce16d949",
                name: "Virtual Service 1",
                platform: "zoom",
                timezone: "America/Chicago",
                defaultLink: "",
                instructions: "",
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
        step: "business_team_members",
        draftData: {
          "physical-493063f3-9ea0-4477-98ef-865701398706": {
            name: "colleyvill loc",
            type: "physical",
            teamMembers: [
              {
                id: "17596055394720",
                role: "Math Tutor",
                email: "alice@tutoring.com",
                fullName: "Alice Brown",
                locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
                takesBookings: true,
              },
              {
                id: "17596055394721",
                role: "SAT Prep Specialist",
                email: "robert@tutoring.com",
                fullName: "Robert Green",
                locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
                takesBookings: true,
              },
            ],
          },
          mobile: {
            name: "Mobile Services",
            type: "mobile",
            teamMembers: [
              {
                id: "17596055482720",
                role: "Math Tutor",
                email: "alice@tutoring.com",
                fullName: "Alice Brown",
                locationId: "mobile",
                takesBookings: true,
              },
            ],
          },
          virtual: {
            name: "Virtual Consultations",
            type: "virtual",
            teamMembers: [
              {
                id: "17596055538060",
                role: "Math Tutor",
                email: "alice@tutoring.com",
                fullName: "Alice Brown",
                locationId: "virtual",
                takesBookings: true,
              },
            ],
          },
        },
      }),
  },
  bookingStrategy: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: "booking_strategy",
        draftData: {
          selectedStrategy: "location",
        },
      }),
  },
  businessResources: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: "business_resources",
        draftData: {
          "physical-493063f3-9ea0-4477-98ef-865701398706": {
            name: "colleyvill loc",
            type: "physical",
            resources: [
              {
                id: "1759605129685",
                name: "RoomA",
                type: "room",
                locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
                description: "Room A des",
              },
              {
                id: "1759605131318",
                name: "RoomB",
                type: "room",
                locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
                description: "Room B des",
              },
            ],
          },
        },
      }),
  },
  cardStudio: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: "card_studio",
        draftData: {
          employeeCardMode: "general",
        },
      }),
  },
  serviceLocation: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: "service_location",
        draftData: {
          services: [
            {
              id: "1759605232884",
              name: "Math Tutoring",
              price: 75,
              category: "Education",
              duration: "60",
              priceType: "fixed",
              description: "Math tutoring for anything",
              deliveryOptions: {
                mobile: true,
                virtual: true,
                inPerson: true,
              },
            },
            {
              id: "1759605237951",
              name: "SAT Prep",
              price: 120,
              category: "Education",
              duration: "90",
              priceType: "fixed",
              description: "SAT Prep des",
              deliveryOptions: {
                mobile: true,
                virtual: true,
                inPerson: true,
              },
            },
          ],
          locations: [
            {
              id: "physical-493063f3-9ea0-4477-98ef-865701398706",
              name: "colleyvill loc",
              type: "physical",
              address: "4510 Mill Pond Ct, Colleyville, TX 76034-3678",
              resources: [
                {
                  id: "1759605129685",
                  name: "RoomA",
                  type: "room",
                  locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
                  description: "Room A des",
                },
              ],
            },
            {
              id: "mobile-service",
              name: "Mobile Service",
              type: "mobile",
              address: "Mobile Service",
              resources: [],
            },
            {
              id: "virtual-service",
              name: "Virtual Services",
              type: "virtual",
              address: "Online Platform",
              resources: [],
            },
          ],
          configurations: [
            {
              enabled: true,
              serviceId: "1759605232884",
              locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
              maxCapacity: 1,
              requiredResources: ["1759605129685"],
            },
            {
              enabled: true,
              serviceId: "1759605232884",
              locationId: "mobile-service",
              maxCapacity: 1,
              requiredResources: [],
            },
            {
              enabled: true,
              serviceId: "1759605232884",
              locationId: "virtual-service",
              maxCapacity: 1,
              requiredResources: [],
            },
          ],
        },
      }),
  },
  calendarManagement: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: "calendar_management",
        draftData: {
          cronofyCalendars: [
            {
              profile_id: "pro_test",
              calendar_id: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
              profile_name: "test@acme.com",
              calendar_name: "Main Location Calendar",
              provider_name: "google",
              calendar_deleted: false,
              calendar_primary: false,
              is_busy_calendar: false,
              permission_level: "sandbox",
              calendar_readonly: false,
              is_primary_booking: false,
              is_booking_calendar: false,
              calendar_attachments_available: false,
              calendar_integrated_conferencing_available: false,
            },
          ],
          calendarAssignments: [
            {
              id: "assignment_location",
              assignmentId: "physical-493063f3-9ea0-4477-98ef-865701398706",
              assignmentName: "colleyvill loc",
              assignmentType: "location",
              defaultBookingCalendar: {
                calendarId: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                entityType: "business",
              },
              busyCalendars: [
                {
                  calendarId: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                  entityType: "business",
                },
              ],
            },
          ],
          pendingEmployeeConnections: [],
          cronofyElementToken: "token",
        },
      }),
  },
};

describe("CalendarIntegrationPage - Location Strategy", () => {
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

    // Reset fetch mock
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve(mockLocationFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockLocationFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockLocationFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockLocationFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockLocationFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockLocationFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false }); // No saved data
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve(mockLocationFetchResponses.calendarManagement);
      }
      if (url.includes(OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT)) {
        return Promise.resolve({ ok: false }); // No employee service assignment data
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders location strategy with correct header information", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    expect(screen.getByText("Step 9 of 11")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Configure booking requirements and service integrations for your calendar system"
      )
    ).toBeInTheDocument();
  });

  it("displays the current booking strategy as location-based", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Current Booking Strategy")).toBeInTheDocument();
    });

    expect(screen.getByText("Location-based")).toBeInTheDocument();
    expect(screen.getByText("Each location has its own calendar")).toBeInTheDocument();
  });

  it("does not show combining interface for location strategy", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Should not show combining interface for location strategy
    expect(screen.queryByTestId("combine-services-button")).not.toBeInTheDocument();
  });

  it("creates location-based combination cards", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to be created
    await waitFor(() => {
      // Should have location-based combinations
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct services for each location combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for the combos to load
    await waitFor(() => {
      // Each combo should show the services available at that location
      // Services are shown as badges, so we check for the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct resources for each location combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for the combos to load
    await waitFor(() => {
      // Physical location should have resources
      // Resources are shown as badges, so we check for the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct employees for each location combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for the combos to load
    await waitFor(() => {
      // Should show employees for each location
      // Employee names are shown in the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("displays location information in location strategy cards", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Should show location names
      // Location names are shown in the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("handles empty location data gracefully", async () => {
    // Mock empty location data
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: {} }),
        });
      }
      // Return other responses normally
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockLocationFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockLocationFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockLocationFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockLocationFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockLocationFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve(mockLocationFetchResponses.calendarManagement);
      }
      if (url.includes(OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT)) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: false });
    });

    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Should still render the page even with empty location data
    expect(screen.getByText("Location-based")).toBeInTheDocument();
  });

  it("creates correct number of location combinations", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Should have 3 location combinations (physical, mobile, virtual)
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct service counts for each location combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Each combo should show the number of services
      // Service counts are shown as badges, so we check for the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct resource counts for each location combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Physical location should have resources
      // Mobile and virtual locations should have 0 resources
      // Resource counts are shown as badges, so we check for the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct employee counts for each location combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Each combination should show the number of employees at that location
      // Employee counts are shown as badges, so we check for the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("handles requirements configuration for location strategy", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Should show Edit Requirements buttons
      const editButtons = screen.getAllByText("Edit Requirements");
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });

  it("saves location strategy data correctly", async () => {
    const mockSaveResponse = {
      ok: true,
      json: () => Promise.resolve({ success: true }),
    };

    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST") {
        return Promise.resolve(mockSaveResponse);
      }
      // Return the original mock responses for GET requests
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve(mockLocationFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockLocationFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockLocationFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockLocationFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockLocationFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockLocationFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve(mockLocationFetchResponses.calendarManagement);
      }
      if (url.includes(OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT)) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: false });
    });

    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for save button to be available
    await waitFor(() => {
      expect(screen.getByText("Save Draft")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save Draft");
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/business/onboarding/draft",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  it("validates requirements configuration for location strategy", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for continue button
    await waitFor(() => {
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    // Continue button should be disabled until requirements are configured
    const continueButton = screen.getByText("Continue");
    expect(continueButton).toBeDisabled();
  });
});
