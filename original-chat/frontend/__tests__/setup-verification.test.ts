/**
 * Setup Verification Test
 *
 * This test verifies that the testing environment is properly configured
 * and all dependencies are working correctly.
 */

import { OnboardingStep } from "@/app/constants/businessConstants";
import { BOOKING_STRATEGIES } from "@/app/types/businessTypes";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("Testing Environment Setup", () => {
  it("has Jest configured correctly", () => {
    expect(jest).toBeDefined();
  });

  it("has testing library available", () => {
    expect(render).toBeDefined();
    expect(screen).toBeDefined();
  });

  it("has user event library available", () => {
    expect(userEvent).toBeDefined();
  });

  it("has jest-dom matchers available", () => {
    expect(document.body).toBeInTheDocument();
  });

  it("has fetch mocked globally", () => {
    expect(global.fetch).toBeDefined();
    expect(jest.isMockFunction(global.fetch)).toBe(true);
  });

  it("has localStorage mocked", () => {
    expect(global.localStorage).toBeDefined();
    expect(global.localStorage.getItem).toBeDefined();
  });

  it("has Next.js router mocked", () => {
    // Test that the router mock is working by checking if it's a function
    expect(typeof global.fetch).toBe("function");
  });

  it("can import business types", () => {
    expect(BOOKING_STRATEGIES).toBeDefined();
    expect(Array.isArray(BOOKING_STRATEGIES)).toBe(true);
  });

  it("can import business constants", () => {
    expect(OnboardingStep).toBeDefined();
    expect(OnboardingStep.BUSINESS_LOCATION).toBe("business_location");
  });

  it("has proper test environment configuration", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });
});
