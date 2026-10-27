/**
 * Address Validation Tests
 *
 * Tests for Google API address validation functionality
 */

import BusinessLocationPage from "@/app/business/onboarding/business-location/page";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

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

// Mock the router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: "/",
  route: "/",
  query: {},
  asPath: "/",
  basePath: "",
  locale: "en",
  locales: ["en"],
  defaultLocale: "en",
  isLocaleDomain: false,
  isReady: true,
  isPreview: false,
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
};

// Mock fetch globally
global.fetch = jest.fn();

describe("Address Validation", () => {
  // Extend timeout for potentially slow async flows
  jest.setTimeout(30000);
  beforeEach(() => {
    // Mock auth session - return authenticated user by default
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "test-user-id",
            email: "test@example.com",
          },
        },
      },
      error: null,
    });

    // Reset auth state change mock
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    });
    mockUnsubscribe.mockClear();

    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Setup default mock fetch responses
    (global.fetch as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ ok: false });
    });
  });

  describe("Successful Address Validation", () => {
    it("validates address and shows suggested address", async () => {
      const user = userEvent.setup();

      // Mock successful address validation response
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("address-validation")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                addressLines: ["123 Main St"],
                locality: "New York",
                administrativeArea: "NY",
                postalCode: "10001-1234",
                regionCode: "US",
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Fill in address fields
      const addressInput = screen.getByPlaceholderText("123 Main Street");
      const cityInput = screen.getByPlaceholderText("New York");

      await user.type(addressInput, "123 Main St");
      await user.type(cityInput, "New York");

      // Click validate address button
      const validateButton = screen.getByText("Validate Address");
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText("Suggested standardized address:")).toBeInTheDocument();
        expect(screen.getByText("123 Main St")).toBeInTheDocument();
        expect(screen.getByText("New York, NY 10001-1234")).toBeInTheDocument();
      });
    });

    it("allows accepting suggested address", async () => {
      const user = userEvent.setup();

      // Mock successful address validation response
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("address-validation")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                addressLines: ["123 Main St"],
                locality: "New York",
                administrativeArea: "NY",
                postalCode: "10001-1234",
                regionCode: "US",
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Fill in address fields
      const addressInput = screen.getByPlaceholderText("123 Main Street");
      const cityInput = screen.getByPlaceholderText("New York");

      await user.type(addressInput, "123 Main St");
      await user.type(cityInput, "New York");

      // Click validate address button
      const validateButton = screen.getByText("Validate Address");
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText("Use Suggested")).toBeInTheDocument();
      });

      // Accept suggested address
      const acceptButton = screen.getByText("Use Suggested");
      await user.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByText("Address verified")).toBeInTheDocument();
        expect(screen.queryByText("Suggested standardized address:")).not.toBeInTheDocument();
      });
    });

    it("allows keeping original address", async () => {
      const user = userEvent.setup();

      // Mock successful address validation response
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("address-validation")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                addressLines: ["123 Main St"],
                locality: "New York",
                administrativeArea: "NY",
                postalCode: "10001-1234",
                regionCode: "US",
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Fill in address fields
      const addressInput = screen.getByPlaceholderText("123 Main Street");
      const cityInput = screen.getByPlaceholderText("New York");

      await user.type(addressInput, "123 Main St");
      await user.type(cityInput, "New York");

      // Click validate address button
      const validateButton = screen.getByText("Validate Address");
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText("Keep Original")).toBeInTheDocument();
      });

      // Keep original address
      const keepOriginalButton = screen.getByText("Keep Original");
      await user.click(keepOriginalButton);

      await waitFor(() => {
        expect(screen.getByText("Address verified")).toBeInTheDocument();
        expect(screen.queryByText("Suggested standardized address:")).not.toBeInTheDocument();
      });
    });

    it("formats ZIP+4 correctly", async () => {
      const user = userEvent.setup();

      // Mock successful address validation response with ZIP+4
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("address-validation")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                addressLines: ["123 Main St"],
                locality: "New York",
                administrativeArea: "NY",
                postalCode: "100011234", // ZIP+4 without dash
                regionCode: "US",
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Fill in address fields
      const addressInput = screen.getByPlaceholderText("123 Main Street");
      const cityInput = screen.getByPlaceholderText("New York");

      await user.type(addressInput, "123 Main St");
      await user.type(cityInput, "New York");

      // Click validate address button
      const validateButton = screen.getByText("Validate Address");
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText("New York, NY 10001-1234")).toBeInTheDocument();
      });
    });

    it("handles address with line 2", async () => {
      const user = userEvent.setup();

      // Mock successful address validation response with line 2
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("address-validation")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                addressLines: ["123 Main St", "Suite 100"],
                locality: "New York",
                administrativeArea: "NY",
                postalCode: "10001",
                regionCode: "US",
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Fill in address fields
      const addressInput = screen.getByPlaceholderText("123 Main Street");
      const cityInput = screen.getByPlaceholderText("New York");

      await user.type(addressInput, "123 Main St");
      await user.type(cityInput, "New York");

      // Click validate address button
      const validateButton = screen.getByText("Validate Address");
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText("123 Main St")).toBeInTheDocument();
        expect(screen.getByText("Suite 100")).toBeInTheDocument();
        expect(screen.getByText("New York, NY 10001")).toBeInTheDocument();
      });
    });
  });

  describe("Address Validation Errors", () => {
    it("handles validation API errors", async () => {
      const user = userEvent.setup();

      // Mock failed address validation
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("address-validation")) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Fill in address fields
      const addressInput = screen.getByPlaceholderText("123 Main Street");
      const cityInput = screen.getByPlaceholderText("New York");

      await user.type(addressInput, "123 Main St");
      await user.type(cityInput, "New York");

      // Click validate address button
      const validateButton = screen.getByText("Validate Address");
      await user.click(validateButton);

      await waitFor(() => {
        expect(
          screen.getByText("Address validation failed. Please try again.")
        ).toBeInTheDocument();
      });
    });

    it("handles invalid API response", async () => {
      const user = userEvent.setup();

      // Mock invalid API response
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("address-validation")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                invalidResponse: true,
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Fill in address fields
      const addressInput = screen.getByPlaceholderText("123 Main Street");
      const cityInput = screen.getByPlaceholderText("New York");

      await user.type(addressInput, "123 Main St");
      await user.type(cityInput, "New York");

      // Click validate address button
      const validateButton = screen.getByText("Validate Address");
      await user.click(validateButton);

      await waitFor(() => {
        expect(
          screen.getByText("Address validation failed. Please try again.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Validation Button States", () => {
    it("disables validate button when required fields are empty", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Validate button should be disabled
      const validateButton = screen.getByText("Validate Address");
      expect(validateButton).toBeDisabled();
    });

    it("enables validate button when required fields are filled", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Fill in required fields
      const addressInput = screen.getByPlaceholderText("123 Main Street");
      const cityInput = screen.getByPlaceholderText("New York");

      await user.type(addressInput, "123 Main St");
      await user.type(cityInput, "New York");

      // Validate button should be enabled
      const validateButton = screen.getByText("Validate Address");
      expect(validateButton).not.toBeDisabled();
    });
  });

  describe("Address Status Display", () => {
    it("shows unverified status initially", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Should show unverified status
      expect(screen.getByText("Address not verified")).toBeInTheDocument();
    });

    it("shows verified status after successful validation", async () => {
      const user = userEvent.setup();

      // Mock successful address validation response
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("address-validation")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                addressLines: ["123 Main St"],
                locality: "New York",
                administrativeArea: "NY",
                postalCode: "10001",
                regionCode: "US",
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Physical locations (customers come to us)")).toBeInTheDocument();
      });

      // Select physical locations
      const physicalCheckbox = screen.getByLabelText("Physical locations (customers come to us)");
      await user.click(physicalCheckbox);

      // Fill in address fields
      const addressInput = screen.getByPlaceholderText("123 Main Street");
      const cityInput = screen.getByPlaceholderText("New York");

      await user.type(addressInput, "123 Main St");
      await user.type(cityInput, "New York");

      // Click validate address button
      const validateButton = screen.getByText("Validate Address");
      await user.click(validateButton);

      // Accept suggested address
      await waitFor(() => {
        expect(screen.getByText("Use Suggested")).toBeInTheDocument();
      });

      const acceptButton = screen.getByText("Use Suggested");
      await user.click(acceptButton);

      // Should show verified status
      await waitFor(() => {
        expect(screen.getByText("Address verified")).toBeInTheDocument();
      });
    });
  });
});
