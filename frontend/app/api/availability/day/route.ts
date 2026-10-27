// app/api/availability/day/route.ts
// Optimized endpoint: Fetches all busy periods for a given date
// Returns busy periods that can be filtered client-side for specific time slots
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../utils/supabase/server";
import { getAccessTokensForCalendars } from "@/app/lib/calendar-token-resolver";
// @ts-expect-error: cronofy SDK has no types
import cronofy from "cronofy";

type CalendarGroupJoin = {
  id: string;
  default_booking_calendar_id: string;
  busy_calendar_ids: string[];
  display_name: string;
  is_configured: boolean;
  pending_configuration: boolean;
};

function normalizeCalendarGroupJoin(value: unknown): CalendarGroupJoin | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return (value[0] as CalendarGroupJoin | undefined) ?? null;
  }
  return value as CalendarGroupJoin;
}

interface AvailabilityDayRequest {
  serviceCardId: string;
  date: string; // YYYY-MM-DD format
  timezone?: string; // IANA timezone (optional, will use location timezone if not provided)
}

export async function POST(request: Request) {
  // Public booking pages call this route before a consumer has an authenticated session.
  // Use the service-role client server-side and validate the service card explicitly instead
  // of requiring a logged-in user.
  const supabase = await createAdminClient();

  // ============================================================================
  // 1. PARSE REQUEST
  // ============================================================================
  let requestData: AvailabilityDayRequest;
  try {
    requestData = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { serviceCardId, date, timezone } = requestData;

  if (!serviceCardId || !date) {
    return NextResponse.json(
      { error: "Missing required fields: serviceCardId, date" },
      { status: 400 }
    );
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Expected YYYY-MM-DD" },
      { status: 400 }
    );
  }

  try {
    // ============================================================================
    // 2. CHECK IF SERVICE CARD IS READY
    // ============================================================================
    const { data: serviceCard, error: cardError } = await supabase
      .from("service_cards")
      .select(
        "is_active, is_deleted, requirements_ready, pending_calendar_count, requirements_expression"
      )
      .eq("id", serviceCardId)
      .single();

    if (cardError || !serviceCard) {
      return NextResponse.json({ error: "Service card not found" }, { status: 404 });
    }

    if (!serviceCard.is_active || serviceCard.is_deleted) {
      return NextResponse.json({ error: "Service card not found" }, { status: 404 });
    }

    if (!serviceCard.requirements_ready) {
      return NextResponse.json({
        available: false,
        reason: "requirements_not_ready",
        pendingCalendars: serviceCard.pending_calendar_count,
        message: "This service requires calendar connections that are not yet configured",
      });
    }

    // ============================================================================
    // 3. FETCH REQUIREMENTS AND CALENDAR GROUPS
    // ============================================================================
    const { data: requirements, error: reqError } = await supabase
      .from("service_card_requirements")
      .select(
        `
        sequence_order,
        logic_operator,
        calendar_group_id,
        entity_type,
        entity_id,
        display_name,
        calendar_groups!inner(
          id,
          default_booking_calendar_id,
          busy_calendar_ids,
          display_name,
          is_configured,
          pending_configuration
        )
      `
      )
      .eq("service_card_id", serviceCardId)
      .order("sequence_order");

    if (reqError) {
      console.error("Error fetching requirements:", reqError);
      return NextResponse.json({ error: "Failed to fetch service requirements" }, { status: 500 });
    }

    if (!requirements || requirements.length === 0) {
      return NextResponse.json({
        date,
        busyPeriods: [],
        calendarGroups: [],
        message: "No calendar requirements found for this service",
      });
    }

    // ============================================================================
    // 4. GET TIMEZONE (from location or request)
    // ============================================================================
    let tzid = timezone || "America/Chicago"; // Default fallback

    if (!timezone) {
      const { data: serviceCardWithLocation } = await supabase
        .from("service_cards")
        .select("location_id, locations!inner(timezone)")
        .eq("id", serviceCardId)
        .single();

      const locations = serviceCardWithLocation?.locations as
        | Array<{ timezone: string }>
        | undefined;
      if (locations && locations.length > 0 && locations[0]?.timezone) {
        tzid = locations[0].timezone;
      }
    }

    // ============================================================================
    // 5. COLLECT ALL CALENDAR IDs TO CHECK
    // ============================================================================
    const calendarIdsToCheck = new Set<string>();
    const calendarGroups = new Map<
      string,
      {
        id: string;
        default_booking_calendar_id: string;
        busy_calendar_ids: string[];
        display_name: string;
      }
    >();

    for (const req of requirements) {
      if (!req.calendar_group_id || !req.calendar_groups) continue;

      const group = normalizeCalendarGroupJoin(req.calendar_groups);
      if (!group) continue;
      if (!group.is_configured || group.pending_configuration) {
        continue; // Skip unconfigured calendars
      }

      calendarGroups.set(req.calendar_group_id, {
        id: req.calendar_group_id,
        default_booking_calendar_id: group.default_booking_calendar_id,
        busy_calendar_ids: group.busy_calendar_ids || [],
        display_name: group.display_name,
      });

      // Add default booking calendar
      if (group.default_booking_calendar_id) {
        calendarIdsToCheck.add(group.default_booking_calendar_id);
      }

      // Add busy calendars
      if (Array.isArray(group.busy_calendar_ids)) {
        group.busy_calendar_ids.forEach((id: string) => {
          if (id) calendarIdsToCheck.add(id);
        });
      }
    }

    if (calendarIdsToCheck.size === 0) {
      return NextResponse.json({
        date,
        busyPeriods: [],
        calendarGroups: [],
        message: "No calendars to check for this service",
      });
    }

    // ============================================================================
    // 6. CALL CRONOFY FREE/BUSY API FOR THE ENTIRE DAY
    // ============================================================================
    const calendarIdsArray = Array.from(calendarIdsToCheck);
    console.log(`📅 Fetching busy periods for date: ${date}`, {
      calendarIds: calendarIdsArray.length,
      tzid,
    });

    const integrationTokens = await getAccessTokensForCalendars(calendarIdsArray);

    // Map calendar_id → busy periods
    const calendarBusyPeriods = new Map<string, Array<{ start: string; end: string }>>();

    // Cronofy expects dates (YYYY-MM-DD), not timestamps
    // Request the entire day: from date to date+1 (exclusive end)
    const fromDate = date; // YYYY-MM-DD
    const toDateObj = new Date(date + "T00:00:00Z");
    toDateObj.setUTCDate(toDateObj.getUTCDate() + 1);
    const toDate = toDateObj.toISOString().split("T")[0]; // Next day

    for (const [
      integration_id,
      { access_token, calendar_ids: integrationCalendarIds },
    ] of integrationTokens) {
      try {
        const client = new cronofy({
          access_token,
          client_id: process.env.CRONOFY_CLIENT_ID!,
          client_secret: process.env.CRONOFY_CLIENT_SECRET!,
          data_center: process.env.CRONOFY_DATA_CENTER as string,
        });

        const requestParams = {
          from: fromDate,
          to: toDate,
          calendar_ids: integrationCalendarIds,
          tzid: tzid,
        };

        console.log(`📤 Cronofy freeBusy request:`, requestParams);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await (client as any).freeBusy(requestParams);

        const freeBusyList = data?.free_busy || data?.busy || [];

        for (const period of freeBusyList) {
          if (period.free_busy_status === "busy" || period.free_busy_status === "tentative") {
            if (!calendarBusyPeriods.has(period.calendar_id)) {
              calendarBusyPeriods.set(period.calendar_id, []);
            }
            calendarBusyPeriods.get(period.calendar_id)!.push({
              start: period.start,
              end: period.end,
            });
          }
        }
      } catch (err) {
        console.error(`Free/busy check failed for integration ${integration_id}:`, err);
        // Continue with other integrations
      }
    }

    // ============================================================================
    // 7. RETURN BUSY PERIODS GROUPED BY CALENDAR GROUP
    // ============================================================================
    const busyPeriodsByGroup = new Map<
      string,
      Array<{ calendar_id: string; start: string; end: string; calendar_group_id: string }>
    >();

    for (const [groupId, group] of calendarGroups) {
      const groupBusyPeriods: Array<{
        calendar_id: string;
        start: string;
        end: string;
        calendar_group_id: string;
      }> = [];

      // Add busy periods from default booking calendar
      if (group.default_booking_calendar_id) {
        const periods = calendarBusyPeriods.get(group.default_booking_calendar_id) || [];
        groupBusyPeriods.push(
          ...periods.map((p) => ({
            calendar_id: group.default_booking_calendar_id,
            start: p.start,
            end: p.end,
            calendar_group_id: groupId,
          }))
        );
      }

      // Add busy periods from busy calendars
      for (const busyCalId of group.busy_calendar_ids) {
        const periods = calendarBusyPeriods.get(busyCalId) || [];
        groupBusyPeriods.push(
          ...periods.map((p) => ({
            calendar_id: busyCalId,
            start: p.start,
            end: p.end,
            calendar_group_id: groupId,
          }))
        );
      }

      if (groupBusyPeriods.length > 0) {
        busyPeriodsByGroup.set(groupId, groupBusyPeriods);
      }
    }

    // Convert to array format for response
    const allBusyPeriods: Array<{
      calendar_id: string;
      start: string;
      end: string;
      calendar_group_id: string;
    }> = [];

    for (const periods of busyPeriodsByGroup.values()) {
      allBusyPeriods.push(...periods);
    }

    return NextResponse.json({
      date,
      timezone: tzid,
      busyPeriods: allBusyPeriods,
      calendarGroups: Array.from(calendarGroups.values()).map((g) => ({
        id: g.id,
        display_name: g.display_name,
        default_booking_calendar_id: g.default_booking_calendar_id,
        busy_calendar_ids: g.busy_calendar_ids,
      })),
      requirements: requirements.map((r) => ({
        sequence_order: r.sequence_order,
        logic_operator: r.logic_operator,
        calendar_group_id: r.calendar_group_id,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        display_name: r.display_name,
      })),
      requirementsExpression: serviceCard.requirements_expression,
      checkedCalendars: calendarIdsArray.length,
    });
  } catch (error: unknown) {
    console.error("❌ Availability day check error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check availability",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
