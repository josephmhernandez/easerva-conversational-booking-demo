import EmployeeBasedStrategyRendererNew from "@/app/business/onboarding/calendar-integration-new/components/strategy-renderers/EmployeeBasedStrategyRendererNew";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

// Mock the ServiceLocationComboCard component
jest.mock(
  "@/app/business/onboarding/calendar-integration-new/components/ServiceLocationComboCard",
  () => {
    return function MockServiceLocationComboCard({ combo, isExpanded, isSelected }: any) {
      return (
        <div data-testid={`combo-card-${combo.id}`}>
          <div data-testid="combo-employee">{combo.employeeName}</div>
          <div data-testid="combo-location">{combo.locationName}</div>
          <div data-testid="combo-services-count">{combo.services.length}</div>
          <div data-testid="combo-expanded">{isExpanded ? "expanded" : "collapsed"}</div>
          <div data-testid="combo-selected">{isSelected ? "selected" : "not-selected"}</div>
        </div>
      );
    };
  }
);

describe("EmployeeBasedStrategyRendererNew", () => {
  const mockServiceLocationCombos = [
    {
      id: "combo-employee1-main-123-test",
      locationId: "main",
      locationName: "Studio • lead photo",
      address: "4510 Mill Pond Ct, Colleyville, TX 76034-3678",
      cardType: "employee-location",
      services: [
        {
          id: "service1",
          name: "Studio Portrait",
          price: 350,
          locationId: "main",
        },
      ],
      resources: [],
      employeeId: "employee1",
      employeeName: "Joseph Hernandez",
      employeeAvatar: "",
      employeeCalendar: {
        employeeId: "employee1",
        employeeName: "Joseph Hernandez",
        calendar: {
          provider: "",
          calendarId: "",
          calendarName: "",
          connectionStatus: "disconnected",
        },
        availability: {
          bufferTime: 15,
          serviceRestrictions: [],
        },
      },
      logicType: "any",
      combinedFromServices: [],
      combiningAllowed: true,
      requirements: [],
    },
    {
      id: "combo-employee1-mobile-456-test",
      locationId: "mobile",
      locationName: "Mobile Service • lead photo",
      address: "25 mile radius from 76034",
      cardType: "employee-location",
      services: [
        {
          id: "service2",
          name: "Wedding",
          price: 3000,
          locationId: "mobile",
        },
      ],
      resources: [],
      employeeId: "employee1",
      employeeName: "Joseph Hernandez",
      employeeAvatar: "",
      employeeCalendar: {
        employeeId: "employee1",
        employeeName: "Joseph Hernandez",
        calendar: {
          provider: "",
          calendarId: "",
          calendarName: "",
          connectionStatus: "disconnected",
        },
        availability: {
          bufferTime: 15,
          serviceRestrictions: [],
        },
      },
      logicType: "any",
      combinedFromServices: [],
      combiningAllowed: true,
      requirements: [],
    },
    {
      id: "combo-employee2-main-789-test",
      locationId: "main",
      locationName: "Studio • assistant",
      address: "4510 Mill Pond Ct, Colleyville, TX 76034-3678",
      cardType: "employee-location",
      services: [
        {
          id: "service1",
          name: "Studio Portrait",
          price: 350,
          locationId: "main",
        },
      ],
      resources: [],
      employeeId: "employee2",
      employeeName: "Assistant",
      employeeAvatar: "",
      employeeCalendar: {
        employeeId: "employee2",
        employeeName: "Assistant",
        calendar: {
          provider: "",
          calendarId: "",
          calendarName: "",
          connectionStatus: "disconnected",
        },
        availability: {
          bufferTime: 15,
          serviceRestrictions: [],
        },
      },
      logicType: "any",
      combinedFromServices: [],
      combiningAllowed: true,
      requirements: [],
    },
  ];

  const defaultProps = {
    serviceLocationCombos: mockServiceLocationCombos,
    expandedCards: [],
    selectedCards: [],
    combiningMode: false,
    calendarAssignments: [],
    canCombineCard: jest.fn(() => true),
    onToggleCardExpansion: jest.fn(),
    onCardSelection: jest.fn(),
    onEditRequirements: jest.fn(),
    onSplitService: jest.fn(),
    generateRequirementString: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<EmployeeBasedStrategyRendererNew {...defaultProps} />);
    expect(screen.getByTestId(/combo-card-combo-employee1-main/)).toBeInTheDocument();
  });

  it("renders all provided service location combos", () => {
    render(<EmployeeBasedStrategyRendererNew {...defaultProps} />);

    // Should render all 3 combos:
    // - employee1 at main (with service1)
    // - employee1 at mobile (with service2)
    // - employee2 at main (with service1)
    expect(screen.getByTestId(/combo-card-combo-employee1-main/)).toBeInTheDocument();
    expect(screen.getByTestId(/combo-card-combo-employee1-mobile/)).toBeInTheDocument();
    expect(screen.getByTestId(/combo-card-combo-employee2-main/)).toBeInTheDocument();
  });

  it("displays correct employee names in combos", () => {
    render(<EmployeeBasedStrategyRendererNew {...defaultProps} />);

    expect(screen.getAllByText("Joseph Hernandez")).toHaveLength(2); // employee1 appears in 2 combos
    expect(screen.getByText("Assistant")).toBeInTheDocument();
  });

  it("displays correct location names with roles in combos", () => {
    render(<EmployeeBasedStrategyRendererNew {...defaultProps} />);

    expect(screen.getByText("Studio • lead photo")).toBeInTheDocument();
    expect(screen.getByText("Mobile Service • lead photo")).toBeInTheDocument();
    expect(screen.getByText("Studio • assistant")).toBeInTheDocument();
  });

  it("shows correct number of services per combo", () => {
    render(<EmployeeBasedStrategyRendererNew {...defaultProps} />);

    // All combos should have 1 service each
    const combos = screen.getAllByTestId(/combo-card-/);
    combos.forEach((combo) => {
      expect(combo).toHaveTextContent("1");
    });
  });

  it("handles expanded cards correctly", () => {
    const propsWithExpanded = {
      ...defaultProps,
      expandedCards: ["combo-employee1-main-123-test"], // Use a mock combo ID
    };

    render(<EmployeeBasedStrategyRendererNew {...propsWithExpanded} />);

    // Should show 1 expanded and 2 collapsed
    expect(screen.getByText("expanded")).toBeInTheDocument();
    expect(screen.getAllByText("collapsed")).toHaveLength(2);
  });

  it("handles selected cards correctly", () => {
    const propsWithSelected = {
      ...defaultProps,
      selectedCards: ["combo-employee1-main-123-test"], // Use a mock combo ID
    };

    render(<EmployeeBasedStrategyRendererNew {...propsWithSelected} />);

    // Should show 1 selected and 2 not selected
    expect(screen.getByText("selected")).toBeInTheDocument();
    expect(screen.getAllByText("not-selected")).toHaveLength(2);
  });

  it("handles combining mode correctly", () => {
    const propsWithCombining = {
      ...defaultProps,
      combiningMode: true,
    };

    render(<EmployeeBasedStrategyRendererNew {...propsWithCombining} />);

    // Should render without errors in combining mode
    expect(screen.getByTestId(/combo-card-combo-employee1-main/)).toBeInTheDocument();
  });

  it("handles empty combos gracefully", () => {
    const propsWithEmpty = {
      ...defaultProps,
      serviceLocationCombos: [],
    };

    render(<EmployeeBasedStrategyRendererNew {...propsWithEmpty} />);

    // Should render without crashing and show no combos
    expect(screen.queryByTestId(/combo-card-/)).not.toBeInTheDocument();
  });

  it("passes correct props to ServiceLocationComboCard", () => {
    const mockOnToggleExpansion = jest.fn();
    const mockOnCardSelection = jest.fn();
    const mockOnEditRequirements = jest.fn();
    const mockOnSplitService = jest.fn();
    const mockGenerateRequirementString = jest.fn();

    const propsWithCallbacks = {
      ...defaultProps,
      onToggleCardExpansion: mockOnToggleExpansion,
      onCardSelection: mockOnCardSelection,
      onEditRequirements: mockOnEditRequirements,
      onSplitService: mockOnSplitService,
      generateRequirementString: mockGenerateRequirementString,
    };

    render(<EmployeeBasedStrategyRendererNew {...propsWithCallbacks} />);

    // Verify that the component renders without errors
    expect(screen.getByTestId(/combo-card-combo-employee1-main/)).toBeInTheDocument();
  });
});
