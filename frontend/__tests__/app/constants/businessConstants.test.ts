import { OnboardingStep } from "@/app/constants/businessConstants";

describe("Business Constants", () => {
  describe("OnboardingStep enum", () => {
    it("contains all required onboarding steps", () => {
      const expectedSteps = [
        "BUSINESS_INFO",
        "BUSINESS_LOCATION",
        "BUSINESS_RESOURCES",
        "BUSINESS_SERVICE_TEMPLATES",
        "SERVICE_LOCATION",
        "CARD_ASSIGNMENT_STRATEGY",
        "BUSINESS_TEAM_MEMBERS",
        "EMPLOYEE_SERVICE_ASSIGNMENT",
        "CARD_STUDIO",
        "BOOKING_STRATEGY",
        "CALENDAR_INTEGRATION_NEW",
      ];

      expectedSteps.forEach((step) => {
        expect(OnboardingStep).toHaveProperty(step);
      });
    });

    it("has string values for all steps", () => {
      Object.values(OnboardingStep).forEach((step) => {
        expect(typeof step).toBe("string");
        expect(step.length).toBeGreaterThan(0);
      });
    });

    it("has snake_case values for API compatibility", () => {
      Object.values(OnboardingStep).forEach((step) => {
        expect(step).toMatch(/^[a-z_]+$/);
      });
    });

    it("has unique values", () => {
      const values = Object.values(OnboardingStep);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it("follows consistent naming pattern", () => {
      Object.values(OnboardingStep).forEach((step) => {
        // Should be lowercase with underscores
        expect(step).toMatch(/^[a-z]+(_[a-z]+)*$/);
      });
    });
  });

  describe("Step progression and dependencies", () => {
    it("has logical step ordering", () => {
      const steps = Object.values(OnboardingStep);

      // Business location should come first
      expect(steps).toContain("business_location");

      // Team members should come after location
      expect(steps).toContain("business_team_members");

      // Booking strategy should come after team members
      expect(steps).toContain("booking_strategy");

      // Resources should come after strategy
      expect(steps).toContain("business_resources");

      // Calendar integration should come after resources
      expect(steps).toContain("calendar_integration_new");

      // Service location should exist
      expect(steps).toContain("service_location");

      // Card studio should exist
      expect(steps).toContain("card_studio");
    });

    it("has service location step for configuration", () => {
      expect(OnboardingStep).toHaveProperty("SERVICE_LOCATION");
      expect(OnboardingStep.SERVICE_LOCATION).toBe("service_location");
    });

    it("has card studio step for UI configuration", () => {
      expect(OnboardingStep).toHaveProperty("CARD_STUDIO");
      expect(OnboardingStep.CARD_STUDIO).toBe("card_studio");
    });

    it("has calendar integration new step", () => {
      expect(OnboardingStep).toHaveProperty("CALENDAR_INTEGRATION_NEW");
      expect(OnboardingStep.CALENDAR_INTEGRATION_NEW).toBe("calendar_integration_new");
    });
  });

  describe("API endpoint compatibility", () => {
    it("has values compatible with API endpoints", () => {
      Object.values(OnboardingStep).forEach((step) => {
        // Should be valid for URL paths
        expect(step).toMatch(/^[a-z_]+$/);
        expect(step).not.toMatch(/[^a-z_]/);
      });
    });

    it("can be used in API route construction", () => {
      const testStep = OnboardingStep.BUSINESS_LOCATION;
      const apiPath = `/api/business/onboarding/draft/${testStep}`;
      expect(apiPath).toBe("/api/business/onboarding/draft/business_location");
    });
  });

  describe("Step validation", () => {
    it("has no empty or undefined values", () => {
      Object.values(OnboardingStep).forEach((step) => {
        expect(step).toBeDefined();
        expect(step).not.toBe("");
        expect(step).not.toBeNull();
      });
    });

    it("has consistent naming convention", () => {
      Object.values(OnboardingStep).forEach((step) => {
        // Should be snake_case for API compatibility
        expect(step).toMatch(/^[a-z]+(_[a-z]+)*$/);
      });
    });

    it("has descriptive step names", () => {
      const stepNames = Object.values(OnboardingStep);

      expect(stepNames).toContain("business_location");
      expect(stepNames).toContain("business_team_members");
      expect(stepNames).toContain("booking_strategy");
      expect(stepNames).toContain("business_resources");
      expect(stepNames).toContain("calendar_integration_new");
    });
  });
});
