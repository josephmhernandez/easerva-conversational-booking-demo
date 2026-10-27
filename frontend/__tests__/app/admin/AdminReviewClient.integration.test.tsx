/**
 * Integration Tests for AdminReviewClient Component
 *
 * Tests the integration between the AdminReviewClient component and the API,
 * including end-to-end workflows and real-world scenarios.
 */

import AdminReviewClient from "@/app/admin/AdminReviewClient";
import { ONBOARDING_DRAFT_STATUS } from "@/app/constants/dbConstants";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock Next.js router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Comprehensive test data representing a real business application
const realWorldApplication = {
  id: "real-app-1",
  user_id: "user-123",
  business_id: "business-456",
  status: ONBOARDING_DRAFT_STATUS.SUBMITTED,
  current_step: "awaiting_review",
  created_at: "2023-12-01T09:00:00Z",
  updated_at: "2023-12-15T16:30:00Z",
  last_saved_at: "2023-12-15T16:30:00Z",
  businessInfo: {
    name: "Wellness Spa & Retreat",
    slug: "wellness-spa-retreat",
    category: "Health & Wellness",
    description:
      "A full-service wellness spa offering massage therapy, facials, and holistic health services in a tranquil environment.",
    phone: "555-WELLNESS",
    email: "info@wellnessspa.com",
    website: "https://www.wellnessspa.com",
    logoUrl: "https://cdn.wellnessspa.com/logo.png",
    tags: ["wellness", "spa", "massage", "relaxation", "health"],
  },
  locations: [
    {
      id: "main-spa",
      name: "Main Spa Location",
      type: "physical" as const,
      address: "123 Serenity Lane, Peaceful Valley, CA 90210",
      resources: [
        {
          id: "massage-room-1",
          name: "Tranquility Suite",
          type: "room",
          description: "Private massage room with ambient lighting and sound system",
        },
        {
          id: "massage-room-2",
          name: "Harmony Chamber",
          type: "room",
          description: "Couples massage room with dual massage tables",
        },
        {
          id: "facial-room",
          name: "Rejuvenation Room",
          type: "room",
          description: "Specialized facial treatment room with steam capabilities",
        },
        {
          id: "hot-stone-set",
          name: "Hot Stone Therapy Set",
          type: "equipment",
          description: "Professional hot stone massage equipment",
        },
        {
          id: "aromatherapy-kit",
          name: "Essential Oils Collection",
          type: "equipment",
          description: "Complete aromatherapy essential oils and diffusers",
        },
      ],
    },
    {
      id: "mobile-wellness",
      name: "Mobile Wellness Service",
      type: "mobile" as const,
      address: "In-home services within 25 miles of main location",
      resources: [
        {
          id: "portable-table",
          name: "Portable Massage Table",
          type: "equipment",
          description: "Professional portable massage table for home visits",
        },
        {
          id: "mobile-kit",
          name: "Mobile Therapy Kit",
          type: "equipment",
          description: "Complete mobile massage and therapy equipment",
        },
      ],
    },
    {
      id: "virtual-consultations",
      name: "Virtual Wellness Consultations",
      type: "virtual" as const,
      address: "Zoom virtual platform with HD video",
      resources: [],
    },
  ],
  services: [
    {
      id: "swedish-massage",
      name: "Swedish Relaxation Massage",
      category: "Massage Therapy",
      description:
        "A gentle, relaxing full-body massage using long strokes and light pressure to promote relaxation and stress relief.",
      duration: 60,
      pricing: {
        type: "variable",
        min: 80,
        max: 120,
        displayText: "$80-120",
      },
      locations: ["main-spa", "mobile-wellness"],
      employees: ["therapist-1", "therapist-2"],
    },
    {
      id: "deep-tissue-massage",
      name: "Deep Tissue Massage",
      category: "Massage Therapy",
      description:
        "Therapeutic massage targeting deeper muscle layers to relieve chronic tension and muscle knots.",
      duration: 90,
      pricing: {
        type: "fixed",
        amount: 140,
        displayText: "$140",
      },
      locations: ["main-spa"],
      employees: ["therapist-1", "therapist-3"],
    },
    {
      id: "couples-massage",
      name: "Couples Relaxation Massage",
      category: "Massage Therapy",
      description: "Side-by-side massage experience for couples in our dedicated couples suite.",
      duration: 75,
      pricing: {
        type: "fixed",
        amount: 200,
        displayText: "$200",
      },
      locations: ["main-spa"],
      employees: ["therapist-1", "therapist-2"],
    },
    {
      id: "facial-treatment",
      name: "Rejuvenating Facial",
      category: "Skincare",
      description:
        "Custom facial treatment including cleansing, exfoliation, extractions, and moisturizing.",
      duration: 75,
      pricing: {
        type: "variable",
        min: 90,
        max: 150,
        displayText: "$90-150",
      },
      locations: ["main-spa"],
      employees: ["esthetician-1"],
    },
    {
      id: "wellness-consultation",
      name: "Holistic Wellness Consultation",
      category: "Consultation",
      description: "Comprehensive wellness assessment and personalized health recommendations.",
      duration: 45,
      pricing: {
        type: "fixed",
        amount: 75,
        displayText: "$75",
      },
      locations: ["main-spa", "virtual-consultations"],
      employees: ["wellness-coach"],
    },
  ],
  employees: [
    {
      id: "therapist-1",
      fullName: "Sarah Chen",
      role: "Senior Massage Therapist",
      email: "sarah@wellnessspa.com",
      locationId: "main-spa",
      takesBookings: true,
      services: ["swedish-massage", "deep-tissue-massage", "couples-massage"],
    },
    {
      id: "therapist-2",
      fullName: "Maria Rodriguez",
      role: "Massage Therapist",
      email: "maria@wellnessspa.com",
      locationId: "main-spa",
      takesBookings: true,
      services: ["swedish-massage", "couples-massage"],
    },
    {
      id: "therapist-3",
      fullName: "David Park",
      role: "Therapeutic Massage Specialist",
      email: "david@wellnessspa.com",
      locationId: "main-spa",
      takesBookings: true,
      services: ["deep-tissue-massage"],
    },
    {
      id: "esthetician-1",
      fullName: "Jennifer Walsh",
      role: "Licensed Esthetician",
      email: "jennifer@wellnessspa.com",
      locationId: "main-spa",
      takesBookings: true,
      services: ["facial-treatment"],
    },
    {
      id: "wellness-coach",
      fullName: "Dr. Michael Thompson",
      role: "Holistic Wellness Coach",
      email: "michael@wellnessspa.com",
      locationId: "main-spa",
      takesBookings: true,
      services: ["wellness-consultation"],
    },
  ],
  cards: [
    {
      id: "business-card",
      name: "Wellness Spa Main Card",
      type: "business" as const,
      headline: "Welcome to Wellness Spa & Retreat",
      tagline: "Your journey to wellness begins here",
      description: "Experience tranquility and rejuvenation at our full-service wellness spa",
      serviceIds: ["swedish-massage", "deep-tissue-massage", "facial-treatment"],
      locationId: "main-spa",
      mediaUrl: "https://cdn.wellnessspa.com/spa-interior.jpg",
      price: "Starting at $75",
      ctaText: "Book Your Escape",
      isComplete: true,
    },
    {
      id: "massage-service-card",
      name: "Massage Therapy Services",
      type: "service" as const,
      headline: "Professional Massage Therapy",
      tagline: "Relax, restore, rejuvenate",
      description: "Expert massage therapy in a peaceful setting",
      serviceIds: ["swedish-massage", "deep-tissue-massage", "couples-massage"],
      ctaText: "Schedule Massage",
      isComplete: true,
    },
    {
      id: "facial-service-card",
      name: "Skincare & Facial Services",
      type: "service" as const,
      headline: "Rejuvenating Facial Treatments",
      tagline: "Reveal your natural glow",
      description: "Custom facial treatments for all skin types",
      serviceIds: ["facial-treatment"],
      ctaText: "Book Facial",
      isComplete: false,
    },
    {
      id: "mobile-service-card",
      name: "Mobile Wellness Services",
      type: "location" as const,
      headline: "In-Home Wellness Services",
      tagline: "Spa-quality treatments in your home",
      description: "Enjoy professional wellness services in the comfort of your own space",
      serviceIds: ["swedish-massage"],
      locationId: "mobile-wellness",
      ctaText: "Book Home Visit",
      isComplete: true,
    },
    {
      id: "sarah-therapist-card",
      name: "Sarah Chen - Senior Therapist",
      type: "employee" as const,
      headline: "Sarah Chen, LMT",
      tagline: "15 years of healing touch",
      description: "Senior massage therapist specializing in therapeutic and relaxation techniques",
      serviceIds: ["swedish-massage", "deep-tissue-massage"],
      employeeId: "therapist-1",
      ctaText: "Book with Sarah",
      isComplete: true,
    },
  ],
  summary: {
    totalLocations: 3,
    totalServices: 5,
    totalEmployees: 5,
    totalCards: 5,
    completedSteps: 12,
    totalSteps: 14,
  },
};

describe("AdminReviewClient Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default successful mock
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ applications: [realWorldApplication] }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("End-to-End Application Review Workflow", () => {
    it("should display complete business overview on initial load", async () => {
      render(<AdminReviewClient />);

      // Wait for data to load
      await waitFor(
        () => {
          expect(screen.getByText("Business Applications Review")).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      // Verify header information
      expect(screen.getByText("1 application found")).toBeInTheDocument();
      expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
      expect(screen.getByText("12/14")).toBeInTheDocument(); // Progress

      // Verify summary statistics using more specific queries
      const summaryCards = screen.getAllByText("3");
      expect(summaryCards.length).toBeGreaterThan(0);
      const fiveCount = screen.getAllByText("5");
      expect(fiveCount.length).toBeGreaterThan(0);
    });

    it("should display comprehensive location information with resources", async () => {
      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      const locationsTrigger = screen.getByRole("button", { name: /locations \(3\)/i });
      await userEvent.click(locationsTrigger);

      await waitFor(() => {
        // Verify all location types
        expect(screen.getByText("Main Spa Location")).toBeInTheDocument();
        expect(screen.getByText("Mobile Wellness Service")).toBeInTheDocument();
        expect(screen.getByText("Virtual Wellness Consultations")).toBeInTheDocument();

        // Verify location addresses
        expect(
          screen.getByText("123 Serenity Lane, Peaceful Valley, CA 90210")
        ).toBeInTheDocument();
        expect(
          screen.getByText("In-home services within 25 miles of main location")
        ).toBeInTheDocument();
        expect(screen.getByText("Zoom virtual platform with HD video")).toBeInTheDocument();

        // Verify resources for main location
        expect(screen.getByText("Tranquility Suite")).toBeInTheDocument();
        expect(screen.getByText("Harmony Chamber")).toBeInTheDocument();
        expect(screen.getByText("Hot Stone Therapy Set")).toBeInTheDocument();
        expect(screen.getByText("Essential Oils Collection")).toBeInTheDocument();

        // Verify mobile resources
        expect(screen.getByText("Portable Massage Table")).toBeInTheDocument();
        expect(screen.getByText("Mobile Therapy Kit")).toBeInTheDocument();
      });
    });

    it("should show detailed service offerings with pricing and relationships", async () => {
      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      const servicesTrigger = screen.getByRole("button", { name: /services \(5\)/i });
      await userEvent.click(servicesTrigger);

      await waitFor(() => {
        // Verify all services are displayed
        expect(screen.getByText("Swedish Relaxation Massage")).toBeInTheDocument();
        expect(screen.getByText("Deep Tissue Massage")).toBeInTheDocument();
        expect(screen.getByText("Couples Relaxation Massage")).toBeInTheDocument();
        expect(screen.getByText("Rejuvenating Facial")).toBeInTheDocument();
        expect(screen.getByText("Holistic Wellness Consultation")).toBeInTheDocument();

        // Verify pricing display
        expect(screen.getByText("$80-120")).toBeInTheDocument(); // Swedish massage
        expect(screen.getByText("$140")).toBeInTheDocument(); // Deep tissue
        expect(screen.getByText("$200")).toBeInTheDocument(); // Couples
        expect(screen.getByText("$90-150")).toBeInTheDocument(); // Facial
        expect(screen.getByText("$75")).toBeInTheDocument(); // Consultation

        // Verify duration display
        expect(screen.getByText("Duration: 60 min")).toBeInTheDocument();
        expect(screen.getByText("Duration: 90 min")).toBeInTheDocument();
        expect(screen.getAllByText("Duration: 75 min").length).toBe(2); // Couples and Facial
        expect(screen.getByText("Duration: 45 min")).toBeInTheDocument();

        // Verify location and employee relationships
        expect(screen.getAllByText("Locations: 2")[0]).toBeInTheDocument(); // Swedish massage
        expect(screen.getAllByText("Locations: 1")[0]).toBeInTheDocument(); // Deep tissue
        expect(screen.getAllByText("Employees: 2")[0]).toBeInTheDocument(); // Various services
      });
    });

    it("should display comprehensive employee information", async () => {
      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      const employeesTrigger = screen.getByRole("button", { name: /employees \(5\)/i });
      await userEvent.click(employeesTrigger);

      await waitFor(() => {
        // Verify all employees
        expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
        expect(screen.getByText("Maria Rodriguez")).toBeInTheDocument();
        expect(screen.getByText("David Park")).toBeInTheDocument();
        expect(screen.getByText("Jennifer Walsh")).toBeInTheDocument();
        expect(screen.getByText("Dr. Michael Thompson")).toBeInTheDocument();

        // Verify roles
        expect(screen.getByText("Senior Massage Therapist")).toBeInTheDocument();
        expect(screen.getByText("Massage Therapist")).toBeInTheDocument();
        expect(screen.getByText("Therapeutic Massage Specialist")).toBeInTheDocument();
        expect(screen.getByText("Licensed Esthetician")).toBeInTheDocument();
        expect(screen.getByText("Holistic Wellness Coach")).toBeInTheDocument();

        // Verify all employees take bookings
        const takesBookingsBadges = screen.getAllByText("Takes Bookings");
        expect(takesBookingsBadges).toHaveLength(5);

        // Verify service counts
        expect(screen.getByText("Services: 3 | Location: main-spa")).toBeInTheDocument(); // Sarah
        expect(screen.getByText("Services: 2 | Location: main-spa")).toBeInTheDocument(); // Maria
        expect(screen.getAllByText("Services: 1 | Location: main-spa").length).toBe(3); // David, Jennifer, Michael
      });
    });

    it("should show marketing card strategy with completion status", async () => {
      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      const cardsTrigger = screen.getByRole("button", { name: /marketing cards \(5\)/i });
      await userEvent.click(cardsTrigger);

      await waitFor(() => {
        // Verify all cards
        expect(screen.getByText("Wellness Spa Main Card")).toBeInTheDocument();
        expect(screen.getByText("Massage Therapy Services")).toBeInTheDocument();
        expect(screen.getByText("Skincare & Facial Services")).toBeInTheDocument();
        expect(screen.getByText("Mobile Wellness Services")).toBeInTheDocument();
        expect(screen.getByText("Sarah Chen - Senior Therapist")).toBeInTheDocument();

        // Verify card types
        expect(screen.getByText("business")).toBeInTheDocument();
        expect(screen.getAllByText("service")).toHaveLength(2);
        expect(screen.getByText("location")).toBeInTheDocument();
        expect(screen.getByText("employee")).toBeInTheDocument();

        // Verify CTAs
        expect(screen.getByText("Book Your Escape")).toBeInTheDocument();
        expect(screen.getByText("Schedule Massage")).toBeInTheDocument();
        expect(screen.getByText("Book Facial")).toBeInTheDocument();
        expect(screen.getByText("Book Home Visit")).toBeInTheDocument();
        expect(screen.getByText("Book with Sarah")).toBeInTheDocument();

        // Verify pricing
        expect(screen.getByText("Starting at $75")).toBeInTheDocument();
      });
    });
  });

  describe("Complex Business Scenarios", () => {
    it("should handle business with no employees (resource-based booking)", async () => {
      const resourceBasedApplication = {
        ...realWorldApplication,
        employees: [],
        services: realWorldApplication.services.map((service) => ({
          ...service,
          employees: [],
        })),
        summary: {
          ...realWorldApplication.summary,
          totalEmployees: 0,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [resourceBasedApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      // Verify employees section is not shown when there are no employees
      expect(screen.queryByRole("button", { name: /employees/i })).not.toBeInTheDocument();

      // Verify services still show zero employees
      const servicesTrigger = screen.getByRole("button", { name: /services/i });
      await userEvent.click(servicesTrigger);

      await waitFor(() => {
        expect(screen.getAllByText("Employees: 0")[0]).toBeInTheDocument();
      });
    });

    it("should handle virtual-only business", async () => {
      const virtualOnlyApplication = {
        ...realWorldApplication,
        locations: [
          {
            id: "virtual-only",
            name: "Virtual Wellness Platform",
            type: "virtual" as const,
            address: "Zoom video consultations",
            resources: [],
          },
        ],
        services: realWorldApplication.services.map((service) => ({
          ...service,
          locations: ["virtual-only"],
        })),
        summary: {
          ...realWorldApplication.summary,
          totalLocations: 1,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [virtualOnlyApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      const locationsTrigger = screen.getByRole("button", { name: /locations \(1\)/i });
      await userEvent.click(locationsTrigger);

      await waitFor(() => {
        expect(screen.getByText("Virtual Wellness Platform")).toBeInTheDocument();
        expect(screen.getByText("virtual")).toBeInTheDocument();
        expect(screen.getByText("Zoom video consultations")).toBeInTheDocument();
      });
    });

    it("should handle incomplete business application", async () => {
      const incompleteApplication = {
        ...realWorldApplication,
        status: ONBOARDING_DRAFT_STATUS.PENDING,
        cards: realWorldApplication.cards.map((card, index) => ({
          ...card,
          isComplete: index < 2, // Only first 2 cards complete
        })),
        summary: {
          ...realWorldApplication.summary,
          completedSteps: 6,
          totalSteps: 14,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [incompleteApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      // Verify pending status - use getAllByText since "Pending" appears in both badge and stats
      const pendingElements = screen.getAllByText("Pending");
      expect(pendingElements.length).toBeGreaterThan(0);

      // Verify lower completion rate
      expect(screen.getByText("6/14")).toBeInTheDocument();

      // Check card completion status
      const cardsTrigger = screen.getByRole("button", { name: /marketing cards/i });
      await userEvent.click(cardsTrigger);

      await waitFor(() => {
        // Should have fewer completion indicators
        const completionIcons = document.querySelectorAll('[class*="text-green-500"]');
        expect(completionIcons.length).toBeLessThan(5);
      });
    });
  });

  describe("Multi-Application Management", () => {
    it("should handle multiple applications with different statuses", async () => {
      const applications = [
        realWorldApplication,
        {
          ...realWorldApplication,
          id: "app-2",
          status: ONBOARDING_DRAFT_STATUS.PENDING,
          businessInfo: {
            ...realWorldApplication.businessInfo,
            name: "Fitness Studio Pro",
            category: "Fitness",
          },
          summary: {
            ...realWorldApplication.summary,
            completedSteps: 8,
            totalSteps: 12,
          },
        },
        {
          ...realWorldApplication,
          id: "app-3",
          status: ONBOARDING_DRAFT_STATUS.APPROVED,
          businessInfo: {
            ...realWorldApplication.businessInfo,
            name: "Tech Consultancy Inc",
            category: "Technology",
          },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("3 applications found")).toBeInTheDocument();
      });

      // Verify all business names are visible
      expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      expect(screen.getByText("Fitness Studio Pro")).toBeInTheDocument();
      expect(screen.getByText("Tech Consultancy Inc")).toBeInTheDocument();

      // Verify total services calculation
      expect(screen.getByText("15")).toBeInTheDocument(); // Total services (5 + 5 + 5)
    });

    it("should allow admin to review multiple applications efficiently", async () => {
      const applications = [
        realWorldApplication,
        {
          ...realWorldApplication,
          id: "app-2",
          businessInfo: {
            ...realWorldApplication.businessInfo,
            name: "Quick Clinic",
            category: "Healthcare",
          },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("2 applications found")).toBeInTheDocument();
      });

      // Find and interact with first application
      const firstAppCard = screen.getByText("Wellness Spa & Retreat").closest('[class*="mb-6"]');
      expect(firstAppCard).toBeInTheDocument();

      if (firstAppCard) {
        const businessInfoTrigger = within(firstAppCard as HTMLElement).getByRole("button", {
          name: /business information/i,
        });
        await userEvent.click(businessInfoTrigger);

        await waitFor(() => {
          expect(screen.getByText("Health & Wellness")).toBeInTheDocument();
        });
      }

      // Find and interact with second application
      const secondAppCard = screen.getByText("Quick Clinic").closest('[class*="mb-6"]');
      expect(secondAppCard).toBeInTheDocument();

      if (secondAppCard) {
        const businessInfoTrigger = within(secondAppCard as HTMLElement).getByRole("button", {
          name: /business information/i,
        });
        await userEvent.click(businessInfoTrigger);

        await waitFor(() => {
          expect(screen.getByText("Healthcare")).toBeInTheDocument();
        });
      }

      // Verify both applications maintain their expanded state
      expect(screen.getByText("Health & Wellness")).toBeInTheDocument();
      expect(screen.getByText("Healthcare")).toBeInTheDocument();
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle large number of services efficiently", async () => {
      const largeServicesList = Array.from({ length: 50 }, (_, i) => ({
        id: `service-${i}`,
        name: `Service ${i + 1}`,
        category: `Category ${Math.floor(i / 10) + 1}`,
        description: `Description for service ${i + 1}`,
        duration: 30 + (i % 4) * 15,
        pricing: {
          type: "fixed",
          amount: 50 + i * 5,
          displayText: `$${50 + i * 5}`,
        },
        locations: ["main-location"],
        employees: [`employee-${i % 5}`],
      }));

      const largeApplication = {
        ...realWorldApplication,
        services: largeServicesList,
        summary: {
          ...realWorldApplication.summary,
          totalServices: 50,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [largeApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      // Verify large service count is displayed - find the specific summary card
      const servicesCard = screen.getByText("Services").closest(".bg-green-50");
      if (servicesCard) {
        expect(within(servicesCard as HTMLElement).getByText("50")).toBeInTheDocument();
      }

      const servicesTrigger = screen.getByRole("button", { name: /services \(50\)/i });
      await userEvent.click(servicesTrigger);

      await waitFor(() => {
        // Verify services are rendered (checking for first few)
        expect(screen.getByText("Service 1")).toBeInTheDocument();
        expect(screen.getByText("Service 2")).toBeInTheDocument();
        expect(screen.getByText("Service 3")).toBeInTheDocument();
      });
    });

    it("should handle applications with extensive resource lists", async () => {
      const extensiveResources = Array.from({ length: 30 }, (_, i) => ({
        id: `resource-${i}`,
        name: `Resource ${i + 1}`,
        type: ["room", "equipment", "vehicle"][i % 3],
        description: `Description for resource ${i + 1}`,
      }));

      const resourceHeavyApplication = {
        ...realWorldApplication,
        locations: [
          {
            ...realWorldApplication.locations[0],
            resources: extensiveResources,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [resourceHeavyApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      const locationsTrigger = screen.getByRole("button", { name: /locations/i });
      await userEvent.click(locationsTrigger);

      await waitFor(() => {
        expect(screen.getByText("Resource 1")).toBeInTheDocument();
        expect(screen.getByText("Resource 2")).toBeInTheDocument();
        // Verify the grid layout handles many resources
        expect(screen.getAllByText(/Resource \d+/).length).toBeGreaterThan(10);
      });
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should recover from temporary network failures", async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Network timeout"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ applications: [realWorldApplication] }),
        });
      });

      render(<AdminReviewClient />);

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText("Error Loading Applications")).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole("button", { name: /try again/i });
      await userEvent.click(retryButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });
    });

    it("should handle partial data gracefully", async () => {
      const partialApplication = {
        ...realWorldApplication,
        locations: [], // No locations
        employees: [], // No employees
        cards: [], // No cards
        summary: {
          ...realWorldApplication.summary,
          totalLocations: 0,
          totalEmployees: 0,
          totalCards: 0,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [partialApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Wellness Spa & Retreat")).toBeInTheDocument();
      });

      // Verify summary shows zeros - find within specific summary cards
      const locationsCard = screen.getByText("Locations").closest(".bg-blue-50");
      if (locationsCard) {
        expect(within(locationsCard as HTMLElement).getByText("0")).toBeInTheDocument();
      }

      // Verify sections without data don't show accordion triggers
      expect(screen.queryByRole("button", { name: /locations/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /employees/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cards/i })).not.toBeInTheDocument();

      // But services should still be shown
      expect(screen.getByRole("button", { name: /services/i })).toBeInTheDocument();
    });
  });
});
