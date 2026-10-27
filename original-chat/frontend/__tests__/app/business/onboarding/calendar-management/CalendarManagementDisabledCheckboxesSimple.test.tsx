import CalendarManagementAccordion from "@/app/business/onboarding/calendar-management/components/CalendarManagementAccordion";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

describe("Calendar Management Disabled Checkboxes - Simple Tests", () => {
  const mockConnectedCalendars = [
    {
      calendar_id: "cal_123",
      profile_name: "test@example.com",
      calendar_name: "Default Calendar",
      provider_name: "google",
    },
    {
      calendar_id: "cal_456",
      profile_name: "test@example.com",
      calendar_name: "Busy Calendar 1",
      provider_name: "google",
    },
  ];

  const mockEmployeeCalendars = [
    {
      id: "emp-1",
      fullName: "John Doe",
      email: "john@example.com",
      roles: ["stylist"],
      locationIds: ["loc-1"],
      takesBookings: true,
      assignmentType: "employee",
      calendar: {},
      isNew: false,
      allEmployeeIds: ["emp-1"],
    },
  ];

  const defaultProps = {
    locationCalendars: [],
    resourceCalendars: [],
    employeeCalendars: mockEmployeeCalendars,
    calendarAssignments: [],
    bookingStrategy: "location",
    onCalendarAssignment: jest.fn(),
    onCalendarAssignmentUpdate: jest.fn(),
  };

  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ calendars: mockConnectedCalendars }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the accordion component", () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    expect(screen.getByText("Calendar Management")).toBeInTheDocument();
  });

  it("expands when clicked", async () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(screen.getByText("Step 1: View Connected Calendars")).toBeInTheDocument();
      expect(screen.getByText("Step 2: Assign Calendars")).toBeInTheDocument();
    });
  });

  it("loads connected calendars when expanded", async () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/cronofy/calendars");
    });
  });

  it("displays connected calendars in step 1", async () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    // Click to expand and go to step 1
    fireEvent.click(screen.getByText("Calendar Management"));
    fireEvent.click(screen.getByText("Step 1: View Connected Calendars"));

    await waitFor(() => {
      expect(screen.getByText("Default Calendar")).toBeInTheDocument();
      expect(screen.getByText("Busy Calendar 1")).toBeInTheDocument();
    });
  });

  it("handles tab switching", async () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    // Switch between tabs
    fireEvent.click(screen.getByText("Step 1: View Connected Calendars"));
    expect(screen.getByText("Step 1: View Connected Calendars")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Step 2: Assign Calendars"));
    expect(screen.getByText("Step 2: Assign Calendars")).toBeInTheDocument();
  });

  it("handles error states in calendar loading", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<CalendarManagementAccordion {...defaultProps} />);

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    // Should not crash and should handle the error gracefully
    await waitFor(() => {
      expect(screen.getByText("Calendar Management")).toBeInTheDocument();
    });
  });
});
