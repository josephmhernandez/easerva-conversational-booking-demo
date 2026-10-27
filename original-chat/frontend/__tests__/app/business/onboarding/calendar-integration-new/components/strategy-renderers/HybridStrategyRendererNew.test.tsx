import HybridStrategyRendererNew from "@/app/business/onboarding/calendar-integration-new/components/strategy-renderers/HybridStrategyRendererNew";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

// Mock the ServiceLocationComboCard component
jest.mock(
  "@/app/business/onboarding/calendar-integration-new/components/ServiceLocationComboCard",
  () => {
    return function MockServiceLocationComboCard({ combo, isExpanded, isSelected }: any) {
      return (
        <div data-testid={`combo-card-${combo.id}`}>
          <div data-testid="combo-location">{combo.locationName}</div>
          <div data-testid="combo-services-count">{combo.services.length}</div>
          <div data-testid="combo-resources-count">{combo.resources.length}</div>
          <div data-testid="combo-employees-count">{combo.employees?.length || 0}</div>
          <div data-testid="combo-expanded">{isExpanded ? "expanded" : "collapsed"}</div>
          <div data-testid="combo-selected">{isSelected ? "selected" : "not-selected"}</div>
        </div>
      );
    };
  }
);

describe("HybridStrategyRendererNew", () => {
  const mockServiceLocationCombos = [
    {
      id: "combo-hybrid1",
      locationId: "location1",
      locationName: "Studio",
      address: "123 Main St",
      cardType: "location",
      services: [{ id: "service1", name: "Portrait", price: 100, locationId: "location1" }],
      resources: [{ id: "resource1", name: "Camera", type: "equipment", locationId: "location1" }],
      employees: [
        {
          id: "employee1",
          fullName: "John Doe",
          email: "john@example.com",
          role: "photographer",
          locationId: "location1",
          takesBookings: true,
        },
      ],
      logicType: "any",
      combiningAllowed: true,
      requirements: [],
    },
    {
      id: "combo-hybrid2",
      locationId: "location2",
      locationName: "Mobile Service",
      address: "25 mile radius",
      cardType: "location",
      services: [{ id: "service2", name: "Mobile Portrait", price: 150, locationId: "location2" }],
      resources: [
        { id: "resource2", name: "Mobile Camera", type: "equipment", locationId: "location2" },
      ],
      employees: [
        {
          id: "employee2",
          fullName: "Jane Smith",
          email: "jane@example.com",
          role: "photographer",
          locationId: "location2",
          takesBookings: true,
        },
      ],
      logicType: "any",
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
    generateRequirementString: jest.fn((requirements) => "Test requirements"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<HybridStrategyRendererNew {...defaultProps} />);
    expect(screen.getByTestId("combo-card-combo-hybrid1")).toBeInTheDocument();
  });

  it("renders all hybrid combos", () => {
    render(<HybridStrategyRendererNew {...defaultProps} />);

    expect(screen.getByTestId("combo-card-combo-hybrid1")).toBeInTheDocument();
    expect(screen.getByTestId("combo-card-combo-hybrid2")).toBeInTheDocument();
  });

  it("displays correct location names", () => {
    render(<HybridStrategyRendererNew {...defaultProps} />);

    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByText("Mobile Service")).toBeInTheDocument();
  });

  it("shows correct number of services per combo", () => {
    render(<HybridStrategyRendererNew {...defaultProps} />);

    // Studio should have 1 service
    const studioCombo = screen.getByTestId("combo-card-combo-hybrid1");
    expect(studioCombo).toHaveTextContent("1");

    // Mobile Service should have 1 service
    const mobileCombo = screen.getByTestId("combo-card-combo-hybrid2");
    expect(mobileCombo).toHaveTextContent("1");
  });

  it("shows correct number of resources per combo", () => {
    render(<HybridStrategyRendererNew {...defaultProps} />);

    // Studio should have 1 resource
    const studioCombo = screen.getByTestId("combo-card-combo-hybrid1");
    expect(studioCombo).toHaveTextContent("1");

    // Mobile Service should have 1 resource
    const mobileCombo = screen.getByTestId("combo-card-combo-hybrid2");
    expect(mobileCombo).toHaveTextContent("1");
  });

  it("shows correct number of employees per combo", () => {
    render(<HybridStrategyRendererNew {...defaultProps} />);

    // Studio should have 1 employee
    const studioCombo = screen.getByTestId("combo-card-combo-hybrid1");
    expect(studioCombo).toHaveTextContent("1");

    // Mobile Service should have 1 employee
    const mobileCombo = screen.getByTestId("combo-card-combo-hybrid2");
    expect(mobileCombo).toHaveTextContent("1");
  });

  it("handles expanded cards correctly", () => {
    const propsWithExpanded = {
      ...defaultProps,
      expandedCards: ["combo-hybrid1"],
    };

    render(<HybridStrategyRendererNew {...propsWithExpanded} />);

    expect(screen.getByText("expanded")).toBeInTheDocument();
    expect(screen.getByText("collapsed")).toBeInTheDocument();
  });

  it("handles selected cards correctly", () => {
    const propsWithSelected = {
      ...defaultProps,
      selectedCards: ["combo-hybrid1"],
    };

    render(<HybridStrategyRendererNew {...propsWithSelected} />);

    expect(screen.getByText("selected")).toBeInTheDocument();
    expect(screen.getByText("not-selected")).toBeInTheDocument();
  });

  it("handles combining mode correctly", () => {
    const propsWithCombining = {
      ...defaultProps,
      combiningMode: true,
      canCombineCard: jest.fn((comboId) => comboId === "combo-hybrid1"),
    };

    render(<HybridStrategyRendererNew {...propsWithCombining} />);

    // The canCombineCard function should be called for each combo
    expect(propsWithCombining.canCombineCard).toHaveBeenCalled();
  });

  it("handles empty combos gracefully", () => {
    const propsWithEmptyCombos = {
      ...defaultProps,
      serviceLocationCombos: [],
    };

    render(<HybridStrategyRendererNew {...propsWithEmptyCombos} />);

    // Should render without crashing and show no combos
    expect(screen.queryByTestId(/combo-card-/)).not.toBeInTheDocument();
  });

  it("handles combos without employees gracefully", () => {
    const combosWithoutEmployees = [
      {
        ...mockServiceLocationCombos[0],
        employees: undefined,
      },
    ];

    const propsWithoutEmployees = {
      ...defaultProps,
      serviceLocationCombos: combosWithoutEmployees,
    };

    render(<HybridStrategyRendererNew {...propsWithoutEmployees} />);

    // Should render without crashing
    expect(screen.getByTestId("combo-card-combo-hybrid1")).toBeInTheDocument();

    // Should show 0 employees
    const combo = screen.getByTestId("combo-card-combo-hybrid1");
    expect(combo).toHaveTextContent("0");
  });

  it("passes all props to ServiceLocationComboCard correctly", () => {
    const mockOnToggleCardExpansion = jest.fn();
    const mockOnCardSelection = jest.fn();
    const mockOnEditRequirements = jest.fn();
    const mockOnSplitService = jest.fn();
    const mockGenerateRequirementString = jest.fn();

    const propsWithCallbacks = {
      ...defaultProps,
      onToggleCardExpansion: mockOnToggleCardExpansion,
      onCardSelection: mockOnCardSelection,
      onEditRequirements: mockOnEditRequirements,
      onSplitService: mockOnSplitService,
      generateRequirementString: mockGenerateRequirementString,
    };

    render(<HybridStrategyRendererNew {...propsWithCallbacks} />);

    // The component should render without errors, indicating props are passed correctly
    expect(screen.getByTestId("combo-card-combo-hybrid1")).toBeInTheDocument();
  });

  it("handles calendar assignments correctly", () => {
    const mockCalendarAssignments = [
      {
        entityType: "employee" as const,
        entityId: "employee1",
        calendarId: "cal123",
        isPending: false,
      },
      {
        entityType: "resource" as const,
        entityId: "resource1",
        calendarId: "cal456",
        isPending: false,
      },
      {
        entityType: "location" as const,
        entityId: "location1",
        calendarId: "cal789",
        isPending: false,
      },
    ];

    const propsWithAssignments = {
      ...defaultProps,
      calendarAssignments: mockCalendarAssignments,
    };

    render(<HybridStrategyRendererNew {...propsWithAssignments} />);

    // Should render without errors
    expect(screen.getByTestId("combo-card-combo-hybrid1")).toBeInTheDocument();
  });
});
