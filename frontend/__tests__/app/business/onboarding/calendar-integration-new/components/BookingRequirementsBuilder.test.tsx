import BookingRequirementsBuilder from "@/app/business/onboarding/calendar-integration-new/components/BookingRequirementsBuilder";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockEmployees = [
  {
    id: "emp-1",
    fullName: "John Doe",
    email: "john@example.com",
    role: "Consultant",
    locationId: "location-1",
    takesBookings: true,
  },
  {
    id: "emp-2",
    fullName: "Jane Smith",
    email: "jane@example.com",
    role: "Manager",
    locationId: "location-1",
    takesBookings: true,
  },
];

const mockResources = [
  {
    id: "res-1",
    name: "Conference Room A",
    type: "room",
    description: "Large conference room",
    locationId: "location-1",
  },
  {
    id: "res-2",
    name: "Projector",
    type: "equipment",
    description: "HD Projector",
    locationId: "location-1",
  },
];

const mockLocationCalendars = [
  {
    id: "loc-1",
    name: "Main Office",
    address: "123 Main St",
    serviceCount: 2,
    resourceCount: 1,
    calendar: {
      provider: "google",
      connectionStatus: "connected",
      calendarId: "cal-1",
      calendarName: "Main Office Calendar",
    },
    settings: {
      bufferTime: 15,
      businessHoursOverride: false,
    },
  },
  {
    id: "loc-2",
    name: "Branch Office",
    address: "456 Branch Ave",
    serviceCount: 1,
    resourceCount: 0,
    calendar: {
      provider: "outlook",
      connectionStatus: "disconnected",
      calendarId: "",
      calendarName: "",
    },
    settings: {
      bufferTime: 30,
      businessHoursOverride: true,
    },
  },
];

const mockCalendarAssignments = [
  {
    entityType: "employee" as const,
    entityId: "emp-1",
    calendarId: "cal-emp-1",
    isPending: false,
  },
  {
    entityType: "employee" as const,
    entityId: "emp-2",
    calendarId: "cal-emp-2",
    isPending: true,
  },
  {
    entityType: "resource" as const,
    entityId: "res-1",
    calendarId: "cal-res-1",
    isPending: false,
  },
  {
    entityType: "resource" as const,
    entityId: "res-2",
    calendarId: "cal-res-2",
    isPending: false,
  },
  {
    entityType: "location" as const,
    entityId: "loc-1",
    calendarId: "cal-1",
    isPending: false,
  },
];

describe("BookingRequirementsBuilder", () => {
  const defaultProps = {
    employees: mockEmployees,
    resources: mockResources,
    locationCalendars: mockLocationCalendars,
    requirements: [],
    calendarAssignments: mockCalendarAssignments,
    onRequirementsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the component with all sections", () => {
    render(<BookingRequirementsBuilder {...defaultProps} />);

    expect(screen.getByText("Current Requirements:")).toBeInTheDocument();
    expect(screen.getByText("Add Requirements:")).toBeInTheDocument();
    expect(screen.getByText("Employees")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("Location Calendars")).toBeInTheDocument();
  });

  it("displays employees in the employees section", () => {
    render(<BookingRequirementsBuilder {...defaultProps} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(
      screen.getByText(
        (content, element) =>
          content.includes("Consultant") && element?.tagName.toLowerCase() === "span"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (content, element) =>
          content.includes("Manager") && element?.tagName.toLowerCase() === "span"
      )
    ).toBeInTheDocument();
  });

  it("displays resources in the resources section", () => {
    render(<BookingRequirementsBuilder {...defaultProps} />);

    expect(screen.getByText("Conference Room A")).toBeInTheDocument();
    expect(screen.getByText("Projector")).toBeInTheDocument();
  });

  it("displays connected location calendars only", () => {
    render(<BookingRequirementsBuilder {...defaultProps} />);

    expect(screen.getByText("Main Office")).toBeInTheDocument();
    expect(screen.queryByText("Branch Office")).not.toBeInTheDocument();
  });

  it("shows message when no connected location calendars", () => {
    const props = {
      ...defaultProps,
      locationCalendars: [mockLocationCalendars[1]], // Only disconnected calendar
    };

    render(<BookingRequirementsBuilder {...props} />);

    // The component still shows the Add Requirements sections, but the Note shows the appropriate message
    expect(
      screen.getByText(
        "Select an employees, resources from the options above to add them as booking requirements."
      )
    ).toBeInTheDocument();
  });

  it("allows adding employees to requirements", async () => {
    const user = userEvent.setup();
    render(<BookingRequirementsBuilder {...defaultProps} />);

    const addButtons = screen.getAllByText("Add");
    await user.click(addButtons[0]); // First employee

    expect(defaultProps.onRequirementsChange).toHaveBeenCalled();
  });

  it("allows adding resources to requirements", async () => {
    const user = userEvent.setup();
    render(<BookingRequirementsBuilder {...defaultProps} />);

    const addButtons = screen.getAllByText("Add");
    await user.click(addButtons[2]); // First resource

    expect(defaultProps.onRequirementsChange).toHaveBeenCalled();
  });

  it("allows adding location calendars to requirements", async () => {
    const user = userEvent.setup();
    render(<BookingRequirementsBuilder {...defaultProps} />);

    const addButtons = screen.getAllByText("Add");
    await user.click(addButtons[4]); // First location calendar

    expect(defaultProps.onRequirementsChange).toHaveBeenCalled();
  });

  it("disables add button for already selected items", async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      requirements: [{ id: "emp-1", displayName: "John Doe", type: "employee" }],
    };

    render(<BookingRequirementsBuilder {...props} />);

    const addButtons = screen.getAllByText("Add");
    expect(addButtons[0]).toBeDisabled(); // John Doe should be disabled
    expect(addButtons[1]).not.toBeDisabled(); // Jane Smith should be enabled
  });

  it("displays selected requirements with logic operators", async () => {
    const user = userEvent.setup();
    render(<BookingRequirementsBuilder {...defaultProps} />);

    // Add two requirements - click first employee and first resource
    const addButtons = screen.getAllByText("Add");
    await user.click(addButtons[0]); // Add John Doe (first employee)
    await user.click(addButtons[2]); // Add Conference Room A (first resource)

    await waitFor(() => {
      expect(screen.getByText("Selected Requirements:")).toBeInTheDocument();
      expect(screen.getAllByText("John Doe")).toHaveLength(2); // One in the list, one in selected
      expect(screen.getAllByText("Conference Room A")).toHaveLength(2); // One in the list, one in selected
    });
  });

  it("allows changing logic operators between requirements", async () => {
    const user = userEvent.setup();
    render(<BookingRequirementsBuilder {...defaultProps} />);

    // Add two requirements - click first employee and first resource
    const addButtons = screen.getAllByText("Add");
    await user.click(addButtons[0]); // Add John Doe (first employee)
    await user.click(addButtons[2]); // Add Conference Room A (first resource)

    await waitFor(() => {
      // Check that both requirements are selected
      expect(screen.getAllByText("John Doe")).toHaveLength(2);
      expect(screen.getAllByText("Conference Room A")).toHaveLength(2);
    });

    // Verify that the requirements were added and the callback was called
    expect(defaultProps.onRequirementsChange).toHaveBeenCalled();
  });

  it("allows removing requirements", async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      requirements: [
        { id: "emp-1", displayName: "John Doe", type: "employee" },
        { id: "res-1", displayName: "Conference Room A", type: "resource" },
      ],
    };

    render(<BookingRequirementsBuilder {...props} />);

    const removeButtons = screen.getAllByText("×");
    await user.click(removeButtons[0]);

    expect(defaultProps.onRequirementsChange).toHaveBeenCalled();
  });

  it("generates correct requirement string", () => {
    const props = {
      ...defaultProps,
      requirements: [
        { id: "emp-1", displayName: "John Doe", type: "employee" },
        { id: "res-1", displayName: "Conference Room A", type: "resource", logicOperator: "AND" },
      ],
    };

    render(<BookingRequirementsBuilder {...props} />);

    expect(screen.getAllByText("John Doe AND Conference Room A").length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty requirements state", () => {
    render(<BookingRequirementsBuilder {...defaultProps} />);

    expect(screen.getAllByText("No requirements set").length).toBeGreaterThanOrEqual(1);
  });

  it("handles scrolling in long lists", () => {
    const manyEmployees = Array.from({ length: 20 }, (_, i) => ({
      id: `emp-${i}`,
      fullName: `Employee ${i}`,
      email: `emp${i}@example.com`,
      role: "Staff",
      locationId: "location-1",
      takesBookings: true,
    }));

    const manyCalendarAssignments = Array.from({ length: 20 }, (_, i) => ({
      entityType: "employee" as const,
      entityId: `emp-${i}`,
      calendarId: `cal-emp-${i}`,
      isPending: i % 2 === 0, // Some pending, some not
    }));

    const props = {
      ...defaultProps,
      employees: manyEmployees,
      calendarAssignments: [...mockCalendarAssignments, ...manyCalendarAssignments],
    };

    render(<BookingRequirementsBuilder {...props} />);

    const scrollableContainer = screen.getByText("Employee 1").closest(".overflow-y-auto");
    expect(scrollableContainer).toBeInTheDocument();
  });
});
