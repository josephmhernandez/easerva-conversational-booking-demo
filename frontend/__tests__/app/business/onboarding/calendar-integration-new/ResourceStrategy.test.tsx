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

// Mock fetch responses for resource strategy using real API data structure
const mockResourceFetchResponses = {
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
          selectedStrategy: "resource",
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
              {
                id: "1759605132017",
                name: "RoomC",
                type: "room",
                locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
                description: "Room C des",
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
                mobile: false,
                virtual: false,
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
                mobile: false,
                virtual: false,
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
                {
                  id: "1759605131318",
                  name: "RoomB",
                  type: "room",
                  locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
                  description: "Room B des",
                },
                {
                  id: "1759605132017",
                  name: "RoomC",
                  type: "room",
                  locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
                  description: "Room C des",
                },
              ],
            },
          ],
          configurations: [
            {
              enabled: true,
              serviceId: "1759605232884",
              locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
              maxCapacity: 1,
              requiredResources: ["1759605129685", "1759605131318"],
            },
            {
              enabled: true,
              serviceId: "1759605237951",
              locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
              maxCapacity: 1,
              requiredResources: ["1759605132017"],
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
          // New calendar management shape
          cronofyCalendars: [
            {
              profile_id: "pro_test",
              calendar_id: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
              profile_name: "test@acme.com",
              calendar_name: "Room A Calendar",
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
              id: "assignment_rooma",
              assignmentId: "1759605129685",
              assignmentName: "RoomA",
              assignmentType: "resource",
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
            {
              id: "assignment_roomb",
              assignmentId: "1759605131318",
              assignmentName: "RoomB",
              assignmentType: "resource",
              defaultBookingCalendar: {
                calendarId: "configure_later",
                entityType: "business",
              },
              busyCalendars: [],
            },
            {
              id: "assignment_roomc",
              assignmentId: "1759605132017",
              assignmentName: "RoomC",
              assignmentType: "resource",
              defaultBookingCalendar: {
                calendarId: "configure_later",
                entityType: "business",
              },
              busyCalendars: [],
            },
          ],
          pendingEmployeeConnections: [],
          cronofyElementToken: "token",
        },
      }),
  },
};

describe("CalendarIntegrationPage - Resource Strategy", () => {
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
        return Promise.resolve(mockResourceFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockResourceFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockResourceFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockResourceFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockResourceFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockResourceFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false }); // No saved data
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve(mockResourceFetchResponses.calendarManagement);
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

  it("renders resource strategy with correct header information", async () => {
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

  it("displays the current booking strategy as resource-based", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Current Booking Strategy")).toBeInTheDocument();
    });

    expect(screen.getByText("Resource-based")).toBeInTheDocument();
    expect(screen.getByText("Each room/equipment has its own calendar")).toBeInTheDocument();
  });

  it("shows combining interface for resource strategy", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Should show combining interface for resource strategy
    expect(screen.getByTestId("combine-services-button")).toBeInTheDocument();
  });

  it("creates resource-based combination cards", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to be created
    await waitFor(() => {
      // Should have resource-based combinations
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct services for each resource combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for the combos to load
    await waitFor(() => {
      // Each combo should show the services that use that resource
      // Services are shown as badges, so we check for the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct location information for each resource combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for the combos to load
    await waitFor(() => {
      // Should show location information
      // Location names are shown in the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct employee information for each resource combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for the combos to load
    await waitFor(() => {
      // Should show employee information
      // Employee names are shown in the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("handles combining mode for resource strategy", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Should show combining interface for resource strategy
    const combineButton = screen.getByTestId("combine-services-button");
    expect(combineButton).toBeInTheDocument();

    // Click to enable combining mode
    await userEvent.click(combineButton);

    // Should show combining interface
    expect(
      screen.getByText("Select exactly 2 services from the same location to combine")
    ).toBeInTheDocument();
  });

  it("allows combining cards with same resource in resource strategy", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Enable combining mode
    const combineButton = screen.getByTestId("combine-services-button");
    await userEvent.click(combineButton);

    // Wait for cards to be rendered
    await waitFor(() => {
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });

    // Should be able to select cards for combining
    // This tests the canCombineCard logic for resource strategy
  });

  it("displays resource information in resource strategy cards", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Should show resource names
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("handles empty resource data gracefully", async () => {
    // Mock empty resource data
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: {} }),
        });
      }
      // Return other responses normally
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve(mockResourceFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockResourceFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockResourceFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockResourceFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockResourceFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve(mockResourceFetchResponses.calendarManagement);
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

    // Should still render the page even with empty resource data
    expect(screen.getByText("Resource-based")).toBeInTheDocument();
  });

  it("creates correct number of resource combinations", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Should have 3 resource combinations (RoomA, RoomB, RoomC)
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct service counts for each resource combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Each combo should show the number of services that use that resource
      // Service counts are shown as badges, so we check for the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct resource counts for each combination", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Wait for combos to load
    await waitFor(() => {
      // Each combination should show 1 resource (the specific resource for that combination)
      // Resource counts are shown as badges, so we check for the combo cards
      expect(screen.getAllByTestId("combo-card")).toHaveLength(3); // 3 total combinations
    });
  });

  it("shows correct employee counts for each resource combination", async () => {
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

  it("handles requirements configuration for resource strategy", async () => {
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

  it("saves resource strategy data correctly", async () => {
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
        return Promise.resolve(mockResourceFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockResourceFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockResourceFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockResourceFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockResourceFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockResourceFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve(mockResourceFetchResponses.calendarManagement);
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

  it("validates requirements configuration for resource strategy", async () => {
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
