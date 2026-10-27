// Initialize logger to capture all console output to app.log
import "@/lib/logger.server";

import { NextResponse } from "next/server";
import { ADMIN_USER_IDS, ONBOARDING_DRAFT_STATUS } from "../../../../constants/dbConstants";
import {
  Address,
  BookingCombination,
  Card,
  Employee,
  EmployeeServiceAssignment,
  FlattenedCard,
  FlattenedEmployee,
  FlattenedLocation,
  FlattenedService,
  ProcessedApplication,
  RawDraft,
  Service,
  ServiceConfiguration,
  ServiceLocationCombo,
  StepValidation,
} from "../../../../types/onboarding-review";
import { createClient } from "../../../../utils/supabase/server";

function processApplication(draft: RawDraft): ProcessedApplication {
  const data = draft.draft_data || {};

  // Extract business info
  const businessInfo = data.business_info || {};

  // Process locations
  const locations: FlattenedLocation[] = [];

  // Physical locations
  if (data.business_location?.["serviceTypes.physical"]?.addresses) {
    data.business_location["serviceTypes.physical"].addresses.forEach((addr: Address) => {
      locations.push({
        id: addr.id,
        name: addr.name,
        type: "physical",
        address: `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}, ${addr.city}, ${addr.state} ${addr.zipCode}`,
        resources: [],
      });
    });
  }

  // Mobile location
  if (data.business_location?.["serviceTypes.mobile"]) {
    locations.push({
      id: "mobile-service",
      name: "Mobile Service",
      type: "mobile",
      address: "Mobile Service Area",
      resources: [],
    });
  }

  // Virtual location
  if (data.business_location?.["serviceTypes.virtual"]) {
    locations.push({
      id: "virtual-service",
      name: "Virtual Services",
      type: "virtual",
      address: `${data.business_location["serviceTypes.virtual"].virtualSettings?.platform || "Virtual"} Platform`,
      resources: [],
    });
  }

  // Add resources to locations
  if (data.business_resources) {
    Object.entries(data.business_resources).forEach(
      ([locationKey, locationData]: [
        string,
        {
          name?: string;
          type?: string;
          resources?: Array<{ id: string; name: string; type: string; description: string }>;
        },
      ]) => {
        const location = locations.find((l) => l.id === locationKey || l.id === "main");
        if (location && locationData.resources) {
          location.resources = locationData.resources;
        }
      }
    );
  }

  // Process services
  const services: FlattenedService[] = [];
  const serviceData = data.business_services || data.business_service_templates?.services || [];

  serviceData.forEach((service: Service) => {
    const pricing = {
      type: service.pricing?.type || service.priceType || "fixed",
      amount: service.price,
      min: service.priceMin,
      max: service.priceMax,
      displayText: service.pricing?.displayText,
    };

    // Get locations where this service is offered
    const serviceLocations: string[] = [];
    if (data.service_location?.configurations) {
      data.service_location.configurations.forEach((config: ServiceConfiguration) => {
        if (config.serviceId === service.id && config.enabled) {
          serviceLocations.push(config.locationId);
        }
      });
    }

    // Get employees who can perform this service
    const serviceEmployees: string[] = [];
    if (data.employee_service_assignment?.assignments) {
      data.employee_service_assignment.assignments.forEach(
        (assignment: EmployeeServiceAssignment) => {
          if (assignment.serviceId === service.id && assignment.enabled) {
            serviceEmployees.push(assignment.employeeId);
          }
        }
      );
    }

    services.push({
      id: service.id,
      name: service.name,
      category: service.category,
      description: service.description,
      duration: service.duration,
      pricing,
      locations: serviceLocations,
      employees: serviceEmployees,
    });
  });

  // Process employees
  const employees: FlattenedEmployee[] = [];
  const employeeData = data.booking_strategy?.employees || [];

  employeeData.forEach((employee: Employee) => {
    // Get services this employee can perform
    const employeeServices: string[] = [];
    if (data.employee_service_assignment?.assignments) {
      data.employee_service_assignment.assignments.forEach(
        (assignment: EmployeeServiceAssignment) => {
          if (assignment.employeeId === employee.id && assignment.enabled) {
            employeeServices.push(assignment.serviceId);
          }
        }
      );
    }

    employees.push({
      id: employee.id,
      fullName: employee.fullName,
      role: employee.role,
      email: employee.email,
      locationId: employee.locationId,
      takesBookings: employee.takesBookings,
      services: employeeServices,
    });
  });

  // Process cards
  const cards: FlattenedCard[] = [];
  const cardData = data.card_studio?.cards || [];

  cardData.forEach((card: Card) => {
    // console.log(`[PROFILE PICTURE DEBUG] Processing card ${card.id}:`, {
    //   profileImage: card.profileImage,
    //   showProfileImage: card.showProfileImage,
    // });

    cards.push({
      id: card.id,
      name: card.name,
      type: card.type as "business" | "location" | "service" | "employee",
      headline: card.headline,
      tagline: card.tagline,
      description: card.description,
      serviceIds: card.serviceIds || [],
      locationId: card.locationId,
      employeeId: card.employeeId,
      mediaUrl: card.mediaUrl,
      mediaSettings: card.mediaSettings
        ? {
            zoom: card.mediaSettings.zoom ?? 1,
            panX: card.mediaSettings.panX ?? 0,
            panY: card.mediaSettings.panY ?? 0,
            overlayOpacity: card.mediaSettings.overlayOpacity ?? 0.3,
            autoPlay: card.mediaSettings.autoPlay ?? false,
            muted: card.mediaSettings.muted ?? true,
          }
        : undefined,
      profileImage: card.profileImage,
      showProfileImage: card.showProfileImage,
      price: card.price,
      ctaText: card.ctaText,
      isComplete: card.isComplete,
    });
  });

  console.log("[PROFILE PICTURE DEBUG] Total cards processed:", cards.length);
  console.log(
    "[PROFILE PICTURE DEBUG] Cards with profile images:",
    cards.filter((c) => c.profileImage).length
  );

  // Process booking combinations from calendar_integration_new
  const bookingCombinations: BookingCombination[] = [];
  const calendarIntegrationData = data.calendar_integration_new?.serviceLocationCombos || [];

  console.log("🔍 [CARD MATCHING DEBUG] Starting booking combination processing");
  console.log(
    "📊 [CARD MATCHING DEBUG] Available cards:",
    cards.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      serviceIds: c.serviceIds,
      locationId: c.locationId,
      employeeId: c.employeeId,
    }))
  );
  console.log(
    "📊 [CARD MATCHING DEBUG] Total service/location combos to process:",
    calendarIntegrationData.length
  );

  // Helper function to find the best matching card with fallback logic
  function findBestMatchingCard(
    cards: FlattenedCard[],
    employeeId: string | undefined,
    locationId: string,
    serviceIds: string[]
  ): FlattenedCard | null {
    // Helper to check if card has any matching service
    const hasMatchingService = (card: FlattenedCard) =>
      card.serviceIds.some((id: string) => serviceIds.includes(id));

    // Priority 1: Employee + Location + Service
    let matches = cards.filter(
      (card) =>
        card.employeeId === employeeId && card.locationId === locationId && hasMatchingService(card)
    );
    if (matches.length > 0) return matches[0];

    // Priority 2: Employee + Service (prefer location match)
    if (employeeId) {
      matches = cards.filter((card) => card.employeeId === employeeId && hasMatchingService(card));
      if (matches.length > 0) {
        const withLocation = matches.find((c) => c.locationId === locationId);
        return withLocation || matches[0];
      }
    }

    // Priority 3: Employee + Location (prefer service match)
    if (employeeId) {
      matches = cards.filter(
        (card) => card.employeeId === employeeId && card.locationId === locationId
      );
      if (matches.length > 0) {
        const withService = matches.find(hasMatchingService);
        return withService || matches[0];
      }
    }

    // Priority 4: Service + Location
    matches = cards.filter((card) => card.locationId === locationId && hasMatchingService(card));
    if (matches.length > 0) return matches[0];

    // Priority 5: Service Only (prefer location match)
    matches = cards.filter(hasMatchingService);
    if (matches.length > 0) {
      const withLocation = matches.find((c) => c.locationId === locationId);
      return withLocation || matches[0];
    }

    // Priority 6: Location Only
    matches = cards.filter((card) => card.locationId === locationId);
    if (matches.length > 0) return matches[0];

    // Priority 7: Business Card
    const businessCard = cards.find((card) => card.type === "business");
    return businessCard || null;
  }

  calendarIntegrationData.forEach((combo: ServiceLocationCombo, index: number) => {
    console.log(
      `\n🔄 [CARD MATCHING DEBUG] Processing combo ${index + 1}/${calendarIntegrationData.length}`
    );
    console.log("📍 [CARD MATCHING DEBUG] Combo details:", {
      id: combo.id,
      locationId: combo.locationId,
      locationName: combo.locationName,
      cardType: combo.cardType,
      logicType: combo.logicType,
      serviceCount: combo.services?.length || 0,
      services: combo.services?.map((s: { id: string; name: string }) => ({
        id: s.id,
        name: s.name,
      })),
    });

    // Extract service IDs from combo for comparison
    const comboServiceIds =
      combo.services?.map(
        (s: {
          id: string;
          name: string;
          price: number;
          locationId: string;
          requiredResources: string[];
        }) => s.id
      ) || [];
    console.log("🎯 [CARD MATCHING DEBUG] Service IDs in this combo:", comboServiceIds);

    // Extract employee ID from combo (from requirements or employeeId field)
    const comboEmployeeId =
      combo.employeeId ||
      combo.requirements?.find((r: { type: string; id: string }) => r.type === "employee")?.id;
    const comboLocationId = combo.locationId;

    console.log("🔑 [CARD MATCHING DEBUG] Matching criteria:", {
      employeeId: comboEmployeeId,
      locationId: comboLocationId,
      serviceIds: comboServiceIds,
    });

    // Use fallback logic to find the best matching card
    const associatedCard = findBestMatchingCard(
      cards,
      comboEmployeeId,
      comboLocationId,
      comboServiceIds
    );

    if (!associatedCard) {
      console.warn("❌ [CARD MATCHING] No card match found for combo:", {
        comboId: combo.id,
        comboEmployeeId,
        comboLocationId,
        comboServiceIds,
      });
    } else {
      console.log("✅ [CARD MATCHING DEBUG] Found matching card:", {
        cardId: associatedCard.id,
        cardName: associatedCard.name,
        cardType: associatedCard.type,
        cardEmployeeId: associatedCard.employeeId,
        cardLocationId: associatedCard.locationId,
        cardServiceIds: associatedCard.serviceIds,
      });
    }

    bookingCombinations.push({
      id: combo.id,
      locationId: combo.locationId,
      locationName: combo.locationName,
      locationAddress: combo.address,
      cardType: combo.cardType,
      logicType: combo.logicType,
      services: combo.services || [],
      employees: combo.employees || [],
      resources: combo.resources || [],
      requirements: (combo.requirements || []).map(
        (req: {
          id: string;
          name: string;
          type: string;
          locationId?: string;
          description?: string;
          displayName: string;
          logicOperator?: string;
        }) => ({
          id: req.id,
          name: req.name,
          type: req.type as "resource" | "employee",
          locationId: req.locationId,
          description: req.description,
          displayName: req.displayName,
          logicOperator: req.logicOperator as "AND" | "OR",
        })
      ),
      combiningAllowed: combo.combiningAllowed,
      combinedFromServices: combo.combinedFromServices || [],
      associatedCardId: associatedCard ? associatedCard.id : null,
    });
  });

  console.log("\n📋 [CARD MATCHING DEBUG] Final booking combinations summary:");
  bookingCombinations.forEach((bc, idx) => {
    const associatedCardName = cards.find((c) => c.id === bc.associatedCardId)?.name || "None";
    console.log(
      `  ${idx + 1}. ${bc.locationName} - ${bc.services.map((s: { name: string }) => s.name).join(", ")} → Card: "${associatedCardName}"`
    );
  });
  console.log("✅ [CARD MATCHING DEBUG] Booking combination processing complete\n");

  // -------------------------------------------------------------------
  // Process calendar_management merged with calendar_integration_new
  // -------------------------------------------------------------------
  const calendarManagement = {
    employeeCalendars: [] as Array<{
      id: string;
      name: string;
      email?: string;
      calendarId: string;
      calendarName: string;
      provider: string;
      isConfigured: boolean;
      needsConfiguration: boolean;
      usedInBookings: boolean;
    }>,
    locationCalendars: [] as Array<{
      id: string;
      name: string;
      calendarId: string;
      calendarName: string;
      provider: string;
      isConfigured: boolean;
      needsConfiguration: boolean;
      usedInBookings: boolean;
    }>,
    resourceCalendars: [] as Array<{
      id: string;
      name: string;
      type: string;
      calendarId: string;
      calendarName: string;
      provider: string;
      isConfigured: boolean;
      needsConfiguration: boolean;
      usedInBookings: boolean;
    }>,
    summary: {
      totalEmployeeCalendars: 0,
      totalLocationCalendars: 0,
      totalResourceCalendars: 0,
      unconfiguredCount: 0,
    },
  };

  // Get all entity IDs used in booking combinations
  const usedEmployeeIds = new Set<string>();
  const usedLocationIds = new Set<string>();
  const usedResourceIds = new Set<string>();

  calendarIntegrationData.forEach((combo: ServiceLocationCombo) => {
    if (combo.employeeId) usedEmployeeIds.add(combo.employeeId);
    if (combo.locationId) usedLocationIds.add(combo.locationId);
    combo.resources?.forEach((r: { id: string }) => usedResourceIds.add(r.id));
    combo.requirements?.forEach((req: { type: string; id: string }) => {
      if (req.type === "employee") usedEmployeeIds.add(req.id);
    });
  });

  // Process employee calendars
  const employeeCalendarsData = data.calendar_integration_new?.employeeCalendars || [];
  const calendarAssignments = data.calendar_integration_new?.calendarAssignments || [];

  employeeCalendarsData.forEach(
    (emp: { id: string; fullName?: string; name?: string; email?: string }) => {
      if (!usedEmployeeIds.has(emp.id)) return; // Skip unused employees

      const assignment = calendarAssignments.find(
        (a: { entityId: string; entityType: string; calendarId?: string; isPending?: boolean }) =>
          a.entityId === emp.id && a.entityType === "employee"
      );
      const calendarId = assignment?.calendarId || "configure_later";
      const isConfigured = calendarId !== "configure_later" && !assignment?.isPending;
      const needsConfiguration = !!(calendarId === "configure_later" || assignment?.isPending);

      calendarManagement.employeeCalendars.push({
        id: emp.id,
        name: emp.fullName || emp.name || "Unknown",
        email: emp.email,
        calendarId,
        calendarName: (assignment as { calendarName?: string })?.calendarName || "",
        provider: (assignment as { provider?: string })?.provider || "",
        isConfigured,
        needsConfiguration,
        usedInBookings: true,
      });

      if (needsConfiguration) calendarManagement.summary.unconfiguredCount++;
    }
  );

  // Process location calendars
  const locationCalendarsData = data.calendar_integration_new?.locationCalendars || [];
  locationCalendarsData.forEach(
    (loc: {
      id: string;
      name: string;
      calendar?: { calendarId?: string; calendarName?: string; provider?: string };
    }) => {
      if (!usedLocationIds.has(loc.id)) return; // Skip unused locations

      const assignment = calendarAssignments.find(
        (a: { entityId: string; entityType: string; calendarId?: string; isPending?: boolean }) =>
          a.entityId === loc.id && a.entityType === "location"
      );
      const calendarId = assignment?.calendarId || loc.calendar?.calendarId || "configure_later";
      const isConfigured = calendarId !== "configure_later" && !assignment?.isPending;
      const needsConfiguration = !!(calendarId === "configure_later" || assignment?.isPending);

      calendarManagement.locationCalendars.push({
        id: loc.id,
        name: loc.name,
        calendarId,
        calendarName:
          (assignment as { calendarName?: string })?.calendarName ||
          loc.calendar?.calendarName ||
          "",
        provider: (assignment as { provider?: string })?.provider || loc.calendar?.provider || "",
        isConfigured,
        needsConfiguration,
        usedInBookings: true,
      });

      if (needsConfiguration) calendarManagement.summary.unconfiguredCount++;
    }
  );

  // Process resource calendars
  const resourceCalendarsData = data.calendar_integration_new?.resourceCalendars || [];
  resourceCalendarsData.forEach(
    (res: {
      id: string;
      name: string;
      type: string;
      calendar?: {
        calendarId?: string;
        calendarName?: string;
        provider?: string;
        connectionStatus?: string;
      };
    }) => {
      if (!usedResourceIds.has(res.id)) return; // Skip unused resources

      const calendarId = res.calendar?.calendarId || "configure_later";
      const isConfigured =
        calendarId !== "configure_later" && res.calendar?.connectionStatus === "connected";
      const needsConfiguration = !isConfigured;

      calendarManagement.resourceCalendars.push({
        id: res.id,
        name: res.name,
        type: res.type,
        calendarId,
        calendarName: res.calendar?.calendarName || "",
        provider: res.calendar?.provider || "",
        isConfigured,
        needsConfiguration,
        usedInBookings: true,
      });

      if (needsConfiguration) calendarManagement.summary.unconfiguredCount++;
    }
  );

  calendarManagement.summary.totalEmployeeCalendars = calendarManagement.employeeCalendars.length;
  calendarManagement.summary.totalLocationCalendars = calendarManagement.locationCalendars.length;
  calendarManagement.summary.totalResourceCalendars = calendarManagement.resourceCalendars.length;
  // -------------------------------------------------------------------

  // console.log('JOEY: Processed booking combinations:', bookingCombinations.length);

  // Calculate summary
  const stepValidation = draft.step_validation || {};
  const completedSteps = Object.values(stepValidation).filter(
    (step: StepValidation) => step.completed
  ).length;
  const totalSteps = Object.keys(stepValidation).length;

  return {
    id: draft.id,
    user_id: draft.user_id,
    business_id: draft.business_id,
    status: draft.status,
    current_step: draft.current_step,
    created_at: draft.created_at,
    updated_at: draft.updated_at,
    last_saved_at: draft.last_saved_at,
    businessInfo: {
      name: businessInfo.name || "",
      slug: businessInfo.slug || "",
      category: businessInfo.category || "",
      description: businessInfo.description || "",
      phone: businessInfo.phone || "",
      email: businessInfo.email || "",
      website: businessInfo.website || "",
      logoUrl: businessInfo.logoUrl,
      tags: businessInfo.tags || [],
    },
    locations,
    services,
    employees,
    cards,
    bookingCombinations,
    // -------------------------------------------------------------------
    // NEW RETURN FIELD
    // -------------------------------------------------------------------
    calendarManagement,
    // -------------------------------------------------------------------
    summary: {
      totalLocations: locations.length,
      totalServices: services.length,
      totalEmployees: employees.length,
      totalCards: cards.length,
      totalBookingCombinations: bookingCombinations.length,
      completedSteps,
      totalSteps,
    },
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure the user is an admin
    // console.log("JOEY: USER ROLE", user.role);
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: drafts, error } = await supabase
      .from("onboarding_drafts")
      .select("*")
      .eq("status", ONBOARDING_DRAFT_STATUS.SUBMITTED);

    // console.log("JOEY: DRAFT", JSON.stringify(drafts, null, 0));

    console.log("Length of drafts:", drafts?.length);

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.warn("No rows returned fetching draft:", error);
      return NextResponse.json({ applications: [] }, { status: 200 });
    }

    // Process and flatten each application
    const processedApplications = drafts ? drafts.map(processApplication) : [];

    return NextResponse.json({
      applications: processedApplications,
    });
  } catch (error) {
    console.error("Unexpected error fetching draft:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
