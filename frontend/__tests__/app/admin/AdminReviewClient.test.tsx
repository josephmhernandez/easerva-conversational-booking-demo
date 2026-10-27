/**
 * Unit Tests for AdminReviewClient Component
 *
 * Tests the admin review client component that displays processed business
 * applications with authentication, data fetching, and UI rendering.
 */

jest.setTimeout(30000);

import AdminReviewClient from "@/app/admin/AdminReviewClient";
import { ONBOARDING_DRAFT_STATUS } from "@/app/constants/dbConstants";
import { render, screen, waitFor } from "@testing-library/react";
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

// Test data
const mockApplication = {
  id: "app-1",
  user_id: "user-1",
  business_id: "business-1",
  status: "submitted",
  current_step: "review",
  created_at: "2023-01-01T10:00:00Z",
  updated_at: "2023-01-02T15:30:00Z",
  last_saved_at: "2023-01-02T15:30:00Z",
  businessInfo: {
    name: "Test Business",
    slug: "test-business",
    category: "Technology",
    description: "A test business for unit testing",
    phone: "123-456-7890",
    email: "test@example.com",
    website: "https://test.com",
    logoUrl: "https://example.com/logo.jpg",
    tags: ["tech", "startup", "innovation"],
  },
  locations: [
    {
      id: "location-1",
      name: "Main Office",
      type: "physical" as const,
      address: "123 Main St, San Francisco, CA 94105",
      resources: [
        {
          id: "resource-1",
          name: "Conference Room A",
          type: "room",
          description: "Large conference room with projector",
        },
        {
          id: "resource-2",
          name: "Laptop Cart",
          type: "equipment",
          description: "Mobile laptop cart for presentations",
        },
      ],
    },
    {
      id: "mobile-service",
      name: "Mobile Service",
      type: "mobile" as const,
      address: "On-site service within 50 miles",
      resources: [],
    },
  ],
  services: [
    {
      id: "service-1",
      name: "Business Consultation",
      category: "Consulting",
      description: "Strategic business consultation service",
      duration: 60,
      pricing: {
        type: "fixed",
        amount: 150,
        displayText: "$150",
      },
      locations: ["location-1", "mobile-service"],
      employees: ["employee-1", "employee-2"],
    },
    {
      id: "service-2",
      name: "Technical Audit",
      category: "Technology",
      description: "Comprehensive technical system audit",
      duration: 120,
      pricing: {
        type: "variable",
        min: 200,
        max: 500,
      },
      locations: ["location-1"],
      employees: ["employee-1"],
    },
  ],
  employees: [
    {
      id: "employee-1",
      fullName: "John Doe",
      role: "Senior Consultant",
      email: "john@test.com",
      locationId: "location-1",
      takesBookings: true,
      services: ["service-1", "service-2"],
    },
    {
      id: "employee-2",
      fullName: "Jane Smith",
      role: "Junior Consultant",
      email: "jane@test.com",
      locationId: "location-1",
      takesBookings: true,
      services: ["service-1"],
    },
  ],
  cards: [
    {
      id: "card-1",
      name: "Business Overview Card",
      type: "business" as const,
      headline: "Welcome to Test Business",
      tagline: "Innovation through technology",
      description: "Your trusted technology partner",
      serviceIds: ["service-1", "service-2"],
      locationId: "location-1",
      mediaUrl: "https://example.com/card-image.jpg",
      price: "$150+",
      ctaText: "Get Started",
      isComplete: true,
    },
    {
      id: "card-2",
      name: "Service Card",
      type: "service" as const,
      headline: "Business Consultation",
      tagline: "Expert guidance for your business",
      description: "Strategic consultation services",
      serviceIds: ["service-1"],
      ctaText: "Book Consultation",
      isComplete: false,
    },
  ],
  summary: {
    totalLocations: 2,
    totalServices: 2,
    totalEmployees: 2,
    totalCards: 2,
    totalBookingCombinations: 0,
    completedSteps: 8,
    totalSteps: 10,
  },
  bookingCombinations: [],
  calendarManagement: {
    employeeCalendars: [],
    locationCalendars: [],
    resourceCalendars: [],
    summary: {
      totalEmployeeCalendars: 0,
      totalLocationCalendars: 0,
      totalResourceCalendars: 0,
      unconfiguredCount: 0,
    },
  },
};

describe("AdminReviewClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ applications: [mockApplication] }),
    });
  });

  describe("Authentication and Authorization", () => {
    it("should redirect to login on 401 error", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("should redirect to home on 403 error", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("should not redirect on successful authentication", async () => {
      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.getByText("Business Applications Review")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Loading States", () => {
    it("should hide loading spinner after data loads", async () => {
      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.getByText("Business Applications Review")).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should display error message on fetch failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Error Loading Applications")).toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to fetch applications: 500/)).toBeInTheDocument();
    });

    it("should display error message on network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Error Loading Applications")).toBeInTheDocument();
      });

      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    it("should allow retrying after error", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ applications: [mockApplication] }),
        });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("Error Loading Applications")).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /try again/i });
      await userEvent.click(retryButton);

      await waitFor(
        () => {
          expect(screen.getByText("Business Applications Review")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no applications found", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [] }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("No Applications Found")).toBeInTheDocument();
      });

      expect(
        screen.getByText("There are currently no business applications to review.")
      ).toBeInTheDocument();
    });

    it("should allow refreshing from empty state", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ applications: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ applications: [mockApplication] }),
        });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("No Applications Found")).toBeInTheDocument();
      });

      // Target the "Refresh" button specifically, not "Refresh Calendar"
      const refreshButtons = screen.getAllByRole("button", { name: /refresh/i });
      const refreshButton = refreshButtons.find((btn) => btn.textContent?.trim() === "Refresh");
      expect(refreshButton).toBeInTheDocument();
      await userEvent.click(refreshButton!);

      await waitFor(
        () => {
          expect(screen.getByText("Business Applications Review")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Data Display", () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplication] }),
      });

      render(<AdminReviewClient />);
      await waitFor(
        () => {
          expect(screen.getByText("Business Applications Review")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it("should display summary statistics", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const totalElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        return (
          (text.includes("1") &&
            element?.closest("div")?.textContent?.includes("Total Applications")) ||
          false
        );
      });
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it("should display application count in header", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const countElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        return text.match(/1\s+application\s+found/i) !== null;
      });
      expect(countElements.length).toBeGreaterThan(0);
    });

    it("should display business name and basic info", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const businessNameElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        return text.includes("Test Business");
      });
      expect(businessNameElements.length).toBeGreaterThan(0);

      const dateElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        return (
          text.match(/Jan(?:uary)?\s+1,\s+2023/i) !== null || text.match(/2023-01-01/i) !== null
        );
      });
      expect(dateElements.length).toBeGreaterThan(0);
    });

    it("should display status badge", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const statusBadges = screen.getAllByText("Submitted");
      const statusBadge = statusBadges.find(
        (badge) =>
          badge.closest("span")?.classList.contains("bg-blue-50") &&
          badge.closest("span")?.classList.contains("text-blue-700")
      );
      expect(statusBadge).toBeTruthy();
    });

    it("should display progress information", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const progressElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        return (
          (text.includes("8/10") && element?.closest("div")?.textContent?.includes("Progress")) ||
          false
        );
      });
      expect(progressElements.length).toBeGreaterThan(0);
    });

    it("should display summary stats for each application", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const locationStats = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        return (
          (text.includes("2") && element?.closest("div")?.textContent?.includes("Locations")) ||
          false
        );
      });
      expect(locationStats.length).toBeGreaterThan(0);

      const sections = ["Locations", "Services", "Employees", "Cards"];
      sections.forEach((section) => {
        const elements = screen.getAllByText(new RegExp(section, "i"));
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Status Badge Rendering", () => {
    it("should render submitted status correctly", async () => {
      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const statusBadges = screen.getAllByText("Submitted");
      const statusBadge = statusBadges.find(
        (badge) =>
          badge.closest("span")?.classList.contains("bg-blue-50") &&
          badge.closest("span")?.classList.contains("text-blue-700")
      );
      expect(statusBadge).toBeTruthy();
    });

    it("should render approved status correctly", async () => {
      const approvedApplication = {
        ...mockApplication,
        status: ONBOARDING_DRAFT_STATUS.APPROVED,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [approvedApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const statusBadges = screen.getAllByText("Approved");
      const statusBadge = statusBadges.find(
        (badge) =>
          badge.closest("span")?.classList.contains("bg-green-50") &&
          badge.closest("span")?.classList.contains("text-green-700")
      );
      expect(statusBadge).toBeTruthy();
    });

    it("should render pending status correctly", async () => {
      const pendingApplication = {
        ...mockApplication,
        status: ONBOARDING_DRAFT_STATUS.PENDING,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [pendingApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const statusBadges = screen.getAllByText("Pending");
      const statusBadge = statusBadges.find(
        (badge) =>
          badge.closest("span")?.classList.contains("bg-yellow-50") &&
          badge.closest("span")?.classList.contains("text-yellow-700")
      );
      expect(statusBadge).toBeTruthy();
    });
  });

  describe("Accordion Functionality", () => {
    beforeEach(async () => {
      render(<AdminReviewClient />);
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const headings = screen.getAllByRole("heading", { name: /business applications review/i });
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should allow expanding business information section", async () => {
      const businessInfoTrigger = screen.getAllByRole("button", {
        name: /business information/i,
      })[0];
      await userEvent.click(businessInfoTrigger);

      await waitFor(() => {
        expect(screen.getByText("Technology")).toBeInTheDocument();
        expect(screen.getByText("test-business")).toBeInTheDocument();
        expect(screen.getByText("A test business for unit testing")).toBeInTheDocument();
      });
    });

    it("should allow expanding locations section", async () => {
      const locationsTrigger = screen.getByRole("button", { name: /locations \(2\)/i });
      await userEvent.click(locationsTrigger);

      await waitFor(() => {
        expect(screen.getByText("Main Office")).toBeInTheDocument();
        expect(screen.getByText("123 Main St, San Francisco, CA 94105")).toBeInTheDocument();
        expect(screen.getByText("Mobile Service")).toBeInTheDocument();
      });
    });

    it("should allow expanding services section", async () => {
      const servicesTrigger = screen.getByRole("button", { name: /services \(2\)/i });
      await userEvent.click(servicesTrigger);

      await waitFor(() => {
        expect(screen.getByText("Business Consultation")).toBeInTheDocument();
        expect(screen.getByText("Technical Audit")).toBeInTheDocument();
        expect(screen.getByText("Strategic business consultation service")).toBeInTheDocument();
      });
    });

    it("should allow expanding employees section", async () => {
      const employeesTrigger = screen.getByRole("button", { name: /employees \(2\)/i });
      await userEvent.click(employeesTrigger);

      await waitFor(() => {
        const employee1 = screen.getByTestId("employee-employee-1");
        expect(employee1).toHaveTextContent("John Doe");
        expect(employee1).toHaveTextContent("Senior Consultant");
        expect(employee1).toHaveTextContent("john@test.com");

        const employee2 = screen.getByTestId("employee-employee-2");
        expect(employee2).toHaveTextContent("Jane Smith");
        expect(employee2).toHaveTextContent("Junior Consultant");
      });
    });

    it("should allow expanding cards section", async () => {
      const cardsTrigger = screen.getByRole("button", { name: /marketing cards \(2\)/i });
      await userEvent.click(cardsTrigger);

      await waitFor(() => {
        const card1 = screen.getByTestId("card-card-1");
        expect(card1).toHaveTextContent("Business Overview Card");
        expect(card1).toHaveTextContent("Welcome to Test Business");

        const card2 = screen.getByTestId("card-card-2");
        expect(card2).toHaveTextContent("Service Card");
        expect(card2).toHaveTextContent("Business Consultation");
      });
    });
  });

  describe("Location Details", () => {
    beforeEach(async () => {
      render(<AdminReviewClient />);
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const headings = screen.getAllByRole("heading", { name: /business applications review/i });
      expect(headings.length).toBeGreaterThan(0);

      const locationsTrigger = screen.getByRole("button", { name: /locations/i });
      await userEvent.click(locationsTrigger);
    });

    it("should display location types correctly", async () => {
      await waitFor(() => {
        expect(screen.getByText("physical")).toBeInTheDocument();
        expect(screen.getByText("mobile")).toBeInTheDocument();
      });
    });

    it("should display location resources", async () => {
      await waitFor(() => {
        expect(screen.getByText("Resources:")).toBeInTheDocument();
        expect(screen.getByText("Conference Room A")).toBeInTheDocument();
        expect(screen.getByText("Laptop Cart")).toBeInTheDocument();
        expect(screen.getByText("room")).toBeInTheDocument();
        expect(screen.getByText("equipment")).toBeInTheDocument();
      });
    });
  });

  describe("Service Details", () => {
    beforeEach(async () => {
      render(<AdminReviewClient />);
      await waitFor(
        () => {
          expect(screen.getByText("Business Applications Review")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const servicesTrigger = screen.getAllByRole("button", { name: /services/i })[0];
      await userEvent.click(servicesTrigger);
    });

    it("should display service pricing correctly", async () => {
      await waitFor(() => {
        expect(screen.getByText("$150")).toBeInTheDocument();
        expect(screen.getByText("$200-$500")).toBeInTheDocument();
      });
    });

    it("should display service duration and relationships", async () => {
      await waitFor(() => {
        expect(screen.getByText("Duration: 60 min")).toBeInTheDocument();
        expect(screen.getByText("Duration: 120 min")).toBeInTheDocument();
        expect(screen.getByText("Locations: 2")).toBeInTheDocument();
        expect(screen.getByText("Locations: 1")).toBeInTheDocument();
        expect(screen.getByText("Employees: 2")).toBeInTheDocument();
        expect(screen.getByText("Employees: 1")).toBeInTheDocument();
      });
    });
  });

  describe("Employee Details", () => {
    beforeEach(async () => {
      render(<AdminReviewClient />);
      await waitFor(
        () => {
          expect(screen.getByText("Business Applications Review")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const employeesTrigger = screen.getAllByRole("button", { name: /employees/i })[0];
      await userEvent.click(employeesTrigger);
    });

    it("should display employee booking status", async () => {
      await waitFor(
        () => {
          const employee1 = screen.getByTestId("employee-employee-1");
          expect(employee1).toHaveTextContent("John Doe");
          expect(employee1).toHaveTextContent("Senior Consultant");
          expect(employee1).toHaveTextContent("Takes Bookings");

          const employee2 = screen.getByTestId("employee-employee-2");
          expect(employee2).toHaveTextContent("Jane Smith");
          expect(employee2).toHaveTextContent("Junior Consultant");
          expect(employee2).toHaveTextContent("Takes Bookings");
        },
        { timeout: 5000 }
      );
    });

    it("should display employee service counts", async () => {
      await waitFor(
        () => {
          const employee1 = screen.getByTestId("employee-employee-1");
          expect(employee1).toHaveTextContent("Services: 2");

          const employee2 = screen.getByTestId("employee-employee-2");
          expect(employee2).toHaveTextContent("Services: 1");
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Card Details", () => {
    beforeEach(async () => {
      render(<AdminReviewClient />);
      await waitFor(
        () => {
          expect(screen.getByText("Business Applications Review")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const cardsTrigger = screen.getAllByRole("button", { name: /marketing cards/i })[0];
      await userEvent.click(cardsTrigger);
    });

    it("should display card completion status", async () => {
      await waitFor(
        () => {
          const card1 = screen.getByTestId("card-card-1");
          expect(card1).toHaveTextContent("Business Overview Card");
          expect(card1).toHaveTextContent("Welcome to Test Business");

          const completionIcon = screen.getByTestId("completion-icon");
          expect(completionIcon).toHaveClass("text-green-500");
        },
        { timeout: 5000 }
      );
    });

    it("should display card types and CTAs", async () => {
      await waitFor(
        () => {
          const card1 = screen.getByTestId("card-card-1");
          expect(card1).toHaveTextContent("Business Overview Card");
          expect(card1).toHaveTextContent("Welcome to Test Business");
          expect(card1).toHaveTextContent("Get Started");

          const card2 = screen.getByTestId("card-card-2");
          expect(card2).toHaveTextContent("Service Card");
          expect(card2).toHaveTextContent("Business Consultation");
          expect(card2).toHaveTextContent("Book Consultation");
        },
        { timeout: 5000 }
      );
    });

    it("should display card pricing when available", async () => {
      await waitFor(
        () => {
          const card1 = screen.getByTestId("card-card-1");
          expect(card1).toHaveTextContent("Business Overview Card");
          expect(card1).toHaveTextContent("Welcome to Test Business");
          expect(card1).toHaveTextContent("$150+");

          const card2 = screen.getByTestId("card-card-2");
          expect(card2).toHaveTextContent("Service Card");
          expect(card2).toHaveTextContent("Business Consultation");
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Refresh Functionality", () => {
    it("should call API again when refresh button is clicked", async () => {
      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const headings = screen.getAllByRole("heading", { name: /business applications review/i });
      expect(headings.length).toBeGreaterThan(0);

      const initialCalls = (global.fetch as jest.Mock).mock.calls.length;
      expect(initialCalls).toBeGreaterThanOrEqual(1);

      // Target the "Refresh" button in the header, not "Refresh Calendar"
      const refreshButtons = screen.getAllByRole("button", { name: /refresh/i });
      const refreshButton = refreshButtons.find((btn) => btn.textContent?.trim() === "Refresh");
      expect(refreshButton).toBeInTheDocument();
      await userEvent.click(refreshButton!);

      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  describe("Multiple Applications", () => {
    it("should display multiple applications correctly", async () => {
      const secondApplication = {
        ...mockApplication,
        id: "app-2",
        businessInfo: {
          ...mockApplication.businessInfo,
          name: "Second Business",
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplication, secondApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(() => {
        expect(screen.getByText("2 applications found")).toBeInTheDocument();
        expect(screen.getByText("Test Business")).toBeInTheDocument();
        expect(screen.getByText("Second Business")).toBeInTheDocument();
      });
    });

    it("should display correct summary statistics for multiple applications", async () => {
      const secondApplication = {
        ...mockApplication,
        id: "app-2",
        summary: {
          ...mockApplication.summary,
          totalServices: 3,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplication, secondApplication] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const totalAppsText = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        return text.match(/2\s+applications?\s+found/i) !== null;
      })[0];
      expect(totalAppsText).toBeInTheDocument();

      const totalServicesElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        return text.includes("Services") && text.includes("5");
      });
      expect(totalServicesElements.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    beforeEach(async () => {
      render(<AdminReviewClient />);
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const headings = screen.getAllByRole("heading", { name: /business applications review/i });
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should have proper heading structure", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const headings = screen.getAllByRole("heading", { level: 1 });
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0]).toHaveTextContent(/business applications review/i);
    });

    it("should have accessible accordion triggers", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const triggers = screen.getAllByRole("button", {
        name: /business information|locations|services|employees|marketing cards/i,
      });
      expect(triggers.length).toBeGreaterThan(0);

      triggers.forEach((trigger) => {
        expect(trigger).toHaveAttribute("aria-expanded");
      });
    });

    it("should have proper button labels", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Check that refresh buttons exist (both "Refresh" and "Refresh Calendar")
      const refreshButtons = screen.getAllByRole("button", { name: /refresh/i });
      expect(refreshButtons.length).toBeGreaterThan(0);

      // Verify at least one "Refresh" button exists
      const refreshButton = refreshButtons.find((btn) => btn.textContent?.trim() === "Refresh");
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe("Date Formatting", () => {
    beforeEach(async () => {
      render(<AdminReviewClient />);
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const headings = screen.getAllByRole("heading", { name: /business applications review/i });
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should format dates correctly", async () => {
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const dateElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        return (
          text.match(/Jan(?:uary)?\s+1,\s+2023/i) !== null || text.match(/2023-01-01/i) !== null
        );
      });
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe("Price Formatting", () => {
    beforeEach(async () => {
      render(<AdminReviewClient />);
      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const headings = screen.getAllByRole("heading", { name: /business applications review/i });
      expect(headings.length).toBeGreaterThan(0);

      const servicesTrigger = screen.getAllByRole("button", { name: /services/i })[0];
      await userEvent.click(servicesTrigger);
    });

    it("should format fixed prices correctly", async () => {
      await waitFor(() => {
        expect(screen.getAllByText(/\$150/i)[0]).toBeInTheDocument();
      });
    });

    it("should format variable prices correctly", async () => {
      await waitFor(() => {
        expect(screen.getAllByText(/\$200-\$500/i)[0]).toBeInTheDocument();
      });
    });
  });

  describe("Component Integration", () => {
    it("should handle all accordion sections being open simultaneously", async () => {
      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const headings = screen.getAllByRole("heading", { name: /business applications review/i });
      expect(headings.length).toBeGreaterThan(0);

      const businessInfoTrigger = screen.getAllByRole("button", {
        name: /business information/i,
      })[0];
      const locationsTrigger = screen.getAllByRole("button", { name: /locations/i })[0];
      const servicesTrigger = screen.getAllByRole("button", { name: /services/i })[0];
      const employeesTrigger = screen.getAllByRole("button", { name: /employees/i })[0];
      const cardsTrigger = screen.getAllByRole("button", { name: /marketing cards/i })[0];

      await userEvent.click(businessInfoTrigger);
      await userEvent.click(locationsTrigger);
      await userEvent.click(servicesTrigger);
      await userEvent.click(employeesTrigger);
      await userEvent.click(cardsTrigger);

      await waitFor(
        () => {
          const businessInfoContent = screen.getAllByText((content, element) => {
            const text = element?.textContent || "";
            return (
              (text.includes("Technology") &&
                element?.closest("div")?.textContent?.includes("Category")) ||
              false
            );
          });
          expect(businessInfoContent.length).toBeGreaterThan(0);

          const locationContent = screen.getAllByText((content, element) => {
            const text = element?.textContent || "";
            return (
              (text.includes("Main Office") &&
                element?.closest("div")?.textContent?.includes("physical")) ||
              false
            );
          });
          expect(locationContent.length).toBeGreaterThan(0);

          const serviceContent = screen.getAllByText((content, element) => {
            const text = element?.textContent || "";
            return (
              (text.includes("Business Consultation") &&
                element?.closest("div")?.textContent?.includes("Consulting")) ||
              false
            );
          });
          expect(serviceContent.length).toBeGreaterThan(0);

          const employee1 = screen.getByTestId("employee-employee-1");
          expect(employee1).toHaveTextContent("John Doe");
          expect(employee1).toHaveTextContent("Senior Consultant");

          const card1 = screen.getByTestId("card-card-1");
          expect(card1).toHaveTextContent("Business Overview Card");
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Calendar Management Display", () => {
    it("should display calendar management section with unconfigured badge", async () => {
      const mockApplicationWithCalendars = {
        ...mockApplication,
        calendarManagement: {
          employeeCalendars: [
            {
              id: "emp-1",
              name: "John Doe",
              email: "john@test.com",
              calendarId: "configure_later",
              calendarName: "",
              provider: "",
              isConfigured: false,
              needsConfiguration: true,
              usedInBookings: true,
            },
          ],
          locationCalendars: [],
          resourceCalendars: [],
          summary: {
            totalEmployeeCalendars: 1,
            totalLocationCalendars: 0,
            totalResourceCalendars: 0,
            unconfiguredCount: 1,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithCalendars] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const calendarTrigger = screen.getByRole("button", { name: /calendar management/i });
      expect(calendarTrigger).toBeInTheDocument();

      const unconfiguredBadge = screen.getByText("1 Need Configuration");
      expect(unconfiguredBadge).toBeInTheDocument();
    });

    it("should highlight unconfigured employee calendars in red", async () => {
      const mockApplicationWithCalendars = {
        ...mockApplication,
        calendarManagement: {
          employeeCalendars: [
            {
              id: "emp-1",
              name: "John Doe",
              email: "john@test.com",
              calendarId: "configure_later",
              calendarName: "",
              provider: "",
              isConfigured: false,
              needsConfiguration: true,
              usedInBookings: true,
            },
          ],
          locationCalendars: [],
          resourceCalendars: [],
          summary: {
            totalEmployeeCalendars: 1,
            totalLocationCalendars: 0,
            totalResourceCalendars: 0,
            unconfiguredCount: 1,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithCalendars] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const calendarTrigger = screen.getByRole("button", { name: /calendar management/i });
      await userEvent.click(calendarTrigger);

      await waitFor(() => {
        const employeeCalendar = screen.getByText("John Doe").closest(".bg-red-50");
        expect(employeeCalendar).toBeInTheDocument();
      });
    });

    it("should show 'Will be configured by employee' badge for pending calendars", async () => {
      const mockApplicationWithCalendars = {
        ...mockApplication,
        calendarManagement: {
          employeeCalendars: [
            {
              id: "emp-1",
              name: "John Doe",
              email: "john@test.com",
              calendarId: "configure_later",
              calendarName: "",
              provider: "",
              isConfigured: false,
              needsConfiguration: true,
              usedInBookings: true,
            },
          ],
          locationCalendars: [],
          resourceCalendars: [],
          summary: {
            totalEmployeeCalendars: 1,
            totalLocationCalendars: 0,
            totalResourceCalendars: 0,
            unconfiguredCount: 1,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithCalendars] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const calendarTrigger = screen.getByRole("button", { name: /calendar management/i });
      await userEvent.click(calendarTrigger);

      await waitFor(() => {
        const badge = screen.getByText("Will be configured by employee");
        expect(badge).toBeInTheDocument();
      });
    });

    it("should display configured calendars with provider and calendar name", async () => {
      const mockApplicationWithCalendars = {
        ...mockApplication,
        calendarManagement: {
          employeeCalendars: [
            {
              id: "emp-1",
              name: "John Doe",
              email: "john@test.com",
              calendarId: "cal-123",
              calendarName: "John's Work Calendar",
              provider: "Google",
              isConfigured: true,
              needsConfiguration: false,
              usedInBookings: true,
            },
          ],
          locationCalendars: [],
          resourceCalendars: [],
          summary: {
            totalEmployeeCalendars: 1,
            totalLocationCalendars: 0,
            totalResourceCalendars: 0,
            unconfiguredCount: 0,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithCalendars] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const calendarTrigger = screen.getByRole("button", { name: /calendar management/i });
      await userEvent.click(calendarTrigger);

      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
        expect(screen.getByText("John's Work Calendar")).toBeInTheDocument();
        expect(screen.getByText("Configured")).toBeInTheDocument();
      });
    });

    it("should highlight unconfigured location calendars in yellow", async () => {
      const mockApplicationWithCalendars = {
        ...mockApplication,
        calendarManagement: {
          employeeCalendars: [],
          locationCalendars: [
            {
              id: "loc-1",
              name: "Main Office",
              calendarId: "configure_later",
              calendarName: "",
              provider: "",
              isConfigured: false,
              needsConfiguration: true,
              usedInBookings: true,
            },
          ],
          resourceCalendars: [],
          summary: {
            totalEmployeeCalendars: 0,
            totalLocationCalendars: 1,
            totalResourceCalendars: 0,
            unconfiguredCount: 1,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithCalendars] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const calendarTrigger = screen.getByRole("button", { name: /calendar management/i });
      await userEvent.click(calendarTrigger);

      await waitFor(() => {
        const locationCalendar = screen.getByText("Main Office").closest(".bg-yellow-50");
        expect(locationCalendar).toBeInTheDocument();
      });
    });
  });

  describe("Booking Combination Card Association", () => {
    it("should display 'View Card' button when associatedCardId is present", async () => {
      const mockApplicationWithBookingCombo = {
        ...mockApplication,
        bookingCombinations: [
          {
            id: "combo-1",
            locationId: "location-1",
            locationName: "Main Office",
            locationAddress: "123 Main St, San Francisco, CA 94105",
            cardType: "employee-location",
            logicType: "and",
            services: [
              {
                id: "service-1",
                name: "Business Consultation",
                price: 150,
                locationId: "location-1",
                requiredResources: [],
              },
            ],
            employees: [],
            resources: [],
            requirements: [
              {
                id: "employee-1",
                name: "John Doe",
                type: "employee" as const,
                displayName: "John Doe",
              },
            ],
            combiningAllowed: true,
            combinedFromServices: [],
            associatedCardId: "card-1", // Card is associated
          },
        ],
        summary: {
          ...mockApplication.summary,
          totalBookingCombinations: 1,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithBookingCombo] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const bookingComboTrigger = screen.getByRole("button", {
        name: /booking combinations \(1\)/i,
      });
      await userEvent.click(bookingComboTrigger);

      await waitFor(() => {
        const viewCardButton = screen.getByRole("button", { name: /view card/i });
        expect(viewCardButton).toBeInTheDocument();
        expect(viewCardButton).not.toBeDisabled();
      });
    });

    it("should disable 'View Card' button when associatedCardId is null", async () => {
      const mockApplicationWithBookingCombo = {
        ...mockApplication,
        bookingCombinations: [
          {
            id: "combo-1",
            locationId: "location-1",
            locationName: "Main Office",
            locationAddress: "123 Main St, San Francisco, CA 94105",
            cardType: "employee-location",
            logicType: "and",
            services: [
              {
                id: "service-1",
                name: "Business Consultation",
                price: 150,
                locationId: "location-1",
                requiredResources: [],
              },
            ],
            employees: [],
            resources: [],
            requirements: [],
            combiningAllowed: true,
            combinedFromServices: [],
            associatedCardId: null, // No card associated
          },
        ],
        summary: {
          ...mockApplication.summary,
          totalBookingCombinations: 1,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithBookingCombo] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const bookingComboTrigger = screen.getByRole("button", {
        name: /booking combinations \(1\)/i,
      });
      await userEvent.click(bookingComboTrigger);

      await waitFor(() => {
        const viewCardButton = screen.getByRole("button", { name: /view card/i });
        expect(viewCardButton).toBeInTheDocument();
        expect(viewCardButton).toBeDisabled();
      });
    });

    it("should open correct card preview based on associatedCardId", async () => {
      const mockApplicationWithBookingCombo = {
        ...mockApplication,
        bookingCombinations: [
          {
            id: "combo-1",
            locationId: "location-1",
            locationName: "Main Office",
            locationAddress: "123 Main St, San Francisco, CA 94105",
            cardType: "employee-location",
            logicType: "and",
            services: [
              {
                id: "service-1",
                name: "Business Consultation",
                price: 150,
                locationId: "location-1",
                requiredResources: [],
              },
            ],
            employees: [],
            resources: [],
            requirements: [],
            combiningAllowed: true,
            combinedFromServices: [],
            associatedCardId: "card-2", // Uses card-2, not card-1
          },
        ],
        summary: {
          ...mockApplication.summary,
          totalBookingCombinations: 1,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithBookingCombo] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const bookingComboTrigger = screen.getByRole("button", {
        name: /booking combinations \(1\)/i,
      });
      await userEvent.click(bookingComboTrigger);

      await waitFor(() => {
        const viewCardButton = screen.getByRole("button", { name: /view card/i });
        expect(viewCardButton).toBeInTheDocument();
      });

      const viewCardButton = screen.getByRole("button", { name: /view card/i });
      await userEvent.click(viewCardButton);

      await waitFor(() => {
        // Should show card-2 details in preview (Service Card, not Business Overview Card)
        expect(screen.getByText("Service Card")).toBeInTheDocument();
        // Check for the Live Preview heading to ensure we're in preview mode
        expect(screen.getByText("Live Preview")).toBeInTheDocument();
      });
    });

    it("should display multiple booking combinations with different card associations", async () => {
      const mockApplicationWithMultipleCombos = {
        ...mockApplication,
        bookingCombinations: [
          {
            id: "combo-1",
            locationId: "location-1",
            locationName: "Main Office",
            locationAddress: "123 Main St",
            cardType: "employee-location",
            logicType: "and",
            services: [
              {
                id: "service-1",
                name: "Business Consultation",
                price: 150,
                locationId: "location-1",
                requiredResources: [],
              },
            ],
            employees: [],
            resources: [],
            requirements: [],
            combiningAllowed: true,
            combinedFromServices: [],
            associatedCardId: "card-1", // First combo uses card-1
          },
          {
            id: "combo-2",
            locationId: "location-1",
            locationName: "Main Office",
            locationAddress: "123 Main St",
            cardType: "employee-location",
            logicType: "and",
            services: [
              {
                id: "service-2",
                name: "Technical Audit",
                price: 350,
                locationId: "location-1",
                requiredResources: [],
              },
            ],
            employees: [],
            resources: [],
            requirements: [],
            combiningAllowed: true,
            combinedFromServices: [],
            associatedCardId: "card-2", // Second combo uses card-2
          },
        ],
        summary: {
          ...mockApplication.summary,
          totalBookingCombinations: 2,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithMultipleCombos] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const bookingComboTrigger = screen.getByRole("button", {
        name: /booking combinations \(2\)/i,
      });
      await userEvent.click(bookingComboTrigger);

      await waitFor(() => {
        const viewCardButtons = screen.getAllByRole("button", { name: /view card/i });
        expect(viewCardButtons).toHaveLength(2);
        expect(viewCardButtons[0]).not.toBeDisabled();
        expect(viewCardButtons[1]).not.toBeDisabled();
      });
    });

    it("should handle booking combinations with fallback business card", async () => {
      const mockApplicationWithBusinessCardFallback = {
        ...mockApplication,
        bookingCombinations: [
          {
            id: "combo-1",
            locationId: "location-1",
            locationName: "Main Office",
            locationAddress: "123 Main St",
            cardType: "employee-location",
            logicType: "and",
            services: [
              {
                id: "service-1",
                name: "Business Consultation",
                price: 150,
                locationId: "location-1",
                requiredResources: [],
              },
            ],
            employees: [],
            resources: [],
            requirements: [],
            combiningAllowed: true,
            combinedFromServices: [],
            associatedCardId: "card-1", // Uses business card as fallback
          },
        ],
        summary: {
          ...mockApplication.summary,
          totalBookingCombinations: 1,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ applications: [mockApplicationWithBusinessCardFallback] }),
      });

      render(<AdminReviewClient />);

      await waitFor(
        () => {
          expect(screen.queryByText("Loading business applications...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const bookingComboTrigger = screen.getByRole("button", {
        name: /booking combinations \(1\)/i,
      });
      await userEvent.click(bookingComboTrigger);

      const viewCardButton = screen.getByRole("button", { name: /view card/i });
      await userEvent.click(viewCardButton);

      await waitFor(() => {
        // Should show the business card (card-1)
        expect(screen.getByText("Business Overview Card")).toBeInTheDocument();
      });
    });
  });
});
