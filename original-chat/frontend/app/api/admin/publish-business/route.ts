// app/api/admin/publish-business/route.ts
// Initialize logger to capture all console output to app.log
// Using .server.ts ensures this only runs in Node.js runtime
import "@/lib/logger.server";

import { NextResponse } from "next/server";
import { ADMIN_USER_IDS } from "../../../constants/dbConstants";
import { createClient } from "../../../utils/supabase/server";
import {
  createIdNormalizer,
  publishBookingCalendarAssignments,
  publishBusinessInfo,
  publishCalendarGroups,
  publishEmployees,
  publishEmployeeServices,
  publishLocations,
  publishResources,
  publishServiceCardRequirements,
  publishServiceCards,
  publishServiceConfigurations,
  publishServices,
  rollbackPublish,
} from "./publish-business-helper";

interface PublishRequest {
  applicationId: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // ============================================================================
  // 1. AUTHENTICATION & AUTHORIZATION
  // ============================================================================
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_USER_IDS.includes(user.id)) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  // ============================================================================
  // 2. PARSE REQUEST & FETCH APPLICATION DATA
  // ============================================================================
  let applicationId: string;
  try {
    const body: PublishRequest = await request.json();
    applicationId = body.applicationId;

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Fetch the draft application
  const { data: application, error: fetchError } = await supabase
    .from("onboarding_drafts")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    return NextResponse.json(
      { error: "Application not found", details: fetchError?.message },
      { status: 404 }
    );
  }

  // Parse the draft_data JSON string
  let draftData: Record<string, unknown>;
  try {
    draftData =
      typeof application.draft_data === "string"
        ? JSON.parse(application.draft_data)
        : application.draft_data;
  } catch {
    return NextResponse.json({ error: "Invalid draft_data JSON format" }, { status: 400 });
  }

  if (!draftData?.business_info) {
    return NextResponse.json(
      { error: "Invalid application data structure - missing business_info" },
      { status: 400 }
    );
  }

  if (!application.business_id) {
    return NextResponse.json(
      { error: "Invalid application data structure - missing business_id" },
      { status: 400 }
    );
  }

  // ============================================================================
  // INITIALIZE ID NORMALIZER
  // ============================================================================
  console.log("🔄 Initializing ID normalizer...");
  const idNormalizer = createIdNormalizer();

  // No need to pre-convert draftData - conversion happens in each publish function

  // ============================================================================
  // 3. ID MAPPING SYSTEM & ROLLBACK TRACKER
  // ============================================================================
  const idMap = {
    locations: new Map<string, string>(),
    services: new Map<string, string>(),
    employees: new Map<string, string>(),
    rooms: new Map<string, string>(),
  };

  // Initialize rollback tracker
  const rollbackTracker = {
    businessId: undefined as string | undefined,
    locationIds: [] as string[],
    resourceIds: [] as string[],
    serviceIds: [] as string[],
    employeeIds: [] as string[],
    employeeServiceIds: [] as string[],
    serviceConfigurationIds: [] as string[],
    serviceCardIds: [] as string[],
    calendarGroupIds: [] as string[],
    serviceCardRequirementIds: [] as string[],
    bookingCalendarAssignmentIds: [] as string[],
  };

  let businessId: string = "";

  try {
    // ============================================================================
    // 4. PUBLISH BUSINESS
    // ============================================================================
    console.log("📊 Publishing business...");
    const businessResult = await publishBusinessInfo(
      supabase,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.business_info as any,
      application.business_id,
      rollbackTracker
    );
    businessId = businessResult.businessId;
    console.log("✅ Business published:", businessId);

    // ============================================================================
    // 5. PUBLISH LOCATIONS
    // ============================================================================
    console.log("📍 Publishing locations...");
    const locationsResult = await publishLocations(
      supabase,
      businessId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.business_location as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.service_location as any,
      rollbackTracker
    );

    // Merge the Map into idMap.locations
    locationsResult.locationIdMap.forEach((value, key) => {
      idMap.locations.set(key, value);
    });

    // ============================================================================
    // 6. PUBLISH ROOMS (RESOURCES)
    // ============================================================================
    console.log("🏠 Publishing rooms/resources...");
    const resourcesResult = await publishResources(
      supabase,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.business_resources as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.service_location as any,
      idMap.locations,
      rollbackTracker
    );

    resourcesResult.resourceIdMap.forEach((value, key) => {
      idMap.rooms.set(key, value);
    });

    // ============================================================================
    // 7. PUBLISH EMPLOYEES
    // ============================================================================
    console.log("👥 Publishing employees...");
    const employeesResult = await publishEmployees(
      supabase,
      businessId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.booking_strategy as any,
      idMap.locations,
      rollbackTracker
    );

    employeesResult.employeeIdMap.forEach((value, key) => {
      idMap.employees.set(key, value);
    });

    // ============================================================================
    // 8. PUBLISH SERVICES
    // ============================================================================
    console.log("💼 Publishing services...");
    const servicesResult = await publishServices(
      supabase,
      businessId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.card_studio as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.service_location as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.business_employee_availability as any,
      idMap.employees,
      idMap.locations,
      rollbackTracker
    );

    servicesResult.serviceIdMap.forEach((value, key) => {
      idMap.services.set(key, value);
    });

    // ============================================================================
    // 8A. PUBLISH CALENDAR GROUPS
    // ============================================================================
    console.log("📅 Publishing calendar groups...");
    const calendarResult = await publishCalendarGroups(
      supabase,
      businessId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.calendar_integration_new as any,
      idMap.locations,
      idMap.employees,
      idMap.rooms,
      rollbackTracker,
      idNormalizer,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.calendar_management as any
    );

    // ============================================================================
    // 9. PUBLISH EMPLOYEE-SERVICE RELATIONSHIPS
    // ============================================================================
    console.log("🔗 Publishing employee-service relationships...");
    await publishEmployeeServices(
      supabase,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.card_studio as any,
      idMap.employees,
      idMap.services,
      rollbackTracker
    );

    // ============================================================================
    // 10. PUBLISH SERVICE CONFIGURATIONS
    // ============================================================================
    console.log("⚙️ Publishing service configurations...");
    await publishServiceConfigurations(
      supabase,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.service_location as any,
      idMap.services,
      idMap.locations,
      idMap.rooms,
      rollbackTracker
    );

    // ============================================================================
    // 11. PUBLISH SERVICE CARDS
    // ============================================================================
    console.log("🎴 Publishing service cards...");
    const cardsResult = await publishServiceCards(
      supabase,
      businessId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.card_studio as any,
      idMap.services,
      idMap.locations,
      idMap.employees,
      rollbackTracker
    );

    // ============================================================================
    // 11A. PUBLISH SERVICE CARD REQUIREMENTS
    // ============================================================================
    console.log("🔗 Publishing service card requirements...");
    await publishServiceCardRequirements(
      supabase,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftData.calendar_integration_new as any,
      cardsResult.cardIdMap,
      calendarResult.calendarGroupIdMap,
      idMap.services,
      idMap.locations,
      idMap.employees,
      idMap.rooms,
      rollbackTracker
    );

    // ============================================================================
    // 11B. PUBLISH BOOKING CALENDAR ASSIGNMENTS
    // ============================================================================
    console.log("📆 Publishing booking calendar assignments...");
    await publishBookingCalendarAssignments(supabase, cardsResult.cardIdMap, rollbackTracker);

    // ============================================================================
    // 12. UPDATE BUSINESS STATUS TO APPROVED
    // ============================================================================
    console.log("✅ Activating business...");
    await supabase
      .from("businesses")
      .update({
        is_active: true,
        approval_status: "approved",
        kyc_approved: true,
        kyc_approved_at: new Date().toISOString(),
        kyc_approved_by: user.id,
      })
      .eq("id", businessId);

    // ============================================================================
    // 13. UPDATE APPLICATION STATUS
    // ============================================================================
    await supabase
      .from("onboarding_drafts")
      .update({
        status: "approved",
        last_saved_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    // ============================================================================
    // 14. SUCCESS RESPONSE
    // ============================================================================
    console.log("✅ Business published successfully!");

    return NextResponse.json({
      success: true,
      message: "Business published successfully",
      businessId: businessId,
      stats: {
        locations: idMap.locations.size,
        services: idMap.services.size,
        employees: idMap.employees.size,
        rooms: idMap.rooms.size,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Publish error:", error);

    // ============================================================================
    // ROLLBACK ALL CREATED RECORDS
    // ============================================================================
    try {
      console.log("🔄 Starting rollback process...");
      await rollbackPublish(supabase, rollbackTracker);
      console.log("✅ Rollback completed successfully");
    } catch (rollbackError) {
      console.error("❌ Rollback failed:", rollbackError);
      // Continue with error response even if rollback fails
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to publish business",
        details: error instanceof Error ? error.message : String(error),
        rollbackAttempted: true,
        rollbackStats: {
          businesses: rollbackTracker.businessId ? 1 : 0,
          locations: rollbackTracker.locationIds.length,
          resources: rollbackTracker.resourceIds.length,
          services: rollbackTracker.serviceIds.length,
          employees: rollbackTracker.employeeIds.length,
          employeeServices: rollbackTracker.employeeServiceIds.length,
          serviceConfigurations: rollbackTracker.serviceConfigurationIds.length,
          serviceCards: rollbackTracker.serviceCardIds.length,
          calendarGroups: rollbackTracker.calendarGroupIds.length,
          serviceCardRequirements: rollbackTracker.serviceCardRequirementIds.length,
          bookingCalendarAssignments: rollbackTracker.bookingCalendarAssignmentIds.length,
        },
      },
      { status: 500 }
    );
  }
}
