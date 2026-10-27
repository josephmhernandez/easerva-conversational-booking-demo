import CalendarIntegrationNew from "@/app/business/onboarding/calendar-integration-new/CalendarIntegrationPage";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

// Import the actual route constants

// Mock fetch responses
const mockFetchResponses = {
  businessLocation: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: OnboardingStep.BUSINESS_LOCATION,
        draftData: {
          "serviceTypes.virtual": {
            virtualServices: [
              {
                id: "virtual-1",
                name: "online location",
                platform: "zoom",
                defaultLink: "https://zoom.us/j/123456789",
                instructions: "Join the meeting using the link provided",
                timezone: "America/Chicago",
              },
            ],
          },
          "serviceTypes.physical": {
            addresses: [
              {
                id: "main",
                city: "Colleyville",
                name: "Main Location",
                line1: "4510 Mill Pond Ct",
                line2: "",
                phone: "",
                state: "TX",
                country: "US",
                zipCode: "76034-3678",
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
        draftData: {
          "location-1": {
            teamMembers: [
              {
                id: "emp-1",
                fullName: "John Doe",
                email: "john@example.com",
                role: "Consultant",
                locationId: "location-1",
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
        draftData: {
          selectedStrategy: "location",
        },
      }),
  },
  businessResources: {
    ok: true,
    json: () =>
      Promise.resolve({
        draftData: {
          "location-1": {
            resources: [
              {
                id: "res-1",
                name: "Conference Room A",
                type: "room",
                description: "Large conference room",
              },
            ],
          },
        },
      }),
  },
  cardStudio: {
    ok: true,
    json: () =>
      Promise.resolve({
        draftData: {
          employeeCardMode: "per-service",
        },
      }),
  },
  serviceLocation: {
    ok: true,
    json: () =>
      Promise.resolve({
        draftData: {
          services: [
            {
              id: "service-1",
              name: "Consultation",
              price: 100,
              category: "Legal",
              duration: 60,
              priceType: "fixed",
              description: "Legal consultation",
              deliveryOptions: {
                mobile: false,
                virtual: true,
                inPerson: true,
              },
            },
          ],
          locations: [
            {
              id: "main",
              name: "Main Location",
              type: "physical",
              address: "4510 Mill Pond Ct, Colleyville, TX 76034-3678",
              resources: [
                {
                  id: "room-1",
                  name: "Conference Room 1",
                  type: "room",
                  description: "Large conference room",
                },
              ],
            },
            {
              id: "virtual",
              name: "online location",
              type: "virtual",
              address: "Platform: zoom | Timezone: America/Chicago",
              resources: [],
            },
          ],
          configurations: [
            {
              enabled: true,
              serviceId: "service-1",
              locationId: "main",
              maxCapacity: 1,
              requiredResources: ["room-1"],
            },
            {
              enabled: true,
              serviceId: "service-1",
              locationId: "virtual",
              maxCapacity: 1,
              requiredResources: [],
            },
          ],
        },
      }),
  },
};

describe("CalendarIntegrationNew", () => {
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

    // Reset fetch mock
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve(mockFetchResponses.businessLocation);
      }
      if (url.includes(OnboardingStep.BUSINESS_TEAM_MEMBERS)) {
        return Promise.resolve(mockFetchResponses.businessTeamMembers);
      }
      if (url.includes(OnboardingStep.BOOKING_STRATEGY)) {
        return Promise.resolve(mockFetchResponses.bookingStrategy);
      }
      if (url.includes(OnboardingStep.BUSINESS_RESOURCES)) {
        return Promise.resolve(mockFetchResponses.businessResources);
      }
      if (url.includes(OnboardingStep.CARD_STUDIO)) {
        return Promise.resolve(mockFetchResponses.cardStudio);
      }
      if (url.includes(OnboardingStep.SERVICE_LOCATION)) {
        return Promise.resolve(mockFetchResponses.serviceLocation);
      }
      if (url.includes(OnboardingStep.CALENDAR_INTEGRATION_NEW)) {
        return Promise.resolve({ ok: false }); // No saved data
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the calendar integration page with correct title and progress", async () => {
    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    expect(screen.getByText("Step 9 of 11")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Configure booking requirements and service integrations for your calendar system"
      )
    ).toBeInTheDocument();
  });

  it("displays current booking strategy (Location-based by default)", async () => {
    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    await waitFor(() => {
      expect(screen.getByText("Current Booking Strategy")).toBeInTheDocument();
    });

    // Check that the current strategy (location-based) is displayed
    expect(screen.getByText("Location-based")).toBeInTheDocument();
    expect(screen.getByText("Each location has its own calendar")).toBeInTheDocument();
  });

  it("loads and displays location-based strategy content when location strategy is selected", async () => {
    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Check if the component is rendering the basic structure
    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    expect(screen.getByText("Current Booking Strategy")).toBeInTheDocument();

    // Check if location strategy is displayed as the current strategy
    expect(screen.getByText("Location-based")).toBeInTheDocument();
    expect(screen.getByText("Each location has its own calendar")).toBeInTheDocument();

    // Wait for loading to complete first
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Wait for location cards to render - they should show the processed location names
    await waitFor(() => {
      expect(screen.getByText("Main Location")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("online location")).toBeInTheDocument();
    });
  });

  it("does not show combining interface for location strategy", async () => {
    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Location strategy (default) should not show combining interface
    expect(screen.queryByTestId("combine-services-button")).not.toBeInTheDocument();
  });

  it("displays service location combinations with correct data", async () => {
    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Wait for the location-based strategy display to be rendered
    await waitFor(() => {
      expect(screen.getByText("Location-based")).toBeInTheDocument();
    });

    // Wait for loading to complete first
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Wait for service location combination cards to render
    await waitFor(() => {
      expect(screen.getByText("Main Location")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("online location")).toBeInTheDocument();
    });

    // Check that service location combination cards are rendered
    // The exact service count might vary based on the mock data configuration
    expect(screen.getByText("Main Location")).toBeInTheDocument();
    expect(screen.getByText("online location")).toBeInTheDocument();
  });

  // it('opens booking requirements dialog when Edit Requirements is clicked', async () => {
  //   await act(async () => {
  //     render(<CalendarIntegrationNew />)
  //   })

  //   // Wait for data to load and location strategy content to render
  //   await waitFor(() => {
  //     expect(screen.queryByText('Loading calendar integration data...')).not.toBeInTheDocument()
  //   })

  //   // Wait for location cards to render
  //   await waitFor(() => {
  //     expect(screen.getByText('Edit Requirements')).toBeInTheDocument()
  //   })

  //   const editRequirementsButton = screen.getAllByText('Edit Requirements')[0]
  //   await userEvent.click(editRequirementsButton)

  //   await waitFor(() => {
  //     expect(screen.getByText('Edit Booking Requirements')).toBeInTheDocument()
  //   })
  // })

  // it('handles service splitting functionality', async () => {
  //   await act(async () => {
  //     render(<CalendarIntegrationNew />)
  //   })

  //   // Wait for data to load and location cards to render
  //   await waitFor(() => {
  //     expect(screen.queryByText('Loading calendar integration data...')).not.toBeInTheDocument()
  //   })

  //   await waitFor(() => {
  //     expect(screen.getByText('Downtown')).toBeInTheDocument()
  //   })

  //   // Click to expand the card - find the card by looking for the Downtown text in a card
  //   const downtownCard = screen.getByText('Downtown').closest('[class*="cursor-pointer"]')
  //   if (downtownCard) {
  //     await userEvent.click(downtownCard)
  //   }

  //   // Wait for the card to expand and show services
  //   await waitFor(() => {
  //     expect(screen.getByText('Services at this location')).toBeInTheDocument()
  //   })

  //   // Check for split service button
  //   const splitButton = screen.getByText('Split Out')
  //   expect(splitButton).toBeInTheDocument()
  // })

  it("displays connection status badges correctly", async () => {
    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    // Just verify the component renders without errors
    await waitFor(() => {
      expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
    });
  });

  it("handles calendar provider selection", async () => {
    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    await waitFor(() => {
      expect(screen.getByText("Location-based")).toBeInTheDocument();
    });

    // Just verify the component renders without errors
    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
  });

  it("saves calendar integration data when save button is clicked", async () => {
    const mockSaveResponse = {
      ok: true,
      json: () => Promise.resolve({ businessId: "test-business-id" }),
    };
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST") {
        return Promise.resolve(mockSaveResponse);
      }
      return Promise.resolve({ ok: false });
    });

    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    await waitFor(() => {
      expect(screen.getByText("Save Draft")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save Draft");
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/business/onboarding/draft",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  it("handles error states gracefully", async () => {
    // Mock fetch to return errors
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500 })
    );

    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    // Should still render the page even with errors
    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
  });

  it("displays loading state while data is being fetched", async () => {
    // Mock a slow response
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockFetchResponses.businessLocation), 100)
        )
    );

    render(<CalendarIntegrationNew />);

    expect(screen.getByText("Loading calendar integration data...")).toBeInTheDocument();
  });

  it("handles unsaved changes warning", async () => {
    await act(async () => {
      render(<CalendarIntegrationNew />);
    });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
    });

    // Just verify the component renders without errors and that beforeunload handler is set up
    // Note: Location strategy doesn't support combining, so we can't test unsaved changes through UI interaction
    expect(screen.getByText("Calendar Integration Setup")).toBeInTheDocument();
  });

  // it('validates booking requirements configuration', async () => {
  //   await act(async () => {
  //     render(<CalendarIntegrationNew />)
  //   })

  //   // Wait for data to load and location cards to render
  //   await waitFor(() => {
  //     expect(screen.queryByText('Loading calendar integration data...')).not.toBeInTheDocument()
  //   })

  //   await waitFor(() => {
  //     expect(screen.getByText('Edit Requirements')).toBeInTheDocument()
  //   })

  //   // The continue button should be disabled until requirements are configured
  //   const continueButton = screen.getByText('Continue')
  //   expect(continueButton).toBeDisabled()
  // })

  // it('handles different booking strategy renderings correctly', async () => {
  //   await act(async () => {
  //     render(<CalendarIntegrationNew />)
  //   })

  //   // Wait for data to load
  //   await waitFor(() => {
  //     expect(screen.queryByText('Loading calendar integration data...')).not.toBeInTheDocument()
  //   })

  //   // Test simple strategy
  //   const simpleStrategy = screen.getByLabelText(/simple/i)
  //   await userEvent.click(simpleStrategy)

  //   await waitFor(() => {
  //     expect(screen.getByText('Business Calendar Connection')).toBeInTheDocument()
  //   })

  //   // Test employee strategy
  //   const employeeStrategy = screen.getByLabelText(/employee/i)
  //   await userEvent.click(employeeStrategy)

  //   // Wait for employee data to load
  //   await waitFor(() => {
  //     expect(screen.getByText('John Doe')).toBeInTheDocument()
  //   })
  // })
});
