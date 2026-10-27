import { render, RenderOptions } from "@testing-library/react";
import { NextRouter } from "next/router";
import React, { ReactElement } from "react";
import { screen, waitFor } from "@testing-library/react";

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: "/",
  route: "/",
  query: {},
  asPath: "/",
  basePath: "",
  locale: "en",
  locales: ["en"],
  defaultLocale: "en",
  isLocaleDomain: false,
  isReady: true,
  isPreview: false,
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
} as Partial<NextRouter>;

// Mock fetch with default responses
const mockFetchResponses = {
  businessLocation: {
    ok: true,
    json: () =>
      Promise.resolve({
        draftData: {
          "serviceTypes.physical": {
            addresses: [
              {
                id: "physical-1",
                name: "Downtown Office",
                line1: "123 Main St",
                city: "New York",
                state: "NY",
                zipCode: "10001",
              },
            ],
          },
          "serviceTypes.virtual": {
            platform: "Zoom",
            timezone: "America/New_York",
          },
          "serviceTypes.mobile": {
            serviceArea: "Local Area",
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
              name: "Downtown",
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
              name: "Virtual Services",
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
  employeeServiceAssignment: {
    ok: true,
    json: () =>
      Promise.resolve({
        step: "employee_service_assignment",
        draftData: {
          services: [
            {
              id: "service-1",
              name: "Consultation",
              category: "Legal",
              anonymous: false,
              basePrice: 100,
              locations: ["physical", "virtual"],
              baseDuration: 60,
              requiresEmployee: true,
            },
          ],
          employees: [
            {
              id: "emp-1",
              role: "Consultant",
              email: "john@example.com",
              fullName: "John Doe",
              locationId: "main",
              takesBookings: true,
            },
          ],
          locations: [
            {
              id: "main",
              name: "Downtown",
              type: "physical",
              address: "4510 Mill Pond Ct, Colleyville, TX 76034-3678",
            },
            {
              id: "virtual",
              name: "Virtual Services",
              type: "virtual",
              address: "Platform: zoom | Timezone: America/Chicago",
            },
          ],
          assignments: [
            {
              enabled: true,
              visible: true,
              serviceId: "service-1",
              employeeId: "emp-1",
              locationId: "main",
            },
            {
              enabled: true,
              visible: true,
              serviceId: "service-1",
              employeeId: "emp-1",
              locationId: "virtual",
            },
          ],
        },
      }),
  },
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Mock data generators
export const createMockEmployee = (overrides = {}) => ({
  id: "emp-1",
  fullName: "John Doe",
  email: "john@example.com",
  role: "Consultant",
  locationId: "location-1",
  takesBookings: true,
  ...overrides,
});

export const createMockResource = (overrides = {}) => ({
  id: "res-1",
  name: "Conference Room A",
  type: "room",
  description: "Large conference room",
  locationId: "location-1",
  ...overrides,
});

export const createMockService = (overrides = {}) => ({
  id: "service-1",
  name: "Consultation",
  price: 100,
  icon: "💼",
  locationId: "location-1",
  ...overrides,
});

export const createMockLocation = (overrides = {}) => ({
  id: "location-1",
  name: "Downtown Office",
  type: "physical",
  address: "123 Main St, New York, NY 10001",
  serviceCount: 1,
  resourceCount: 1,
  ...overrides,
});

export const createMockServiceLocationCombo = (overrides = {}) => ({
  id: "combo-1",
  locationId: "location-1",
  locationName: "Downtown Office",
  address: "123 Main St, New York, NY 10001",
  cardType: "location",
  services: [createMockService()],
  resources: [createMockResource()],
  employees: [createMockEmployee()],
  logicType: "any",
  combiningAllowed: true,
  ...overrides,
});

// Mock API responses
export const setupMockFetch = (responses = {}) => {
  const defaultResponses = { ...mockFetchResponses, ...responses };

  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes("business_location")) {
      return Promise.resolve(defaultResponses.businessLocation);
    }
    if (url.includes("business_team_members")) {
      return Promise.resolve(defaultResponses.businessTeamMembers);
    }
    if (url.includes("booking_strategy")) {
      return Promise.resolve(defaultResponses.bookingStrategy);
    }
    if (url.includes("business_resources")) {
      return Promise.resolve(defaultResponses.businessResources);
    }
    if (url.includes("card_studio")) {
      return Promise.resolve(defaultResponses.cardStudio);
    }
    if (url.includes("service_location")) {
      return Promise.resolve(defaultResponses.serviceLocation);
    }
    if (url.includes("calendar_integration_new")) {
      return Promise.resolve({ ok: false }); // No saved data
    }
    if (url.includes("employee_service_assignment")) {
      return Promise.resolve(defaultResponses.employeeServiceAssignment || { ok: false });
    }
    return Promise.resolve({ ok: false });
  });
};

// Test helpers
export const waitForLoadingToFinish = async () => {
  await waitFor(() => {
    expect(screen.queryByText("Loading calendar integration data...")).not.toBeInTheDocument();
  });
};

export const waitForDataToLoad = async () => {
  await waitFor(() => {
    expect(screen.getByText("Current Booking Strategy")).toBeInTheDocument();
  });
};

// Console mocking utilities
export const enableConsoleLogs = () => {
  const originalConsole = global.console;
  global.console = {
    ...originalConsole,
    log: originalConsole.log,
    debug: originalConsole.debug,
    info: originalConsole.info,
    warn: originalConsole.warn,
    error: originalConsole.error,
  };
};

export const disableConsoleLogs = () => {
  global.console = {
    ...global.console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
};

// Re-export everything from testing library
export * from "@testing-library/react";
export { mockRouter, customRender as render };
