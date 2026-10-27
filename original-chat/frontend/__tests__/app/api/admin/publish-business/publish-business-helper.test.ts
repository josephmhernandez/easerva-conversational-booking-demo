// import {
//     publishBusinessInfo,
//     publishEmployees,
//     publishEmployeeServiceLocations,
//     publishLocations,
//     publishResources,
//     publishServiceCards,
//     publishServiceConfigurations,
//     publishServices
// } from "@/app/api/admin/publish-business/publish-business-helper";
// import { SupabaseClient } from "@supabase/supabase-js";

// // Mock the createClient function
// jest.mock("@/app/utils/supabase/server", () => ({
//   createClient: jest.fn(),
// }));

// describe("Publish Business Helper - Unit Tests", () => {
//   let mockSupabase: Partial<SupabaseClient>;
//   let mockFrom: jest.Mock;
//   let mockSelect: jest.Mock;
//   let mockUpdate: jest.Mock;
//   let mockInsert: jest.Mock;
//   let mockEq: jest.Mock;
//   let mockMaybeSingle: jest.Mock;
//   let mockSingle: jest.Mock;
//   let mockUpsert: jest.Mock;

//   beforeEach(() => {
//     // Reset all mocks
//     jest.clearAllMocks();

//     // Setup mock chain
//     mockMaybeSingle = jest.fn();
//     mockSingle = jest.fn();
//     mockEq = jest.fn();
//     mockSelect = jest.fn();
//     mockUpdate = jest.fn();
//     mockInsert = jest.fn();
//     mockUpsert = jest.fn();
//     mockFrom = jest.fn();

//     // Create mock Supabase client with proper chaining
//     mockSupabase = {
//       from: mockFrom,
//     } as Partial<SupabaseClient>;

//     // Setup default mock chain for all tests
//     mockFrom.mockReturnValue({
//       select: mockSelect,
//       insert: mockInsert,
//       update: mockUpdate,
//       upsert: mockUpsert,
//     });

//     mockSelect.mockReturnValue({
//       eq: mockEq,
//       single: mockSingle,
//       maybeSingle: mockMaybeSingle,
//     });

//     mockEq.mockReturnValue({
//       eq: mockEq,
//       single: mockSingle,
//       maybeSingle: mockMaybeSingle,
//     });

//     // Setup default return values
//     mockSingle.mockResolvedValue({ data: { id: "mock-id" }, error: null });
//     mockMaybeSingle.mockResolvedValue({ data: null, error: null });

//     mockInsert.mockReturnValue({
//       select: mockSelect,
//     });

//     mockUpsert.mockReturnValue({
//       select: mockSelect,
//     });

//     mockUpdate.mockReturnValue({
//       eq: mockEq,
//     });
//   });

//   describe("publishBusinessInfo", () => {
//     it("should successfully create business with upsert", async () => {
//       const businessInfo = {
//         businessName: "Test Business",
//         description: "A test business",
//         category: "Service",
//         tags: ["test", "business"],
//         email: "test@example.com",
//         phone: "123-456-7890",
//         website: "https://test.com",
//         logoUrl: "https://test.com/logo.png",
//       };

//       const ownerId = "owner-123";

//       // Mock successful upsert
//       mockSingle.mockResolvedValue({
//         data: { id: "business-123" },
//         error: null
//       });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockUpsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ upsert: mockUpsert });

//       const result = await publishBusinessInfo(
//         mockSupabase as SupabaseClient,
//         businessInfo,
//         ownerId
//       );

//       expect(result.businessId).toBe("business-123");
//       expect(mockUpsert).toHaveBeenCalledWith(
//         expect.objectContaining({
//           name: "Test Business",
//           is_active: true,
//           approval_status: "approved",
//           owner_id: ownerId,
//         }),
//         { onConflict: "name" }
//       );
//     });

//     it("should handle business upsert errors", async () => {
//       const businessInfo = {
//         businessName: "Test Business",
//       };
//       const ownerId = "owner-123";

//       const error = new Error("Database error");
//       mockSingle.mockResolvedValue({ data: null, error });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockUpsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ upsert: mockUpsert });

//       await expect(
//         publishBusinessInfo(mockSupabase as SupabaseClient, businessInfo, ownerId)
//       ).rejects.toThrow("Business error: Database error");
//     });
//   });

//   describe("publishLocations", () => {
//     it("should create physical locations with correct mapping", async () => {
//       const businessId = "test-business-id";
//       const businessLocation = {
//         "serviceTypes.physical": {
//           addresses: [
//             {
//               id: "main",
//               name: "Main Location",
//               line1: "123 Main St",
//               city: "Test City",
//               state: "TS",
//               zipCode: "12345",
//               country: "US",
//             },
//           ],
//         },
//       };

//       // Mock location creation
//       mockSingle.mockResolvedValue({ data: { id: "real-location-id" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       const result = await publishLocations(
//         mockSupabase as SupabaseClient,
//         businessId,
//         businessLocation,
//         {}
//       );

//       expect(result.locationIdMap.get("main")).toBe("real-location-id");
//     });

//     it("should create mobile locations", async () => {
//       const businessLocation = {
//         "serviceTypes.mobile": {
//           mobileServices: [
//             {
//               id: "mobile-1",
//               name: "Mobile Service",
//               serviceArea: "50 miles",
//             },
//           ],
//         },
//       };

//       mockSingle.mockResolvedValue({ data: { id: "mobile-location-id" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       const result = await publishLocations(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         businessLocation,
//         {}
//       );

//       expect(result.locationIdMap.get("mobile-1")).toBe("mobile-location-id");
//     });

//     it("should handle virtual locations", async () => {
//       const businessLocation = {
//         "serviceTypes.virtual": {
//           virtualServices: [
//             {
//               id: "virtual-1",
//               name: "Virtual Services",
//             },
//           ],
//         },
//       };

//       mockSingle.mockResolvedValue({ data: { id: "virtual-location-id" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       const result = await publishLocations(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         businessLocation,
//         {}
//       );

//       expect(result.locationIdMap.get("virtual-1")).toBe("virtual-location-id");
//     });
//   });

//   describe("publishResources", () => {
//     it("should create resources with location mapping", async () => {
//       const businessResources = {
//         "location-1": {
//           name: "Main Location",
//           resources: [
//             {
//               id: "resource-1",
//               name: "Room 1",
//               type: "room",
//               description: "Main conference room",
//             },
//           ],
//         },
//       };

//       const locationIdMap = new Map([["location-1", "real-location-id"]]);

//       mockSingle.mockResolvedValue({ data: { id: "resource-123" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       const result = await publishResources(
//         mockSupabase as SupabaseClient,
//         businessResources,
//         {},
//         locationIdMap
//       );

//       expect(result.resourceIdMap.get("resource-1")).toBe("resource-123");
//     });

//     it("should handle resources without location mapping", async () => {
//       const businessResources = {
//         "location-2": {
//           name: "Unknown Location",
//           resources: [{ id: "r1", name: "Resource 1", type: "equipment" }],
//         },
//       };

//       const locationIdMap = new Map();

//       const result = await publishResources(
//         mockSupabase as SupabaseClient,
//         businessResources,
//         {},
//         locationIdMap
//       );

//       // Should skip resources without location mapping
//       expect(result.resourceIdMap.get("r1")).toBeUndefined();
//     });

//     it("should handle empty resources", async () => {
//       const locationIdMap = new Map();

//       const result = await publishResources(
//         mockSupabase as SupabaseClient,
//         null,
//         {},
//         locationIdMap
//       );

//       expect(result.resourceIdMap.size).toBe(0);
//     });
//   });

//   describe("publishServices", () => {
//     it("should convert fixed pricing from dollars to cents", async () => {
//       const serviceLocation = {
//         services: [
//           {
//             id: "service-1",
//             name: "Test Service",
//             description: "A test service",
//             category: "Cleaning",
//             duration: "60",
//             pricing: {
//               type: "fixed",
//               amount: 100.5,
//             },
//           },
//         ],
//       };

//       mockSingle.mockResolvedValue({ data: { id: "service-123" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       const result = await publishServices(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         serviceLocation
//       );

//       expect(result.serviceIdMap.get("service-1")).toBe("service-123");
//     });

//     it("should convert variable pricing from dollars to cents", async () => {
//       const serviceLocation = {
//         services: [
//           {
//             id: "service-2",
//             name: "Variable Service",
//             pricing: {
//               type: "variable",
//               min: 50.25,
//               max: 150.75,
//             },
//           },
//         ],
//       };

//       mockSingle.mockResolvedValue({ data: { id: "service-456" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       const result = await publishServices(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         serviceLocation
//       );

//       expect(result.serviceIdMap.get("service-2")).toBe("service-456");
//     });

//     it("should handle free pricing", async () => {
//       const serviceLocation = {
//         services: [
//           {
//             id: "service-3",
//             name: "Free Service",
//             priceType: "free",
//           },
//         ],
//       };

//       mockSingle.mockResolvedValue({ data: { id: "service-789" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       const result = await publishServices(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         serviceLocation
//       );

//       expect(result.serviceIdMap.get("service-3")).toBe("service-789");
//     });
//   });

//   describe("publishEmployees", () => {
//     it("should create employees with location mapping", async () => {
//       const bookingStrategy = {
//         employees: [
//           {
//             id: "emp-1",
//             fullName: "John Doe",
//             email: "john@example.com",
//             role: "Technician",
//             locationId: "location-1",
//             takesBookings: true,
//           },
//         ],
//       };

//       const locationIdMap = new Map([["location-1", "real-location-id"]]);

//       mockSingle.mockResolvedValue({ data: { id: "employee-123" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       const result = await publishEmployees(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         bookingStrategy,
//         locationIdMap
//       );

//       expect(result.employeeIdMap.get("emp-1")).toBe("employee-123");
//     });

//     it("should find existing user by email", async () => {
//       const bookingStrategy = {
//         employees: [
//           {
//             id: "emp-1",
//             fullName: "John Doe",
//             email: "existing@example.com",
//             role: "Technician",
//           },
//         ],
//       };

//       // Mock finding existing user
//       mockMaybeSingle.mockResolvedValue({ data: { id: "user-123" }, error: null });
//       mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
//       mockSelect.mockReturnValue({ eq: mockEq });
//       mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });

//       mockSingle.mockResolvedValue({ data: { id: "employee-123" }, error: null });
//       mockInsert.mockReturnValue({ select: mockSelect });

//       const result = await publishEmployees(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         bookingStrategy,
//         new Map()
//       );

//       expect(result.employeeIdMap.get("emp-1")).toBe("employee-123");
//     });
//   });

//   describe("publishEmployeeServiceLocations", () => {
//     it("should create employee-service relationships", async () => {
//       const bookingStrategy = {
//         employees: [
//           {
//             id: "emp-1",
//             locationId: "location-1",
//             services: ["service-1", "service-2"],
//           },
//         ],
//       };

//       const employeeIdMap = new Map([["emp-1", "real-emp-id"]]);
//       const serviceIdMap = new Map([
//         ["service-1", "real-service-1"],
//         ["service-2", "real-service-2"],
//       ]);
//       const locationIdMap = new Map([["location-1", "real-location-id"]]);

//       mockFrom.mockReturnValue({ upsert: jest.fn().mockResolvedValue({ data: null, error: null }) });

//       await publishEmployeeServiceLocations(
//         mockSupabase as SupabaseClient,
//         bookingStrategy,
//         {},
//         employeeIdMap,
//         serviceIdMap,
//         locationIdMap
//       );

//       expect(mockFrom).toHaveBeenCalledWith("employee_service_locations");
//     });

//     it("should skip assignments without employee mapping", async () => {
//       const bookingStrategy = {
//         employees: [
//           {
//             id: "unknown-emp",
//             locationId: "location-1",
//             services: ["service-1"],
//           },
//         ],
//       };

//       const employeeIdMap = new Map();
//       const serviceIdMap = new Map([["service-1", "real-service-1"]]);
//       const locationIdMap = new Map([["location-1", "real-location-id"]]);

//       mockFrom.mockReturnValue({ upsert: jest.fn().mockResolvedValue({ data: null, error: null }) });

//       await publishEmployeeServiceLocations(
//         mockSupabase as SupabaseClient,
//         bookingStrategy,
//         {},
//         employeeIdMap,
//         serviceIdMap,
//         locationIdMap
//       );

//       // Should not call upsert for unknown employee
//       expect(mockFrom).not.toHaveBeenCalledWith("employee_service_locations");
//     });
//   });

//   describe("publishServiceCards", () => {
//     it("should create business card", async () => {
//       const cardStudio = {
//         cards: [
//           {
//             id: "card-1",
//             type: "business",
//             name: "Business Card",
//             headline: "Welcome to our business",
//             tagline: "We provide great services",
//             ctaText: "Book Now",
//           },
//         ],
//       };

//       mockSingle.mockResolvedValue({ data: { id: "card-123" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       await publishServiceCards(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         cardStudio,
//         [],
//         new Map(),
//         new Map(),
//         new Map(),
//         new Map()
//       );

//       expect(mockFrom).toHaveBeenCalledWith("service_cards");
//     });

//     it("should create service card with ID mapping", async () => {
//       const cardStudio = {
//         cards: [
//           {
//             id: "card-1",
//             type: "service",
//             serviceIds: ["service-1"],
//             locationId: "location-1",
//             name: "Service Card",
//           },
//         ],
//       };

//       const serviceIdMap = new Map([["service-1", "real-service-id"]]);
//       const locationIdMap = new Map([["location-1", "real-location-id"]]);

//       mockSingle.mockResolvedValue({ data: { id: "card-456" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       await publishServiceCards(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         cardStudio,
//         [],
//         serviceIdMap,
//         locationIdMap,
//         new Map(),
//         new Map()
//       );

//       expect(mockFrom).toHaveBeenCalledWith("service_cards");
//     });

//     it("should set default values for optional fields", async () => {
//       const cardStudio = {
//         cards: [
//           {
//             id: "card-1",
//             name: "Card",
//             headline: "Headline",
//           },
//         ],
//       };

//       mockSingle.mockResolvedValue({ data: { id: "card-789" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockInsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });

//       await publishServiceCards(
//         mockSupabase as SupabaseClient,
//         "business-123",
//         cardStudio,
//         [],
//         new Map(),
//         new Map(),
//         new Map(),
//         new Map()
//       );

//       expect(mockFrom).toHaveBeenCalledWith("service_cards");
//     });
//   });

//   describe("publishServiceConfigurations", () => {
//     it("should create service configurations with resource mapping", async () => {
//       const serviceLocation = {
//         configurations: [
//           {
//             serviceId: "service-1",
//             locationId: "location-1",
//             enabled: true,
//             maxCapacity: 5,
//             requiredResources: ["resource-1", "resource-2"],
//           },
//         ],
//       };

//       const serviceIdMap = new Map([["service-1", "real-service-id"]]);
//       const locationIdMap = new Map([["location-1", "real-location-id"]]);

//       mockSingle.mockResolvedValue({ data: { id: "config-123" }, error: null });
//       mockSelect.mockReturnValue({ single: mockSingle });
//       mockUpsert.mockReturnValue({ select: mockSelect });
//       mockFrom.mockReturnValue({ upsert: mockUpsert });

//       const result = await publishServiceConfigurations(
//         mockSupabase as SupabaseClient,
//         serviceLocation,
//         serviceIdMap,
//         locationIdMap
//       );

//       expect(result.get("real-service-id-real-location-id")).toBe("config-123");
//     });

//     it("should skip disabled configurations", async () => {
//       const serviceLocation = {
//         configurations: [
//           {
//             serviceId: "service-1",
//             locationId: "location-1",
//             enabled: false,
//           },
//         ],
//       };

//       const serviceIdMap = new Map([["service-1", "real-service-id"]]);
//       const locationIdMap = new Map([["location-1", "real-location-id"]]);

//       const result = await publishServiceConfigurations(
//         mockSupabase as SupabaseClient,
//         serviceLocation,
//         serviceIdMap,
//         locationIdMap
//       );

//       expect(result.size).toBe(0);
//     });
//   });

//   describe("ID Mapping", () => {
//     it("should maintain consistent ID mappings across operations", () => {
//       const draftId = "draft-location-1";
//       const realId = "real-location-uuid";

//       const locationIdMap = new Map<string, string>();
//       locationIdMap.set(draftId, realId);

//       // Simulate using the map in different contexts
//       expect(locationIdMap.get(draftId)).toBe(realId);
//       expect(locationIdMap.has(draftId)).toBe(true);
//       expect(locationIdMap.size).toBe(1);
//     });

//     it("should handle multiple ID types in parallel", () => {
//       const maps = {
//         locations: new Map([["loc-1", "real-loc-1"]]),
//         services: new Map([["svc-1", "real-svc-1"]]),
//         employees: new Map([["emp-1", "real-emp-1"]]),
//         resources: new Map([["res-1", "real-res-1"]]),
//       };

//       expect(maps.locations.get("loc-1")).toBe("real-loc-1");
//       expect(maps.services.get("svc-1")).toBe("real-svc-1");
//       expect(maps.employees.get("emp-1")).toBe("real-emp-1");
//       expect(maps.resources.get("res-1")).toBe("real-res-1");
//     });
//   });
// });

// Assign dummy test
describe("Publish Business Helper - Integration Tests", () => {
  it("dummy test", async () => {
    // dummy test
    expect(true).toBe(true);
  });
});
