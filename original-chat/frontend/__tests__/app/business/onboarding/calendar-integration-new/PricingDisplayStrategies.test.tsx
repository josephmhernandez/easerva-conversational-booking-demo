import EmployeeBasedStrategyRendererNew from "@/app/business/onboarding/calendar-integration-new/components/strategy-renderers/EmployeeBasedStrategyRendererNew";
import HybridStrategyRendererNew from "@/app/business/onboarding/calendar-integration-new/components/strategy-renderers/HybridStrategyRendererNew";
import LocationBasedStrategyRendererNew from "@/app/business/onboarding/calendar-integration-new/components/strategy-renderers/LocationBasedStrategyRendererNew";
import ResourceBasedStrategyRendererNew from "@/app/business/onboarding/calendar-integration-new/components/strategy-renderers/ResourceBasedStrategyRendererNew";
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

describe("Pricing Display Across Booking Strategies", () => {
  const defaultHandlers = {
    expandedCards: [],
    selectedCards: [],
    combiningMode: false,
    canCombineCard: jest.fn(() => true),
    onToggleCardExpansion: jest.fn(),
    onCardSelection: jest.fn(),
    onEditRequirements: jest.fn(),
    onSplitService: jest.fn(),
    generateRequirementString: jest.fn(() => "Requirements set"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Location-Based Strategy", () => {
    it("displays fixed pricing for location services", () => {
      const combos = [
        {
          id: "combo-location-1",
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
        },
      ];

      render(
        <LocationBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-location-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Hair Cut")).toBeInTheDocument();
      expect(screen.getByText("$75")).toBeInTheDocument();
    });

    it("displays variable pricing for location services", () => {
      const combos = [
        {
          id: "combo-location-1",
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
        },
      ];

      render(
        <LocationBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-location-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$150 - $400")).toBeInTheDocument();
    });

    it("displays custom pricing override for location services", () => {
      const combos = [
        {
          id: "combo-location-1",
          locationId: "mobile-location",
          locationName: "Mobile Service 1",
          address: "25 mile radius",
          cardType: "location",
          services: [
            {
              id: "service-1",
              name: "Haircut and Shave",
              price: 555, // Custom override
              priceType: "fixed" as const,
              locationId: "mobile-location",
            },
            {
              id: "service-2",
              name: "Hair Coloring",
              price: 0,
              priceType: "variable" as const,
              priceMin: 444, // Custom override
              priceMax: 888, // Custom override
              locationId: "mobile-location",
            },
          ],
          resources: [],
          logicType: "any",
          combiningAllowed: true,
          requirements: [],
        },
      ];

      render(
        <LocationBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-location-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Haircut and Shave")).toBeInTheDocument();
      expect(screen.getByText("$555")).toBeInTheDocument();
      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$444 - $888")).toBeInTheDocument();
    });
  });

  describe("Employee-Based Strategy", () => {
    it("displays fixed pricing for employee services", () => {
      const combos = [
        {
          id: "combo-emp-1",
          locationId: "location-1",
          locationName: "Main Location",
          address: "123 Main St",
          employeeId: "emp-1",
          employeeName: "John Doe",
          employeeAvatar: "👤",
          cardType: "employee-location",
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
        },
      ];

      render(
        <EmployeeBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-emp-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Hair Cut")).toBeInTheDocument();
      expect(screen.getByText("$75")).toBeInTheDocument();
    });

    it("displays variable pricing for employee services", () => {
      const combos = [
        {
          id: "combo-emp-1",
          locationId: "location-1",
          locationName: "Main Location",
          address: "123 Main St",
          employeeId: "emp-1",
          employeeName: "Jane Smith",
          employeeAvatar: "👤",
          cardType: "employee-location",
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
        },
      ];

      render(
        <EmployeeBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-emp-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$150 - $400")).toBeInTheDocument();
    });

    it("displays multiple services with mixed pricing for employee", () => {
      const combos = [
        {
          id: "combo-emp-1",
          locationId: "location-1",
          locationName: "Main Location",
          address: "123 Main St",
          employeeId: "emp-1",
          employeeName: "John Doe",
          employeeAvatar: "👤",
          cardType: "employee-location",
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
          ],
          resources: [],
          logicType: "any",
          combiningAllowed: true,
          requirements: [],
        },
      ];

      render(
        <EmployeeBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-emp-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Hair Cut")).toBeInTheDocument();
      expect(screen.getByText("$75")).toBeInTheDocument();
      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$150 - $400")).toBeInTheDocument();
    });
  });

  describe("Resource-Based Strategy", () => {
    it("displays fixed pricing for resource services", () => {
      const combos = [
        {
          id: "combo-resource-1",
          locationId: "location-1",
          locationName: "Main Location - Room A",
          address: "123 Main St",
          cardType: "resource",
          services: [
            {
              id: "service-1",
              name: "Hair Cut",
              price: 75,
              priceType: "fixed" as const,
              locationId: "location-1",
            },
          ],
          resources: [
            {
              id: "resource-1",
              name: "Room A",
              type: "room",
              description: "Room A",
              locationId: "location-1",
            },
          ],
          logicType: "any",
          combiningAllowed: false,
          requirements: [],
        },
      ];

      render(
        <ResourceBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-resource-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Hair Cut")).toBeInTheDocument();
      expect(screen.getByText("$75")).toBeInTheDocument();
    });

    it("displays variable pricing for resource services", () => {
      const combos = [
        {
          id: "combo-resource-1",
          locationId: "location-1",
          locationName: "Main Location - Service Van",
          address: "Mobile service area",
          cardType: "resource",
          services: [
            {
              id: "service-1",
              name: "Hair Coloring",
              price: 0,
              priceType: "variable" as const,
              priceMin: 444,
              priceMax: 888,
              locationId: "location-1",
            },
          ],
          resources: [
            {
              id: "resource-1",
              name: "Service Van",
              type: "vehicle",
              description: "Mobile van",
              locationId: "location-1",
            },
          ],
          logicType: "any",
          combiningAllowed: false,
          requirements: [],
        },
      ];

      render(
        <ResourceBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-resource-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$444 - $888")).toBeInTheDocument();
    });
  });

  describe("Hybrid Strategy", () => {
    it("displays fixed pricing for hybrid strategy services", () => {
      const combos = [
        {
          id: "combo-hybrid-1",
          locationId: "location-1",
          locationName: "Main Location",
          address: "123 Main St",
          employeeId: "emp-1",
          employeeName: "John Doe",
          employeeAvatar: "👤",
          cardType: "employee-location",
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
        },
      ];

      render(
        <HybridStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-hybrid-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Hair Cut")).toBeInTheDocument();
      expect(screen.getByText("$75")).toBeInTheDocument();
    });

    it("displays variable pricing for hybrid strategy services", () => {
      const combos = [
        {
          id: "combo-hybrid-1",
          locationId: "location-1",
          locationName: "Main Location",
          address: "123 Main St",
          employeeId: "emp-1",
          employeeName: "Jane Smith",
          employeeAvatar: "👤",
          cardType: "employee-location",
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
        },
      ];

      render(
        <HybridStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-hybrid-1"]}
          serviceLocationCombos={combos}
        />
      );

      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$150 - $400")).toBeInTheDocument();
    });

    it("displays mixed pricing across multiple employees", () => {
      const combos = [
        {
          id: "combo-hybrid-1",
          locationId: "location-1",
          locationName: "Main Location",
          address: "123 Main St",
          employeeId: "emp-1",
          employeeName: "John Doe",
          employeeAvatar: "👤",
          cardType: "employee-location",
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
        },
        {
          id: "combo-hybrid-2",
          locationId: "location-1",
          locationName: "Main Location",
          address: "123 Main St",
          employeeId: "emp-2",
          employeeName: "Jane Smith",
          employeeAvatar: "👤",
          cardType: "employee-location",
          services: [
            {
              id: "service-2",
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
        },
      ];

      render(
        <HybridStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-hybrid-1", "combo-hybrid-2"]}
          serviceLocationCombos={combos}
        />
      );

      // Check John's services
      expect(screen.getByText("Hair Cut")).toBeInTheDocument();
      expect(screen.getByText("$75")).toBeInTheDocument();

      // Check Jane's services
      expect(screen.getByText("Hair Coloring")).toBeInTheDocument();
      expect(screen.getByText("$150 - $400")).toBeInTheDocument();
    });
  });

  describe("Cross-Strategy Consistency", () => {
    it("displays the same service with same pricing across different strategies", () => {
      const service = {
        id: "service-1",
        name: "Hair Cut",
        price: 75,
        priceType: "fixed" as const,
        locationId: "location-1",
      };

      // Location strategy
      const locationCombo = {
        id: "combo-location-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [service],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      const { unmount } = render(
        <LocationBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-location-1"]}
          serviceLocationCombos={[locationCombo]}
        />
      );

      expect(screen.getByText("$75")).toBeInTheDocument();
      unmount();

      // Employee strategy
      const employeeCombo = {
        id: "combo-emp-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        employeeId: "emp-1",
        employeeName: "John Doe",
        employeeAvatar: "👤",
        cardType: "employee-location",
        services: [service],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      render(
        <EmployeeBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-emp-1"]}
          serviceLocationCombos={[employeeCombo]}
        />
      );

      expect(screen.getByText("$75")).toBeInTheDocument();
    });

    it("displays variable pricing consistently across strategies", () => {
      const service = {
        id: "service-1",
        name: "Hair Coloring",
        price: 0,
        priceType: "variable" as const,
        priceMin: 150,
        priceMax: 400,
        locationId: "location-1",
      };

      // Test with Location Strategy
      const locationCombo = {
        id: "combo-location-1",
        locationId: "location-1",
        locationName: "Main Location",
        address: "123 Main St",
        cardType: "location",
        services: [service],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
        requirements: [],
      };

      const { unmount: unmountLocation } = render(
        <LocationBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-location-1"]}
          serviceLocationCombos={[locationCombo]}
        />
      );

      expect(screen.getByText("$150 - $400")).toBeInTheDocument();
      unmountLocation();

      // Test with Resource Strategy
      const resourceCombo = {
        id: "combo-resource-1",
        locationId: "location-1",
        locationName: "Main Location - Room A",
        address: "123 Main St",
        cardType: "resource",
        services: [service],
        resources: [
          {
            id: "resource-1",
            name: "Room A",
            type: "room",
            description: "Room A",
            locationId: "location-1",
          },
        ],
        logicType: "any",
        combiningAllowed: false,
        requirements: [],
      };

      render(
        <ResourceBasedStrategyRendererNew
          {...defaultHandlers}
          expandedCards={["combo-resource-1"]}
          serviceLocationCombos={[resourceCombo]}
        />
      );

      expect(screen.getByText("$150 - $400")).toBeInTheDocument();
    });
  });
});
