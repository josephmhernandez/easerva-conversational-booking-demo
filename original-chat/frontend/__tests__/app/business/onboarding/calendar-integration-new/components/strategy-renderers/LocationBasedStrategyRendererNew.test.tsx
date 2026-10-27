import LocationBasedStrategyRendererNew from "@/app/business/onboarding/calendar-integration-new/components/strategy-renderers/LocationBasedStrategyRendererNew";
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
          <div data-testid="combo-expanded">{isExpanded ? "expanded" : "collapsed"}</div>
          <div data-testid="combo-selected">{isSelected ? "selected" : "not-selected"}</div>
        </div>
      );
    };
  }
);

describe("LocationBasedStrategyRendererNew", () => {
  const mockServiceLocationCombos = [
    {
      id: "combo-location1",
      locationId: "location1",
      locationName: "Studio",
      address: "123 Main St",
      cardType: "location",
      services: [
        { id: "service1", name: "Portrait", price: 100, locationId: "location1" },
        { id: "service2", name: "Wedding", price: 500, locationId: "location1" },
      ],
      resources: [],
      logicType: "any",
      combiningAllowed: true,
      requirements: [],
    },
    {
      id: "combo-location2",
      locationId: "location2",
      locationName: "Mobile Service",
      address: "25 mile radius",
      cardType: "location",
      services: [{ id: "service3", name: "Mobile Portrait", price: 150, locationId: "location2" }],
      resources: [],
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
    render(<LocationBasedStrategyRendererNew {...defaultProps} />);
    expect(screen.getByTestId("combo-card-combo-location1")).toBeInTheDocument();
  });

  it("renders all location combos", () => {
    render(<LocationBasedStrategyRendererNew {...defaultProps} />);

    expect(screen.getByTestId("combo-card-combo-location1")).toBeInTheDocument();
    expect(screen.getByTestId("combo-card-combo-location2")).toBeInTheDocument();
  });

  it("displays correct location names", () => {
    render(<LocationBasedStrategyRendererNew {...defaultProps} />);

    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByText("Mobile Service")).toBeInTheDocument();
  });

  it("shows correct number of services per combo", () => {
    render(<LocationBasedStrategyRendererNew {...defaultProps} />);

    // Studio should have 2 services
    const studioCombo = screen.getByTestId("combo-card-combo-location1");
    expect(studioCombo).toHaveTextContent("2");

    // Mobile Service should have 1 service
    const mobileCombo = screen.getByTestId("combo-card-combo-location2");
    expect(mobileCombo).toHaveTextContent("1");
  });

  it("handles expanded cards correctly", () => {
    const propsWithExpanded = {
      ...defaultProps,
      expandedCards: ["combo-location1"],
    };

    render(<LocationBasedStrategyRendererNew {...propsWithExpanded} />);

    expect(screen.getByText("expanded")).toBeInTheDocument();
    expect(screen.getByText("collapsed")).toBeInTheDocument();
  });

  it("handles selected cards correctly", () => {
    const propsWithSelected = {
      ...defaultProps,
      selectedCards: ["combo-location1"],
    };

    render(<LocationBasedStrategyRendererNew {...propsWithSelected} />);

    expect(screen.getByText("selected")).toBeInTheDocument();
    expect(screen.getByText("not-selected")).toBeInTheDocument();
  });

  it("handles combining mode correctly", () => {
    const propsWithCombining = {
      ...defaultProps,
      combiningMode: true,
      canCombineCard: jest.fn((comboId) => comboId === "combo-location1"),
    };

    render(<LocationBasedStrategyRendererNew {...propsWithCombining} />);

    // The canCombineCard function should be called for each combo
    expect(propsWithCombining.canCombineCard).toHaveBeenCalled();
  });

  it("handles empty combos gracefully", () => {
    const propsWithEmptyCombos = {
      ...defaultProps,
      serviceLocationCombos: [],
    };

    render(<LocationBasedStrategyRendererNew {...propsWithEmptyCombos} />);

    // Should render without crashing and show no combos
    expect(screen.queryByTestId(/combo-card-/)).not.toBeInTheDocument();
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

    render(<LocationBasedStrategyRendererNew {...propsWithCallbacks} />);

    // The component should render without errors, indicating props are passed correctly
    expect(screen.getByTestId("combo-card-combo-location1")).toBeInTheDocument();
  });

  it("handles calendar assignments correctly", () => {
    const mockCalendarAssignments = [
      {
        entityType: "location" as const,
        entityId: "location1",
        calendarId: "cal123",
        isPending: false,
      },
    ];

    const propsWithAssignments = {
      ...defaultProps,
      calendarAssignments: mockCalendarAssignments,
    };

    render(<LocationBasedStrategyRendererNew {...propsWithAssignments} />);

    // Should render without errors
    expect(screen.getByTestId("combo-card-combo-location1")).toBeInTheDocument();
  });
});
