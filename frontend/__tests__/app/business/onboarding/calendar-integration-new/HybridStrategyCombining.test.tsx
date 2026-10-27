import "@testing-library/jest-dom";

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

// Test combining functionality for hybrid strategy
describe("Hybrid Strategy Combining", () => {
  // Mock service location combos for hybrid strategy
  const mockHybridCombos = [
    {
      id: "combo-1",
      locationId: "physical-123",
      locationName: "Main Studio",
      address: "123 Main St",
      employeeId: "emp-1",
      employeeName: "Alice Brown",
      cardType: "employee-location",
      services: [
        { id: "service-1", name: "Portrait Session", price: 200, locationId: "physical-123" },
        { id: "service-2", name: "Wedding Photography", price: 2000, locationId: "physical-123" },
      ],
      resources: [{ id: "resource-1", name: "Studio A", type: "room", locationId: "physical-123" }],
      logicType: "any",
      combiningAllowed: true,
    },
    {
      id: "combo-2",
      locationId: "physical-123",
      locationName: "Main Studio",
      address: "123 Main St",
      employeeId: "emp-2",
      employeeName: "Bob Smith",
      cardType: "employee-location",
      services: [
        { id: "service-1", name: "Portrait Session", price: 200, locationId: "physical-123" },
      ],
      resources: [{ id: "resource-1", name: "Studio A", type: "room", locationId: "physical-123" }],
      logicType: "any",
      combiningAllowed: true,
    },
    {
      id: "combo-3",
      locationId: "mobile-456",
      locationName: "Mobile Service",
      address: "25 mile radius",
      employeeId: "emp-1",
      employeeName: "Alice Brown",
      cardType: "employee-location",
      services: [
        { id: "service-1", name: "Portrait Session", price: 200, locationId: "mobile-456" },
        { id: "service-2", name: "Wedding Photography", price: 2000, locationId: "mobile-456" },
      ],
      resources: [],
      logicType: "any",
      combiningAllowed: true,
    },
    {
      id: "combo-4",
      locationId: "mobile-456",
      locationName: "Mobile Service",
      address: "25 mile radius",
      employeeId: "emp-3",
      employeeName: "Carol Davis",
      cardType: "employee-location",
      services: [
        { id: "service-1", name: "Portrait Session", price: 200, locationId: "mobile-456" },
      ],
      resources: [],
      logicType: "any",
      combiningAllowed: true,
    },
  ];

  // Helper function to simulate canCombineCard logic for hybrid strategy
  const canCombineCard = (comboId: string, selectedCards: string[], combos: any[]) => {
    // Handle null/undefined inputs gracefully
    if (!selectedCards || !Array.isArray(selectedCards)) {
      return false;
    }

    if (!comboId || !combos || !Array.isArray(combos)) {
      return false;
    }

    if (selectedCards.length >= 2) {
      return false; // Already have 2 cards selected
    }

    if (selectedCards.length === 0) {
      return true; // Can select first card
    }

    // Get the currently selected card
    const selectedCard = combos.find((combo) => combo.id === selectedCards[0]);
    const candidateCard = combos.find((combo) => combo.id === comboId);

    if (!selectedCard || !candidateCard) {
      return false;
    }

    // For hybrid strategy, both cards must have the same location
    return selectedCard.locationId === candidateCard.locationId;
  };

  it("allows combining cards with same location in hybrid strategy", () => {
    const selectedCards = ["combo-1"]; // Alice Brown at Main Studio

    // Should be able to combine with Bob Smith at same location
    expect(canCombineCard("combo-2", selectedCards, mockHybridCombos)).toBe(true);

    // Should not be able to combine with Alice Brown at different location
    expect(canCombineCard("combo-3", selectedCards, mockHybridCombos)).toBe(false);

    // Should not be able to combine with Carol Davis at different location
    expect(canCombineCard("combo-4", selectedCards, mockHybridCombos)).toBe(false);
  });

  it("prevents combining more than 2 cards", () => {
    const selectedCards = ["combo-1", "combo-2"]; // Already have 2 cards selected

    // Should not be able to select a third card
    expect(canCombineCard("combo-3", selectedCards, mockHybridCombos)).toBe(false);
  });

  it("allows selecting first card when none are selected", () => {
    const selectedCards: string[] = [];

    // Should be able to select any card as the first one
    expect(canCombineCard("combo-1", selectedCards, mockHybridCombos)).toBe(true);
    expect(canCombineCard("combo-2", selectedCards, mockHybridCombos)).toBe(true);
    expect(canCombineCard("combo-3", selectedCards, mockHybridCombos)).toBe(true);
    expect(canCombineCard("combo-4", selectedCards, mockHybridCombos)).toBe(true);
  });

  it("handles invalid card IDs gracefully", () => {
    const selectedCards = ["combo-1"];

    // Should return false for non-existent card IDs
    expect(canCombineCard("non-existent", selectedCards, mockHybridCombos)).toBe(false);
    expect(canCombineCard("", selectedCards, mockHybridCombos)).toBe(false);
  });

  it("allows combining cards from same location with different employees", () => {
    const selectedCards = ["combo-1"]; // Alice Brown at Main Studio

    // Should be able to combine with Bob Smith at same location (Main Studio)
    expect(canCombineCard("combo-2", selectedCards, mockHybridCombos)).toBe(true);
  });

  it("prevents combining cards from different locations", () => {
    const selectedCards = ["combo-1"]; // Alice Brown at Main Studio

    // Should not be able to combine with Alice Brown at different location (Mobile)
    expect(canCombineCard("combo-3", selectedCards, mockHybridCombos)).toBe(false);

    // Should not be able to combine with Carol Davis at different location (Mobile)
    expect(canCombineCard("combo-4", selectedCards, mockHybridCombos)).toBe(false);
  });

  it("handles combining with same employee at different locations", () => {
    const selectedCards = ["combo-1"]; // Alice Brown at Main Studio

    // Should not be able to combine with Alice Brown at Mobile location
    expect(canCombineCard("combo-3", selectedCards, mockHybridCombos)).toBe(false);
  });

  it("validates combining logic for complex scenarios", () => {
    // Test with mobile location combinations
    const selectedCards = ["combo-3"]; // Alice Brown at Mobile Service

    // Should be able to combine with Carol Davis at same location (Mobile)
    expect(canCombineCard("combo-4", selectedCards, mockHybridCombos)).toBe(true);

    // Should not be able to combine with Alice Brown at different location (Main Studio)
    expect(canCombineCard("combo-1", selectedCards, mockHybridCombos)).toBe(false);

    // Should not be able to combine with Bob Smith at different location (Main Studio)
    expect(canCombineCard("combo-2", selectedCards, mockHybridCombos)).toBe(false);
  });

  it("handles empty selected cards array", () => {
    const selectedCards: string[] = [];

    // Should be able to select any card when none are selected
    mockHybridCombos.forEach((combo) => {
      expect(canCombineCard(combo.id, selectedCards, mockHybridCombos)).toBe(true);
    });
  });

  it("handles null or undefined inputs gracefully", () => {
    const selectedCards = ["combo-1"];

    // Should handle null/undefined inputs gracefully
    expect(canCombineCard(null as any, selectedCards, mockHybridCombos)).toBe(false);
    expect(canCombineCard(undefined as any, selectedCards, mockHybridCombos)).toBe(false);
    expect(canCombineCard("combo-1", null as any, mockHybridCombos)).toBe(false);
    expect(canCombineCard("combo-1", undefined as any, mockHybridCombos)).toBe(false);
  });

  it("handles empty combos array", () => {
    const selectedCards = ["combo-1"];
    const emptyCombos: any[] = [];

    // Should return false when no combos are available
    expect(canCombineCard("combo-1", selectedCards, emptyCombos)).toBe(false);
  });

  it("validates combining rules for hybrid strategy specifically", () => {
    // Hybrid strategy should allow combining cards with same location
    // regardless of employee differences

    const mainStudioCombos = mockHybridCombos.filter(
      (combo) => combo.locationId === "physical-123"
    );
    const mobileCombos = mockHybridCombos.filter((combo) => combo.locationId === "mobile-456");

    // All main studio combos should be combinable with each other
    mainStudioCombos.forEach((combo1) => {
      mainStudioCombos.forEach((combo2) => {
        if (combo1.id !== combo2.id) {
          expect(canCombineCard(combo2.id, [combo1.id], mockHybridCombos)).toBe(true);
        }
      });
    });

    // All mobile combos should be combinable with each other
    mobileCombos.forEach((combo1) => {
      mobileCombos.forEach((combo2) => {
        if (combo1.id !== combo2.id) {
          expect(canCombineCard(combo2.id, [combo1.id], mockHybridCombos)).toBe(true);
        }
      });
    });

    // Main studio combos should not be combinable with mobile combos
    mainStudioCombos.forEach((combo1) => {
      mobileCombos.forEach((combo2) => {
        expect(canCombineCard(combo2.id, [combo1.id], mockHybridCombos)).toBe(false);
        expect(canCombineCard(combo1.id, [combo2.id], mockHybridCombos)).toBe(false);
      });
    });
  });

  it("handles combining with cards that have no services", () => {
    const combosWithNoServices = [
      {
        id: "combo-empty-1",
        locationId: "physical-123",
        locationName: "Main Studio",
        address: "123 Main St",
        employeeId: "emp-empty",
        employeeName: "Empty Employee",
        cardType: "employee-location",
        services: [],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
      },
      {
        id: "combo-empty-2",
        locationId: "physical-123",
        locationName: "Main Studio",
        address: "123 Main St",
        employeeId: "emp-empty-2",
        employeeName: "Another Empty Employee",
        cardType: "employee-location",
        services: [],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
      },
    ];

    const selectedCards = ["combo-empty-1"];

    // Should be able to combine empty cards at same location
    expect(canCombineCard("combo-empty-2", selectedCards, combosWithNoServices)).toBe(true);
  });

  it("handles combining with cards that have no resources", () => {
    const combosWithNoResources = [
      {
        id: "combo-no-resources-1",
        locationId: "mobile-456",
        locationName: "Mobile Service",
        address: "25 mile radius",
        employeeId: "emp-1",
        employeeName: "Alice Brown",
        cardType: "employee-location",
        services: [
          { id: "service-1", name: "Portrait Session", price: 200, locationId: "mobile-456" },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
      },
      {
        id: "combo-no-resources-2",
        locationId: "mobile-456",
        locationName: "Mobile Service",
        address: "25 mile radius",
        employeeId: "emp-2",
        employeeName: "Bob Smith",
        cardType: "employee-location",
        services: [
          { id: "service-1", name: "Portrait Session", price: 200, locationId: "mobile-456" },
        ],
        resources: [],
        logicType: "any",
        combiningAllowed: true,
      },
    ];

    const selectedCards = ["combo-no-resources-1"];

    // Should be able to combine cards with no resources at same location
    expect(canCombineCard("combo-no-resources-2", selectedCards, combosWithNoResources)).toBe(true);
  });

  it("validates combining logic consistency", () => {
    // Test that combining logic is consistent (symmetric)
    const testCases = [
      { selected: ["combo-1"], candidate: "combo-2" },
      { selected: ["combo-2"], candidate: "combo-1" },
      { selected: ["combo-3"], candidate: "combo-4" },
      { selected: ["combo-4"], candidate: "combo-3" },
    ];

    testCases.forEach(({ selected, candidate }) => {
      const result1 = canCombineCard(candidate, selected, mockHybridCombos);
      const result2 = canCombineCard(selected[0], [candidate], mockHybridCombos);

      // Results should be consistent
      expect(result1).toBe(result2);
    });
  });
});
