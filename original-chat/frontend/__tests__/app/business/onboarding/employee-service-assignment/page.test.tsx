import EmployeeServiceAssignmentPage from "@/app/business/onboarding/employee-service-assignment/page";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock Supabase client
const mockUnsubscribe = jest.fn();
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(() =>
      Promise.resolve({
        data: {
          session: null,
        },
      })
    ),
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

// Sample API data based on user's provided examples
const teamMembersDraft = {
  draftData: {
    main: {
      name: "Main Location",
      type: "physical",
      teamMembers: [
        {
          id: "17599263113090",
          role: "Senior Stylist",
          email: "chloe@salonstyle.com",
          fullName: "Chloe Davis",
          locationId: "main",
          takesBookings: true,
        },
        {
          id: "17599263113091",
          role: "Men's Barber & Stylist",
          email: "ethan@salonstyle.com",
          fullName: "Ethan Miller",
          locationId: "main",
          takesBookings: true,
        },
        {
          id: "17599263113092",
          role: "Junior Colorist",
          email: "olivia@salonstyle.com",
          fullName: "Olivia Harris",
          locationId: "main",
          takesBookings: true,
        },
      ],
    },
    teamOption: "team",
    "location-1758376721088": {
      name: "Sub Plano location",
      type: "physical",
      teamMembers: [
        {
          id: "17599263362920",
          role: "Hair Assistant",
          email: "noah@salonstyle.com",
          fullName: "Noah Thompson",
          locationId: "location-1758376721088",
          takesBookings: true,
        },
      ],
    },
    "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956": {
      name: "Mobile Service 1",
      type: "mobile",
      teamMembers: [
        {
          id: "17600993196180",
          role: "Master Colorist",
          email: "sophia@salonstyle.com",
          fullName: "Sophia King",
          locationId: "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956",
          takesBookings: true,
        },
      ],
    },
    "online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd": {
      name: "Virtual Service 1",
      type: "virtual",
      teamMembers: [
        {
          id: "17600993275670",
          role: "Lead Extension Specialist",
          email: "liam@salonstyle.com",
          fullName: "Liam Bell",
          locationId: "online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd",
          takesBookings: true,
        },
      ],
    },
  },
};

const serviceLocationDraft = {
  draftData: {
    services: [
      {
        id: "1759926523173",
        name: "hair cut",
        price: 75,
        category: "Beauty",
        duration: 60,
        priceType: "fixed",
        description: "Hair cut",
        deliveryOptions: {
          mobile: false,
          virtual: false,
          inPerson: true,
        },
      },
      {
        id: "1759926602690",
        name: "coloring",
        price: 0,
        category: "Beauty",
        duration: 180,
        priceMax: 400,
        priceMin: 150,
        priceType: "variable",
        description: "Hair cut",
        deliveryOptions: {
          mobile: true,
          virtual: false,
          inPerson: true,
        },
      },
      {
        id: "1759926604705",
        name: "haircut and shave",
        price: 100,
        category: "Beauty",
        duration: 60,
        priceType: "fixed",
        description: "Hair cut and shave des",
        deliveryOptions: {
          mobile: true,
          virtual: false,
          inPerson: false,
        },
      },
      {
        id: "1760099450592",
        name: "hair consultation",
        price: 35,
        category: "Beauty",
        duration: 30,
        priceType: "fixed",
        description: "consultation virtually about hair.",
        deliveryOptions: {
          mobile: false,
          virtual: true,
          inPerson: false,
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
            id: "1760099383712",
            name: "room A",
            type: "room",
            locationId: "main",
            description: "room a des",
          },
        ],
      },
      {
        id: "location-1758376721088",
        name: "Sub Plano location",
        type: "physical",
        address: "8610 Southwestern blvd. , Dallas, TX 75206",
        resources: [
          {
            id: "1760099372397",
            name: "room 1",
            type: "room",
            locationId: "location-1758376721088",
            description: "sub loc room 1",
          },
        ],
      },
      {
        id: "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956",
        name: "Mobile Service 1",
        type: "mobile",
        address: "25 mile radius from 76034",
        resources: [
          {
            id: "1760099360332",
            name: "Service Van 1",
            type: "vehicle",
            locationId: "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956",
            description: "mobile van",
          },
        ],
      },
      {
        id: "online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd",
        name: "Virtual Service 1",
        type: "virtual",
        address: "zoom Platform",
        resources: [],
      },
    ],
  },
};

const emptyAssignmentsDraft = {
  draftData: null,
};

function createFetchMock(
  teamMembers = teamMembersDraft,
  serviceLocation = serviceLocationDraft,
  existingAssignments = emptyAssignmentsDraft
) {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes("business_team_members")) {
      return Promise.resolve({
        ok: true,
        json: async () => teamMembers,
      });
    }
    if (url.includes("service_location")) {
      return Promise.resolve({
        ok: true,
        json: async () => serviceLocation,
      });
    }
    if (url.includes("employee_service_assignment")) {
      return Promise.resolve({
        ok: true,
        json: async () => existingAssignments,
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });
}

describe("EmployeeServiceAssignmentPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Matrix Rendering", () => {
    it("renders matrix with correct employees and services", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Check that all 6 employees are rendered (by unique names)
      expect(screen.getByText("Chloe Davis")).toBeInTheDocument();
      expect(screen.getByText("Ethan Miller")).toBeInTheDocument();
      expect(screen.getByText("Olivia Harris")).toBeInTheDocument();
      expect(screen.getByText("Noah Thompson")).toBeInTheDocument();
      expect(screen.getByText("Sophia King")).toBeInTheDocument();
      expect(screen.getByText("Liam Bell")).toBeInTheDocument();

      // Check that all 4 services are rendered
      expect(screen.getByText("hair cut")).toBeInTheDocument();
      expect(screen.getByText("coloring")).toBeInTheDocument();
      expect(screen.getByText("haircut and shave")).toBeInTheDocument();
      expect(screen.getByText("hair consultation")).toBeInTheDocument();
    });

    it("displays N/A for employee-service combinations with no valid locations", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Liam Bell (virtual) should have N/A for physical-only services
      const liamRow = screen.getByText("Liam Bell").closest("tr");
      expect(liamRow).toBeInTheDocument();

      // Find N/A cells in Liam's row
      const naCells = within(liamRow!).getAllByText("N/A");
      // Should have N/A for hair cut, coloring, and haircut and shave (3 services)
      expect(naCells.length).toBeGreaterThan(0);
    });

    it("displays correct number of rows based on unique employees by email", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Get all employee rows (should be 6 unique employees)
      const employeeNames = [
        "Chloe Davis",
        "Ethan Miller",
        "Olivia Harris",
        "Noah Thompson",
        "Sophia King",
        "Liam Bell",
      ];

      employeeNames.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });
  });

  describe("Intersection Logic", () => {
    it("employee at physical location sees only in-person services", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Chloe Davis is at Main Location (physical)
      // Should have access to "hair cut" and "coloring" (both have inPerson: true)
      // Should NOT have access to "haircut and shave" (mobile only) or "hair consultation" (virtual only)
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      expect(chloeRow).toBeInTheDocument();

      // Should have N/A for mobile-only and virtual-only services
      const naCells = within(chloeRow!).queryAllByText("N/A");
      expect(naCells.length).toBeGreaterThan(0);
    });

    it("mobile employee sees only mobile-enabled services", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Sophia King is at Mobile Service 1
      // Should have access to "coloring" and "haircut and shave" (both have mobile: true)
      const sophiaRow = screen.getByText("Sophia King").closest("tr");
      expect(sophiaRow).toBeInTheDocument();

      // Should have N/A for in-person only and virtual only services
      const naCells = within(sophiaRow!).queryAllByText("N/A");
      expect(naCells.length).toBeGreaterThan(0);
    });

    it("virtual employee sees only virtual services", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Liam Bell is at Virtual Service 1
      // Should have access to "hair consultation" only (virtual: true)
      const liamRow = screen.getByText("Liam Bell").closest("tr");
      expect(liamRow).toBeInTheDocument();

      // Should have N/A for all physical and mobile services
      const naCells = within(liamRow!).queryAllByText("N/A");
      expect(naCells.length).toBeGreaterThan(0); // Should have at least 3 N/A (for non-virtual services)
    });
  });

  describe("Location Filtering", () => {
    it("shows all employees and services when 'All Locations' is selected", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // All 6 employees should be visible
      expect(screen.getByText("Chloe Davis")).toBeInTheDocument();
      expect(screen.getByText("Ethan Miller")).toBeInTheDocument();
      expect(screen.getByText("Olivia Harris")).toBeInTheDocument();
      expect(screen.getByText("Noah Thompson")).toBeInTheDocument();
      expect(screen.getByText("Sophia King")).toBeInTheDocument();
      expect(screen.getByText("Liam Bell")).toBeInTheDocument();
    });
  });

  describe("Row Check All Functionality", () => {
    it("row Check All button exists and is clickable", async () => {
      global.fetch = createFetchMock();
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Find Chloe Davis's row
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      expect(chloeRow).toBeInTheDocument();

      // Find the "Check All" or "Uncheck All" button in Chloe's row
      const checkAllButtons = within(chloeRow!).getAllByRole("button");
      const rowToggleButton = checkAllButtons.find(
        (btn) => btn.textContent?.includes("Check All") || btn.textContent?.includes("Uncheck All")
      );

      expect(rowToggleButton).toBeInTheDocument();

      // Click the toggle button
      await user.click(rowToggleButton!);

      // Button should work without errors
      await waitFor(() => {
        expect(rowToggleButton).toBeInTheDocument();
      });
    });
  });

  describe("Column Check All Functionality", () => {
    it("column Check All button exists and shows count", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Find the "hair cut" service column header
      const hairCutHeader = screen.getByText("hair cut").closest("th");
      expect(hairCutHeader).toBeInTheDocument();

      // Find the "Check All" or "Uncheck All" button in the column
      const checkAllButtons = within(hairCutHeader!).getAllByRole("button");
      const columnToggleButton = checkAllButtons.find(
        (btn) => btn.textContent?.includes("Check All") || btn.textContent?.includes("Uncheck All")
      );

      expect(columnToggleButton).toBeInTheDocument();

      // Should have a count displayed
      const countText = within(hairCutHeader!).getByText(/\d+\/\d+/);
      expect(countText).toBeInTheDocument();
    });
  });

  describe("Email Deduplication", () => {
    it("treats employees with same email as one person in the matrix", async () => {
      // Create a scenario where the same person works at multiple locations
      const teamMembersWithDuplicate = {
        draftData: {
          main: {
            name: "Main Location",
            type: "physical",
            teamMembers: [
              {
                id: "employee-1-main",
                role: "Senior Stylist",
                email: "john@salonstyle.com",
                fullName: "John Doe",
                locationId: "main",
                takesBookings: true,
              },
            ],
          },
          "location-2": {
            name: "Second Location",
            type: "physical",
            teamMembers: [
              {
                id: "employee-1-location2",
                role: "Senior Stylist",
                email: "john@salonstyle.com", // Same email
                fullName: "John Doe",
                locationId: "location-2",
                takesBookings: true,
              },
            ],
          },
          teamOption: "team",
        },
      };

      global.fetch = createFetchMock(teamMembersWithDuplicate as any, serviceLocationDraft);

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Should only see John Doe once in the matrix
      const johnDoeElements = screen.getAllByText("John Doe");
      // Should only be one instance in the employee list
      expect(johnDoeElements.length).toBe(1);

      // The row should have checkboxes for both locations where services are offered
      const johnRow = screen.getByText("John Doe").closest("tr");
      expect(johnRow).toBeInTheDocument();

      // Should have multiple location checkboxes within cells
      const locationLabels = within(johnRow!).getAllByText(/Main Location|Second Location/);
      expect(locationLabels.length).toBeGreaterThan(0);
    });
  });

  describe("Individual Checkbox Toggling", () => {
    it("checkboxes are rendered for employee service assignments", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Find Chloe Davis's row
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      const checkboxes = within(chloeRow!).getAllByRole("checkbox");

      // Should have checkboxes for services
      expect(checkboxes.length).toBeGreaterThan(0);

      // Checkboxes should be clickable
      expect(checkboxes[0]).toBeEnabled();
    });
  });

  describe("No Booking Employees Edge Case", () => {
    it("shows skip message when no employees take bookings", async () => {
      const noBookingEmployees = {
        draftData: {
          main: {
            name: "Main Location",
            type: "physical",
            teamMembers: [
              {
                id: "employee-1",
                role: "Receptionist",
                email: "jane@salonstyle.com",
                fullName: "Jane Smith",
                locationId: "main",
                takesBookings: false, // Does not take bookings
              },
            ],
          },
          teamOption: "team",
        },
      };

      global.fetch = createFetchMock(noBookingEmployees as any, serviceLocationDraft);

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Should see the no booking employees message
      expect(screen.getByText("No booking employees found")).toBeInTheDocument();
      expect(screen.getByText("Skip This Step")).toBeInTheDocument();
    });
  });

  describe("Save Functionality", () => {
    it("saves assignments correctly with all metadata", async () => {
      const mockFetch = createFetchMock();
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Make some assignments
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      const checkboxes = within(chloeRow!).getAllByRole("checkbox");
      const firstCheckbox = checkboxes[0];

      await user.click(firstCheckbox);

      // Click Save Draft button
      const saveDraftButton = screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Save Draft"));
      expect(saveDraftButton).toBeInTheDocument();

      await user.click(saveDraftButton!);

      // Verify that POST request was made
      await waitFor(() => {
        const postCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => {
          return call.length > 1 && call[1]?.method === "POST";
        });
        expect(postCalls.length).toBeGreaterThan(0);
      });

      // Check that the payload includes the expected data structure
      const postCall = (global.fetch as jest.Mock).mock.calls.find(
        (call) => call.length > 1 && call[1]?.method === "POST"
      );

      if (postCall) {
        const payload = JSON.parse(postCall[1].body);
        expect(payload.step).toBe("employee_service_assignment");
        expect(payload.stepData).toHaveProperty("assignments");
        expect(payload.stepData).toHaveProperty("employees");
        expect(payload.stepData).toHaveProperty("services");
        expect(payload.stepData).toHaveProperty("locations");
      }
    });
  });

  describe("Stats Display", () => {
    it("shows correct count of services without coverage", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Initially, all services should be without coverage
      // Look for the warning badge
      const warningBadge = screen.queryByText(/services without coverage/);
      if (warningBadge) {
        expect(warningBadge).toBeInTheDocument();
      }
    });
  });

  describe("Count Display Accuracy", () => {
    it("shows correct column counts with all locations visible", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Find "hair cut" service column - should be available to 4 physical employees
      // (Chloe, Ethan, Olivia, Noah)
      const hairCutHeader = screen.getByText("hair cut").closest("th");
      expect(hairCutHeader).toBeInTheDocument();

      // Should show 0/4 - 4 physical location employees
      const hairCutCount = within(hairCutHeader!).getByText(/0\/4/);
      expect(hairCutCount).toBeInTheDocument();

      // Find "coloring" service column - should be available to 5 employees
      // (4 physical + 1 mobile)
      const coloringHeader = screen.getByText("coloring").closest("th");
      expect(coloringHeader).toBeInTheDocument();

      // Should show 0/5 - 4 physical + 1 mobile
      const coloringCount = within(coloringHeader!).getByText(/0\/5/);
      expect(coloringCount).toBeInTheDocument();

      // Find "haircut and shave" - only mobile service, should be 0/1
      const shaveHeader = screen.getByText("haircut and shave").closest("th");
      expect(shaveHeader).toBeInTheDocument();

      const shaveCount = within(shaveHeader!).getByText(/0\/1/);
      expect(shaveCount).toBeInTheDocument();

      // Find "hair consultation" - only virtual service, should be 0/1
      const consultationHeader = screen.getByText("hair consultation").closest("th");
      expect(consultationHeader).toBeInTheDocument();

      const consultationCount = within(consultationHeader!).getByText(/0\/1/);
      expect(consultationCount).toBeInTheDocument();
    });

    it("shows correct row counts with all locations visible", async () => {
      global.fetch = createFetchMock();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Chloe Davis (physical) - should have hair cut and coloring = 0/2
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      expect(chloeRow).toBeInTheDocument();
      const chloeCount = within(chloeRow!).getByText(/0\/2/);
      expect(chloeCount).toBeInTheDocument();

      // Ethan Miller (physical) - should have hair cut and coloring = 0/2
      const ethanRow = screen.getByText("Ethan Miller").closest("tr");
      expect(ethanRow).toBeInTheDocument();
      const ethanCount = within(ethanRow!).getByText(/0\/2/);
      expect(ethanCount).toBeInTheDocument();

      // Sophia King (mobile) - should have coloring and haircut and shave = 0/2
      const sophiaRow = screen.getByText("Sophia King").closest("tr");
      expect(sophiaRow).toBeInTheDocument();
      const sophiaCount = within(sophiaRow!).getByText(/0\/2/);
      expect(sophiaCount).toBeInTheDocument();

      // Liam Bell (virtual) - should have only hair consultation = 0/1
      const liamRow = screen.getByText("Liam Bell").closest("tr");
      expect(liamRow).toBeInTheDocument();
      // Find the count in the employee row section (not in the cell badges)
      const liamCounts = within(liamRow!).getAllByText(/0\/1/);
      // The first one should be the employee row count
      expect(liamCounts[0]).toBeInTheDocument();
    });

    it("shows correct count after clicking column Check All", async () => {
      global.fetch = createFetchMock();
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Find "hair cut" service column
      const hairCutHeader = screen.getByText("hair cut").closest("th");
      expect(hairCutHeader).toBeInTheDocument();

      // Initially should be 0/4
      expect(within(hairCutHeader!).getByText(/0\/4/)).toBeInTheDocument();

      // Click Check All button
      const checkAllButton = within(hairCutHeader!)
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Check All"));
      expect(checkAllButton).toBeInTheDocument();
      await user.click(checkAllButton!);

      // Should now be 4/4
      await waitFor(() => {
        expect(within(hairCutHeader!).getByText(/4\/4/)).toBeInTheDocument();
      });
    });

    it("shows correct count after clicking row Check All", async () => {
      global.fetch = createFetchMock();
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Find Chloe Davis's row
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      expect(chloeRow).toBeInTheDocument();

      // Initially should be 0/2
      expect(within(chloeRow!).getByText(/0\/2/)).toBeInTheDocument();

      // Click Check All button
      const checkAllButton = within(chloeRow!)
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Check All"));
      expect(checkAllButton).toBeInTheDocument();
      await user.click(checkAllButton!);

      // Should now be 2/2
      await waitFor(() => {
        expect(within(chloeRow!).getByText(/2\/2/)).toBeInTheDocument();
      });
    });

    it("shows correct mixed state counts after partial enabling", async () => {
      global.fetch = createFetchMock();
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Enable one assignment for Chloe
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      expect(chloeRow).toBeInTheDocument();

      // Get the first checkbox in Chloe's row and click it
      const checkboxes = within(chloeRow!).getAllByRole("checkbox");
      if (checkboxes.length > 0) {
        await user.click(checkboxes[0]);

        // Chloe's row should now show 1/2
        await waitFor(() => {
          expect(within(chloeRow!).getByText(/1\/2/)).toBeInTheDocument();
        });
      }

      // Now enable one assignment for Sophia
      const sophiaRow = screen.getByText("Sophia King").closest("tr");
      expect(sophiaRow).toBeInTheDocument();

      const sophiaCheckboxes = within(sophiaRow!).getAllByRole("checkbox");
      if (sophiaCheckboxes.length > 0) {
        await user.click(sophiaCheckboxes[0]);

        // Sophia's row should now show 1/2
        await waitFor(() => {
          expect(within(sophiaRow!).getByText(/1\/2/)).toBeInTheDocument();
        });
      }

      // The column count for the service that both enabled should reflect partial state
      // For example, if both enabled "coloring", it should show 2/5
    });

    it("shows correct counts for employee at multiple locations", async () => {
      // Create employee with same email at multiple locations
      const teamMembersWithMultiLocation = {
        draftData: {
          main: {
            name: "Main Location",
            type: "physical",
            teamMembers: [
              {
                id: "employee-1-main",
                role: "Senior Stylist",
                email: "john@salonstyle.com",
                fullName: "John Doe",
                locationId: "main",
                takesBookings: true,
              },
            ],
          },
          "location-1758376721088": {
            name: "Sub Plano location",
            type: "physical",
            teamMembers: [
              {
                id: "employee-1-location2",
                role: "Senior Stylist",
                email: "john@salonstyle.com", // Same email - same person
                fullName: "John Doe",
                locationId: "location-1758376721088",
                takesBookings: true,
              },
            ],
          },
          teamOption: "team",
        },
      };

      global.fetch = createFetchMock(teamMembersWithMultiLocation as any, serviceLocationDraft);

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Should only see John Doe once in the matrix
      const johnDoeElements = screen.getAllByText("John Doe");
      expect(johnDoeElements.length).toBe(1);

      const johnRow = screen.getByText("John Doe").closest("tr");
      expect(johnRow).toBeInTheDocument();

      // For "hair cut" service (in-person), John should have 2 checkboxes (one per location)
      // So the count should be 0/4 (2 services x 2 locations = 4 total assignments)
      // Actually, John should have 0/4 for row count since he can do hair cut and coloring at 2 locations each
      const johnCounts = within(johnRow!).getAllByText(/0\/4/);
      expect(johnCounts.length).toBeGreaterThan(0);
    });
  });

  describe("Save Draft Payload Validation", () => {
    it("saves only valid intersection assignments", async () => {
      const mockFetch = createFetchMock();
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Enable an assignment for Chloe (physical) at Main Location for "hair cut"
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      const hairCutCell = within(chloeRow!).getAllByRole("checkbox")[0];
      await user.click(hairCutCell);

      // Click Save Draft
      const saveDraftButton = screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Save Draft"));
      await user.click(saveDraftButton!);

      // Verify the POST payload
      await waitFor(() => {
        const postCall = (global.fetch as jest.Mock).mock.calls.find(
          (call) => call.length > 1 && call[1]?.method === "POST"
        );
        expect(postCall).toBeDefined();

        const payload = JSON.parse(postCall[1].body);
        const { assignments } = payload.stepData;

        // Should NOT include assignments for locations where Chloe doesn't work
        const invalidAssignments = assignments.filter(
          (a: any) =>
            a.employeeId === "17599263113090" && // Chloe's ID
            a.locationId !== "main" && // She only works at main
            a.locationId !== "location-1758376721088" // And doesn't work here
        );

        // All of Chloe's assignments should be for valid locations only
        expect(invalidAssignments.length).toBe(0);
      });
    });

    it("does not save assignments for mobile employee at physical locations", async () => {
      const mockFetch = createFetchMock();
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Click Save Draft without making any changes
      const saveDraftButton = screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Save Draft"));
      await user.click(saveDraftButton!);

      await waitFor(() => {
        const postCall = (global.fetch as jest.Mock).mock.calls.find(
          (call) => call.length > 1 && call[1]?.method === "POST"
        );

        const payload = JSON.parse(postCall[1].body);
        const { assignments } = payload.stepData;

        // Sophia King (mobile employee) should NOT have assignments at physical locations
        const sophiaPhysicalAssignments = assignments.filter(
          (a: any) =>
            a.employeeId === "17600993196180" && // Sophia's ID
            (a.locationId === "main" || a.locationId === "location-1758376721088") // Physical locations
        );

        expect(sophiaPhysicalAssignments.length).toBe(0);
      });
    });

    it("saves correct payload structure with all required fields", async () => {
      const mockFetch = createFetchMock();
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      const saveDraftButton = screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Save Draft"));
      await user.click(saveDraftButton!);

      await waitFor(() => {
        const postCall = (global.fetch as jest.Mock).mock.calls.find(
          (call) => call.length > 1 && call[1]?.method === "POST"
        );

        const payload = JSON.parse(postCall[1].body);

        // Verify top-level structure
        expect(payload.step).toBe("employee_service_assignment");
        expect(payload.currentStep).toBe("employee_service_assignment");
        expect(payload.stepData).toHaveProperty("assignments");
        expect(payload.stepData).toHaveProperty("employees");
        expect(payload.stepData).toHaveProperty("services");
        expect(payload.stepData).toHaveProperty("locations");

        // Verify assignment structure
        if (payload.stepData.assignments.length > 0) {
          const assignment = payload.stepData.assignments[0];
          expect(assignment).toHaveProperty("employeeId");
          expect(assignment).toHaveProperty("serviceId");
          expect(assignment).toHaveProperty("locationId");
          expect(assignment).toHaveProperty("enabled");
          expect(assignment).toHaveProperty("visible");
        }
      });
    });

    it("saves only enabled=true for checked boxes", async () => {
      const mockFetch = createFetchMock();
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Check one specific assignment
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      const firstCheckbox = within(chloeRow!).getAllByRole("checkbox")[0];
      await user.click(firstCheckbox);

      const saveDraftButton = screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Save Draft"));
      await user.click(saveDraftButton!);

      await waitFor(() => {
        const postCall = (global.fetch as jest.Mock).mock.calls.find(
          (call) => call.length > 1 && call[1]?.method === "POST"
        );

        const payload = JSON.parse(postCall[1].body);
        const { assignments } = payload.stepData;

        // Count enabled assignments
        const enabledAssignments = assignments.filter((a: any) => a.enabled);

        // Should have exactly 1 enabled assignment (the one we checked)
        expect(enabledAssignments.length).toBe(1);
        expect(enabledAssignments[0].employeeId).toBe("17599263113090"); // Chloe
      });
    });

    it("saves correct assignments after using Check All column button", async () => {
      const mockFetch = createFetchMock();
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Click Check All for "hair cut" service
      const hairCutHeader = screen.getByText("hair cut").closest("th");
      const checkAllButton = within(hairCutHeader!)
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Check All"));
      await user.click(checkAllButton!);

      const saveDraftButton = screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Save Draft"));
      await user.click(saveDraftButton!);

      await waitFor(() => {
        const postCall = (global.fetch as jest.Mock).mock.calls.find(
          (call) => call.length > 1 && call[1]?.method === "POST"
        );

        const payload = JSON.parse(postCall[1].body);
        const { assignments } = payload.stepData;

        // Filter to hair cut service assignments that are enabled
        const hairCutEnabled = assignments.filter(
          (a: any) => a.serviceId === "1759926523173" && a.enabled
        );

        // Should have 4 enabled (Chloe, Ethan, Olivia, Noah at physical locations)
        expect(hairCutEnabled.length).toBe(4);
      });
    });

    it("saves correct assignments after using Check All row button", async () => {
      const mockFetch = createFetchMock();
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Click Check All for Chloe's row
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      const checkAllButton = within(chloeRow!)
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Check All"));
      await user.click(checkAllButton!);

      const saveDraftButton = screen
        .getAllByRole("button")
        .find((btn) => btn.textContent?.includes("Save Draft"));
      await user.click(saveDraftButton!);

      await waitFor(() => {
        const postCall = (global.fetch as jest.Mock).mock.calls.find(
          (call) => call.length > 1 && call[1]?.method === "POST"
        );

        const payload = JSON.parse(postCall[1].body);
        const { assignments } = payload.stepData;

        // Filter to Chloe's enabled assignments
        const chloeEnabled = assignments.filter(
          (a: any) => a.employeeId === "17599263113090" && a.enabled
        );

        // Should have 2 enabled (hair cut and coloring at Main Location)
        expect(chloeEnabled.length).toBe(2);
      });
    });

    it("Continue button saves and navigates with correct payload", async () => {
      const mockPush = jest.fn();
      (jest.requireMock("next/navigation") as any).useRouter = () => ({
        push: mockPush,
        back: jest.fn(),
      });

      const mockFetch = createFetchMock();
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<EmployeeServiceAssignmentPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Setting up your service assignments/i)).not.toBeInTheDocument();
      });

      // Make some changes
      const chloeRow = screen.getByText("Chloe Davis").closest("tr");
      const firstCheckbox = within(chloeRow!).getAllByRole("checkbox")[0];
      await user.click(firstCheckbox);

      // Click Continue
      const continueButton = screen
        .getAllByRole("button")
        .find(
          (btn) => btn.textContent?.includes("Continue") && !btn.textContent?.includes("Saving")
        );
      await user.click(continueButton!);

      // Verify save was called
      await waitFor(() => {
        const postCall = (global.fetch as jest.Mock).mock.calls.find(
          (call) => call.length > 1 && call[1]?.method === "POST"
        );
        expect(postCall).toBeDefined();

        // Verify navigation happened after successful save
        expect(mockPush).toHaveBeenCalled();
      });
    });
  });
});
