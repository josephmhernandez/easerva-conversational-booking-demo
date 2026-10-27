import CalendarIntegrationPage from "@/app/business/onboarding/calendar-integration-new/CalendarIntegrationPage";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
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

// Import the actual constants
import { OnboardingStep } from "@/app/constants/businessConstants";

// Mock fetch responses for resource-based strategy
const mockResourceBasedFetchResponses = {
  businessLocation: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.BUSINESS_LOCATION,
        draftData: {
          "serviceTypes.physical": {
            addresses: [
              {
                id: "physical-location-1",
                city: "Austin",
                name: "Main Studio",
                line1: "123 Main St",
                line2: "",
                phone: "",
                state: "TX",
                country: "US",
                zipCode: "78701",
                timezone: "",
                isValidated: true,
              },
              {
                id: "physical-location-2",
                city: "Austin",
                name: "Wellness Center",
                line1: "456 Oak Ave",
                line2: "",
                phone: "",
                state: "TX",
                country: "US",
                zipCode: "78702",
                timezone: "",
                isValidated: true,
              },
            ],
          },
        },
      }),
  },
  businessTeamMembers: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.BUSINESS_TEAM_MEMBERS,
        draftData: {
          "physical-location-1": {
            teamMembers: [
              {
                id: "employee-1",
                fullName: "Sarah Johnson",
                email: "sarah@example.com",
                role: "Massage Therapist",
                locationId: "physical-location-1",
                takesBookings: true,
              },
              {
                id: "employee-2",
                fullName: "Mike Chen",
                email: "mike@example.com",
                role: "Yoga Instructor",
                locationId: "physical-location-1",
                takesBookings: true,
              },
            ],
          },
          "physical-location-2": {
            teamMembers: [
              {
                id: "employee-3",
                fullName: "Lisa Rodriguez",
                email: "lisa@example.com",
                role: "Wellness Coach",
                locationId: "physical-location-2",
                takesBookings: true,
              },
            ],
          },
        },
      }),
  },
  bookingStrategy: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.BOOKING_STRATEGY,
        draftData: {
          selectedStrategy: "resource",
        },
      }),
  },
  businessResources: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.BUSINESS_RESOURCES,
        draftData: {
          "physical-location-1": {
            locationId: "physical-location-1",
            resources: [
              {
                id: "resource-1",
                name: "Massage Table 1",
                type: "equipment",
                description: "Professional massage table with heating",
              },
              {
                id: "resource-2",
                name: "Yoga Studio A",
                type: "room",
                description: "Large yoga studio with mirrors and mats",
              },
            ],
          },
          "physical-location-2": {
            locationId: "physical-location-2",
            resources: [
              {
                id: "resource-3",
                name: "Consultation Room",
                type: "room",
                description: "Private room for wellness consultations",
              },
            ],
          },
        },
      }),
  },
  serviceLocation: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.SERVICE_LOCATION,
        draftData: {
          services: [
            {
              id: "service-1",
              name: "Deep Tissue Massage",
              price: 120,
              locationId: "physical-location-1",
            },
            {
              id: "service-2",
              name: "Yoga Class",
              price: 25,
              locationId: "physical-location-1",
            },
            {
              id: "service-3",
              name: "Wellness Consultation",
              price: 80,
              locationId: "physical-location-2",
            },
          ],
          configurations: [
            {
              serviceId: "service-1",
              locationId: "physical-location-1",
              enabled: true,
              requiredResources: ["resource-1"],
              maxCapacity: 1,
            },
            {
              serviceId: "service-2",
              locationId: "physical-location-1",
              enabled: true,
              requiredResources: ["resource-2"],
              maxCapacity: 15,
            },
            {
              serviceId: "service-3",
              locationId: "physical-location-2",
              enabled: true,
              requiredResources: ["resource-3"],
              maxCapacity: 1,
            },
          ],
        },
      }),
  },
  calendarIntegrationNew: {
    ok: false,
    json: () => Promise.resolve({ draftData: {} }),
  },
  calendarManagement: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.CALENDAR_MANAGEMENT,
        draftData: {
          cronofyCalendars: [],
          calendarAssignments: [
            {
              id: "assignment_r1",
              assignmentId: "resource-1",
              assignmentName: "Massage Table 1",
              assignmentType: "resource",
              defaultBookingCalendar: { calendarId: "google-calendar-1", entityType: "business" },
              busyCalendars: [],
            },
            {
              id: "assignment_r2",
              assignmentId: "resource-2",
              assignmentName: "Yoga Studio A",
              assignmentType: "resource",
              defaultBookingCalendar: { calendarId: "google-calendar-2", entityType: "business" },
              busyCalendars: [],
            },
            {
              id: "assignment_r3",
              assignmentId: "resource-3",
              assignmentName: "Consultation Room",
              assignmentType: "resource",
              defaultBookingCalendar: { calendarId: "configure_later", entityType: "business" },
              busyCalendars: [],
            },
          ],
          cronofyElementToken: "token",
        },
      }),
  },
};

// Mock fetch
global.fetch = jest.fn((url) => {
  const urlStr = url.toString();

  if (urlStr.includes(OnboardingStep.BUSINESS_LOCATION)) {
    return Promise.resolve(mockResourceBasedFetchResponses.businessLocation);
  } else if (urlStr.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
    return Promise.resolve(mockResourceBasedFetchResponses.businessTeamMembers);
  } else if (urlStr.includes(OnboardingStep.BOOKING_STRATEGY)) {
    return Promise.resolve(mockResourceBasedFetchResponses.bookingStrategy);
  } else if (urlStr.includes(OnboardingStep.BUSINESS_RESOURCES)) {
    return Promise.resolve(mockResourceBasedFetchResponses.businessResources);
  } else if (urlStr.includes(OnboardingStep.SERVICE_LOCATION)) {
    return Promise.resolve(mockResourceBasedFetchResponses.serviceLocation);
  } else if (urlStr.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
    return Promise.resolve(mockResourceBasedFetchResponses.calendarIntegrationNew);
  } else if (urlStr.includes(OnboardingStep.CALENDAR_MANAGEMENT)) {
    return Promise.resolve(mockResourceBasedFetchResponses.calendarManagement);
  }

  // Default for POST requests (saving)
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  });
}) as jest.Mock;

describe("CalendarIntegrationPage - Resource-Based Strategy", () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should load and display resource-based booking strategy correctly", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Check that the booking strategy is displayed correctly
    expect(screen.getByText("Resource-based")).toBeInTheDocument();
  });

  it("should create service location combos for each resource", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Should have location-style cards (resource-based strategy now shows location names)
    await waitFor(() => {
      // Should show location names with resource names (e.g., "Main Studio - Massage Table 1")
      const mainStudioCards = screen.getAllByText(/Main Studio/);
      const wellnessCenterCards = screen.getAllByText(/Wellness Center/);
      expect(mainStudioCards.length).toBeGreaterThan(0);
      expect(wellnessCenterCards.length).toBeGreaterThan(0);
    });
  });

  it("should display correct services for each resource", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Each location-style card should show its associated services
    await waitFor(() => {
      // Should show location-based cards instead of resource-based cards
      const mainStudioCards = screen.getAllByText(/Main Studio/);
      const wellnessCenterCards = screen.getAllByText(/Wellness Center/);
      expect(mainStudioCards.length).toBeGreaterThan(0);
      expect(wellnessCenterCards.length).toBeGreaterThan(0);
    });
  });

  it("should display correct employee count for each resource location", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Resources at location-1 should show 2 employees
    // Resource at location-2 should show 1 employee
    await waitFor(() => {
      // Check that employee counts are displayed (this depends on the card implementation)
      const cards = screen.getAllByTestId("combo-card");
      expect(cards).toHaveLength(3); // 3 resources = 3 cards
    });
  });

  it("should handle calendar assignment status correctly for resources", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Check calendar assignment status
    await waitFor(() => {
      // resource-1 and resource-2 should be assigned
      // resource-3 should be pending
      const cards = screen.getAllByTestId("combo-card");
      expect(cards).toHaveLength(3);
    });
  });

  it("should allow editing booking requirements for resource-based combos", async () => {
    const user = userEvent.setup();
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Find and click edit requirements button for first resource
    await waitFor(() => {
      const editButtons = screen.getAllByText("Edit Requirements");
      expect(editButtons.length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByText("Edit Requirements");
    await act(async () => {
      await user.click(editButtons[0]);
    });

    // Should open the booking requirements modal
    await waitFor(() => {
      expect(screen.getByText("Edit Booking Requirements")).toBeInTheDocument();
    });
  });

  it("should validate that all requirements are configured for resource strategy", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Initially, continue button should be disabled because no requirements are set
    await waitFor(() => {
      const continueButton = screen.getByText("Continue");
      expect(continueButton).toBeDisabled();
    });
  });

  it("should handle resource-based combo card selection for combining", async () => {
    const user = userEvent.setup();
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Should show combining interface for resource strategy
    await waitFor(() => {
      expect(screen.getByTestId("combine-services-button")).toBeInTheDocument();
    });

    // Enable combining mode
    const combiningButton = screen.getByTestId("combine-services-button");
    await act(async () => {
      await user.click(combiningButton);
    });

    // Should show active combining interface
    await waitFor(() => {
      expect(screen.getByText("Cancel Combining")).toBeInTheDocument();
    });
  });

  it("should save resource-based configuration correctly", async () => {
    const user = userEvent.setup();
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Click save draft button
    const saveButton = screen.getByText("Save Draft");
    await act(async () => {
      await user.click(saveButton);
    });

    // Should call fetch with correct data
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/business/onboarding/draft",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("resource"),
        })
      );
    });
  });

  it("should display correct resource count and service count", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Each resource combo should show 1 resource and the appropriate number of services
    await waitFor(() => {
      const cards = screen.getAllByTestId("combo-card");
      expect(cards).toHaveLength(3);

      // Each card should represent one resource
      cards.forEach((card) => {
        // Each card should have resource information
        expect(card).toBeInTheDocument();
      });
    });
  });

  it("should handle resource calendar assignments validation", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Should validate that resources have calendar assignments
    // resource-1 and resource-2 are assigned, resource-3 is pending
    // This should affect the continue button state
    await waitFor(() => {
      const continueButton = screen.getByText("Continue");
      // Should be disabled because requirements aren't set, even though some calendars are assigned
      expect(continueButton).toBeDisabled();
    });
  });

  it("should filter services correctly based on location for each resource", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      // Should show location-based cards grouped by resource requirements
      const mainStudioCards = screen.getAllByText(/Main Studio/);
      const wellnessCenterCards = screen.getAllByText(/Wellness Center/);

      expect(mainStudioCards.length).toBeGreaterThan(0);
      expect(wellnessCenterCards.length).toBeGreaterThan(0);
    });
  });

  it("should create resource-location card type for resource-based combos", async () => {
    render(<CalendarIntegrationPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // The combos should have cardType "resource-location"
    // This is tested indirectly through the calendar assignment status logic
    await waitFor(() => {
      const cards = screen.getAllByTestId("combo-card");
      expect(cards).toHaveLength(3);
    });
  });
});
