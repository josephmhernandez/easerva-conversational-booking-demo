import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BookingPage from "@/app/book/service/[state]/[city]/[category]/[slug]/page";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  useParams: jest.fn(),
}));

// Mock toast hook
// jest.mock('@/hooks/use-toast', () => ({
//   useToast: () => ({
//     toast: jest.fn(),
//     dismiss: jest.fn(),
//     toasts: [],
//   }),
// }))

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
});

// Mock fetch globally
global.fetch = jest.fn();

describe("BookingPage", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const defaultParams = {
    state: "tx",
    city: "austin",
    category: "beauty",
    slug: "janes-salon",
  };

  const mockServiceCardResponse = {
    serviceCard: {
      id: "f23a6534-df24-42e0-97d0-c42e1c54f6a4",
      displayName: "Mens Haircut",
      tagline: null,
      description: "Professional haircut",
    },
    service: {
      id: "service-1",
      name: "Mens Haircut",
      description: "Professional haircut with wash and style",
      duration: 45,
      price: 35.0,
      category: "beauty",
      cancellationPolicy: "Free cancellation up to 24 hours before appointment.",
    },
    business: {
      id: "business-1",
      name: "Janes Salon",
      logoUrl: null,
    },
    location: {
      id: "location-1",
      name: "Main Location",
      address: "123 Main St, Austin, TX 78701",
      city: "Austin",
      state: "TX",
      zipCode: "78701",
      timezone: "America/Chicago",
    },
    employee: null,
    providers: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue(defaultParams);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    // Mock fetch for service card API
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/service-cards/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockServiceCardResponse),
        });
      }
      // Mock availability API (used by useAvailabilityDay hook)
      if (url.includes("/api/availability/day")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              date: new Date().toISOString().split("T")[0],
              timezone: "America/Chicago",
              busyPeriods: [],
              calendarGroups: [],
              requirements: [],
            }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  // Helper function to create a QueryClient for tests
  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

  // describe('URL Parameter Handling', () => {
  it("should display business and service names from URL slugs", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BookingPage />
      </QueryClientProvider>
    );

    // Wait for loading to finish
    await waitFor(
      () => {
        expect(screen.queryByText("Loading booking page...")).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Wait for business and service names to appear
    await waitFor(
      () => {
        expect(screen.getByText("Janes Salon")).toBeInTheDocument();
        expect(screen.getByText("Mens Haircut")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  //   it('should pre-select date from URL parameter', async () => {
  //     const futureDate = new Date()
  //     futureDate.setDate(futureDate.getDate() + 7)
  //     const dateString = futureDate.toISOString().split('T')[0]

  //     ;(useSearchParams as jest.Mock).mockReturnValue(
  //       new URLSearchParams({ date: dateString })
  //     )

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       // Calendar should be rendered and date should be selected
  //       expect(screen.queryByText('Loading booking page...')).not.toBeInTheDocument()
  //     })

  //     // Time slots should appear after date is selected
  //     await waitFor(() => {
  //       expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument()
  //     })
  //   })

  //   it('should show error toast for past date and default to today', async () => {
  //     const pastDate = new Date('2023-01-01')
  //     const dateString = pastDate.toISOString().split('T')[0]

  //     ;(useSearchParams as jest.Mock).mockReturnValue(
  //       new URLSearchParams({ date: dateString })
  //     )

  //     const { useToast } = require('@/hooks/use-toast')
  //     const mockToast = jest.fn()
  //     useToast.mockReturnValue({ toast: mockToast, dismiss: jest.fn(), toasts: [] })

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(mockToast).toHaveBeenCalledWith({
  //         title: 'Date in the past',
  //         description: 'The selected date has passed. Showing today\'s availability.',
  //         variant: 'destructive',
  //       })
  //     })
  //   })

  //   it('should handle invalid date format gracefully', async () => {
  //     ;(useSearchParams as jest.Mock).mockReturnValue(
  //       new URLSearchParams({ date: 'invalid-date' })
  //     )

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       // Should default to today's date
  //       expect(screen.queryByText('Loading booking page...')).not.toBeInTheDocument()
  //     })

  //     // Time slots should still appear
  //     await waitFor(() => {
  //       expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument()
  //     })
  //   })

  //   it('should pre-select time from URL parameter when available', async () => {
  //     const futureDate = new Date()
  //     futureDate.setDate(futureDate.getDate() + 7)
  //     const dateString = futureDate.toISOString().split('T')[0]

  //     ;(useSearchParams as jest.Mock).mockReturnValue(
  //       new URLSearchParams({ date: dateString, time: '10:30' })
  //     )

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.queryByText('Loading booking page...')).not.toBeInTheDocument()
  //     })

  //     // Wait for time slots to load
  //     await waitFor(() => {
  //       const timeButton = screen.getByRole('button', { name: /10:30 AM/i })
  //       expect(timeButton).toBeInTheDocument()
  //       // Check if it's selected (should have gradient background classes)
  //       expect(timeButton.className).toContain('from-orange-400')
  //     })
  //   })

  //   it('should show toast when URL time is not available', async () => {
  //     const futureDate = new Date()
  //     futureDate.setDate(futureDate.getDate() + 7)
  //     const dateString = futureDate.toISOString().split('T')[0]

  //     ;(useSearchParams as jest.Mock).mockReturnValue(
  //       new URLSearchParams({ date: dateString, time: '13:00' }) // Not in mock slots
  //     )

  //     const { useToast } = require('@/hooks/use-toast')
  //     const mockToast = jest.fn()
  //     useToast.mockReturnValue({ toast: mockToast, dismiss: jest.fn(), toasts: [] })

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(mockToast).toHaveBeenCalledWith({
  //         title: 'Time unavailable',
  //         description: 'The requested time is no longer available. Please select another time.',
  //       })
  //     }, { timeout: 3000 })
  //   })
  // })

  // describe('Date and Time Selection', () => {
  //   it('should show time slots after selecting a date', async () => {
  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.queryByText('Loading booking page...')).not.toBeInTheDocument()
  //     })

  //     // Time slots should appear automatically (default to today)
  //     await waitFor(() => {
  //       expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument()
  //       expect(screen.getByText(/2:00 PM/i)).toBeInTheDocument()
  //     })
  //   })

  //   it('should reset selected time when date changes', async () => {
  //     const user = userEvent.setup()

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.queryByText('Loading booking page...')).not.toBeInTheDocument()
  //     })

  //     // Wait for time slots and select one
  //     await waitFor(() => {
  //       expect(screen.getByText(/10:30 AM/i)).toBeInTheDocument()
  //     })

  //     const timeButton = screen.getByRole('button', { name: /10:30 AM/i })
  //     await user.click(timeButton)

  //     // Verify time is selected
  //     expect(timeButton.className).toContain('from-orange-400')

  //     // Now select a different date (simulate clicking on calendar)
  //     // This is tricky with the calendar component, so we'll just verify the logic
  //     // In a real test, you'd click on a different date in the calendar
  //   })

  //   it('should display contact form after date and time are selected', async () => {
  //     const user = userEvent.setup()

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.queryByText('Loading booking page...')).not.toBeInTheDocument()
  //     })

  //     // Wait for time slots
  //     await waitFor(() => {
  //       expect(screen.getByText(/10:30 AM/i)).toBeInTheDocument()
  //     })

  //     // Contact form should not be visible yet (or should be visible with today's date)
  //     // Actually with the default today's date, it might already be visible
  //     // Let's check for the form
  //     await waitFor(() => {
  //       expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
  //     })
  //   })
  // })

  // describe('Provider Filtering', () => {
  //   it('should filter time slots by selected provider', async () => {
  //     const user = userEvent.setup()

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.queryByText('Loading booking page...')).not.toBeInTheDocument()
  //     })

  //     // Wait for time slots
  //     await waitFor(() => {
  //       expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument()
  //     })

  //     // Get initial time slot count
  //     const initialSlots = screen.getAllByRole('button', { name: /AM|PM/i })
  //     const initialCount = initialSlots.length

  //     // Open provider dropdown and select a specific provider
  //     const providerSelect = screen.getByRole('combobox')
  //     await user.click(providerSelect)

  //     // Select "Sarah Johnson"
  //     const sarahOption = await screen.findByRole('option', { name: /Sarah Johnson/i })
  //     await user.click(sarahOption)

  //     // Wait for filtered time slots
  //     await waitFor(() => {
  //       const filteredSlots = screen.getAllByRole('button', { name: /AM|PM/i })
  //       // Should have fewer slots than before (only Sarah's slots)
  //       expect(filteredSlots.length).toBeLessThan(initialCount)
  //     })
  //   })
  // })

  // describe('Form Validation', () => {
  //   it('should validate full name field', async () => {
  //     const user = userEvent.setup()

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
  //     })

  //     const nameInput = screen.getByLabelText(/Full Name/i)

  //     // Enter invalid name (too short)
  //     await user.type(nameInput, 'A')
  //     await user.tab() // Trigger blur

  //     await waitFor(() => {
  //       expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument()
  //     })
  //   })

  //   it('should validate email field', async () => {
  //     const user = userEvent.setup()

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
  //     })

  //     const emailInput = screen.getByLabelText(/Email/i)

  //     // Enter invalid email
  //     await user.type(emailInput, 'invalid-email')
  //     await user.tab()

  //     await waitFor(() => {
  //       expect(screen.getByText(/Please enter a valid email/i)).toBeInTheDocument()
  //     })
  //   })

  //   it('should validate phone field', async () => {
  //     const user = userEvent.setup()

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument()
  //     })

  //     const phoneInput = screen.getByLabelText(/Phone/i)

  //     // Enter invalid phone (too short)
  //     await user.type(phoneInput, '123')
  //     await user.tab()

  //     await waitFor(() => {
  //       expect(screen.getByText(/Please enter a valid phone number/i)).toBeInTheDocument()
  //     })
  //   })

  //   it('should disable submit button when form is invalid', async () => {
  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.queryByText('Loading booking page...')).not.toBeInTheDocument()
  //     })

  //     // Wait for time slots and select one
  //     await waitFor(() => {
  //       expect(screen.getByText(/10:30 AM/i)).toBeInTheDocument()
  //     })

  //     const timeButton = screen.getByRole('button', { name: /10:30 AM/i })
  //     await userEvent.setup().click(timeButton)

  //     // Wait for submit button to appear
  //     await waitFor(() => {
  //       const submitButton = screen.getByRole('button', { name: /Confirm Booking/i })
  //       expect(submitButton).toBeDisabled()
  //     })
  //   })
  // })

  // describe('Session Storage', () => {
  //   it('should persist form data to session storage', async () => {
  //     const user = userEvent.setup()

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
  //     })

  //     const nameInput = screen.getByLabelText(/Full Name/i)
  //     await user.type(nameInput, 'John Doe')

  //     await waitFor(() => {
  //       const stored = JSON.parse(mockSessionStorage.getItem('booking-form') || '{}')
  //       expect(stored.fullName).toBe('John Doe')
  //     })
  //   })

  //   // it('should restore form data from session storage', async () => {
  //   //   // Pre-populate session storage
  //   //   mockSessionStorage.setItem('booking-form', JSON.stringify({
  //   //     fullName: 'Jane Smith',
  //   //     email: 'jane@example.com',
  //   //     phone: '(555) 123-4567',
  //   //     notes: 'Test notes',
  //   //   }))

  //   //   render(<BookingPage />)

  //   //   await waitFor(() => {
  //   //     expect(screen.getByLabelText(/Full Name/i)).toHaveValue('Jane Smith')
  //   //     expect(screen.getByLabelText(/Email/i)).toHaveValue('jane@example.com')
  //   //     expect(screen.getByLabelText(/Phone/i)).toHaveValue('(555) 123-4567')
  //   //   })
  //   // })
  // })

  // describe('Booking Submission', () => {
  //   it('should navigate to confirmation page on successful booking', async () => {
  //     const user = userEvent.setup()

  //     // Pre-populate form data
  //     mockSessionStorage.setItem('booking-form', JSON.stringify({
  //       fullName: 'John Doe',
  //       email: 'john@example.com',
  //       phone: '(555) 123-4567',
  //       notes: '',
  //     }))

  //     render(<BookingPage />)

  //     await waitFor(() => {
  //       expect(screen.queryByText('Loading booking page...')).not.toBeInTheDocument()
  //     })

  //     // Wait for and select time slot
  //     await waitFor(() => {
  //       expect(screen.getByText(/10:30 AM/i)).toBeInTheDocument()
  //     })

  //     const timeButton = screen.getByRole('button', { name: /10:30 AM/i })
  //     await user.click(timeButton)

  //     // Wait for submit button
  //     await waitFor(() => {
  //       const submitButton = screen.getByRole('button', { name: /Confirm Booking/i })
  //       expect(submitButton).toBeEnabled()
  //     })

  //     const submitButton = screen.getByRole('button', { name: /Confirm Booking/i })
  //     await user.click(submitButton)

  //     // Should navigate to confirmation page
  //     await waitFor(() => {
  //       expect(mockRouter.push).toHaveBeenCalledWith(
  //         expect.stringMatching(/\/book\/confirm\/BK-[A-Z0-9]+/)
  //       )
  //     }, { timeout: 3000 })
  //   })
  // })
});
