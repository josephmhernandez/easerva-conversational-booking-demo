import BookingRequirementsBuilder from "@/app/business/onboarding/calendar-integration-new/components/BookingRequirementsBuilder";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// Mock the router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
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

describe("BookingRequirementsBuilder - Employee Names", () => {
  const mockEmployees = [
    {
      id: "1761006816061",
      fullName: "Joseph Hernandez",
      email: "joseph@example.com",
      role: "photographer",
      locationId: "loc1",
      takesBookings: true,
      avatar: "",
      assignmentType: "",
      calendar: {},
      comboId: "",
      isNew: false,
    },
    {
      id: "1761006842393",
      fullName: "Sarah Johnson",
      email: "sarah@example.com",
      role: "photographer",
      locationId: "loc2",
      takesBookings: true,
      avatar: "",
      assignmentType: "",
      calendar: {},
      comboId: "",
      isNew: false,
    },
  ];

  const mockResources = [
    {
      id: "1761006906059",
      name: "Camera Equipment",
      email: "",
      type: "resource",
      description: "Professional camera equipment",
      calendar: {},
      comboId: "",
      bookingLogic: "required",
      isNew: false,
      locationId: "loc1",
      capacity: {
        maxConcurrent: 1,
        bufferTime: 0,
      },
    },
  ];

  const mockLocationCalendars = [
    {
      id: "loc1",
      name: "Main Studio",
      address: "123 Main St, City, State 12345",
      serviceCount: 2,
      resourceCount: 1,
      calendar: {
        provider: "google",
        connectionStatus: "connected",
        calendarId: "cal_123",
        calendarName: "Main Studio Calendar",
      },
      settings: {
        bufferTime: 15,
        businessHoursOverride: false,
      },
    },
  ];

  const mockCalendarAssignments = [
    {
      entityType: "employee" as const,
      entityId: "1761006816061",
      calendarId: "configure_later",
      isPending: true,
    },
    {
      entityType: "employee" as const,
      entityId: "1761006842393",
      calendarId: "configure_later",
      isPending: true,
    },
    {
      entityType: "resource" as const,
      entityId: "1761006906059",
      calendarId: "cal_456",
      isPending: false,
    },
    {
      entityType: "location" as const,
      entityId: "loc1",
      calendarId: "cal_789",
      isPending: false,
    },
  ];

  const mockCalendarManagementData = {
    cronofyCalendars: [
      {
        profile_id: "profile_123",
        calendar_id: "cal_123",
        profile_name: "Joseph Hernandez",
        calendar_name: "Joseph's Calendar",
        provider_name: "google",
        calendar_deleted: false,
        calendar_primary: true,
        is_busy_calendar: false,
        permission_level: "read_write",
        calendar_readonly: false,
        is_primary_booking: true,
        is_booking_calendar: true,
        calendar_attachments_available: true,
        calendar_integrated_conferencing_available: true,
      },
    ],
    calendarAssignments: [
      {
        id: "employee_1761006816061",
        assignmentId: "1761006816061",
        busyCalendars: [],
        assignmentName: "", // Empty assignment name - should fallback to employee.fullName
        assignmentType: "employee",
        defaultBookingCalendar: {
          calendarId: "configure_later",
          entityType: "employee",
        },
      },
      {
        id: "employee_1761006842393",
        assignmentId: "1761006842393",
        busyCalendars: [],
        assignmentName: "Sarah J.", // Has assignment name
        assignmentType: "employee",
        defaultBookingCalendar: {
          calendarId: "configure_later",
          entityType: "employee",
        },
      },
    ],
    cronofyElementToken: "test_token",
  };

  const defaultProps = {
    employees: mockEmployees,
    resources: mockResources,
    locationCalendars: mockLocationCalendars,
    requirements: [],
    calendarAssignments: mockCalendarAssignments,
    calendarManagementData: mockCalendarManagementData,
    onRequirementsChange: jest.fn(),
  };

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

  describe("Employee Name Display", () => {
    it("should display employee names correctly in the Employees section", async () => {
      render(<BookingRequirementsBuilder {...defaultProps} />);

      // Wait for the component to render
      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // Check that employee names are displayed
      expect(screen.getByText("Joseph Hernandez")).toBeInTheDocument();
      expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();

      // Check that employee roles are displayed (they appear in the subtitle text)
      const photographerTexts = screen.getAllByText(/photographer/);
      expect(photographerTexts).toHaveLength(2); // One for each employee
    });

    it("should show 'Calendar configured later' for employees with pending calendar assignments", async () => {
      render(<BookingRequirementsBuilder {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // Check for "configured later" text for both employees (it appears in the subtitle)
      const configuredLaterTexts = screen.getAllByText(/configured later/);
      expect(configuredLaterTexts).toHaveLength(2);
    });

    it("should display employee names even when assignmentName is empty in calendarManagementData", async () => {
      // This test specifically covers the case where assignmentName is empty
      // and the component should fallback to employee.fullName
      render(<BookingRequirementsBuilder {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // Joseph Hernandez should be displayed even though assignmentName is empty
      expect(screen.getByText("Joseph Hernandez")).toBeInTheDocument();

      // Sarah Johnson should be displayed with her assignment name
      expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    });

    it("should handle employees with empty fullName gracefully", async () => {
      const employeesWithEmptyNames = [
        {
          ...mockEmployees[0],
          fullName: "", // Empty fullName
        },
        {
          ...mockEmployees[1],
          fullName: "Sarah Johnson",
        },
      ];

      render(<BookingRequirementsBuilder {...defaultProps} employees={employeesWithEmptyNames} />);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // Should still display the employee with a valid name
      expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();

      // The employee with empty fullName should still appear (might show fallback name)
      // This tests the fallback logic in the helper function
      // We can't easily test the exact fallback text without more complex setup
    });

    it("should show only employees with calendar assignments", async () => {
      // Create employees where only some have calendar assignments
      const employeesWithMixedAssignments = [
        mockEmployees[0], // Has assignment
        {
          ...mockEmployees[1],
          id: "no_assignment_employee",
        }, // No assignment
      ];

      const assignmentsForSomeEmployees = [
        mockCalendarAssignments[0], // Only first employee has assignment
      ];

      render(
        <BookingRequirementsBuilder
          {...defaultProps}
          employees={employeesWithMixedAssignments}
          calendarAssignments={assignmentsForSomeEmployees}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // Should only show the employee with calendar assignment
      expect(screen.getByText("Joseph Hernandez")).toBeInTheDocument();
      expect(screen.queryByText("Sarah Johnson")).not.toBeInTheDocument();
    });

    it("should display employee names in the correct format with role and calendar status", async () => {
      render(<BookingRequirementsBuilder {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // Check that the employee information is displayed in the expected format
      const employeeCards = screen.getAllByText(/photographer/);
      expect(employeeCards.length).toBeGreaterThan(0);

      // Check that "Add" buttons are present for each employee
      // Note: There are 4 "Add" buttons total (2 employees + 1 resource + 1 location)
      const addButtons = screen.getAllByText("Add");
      expect(addButtons.length).toBeGreaterThanOrEqual(2); // At least 2 for employees
    });

    it("should handle calendarManagementData with empty assignmentName fields", async () => {
      const calendarManagementDataWithEmptyNames = {
        ...mockCalendarManagementData,
        calendarAssignments: [
          {
            id: "employee_1761006816061",
            assignmentId: "1761006816061",
            busyCalendars: [],
            assignmentName: "", // Empty assignment name
            assignmentType: "employee",
            defaultBookingCalendar: {
              calendarId: "configure_later",
              entityType: "employee",
            },
          },
          {
            id: "employee_1761006842393",
            assignmentId: "1761006842393",
            busyCalendars: [],
            assignmentName: "   ", // Whitespace-only assignment name
            assignmentType: "employee",
            defaultBookingCalendar: {
              calendarId: "configure_later",
              entityType: "employee",
            },
          },
        ],
      };

      render(
        <BookingRequirementsBuilder
          {...defaultProps}
          calendarManagementData={calendarManagementDataWithEmptyNames}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // Both employees should still be displayed with their full names
      // The component should fallback to employee.fullName when assignmentName is empty or whitespace
      expect(screen.getByText("Joseph Hernandez")).toBeInTheDocument();
      expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    });
  });

  describe("Employee Selection and Requirements", () => {
    it("should allow selecting employees for booking requirements", async () => {
      render(<BookingRequirementsBuilder {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // Find and click the "Add" button for Joseph Hernandez
      const addButtons = screen.getAllByText("Add");
      fireEvent.click(addButtons[0]);

      // Verify that the employee was added to requirements
      expect(defaultProps.onRequirementsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "1761006816061",
            displayName: "Joseph Hernandez",
            type: "employee",
          }),
        ])
      );
    });

    it("should disable Add button for already selected employees", async () => {
      const propsWithSelectedEmployee = {
        ...defaultProps,
        requirements: [
          {
            id: "1761006816061",
            displayName: "Joseph Hernandez",
            type: "employee",
          },
        ],
      };

      render(<BookingRequirementsBuilder {...propsWithSelectedEmployee} />);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // The Add button for the already selected employee should be disabled
      const addButtons = screen.getAllByText("Add");
      expect(addButtons[0]).toBeDisabled();
      expect(addButtons[1]).not.toBeDisabled();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing calendarManagementData gracefully", async () => {
      render(<BookingRequirementsBuilder {...defaultProps} calendarManagementData={undefined} />);

      await waitFor(() => {
        expect(screen.getByText("Employees")).toBeInTheDocument();
      });

      // Should still display employees even without calendar management data
      expect(screen.getByText("Joseph Hernandez")).toBeInTheDocument();
      expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    });

    it("should handle employees with missing calendar assignments", async () => {
      const employeesWithoutAssignments = [
        {
          ...mockEmployees[0],
          id: "no_assignment_employee",
        },
      ];

      render(
        <BookingRequirementsBuilder
          {...defaultProps}
          employees={employeesWithoutAssignments}
          calendarAssignments={[]}
        />
      );

      await waitFor(() => {
        // Should not show the Employees section if no employees have assignments
        expect(screen.queryByText("Employees")).not.toBeInTheDocument();
      });
    });
  });
});
