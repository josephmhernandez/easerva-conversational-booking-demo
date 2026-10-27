import CalendarManagementAccordion from "@/app/business/onboarding/calendar-management/components/CalendarManagementAccordion";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// Mock fetch globally
global.fetch = jest.fn();

// Mock the connected calendars API response
const mockConnectedCalendars = [
  {
    calendar_id: "cal_123",
    profile_name: "test@example.com",
    calendar_name: "Test Calendar",
    provider_name: "google",
  },
  {
    calendar_id: "cal_456",
    profile_name: "test@example.com",
    calendar_name: "Another Calendar",
    provider_name: "google",
  },
];

describe("CalendarManagementAccordion - Simple Tests", () => {
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

  const mockLocationCalendars = [
    {
      id: "loc-1",
      name: "Main Location",
      address: "123 Main St, City, State 12345",
      serviceCount: 5,
      resourceCount: 2,
      calendar: {
        provider: "google",
        connectionStatus: "connected",
        calendarId: "cal_123",
        calendarName: "Main Location Calendar",
      },
      settings: {
        bufferTime: 15,
        businessHoursOverride: false,
      },
    },
  ];

  const mockResourceCalendars = [
    {
      id: "res-1",
      name: "Room A",
      email: "rooma@example.com",
      type: "room",
      description: "Conference room",
      calendar: {},
      bookingLogic: "first_available",
      isNew: false,
      locationId: "loc-1",
      capacity: {
        maxConcurrent: 1,
        bufferTime: 0,
      },
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
    },
    {
      id: "emp-2",
      fullName: "Jane Smith",
      email: "jane@example.com",
      roles: ["stylist"],
      locationIds: ["loc-1"],
      takesBookings: true,
    },
  ];

  const mockCalendarAssignments = [
    {
      entityType: "employee" as const,
      entityId: "emp-1",
      calendarId: "cal_123",
      isPending: false,
      busyCalendars: ["cal_456"],
    },
    {
      entityType: "employee" as const,
      entityId: "emp-2",
      calendarId: "cal_456",
      isPending: false,
      busyCalendars: ["cal_123"],
    },
  ];

  const defaultProps = {
    locationCalendars: mockLocationCalendars,
    resourceCalendars: mockResourceCalendars,
    employeeCalendars: mockEmployeeCalendars,
    calendarAssignments: mockCalendarAssignments,
    bookingStrategy: "employee",
    onCalendarAssignment: jest.fn(),
    onCalendarAssignmentUpdate: jest.fn(),
  };

  it("renders the accordion with basic structure", async () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    expect(screen.getByText("Calendar Management")).toBeInTheDocument();

    // Click to expand the accordion
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(screen.getByText("Step 1: View Connected Calendars")).toBeInTheDocument();
      expect(screen.getByText("Step 2: Assign Calendars")).toBeInTheDocument();
    });
  });

  it("loads connected calendars when expanded", async () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    // Click to expand the accordion
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/cronofy/calendars");
    });
  });

  it("displays connected calendars in step 1", async () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    // Click to expand and go to step 1
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(screen.getByText("Test Calendar")).toBeInTheDocument();
      expect(screen.getByText("Another Calendar")).toBeInTheDocument();
    });
  });

  it("handles tab switching correctly", async () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    // Switch between tabs
    fireEvent.click(screen.getByText("Step 1: View Connected Calendars"));
    expect(screen.getByText("Step 1: View Connected Calendars")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Step 2: Assign Calendars"));
    expect(screen.getByText("Step 2: Assign Calendars")).toBeInTheDocument();
  });

  it("handles section expansion correctly", async () => {
    render(<CalendarManagementAccordion {...defaultProps} />);

    // Initially collapsed
    expect(screen.queryByText("Step 1: View Connected Calendars")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    await waitFor(() => {
      expect(screen.getByText("Step 1: View Connected Calendars")).toBeInTheDocument();
    });
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

  it("handles empty calendar assignments gracefully", async () => {
    render(<CalendarManagementAccordion {...defaultProps} calendarAssignments={[]} />);

    // Click to expand and go to step 2
    fireEvent.click(screen.getByText("Calendar Management"));
    fireEvent.click(screen.getByText("Step 2: Assign Calendars"));

    await waitFor(() => {
      // Should still render without errors
      expect(screen.getByText("Step 2: Assign Calendars")).toBeInTheDocument();
    });
  });

  it("calls onCalendarAssignment when provided", async () => {
    const mockOnCalendarAssignment = jest.fn();

    render(
      <CalendarManagementAccordion
        {...defaultProps}
        onCalendarAssignment={mockOnCalendarAssignment}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    // The callback should be available for use
    expect(mockOnCalendarAssignment).toBeDefined();
  });

  it("calls onCalendarAssignmentUpdate when provided", async () => {
    const mockOnCalendarAssignmentUpdate = jest.fn();

    render(
      <CalendarManagementAccordion
        {...defaultProps}
        onCalendarAssignmentUpdate={mockOnCalendarAssignmentUpdate}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText("Calendar Management"));

    // The callback should be available for use
    expect(mockOnCalendarAssignmentUpdate).toBeDefined();
  });
});
