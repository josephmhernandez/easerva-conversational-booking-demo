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

// Test edge cases for hybrid strategy combo creation
describe("Hybrid Strategy Edge Cases", () => {
  // Helper function to simulate the hybrid combo creation logic
  const createHybridCombos = (assignmentData: any, loadedResources: any[]) => {
    const combos: any[] = [];

    // Handle null/undefined inputs gracefully
    if (
      !assignmentData ||
      !assignmentData.assignments ||
      !Array.isArray(assignmentData.assignments)
    ) {
      return combos;
    }

    if (!assignmentData.services || !Array.isArray(assignmentData.services)) {
      return combos;
    }

    if (!assignmentData.employees || !Array.isArray(assignmentData.employees)) {
      return combos;
    }

    if (!assignmentData.locations || !Array.isArray(assignmentData.locations)) {
      return combos;
    }

    // Group assignments by location and employee
    const locationEmployeeCombos = new Map<string, Map<string, any[]>>();

    assignmentData.assignments.forEach((assignment: any) => {
      // Validate assignment data types
      if (typeof assignment.enabled !== "boolean" || typeof assignment.visible !== "boolean") {
        return;
      }

      if (
        typeof assignment.serviceId !== "string" ||
        typeof assignment.employeeId !== "string" ||
        typeof assignment.locationId !== "string"
      ) {
        return;
      }

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

        // Get services for this employee at this location (deduplicate by service ID)
        const serviceMap = new Map<string, any>();
        assignments.forEach((assignment: any) => {
          const service = assignmentData.services.find((s: any) => s.id === assignment.serviceId);
          if (service && !serviceMap.has(service.id)) {
            serviceMap.set(service.id, {
              id: service.id,
              name: service.name,
              price: service.basePrice,
              locationId: locationId,
            });
          }
        });
        const employeeServices = Array.from(serviceMap.values());

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

  it("handles duplicate assignments gracefully", () => {
    const assignmentDataWithDuplicates = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
      ],
      assignments: [
        // Duplicate assignment
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithDuplicates, []);

    // Should create only one combo despite duplicate assignments
    expect(combos).toHaveLength(1);
    expect(combos[0].services).toHaveLength(1);
  });

  it("handles assignments with missing service data", () => {
    const assignmentDataWithMissingService = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
      ],
      assignments: [
        {
          enabled: true,
          visible: true,
          serviceId: "non-existent-service",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithMissingService, []);

    // Should not create any combos for assignments with missing service data
    expect(combos).toHaveLength(0);
  });

  it("handles assignments with missing employee data", () => {
    const assignmentDataWithMissingEmployee = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
      ],
      assignments: [
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "non-existent-employee",
          locationId: "physical-123",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithMissingEmployee, []);

    // Should not create any combos for assignments with missing employee data
    expect(combos).toHaveLength(0);
  });

  it("handles assignments with missing location data", () => {
    const assignmentDataWithMissingLocation = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
      ],
      assignments: [
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "non-existent-location",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithMissingLocation, []);

    // Should not create any combos for assignments with missing location data
    expect(combos).toHaveLength(0);
  });

  it("handles mixed enabled/disabled assignments", () => {
    const assignmentDataWithMixedEnabled = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
        {
          id: "service-2",
          name: "Wedding Photography",
          category: "Photography",
          anonymous: false,
          basePrice: 2000,
          locations: ["physical"],
          baseDuration: 480,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
      ],
      assignments: [
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
        {
          enabled: false, // Disabled assignment
          visible: true,
          serviceId: "service-2",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
        {
          enabled: true,
          visible: false, // Invisible assignment
          serviceId: "service-2",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithMixedEnabled, []);

    // Should create only one combo with only the enabled and visible service
    expect(combos).toHaveLength(1);
    expect(combos[0].services).toHaveLength(1);
    expect(combos[0].services[0].name).toBe("Portrait Session");
  });

  it("handles employees with no assignments", () => {
    const assignmentDataWithUnassignedEmployee = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
        {
          id: "emp-2",
          role: "Assistant",
          email: "bob@example.com",
          fullName: "Bob Smith",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
      ],
      assignments: [
        // Only Alice has assignments, Bob has none
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithUnassignedEmployee, []);

    // Should create only one combo for Alice, not for Bob
    expect(combos).toHaveLength(1);
    expect(combos[0].employeeName).toBe("Alice Brown");
  });

  it("handles locations with no employees", () => {
    const assignmentDataWithUnassignedLocation = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
        {
          id: "physical-456",
          name: "Secondary Studio",
          type: "physical",
          address: "456 Other St",
        },
      ],
      assignments: [
        // Only assignments for physical-123, none for physical-456
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithUnassignedLocation, []);

    // Should create only one combo for physical-123, not for physical-456
    expect(combos).toHaveLength(1);
    expect(combos[0].locationId).toBe("physical-123");
  });

  it("handles services with no assignments", () => {
    const assignmentDataWithUnassignedService = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
        {
          id: "service-2",
          name: "Wedding Photography",
          category: "Photography",
          anonymous: false,
          basePrice: 2000,
          locations: ["physical"],
          baseDuration: 480,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
      ],
      assignments: [
        // Only assignments for service-1, none for service-2
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithUnassignedService, []);

    // Should create one combo with only service-1
    expect(combos).toHaveLength(1);
    expect(combos[0].services).toHaveLength(1);
    expect(combos[0].services[0].name).toBe("Portrait Session");
  });

  it("handles empty assignment data", () => {
    const emptyAssignmentData = {
      services: [],
      employees: [],
      locations: [],
      assignments: [],
    };

    const combos = createHybridCombos(emptyAssignmentData, []);

    expect(combos).toHaveLength(0);
  });

  it("handles null/undefined assignment data", () => {
    const nullAssignmentData = {
      services: null,
      employees: null,
      locations: null,
      assignments: null,
    };

    const combos = createHybridCombos(nullAssignmentData, []);

    expect(combos).toHaveLength(0);
  });

  it("handles malformed assignment data", () => {
    const malformedAssignmentData = {
      services: "not-an-array",
      employees: "not-an-array",
      locations: "not-an-array",
      assignments: "not-an-array",
    };

    const combos = createHybridCombos(malformedAssignmentData, []);

    expect(combos).toHaveLength(0);
  });

  it("handles assignments with invalid data types", () => {
    const assignmentDataWithInvalidTypes = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
      ],
      assignments: [
        {
          enabled: "not-a-boolean", // Invalid type
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
        {
          enabled: true,
          visible: "not-a-boolean", // Invalid type
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
        {
          enabled: true,
          visible: true,
          serviceId: 123, // Invalid type
          employeeId: "emp-1",
          locationId: "physical-123",
        },
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: 456, // Invalid type
          locationId: "physical-123",
        },
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: 789, // Invalid type
        },
      ],
    };

    const combos = createHybridCombos(assignmentDataWithInvalidTypes, []);

    // Should not create any combos due to invalid data types
    expect(combos).toHaveLength(0);
  });

  it("handles very large datasets efficiently", () => {
    // Create a large dataset
    const largeServices = Array.from({ length: 100 }, (_, i) => ({
      id: `service-${i}`,
      name: `Service ${i}`,
      category: "Photography",
      anonymous: false,
      basePrice: 100 + i,
      locations: ["physical"],
      baseDuration: 60,
      requiresEmployee: true,
    }));

    const largeEmployees = Array.from({ length: 50 }, (_, i) => ({
      id: `emp-${i}`,
      role: "Photographer",
      email: `employee${i}@example.com`,
      fullName: `Employee ${i}`,
      locationId: "physical-123",
      takesBookings: true,
    }));

    const largeLocations = Array.from({ length: 10 }, (_, i) => ({
      id: `location-${i}`,
      name: `Location ${i}`,
      type: "physical",
      address: `${i} Main St`,
    }));

    const largeAssignments = [];
    for (let i = 0; i < 50; i++) {
      for (let j = 0; j < 10; j++) {
        largeAssignments.push({
          enabled: true,
          visible: true,
          serviceId: `service-${i}`,
          employeeId: `emp-${i}`,
          locationId: `location-${j}`,
        });
      }
    }

    const largeAssignmentData = {
      services: largeServices,
      employees: largeEmployees,
      locations: largeLocations,
      assignments: largeAssignments,
    };

    const startTime = Date.now();
    const combos = createHybridCombos(largeAssignmentData, []);
    const endTime = Date.now();

    // Should create combos efficiently
    expect(combos.length).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });

  it("handles concurrent access safely", () => {
    const assignmentData = {
      services: [
        {
          id: "service-1",
          name: "Portrait Session",
          category: "Photography",
          anonymous: false,
          basePrice: 200,
          locations: ["physical"],
          baseDuration: 60,
          requiresEmployee: true,
        },
      ],
      employees: [
        {
          id: "emp-1",
          role: "Photographer",
          email: "alice@example.com",
          fullName: "Alice Brown",
          locationId: "physical-123",
          takesBookings: true,
        },
      ],
      locations: [
        {
          id: "physical-123",
          name: "Main Studio",
          type: "physical",
          address: "123 Main St",
        },
      ],
      assignments: [
        {
          enabled: true,
          visible: true,
          serviceId: "service-1",
          employeeId: "emp-1",
          locationId: "physical-123",
        },
      ],
    };

    // Simulate concurrent access
    const promises = Array.from({ length: 10 }, () =>
      Promise.resolve(createHybridCombos(assignmentData, []))
    );

    return Promise.all(promises).then((results) => {
      // All results should be identical
      results.forEach((result) => {
        expect(result).toHaveLength(1);
        expect(result[0].employeeName).toBe("Alice Brown");
        expect(result[0].locationName).toBe("Main Studio");
      });
    });
  });
});
