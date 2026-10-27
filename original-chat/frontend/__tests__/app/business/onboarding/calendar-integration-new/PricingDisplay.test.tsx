import ServiceLocationComboCard from "@/app/business/onboarding/calendar-integration-new/components/ServiceLocationComboCard";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

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

describe("ServiceLocationComboCard - Pricing Display", () => {
  const defaultProps = {
    isExpanded: true,
    isSelected: false,
    combiningMode: false,
    onToggleExpansion: jest.fn(),
    onToggleSelection: jest.fn(),
    onEditRequirements: jest.fn(),
    onSplitService: jest.fn(),
    generateRequirementString: jest.fn(() => "Requirements set"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Fixed Pricing", () => {
    it("displays fixed price correctly", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Hair Cut",
            price: 75,
            priceType: "fixed" as const,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      expect(screen.getByText("Hair Cut")).toBeInTheDocument();
      expect(screen.getByText("$75")).toBeInTheDocument();
    });

    it("displays fixed price when priceType is not specified (defaults to fixed)", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Hair Consultation",
            price: 35,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      expect(screen.getByText("Hair Consultation")).toBeInTheDocument();
      expect(screen.getByText("$35")).toBeInTheDocument();
    });
  });

  describe("Variable Pricing", () => {
    it("displays variable pricing range correctly", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Hair Coloring",
            price: 0,
            priceType: "variable" as const,
            priceMin: 150,
            priceMax: 400,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$150 - $400")).toBeInTheDocument();
      expect(screen.queryByText("$0")).not.toBeInTheDocument();
    });

    it("does not display range if priceMin or priceMax is missing", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Variable Service",
            price: 100,
            priceType: "variable" as const,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      // Should fallback to fixed price display
      expect(screen.getByText("$100")).toBeInTheDocument();
    });
  });

  describe("Custom Pricing Override", () => {
    it("displays custom fixed pricing override", () => {
      const combo = {
        id: "combo-1",
        locationId: "mobile-location",
        locationName: "Mobile Service 1",
        address: "25 mile radius",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Haircut and Shave",
            price: 555, // Custom price
            priceType: "fixed" as const,
            locationId: "mobile-location",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      expect(screen.getByText("Haircut and Shave")).toBeInTheDocument();
      expect(screen.getByText("$555")).toBeInTheDocument();
    });

    it("displays custom variable pricing override", () => {
      const combo = {
        id: "combo-1",
        locationId: "mobile-location",
        locationName: "Mobile Service 1",
        address: "25 mile radius",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Hair Coloring",
            price: 0,
            priceType: "variable" as const,
            priceMin: 444, // Custom min
            priceMax: 888, // Custom max
            locationId: "mobile-location",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$444 - $888")).toBeInTheDocument();
    });
  });

  describe("Multiple Services with Mixed Pricing", () => {
    it("displays multiple services with different pricing types", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Hair Cut",
            price: 75,
            priceType: "fixed" as const,
            locationId: "location-1",
          },
          {
            id: "service-2",
            name: "Hair Coloring",
            price: 0,
            priceType: "variable" as const,
            priceMin: 150,
            priceMax: 400,
            locationId: "location-1",
          },
          {
            id: "service-3",
            name: "Hair Consultation",
            price: 35,
            priceType: "fixed" as const,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      // Fixed price services
      expect(screen.getByText("Hair Cut")).toBeInTheDocument();
      expect(screen.getByText("$75")).toBeInTheDocument();
      expect(screen.getByText("Hair Consultation")).toBeInTheDocument();
      expect(screen.getByText("$35")).toBeInTheDocument();

      // Variable price service
      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$150 - $400")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles zero price correctly", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Free Consultation",
            price: 0,
            priceType: "fixed" as const,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      expect(screen.getByText("Free Consultation")).toBeInTheDocument();
      expect(screen.getByText("$0")).toBeInTheDocument();
    });

    it("handles large prices correctly", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Premium Package",
            price: 9999,
            priceType: "fixed" as const,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      expect(screen.getByText("Premium Package")).toBeInTheDocument();
      expect(screen.getByText("$9999")).toBeInTheDocument();
    });

    it("handles decimal prices correctly", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Quick Trim",
            price: 24.5,
            priceType: "fixed" as const,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      expect(screen.getByText("Quick Trim")).toBeInTheDocument();
      expect(screen.getByText("$24.5")).toBeInTheDocument();
    });

    it("handles variable pricing with same min and max", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Fixed Rate Service",
            price: 0,
            priceType: "variable" as const,
            priceMin: 100,
            priceMax: 100,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} />);

      expect(screen.getByText("Fixed Rate Service")).toBeInTheDocument();
      expect(screen.getByText("$100 - $100")).toBeInTheDocument();
    });
  });

  describe("Collapsed State", () => {
    it("does not show prices when card is collapsed", () => {
      const combo = {
        id: "combo-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [
          {
            id: "service-1",
            name: "Hair Cut",
            price: 75,
            priceType: "fixed" as const,
            locationId: "location-1",
          },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(<ServiceLocationComboCard {...defaultProps} combo={combo} isExpanded={false} />);

      expect(screen.getByText("Main Location")).toBeInTheDocument();
      expect(screen.queryByText("Hair Cut")).not.toBeInTheDocument();
      expect(screen.queryByText("$75")).not.toBeInTheDocument();
    });
  });
});
