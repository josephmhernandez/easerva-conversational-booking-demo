import {
  BOOKING_STRATEGIES,
  BookingStrategyComplexity,
  BookingStrategyId,
} from "@/app/types/businessTypes";

describe("Business Types", () => {
  describe("BOOKING_STRATEGIES", () => {
    it("contains all required booking strategies", () => {
      const expectedStrategies = ["simple", "location", "employee", "resource", "hybrid"];
      const actualStrategies = BOOKING_STRATEGIES.map((strategy) => strategy.id);

      expectedStrategies.forEach((expectedId) => {
        expect(actualStrategies).toContain(expectedId);
      });
    });

    it("has correct structure for each strategy", () => {
      BOOKING_STRATEGIES.forEach((strategy) => {
        expect(strategy).toHaveProperty("id");
        expect(strategy).toHaveProperty("name");
        expect(strategy).toHaveProperty("description");
        expect(strategy).toHaveProperty("bestFor");
        expect(strategy).toHaveProperty("complexity");
        expect(strategy).toHaveProperty("pros");

        expect(typeof strategy.id).toBe("string");
        expect(typeof strategy.name).toBe("string");
        expect(typeof strategy.description).toBe("string");
        expect(Array.isArray(strategy.bestFor)).toBe(true);
        expect(typeof strategy.complexity).toBe("string");
        expect(Array.isArray(strategy.pros)).toBe(true);
      });
    });

    it("has valid complexity values", () => {
      const validComplexities = ["Simple", "Medium", "Complex"];

      BOOKING_STRATEGIES.forEach((strategy) => {
        expect(validComplexities).toContain(strategy.complexity);
      });
    });

    it("has non-empty pros arrays", () => {
      BOOKING_STRATEGIES.forEach((strategy) => {
        expect(strategy.pros.length).toBeGreaterThan(0);
        strategy.pros.forEach((pro) => {
          expect(typeof pro).toBe("string");
          expect(pro.length).toBeGreaterThan(0);
        });
      });
    });

    it("has unique IDs", () => {
      const ids = BOOKING_STRATEGIES.map((strategy) => strategy.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("has descriptive names and descriptions", () => {
      BOOKING_STRATEGIES.forEach((strategy) => {
        expect(strategy.name.length).toBeGreaterThan(0);
        expect(strategy.description.length).toBeGreaterThan(10); // Should be descriptive
        expect(strategy.bestFor.length).toBeGreaterThan(0);
      });
    });
  });

  describe("BookingStrategyId type", () => {
    it("matches the strategy IDs in BOOKING_STRATEGIES", () => {
      const strategyIds = BOOKING_STRATEGIES.map((strategy) => strategy.id);
      const expectedIds: BookingStrategyId[] = [
        "simple",
        "location",
        "employee",
        "resource",
        "hybrid",
      ];

      expectedIds.forEach((expectedId) => {
        expect(strategyIds).toContain(expectedId);
      });
    });
  });

  describe("BookingStrategyComplexity type", () => {
    it("matches the complexity values in BOOKING_STRATEGIES", () => {
      const complexities = BOOKING_STRATEGIES.map((strategy) => strategy.complexity);
      const expectedComplexities: BookingStrategyComplexity[] = ["Simple", "Medium", "Complex"];

      complexities.forEach((complexity) => {
        expect(expectedComplexities).toContain(complexity);
      });
    });
  });

  describe("Strategy-specific properties", () => {
    it("has appropriate complexity for simple strategy", () => {
      const simpleStrategy = BOOKING_STRATEGIES.find((s) => s.id === "simple");
      expect(simpleStrategy).toBeDefined();
      expect(simpleStrategy?.complexity).toBe("Simple");
    });

    it("has appropriate complexity for location strategy", () => {
      const locationStrategy = BOOKING_STRATEGIES.find((s) => s.id === "location");
      expect(locationStrategy).toBeDefined();
      expect(locationStrategy?.complexity).toBe("Medium");
    });

    it("has appropriate complexity for employee strategy", () => {
      const employeeStrategy = BOOKING_STRATEGIES.find((s) => s.id === "employee");
      expect(employeeStrategy).toBeDefined();
      expect(employeeStrategy?.complexity).toBe("Medium");
    });

    it("has appropriate complexity for resource strategy", () => {
      const resourceStrategy = BOOKING_STRATEGIES.find((s) => s.id === "resource");
      expect(resourceStrategy).toBeDefined();
      expect(resourceStrategy?.complexity).toBe("Complex");
    });

    it("has appropriate complexity for hybrid strategy", () => {
      const hybridStrategy = BOOKING_STRATEGIES.find((s) => s.id === "hybrid");
      expect(hybridStrategy).toBeDefined();
      expect(hybridStrategy?.complexity).toBe("Complex");
    });
  });

  describe("Strategy descriptions and use cases", () => {
    it("has meaningful descriptions for each strategy", () => {
      BOOKING_STRATEGIES.forEach((strategy) => {
        expect(strategy.description.length).toBeGreaterThan(10);
      });
    });

    it("has relevant bestFor descriptions", () => {
      BOOKING_STRATEGIES.forEach((strategy) => {
        expect(Array.isArray(strategy.bestFor)).toBe(true);
        expect(strategy.bestFor.length).toBeGreaterThan(0);
        strategy.bestFor.forEach((bestFor) => {
          expect(typeof bestFor).toBe("string");
          expect(bestFor.length).toBeGreaterThan(0);
        });
      });
    });

    it("has practical pros for each strategy", () => {
      BOOKING_STRATEGIES.forEach((strategy) => {
        expect(strategy.pros.length).toBeGreaterThanOrEqual(2);
        strategy.pros.forEach((pro) => {
          expect(typeof pro).toBe("string");
          expect(pro.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
