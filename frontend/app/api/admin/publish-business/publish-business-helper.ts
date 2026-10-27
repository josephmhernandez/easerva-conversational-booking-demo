// ============================================================================
// PUBLISH HELPERS - Updated for New Schema with Rollback Support
// ============================================================================

// Initialize logger to capture all console output to app.log
// Using .server.ts ensures this only runs in Node.js runtime
import "@/lib/logger.server";

import { SERVICE_DURATION_OPTIONS } from "@/app/constants/businessConstants";
import { getCanonicalBusinessCategoryByName } from "@/app/constants/businessCategories";
import { toCitySlug, toStateAbbr } from "@/app/utils/location";
import { generateUniqueBusinessSlug, slugifySegment } from "@/app/utils/slug";
import { SupabaseClient } from "@supabase/supabase-js";

const MAX_BUSINESS_SLUG_ATTEMPTS = 5;

type InsertError = {
  code?: string;
  details?: string | null;
  message: string;
};

function isSlugUniqueViolation(error: InsertError): boolean {
  if (error.code !== "23505") {
    return false;
  }

  const details = `${error.message} ${error.details ?? ""}`.toLowerCase();
  return details.includes("slug");
}

// ============================================================================
// GEOCODING HELPER
// ============================================================================

interface GeocodeResult {
  latitude: number | null;
  longitude: number | null;
}

async function geocodeAddress(address: {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}): Promise<GeocodeResult> {
  try {
    const apiKey = process.env.GOOGLE_GEOCODE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GEOCODE_API_KEY not found in environment variables");
    }

    // Build the address string for geocoding
    const addressString = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.zipCode,
      address.country,
    ]
      .filter(Boolean)
      .join(", ");

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    } else {
      throw new Error(`Geocoding failed for address: ${addressString}. Status: ${data.status}`);
    }
  } catch (error) {
    throw new Error(`Geocoding error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// UUID NORMALIZATION UTILITY
// ============================================================================

export interface IdNormalizer {
  getOrCreateUuid(oldId: string): string;
}

function generateUuid(): string {
  return crypto.randomUUID(); // Modern Node.js UUID generation
}

export function createIdNormalizer(): IdNormalizer {
  const mapping = new Map<string, string>();

  return {
    getOrCreateUuid(oldId: string): string {
      // Strip prefixes before checking mapping
      const cleanedId = stripIdPrefix(oldId);

      if (!mapping.has(cleanedId)) {
        mapping.set(cleanedId, generateUuid());
      }
      return mapping.get(cleanedId)!;
    },
  };
}

function stripIdPrefix(id: string): string {
  // Remove prefixes: physical-, mobile-, online-, service-, emp-, resource-, employee_, location_
  // Also handle composite IDs like "service-X@location-Y" - extract the core parts

  // Handle composite card IDs
  if (id.includes("@")) {
    // For card IDs like "service-123@physical-uuid", we just want the whole thing as one entity
    return id; // Keep the whole thing for mapping, we'll generate new UUID for it
  }

  // Strip known prefixes
  const prefixes = [
    "physical-",
    "mobile-",
    "online-",
    "service-",
    "emp-",
    "resource-",
    "employee_",
    "location_",
    "combo-",
  ];
  for (const prefix of prefixes) {
    if (id.startsWith(prefix)) {
      return id.substring(prefix.length);
    }
  }

  return id;
}

function stripLocationPrefix(locationId: string): string {
  // Remove physical-, mobile-, online- prefixes
  if (locationId.startsWith("physical-")) return locationId.substring(9);
  if (locationId.startsWith("mobile-")) return locationId.substring(7);
  if (locationId.startsWith("online-")) return locationId.substring(7);
  return locationId;
}

function extractLocationFromCardId(cardId: string): string | null {
  // Extract location part from composite card IDs like "service-X@physical-Y" or "emp-A-B-C-location-D-E"
  if (cardId.includes("@")) {
    const parts = cardId.split("@");
    return parts[1] || null;
  }
  // For employee cards: emp-{employeeId}-{serviceId}-{locationId}-{index}
  if (cardId.startsWith("emp-")) {
    const parts = cardId.split("-");
    if (parts.length >= 5) {
      // Location is everything between serviceId and index
      return parts.slice(3, -1).join("-");
    }
  }
  return null;
}

// ============================================================================
// ROLLBACK TRACKING INTERFACE
// ============================================================================

interface RollbackTracker {
  businessId?: string;
  locationIds: string[];
  resourceIds: string[];
  serviceIds: string[];
  employeeIds: string[];
  employeeServiceIds: string[];
  serviceConfigurationIds: string[];
  serviceCardIds: string[];
  calendarGroupIds: string[];
  serviceCardRequirementIds: string[];
  bookingCalendarAssignmentIds: string[];
}

// interface PublishResult {
//   success: boolean;
//   rollbackTracker?: RollbackTracker;
//   error?: string;
// }

// ============================================================================
// ROLLBACK FUNCTION
// ============================================================================

export async function rollbackPublish(
  supabase: SupabaseClient,
  rollbackTracker: RollbackTracker
): Promise<void> {
  console.log("🔄 Starting rollback process...");

  try {
    // Delete in reverse order to respect foreign key constraints

    // 1. Delete booking calendar assignments
    if (rollbackTracker.bookingCalendarAssignmentIds.length > 0) {
      console.log(
        `🗑️  Deleting ${rollbackTracker.bookingCalendarAssignmentIds.length} booking calendar assignments...`
      );
      await supabase
        .from("booking_calendar_assignments")
        .delete()
        .in("id", rollbackTracker.bookingCalendarAssignmentIds);
    }

    // 2. Delete service card requirements
    if (rollbackTracker.serviceCardRequirementIds.length > 0) {
      console.log(
        `🗑️  Deleting ${rollbackTracker.serviceCardRequirementIds.length} service card requirements...`
      );
      await supabase
        .from("service_card_requirements")
        .delete()
        .in("id", rollbackTracker.serviceCardRequirementIds);
    }

    // 3. Delete calendar groups
    if (rollbackTracker.calendarGroupIds.length > 0) {
      console.log(`🗑️  Deleting ${rollbackTracker.calendarGroupIds.length} calendar groups...`);
      await supabase.from("calendar_groups").delete().in("id", rollbackTracker.calendarGroupIds);
    }

    // 4. Delete service cards
    if (rollbackTracker.serviceCardIds.length > 0) {
      console.log(`🗑️  Deleting ${rollbackTracker.serviceCardIds.length} service cards...`);
      await supabase.from("service_cards").delete().in("id", rollbackTracker.serviceCardIds);
    }

    // 5. Delete service configurations
    if (rollbackTracker.serviceConfigurationIds.length > 0) {
      console.log(
        `🗑️  Deleting ${rollbackTracker.serviceConfigurationIds.length} service configurations...`
      );
      await supabase
        .from("service_configurations")
        .delete()
        .in("id", rollbackTracker.serviceConfigurationIds);
    }

    // 6. Delete employee-service relationships
    if (rollbackTracker.employeeServiceIds.length > 0) {
      console.log(
        `🗑️  Deleting ${rollbackTracker.employeeServiceIds.length} employee-service relationships...`
      );
      await supabase
        .from("employee_services")
        .delete()
        .in("id", rollbackTracker.employeeServiceIds);
    }

    // 7. Delete employees
    if (rollbackTracker.employeeIds.length > 0) {
      console.log(`🗑️  Deleting ${rollbackTracker.employeeIds.length} employees...`);
      await supabase.from("employees").delete().in("id", rollbackTracker.employeeIds);
    }

    // 8. Delete resources
    if (rollbackTracker.resourceIds.length > 0) {
      console.log(`🗑️  Deleting ${rollbackTracker.resourceIds.length} resources...`);
      await supabase.from("rooms").delete().in("id", rollbackTracker.resourceIds);
    }

    // 9. Delete services
    if (rollbackTracker.serviceIds.length > 0) {
      console.log(`🗑️  Deleting ${rollbackTracker.serviceIds.length} services...`);
      await supabase.from("services").delete().in("id", rollbackTracker.serviceIds);
    }

    // 10. Delete locations
    if (rollbackTracker.locationIds.length > 0) {
      console.log(`🗑️  Deleting ${rollbackTracker.locationIds.length} locations...`);
      await supabase.from("locations").delete().in("id", rollbackTracker.locationIds);
    }

    // DO NOT delete the business. It will be deleted by the admin manually elsewhere.
    // 11. Delete business (last)
    // if (rollbackTracker.businessId) {
    //   console.log(`🗑️  Deleting business ${rollbackTracker.businessId}...`);
    //   await supabase
    //     .from("businesses")
    //     .delete()
    //     .eq("id", rollbackTracker.businessId);
    // }

    console.log("✅ Rollback completed successfully");
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw new Error(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Type definitions for the publish business helper functions
interface BusinessInfo {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  category?: string;
  tags?: string[];
}

interface Location {
  id: string;
  name?: string;
  type?: string;
  address?: string;
  resources?: Resource[];
}

// Enhanced interfaces for business location data
interface Address {
  id: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  timezone: string;
  isValidated: boolean;
}

interface ServiceArea {
  type: "radius_zip_code" | "radius_address" | "zip_codes";
  zipCenter?: string;
  radius?: number;
  zipCodesRaw?: string;
  zipCodes?: string[];
  cities?: string[];
}

interface MobileService {
  id: string;
  name: string;
  serviceArea: ServiceArea;
  businessAddress?: Address;
}

interface VirtualService {
  id: string;
  name: string;
  platform: string;
  defaultLink: string;
  instructions: string;
  timezone: string;
}

interface Resource {
  id: string;
  name: string;
  type?: string;
  description?: string;
  capacity?: number;
  amenities?: string[];
}

interface ServiceLocation {
  locations?: Location[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configurations?: any[];
}

interface BusinessLocation {
  "serviceTypes.physical"?: {
    addresses: Address[];
  };
  "serviceTypes.mobile"?: {
    mobileServices: MobileService[];
  };
  "serviceTypes.virtual"?: {
    virtualServices: VirtualService[];
  };
  // Add properties as needed based on usage
  [key: string]: unknown;
}

interface BusinessResources {
  // Add properties as needed based on usage
  [key: string]: unknown;
}

interface BookingStrategy {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employees?: any[];
  [key: string]: unknown;
}

interface CardStudio {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cards?: any[];
  [key: string]: unknown;
}

interface BusinessEmployeeAvailability {
  businessDefaults?: {
    bufferTime?: number;
    advanceBookingNotice?: string;
  };
  [key: string]: unknown;
}

// ============================================================================
// STEP 1: BUSINESS INFO
// ============================================================================

export async function publishBusinessInfo(
  supabase: SupabaseClient,
  businessInfo: BusinessInfo,
  existingBusinessId: string,
  rollbackTracker: RollbackTracker
): Promise<{ businessId: string }> {
  const categorySlug = businessInfo.category
    ? (getCanonicalBusinessCategoryByName(businessInfo.category)?.slug ?? null)
    : null;

  if (businessInfo.category && !categorySlug) {
    throw new Error(`Unsupported business category: ${businessInfo.category}`);
  }
  let slug = "";
  let lastSlugError: InsertError | null = null;

  for (let attempt = 1; attempt <= MAX_BUSINESS_SLUG_ATTEMPTS; attempt += 1) {
    slug = await generateUniqueBusinessSlug(supabase, businessInfo.name, existingBusinessId);

    const businessData = {
      name: businessInfo.name,
      description: businessInfo.description || null,
      phone: businessInfo.phone || null,
      email: businessInfo.email || null,
      website: businessInfo.website || null,
      logo_url: businessInfo.logoUrl || null,
      cover_image_url: null,
      business_hours: null,
      category: businessInfo.category || null,
      category_slug: categorySlug,
      slug,
      tags: businessInfo.tags || [],
      is_active: false, // Start inactive, activated in step 12
      approval_status: "pending",
    };

    console.log(`🔗 Attempt ${attempt}/${MAX_BUSINESS_SLUG_ATTEMPTS}: slug=${slug}`);

    const { error } = await supabase
      .from("businesses")
      .update({
        ...businessData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingBusinessId);

    if (!error) {
      lastSlugError = null;
      break;
    }

    if (!isSlugUniqueViolation(error)) {
      throw new Error(`Business error: ${error.message}`);
    }

    lastSlugError = error;
    console.warn(`⚠️ Slug collision detected during update for "${slug}", retrying...`);
  }

  if (lastSlugError) {
    throw new Error("Unable to update business with a unique slug after multiple attempts");
  }

  // Track the business ID for rollback
  rollbackTracker.businessId = existingBusinessId;
  console.log(`📊 Business updated: ${existingBusinessId} with slug: ${slug}`);

  return { businessId: existingBusinessId };
}

// ============================================================================
// STEP 2: LOCATIONS
// ============================================================================

export async function publishLocations(
  supabase: SupabaseClient,
  businessId: string,
  businessLocation: BusinessLocation,
  serviceLocation: ServiceLocation,
  rollbackTracker: RollbackTracker
  // idNormalizer: IdNormalizer
): Promise<{ locationIdMap: Map<string, string> }> {
  const locationIdMap = new Map<string, string>();

  // Parse business location data
  const physicalAddresses: Address[] = businessLocation?.["serviceTypes.physical"]?.addresses || [];
  const mobileServices: MobileService[] =
    businessLocation?.["serviceTypes.mobile"]?.mobileServices || [];
  const virtualServices: VirtualService[] =
    businessLocation?.["serviceTypes.virtual"]?.virtualServices || [];

  // Process physical locations
  for (const address of physicalAddresses) {
    const fullAddress = `${address.line1}${address.line2 ? ", " + address.line2 : ""}`;

    // Geocode the address
    const coordinates = await geocodeAddress(address);

    const locationData = {
      business_id: businessId,
      name: address.name || "Main Location",
      location_type: "physical",
      address: fullAddress,
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      city_slug: toCitySlug(address.city),
      state: address.state,
      state_abbr: toStateAbbr(address.state),
      zip_code: address.zipCode,
      country: address.country || "US",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      mobile_type: null,
      mobile_zip_codes: null,
      mobile_radius_miles: null,
      is_primary: address.id === "main" || address.name === "Main Location",
      is_active: true,
    };

    const { data: location, error: locationError } = await supabase
      .from("locations")
      .insert(locationData)
      .select()
      .single();

    if (locationError) throw new Error(`Location error: ${locationError.message}`);

    // Track the location ID for rollback
    rollbackTracker.locationIds.push(location.id);

    // Store mapping for this physical location
    locationIdMap.set(address.id, location.id);
    const strippedId = stripLocationPrefix(address.id);
    if (strippedId !== address.id) {
      locationIdMap.set(strippedId, location.id);
    }

    console.log(`📍 Physical location created: ${address.name} -> ${location.id} (${toCitySlug(address.city)}, ${toStateAbbr(address.state)})`);
  }

  // Process mobile locations
  for (const mobileService of mobileServices) {
    const { serviceArea } = mobileService;
    let mobileType: string | null = null;
    let mobileZipCodes: string[] | null = null;
    let mobileRadiusMiles: number | null = null;
    let address: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    let zipCode: string | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;

    switch (serviceArea.type) {
      case "zip_codes":
        mobileType = "zip_codes";
        mobileZipCodes =
          serviceArea.zipCodes ||
          (serviceArea.zipCodesRaw ? serviceArea.zipCodesRaw.split(/[,\s]+/).filter(Boolean) : []);
        break;

      case "radius_address":
        mobileType = "radius_address";
        mobileRadiusMiles = serviceArea.radius || null;
        if (mobileService.businessAddress) {
          const coords = await geocodeAddress(mobileService.businessAddress);
          latitude = coords.latitude;
          longitude = coords.longitude;
          address = `${mobileService.businessAddress.line1}${mobileService.businessAddress.line2 ? ", " + mobileService.businessAddress.line2 : ""}`;
          city = mobileService.businessAddress.city;
          state = mobileService.businessAddress.state;
          zipCode = mobileService.businessAddress.zipCode;
        }
        break;

      case "radius_zip_code":
        mobileType = "radius_zip_code";
        mobileRadiusMiles = serviceArea.radius || null;
        zipCode = serviceArea.zipCenter || null;
        break;
    }

    const locationData = {
      business_id: businessId,
      name: mobileService.name,
      location_type: "mobile",
      address: address,
      line1: address,
      line2: null,
      city: city,
      city_slug: city ? toCitySlug(city) : null,
      state: state,
      state_abbr: state ? toStateAbbr(state) : null,
      zip_code: zipCode,
      country: "US",
      latitude: latitude,
      longitude: longitude,
      mobile_type: mobileType,
      mobile_zip_codes: mobileZipCodes,
      mobile_radius_miles: mobileRadiusMiles,
      is_primary: false,
      is_active: true,
    };

    const { data: location, error: locationError } = await supabase
      .from("locations")
      .insert(locationData)
      .select()
      .single();

    if (locationError) throw new Error(`Location error: ${locationError.message}`);

    // Track the location ID for rollback
    rollbackTracker.locationIds.push(location.id);

    // Store mapping for this mobile location
    locationIdMap.set(mobileService.id, location.id);
    const strippedId = stripLocationPrefix(mobileService.id);
    if (strippedId !== mobileService.id) {
      locationIdMap.set(strippedId, location.id);
    }

    console.log(`📍 Mobile location created: ${mobileService.name} -> ${location.id} (${city ? toCitySlug(city) : 'no city'})`);
  }

  // Process virtual locations
  // Virtual locations don't have geo data - they use URL pattern: /providers/virtual/{category}/{slug}/
  for (const virtualService of virtualServices) {
    const locationData = {
      business_id: businessId,
      name: virtualService.name,
      location_type: "virtual",
      address: null,
      line1: null,
      line2: null,
      city: null,
      city_slug: null,
      state: null,
      state_abbr: null,
      zip_code: null,
      country: "US",
      latitude: null,
      longitude: null,
      mobile_type: null,
      mobile_zip_codes: null,
      mobile_radius_miles: null,
      is_primary: false,
      is_active: true,
    };

    const { data: location, error: locationError } = await supabase
      .from("locations")
      .insert(locationData)
      .select()
      .single();

    if (locationError) throw new Error(`Location error: ${locationError.message}`);

    // Track the location ID for rollback
    rollbackTracker.locationIds.push(location.id);

    // Store mapping for this virtual location
    locationIdMap.set(virtualService.id, location.id);
    const strippedId = stripLocationPrefix(virtualService.id);
    if (strippedId !== virtualService.id) {
      locationIdMap.set(strippedId, location.id);
    }

    console.log(`📍 Virtual location created: ${virtualService.name} -> ${location.id}`);
  }

  console.log(`📍 Final location mappings:`, Array.from(locationIdMap.entries()));
  return { locationIdMap };
}

// ============================================================================
// STEP 3: RESOURCES (ROOMS)
// ============================================================================

export async function publishResources(
  supabase: SupabaseClient,
  businessResources: BusinessResources,
  serviceLocation: ServiceLocation,
  locationIdMap: Map<string, string>,
  rollbackTracker: RollbackTracker
  // idNormalizer: IdNormalizer
): Promise<{ resourceIdMap: Map<string, string> }> {
  const resourceIdMap = new Map<string, string>();
  const locations = serviceLocation?.locations || [];

  for (const loc of locations) {
    if (!loc.resources) continue;

    const realLocationId = locationIdMap.get(loc.id);
    if (!realLocationId) continue;

    for (const resource of loc.resources) {
      // Generate new UUID for this resource
      // const newResourceId = idNormalizer.getOrCreateUuid(resource.id);

      const roomData = {
        business_id: (
          await supabase.from("locations").select("business_id").eq("id", realLocationId).single()
        ).data?.business_id,
        location_id: realLocationId,
        name: resource.name,
        resource_type: resource.type || "room",
        capacity: null,
        is_active: true,
      };

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert(roomData)
        .select()
        .single();

      if (roomError) throw new Error(`Room error: ${roomError.message}`);

      // Track the resource ID for rollback
      rollbackTracker.resourceIds.push(room.id);
      resourceIdMap.set(resource.id, room.id);
      console.log(
        `🏠 Resource created: ${resource.name} -> ${room.id} (normalized from ${resource.id})`
      );
    }
  }

  return { resourceIdMap };
}

// ============================================================================
// STEP 4: SERVICES
// ============================================================================

export async function publishServices(
  supabase: SupabaseClient,
  businessId: string,
  cardStudio: CardStudio,
  serviceLocation: ServiceLocation,
  businessEmployeeAvailability: BusinessEmployeeAvailability,
  employeeIdMap: Map<string, string>,
  locationIdMap: Map<string, string>,
  rollbackTracker: RollbackTracker
  // idNormalizer: IdNormalizer
): Promise<{ serviceIdMap: Map<string, string> }> {
  const serviceIdMap = new Map<string, string>();
  const cards = cardStudio?.cards || [];

  for (const card of cards) {
    // Find base service by matching card.serviceId or card.serviceIds[0]
    const baseService = serviceLocation.services?.find(
      (s) => s.id === card.serviceId || s.id === card.serviceIds?.[0]
    );
    if (!baseService) {
      console.warn(`⚠️ Skipping card ${card.name}: no base service found`);
      continue;
    }

    // Find configuration for this service+location combo
    // Note: card.locationId has prefix like "physical-xxx"
    // config.locationId also has prefix like "physical-xxx"
    // So we should compare them directly
    const config = serviceLocation.configurations?.find(
      (c) => c.serviceId === card.serviceId && c.locationId === card.locationId
    );

    // Extract price with override support
    const priceCents = config?.customPrice
      ? Math.round(config.customPrice * 100)
      : Math.round(parseFloat(baseService.price) * 100);

    // Extract duration with override support
    const duration: number = (config?.customDuration || baseService.duration || "60").toString();

    // Validate it's a valid duration option
    const validDurations = SERVICE_DURATION_OPTIONS.map((option) => option.value);
    const durationString = validDurations.includes(duration.toString())
      ? duration.toString()
      : "60";

    // Map the location ID from the card
    const locationIdToLookup = card.locationId ? stripLocationPrefix(card.locationId) : null;
    const realLocationId = locationIdToLookup ? locationIdMap.get(locationIdToLookup) : null;

    if (!realLocationId) {
      console.warn(`⚠️ Skipping card ${card.id}: no location mapping found for ${card.locationId}`);
      continue;
    }

    // Map employee ID
    const realEmployeeId = card.employeeId ? employeeIdMap.get(card.employeeId) : null;

    // Get business defaults
    const bufferTime = businessEmployeeAvailability?.businessDefaults?.bufferTime || 0;
    const advanceBookingNotice =
      businessEmployeeAvailability?.businessDefaults?.advanceBookingNotice || "next_day";

    const serviceData = {
      business_id: businessId,
      name: baseService.name,
      description: baseService.description || null,
      duration: durationString, // New: string value (not duration_minutes)
      price_type: baseService.priceType || "fixed",
      price_cents: priceCents,
      price_min: null,
      price_max: null,
      category: baseService.category || null,
      is_active: true,
      employee_id: realEmployeeId,
      location_id: realLocationId, // New: required location ID
      buffer_time_minutes: bufferTime, // New: buffer time
      booking_time_advance: advanceBookingNotice,
    };

    console.log(`🔍 Creating service for card ${card.id} with data:`, {
      name: serviceData.name,
      price_cents: serviceData.price_cents,
      duration: serviceData.duration,
      location_id: serviceData.location_id,
      buffer_time_minutes: serviceData.buffer_time_minutes,
      employee_id: serviceData.employee_id,
    });

    const { data: svc, error: serviceError } = await supabase
      .from("services")
      .insert(serviceData)
      .select()
      .single();

    if (serviceError) {
      console.error(`❌ Service error for card ${card.id}: ${serviceError.message}`);
      throw new Error(`Service creation failed: ${serviceError.message}`);
    }

    // Track the service ID for rollback
    rollbackTracker.serviceIds.push(svc.id);
    // Map card.id to new service UUID (1:1 mapping)
    serviceIdMap.set(card.id, svc.id);
    console.log(`💼 Service created: ${baseService.name} -> ${svc.id} (for card ${card.id})`);
  }

  return { serviceIdMap };
}

// ============================================================================
// STEP 5: EMPLOYEES
// ============================================================================

export async function publishEmployees(
  supabase: SupabaseClient,
  businessId: string,
  bookingStrategy: BookingStrategy,
  locationIdMap: Map<string, string>,
  rollbackTracker: RollbackTracker
  // idNormalizer: IdNormalizer
): Promise<{ employeeIdMap: Map<string, string> }> {
  const employeeIdMap = new Map<string, string>();
  const employees = bookingStrategy?.employees || [];

  console.log(`👥 JOEY employees to publish:`, employees);

  // Group employees by email to avoid duplicates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueEmployees = new Map<string, any>();
  for (const emp of employees) {
    const key = emp.email || emp.fullName;
    if (!uniqueEmployees.has(key)) {
      uniqueEmployees.set(key, emp);
    }
  }

  for (const emp of uniqueEmployees.values()) {
    // Generate new UUID for this employee
    // const newEmployeeId = idNormalizer.getOrCreateUuid(emp.id);

    // Strip location prefix before looking up in locationIdMap
    const locationIdToLookup = emp.locationId ? stripLocationPrefix(emp.locationId) : null;
    const realLocationId = locationIdToLookup ? locationIdMap.get(locationIdToLookup) : null;

    const empData = {
      business_id: businessId,
      location_id: realLocationId,
      full_name: emp.fullName,
      email: emp.email || null,
      phone: null,
      title: emp.role || null,
      bio: null,
      profile_image_url: null,
      is_active: true,
    };

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .insert(empData)
      .select()
      .single();

    if (empError) throw new Error(`Employee error: ${empError.message}`);

    // Track the employee ID for rollback
    rollbackTracker.employeeIds.push(employee.id);

    // Map all instances of this employee to the same ID
    for (const e of employees) {
      if ((e.email || e.fullName) === (emp.email || emp.fullName)) {
        employeeIdMap.set(e.id, employee.id);
      }
    }

    console.log(
      `👥 Employee created: ${emp.fullName} -> ${employee.id} (normalized from ${emp.id})`
    );
  }

  return { employeeIdMap };
}

// ============================================================================
// STEP 6: EMPLOYEE-SERVICE RELATIONSHIPS
// ============================================================================

export async function publishEmployeeServices(
  supabase: SupabaseClient,
  cardStudio: CardStudio,
  employeeIdMap: Map<string, string>,
  serviceIdMap: Map<string, string>,
  rollbackTracker: RollbackTracker
): Promise<void> {
  const cards = cardStudio?.cards || [];
  const uniquePairs = new Set<string>();

  // Extract employee-service relationships from employee cards
  for (const card of cards) {
    if (card.type === "employee" && card.employeeId && card.serviceIds) {
      const realEmployeeId = employeeIdMap.get(card.employeeId);

      for (const serviceId of card.serviceIds) {
        const realServiceId = serviceIdMap.get(serviceId);

        if (realEmployeeId && realServiceId) {
          const pairKey = `${realEmployeeId}-${realServiceId}`;
          if (!uniquePairs.has(pairKey)) {
            uniquePairs.add(pairKey);

            const { data: empSvc, error: empSvcError } = await supabase
              .from("employee_services")
              .insert({
                employee_id: realEmployeeId,
                service_id: realServiceId,
              })
              .select()
              .single();

            if (empSvcError && empSvcError.code !== "23505") {
              console.error(`❌ Employee-service error: ${empSvcError.message}`);
              console.error(`❌ Employee-service data:`, {
                employee_id: realEmployeeId,
                service_id: realServiceId,
              });
              throw new Error(`Employee-service relationship error: ${empSvcError.message}`);
            } else if (empSvc) {
              // Track the employee-service relationship ID for rollback
              rollbackTracker.employeeServiceIds.push(empSvc.id);
            }
          }
        }
      }
    }
  }

  console.log(`🔗 Created ${uniquePairs.size} employee-service relationships`);
}

// ============================================================================
// STEP 7: SERVICE CONFIGURATIONS
// ============================================================================

export async function publishServiceConfigurations(
  supabase: SupabaseClient,
  serviceLocation: ServiceLocation,
  serviceIdMap: Map<string, string>,
  locationIdMap: Map<string, string>,
  resourceIdMap: Map<string, string>,
  rollbackTracker: RollbackTracker
): Promise<void> {
  const configurations = serviceLocation?.configurations || [];

  for (const config of configurations) {
    if (!config.enabled) continue;

    const realServiceId = serviceIdMap.get(config.serviceId);
    const realLocationId = locationIdMap.get(config.locationId);

    if (!realServiceId || !realLocationId) continue;

    // Map required resources
    const requiredResourceIds = (config.requiredResources || [])
      .map((resId: string) => resourceIdMap.get(resId))
      .filter(Boolean);

    const configData = {
      service_id: realServiceId,
      location_id: realLocationId,
      required_resources: requiredResourceIds.length > 0 ? requiredResourceIds : null,
      is_active: true,
    };

    const { data: serviceConfig, error: configError } = await supabase
      .from("service_configurations")
      .insert(configData)
      .select()
      .single();

    if (configError && configError.code !== "23505") {
      console.error(`❌ Config error: ${configError.message}`);
      console.error(`❌ Config data:`, configData);
      throw new Error(`Service configuration error: ${configError.message}`);
    } else if (serviceConfig) {
      // Track the service configuration ID for rollback
      rollbackTracker.serviceConfigurationIds.push(serviceConfig.id);
      console.log(
        `⚙️ Service configuration created: service ${config.serviceId} @ location ${config.locationId} -> ${serviceConfig.id}`
      );
    }
  }
}

// ============================================================================
// STEP 8: SERVICE CARDS (SIMPLIFIED)
// ============================================================================

export async function publishServiceCards(
  supabase: SupabaseClient,
  businessId: string,
  cardStudio: CardStudio,
  serviceIdMap: Map<string, string>,
  locationIdMap: Map<string, string>,
  employeeIdMap: Map<string, string>,
  rollbackTracker: RollbackTracker
  // idNormalizer: IdNormalizer
): Promise<{ cardIdMap: Map<string, string> }> {
  const cards = cardStudio?.cards || [];
  const cardIdMap = new Map<string, string>();

  console.log(`Publishing ${cards.length} service cards...`);

  for (const card of cards) {
    // Generate new UUID for this card
    // const newCardId = idNormalizer.getOrCreateUuid(card.id);

    // Map service ID - use the serviceIdMap to get normalized UUID
    const realServiceId = serviceIdMap.get(card.id) || null;

    // Map location ID - strip prefix before lookup
    const locationIdToLookup = card.locationId ? stripLocationPrefix(card.locationId) : null;
    const realLocationId = locationIdToLookup ? locationIdMap.get(locationIdToLookup) : null;

    // Map employee ID - use employeeIdMap to get normalized UUID
    const realEmployeeId = card.employeeId ? employeeIdMap.get(card.employeeId) : null;

    // Build media settings JSONB
    const mediaSettings = card.mediaSettings || {};

    // Build badges array
    const badges: string[] = [];
    if (card.badges) {
      if (card.badges.licensed) badges.push("Licensed");
      if (card.badges.experience) badges.push(`${card.badges.experienceYears}+ years`);
      if (card.badges.locallyOwned) badges.push("Locally Owned");
      if (card.badges.custom) badges.push(card.badges.custom);
    }

    // Build card data
    const cardData = {
      business_id: businessId,
      card_type: card.type || "business",
      display_name: card.name || card.headline,
      tagline: card.tagline || null,
      description: card.description || null,

      // Media
      media_type: card.mediaType || null,
      media_url: card.mediaUrl || null,
      media_storage_path: card.mediaStoragePath || null,
      media_settings: mediaSettings,

      // Profile image
      profile_image_url: card.profileImage || null,
      profile_storage_path: card.profileStoragePath || null,

      // Styling
      badges: badges,

      // CTA
      cta_text: card.ctaText || "Book Now",
      cta_url: null,

      // Relationships
      service_id: realServiceId,
      location_id: realLocationId, // Singular
      employee_id: realEmployeeId,

      // Metadata
      display_order: 0,
      is_active: false, // Will be updated to true after requirements are processed
    };

    if (!realServiceId) {
      console.warn(`⚠️ Skipping card ${card.name}: no service_id found`);
      continue;
    }

    console.log(`🔍 Creating service card for ${card.name} with service_id: ${realServiceId}`);

    const { data: insertedCard, error: cardError } = await supabase
      .from("service_cards")
      .insert(cardData)
      .select()
      .single();

    if (cardError) {
      console.error(`❌ Card error for ${card.name}: ${cardError.message}`);
      throw new Error(`Service card creation failed: ${cardError.message}`);
    } else {
      // Track the service card ID for rollback
      rollbackTracker.serviceCardIds.push(insertedCard.id);
      // Map the draft card ID to the real database ID
      cardIdMap.set(card.id, insertedCard.id);
      console.log(
        `🎴 Service card created: ${card.name} -> ${insertedCard.id} (normalized from ${card.id})`
      );
    }
  }

  console.log("Service cards published successfully");
  return { cardIdMap };
}

// ============================================================================
// STEP 8A: CALENDAR GROUPS
// ============================================================================

interface CalendarIntegrationNew {
  calendarAssignments?: Array<{
    entityId: string;
    entityType: string;
    isPending?: boolean;
    calendarId: string;
  }>;
  serviceLocationCombos?: Array<{
    id: string;
    services: Array<{
      id: string;
      name: string;
      locationId: string;
    }>;
    requirements?: Array<{
      id: string;
      type: string;
      displayName: string;
      logicOperator?: string;
      calendar?: {
        defaultCalendarId: string;
        busyCalendars?: string[];
      };
    }>;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export async function publishCalendarGroups(
  supabase: SupabaseClient,
  businessId: string,
  calendarIntegrationNew: CalendarIntegrationNew,
  locationIdMap: Map<string, string>,
  employeeIdMap: Map<string, string>,
  resourceIdMap: Map<string, string>,
  rollbackTracker: RollbackTracker,
  idNormalizer: IdNormalizer,
  calendarManagement?: Record<string, unknown>
): Promise<{ calendarGroupIdMap: Map<string, string> }> {
  const calendarGroupIdMap = new Map<string, string>();
  const calendarAssignments = calendarIntegrationNew?.calendarAssignments || [];

  console.log(`🔍 DEBUG Starting calendar group processing:`);
  console.log(`  - Total assignments: ${calendarAssignments.length}`);
  console.log(
    `  - All assignments:`,
    calendarAssignments.map((a) => ({
      entityType: a.entityType,
      entityId: a.entityId,
      isPending: a.isPending,
      calendarId: a.calendarId,
    }))
  );
  console.log(`📍 Available location IDs in map:`, Array.from(locationIdMap.keys()));
  console.log(`👥 Available employee IDs in map:`, Array.from(employeeIdMap.keys()));

  for (const assignment of calendarAssignments) {
    const { entityId, entityType, isPending, calendarId } = assignment;
    console.log(`🔍 Processing assignment: ${entityType} ${entityId}`);

    // Strip prefix from entityId before looking it up in the appropriate map
    let realEntityId: string | undefined;
    if (entityType === "location") {
      const locationIdToLookup = stripLocationPrefix(entityId);
      console.log(`📍 Looking up location: ${entityId} -> ${locationIdToLookup}`);
      realEntityId = locationIdMap.get(locationIdToLookup);
    } else if (entityType === "employee") {
      realEntityId = employeeIdMap.get(entityId);
    } else if (entityType === "resource") {
      realEntityId = resourceIdMap.get(entityId);
    }

    if (!realEntityId) {
      console.error(`❌ CRITICAL: Could not map ${entityType} ${entityId} to real ID`);
      if (entityType === "location") {
        console.error(`❌ Available location IDs:`, Array.from(locationIdMap.keys()));
      } else if (entityType === "employee") {
        console.error(`❌ Available employee IDs:`, Array.from(employeeIdMap.keys()));
      } else if (entityType === "resource") {
        console.error(`❌ Available resource IDs:`, Array.from(resourceIdMap.keys()));
      }
      throw new Error(
        `Publishing failed: Could not map ${entityType} ${entityId} to real ID. ` +
          `This indicates a data inconsistency between calendar assignments and published entities.`
      );
    }

    // Determine if this is a "configure_later" scenario
    const isConfigureLater = calendarId === "configure_later";
    const pendingConfiguration = isPending || isConfigureLater;

    console.log(`🔍 DEBUG Calendar Group Creation:`);
    console.log(`  - entityType: ${entityType}`);
    console.log(`  - entityId: ${entityId}`);
    console.log(`  - calendarId: ${calendarId}`);
    console.log(`  - isPending: ${isPending}`);
    console.log(`  - isConfigureLater: ${isConfigureLater}`);
    console.log(`  - pendingConfiguration: ${pendingConfiguration}`);

    // For configure_later, we still need a default_booking_calendar_id
    // Use a placeholder that indicates it needs configuration
    const defaultCalendarId = isConfigureLater ? "configure_later" : calendarId;

    // Extract busy calendar IDs from calendar_management.calendarAssignments
    let busyCalendarIds: string[] = [];

    if (
      calendarManagement?.calendarAssignments &&
      Array.isArray(calendarManagement.calendarAssignments)
    ) {
      // Find the matching assignment in calendar_management
      const managementAssignment = calendarManagement.calendarAssignments.find(
        (ma: Record<string, unknown>) =>
          ma.assignmentId === entityId && ma.assignmentType === entityType
      );

      if (
        managementAssignment?.busyCalendars &&
        Array.isArray(managementAssignment.busyCalendars)
      ) {
        busyCalendarIds = managementAssignment.busyCalendars
          .map((busyCal: Record<string, unknown>) => busyCal.calendarId as string)
          .filter(Boolean);
        console.log(
          `📅 Found ${busyCalendarIds.length} busy calendars for ${entityType} ${entityId}:`,
          busyCalendarIds
        );
      }
    }

    const calendarGroupData = {
      business_id: businessId,
      entity_type: entityType,
      entity_id: realEntityId,
      default_booking_calendar_id: defaultCalendarId,
      busy_calendar_ids: busyCalendarIds, // Now populated from busyCalendars
      display_name: null, // Will be populated later
      calendar_provider: isConfigureLater ? null : "google", // Assume google for now
      is_configured: !isConfigureLater,
      pending_configuration: pendingConfiguration,
    };

    console.log(`📝 DEBUG Calendar Group Data being inserted:`, {
      entity_type: calendarGroupData.entity_type,
      entity_id: calendarGroupData.entity_id,
      pending_configuration: calendarGroupData.pending_configuration,
      is_configured: calendarGroupData.is_configured,
      default_booking_calendar_id: calendarGroupData.default_booking_calendar_id,
    });

    const { data: calendarGroup, error: calendarError } = await supabase
      .from("calendar_groups")
      .insert(calendarGroupData)
      .select()
      .single();

    if (calendarError) {
      // Check if it's a duplicate key error (already exists)
      if (calendarError.code === "23505") {
        console.log(`⚠️  Duplicate calendar group detected, updating existing record...`);
        // Try to fetch existing record
        const { data: existing, error: fetchError } = await supabase
          .from("calendar_groups")
          .select("id, pending_configuration, is_configured")
          .eq("entity_type", entityType)
          .eq("entity_id", realEntityId)
          .single();

        if (fetchError) {
          console.error(`❌ Error fetching existing calendar group: ${fetchError.message}`);
          throw new Error(`Failed to fetch existing calendar group: ${fetchError.message}`);
        }

        if (existing) {
          console.log(`🔍 DEBUG Existing calendar group:`, {
            id: existing.id,
            current_pending_configuration: existing.pending_configuration,
            current_is_configured: existing.is_configured,
            new_pending_configuration: pendingConfiguration,
            new_is_configured: !isConfigureLater,
          });

          // Update the existing record with the new pending configuration status
          const { data: updated, error: updateError } = await supabase
            .from("calendar_groups")
            .update({
              pending_configuration: pendingConfiguration,
              is_configured: !isConfigureLater,
              default_booking_calendar_id: defaultCalendarId,
              busy_calendar_ids: busyCalendarIds,
              calendar_provider: isConfigureLater ? null : "google",
            })
            .eq("id", existing.id)
            .select()
            .single();

          if (updateError) {
            console.error(`❌ Error updating calendar group: ${updateError.message}`);
            throw new Error(`Failed to update calendar group: ${updateError.message}`);
          }

          console.log(`✅ DEBUG Updated calendar group:`, {
            id: updated.id,
            pending_configuration: updated.pending_configuration,
            is_configured: updated.is_configured,
          });

          const mapKey = `${entityType}-${entityId}`;
          calendarGroupIdMap.set(mapKey, existing.id);

          // Also store stripped version
          if (entityType === "location") {
            const strippedEntityId = stripLocationPrefix(entityId);
            if (strippedEntityId !== entityId) {
              calendarGroupIdMap.set(`${entityType}-${strippedEntityId}`, existing.id);
            }
          } else if (entityType === "resource") {
            const strippedEntityId = stripIdPrefix(entityId);
            if (strippedEntityId !== entityId) {
              calendarGroupIdMap.set(`${entityType}-${strippedEntityId}`, existing.id);
            }
          }

          console.log(`  ✅ Calendar group updated: ${entityType} ${entityId} -> ${existing.id}`);
        }
      } else {
        console.warn(`⚠️ Calendar group error: ${calendarError.message}`);
        throw new Error(`Calendar group creation failed: ${calendarError.message}`);
      }
      continue;
    }

    // Track the calendar group ID for rollback
    rollbackTracker.calendarGroupIds.push(calendarGroup.id);

    // Store MULTIPLE key variations for flexible lookup
    const mapKey = `${entityType}-${entityId}`;
    calendarGroupIdMap.set(mapKey, calendarGroup.id);

    // Also store stripped version for locations
    if (entityType === "location") {
      const strippedEntityId = stripLocationPrefix(entityId);
      if (strippedEntityId !== entityId) {
        const strippedKey = `${entityType}-${strippedEntityId}`;
        calendarGroupIdMap.set(strippedKey, calendarGroup.id);
      }
    }
    // Also store stripped version for resources
    else if (entityType === "resource") {
      const strippedEntityId = stripIdPrefix(entityId);
      if (strippedEntityId !== entityId) {
        const strippedKey = `${entityType}-${strippedEntityId}`;
        calendarGroupIdMap.set(strippedKey, calendarGroup.id);
      }
    }
    // Employees use timestamp IDs, no prefix stripping needed

    console.log(`📅 Calendar group created: ${entityType} ${entityId} -> ${calendarGroup.id}`);
    console.log(`✅ DEBUG Calendar Group Created - Verification:`, {
      calendarGroupId: calendarGroup.id,
      pending_configuration: calendarGroup.pending_configuration,
      is_configured: calendarGroup.is_configured,
      entity_type: calendarGroup.entity_type,
      entity_id: calendarGroup.entity_id,
    });

    // If this is an employee with pending configuration, update the employee record
    if (entityType === "employee" && pendingConfiguration) {
      await supabase
        .from("employees")
        .update({
          calendar_connection_required: true,
          calendar_connected: false,
        })
        .eq("id", realEntityId);
    }
  }

  console.log(`📅 Total calendar groups created: ${rollbackTracker.calendarGroupIds.length}`);
  console.log(`📅 Calendar group map keys:`, Array.from(calendarGroupIdMap.keys()));

  return { calendarGroupIdMap };
}

// ============================================================================
// STEP 8B: SERVICE CARD REQUIREMENTS
// ============================================================================

// interface RequirementItem {
//   id: string;
//   type: string;
//   displayName: string;
//   logicOperator?: string;
//   calendar?: {
//     defaultCalendarId: string;
//     busyCalendars?: string[];
//   };
// }

export async function publishServiceCardRequirements(
  supabase: SupabaseClient,
  calendarIntegrationNew: CalendarIntegrationNew,
  cardIdMap: Map<string, string>,
  calendarGroupIdMap: Map<string, string>,
  serviceIdMap: Map<string, string>,
  locationIdMap: Map<string, string>,
  employeeIdMap: Map<string, string>,
  resourceIdMap: Map<string, string>,
  rollbackTracker: RollbackTracker
): Promise<void> {
  const serviceLocationCombos = calendarIntegrationNew?.serviceLocationCombos || [];

  console.log(
    `Processing requirements for ${serviceLocationCombos.length} service location combos...`
  );

  // Build a map of service+location → card IDs for quick lookup
  const serviceLocationToCards = new Map<string, string[]>();

  console.log(`🔍 DEBUG Building serviceLocationToCards map:`);
  console.log(`  - cardIdMap size: ${cardIdMap.size}`);

  for (const [draftCardId, realCardId] of cardIdMap.entries()) {
    const locationFromCardId = extractLocationFromCardId(draftCardId);
    if (locationFromCardId) {
      const cleanLocationId = stripLocationPrefix(locationFromCardId);

      if (draftCardId.startsWith("service-")) {
        const match = draftCardId.match(/^service-([^@]+)@/);
        if (match) {
          const serviceId = match[1];
          const lookupKey = `${serviceId}_${cleanLocationId}`;
          if (!serviceLocationToCards.has(lookupKey)) {
            serviceLocationToCards.set(lookupKey, []);
          }
          serviceLocationToCards.get(lookupKey)!.push(realCardId);
          console.log(
            `  📍 Mapped service card: ${lookupKey} -> ${realCardId} (from ${draftCardId})`
          );
        }
      } else if (draftCardId.startsWith("emp-")) {
        const parts = draftCardId.split("-");
        if (parts.length >= 3) {
          const serviceId = parts[2];
          const lookupKey = `${serviceId}_${cleanLocationId}`;
          if (!serviceLocationToCards.has(lookupKey)) {
            serviceLocationToCards.set(lookupKey, []);
          }
          serviceLocationToCards.get(lookupKey)!.push(realCardId);
          console.log(
            `  👤 Mapped employee card: ${lookupKey} -> ${realCardId} (from ${draftCardId})`
          );
        }
      }
    } else {
      console.log(`  ⚠️  Card ${draftCardId} has no location extracted`);
    }
  }

  console.log(`✅ DEBUG serviceLocationToCards map built:`);
  console.log(`  - Total mappings: ${serviceLocationToCards.size}`);
  console.log(`  - Keys:`, Array.from(serviceLocationToCards.keys()));

  // Track which cards get requirements
  const cardsWithRequirements = new Set<string>();

  // NEW: Track all requirements per card before updating
  // Map<cardId, { requirementRows: Array, pendingCount: number, expression: string }>
  const cardRequirementsMap = new Map<
    string,
    {
      requirementRows: Array<{
        sequence_order: number;
        logic_operator: string | null;
        calendar_group_id: string | null;
        entity_type: string;
        entity_id: string;
        display_name: string;
      }>;
      pendingCount: number;
      expression: string;
    }
  >();

  // Process each combo - collect requirements but don't update cards yet
  console.log(`🔍 DEBUG Starting requirements processing:`);
  console.log(`  - Total serviceLocationCombos: ${serviceLocationCombos.length}`);
  console.log(`  - calendarGroupIdMap size: ${calendarGroupIdMap.size}`);
  console.log(`  - calendarGroupIdMap keys:`, Array.from(calendarGroupIdMap.keys()));

  for (const combo of serviceLocationCombos) {
    const requirements = combo.requirements || [];
    console.log(`🔍 DEBUG Processing combo:`);
    console.log(`  - Combo ID: ${combo.id}`);
    console.log(`  - Requirements count: ${requirements.length}`);
    console.log(`  - Services count: ${combo.services?.length || 0}`);

    if (requirements.length === 0) {
      console.log(`  ⏭️  Skipping combo ${combo.id}: no requirements`);
      continue;
    }

    requirements.forEach((req: Record<string, unknown>, idx: number) => {
      console.log(`  📋 Requirement ${idx}:`, {
        id: req.id,
        type: req.type,
        displayName: req.displayName,
        logicOperator: req.logicOperator,
      });
    });

    // Collect all unique cards for ALL services in this combo first
    const uniqueCardsForCombo = new Set<string>();

    // Extract employee ID from combo if this is an employee-location combo
    const comboEmployeeId = (combo as { employeeId?: string }).employeeId || null;

    // First pass: collect all matching cards for all services in this combo
    for (const service of combo.services) {
      const cleanServiceId = stripIdPrefix(service.id);
      const cleanLocationId = stripLocationPrefix(service.locationId);
      const lookupKey = `${cleanServiceId}_${cleanLocationId}`;
      const matchingCards = serviceLocationToCards.get(lookupKey);

      if (!matchingCards || matchingCards.length === 0) {
        console.error(
          `❌ CRITICAL: No card found for service ${service.id} @ location ${service.locationId}`
        );
        console.error(
          `❌ Available service+location combinations:`,
          Array.from(serviceLocationToCards.keys())
        );
        console.error(`❌ Combo:`, combo);
        throw new Error(
          `Publishing failed: No service card found for service ${service.id} at location ${service.locationId}. ` +
            `This indicates a data inconsistency between card_studio.cards and calendar_integration_new.serviceLocationCombos.`
        );
      }

      // Filter by employee if this is an employee-location combo
      // For location-only combos, only match service cards (not employee cards)
      for (const matchingCardId of matchingCards) {
        // Check if this is an employee card
        let isEmployeeCard = false;
        for (const [draftCardId, realCardId] of cardIdMap.entries()) {
          if (realCardId === matchingCardId && draftCardId.startsWith("emp-")) {
            isEmployeeCard = true;
            break;
          }
        }

        if (comboEmployeeId) {
          // Employee-location combo: only match cards for this specific employee
          if (!isEmployeeCard) {
            continue; // Skip non-employee cards for employee-location combos
          }

          // Check if this card belongs to the employee in the combo
          let cardBelongsToEmployee = false;
          for (const [draftCardId, realCardId] of cardIdMap.entries()) {
            if (realCardId === matchingCardId && draftCardId.startsWith("emp-")) {
              const empParts = draftCardId.split("-");
              if (empParts.length >= 2 && empParts[1] === comboEmployeeId) {
                cardBelongsToEmployee = true;
                break;
              }
            }
          }

          if (!cardBelongsToEmployee) {
            continue; // Skip this card
          }
        } else {
          // Location-only combo: only match service cards (not employee cards)
          if (isEmployeeCard) {
            continue; // Skip employee cards for location-only combos
          }
        }

        uniqueCardsForCombo.add(matchingCardId);
      }
    }

    // Second pass: apply requirements ONCE to each unique card
    for (const matchingCardId of uniqueCardsForCombo) {
      // Initialize card requirements if not already done
      if (!cardRequirementsMap.has(matchingCardId)) {
        cardRequirementsMap.set(matchingCardId, {
          requirementRows: [],
          pendingCount: 0,
          expression: "",
        });
      }

      const cardReqs = cardRequirementsMap.get(matchingCardId)!;

      // For this combo, start fresh - don't accumulate from previous combos
      // Each combo's requirements are independent
      const requirementRows: Array<{
        sequence_order: number;
        logic_operator: string | null;
        calendar_group_id: string | null;
        entity_type: string;
        entity_id: string;
        display_name: string;
      }> = [];

      let sequenceOrder = 0; // Start fresh for this combo
      let pendingCount = 0; // Start fresh for this combo
      const expressionParts: string[] = [];
      let inGroup = false;
      let lastNormalizedEntityId: string | undefined;

      // Track existing calendar group IDs to prevent duplicates WITHIN this combo
      const existingCalendarGroupIds = new Set<string>();

      for (let i = 0; i < requirements.length; i++) {
        const req = requirements[i];
        const nextReq = requirements[i + 1];
        const hasOrOperator = nextReq && nextReq.logicOperator === "OR";

        // Map the entity_id to the normalized UUID based on entity type
        let normalizedEntityId: string;
        if (req.type === "employee") {
          const mappedEmployeeId = employeeIdMap.get(req.id);
          if (!mappedEmployeeId) {
            console.error(`❌ CRITICAL: Employee ID ${req.id} not found in employeeIdMap`);
            console.error(`❌ Available employee IDs:`, Array.from(employeeIdMap.keys()));
            throw new Error(`Employee ID ${req.id} not found in employeeIdMap`);
          }
          normalizedEntityId = mappedEmployeeId;
        } else if (req.type === "resource") {
          const mappedResourceId = resourceIdMap.get(req.id);
          if (!mappedResourceId) {
            console.error(`❌ CRITICAL: Resource ID ${req.id} not found in resourceIdMap`);
            console.error(`❌ Available resource IDs:`, Array.from(resourceIdMap.keys()));
            throw new Error(`Resource ID ${req.id} not found in resourceIdMap`);
          }
          normalizedEntityId = mappedResourceId;
        } else if (req.type === "location") {
          const cleanLocationId = stripLocationPrefix(req.id);
          const mappedLocationId = locationIdMap.get(cleanLocationId);
          if (!mappedLocationId) {
            console.error(`❌ CRITICAL: Location ID ${req.id} not found in locationIdMap`);
            console.error(`❌ Available location IDs:`, Array.from(locationIdMap.keys()));
            throw new Error(`Location ID ${req.id} not found in locationIdMap`);
          }
          normalizedEntityId = mappedLocationId;
        } else {
          throw new Error(`Unknown entity type: ${req.type}`);
        }

        // Find the calendar group for this requirement
        const cleanReqId = stripIdPrefix(req.id);
        const calendarGroupKey = `${req.type}-${cleanReqId}`;
        const calendarGroupId = calendarGroupIdMap.get(calendarGroupKey);

        if (!calendarGroupId) {
          console.error(`❌ CRITICAL: No calendar group found for ${calendarGroupKey}`);
          console.error(`❌ Available calendar groups:`, Array.from(calendarGroupIdMap.keys()));
          console.error(`❌ Requirement:`, req);
          throw new Error(
            `Publishing failed: No calendar group found for ${req.type} ${req.id}. ` +
              `This indicates that calendar assignments are missing or incomplete.`
          );
        }

        // Skip if we've already added this calendar group requirement IN THIS COMBO
        if (existingCalendarGroupIds.has(calendarGroupId)) {
          continue;
        }

        // Check if we need to start a group (if we have ORs)
        if (hasOrOperator && !inGroup) {
          requirementRows.push({
            sequence_order: sequenceOrder++,
            logic_operator: "START_GROUP",
            calendar_group_id: null,
            entity_type: req.type,
            entity_id: normalizedEntityId,
            display_name: "(",
          });
          expressionParts.push("(");
          inGroup = true;
        }

        // Add the requirement row
        requirementRows.push({
          sequence_order: sequenceOrder++,
          logic_operator: null,
          calendar_group_id: calendarGroupId,
          entity_type: req.type,
          entity_id: normalizedEntityId,
          display_name: req.displayName,
        });
        expressionParts.push(req.displayName);
        existingCalendarGroupIds.add(calendarGroupId);

        // Check if this calendar group is pending
        const { data: calendarGroup, error: calendarGroupQueryError } = await supabase
          .from("calendar_groups")
          .select(
            "pending_configuration, is_configured, entity_type, entity_id, default_booking_calendar_id"
          )
          .eq("id", calendarGroupId)
          .single();

        if (calendarGroupQueryError) {
          console.error(`❌ ERROR querying calendar group:`, calendarGroupQueryError);
          throw new Error(`Failed to query calendar group: ${calendarGroupQueryError.message}`);
        }

        if (!calendarGroup) {
          console.error(`❌ ERROR: Calendar group ${calendarGroupId} not found in database`);
          throw new Error(`Calendar group ${calendarGroupId} not found in database`);
        }

        // A calendar group is pending if:
        // 1. pending_configuration is true, OR
        // 2. default_booking_calendar_id is "configure_later" (even if pending_configuration is false)
        const isPending =
          calendarGroup.pending_configuration === true ||
          calendarGroup.default_booking_calendar_id === "configure_later";

        if (isPending) {
          pendingCount++;
        }

        // Add the logic operator if there's a next requirement
        if (nextReq) {
          const operator = nextReq.logicOperator || "AND";

          // If we're in a group and the next operator is AND, close the group first
          if (inGroup && operator === "AND") {
            requirementRows.push({
              sequence_order: sequenceOrder++,
              logic_operator: "END_GROUP",
              calendar_group_id: null,
              entity_type: req.type,
              entity_id: normalizedEntityId,
              display_name: ")",
            });
            expressionParts.push(")");
            inGroup = false;
          }

          // Add the operator (OR or AND)
          if (operator === "OR") {
            requirementRows.push({
              sequence_order: sequenceOrder++,
              logic_operator: "OR",
              calendar_group_id: null,
              entity_type: req.type,
              entity_id: normalizedEntityId,
              display_name: "OR",
            });
            expressionParts.push("OR");
          } else if (operator === "AND") {
            requirementRows.push({
              sequence_order: sequenceOrder++,
              logic_operator: "AND",
              calendar_group_id: null,
              entity_type: req.type,
              entity_id: normalizedEntityId,
              display_name: "AND",
            });
            expressionParts.push("AND");
          }
        }

        // Track this for potential group closing after loop
        lastNormalizedEntityId = normalizedEntityId;
      }

      // Close any remaining group
      if (inGroup) {
        requirementRows.push({
          sequence_order: sequenceOrder++,
          logic_operator: "END_GROUP",
          calendar_group_id: null,
          entity_type: requirements[requirements.length - 1].type,
          entity_id: lastNormalizedEntityId!,
          display_name: ")",
        });
        expressionParts.push(")");
      }

      // Build human-readable expression for THIS combo only
      const expression = expressionParts.join(" ");

      // Append requirements from this combo to the card
      // But replace the expression - don't combine with other combos
      if (requirementRows.length > 0) {
        // Append requirement rows (they accumulate across combos)
        cardReqs.requirementRows.push(...requirementRows);
        // Accumulate pending count across combos
        cardReqs.pendingCount += pendingCount;
        // Replace expression - only show THIS combo's requirements
        // If card matches multiple combos, the last combo's expression wins
        // OR we could combine, but user wants ONLY what's in requirements array
        cardReqs.expression = expression; // Replace, not combine
      }
    }
  }

  // Now insert all requirement rows and update cards once
  for (const [matchingCardId, cardReqs] of cardRequirementsMap.entries()) {
    // Insert all requirement rows
    for (const row of cardReqs.requirementRows) {
      // Skip validation for logic operator rows (they don't need calendar_group_id)
      if (
        row.logic_operator &&
        ["START_GROUP", "END_GROUP", "OR", "AND"].includes(row.logic_operator)
      ) {
        // Logic operators are structural, validation not needed
      } else if (!matchingCardId || !row.calendar_group_id) {
        // Validate actual requirement rows
        console.error(`❌ Missing required IDs for requirement:`, {
          matchingCardId,
          calendarGroupId: row.calendar_group_id,
          row,
        });
        throw new Error(`Missing required IDs for service card requirement`);
      }

      const requirementData = {
        service_card_id: matchingCardId,
        sequence_order: row.sequence_order,
        logic_operator: row.logic_operator,
        calendar_group_id: row.calendar_group_id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        display_name: row.display_name,
      };

      const { data: requirement, error: reqError } = await supabase
        .from("service_card_requirements")
        .insert(requirementData)
        .select()
        .single();

      if (reqError && reqError.code !== "23505") {
        console.error(`❌ Requirement error: ${reqError.message}`);
        console.error(`❌ Requirement data:`, requirementData);
        throw new Error(`Service card requirement error: ${reqError.message}`);
      } else if (requirement) {
        // Track the service card requirement ID for rollback
        rollbackTracker.serviceCardRequirementIds.push(requirement.id);
      }
    }

    // Update the service card with aggregated requirements info
    const requirementsReady = cardReqs.pendingCount === 0;

    console.log(`🔍 DEBUG Final Service Card Update:`);
    console.log(`  - matchingCardId: ${matchingCardId}`);
    console.log(`  - pendingCount: ${cardReqs.pendingCount}`);
    console.log(`  - requirementsReady: ${requirementsReady}`);
    console.log(`  - expression: ${cardReqs.expression}`);
    console.log(`  - Total requirement rows: ${cardReqs.requirementRows.length}`);
    console.log(
      `  - Requirement rows with calendar_group_id:`,
      cardReqs.requirementRows.filter((r) => r.calendar_group_id).length
    );

    const updateData = {
      requirements_ready: requirementsReady,
      pending_calendar_count: cardReqs.pendingCount,
      requirements_expression: cardReqs.expression,
      is_active: requirementsReady, // Set is_active based on requirements_ready
    };

    console.log(`📝 DEBUG Update data being sent:`, updateData);

    const { error: updateError } = await supabase
      .from("service_cards")
      .update(updateData)
      .eq("id", matchingCardId);

    if (updateError) {
      console.error(`❌ ERROR updating service card:`, updateError);
      throw new Error(`Failed to update service card: ${updateError.message}`);
    }

    // Verify the update
    const { data: updatedCard, error: verifyError } = await supabase
      .from("service_cards")
      .select("pending_calendar_count, requirements_ready, is_active")
      .eq("id", matchingCardId)
      .single();

    console.log(`✅ DEBUG Service Card Update Verification:`);
    console.log(`  - Updated card:`, updatedCard);
    console.log(`  - Verify error:`, verifyError);

    // Track that this card got requirements
    cardsWithRequirements.add(matchingCardId);

    console.log(
      `  ✅ Requirements for card ${matchingCardId}: ${cardReqs.expression} (${requirementsReady ? "ready" : `${cardReqs.pendingCount} pending`})`
    );
  }

  // Final validation: ensure every card has requirements
  const cardsNeedingRequirements = Array.from(cardIdMap.values()).filter(
    (realCardId) => !cardsWithRequirements.has(realCardId)
  );

  if (cardsNeedingRequirements.length > 0) {
    console.error(`❌ CRITICAL: ${cardsNeedingRequirements.length} cards are missing requirements`);
    console.error(`❌ Cards without requirements:`, cardsNeedingRequirements);
    throw new Error(
      `Publishing failed: ${cardsNeedingRequirements.length} service cards do not have requirements. ` +
        `Every card must have calendar requirements defined.`
    );
  }
}

// ============================================================================
// STEP 8C: BOOKING CALENDAR ASSIGNMENTS
// ============================================================================

export async function publishBookingCalendarAssignments(
  supabase: SupabaseClient,
  cardIdMap: Map<string, string>,
  rollbackTracker: RollbackTracker
): Promise<void> {
  console.log(`Creating booking calendar assignments for ${cardIdMap.size} cards...`);

  // For each service card, fetch its requirements and create assignments
  for (const [draftCardId, realCardId] of cardIdMap.entries()) {
    // Fetch all calendar groups for this card
    const { data: requirements, error: reqError } = await supabase
      .from("service_card_requirements")
      .select("calendar_group_id")
      .eq("service_card_id", realCardId)
      .not("calendar_group_id", "is", null);

    if (reqError) {
      console.warn(`⚠️ Error fetching requirements for card ${draftCardId}: ${reqError.message}`);
      continue;
    }

    if (!requirements || requirements.length === 0) {
      continue;
    }

    // Get unique calendar group IDs
    const uniqueCalendarGroupIds = [
      ...new Set(requirements.map((r) => r.calendar_group_id).filter(Boolean)),
    ];

    // Create booking assignments for each calendar group
    for (const calendarGroupId of uniqueCalendarGroupIds) {
      const assignmentData = {
        service_card_id: realCardId,
        calendar_group_id: calendarGroupId,
        should_create_booking: true,
      };

      // NOTE: Not sure what this table is doing? not referenced in the project besides here.
      const { data: assignment, error: assignError } = await supabase
        .from("booking_calendar_assignments")
        .insert(assignmentData)
        .select()
        .single();

      if (assignError && assignError.code !== "23505") {
        console.error(`❌ Assignment error: ${assignError.message}`);
        console.error(`❌ Assignment data:`, assignmentData);
        throw new Error(`Booking calendar assignment error: ${assignError.message}`);
      } else if (assignment) {
        // Track the booking calendar assignment ID for rollback
        rollbackTracker.bookingCalendarAssignmentIds.push(assignment.id);
      }
    }

    console.log(
      `📆 Created ${uniqueCalendarGroupIds.length} booking assignments for card ${draftCardId}`
    );
  }
}
