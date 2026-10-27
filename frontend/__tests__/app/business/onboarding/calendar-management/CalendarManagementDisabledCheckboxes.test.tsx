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

describe("Calendar Management Disabled Checkboxes", () => {
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
    {
      calendar_id: "cal_789",
      profile_name: "test@example.com",
      calendar_name: "Busy Calendar 2",
      provider_name: "google",
    },
  ];

  beforeEach(() => {
    // Mock the fetch call for connected calendars
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ calendars: mockConnectedCalendars }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the accordion component", () => {
    const mockCalendarAssignments = [
      {
        entityType: "employee" as const,
        entityId: "emp-1",
        calendarId: "cal_123",
        isPending: false,
        busyCalendars: [],
      },
    ];

    render(
      <CalendarManagementAccordion
        locationCalendars={[]}
        resourceCalendars={[]}
        employeeCalendars={[
          {
            id: "emp-1",
            fullName: "John Doe",
            email: "john@example.com",
            roles: ["Developer"],
            locationIds: ["loc-1"],
            takesBookings: true,
          },
        ]}
        calendarAssignments={mockCalendarAssignments}
        bookingStrategy="employee"
        onCalendarAssignment={jest.fn()}
        onCalendarAssignmentUpdate={jest.fn()}
      />
    );

    expect(screen.getByText("Calendar Management")).toBeInTheDocument();
  });

  it("expands when clicked", async () => {
    const mockCalendarAssignments = [
      {
        entityType: "employee" as const,
        entityId: "emp-1",
        calendarId: "cal_123",
        isPending: false,
        busyCalendars: [],
      },
    ];

    render(
      <CalendarManagementAccordion
        locationCalendars={[]}
        resourceCalendars={[]}
        employeeCalendars={[
          {
            id: "emp-1",
            fullName: "John Doe",
            email: "john@example.com",
            roles: ["Developer"],
            locationIds: ["loc-1"],
            takesBookings: true,
          },
        ]}
        calendarAssignments={mockCalendarAssignments}
        bookingStrategy="employee"
        onCalendarAssignment={jest.fn()}
        onCalendarAssignmentUpdate={jest.fn()}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(screen.getByText("Step 1: View Connected Calendars")).toBeInTheDocument();
    });
  });

  it("loads connected calendars when expanded", async () => {
    const mockCalendarAssignments = [
      {
        entityType: "employee" as const,
        entityId: "emp-1",
        calendarId: "cal_123",
        isPending: false,
        busyCalendars: [],
      },
    ];

    render(
      <CalendarManagementAccordion
        locationCalendars={[]}
        resourceCalendars={[]}
        employeeCalendars={[
          {
            id: "emp-1",
            fullName: "John Doe",
            email: "john@example.com",
            roles: ["Developer"],
            locationIds: ["loc-1"],
            takesBookings: true,
          },
        ]}
        calendarAssignments={mockCalendarAssignments}
        bookingStrategy="employee"
        onCalendarAssignment={jest.fn()}
        onCalendarAssignmentUpdate={jest.fn()}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(screen.getByText("Default Calendar")).toBeInTheDocument();
      expect(screen.getByText("Busy Calendar 1")).toBeInTheDocument();
      expect(screen.getByText("Busy Calendar 2")).toBeInTheDocument();
    });
  });

  it("displays connected calendars in step 1", async () => {
    const mockCalendarAssignments = [
      {
        entityType: "employee" as const,
        entityId: "emp-1",
        calendarId: "cal_123",
        isPending: false,
        busyCalendars: [],
      },
    ];

    render(
      <CalendarManagementAccordion
        locationCalendars={[]}
        resourceCalendars={[]}
        employeeCalendars={[
          {
            id: "emp-1",
            fullName: "John Doe",
            email: "john@example.com",
            roles: ["Developer"],
            locationIds: ["loc-1"],
            takesBookings: true,
          },
        ]}
        calendarAssignments={mockCalendarAssignments}
        bookingStrategy="employee"
        onCalendarAssignment={jest.fn()}
        onCalendarAssignmentUpdate={jest.fn()}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(screen.getByText("Default Calendar")).toBeInTheDocument();
      expect(screen.getByText("Busy Calendar 1")).toBeInTheDocument();
      expect(screen.getByText("Busy Calendar 2")).toBeInTheDocument();
    });
  });

  it("handles tab switching", async () => {
    const mockCalendarAssignments = [
      {
        entityType: "employee" as const,
        entityId: "emp-1",
        calendarId: "cal_123",
        isPending: false,
        busyCalendars: [],
      },
    ];

    render(
      <CalendarManagementAccordion
        locationCalendars={[]}
        resourceCalendars={[]}
        employeeCalendars={[
          {
            id: "emp-1",
            fullName: "John Doe",
            email: "john@example.com",
            roles: ["Developer"],
            locationIds: ["loc-1"],
            takesBookings: true,
          },
        ]}
        calendarAssignments={mockCalendarAssignments}
        bookingStrategy="employee"
        onCalendarAssignment={jest.fn()}
        onCalendarAssignmentUpdate={jest.fn()}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(screen.getByText("Step 1: View Connected Calendars")).toBeInTheDocument();
    });

    // Switch to step 2
    fireEvent.click(screen.getByText("Step 2: Assign Calendars"));

    await waitFor(() => {
      expect(screen.getByText("Step 2: Assign Calendars")).toBeInTheDocument();
    });
  });

  it("handles error states in calendar loading", async () => {
    // Mock fetch to return an error
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Failed to load calendars"));

    const mockCalendarAssignments = [
      {
        entityType: "employee" as const,
        entityId: "emp-1",
        calendarId: "cal_123",
        isPending: false,
        busyCalendars: [],
      },
    ];

    render(
      <CalendarManagementAccordion
        locationCalendars={[]}
        resourceCalendars={[]}
        employeeCalendars={[
          {
            id: "emp-1",
            fullName: "John Doe",
            email: "john@example.com",
            roles: ["Developer"],
            locationIds: ["loc-1"],
            takesBookings: true,
          },
        ]}
        calendarAssignments={mockCalendarAssignments}
        bookingStrategy="employee"
        onCalendarAssignment={jest.fn()}
        onCalendarAssignmentUpdate={jest.fn()}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    // Should handle the error gracefully
    await waitFor(() => {
      expect(screen.getByText("Step 1: View Connected Calendars")).toBeInTheDocument();
    });
  });
});
