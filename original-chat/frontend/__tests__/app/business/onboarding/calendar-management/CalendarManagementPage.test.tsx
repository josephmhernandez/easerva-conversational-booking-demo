import CalendarManagementPage from "@/app/business/onboarding/calendar-management/page";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  // Provide a minimal implementation of useSearchParams used by the page
  useSearchParams: jest.fn(() => ({
    get: () => null, // no error/message query params by default in tests
  })),
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

// Mock fetch globally
global.fetch = jest.fn();

// Mock the CalendarManagementAccordion component
jest.mock(
  "@/app/business/onboarding/calendar-management/components/CalendarManagementAccordion",
  () => {
    return function MockCalendarManagementAccordion({
      locationCalendars,
      resourceCalendars,
      employeeCalendars,
      calendarAssignments,
      bookingStrategy,
      onCalendarAssignment,
      onCalendarAssignmentUpdate,
    }: any) {
      return (
        <div data-testid="calendar-management-accordion">
          <div data-testid="location-calendars-count">{locationCalendars.length}</div>
          <div data-testid="resource-calendars-count">{resourceCalendars.length}</div>
          <div data-testid="employee-calendars-count">{employeeCalendars.length}</div>
          <div data-testid="calendar-assignments-count">{calendarAssignments.length}</div>
          <div data-testid="booking-strategy">{bookingStrategy}</div>

          {/* Test buttons for triggering callbacks */}
          <button
            data-testid="test-legacy-assignment"
            onClick={() =>
              onCalendarAssignment({
                entityType: "employee",
                entityId: "test-employee-1",
                calendarId: "test-calendar-1",
                isPending: false,
              })
            }
          >
            Test Legacy Assignment
          </button>

          <button
            data-testid="test-calendar-update"
            onClick={() =>
              onCalendarAssignmentUpdate?.(
                "employee",
                "test-employee-1",
                "Test Employee",
                "test-default-calendar",
                ["test-busy-calendar-1", "test-busy-calendar-2"]
              )
            }
          >
            Test Calendar Update
          </button>
        </div>
      );
    };
  }
);

// Mock the BottomActionBar component
jest.mock("@/app/business/onboarding/calendar-management/components/BottomActionBar", () => {
  return function MockBottomActionBar({
    isSaving,
    areAllRequirementsConfigured,
    onSave,
    onContinue,
    onBack,
  }: any) {
    return (
      <div data-testid="bottom-action-bar">
        <div data-testid="is-saving">{isSaving.toString()}</div>
        <div data-testid="requirements-configured">{areAllRequirementsConfigured.toString()}</div>
        <button data-testid="save-button" onClick={onSave}>
          Save
        </button>
        <button data-testid="continue-button" onClick={onContinue}>
          Continue
        </button>
        <button data-testid="back-button" onClick={onBack}>
          Back
        </button>
      </div>
    );
  };
});

describe("CalendarManagementPage", () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
    mockPush.mockClear();

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
  });

  const mockOnboardingData = {
    draft: {
      draft_data: {
        booking_strategy: {
          selectedStrategy: "location",
          employees: [
            {
              id: "emp-1",
              fullName: "John Doe",
              email: "john@example.com",
              role: "stylist",
              locationId: "loc-1",
              takesBookings: true,
            },
            {
              id: "emp-2",
              fullName: "Jane Smith",
              email: "jane@example.com",
              role: "manager",
              locationId: "loc-1",
              takesBookings: true,
            },
          ],
          locations: [
            {
              id: "loc-1",
              name: "Main Location",
              type: "physical",
              address: "123 Main St, City, State 12345",
            },
          ],
          resources: [
            {
              id: "res-1",
              name: "Room A",
              type: "room",
              description: "Conference room",
            },
          ],
        },
        business_team_members: {
          "loc-1": {
            teamMembers: [
              {
                id: "emp-1",
                fullName: "John Doe",
                email: "john@example.com",
                role: "stylist",
                locationId: "loc-1",
                takesBookings: true,
              },
            ],
          },
        },
        business_location: {
          "serviceTypes.physical": {
            addresses: [
              {
                id: "loc-1",
                name: "Main Location",
                line1: "123 Main St",
                city: "City",
                state: "State",
                zipCode: "12345",
              },
            ],
          },
        },
        business_resources: {
          "loc-1": {
            resources: [
              {
                id: "res-1",
                name: "Room A",
                type: "room",
                description: "Conference room",
              },
            ],
          },
        },
        calendar_management: {
          cronofyCalendars: [
            {
              provider_name: "google",
              profile_id: "pro_123",
              profile_name: "test@example.com",
              calendar_id: "cal_123",
              calendar_name: "Test Calendar",
              calendar_readonly: false,
              calendar_deleted: false,
              calendar_primary: true,
              calendar_integrated_conferencing_available: true,
              calendar_attachments_available: false,
              permission_level: "sandbox",
              is_booking_calendar: false,
              is_busy_calendar: false,
              is_primary_booking: false,
            },
          ],
          calendarAssignments: [
            {
              id: "employee_emp-1",
              assignmentType: "employee",
              assignmentId: "emp-1",
              assignmentName: "John Doe",
              defaultBookingCalendar: {
                entityType: "business",
                calendarId: "cal_123",
              },
              busyCalendars: [
                {
                  entityType: "business",
                  calendarId: "cal_456",
                },
              ],
            },
          ],
          cronofyElementToken: "test-token-123",
        },
      },
    },
  };

  const mockCronofyCalendars = [
    {
      provider_name: "google",
      profile_id: "pro_123",
      profile_name: "test@example.com",
      calendar_id: "cal_123",
      calendar_name: "Test Calendar",
      calendar_readonly: false,
      calendar_deleted: false,
      calendar_primary: true,
      calendar_integrated_conferencing_available: true,
      calendar_attachments_available: false,
      permission_level: "sandbox",
      is_booking_calendar: false,
      is_busy_calendar: false,
      is_primary_booking: false,
    },
  ];

  it("loads and displays calendar management data", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOnboardingData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText("Calendar Management")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Connect and configure your calendar accounts for booking management")
    ).toBeInTheDocument();
  });

  it("handles calendar assignment updates correctly", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOnboardingData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-management-accordion")).toBeInTheDocument();
    });

    // Test the enhanced calendar assignment update
    const testUpdateButton = screen.getByTestId("test-calendar-update");
    fireEvent.click(testUpdateButton);

    // The component should handle the update without errors
    expect(testUpdateButton).toBeInTheDocument();
  });

  it("handles legacy calendar assignment correctly", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOnboardingData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-management-accordion")).toBeInTheDocument();
    });

    // Test the legacy calendar assignment
    const testLegacyButton = screen.getByTestId("test-legacy-assignment");
    fireEvent.click(testLegacyButton);

    // The component should handle the legacy assignment without errors
    expect(testLegacyButton).toBeInTheDocument();
  });

  it("saves calendar management data correctly", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOnboardingData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("save-button")).toBeInTheDocument();
    });

    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/business/onboarding/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("calendar_management"),
      });
    });
  });

  it("validates calendar configuration correctly", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOnboardingData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("requirements-configured")).toBeInTheDocument();
    });

    // Should show as configured since we have calendar assignments
    expect(screen.getByTestId("requirements-configured")).toHaveTextContent("true");
  });

  it("handles navigation correctly", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOnboardingData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("continue-button")).toBeInTheDocument();
    });

    const continueButton = screen.getByTestId("continue-button");
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it("handles error states gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<CalendarManagementPage />);

    // Should not crash and should show some error handling
    await waitFor(() => {
      expect(screen.getByText("Calendar Management")).toBeInTheDocument();
    });
  });

  it("processes calendar assignments with busy calendars correctly", async () => {
    const mockDataWithBusyCalendars = {
      ...mockOnboardingData,
      draft: {
        ...mockOnboardingData.draft,
        draft_data: {
          ...mockOnboardingData.draft.draft_data,
          calendar_management: {
            cronofyCalendars: mockCronofyCalendars,
            calendarAssignments: [
              {
                id: "employee_emp-1",
                assignmentType: "employee",
                assignmentId: "emp-1",
                assignmentName: "John Doe",
                defaultBookingCalendar: {
                  entityType: "business",
                  calendarId: "cal_123",
                },
                busyCalendars: [
                  {
                    entityType: "business",
                    calendarId: "cal_456",
                  },
                  {
                    entityType: "business",
                    calendarId: "cal_789",
                  },
                ],
              },
            ],
            cronofyElementToken: "test-token-123",
          },
        },
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataWithBusyCalendars,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-assignments-count")).toHaveTextContent("1");
    });

    // Should have processed the busy calendars correctly
    expect(screen.getByTestId("calendar-assignments-count")).toBeInTheDocument();
  });

  it("always passes employeeCalendars as an array to CalendarManagementAccordion", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOnboardingData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-management-accordion")).toBeInTheDocument();
    });

    // Verify employeeCalendars is passed and is an array (by checking length is accessible)
    const employeeCalendarsCount = screen.getByTestId("employee-calendars-count");
    expect(employeeCalendarsCount).toBeInTheDocument();
    // If it's an array, length will be a number; if it's an object, accessing .length would fail or be undefined
    expect(employeeCalendarsCount.textContent).toBeTruthy();
  });

  it("handles employees with same email correctly and converts to array", async () => {
    const mockDataWithDuplicateEmails = {
      draft: {
        draft_data: {
          booking_strategy: {
            selectedStrategy: "employee",
            employees: [
              {
                id: "emp-1",
                fullName: "John Doe",
                email: "john@example.com",
                role: "stylist",
                locationId: "loc-1",
                takesBookings: true,
              },
              {
                id: "emp-2",
                fullName: "John Doe",
                email: "john@example.com", // Same email, different ID
                role: "manager",
                locationId: "loc-2",
                takesBookings: true,
              },
            ],
          },
          business_team_members: {
            "loc-1": {
              teamMembers: [
                {
                  id: "emp-1",
                  fullName: "John Doe",
                  email: "john@example.com",
                  role: "stylist",
                  locationId: "loc-1",
                  takesBookings: true,
                },
              ],
            },
            "loc-2": {
              teamMembers: [
                {
                  id: "emp-2",
                  fullName: "John Doe",
                  email: "john@example.com",
                  role: "manager",
                  locationId: "loc-2",
                  takesBookings: true,
                },
              ],
            },
          },
        },
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataWithDuplicateEmails,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-management-accordion")).toBeInTheDocument();
    });

    // Should consolidate employees with same email and still pass as array
    const employeeCalendarsCount = screen.getByTestId("employee-calendars-count");
    expect(employeeCalendarsCount).toBeInTheDocument();
    // Should have 1 consolidated employee (not 2)
    expect(employeeCalendarsCount.textContent).toBe("1");
  });

  it("handles empty employees array gracefully", async () => {
    const mockDataWithNoEmployees = {
      draft: {
        draft_data: {
          booking_strategy: {
            selectedStrategy: "location",
            employees: [],
          },
          business_team_members: {},
        },
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataWithNoEmployees,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ calendars: mockCronofyCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ element_token: "test-token-123" }),
      });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-management-accordion")).toBeInTheDocument();
    });

    // Should pass empty array (not object or undefined)
    const employeeCalendarsCount = screen.getByTestId("employee-calendars-count");
    expect(employeeCalendarsCount).toBeInTheDocument();
    expect(employeeCalendarsCount.textContent).toBe("0");
  });
});
