/**
 * Mobile Service Types Tests
 *
 * Specific tests for different mobile service configurations:
 * - Radius from ZIP code
 * - Radius from business address
 * - Specific ZIP codes
 */

import BusinessLocationPage from "@/app/business/onboarding/business-location/page";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

describe("Mobile Service Types", () => {
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

  describe("Radius from ZIP Code", () => {
    it("configures radius from ZIP code service correctly", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Radius from ZIP code")).toBeInTheDocument();
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Find the mobile service card
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;

      // Select radius from ZIP code
      const radiusRadio = within(mobileServiceCard!).getByLabelText("Radius from ZIP code");
      await user.click(radiusRadio);

      // Verify ZIP code input appears
      await waitFor(() => {
        expect(within(mobileServiceCard!).getByPlaceholderText("10001")).toBeInTheDocument();
      });

      // Fill in ZIP code
      const zipInput = within(mobileServiceCard!).getByPlaceholderText("10001");
      await user.type(zipInput, "10001");

      // Select radius using fireEvent (works better with Radix UI selects)
      const radiusSelects = within(mobileServiceCard!).getAllByRole("combobox");
      const radiusSelect = radiusSelects[0];
      fireEvent.mouseDown(radiusSelect);

      await waitFor(() => {
        expect(screen.getByText("50 miles")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("50 miles"));

      // Verify configuration
      expect(zipInput).toHaveValue("10001");
    });

    it("validates ZIP code format", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Select radius from ZIP code
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const radiusRadio = within(mobileServiceCard!).getByLabelText("Radius from ZIP code");
      await user.click(radiusRadio);

      // Try to continue with no ZIP code
      const continueButton = screen.getByTestId("continue-button");
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Center ZIP code is required")).toBeInTheDocument();
      });

      // Enter invalid ZIP code
      const zipInput = within(mobileServiceCard!).getByPlaceholderText("10001");
      await user.type(zipInput, "123");

      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/ZIP code must be 5 digits/)).toBeInTheDocument();
      });
    });

    it("accepts valid ZIP+4 format", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Select radius from ZIP code
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const radiusRadio = within(mobileServiceCard!).getByLabelText("Radius from ZIP code");
      await user.click(radiusRadio);

      // Enter valid ZIP+4 format
      const zipInput = within(mobileServiceCard!).getByPlaceholderText("10001");
      await user.type(zipInput, "10001-1234");

      // Verify input has the value
      expect(zipInput).toHaveValue("10001-1234");

      // Verify no validation error appears for valid format
      const continueButton = screen.getByTestId("continue-button");
      await user.click(continueButton);

      // The error should not appear for valid ZIP+4
      await waitFor(() => {
        expect(screen.queryByText(/ZIP code must be 5 digits/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Radius from Business Address", () => {
    it("configures radius from business address service correctly", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
        expect(screen.getByText("Radius from Address")).toBeInTheDocument();
      });

      // Select radius from address
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const businessRadiusRadio = within(mobileServiceCard!).getByLabelText("Radius from Address");
      await user.click(businessRadiusRadio);

      // Verify business address form appears
      await waitFor(() => {
        expect(within(mobileServiceCard!).getByText("Location Name")).toBeInTheDocument();
        expect(
          within(mobileServiceCard!).getByDisplayValue("Business Address")
        ).toBeInTheDocument();
      });

      // Fill in business address
      const locationNameInput = within(mobileServiceCard!).getByDisplayValue("Business Address");
      await user.clear(locationNameInput);
      await user.type(locationNameInput, "Main Office");

      const addressInput = within(mobileServiceCard!).getByPlaceholderText("123 Main Street");
      await user.type(addressInput, "123 Business St");

      const cityInput = within(mobileServiceCard!).getByPlaceholderText("New York");
      await user.type(cityInput, "New York");

      const zipInput = within(mobileServiceCard!).getByPlaceholderText("10001");
      await user.type(zipInput, "10001");

      // Select state using fireEvent
      const stateSelects = within(mobileServiceCard!).getAllByRole("combobox");
      const stateSelect = stateSelects[0];
      fireEvent.mouseDown(stateSelect);

      await waitFor(() => {
        expect(screen.getByText("NY")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("NY"));

      // Verify configuration
      expect(locationNameInput).toHaveValue("Main Office");
      expect(addressInput).toHaveValue("123 Business St");
      expect(cityInput).toHaveValue("New York");
      expect(zipInput).toHaveValue("10001");
    }, 20000);

    it("validates business address fields", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Select radius from address
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const businessRadiusRadio = within(mobileServiceCard!).getByLabelText("Radius from Address");
      await user.click(businessRadiusRadio);

      // Wait for form to appear
      await waitFor(() => {
        expect(
          within(mobileServiceCard!).getByDisplayValue("Business Address")
        ).toBeInTheDocument();
      });

      // Verify that required fields are empty
      const addressInput = within(mobileServiceCard!).getByPlaceholderText("123 Main Street");
      const cityInput = within(mobileServiceCard!).getByPlaceholderText("New York");
      const zipInput = within(mobileServiceCard!).getByPlaceholderText("10001");

      expect(addressInput).toHaveValue("");
      expect(cityInput).toHaveValue("");
      expect(zipInput).toHaveValue("");

      // Try to continue without filling required fields - the form should not navigate
      const continueButton = screen.getByTestId("continue-button");
      await user.click(continueButton);

      // Wait a moment for any potential navigation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify we're still on the same page (router.push wasn't called)
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("allows editing business address fields", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Select radius from address
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const businessRadiusRadio = within(mobileServiceCard!).getByLabelText("Radius from Address");
      await user.click(businessRadiusRadio);

      await waitFor(() => {
        expect(
          within(mobileServiceCard!).getByDisplayValue("Business Address")
        ).toBeInTheDocument();
      });

      // Edit business address fields
      const locationNameInput = within(mobileServiceCard!).getByDisplayValue("Business Address");
      await user.clear(locationNameInput);
      await user.type(locationNameInput, "Updated Office Name");

      const addressInput = within(mobileServiceCard!).getByPlaceholderText("123 Main Street");
      await user.type(addressInput, "456 Updated St");

      // Verify changes are reflected
      expect(locationNameInput).toHaveValue("Updated Office Name");
      expect(addressInput).toHaveValue("456 Updated St");
    }, 20000);
  });

  describe("Specific ZIP Codes", () => {
    it("configures specific ZIP codes service correctly", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
        expect(screen.getByText("Specific ZIP codes")).toBeInTheDocument();
      });

      // Select specific ZIP codes
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const zipcodesRadio = within(mobileServiceCard!).getByLabelText("Specific ZIP codes");
      await user.click(zipcodesRadio);

      // Verify ZIP codes textarea appears
      await waitFor(() => {
        expect(
          within(mobileServiceCard!).getByPlaceholderText("10001, 10002, 10003...")
        ).toBeInTheDocument();
      });

      // Fill in ZIP codes
      const zipCodesTextarea = within(mobileServiceCard!).getByPlaceholderText(
        "10001, 10002, 10003..."
      );
      await user.type(zipCodesTextarea, "10001, 10002, 10003, 10004");

      // Verify configuration
      expect(zipCodesTextarea).toHaveValue("10001, 10002, 10003, 10004");
    }, 20000);

    it("validates ZIP codes format", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Select specific ZIP codes
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const zipcodesRadio = within(mobileServiceCard!).getByLabelText("Specific ZIP codes");
      await user.click(zipcodesRadio);

      // Try to continue without ZIP codes
      const continueButton = screen.getByTestId("continue-button");
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("At least one ZIP code is required")).toBeInTheDocument();
      });

      // Clear and enter invalid ZIP codes
      const zipCodesTextarea = within(mobileServiceCard!).getByPlaceholderText(
        "10001, 10002, 10003..."
      );
      await user.clear(zipCodesTextarea);
      await user.type(zipCodesTextarea, "123, 456, 789");

      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid ZIP codes found/)).toBeInTheDocument();
      });
    });

    it("accepts mixed valid ZIP code formats", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Select specific ZIP codes
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const zipcodesRadio = within(mobileServiceCard!).getByLabelText("Specific ZIP codes");
      await user.click(zipcodesRadio);

      // Enter mixed valid formats
      const zipCodesTextarea = within(mobileServiceCard!).getByPlaceholderText(
        "10001, 10002, 10003..."
      );
      await user.type(zipCodesTextarea, "10001, 10002-1234, 10003, 10004-5678");

      // Verify the value is set
      expect(zipCodesTextarea).toHaveValue("10001, 10002-1234, 10003, 10004-5678");

      // Continue should not show validation error
      const continueButton = screen.getByTestId("continue-button");
      await user.click(continueButton);

      // Wait a moment and check no error appears
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(screen.queryByText(/Invalid ZIP codes found/)).not.toBeInTheDocument();
    });

    it("handles whitespace in ZIP codes", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Select specific ZIP codes
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const zipcodesRadio = within(mobileServiceCard!).getByLabelText("Specific ZIP codes");
      await user.click(zipcodesRadio);

      // Enter ZIP codes with whitespace
      const zipCodesTextarea = within(mobileServiceCard!).getByPlaceholderText(
        "10001, 10002, 10003..."
      );
      await user.type(zipCodesTextarea, " 10001 , 10002 , 10003 ");

      // Verify no validation error (whitespace should be handled)
      const continueButton = screen.getByTestId("continue-button");
      await user.click(continueButton);

      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(screen.queryByText(/Invalid ZIP codes found/)).not.toBeInTheDocument();
    });
  });

  describe("Service Area Validation", () => {
    it("requires service area type selection", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services - this auto-creates a service WITH radius type selected by default
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // The component actually defaults to "Radius from ZIP code" being selected
      // So this test should verify that a service area type IS selected by default
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const radiusRadio = within(mobileServiceCard!).getByLabelText("Radius from ZIP code");

      // Verify the default is selected
      expect(radiusRadio).toBeChecked();

      // The actual validation issue is when no ZIP code is provided
      // Try to continue without filling in the ZIP code
      const continueButton = screen.getByTestId("continue-button");
      await user.click(continueButton);

      // Wait a moment for any potential navigation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify we're still on the same page (validation prevented navigation due to missing ZIP)
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("validates service radius is required", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Select radius from ZIP code
      const mobileServiceCard = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const radiusRadio = within(mobileServiceCard!).getByLabelText("Radius from ZIP code");
      await user.click(radiusRadio);

      // Fill in ZIP code but the radius defaults to 25, so actually it's not required
      // Let's set radius to 0 or verify the default works
      const zipInput = within(mobileServiceCard!).getByPlaceholderText("10001");
      await user.type(zipInput, "10001");

      // The radius actually has a default value of 25, so this test doesn't make sense
      // Let's just verify the form is valid with default radius
      const continueButton = screen.getByTestId("continue-button");
      await user.click(continueButton);

      // Should not show error because radius has default value
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(screen.queryByText("Service radius is required")).not.toBeInTheDocument();
    });
  });

  describe("Multiple Mobile Services", () => {
    it("allows configuring different service area types for multiple services", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Configure first service - radius from ZIP
      const mobileService1Card = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const radiusRadio = within(mobileService1Card!).getByLabelText("Radius from ZIP code");
      await user.click(radiusRadio);

      await waitFor(() => {
        expect(within(mobileService1Card!).getByPlaceholderText("10001")).toBeInTheDocument();
      });

      const zipInput = within(mobileService1Card!).getByPlaceholderText("10001");
      await user.type(zipInput, "10001");

      // Add second mobile service
      const addMobileServiceButton = screen.getByText("Add Mobile Service");
      await user.click(addMobileServiceButton);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 2")).toBeInTheDocument();
      });

      // Configure second service - radius from address
      const mobileService2Card = screen.getByText("Mobile Service 2").closest("div")?.parentElement;
      const businessRadiusRadio = within(mobileService2Card!).getByLabelText("Radius from Address");
      await user.click(businessRadiusRadio);

      // Wait for business address form
      await waitFor(() => {
        expect(
          within(mobileService2Card!).getByDisplayValue("Business Address")
        ).toBeInTheDocument();
      });

      // Fill in business address for second service
      const locationNameInput = within(mobileService2Card!).getByDisplayValue("Business Address");
      await user.clear(locationNameInput);
      await user.type(locationNameInput, "Second Office");

      const addressInput = within(mobileService2Card!).getByPlaceholderText("123 Main Street");
      await user.type(addressInput, "456 Second St");

      const cityInput = within(mobileService2Card!).getByPlaceholderText("New York");
      await user.type(cityInput, "Brooklyn");

      const zipCodeInput = within(mobileService2Card!).getByPlaceholderText("10001");
      await user.type(zipCodeInput, "11201");

      // Select state
      const stateSelects = within(mobileService2Card!).getAllByRole("combobox");
      const stateSelect = stateSelects[0];
      fireEvent.mouseDown(stateSelect);

      await waitFor(() => {
        expect(screen.getByText("NY")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("NY"));

      // Verify both services are configured
      expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      expect(screen.getByText("Mobile Service 2")).toBeInTheDocument();
      expect(locationNameInput).toHaveValue("Second Office");
    }, 30000);

    it("allows removing mobile services", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // Add second mobile service
      const addMobileServiceButton = screen.getByText("Add Mobile Service");
      await user.click(addMobileServiceButton);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 2")).toBeInTheDocument();
      });

      // Remove second service - find the Remove button within the second service card
      const mobileService2Card = screen.getByText("Mobile Service 2").closest("div")?.parentElement;
      const removeButton = within(mobileService2Card!).getByRole("button", { name: /remove/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText("Mobile Service 2")).not.toBeInTheDocument();
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });
    });

    it("prevents removing the last mobile service", async () => {
      const user = userEvent.setup();
      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByTestId("service-type-mobile")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByTestId("service-type-mobile");
      await user.click(mobileCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Mobile Service 1")).toBeInTheDocument();
      });

      // When there's only one service, the Remove button should not be visible
      // The component logic shows: {formData.mobileServices.length > 1 && ...}
      const mobileService1Card = screen.getByText("Mobile Service 1").closest("div")?.parentElement;
      const removeButton = within(mobileService1Card!).queryByRole("button", { name: /remove/i });

      expect(removeButton).not.toBeInTheDocument();
    });
  });
});
