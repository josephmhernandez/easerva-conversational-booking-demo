import "@testing-library/jest-dom";

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

// Mock the hybrid strategy combo creation logic
describe("Hybrid Strategy Combo Creation", () => {
  // Mock data structures using real API data structure
  const mockEmployeeServiceAssignmentData = {
    services: [
      {
        id: "1759605232884",
        name: "Math Tutoring",
        category: "Education",
        anonymous: false,
        basePrice: 75,
        locations: ["physical", "mobile", "virtual"],
        baseDuration: "60",
        requiresEmployee: true,
      },
      {
        id: "1759605237951",
        name: "SAT Prep",
        category: "Education",
        anonymous: false,
        basePrice: 120,
        locations: ["physical", "mobile", "virtual"],
        baseDuration: "90",
        requiresEmployee: true,
      },
    ],
    employees: [
      {
        id: "17596055482720",
        role: "Math Tutor",
        email: "alice@tutoring.com",
        fullName: "Alice Brown",
        locationId: "mobile",
        takesBookings: true,
      },
      {
        id: "17596055538060",
        role: "Math Tutor",
        email: "alice@tutoring.com",
        fullName: "Alice Brown",
        locationId: "virtual",
        takesBookings: true,
      },
      {
        id: "17596055394720",
        role: "Math Tutor",
        email: "alice@tutoring.com",
        fullName: "Alice Brown",
        locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
        takesBookings: true,
      },
    ],
    locations: [
      {
        id: "physical-493063f3-9ea0-4477-98ef-865701398706",
        name: "colleyvill loc",
        type: "physical",
        address: "4510 Mill Pond Ct, Colleyville, TX 76034-3678",
      },
      {
        id: "mobile-service",
        name: "Mobile Service",
        type: "mobile",
        address: "Mobile Service",
      },
      {
        id: "virtual-service",
        name: "Virtual Services",
        type: "virtual",
        address: "Online Platform",
      },
    ],
    assignments: [
      // Alice Brown assignments (mobile employee)
      {
        enabled: true,
        visible: true,
        serviceId: "1759605232884",
        employeeId: "17596055482720",
        locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605232884",
        employeeId: "17596055482720",
        locationId: "mobile-service",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605232884",
        employeeId: "17596055482720",
        locationId: "virtual-service",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605237951",
        employeeId: "17596055482720",
        locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605237951",
        employeeId: "17596055482720",
        locationId: "mobile-service",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605237951",
        employeeId: "17596055482720",
        locationId: "virtual-service",
      },
      // Alice Brown assignments (virtual employee)
      {
        enabled: true,
        visible: true,
        serviceId: "1759605232884",
        employeeId: "17596055538060",
        locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605232884",
        employeeId: "17596055538060",
        locationId: "mobile-service",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605232884",
        employeeId: "17596055538060",
        locationId: "virtual-service",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605237951",
        employeeId: "17596055538060",
        locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605237951",
        employeeId: "17596055538060",
        locationId: "mobile-service",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605237951",
        employeeId: "17596055538060",
        locationId: "virtual-service",
      },
      // Alice Brown assignments (physical employee)
      {
        enabled: true,
        visible: true,
        serviceId: "1759605232884",
        employeeId: "17596055394720",
        locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605232884",
        employeeId: "17596055394720",
        locationId: "mobile-service",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605232884",
        employeeId: "17596055394720",
        locationId: "virtual-service",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605237951",
        employeeId: "17596055394720",
        locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605237951",
        employeeId: "17596055394720",
        locationId: "mobile-service",
      },
      {
        enabled: true,
        visible: true,
        serviceId: "1759605237951",
        employeeId: "17596055394720",
        locationId: "virtual-service",
      },
    ],
  };

  const mockLoadedResources = [
    {
      id: "1759605129685",
      name: "RoomA",
      type: "room",
      description: "Room A des",
      locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
    },
    {
      id: "1759605131318",
      name: "RoomB",
      type: "room",
      description: "Room B des",
      locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
    },
  ];

  // Helper function to simulate the hybrid combo creation logic
  const createHybridCombos = (assignmentData: any, loadedResources: any[]) => {
    const combos: any[] = [];

    // Group assignments by location and employee
    const locationEmployeeCombos = new Map<string, Map<string, any[]>>();

    assignmentData.assignments.forEach((assignment: any) => {
      if (assignment.enabled && assignment.visible) {
        const locationId = assignment.locationId;
        const employeeId = assignment.employeeId;

        if (!locationEmployeeCombos.has(locationId)) {
          locationEmployeeCombos.set(locationId, new Map());
        }

        if (!locationEmployeeCombos.get(locationId)!.has(employeeId)) {
          locationEmployeeCombos.get(locationId)!.set(employeeId, []);
        }

        locationEmployeeCombos.get(locationId)!.get(employeeId)!.push(assignment);
      }
    });

    // Create combos for each location-employee combination
    locationEmployeeCombos.forEach((employeeMap, locationId) => {
      const location = assignmentData.locations.find((loc: any) => loc.id === locationId);
      if (!location) return;

      employeeMap.forEach((assignments, employeeId) => {
        const employee = assignmentData.employees.find((emp: any) => emp.id === employeeId);
        if (!employee) return;

        // Get services for this employee at this location
        const employeeServices = assignments
          .map((assignment: any) => {
            const service = assignmentData.services.find((s: any) => s.id === assignment.serviceId);
            if (!service) return null;

            return {
              id: service.id,
              name: service.name,
              price: service.basePrice,
              locationId: locationId,
            };
          })
          .filter(Boolean);

        if (employeeServices.length > 0) {
          // Get resources for this location
          const locationResources = loadedResources.filter((r: any) => r.locationId === locationId);

          combos.push({
            id: `combo-${locationId}-${employeeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            locationId: locationId,
            locationName: location.name,
            address: location.address,
            employeeId: employee.id,
            employeeName: employee.fullName,
            cardType: "employee-location",
            services: employeeServices,
            resources: locationResources.map((r: any) => ({
              ...r,
              calendar: {
                provider: "",
                calendarId: "",
                calendarName: "",
                connectionStatus: "disconnected",
              },
              bookingLogic: "required",
              capacity: {
                maxConcurrent: 1,
                bufferTime: 15,
              },
            })),
            employeeCalendar: {
              employeeId: employee.id,
              employeeName: employee.fullName,
              calendar: {
                provider: "",
                calendarId: "",
                calendarName: "",
                connectionStatus: "disconnected",
              },
              availability: {
                bufferTime: 15,
                serviceRestrictions: [],
              },
            },
            logicType: "any",
            combinedFromServices: [],
            combiningAllowed: true,
          });
        }
      });
    });

    return combos;
  };

  it("creates correct number of location-employee combinations", () => {
    const combos = createHybridCombos(mockEmployeeServiceAssignmentData, mockLoadedResources);

    // Expected combinations:
    // Alice Brown (mobile): physical, mobile, virtual (3 combinations)
    // Alice Brown (virtual): physical, mobile, virtual (3 combinations)
    // Alice Brown (physical): physical, mobile, virtual (3 combinations)
    // Total: 9 combinations
    expect(combos).toHaveLength(9);
  });

  it("creates combinations with correct employee information", () => {
    const combos = createHybridCombos(mockEmployeeServiceAssignmentData, mockLoadedResources);

    // Check that each combo has the correct employee information
    const aliceCombos = combos.filter((combo) => combo.employeeName === "Alice Brown");

    expect(aliceCombos).toHaveLength(9); // Alice has 9 location combinations

    // Check employee IDs
    aliceCombos.forEach((combo) => {
      expect(combo.employeeName).toBe("Alice Brown");
    });
  });

  it("creates combinations with correct location information", () => {
    const combos = createHybridCombos(mockEmployeeServiceAssignmentData, mockLoadedResources);

    // Check location information
    const physicalCombos = combos.filter(
      (combo) => combo.locationId === "physical-493063f3-9ea0-4477-98ef-865701398706"
    );
    const mobileCombos = combos.filter((combo) => combo.locationId === "mobile-service");
    const virtualCombos = combos.filter((combo) => combo.locationId === "virtual-service");

    expect(physicalCombos).toHaveLength(3); // 3 employees at physical location
    expect(mobileCombos).toHaveLength(3); // 3 employees at mobile location
    expect(virtualCombos).toHaveLength(3); // 3 employees at virtual location

    // Check location names
    physicalCombos.forEach((combo) => {
      expect(combo.locationName).toBe("colleyvill loc");
      expect(combo.address).toBe("4510 Mill Pond Ct, Colleyville, TX 76034-3678");
    });

    mobileCombos.forEach((combo) => {
      expect(combo.locationName).toBe("Mobile Service");
      expect(combo.address).toBe("Mobile Service");
    });

    virtualCombos.forEach((combo) => {
      expect(combo.locationName).toBe("Virtual Services");
      expect(combo.address).toBe("Online Platform");
    });
  });

  it("assigns correct services to each combination", () => {
    const combos = createHybridCombos(mockEmployeeServiceAssignmentData, mockLoadedResources);

    // Each combination should have 2 services (Math Tutoring and SAT Prep)
    combos.forEach((combo) => {
      expect(combo.services).toHaveLength(2);
      expect(combo.services.map((s: any) => s.name)).toContain("Math Tutoring");
      expect(combo.services.map((s: any) => s.name)).toContain("SAT Prep");
    });
  });

  it("assigns correct resources to each combination", () => {
    const combos = createHybridCombos(mockEmployeeServiceAssignmentData, mockLoadedResources);

    // Physical location combinations should have resources
    const physicalCombos = combos.filter(
      (combo) => combo.locationId === "physical-493063f3-9ea0-4477-98ef-865701398706"
    );
    physicalCombos.forEach((combo) => {
      expect(combo.resources).toHaveLength(2); // 2 resources at physical location
      expect(combo.resources.map((r: any) => r.name)).toContain("RoomA");
      expect(combo.resources.map((r: any) => r.name)).toContain("RoomB");
    });

    // Mobile and virtual location combinations should have no resources
    const mobileCombos = combos.filter((combo) => combo.locationId === "mobile-service");
    const virtualCombos = combos.filter((combo) => combo.locationId === "virtual-service");

    mobileCombos.forEach((combo) => {
      expect(combo.resources).toHaveLength(0);
    });

    virtualCombos.forEach((combo) => {
      expect(combo.resources).toHaveLength(0);
    });
  });

  it("sets correct card type for hybrid combinations", () => {
    const combos = createHybridCombos(mockEmployeeServiceAssignmentData, mockLoadedResources);

    // All hybrid combinations should have cardType "employee-location"
    combos.forEach((combo) => {
      expect(combo.cardType).toBe("employee-location");
    });
  });

  it("sets correct logic type and combining settings", () => {
    const combos = createHybridCombos(mockEmployeeServiceAssignmentData, mockLoadedResources);

    // All combinations should have the same logic settings
    combos.forEach((combo) => {
      expect(combo.logicType).toBe("any");
      expect(combo.combiningAllowed).toBe(true);
      expect(combo.combinedFromServices).toEqual([]);
    });
  });

  it("includes employee calendar information", () => {
    const combos = createHybridCombos(mockEmployeeServiceAssignmentData, mockLoadedResources);

    combos.forEach((combo) => {
      expect(combo.employeeCalendar).toBeDefined();
      expect(combo.employeeCalendar.employeeId).toBe(combo.employeeId);
      expect(combo.employeeCalendar.employeeName).toBe(combo.employeeName);
      expect(combo.employeeCalendar.calendar).toBeDefined();
      expect(combo.employeeCalendar.availability).toBeDefined();
    });
  });

  it("handles empty assignment data gracefully", () => {
    const emptyAssignmentData = {
      services: [],
      employees: [],
      locations: [],
      assignments: [],
    };

    const combos = createHybridCombos(emptyAssignmentData, mockLoadedResources);

    expect(combos).toHaveLength(0);
  });

  it("handles assignments with disabled or invisible assignments", () => {
    const assignmentDataWithDisabled = {
      ...mockEmployeeServiceAssignmentData,
      assignments: [
        ...mockEmployeeServiceAssignmentData.assignments,
        {
          enabled: false, // Disabled assignment
          visible: true,
          serviceId: "1759605232884",
          employeeId: "17596055482720",
          locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
        },
        {
          enabled: true,
          visible: false, // Invisible assignment
          serviceId: "1759605232884",
          employeeId: "17596055482720",
          locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithDisabled, mockLoadedResources);

    // Should still create the same number of combinations (disabled/invisible assignments are ignored)
    expect(combos).toHaveLength(9);
  });

  it("handles missing employee or location data gracefully", () => {
    const assignmentDataWithMissing = {
      ...mockEmployeeServiceAssignmentData,
      assignments: [
        ...mockEmployeeServiceAssignmentData.assignments,
        {
          enabled: true,
          visible: true,
          serviceId: "1759605232884",
          employeeId: "non-existent-employee",
          locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
        },
        {
          enabled: true,
          visible: true,
          serviceId: "1759605232884",
          employeeId: "17596055482720",
          locationId: "non-existent-location",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithMissing, mockLoadedResources);

    // Should still create valid combinations and skip invalid ones
    expect(combos).toHaveLength(9);

    // All combinations should have valid employee and location data
    combos.forEach((combo) => {
      expect(combo.employeeName).toBeDefined();
      expect(combo.locationName).toBeDefined();
    });
  });

  it("generates unique IDs for each combination", () => {
    const combos = createHybridCombos(mockEmployeeServiceAssignmentData, mockLoadedResources);

    const ids = combos.map((combo) => combo.id);
    const uniqueIds = new Set(ids);

    expect(ids).toHaveLength(uniqueIds.size); // All IDs should be unique
  });

  it("creates combinations only for employees with services", () => {
    const assignmentDataWithEmptyEmployee = {
      ...mockEmployeeServiceAssignmentData,
      employees: [
        ...mockEmployeeServiceAssignmentData.employees,
        {
          id: "emp-empty",
          role: "Empty Employee",
          email: "empty@example.com",
          fullName: "Empty Employee",
          locationId: "physical-493063f3-9ea0-4477-98ef-865701398706",
          takesBookings: true,
        },
      ],
      // No assignments for the empty employee
    };

    const combos = createHybridCombos(assignmentDataWithEmptyEmployee, mockLoadedResources);

    // Should not create combinations for employees without services
    const emptyEmployeeCombos = combos.filter((combo) => combo.employeeName === "Empty Employee");
    expect(emptyEmployeeCombos).toHaveLength(0);

    // Should still create combinations for employees with services
    expect(combos).toHaveLength(9);
  });
});
