import { FlattenedCard } from "@/app/types/onboarding-review";

/**
 * Helper function to find the best matching card with fallback logic
 * This is a copy of the function from the API route for testing purposes
 */
function findBestMatchingCard(
  cards: FlattenedCard[],
  employeeId: string | undefined,
  locationId: string,
  serviceIds: string[]
): FlattenedCard | null {
  // Helper to check if card has any matching service
  const hasMatchingService = (card: FlattenedCard) =>
    card.serviceIds.some((id: string) => serviceIds.includes(id));

  // Priority 1: Employee + Location + Service
  let matches = cards.filter(
    (card) =>
      card.employeeId === employeeId && card.locationId === locationId && hasMatchingService(card)
  );
  if (matches.length > 0) return matches[0];

  // Priority 2: Employee + Service (prefer location match)
  if (employeeId) {
    matches = cards.filter((card) => card.employeeId === employeeId && hasMatchingService(card));
    if (matches.length > 0) {
      const withLocation = matches.find((c) => c.locationId === locationId);
      return withLocation || matches[0];
    }
  }

  // Priority 3: Employee + Location (prefer service match)
  if (employeeId) {
    matches = cards.filter(
      (card) => card.employeeId === employeeId && card.locationId === locationId
    );
    if (matches.length > 0) {
      const withService = matches.find(hasMatchingService);
      return withService || matches[0];
    }
  }

  // Priority 4: Service + Location
  matches = cards.filter((card) => card.locationId === locationId && hasMatchingService(card));
  if (matches.length > 0) return matches[0];

  // Priority 5: Service Only (prefer location match)
  matches = cards.filter(hasMatchingService);
  if (matches.length > 0) {
    const withLocation = matches.find((c) => c.locationId === locationId);
    return withLocation || matches[0];
  }

  // Priority 6: Location Only
  matches = cards.filter((card) => card.locationId === locationId);
  if (matches.length > 0) return matches[0];

  // Priority 7: Business Card
  const businessCard = cards.find((card) => card.type === "business");
  return businessCard || null;
}

// Test helper to create a card
function createCard(overrides: Partial<FlattenedCard>): FlattenedCard {
  return {
    id: "card-1",
    name: "Test Card",
    type: "employee",
    headline: "Test Headline",
    tagline: "Test Tagline",
    description: "Test Description",
    serviceIds: [],
    ctaText: "Book Now",
    isComplete: true,
    ...overrides,
  };
}

describe("Card Fallback Logic", () => {
  describe("Priority 1: Employee + Location + Service (Exact Match)", () => {
    it("should return exact match when all criteria match", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "exact-match",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
        createCard({
          id: "partial-match",
          employeeId: "emp-1",
          locationId: "loc-2",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("exact-match");
    });

    it("should match if card has one of multiple services", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "multi-service-card",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-1", "svc-2"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-2", "svc-3"]);
      expect(result?.id).toBe("multi-service-card");
    });
  });

  describe("Priority 2: Employee + Service (prefer location match)", () => {
    it("should fall back to employee + service when location differs", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "emp-service-match",
          employeeId: "emp-1",
          locationId: "loc-2",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("emp-service-match");
    });

    it("should prefer location match among employee + service matches", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "no-location-match",
          employeeId: "emp-1",
          locationId: "loc-2",
          serviceIds: ["svc-1"],
        }),
        createCard({
          id: "with-location-match",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("with-location-match");
    });

    it("should take first match if no location preference available", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "first-match",
          employeeId: "emp-1",
          locationId: "loc-2",
          serviceIds: ["svc-1"],
        }),
        createCard({
          id: "second-match",
          employeeId: "emp-1",
          locationId: "loc-3",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("first-match");
    });
  });

  describe("Priority 3: Employee + Location (prefer service match)", () => {
    it("should fall back to employee + location when services don't overlap", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "emp-loc-match",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-2"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("emp-loc-match");
    });

    it("should prefer service match among employee + location matches", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "no-service-match",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-2"],
        }),
        createCard({
          id: "with-service-match",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("with-service-match");
    });

    it("should take first match if no service preference available", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "first-emp-loc",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-2"],
        }),
        createCard({
          id: "second-emp-loc",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-3"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("first-emp-loc");
    });
  });

  describe("Priority 4: Service + Location", () => {
    it("should match service + location when no employee specified", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "service-loc-card",
          type: "service",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, undefined, "loc-1", ["svc-1"]);
      expect(result?.id).toBe("service-loc-card");
    });

    it("should fall back to service + location when employee doesn't match", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "service-loc-fallback",
          type: "service",
          employeeId: "emp-2",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("service-loc-fallback");
    });
  });

  describe("Priority 5: Service Only (prefer location match)", () => {
    it("should fall back to service-only card", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "service-only",
          type: "service",
          locationId: "loc-2",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("service-only");
    });

    it("should prefer location match among service-only cards", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "service-diff-location",
          type: "service",
          locationId: "loc-2",
          serviceIds: ["svc-1"],
        }),
        createCard({
          id: "service-same-location",
          type: "service",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("service-same-location");
    });
  });

  describe("Priority 6: Location Only", () => {
    it("should fall back to location-only card", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "location-only",
          type: "location",
          locationId: "loc-1",
          serviceIds: ["svc-2"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("location-only");
    });

    it("should take first location match", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "first-location",
          type: "location",
          locationId: "loc-1",
          serviceIds: [],
        }),
        createCard({
          id: "second-location",
          type: "location",
          locationId: "loc-1",
          serviceIds: [],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("first-location");
    });
  });

  describe("Priority 7: Business Card Fallback", () => {
    it("should fall back to business card as last resort", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "business-card",
          type: "business",
          locationId: "loc-2",
          serviceIds: ["svc-2"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("business-card");
    });

    it("should prefer any higher priority match over business card", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "business-card",
          type: "business",
          locationId: "loc-2",
          serviceIds: [],
        }),
        createCard({
          id: "location-card",
          type: "location",
          locationId: "loc-1",
          serviceIds: [],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("location-card");
    });
  });

  describe("Edge Cases", () => {
    it("should return null when no cards exist", () => {
      const result = findBestMatchingCard([], "emp-1", "loc-1", ["svc-1"]);
      expect(result).toBeNull();
    });

    it("should return null when no matching cards and no business card", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "unmatched-card",
          employeeId: "emp-2",
          locationId: "loc-2",
          serviceIds: ["svc-2"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result).toBeNull();
    });

    it("should handle undefined employeeId correctly", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "service-card",
          type: "service",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, undefined, "loc-1", ["svc-1"]);
      expect(result?.id).toBe("service-card");
    });

    it("should handle empty serviceIds array", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "location-card",
          type: "location",
          locationId: "loc-1",
          serviceIds: [],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", []);
      expect(result?.id).toBe("location-card");
    });
  });

  describe("Priority Order Verification", () => {
    it("should choose exact match over all other options", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "business",
          type: "business",
          serviceIds: [],
        }),
        createCard({
          id: "location",
          type: "location",
          locationId: "loc-1",
          serviceIds: [],
        }),
        createCard({
          id: "exact",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("exact");
    });

    it("should choose employee+service over service+location", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "service-location",
          type: "service",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
        createCard({
          id: "employee-service",
          employeeId: "emp-1",
          locationId: "loc-2",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("employee-service");
    });

    it("should choose employee+location over service+location", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "service-location",
          type: "service",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
        createCard({
          id: "employee-location",
          employeeId: "emp-1",
          locationId: "loc-1",
          serviceIds: ["svc-2"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("employee-location");
    });

    it("should choose service+location over service-only", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "service-only",
          type: "service",
          locationId: "loc-2",
          serviceIds: ["svc-1"],
        }),
        createCard({
          id: "service-location",
          type: "service",
          locationId: "loc-1",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("service-location");
    });

    it("should choose service-only over location-only", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "location-only",
          type: "location",
          locationId: "loc-1",
          serviceIds: [],
        }),
        createCard({
          id: "service-only",
          type: "service",
          locationId: "loc-2",
          serviceIds: ["svc-1"],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("service-only");
    });

    it("should choose location-only over business card", () => {
      const cards: FlattenedCard[] = [
        createCard({
          id: "business",
          type: "business",
          serviceIds: [],
        }),
        createCard({
          id: "location",
          type: "location",
          locationId: "loc-1",
          serviceIds: [],
        }),
      ];

      const result = findBestMatchingCard(cards, "emp-1", "loc-1", ["svc-1"]);
      expect(result?.id).toBe("location");
    });
  });
});
