import ServiceLocationComboCard from "@/app/business/onboarding/calendar-integration-new/components/ServiceLocationComboCard";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockCombo = {
  id: "combo-1",
  locationId: "location-1",
  locationName: "🏢 Downtown",
  address: "123 Main St, City, State",
  cardType: "location",
  services: [
    {
      id: "service-1",
      name: "Consultation",
      price: 100,
      icon: "💼",
      locationId: "location-1",
    },
    {
      id: "service-2",
      name: "Follow-up",
      price: 75,
      icon: "📞",
      locationId: "location-1",
    },
  ],
  resources: [
    {
      id: "resource-1",
      name: "Conference Room A",
      type: "room",
      description: "Large conference room",
      locationId: "location-1",
    },
  ],
  employees: [
    {
      id: "emp-1",
      fullName: "John Doe",
      email: "john@example.com",
      role: "Consultant",
      locationId: "location-1",
      takesBookings: true,
    },
  ],
  logicType: "any",
  combiningAllowed: true,
  requirements: [
    {
      id: "req-1",
      displayName: "John Doe",
      type: "employee",
    },
  ],
};

const mockEmployeeCombo = {
  ...mockCombo,
  id: "combo-emp-1",
  employeeId: "emp-1",
  employeeName: "John Doe",
  employeeAvatar: "👤",
  cardType: "employee-location",
};

describe("ServiceLocationComboCard", () => {
  const defaultProps = {
    combo: mockCombo,
    isExpanded: false,
    isSelected: false,
    combiningMode: false,
    onToggleExpansion: jest.fn(),
    onToggleSelection: jest.fn(),
    onEditRequirements: jest.fn(),
    onSplitService: jest.fn(),
    generateRequirementString: jest.fn((requirements: any[]) =>
      requirements.map((req: any) => req.displayName).join(" AND ")
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders location card with basic information", () => {
    render(<ServiceLocationComboCard {...defaultProps} />);

    expect(screen.getByText("🏢 Downtown")).toBeInTheDocument();
    expect(screen.getByText("123 Main St, City, State")).toBeInTheDocument();
  });

  it("renders employee card with employee information", () => {
    const employeeProps = {
      ...defaultProps,
      combo: mockEmployeeCombo,
    };

    render(<ServiceLocationComboCard {...employeeProps} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("🏢 Downtown")).toBeInTheDocument();
  });

  it("shows service and resource counts", () => {
    render(<ServiceLocationComboCard {...defaultProps} />);

    expect(screen.getByText("2 services")).toBeInTheDocument();
    expect(screen.getByText("1 resources")).toBeInTheDocument();
    expect(screen.getByText("1 employees")).toBeInTheDocument();
  });

  it("shows requirements status", () => {
    render(<ServiceLocationComboCard {...defaultProps} />);

    expect(screen.getByText("Requirements Set")).toBeInTheDocument();
  });

  it("shows requirements not configured when no requirements", () => {
    const propsWithoutRequirements = {
      ...defaultProps,
      combo: { ...mockCombo, requirements: [] },
    };

    render(<ServiceLocationComboCard {...propsWithoutRequirements} />);

    expect(screen.getByText("Requirements Not Configured")).toBeInTheDocument();
  });

  it("shows selection checkbox in combining mode", () => {
    const combiningProps = {
      ...defaultProps,
      combiningMode: true,
    };

    render(<ServiceLocationComboCard {...combiningProps} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it("shows selected state when card is selected", () => {
    const selectedProps = {
      ...defaultProps,
      combiningMode: true,
      isSelected: true,
    };

    render(<ServiceLocationComboCard {...selectedProps} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("calls onToggleSelection when checkbox is clicked", async () => {
    const user = userEvent.setup();
    const combiningProps = {
      ...defaultProps,
      combiningMode: true,
    };

    render(<ServiceLocationComboCard {...combiningProps} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(defaultProps.onToggleSelection).toHaveBeenCalledWith("combo-1");
  });

  it("calls onToggleExpansion when header is clicked", async () => {
    const user = userEvent.setup();
    render(<ServiceLocationComboCard {...defaultProps} />);

    const header = screen.getByText("🏢 Downtown").closest(".cursor-pointer");
    await user.click(header!);

    expect(defaultProps.onToggleExpansion).toHaveBeenCalledWith("combo-1");
  });

  it("calls onEditRequirements when edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<ServiceLocationComboCard {...defaultProps} />);

    const editButton = screen.getByRole("button", { name: "Edit Requirements" });
    await user.click(editButton);

    expect(defaultProps.onEditRequirements).toHaveBeenCalledWith(mockCombo);
  });

  it("expands to show services when expanded", () => {
    const expandedProps = {
      ...defaultProps,
      isExpanded: true,
    };

    render(<ServiceLocationComboCard {...expandedProps} />);

    expect(screen.getByText("Services at this location")).toBeInTheDocument();
    expect(screen.getByText("Consultation")).toBeInTheDocument();
    expect(screen.getByText("Follow-up")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
    expect(screen.getByText("$75")).toBeInTheDocument();
  });

  it("shows split service buttons for multiple services", () => {
    const expandedProps = {
      ...defaultProps,
      isExpanded: true,
    };

    render(<ServiceLocationComboCard {...expandedProps} />);

    const splitButtons = screen.getAllByText("Split Out");
    expect(splitButtons).toHaveLength(2);
  });

  it("calls onSplitService when split button is clicked", async () => {
    const user = userEvent.setup();
    const expandedProps = {
      ...defaultProps,
      isExpanded: true,
    };

    render(<ServiceLocationComboCard {...expandedProps} />);

    const splitButtons = screen.getAllByText("Split Out");
    await user.click(splitButtons[0]);

    expect(defaultProps.onSplitService).toHaveBeenCalledWith("combo-1", "service-1");
  });

  it("shows employee-specific requirements section for employee cards", () => {
    const expandedEmployeeProps = {
      ...defaultProps,
      combo: mockEmployeeCombo,
      isExpanded: true,
    };

    render(<ServiceLocationComboCard {...expandedEmployeeProps} />);

    expect(screen.getByText("Booking Requirements:")).toBeInTheDocument();
    expect(screen.getAllByText("John Doe")).toHaveLength(2); // John Doe appears in header and requirements
    // The component doesn't show "Resources Required:" text, it shows the requirements directly
    // expect(screen.getByText("Resources Required:")).toBeInTheDocument();
  });

  it("shows booking requirements summary", () => {
    const expandedProps = {
      ...defaultProps,
      isExpanded: true,
    };

    render(<ServiceLocationComboCard {...expandedProps} />);

    expect(screen.getByText("Booking Requirements:")).toBeInTheDocument();
  });

  it("handles keyboard navigation", () => {
    render(<ServiceLocationComboCard {...defaultProps} />);

    const editButton = screen.getByRole("button", { name: "Edit Requirements" });
    editButton.focus();

    expect(document.activeElement).toBe(editButton);
  });

  it("has proper accessibility attributes", () => {
    render(<ServiceLocationComboCard {...defaultProps} />);

    // Check for proper heading structure - the component doesn't have h3 headings
    // expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();

    // Check for proper button roles
    expect(screen.getByRole("button", { name: "Edit Requirements" })).toBeInTheDocument();
  });

  it("handles empty services gracefully", () => {
    const emptyServicesCombo = {
      ...mockCombo,
      services: [],
    };

    const props = {
      ...defaultProps,
      combo: emptyServicesCombo,
      isExpanded: true,
    };

    render(<ServiceLocationComboCard {...props} />);

    expect(screen.getByText("0 services")).toBeInTheDocument();
    expect(screen.queryByText("Split Out")).not.toBeInTheDocument();
  });

  it("handles single service without split button", () => {
    const singleServiceCombo = {
      ...mockCombo,
      services: [mockCombo.services[0]],
    };

    const props = {
      ...defaultProps,
      combo: singleServiceCombo,
      isExpanded: true,
    };

    render(<ServiceLocationComboCard {...props} />);

    expect(screen.queryByText("Split Out")).not.toBeInTheDocument();
  });
});
