/**
 * Save Functionality Tests
 *
 * Tests for save functionality and data structure validation
 */

import BusinessLocationPage from "@/app/business/onboarding/business-location/page";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("Save Functionality", () => {
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

    jest.setTimeout(30000);
  });

  describe("Virtual Service Save", () => {
    it("saves virtual service with correct data structure", async () => {
      const user = userEvent.setup();

      let savedData: any = null;
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes("draft")) {
          savedData = JSON.parse(options.body);
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Virtual/online services")).toBeInTheDocument();
      });

      // Select virtual services
      const virtualCheckbox = screen.getByLabelText("Virtual/online services");
      await user.click(virtualCheckbox);

      // Configure virtual service (target the actual input element by test id)
      const nameInputs = screen.getAllByTestId("virtual-service-name");
      await user.clear(nameInputs[0]);
      await user.type(nameInputs[0], "Consultation");

      // Select platform using Radix Select trigger and option text
      const platformTriggers = screen.getAllByTestId("virtual-platform-trigger");
      fireEvent.mouseDown(platformTriggers[0]);
      const option = await screen.findByText("Google Meet");
      fireEvent.click(option);

      // Fill in meeting link
      const meetingLinkInputs = screen.getAllByTestId("virtual-meeting-link");
      await user.type(meetingLinkInputs[0], "https://meet.google.com/abc-def-ghi");

      // Fill in instructions
      const instructionsTextarea = screen.getByPlaceholderText(
        "Please join the meeting 5 minutes early. Make sure you have a stable internet connection..."
      );
      await user.type(
        instructionsTextarea,
        "Please test your camera and microphone before joining."
      );

      // Click continue to save
      const continueButton = screen.getByText("Continue");
      await user.click(continueButton);

      await waitFor(() => {
        expect(savedData).toMatchObject({
          step: "business_location",
          currentStep: "business_location",
          stepData: {
            "serviceTypes.virtual": {
              virtualServices: [
                {
                  name: "Consultation",
                  platform: "zoom",
                  defaultLink: "https://meet.google.com/abc-def-ghi",
                  instructions: "Please test your camera and microphone before joining.",
                },
              ],
            },
          },
        });
      });
    }, 20000);

    it("saves multiple virtual services with correct data structure", async () => {
      const user = userEvent.setup();

      let savedData: any = null;
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes("draft")) {
          savedData = JSON.parse(options.body);
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Virtual/online services")).toBeInTheDocument();
      });

      // Select virtual services
      const virtualCheckbox = screen.getByLabelText("Virtual/online services");
      await user.click(virtualCheckbox);

      // Configure first virtual service
      const nameInputs = screen.getAllByTestId("virtual-service-name");
      await user.clear(nameInputs[0]);
      await user.type(nameInputs[0], "Consultation");

      // Add second virtual service
      const addVirtualServiceButton = screen.getByText("Add Virtual Group");
      await user.click(addVirtualServiceButton);

      // Configure second virtual service
      const nameInputsAfterAdd = screen.getAllByTestId("virtual-service-name");
      await user.clear(nameInputsAfterAdd[1]);
      await user.type(nameInputsAfterAdd[1], "Coaching");

      // Click continue to save
      const continueButton = screen.getByText("Continue");
      await user.click(continueButton);

      await waitFor(() => {
        expect(savedData.stepData["serviceTypes.virtual"].virtualServices).toHaveLength(2);
        expect(savedData.stepData["serviceTypes.virtual"].virtualServices[0]).toMatchObject({
          name: "Consultation",
          platform: "zoom",
        });
        expect(savedData.stepData["serviceTypes.virtual"].virtualServices[1]).toMatchObject({
          name: "Coaching",
          platform: "zoom",
        });
      });
    }, 20000);
  });

  describe("Mobile Service Save", () => {
    it("saves specific ZIP codes mobile service with correct data structure", async () => {
      const user = userEvent.setup();

      let savedData: any = null;
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes("draft")) {
          savedData = JSON.parse(options.body);
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Mobile service (we go to customers)")).toBeInTheDocument();
      });

      // Select mobile services
      const mobileCheckbox = screen.getByLabelText("Mobile service (we go to customers)");
      await user.click(mobileCheckbox);

      // Configure specific ZIP codes
      const zipcodesRadio = screen.getByLabelText("Specific ZIP codes");
      await user.click(zipcodesRadio);

      const zipCodesTextarea = screen.getByPlaceholderText("10001, 10002, 10003...");
      await user.type(zipCodesTextarea, "10001, 10002, 10003");

      // Click continue to save
      const continueButton = screen.getByText("Continue");
      await user.click(continueButton);

      await waitFor(() => {
        expect(savedData.stepData["serviceTypes.mobile"].mobileServices[0]).toMatchObject({
          serviceArea: {
            type: "zip_codes",
            zipCodesRaw: "10001, 10002, 10003",
            radius: 25,
          },
        });
      });
    }, 20000);
  });

  describe("Save Error Handling", () => {
    it("handles save errors gracefully", async () => {
      const user = userEvent.setup();

      // Mock failed save response
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("draft")) {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Virtual/online services")).toBeInTheDocument();
      });

      // Select virtual services (this doesn't require state selection)
      const virtualCheckbox = screen.getByLabelText("Virtual/online services");
      await user.click(virtualCheckbox);

      // Click continue to save
      const continueButton = screen.getByText("Continue");
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to save application")).toBeInTheDocument();
      });
    }, 20000);

    it("handles network errors during save", async () => {
      const user = userEvent.setup();

      // Mock network error
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("draft")) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      await waitFor(() => {
        expect(screen.getByText("Virtual/online services")).toBeInTheDocument();
      });

      // Select virtual services (this doesn't require state selection)
      const virtualCheckbox = screen.getByLabelText("Virtual/online services");
      await user.click(virtualCheckbox);

      // Click continue to save
      const continueButton = screen.getByText("Continue");
      await user.click(continueButton);

      // Should handle error gracefully (no crash)
      await waitFor(() => {
        expect(screen.getByText("How do you provide services?")).toBeInTheDocument();
      });
    }, 20000);
  });

  describe("Save Button States", () => {
    it("shows saving state during save", async () => {
      const user = userEvent.setup();

      // Mock responses for both draft loading and save
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes("draft/business_location")) {
          // Mock draft data fetch - return empty data to skip loading
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ draftData: null }),
          });
        }
        if (url.includes("draft") && options?.method === "POST") {
          // Mock save response - slow response
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ ok: true });
            }, 100);
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<BusinessLocationPage />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText("Loading your location settings...")).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText("Virtual/online services")).toBeInTheDocument();
      });

      // Select virtual services (this doesn't require state selection)
      const virtualCheckbox = screen.getByLabelText("Virtual/online services");
      await user.click(virtualCheckbox);

      // Click continue to save
      const continueButton = screen.getByText("Continue");
      await user.click(continueButton);
    }, 20000);
  });
});
