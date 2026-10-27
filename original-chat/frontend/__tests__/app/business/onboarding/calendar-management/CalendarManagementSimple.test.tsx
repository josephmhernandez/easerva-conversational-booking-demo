import CalendarManagementPage from "@/app/business/onboarding/calendar-management/page";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  // Provide a minimal implementation of useSearchParams used by the page
  useSearchParams: jest.fn(() => ({
    get: () => null, // no error/message query params by default in tests
  })),
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

// Mock fetch globally
global.fetch = jest.fn();

describe("Calendar Management Simple Tests", () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
    mockPush.mockClear();

    // Mock auth session - return authenticated user by default
    // You can override this in individual tests if needed
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
  });

  it("renders the calendar management page", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        draft: {
          draft_data: {
            booking_strategy: {
              selectedStrategy: "location",
              employees: [],
              locations: [],
              resources: [],
            },
            calendar_management: {
              cronofyCalendars: [],
              calendarAssignments: [],
              cronofyElementToken: "test-token",
            },
          },
        },
      }),
    });

    render(<CalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Calendar Management")).toHaveLength(2);
    });
  });

  it("handles error state gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<CalendarManagementPage />);

    // Should not crash and should show some error handling
    await waitFor(() => {
      expect(screen.getAllByText("Calendar Management")).toHaveLength(2);
    });
  });
});
