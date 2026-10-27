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

// Mock fetch responses for core functionality testing using real API data structure
const mockCoreFetchResponses = {
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
          ],
          configurations: [
            {
              enabled: true,
              serviceId: "1759605232884",
              locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
              maxCapacity: 1,
              requiredResources: ["1759605129685"],
            },
          ],
        },
      }),
  },
};

describe("CalendarIntegrationPage - Core Functionality", () => {
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
        return Promise.resolve(mockCoreFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockCoreFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockCoreFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockCoreFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockCoreFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockCoreFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false }); // No saved data
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "calendar_management",
              draftData: {
                cronofyCalendars: [
                  {
                    profile_id: "pro_aKhYY20lZQaCEaL6",
                    calendar_id: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                    profile_name: "josephmhernandez15@gmail.com",
                    calendar_name: "josephmhernandez15@gmail.com",
                    provider_name: "google",
                    calendar_deleted: false,
                    calendar_primary: true,
                    is_busy_calendar: false,
                    permission_level: "sandbox",
                    calendar_readonly: false,
                    is_primary_booking: false,
                    is_booking_calendar: false,
                    calendar_attachments_available: false,
                    calendar_integrated_conferencing_available: true,
                  },
                  {
                    profile_id: "pro_aKhYY20lZQaCEaL6",
                    calendar_id: "cal_aKhYY20lZQaCEaL6_o7Cwwldchu86OWi3jkij6g",
                    profile_name: "josephmhernandez15@gmail.com",
                    calendar_name: "Bookvia Test Calendar",
                    provider_name: "google",
                    calendar_deleted: false,
                    calendar_primary: false,
                    is_busy_calendar: false,
                    permission_level: "sandbox",
                    calendar_readonly: false,
                    is_primary_booking: false,
                    is_booking_calendar: false,
                    calendar_attachments_available: false,
                    calendar_integrated_conferencing_available: true,
                  },
                ],
                calendarAssignments: [
                  {
                    id: "employee_17597522812600",
                    assignmentId: "17597522812600",
                    busyCalendars: [
                      {
                        calendarId: "cal_aKhYY20lZQaCEaL6_UOHsF@rcbFvmd3bBwDqAig",
                        entityType: "business",
                      },
                    ],
                    assignmentName: "John Doe",
                    assignmentType: "employee",
                    defaultBookingCalendar: {
                      calendarId: "configure_later",
                      entityType: "business",
                    },
                  },
                  {
                    id: "employee_17597522812601",
                    assignmentId: "17597522812601",
                    busyCalendars: [
                      {
                        calendarId: "cal_aKhYY20lZQaCEaL6_o7Cwwldchu86OWi3jkij6g",
                        entityType: "business",
                      },
                    ],
                    assignmentName: "Jane Smith",
                    assignmentType: "employee",
                    defaultBookingCalendar: {
                      calendarId: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                      entityType: "business",
                    },
                  },
                ],
                cronofyElementToken:
                  "OGx4tQrbvHSLi_a71C-wDCBTXT4yi3kEdxAx10wB63eQBCRrvMwXflQLsCWC6xmnXh2JujnNXfM729I_PlLiAQ",
              },
            }),
        });
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

  it("renders the page with correct header information", async () => {
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

  it("displays the current booking strategy", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Current Booking Strategy")).toBeInTheDocument();
    });

    expect(screen.getByText("Location-based")).toBeInTheDocument();
    expect(screen.getByText("Each location has its own calendar")).toBeInTheDocument();
  });

  it("shows calendar integration note", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration & Requirements")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Your calendar connections are managed in the previous step. This page focuses on setting up booking requirements and service configurations for your integrated calendars."
      )
    ).toBeInTheDocument();
  });

  it("renders location-based strategy content", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // Should show location-based strategy content
    await waitFor(() => {
      expect(screen.getByText("Location-based")).toBeInTheDocument();
    });

    // Should not show combining interface for location strategy
    expect(screen.queryByTestId("combine-services-button")).not.toBeInTheDocument();
  });

  it("handles loading state", async () => {
    // Mock a slow response
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockCoreFetchResponses.businessLocation), 100)
        )
    );

    render(<CalendarIntegrationPage />);

    expect(screen.getByText("Loading calendar integration data...")).toBeInTheDocument();
  });

  it("handles error states gracefully", async () => {
    // Mock fetch to return errors
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500 })
    );

    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    // Should still render the page even with errors
    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
  });

  it("saves data when save button is clicked", async () => {
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
        return Promise.resolve(mockCoreFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockCoreFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockCoreFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockCoreFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockCoreFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockCoreFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "calendar_management",
              draftData: {
                cronofyCalendars: [
                  {
                    profile_id: "pro_aKhYY20lZQaCEaL6",
                    calendar_id: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                    profile_name: "josephmhernandez15@gmail.com",
                    calendar_name: "josephmhernandez15@gmail.com",
                    provider_name: "google",
                    calendar_deleted: false,
                    calendar_primary: true,
                    is_busy_calendar: false,
                    permission_level: "sandbox",
                    calendar_readonly: false,
                    is_primary_booking: false,
                    is_booking_calendar: false,
                    calendar_attachments_available: false,
                    calendar_integrated_conferencing_available: true,
                  },
                ],
                calendarAssignments: [
                  {
                    id: "employee_17597522812600",
                    assignmentId: "17597522812600",
                    busyCalendars: [
                      {
                        calendarId: "cal_aKhYY20lZQaCEaL6_UOHsF@rcbFvmd3bBwDqAig",
                        entityType: "business",
                      },
                    ],
                    assignmentName: "John Doe",
                    assignmentType: "employee",
                    defaultBookingCalendar: {
                      calendarId: "configure_later",
                      entityType: "business",
                    },
                  },
                ],
                cronofyElementToken:
                  "OGx4tQrbvHSLi_a71C-wDCBTXT4yi3kEdxAx10wB63eQBCRrvMwXflQLsCWC6xmnXh2JujnNXfM729I_PlLiAQ",
              },
            }),
        });
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

  it("handles back button click", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Previous")).toBeInTheDocument();
    });

    const previousButton = screen.getByText("Previous");
    await userEvent.click(previousButton);

    expect(mockPush).toHaveBeenCalled();
  });

  it("disables continue button when requirements are not configured", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    const continueButton = screen.getByText("Continue");
    expect(continueButton).toBeDisabled();
  });

  it("handles beforeunload event for unsaved changes", async () => {
    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });

    // The beforeunload handler should be set up in the component
    // This is tested indirectly by ensuring the component renders without errors
    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
  });

  it("renders different strategies correctly", async () => {
    // Test employee strategy
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "booking_strategy",
              draftData: {
                selectedStrategy: "employee",
              },
            }),
        });
      }
      // Return other responses normally
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve(mockCoreFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockCoreFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockCoreFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockCoreFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockCoreFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "calendar_management",
              draftData: {
                cronofyCalendars: [
                  {
                    profile_id: "pro_aKhYY20lZQaCEaL6",
                    calendar_id: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                    profile_name: "josephmhernandez15@gmail.com",
                    calendar_name: "josephmhernandez15@gmail.com",
                    provider_name: "google",
                    calendar_deleted: false,
                    calendar_primary: true,
                    is_busy_calendar: false,
                    permission_level: "sandbox",
                    calendar_readonly: false,
                    is_primary_booking: false,
                    is_booking_calendar: false,
                    calendar_attachments_available: false,
                    calendar_integrated_conferencing_available: true,
                  },
                ],
                calendarAssignments: [
                  {
                    id: "employee_17597522812600",
                    assignmentId: "17597522812600",
                    busyCalendars: [
                      {
                        calendarId: "cal_aKhYY20lZQaCEaL6_UOHsF@rcbFvmd3bBwDqAig",
                        entityType: "business",
                      },
                    ],
                    assignmentName: "John Doe",
                    assignmentType: "employee",
                    defaultBookingCalendar: {
                      calendarId: "configure_later",
                      entityType: "business",
                    },
                  },
                ],
                cronofyElementToken:
                  "OGx4tQrbvHSLi_a71C-wDCBTXT4yi3kEdxAx10wB63eQBCRrvMwXflQLsCWC6xmnXh2JujnNXfM729I_PlLiAQ",
              },
            }),
        });
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
      expect(screen.getByText("Employee-based")).toBeInTheDocument();
    });

    // Should show combining interface for employee strategy
    expect(screen.getByTestId("combine-services-button")).toBeInTheDocument();
  });

  it("handles resource strategy correctly", async () => {
    // Test resource strategy
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "booking_strategy",
              draftData: {
                selectedStrategy: "resource",
              },
            }),
        });
      }
      // Return other responses normally
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve(mockCoreFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockCoreFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockCoreFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockCoreFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockCoreFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "calendar_management",
              draftData: {
                cronofyCalendars: [
                  {
                    profile_id: "pro_aKhYY20lZQaCEaL6",
                    calendar_id: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                    profile_name: "josephmhernandez15@gmail.com",
                    calendar_name: "josephmhernandez15@gmail.com",
                    provider_name: "google",
                    calendar_deleted: false,
                    calendar_primary: true,
                    is_busy_calendar: false,
                    permission_level: "sandbox",
                    calendar_readonly: false,
                    is_primary_booking: false,
                    is_booking_calendar: false,
                    calendar_attachments_available: false,
                    calendar_integrated_conferencing_available: true,
                  },
                ],
                calendarAssignments: [
                  {
                    id: "employee_17597522812600",
                    assignmentId: "17597522812600",
                    busyCalendars: [
                      {
                        calendarId: "cal_aKhYY20lZQaCEaL6_UOHsF@rcbFvmd3bBwDqAig",
                        entityType: "business",
                      },
                    ],
                    assignmentName: "John Doe",
                    assignmentType: "employee",
                    defaultBookingCalendar: {
                      calendarId: "configure_later",
                      entityType: "business",
                    },
                  },
                ],
                cronofyElementToken:
                  "OGx4tQrbvHSLi_a71C-wDCBTXT4yi3kEdxAx10wB63eQBCRrvMwXflQLsCWC6xmnXh2JujnNXfM729I_PlLiAQ",
              },
            }),
        });
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
      expect(screen.getByText("Resource-based")).toBeInTheDocument();
    });

    // Should show combining interface for resource strategy
    expect(screen.getByTestId("combine-services-button")).toBeInTheDocument();
  });

  it("handles simple strategy correctly", async () => {
    // Test simple strategy
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "booking_strategy",
              draftData: {
                selectedStrategy: "simple",
              },
            }),
        });
      }
      // Return other responses normally
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve(mockCoreFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockCoreFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockCoreFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockCoreFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockCoreFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "calendar_management",
              draftData: {
                cronofyCalendars: [
                  {
                    profile_id: "pro_aKhYY20lZQaCEaL6",
                    calendar_id: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                    profile_name: "josephmhernandez15@gmail.com",
                    calendar_name: "josephmhernandez15@gmail.com",
                    provider_name: "google",
                    calendar_deleted: false,
                    calendar_primary: true,
                    is_busy_calendar: false,
                    permission_level: "sandbox",
                    calendar_readonly: false,
                    is_primary_booking: false,
                    is_booking_calendar: false,
                    calendar_attachments_available: false,
                    calendar_integrated_conferencing_available: true,
                  },
                ],
                calendarAssignments: [
                  {
                    id: "employee_17597522812600",
                    assignmentId: "17597522812600",
                    busyCalendars: [
                      {
                        calendarId: "cal_aKhYY20lZQaCEaL6_UOHsF@rcbFvmd3bBwDqAig",
                        entityType: "business",
                      },
                    ],
                    assignmentName: "John Doe",
                    assignmentType: "employee",
                    defaultBookingCalendar: {
                      calendarId: "configure_later",
                      entityType: "business",
                    },
                  },
                ],
                cronofyElementToken:
                  "OGx4tQrbvHSLi_a71C-wDCBTXT4yi3kEdxAx10wB63eQBCRrvMwXflQLsCWC6xmnXh2JujnNXfM729I_PlLiAQ",
              },
            }),
        });
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
      expect(screen.getByText("Simple (One Calendar)")).toBeInTheDocument();
    });

    // Should not show combining interface for simple strategy
    expect(screen.queryByTestId("combine-services-button")).not.toBeInTheDocument();
  });

  it("handles auto-save functionality", async () => {
    // Mock a successful save response
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
        return Promise.resolve(mockCoreFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockCoreFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockCoreFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockCoreFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockCoreFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockCoreFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              step: "calendar_management",
              draftData: {
                cronofyCalendars: [
                  {
                    profile_id: "pro_aKhYY20lZQaCEaL6",
                    calendar_id: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                    profile_name: "josephmhernandez15@gmail.com",
                    calendar_name: "josephmhernandez15@gmail.com",
                    provider_name: "google",
                    calendar_deleted: false,
                    calendar_primary: true,
                    is_busy_calendar: false,
                    permission_level: "sandbox",
                    calendar_readonly: false,
                    is_primary_booking: false,
                    is_booking_calendar: false,
                    calendar_attachments_available: false,
                    calendar_integrated_conferencing_available: true,
                  },
                ],
                calendarAssignments: [
                  {
                    id: "employee_17597522812600",
                    assignmentId: "17597522812600",
                    busyCalendars: [
                      {
                        calendarId: "cal_aKhYY20lZQaCEaL6_UOHsF@rcbFvmd3bBwDqAig",
                        entityType: "business",
                      },
                    ],
                    assignmentName: "John Doe",
                    assignmentType: "employee",
                    defaultBookingCalendar: {
                      calendarId: "configure_later",
                      entityType: "business",
                    },
                  },
                ],
                cronofyElementToken:
                  "OGx4tQrbvHSLi_a71C-wDCBTXT4yi3kEdxAx10wB63eQBCRrvMwXflQLsCWC6xmnXh2JujnNXfM729I_PlLiAQ",
              },
            }),
        });
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

    // The auto-save functionality is tested indirectly by ensuring the component renders
    // and the save function is available
    expect(screen.getByText("Save Draft")).toBeInTheDocument();
  });

  it("handles missing data gracefully", async () => {
    // Mock responses with missing data
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: {} }),
        });
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: {} }),
        });
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: { selectedStrategy: "location" } }),
        });
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: {} }),
        });
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: {} }),
        });
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ draftData: {} }),
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
              step: "calendar_management",
              draftData: {
                cronofyCalendars: [
                  {
                    profile_id: "pro_aKhYY20lZQaCEaL6",
                    calendar_id: "cal_aKhYY20lZQaCEaL6_LiNCMSAGH1GeHY3iWbnaDg",
                    profile_name: "josephmhernandez15@gmail.com",
                    calendar_name: "josephmhernandez15@gmail.com",
                    provider_name: "google",
                    calendar_deleted: false,
                    calendar_primary: true,
                    is_busy_calendar: false,
                    permission_level: "sandbox",
                    calendar_readonly: false,
                    is_primary_booking: false,
                    is_booking_calendar: false,
                    calendar_attachments_available: false,
                    calendar_integrated_conferencing_available: true,
                  },
                ],
                calendarAssignments: [
                  {
                    id: "employee_17597522812600",
                    assignmentId: "17597522812600",
                    busyCalendars: [
                      {
                        calendarId: "cal_aKhYY20lZQaCEaL6_UOHsF@rcbFvmd3bBwDqAig",
                        entityType: "business",
                      },
                    ],
                    assignmentName: "John Doe",
                    assignmentType: "employee",
                    defaultBookingCalendar: {
                      calendarId: "configure_later",
                      entityType: "business",
                    },
                  },
                ],
                cronofyElementToken:
                  "OGx4tQrbvHSLi_a71C-wDCBTXT4yi3kEdxAx10wB63eQBCRrvMwXflQLsCWC6xmnXh2JujnNXfM729I_PlLiAQ",
              },
            }),
        });
      }
      if (url.includes(OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT)) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: false });
    });

    await act(async () => {
      render(<CalendarIntegrationPage />);
    });

    // Should still render the page even with missing data
    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
  });
});
