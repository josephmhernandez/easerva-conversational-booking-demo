// app/api/availability/check/route.ts
import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { evaluateRequirementExpression } from "@/app/lib/calendar-logic-evaluator";
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

interface AvailabilityCheckRequest {
  serviceCardId: string;
  startTime: string; // ISO8601
  endTime: string; // ISO8601
  timezone?: string; // IANA timezone (optional, will use location timezone if not provided)
}

// ConflictInfo interface removed - not used in this file

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

  // ============================================================================
  // 2. PARSE REQUEST
  // ============================================================================
  let requestData: AvailabilityCheckRequest;
  try {
    requestData = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { serviceCardId, startTime, endTime, timezone } = requestData;

  if (!serviceCardId || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Missing required fields: serviceCardId, startTime, endTime" },
      { status: 400 }
    );
  }

  try {
    // ============================================================================
    // 3. CHECK IF SERVICE CARD IS READY
    // ============================================================================
    const { data: serviceCard, error: cardError } = await supabase
      .from("service_cards")
      .select("requirements_ready, pending_calendar_count, requirements_expression")
      .eq("id", serviceCardId)
      .single();

    if (cardError || !serviceCard) {
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
    // 4. FETCH REQUIREMENTS AND CALENDAR GROUPS
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
        available: true,
        conflicts: [],
        message: "No calendar requirements found for this service",
      });
    }

    // ============================================================================
    // 5. GET TIMEZONE (from location or request)
    // ============================================================================
    let tzid = timezone || "America/Chicago"; // Default fallback

    // Try to get timezone from service card's location
    if (!timezone) {
      const { data: serviceCardWithLocation } = await supabase
        .from("service_cards")
        .select("location_id, locations!inner(timezone)")
        .eq("id", serviceCardId)
        .single();

      // Supabase returns locations as an array when using !inner(), so access first element
      const locations = serviceCardWithLocation?.locations as
        | Array<{ timezone: string }>
        | undefined;
      if (locations && locations.length > 0 && locations[0]?.timezone) {
        tzid = locations[0].timezone;
      }
    }

    // ============================================================================
    // 6. COLLECT ALL CALENDAR IDs TO CHECK
    // ============================================================================
    const calendarIdsToCheck = new Set<string>();
    const calendarGroups = new Map<
      string,
      {
        id: string;
        default_booking_calendar_id: string;
        busy_calendar_ids: string[];
        display_name: string;
        is_configured: boolean;
        pending_configuration: boolean;
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
        is_configured: group.is_configured,
        pending_configuration: group.pending_configuration,
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
        available: true,
        conflicts: [],
        message: "No calendars to check for this service",
      });
    }

    // ============================================================================
    // 7. CALL CRONOFY FREE/BUSY API
    // ============================================================================
    const calendarIdsArray = Array.from(calendarIdsToCheck);
    console.log("📋 Checking availability for calendar IDs:", calendarIdsArray);
    console.log("📋 Total calendar IDs to check:", calendarIdsArray.length);
    console.log("⏰ Time range:", { startTime, endTime, tzid });

    // Validate time range before proceeding
    const startDateObj = new Date(startTime);
    const endDateObj = new Date(endTime);
    const durationMs = endDateObj.getTime() - startDateObj.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    if (endDateObj <= startDateObj) {
      console.error("❌ Invalid time range received:", {
        startTime,
        endTime,
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        durationMs,
        durationMinutes,
      });
      return NextResponse.json(
        {
          error: "Invalid time range",
          details: `endTime (${endTime}) must be after startTime (${startTime})`,
        },
        { status: 400 }
      );
    }

    console.log(`✅ Time range valid: ${durationMinutes} minutes (${durationMs}ms)`);

    const integrationTokens = await getAccessTokensForCalendars(calendarIdsArray);

    // Map calendar_id → busy periods
    const calendarBusyPeriods = new Map<string, Array<{ start: string; end: string }>>();

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

        // Validate time range before calling Cronofy API
        const startDateObj = new Date(startTime);
        const endDateObj = new Date(endTime);
        const differenceMs = endDateObj.getTime() - startDateObj.getTime();
        const differenceMinutes = differenceMs / (1000 * 60);

        if (endDateObj <= startDateObj || differenceMs <= 0) {
          console.error(`❌ Invalid time range for Cronofy API call:`, {
            startTime,
            endTime,
            startDate: startDateObj.toISOString(),
            endDate: endDateObj.toISOString(),
            differenceMs,
            differenceMinutes,
            tzid,
            integration_id,
            calendar_ids: integrationCalendarIds,
          });
          console.warn(
            `⚠️ Skipping free/busy check for integration ${integration_id} due to invalid time range`
          );
          continue;
        }

        // =====================================================================
        // CRONOFY FREE/BUSY API EXPECTS DATE FORMAT (YYYY-MM-DD), NOT TIMESTAMPS
        // The 'from' and 'to' parameters are dates, and 'to' must be after 'from'
        // The API returns all busy periods within that date range, which we then
        // filter against our specific time slot in section 8.
        // =====================================================================

        // Extract just the date portion (YYYY-MM-DD) from the start time
        const fromDate = startTime.split("T")[0];

        // For 'to', we need to ensure it's AFTER 'from' (the API is exclusive on end date)
        // Add one day to the end date to ensure we capture all events on the end day
        const toDateObj = new Date(endTime);
        toDateObj.setUTCDate(toDateObj.getUTCDate() + 1);
        const toDate = toDateObj.toISOString().split("T")[0];

        console.log(`📅 Calling Cronofy freeBusy:`, {
          startTime,
          endTime,
          fromDate,
          toDate,
          tzid,
          durationMinutes: differenceMinutes,
          calendarCount: integrationCalendarIds.length,
        });

        const requestParams: {
          from: string;
          to: string;
          calendar_ids: string[];
          tzid: string;
        } = {
          from: fromDate,
          to: toDate,
          calendar_ids: integrationCalendarIds,
          tzid: tzid,
        };

        console.log(`📤 Cronofy request params:`, JSON.stringify(requestParams, null, 2));

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
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(
          `Free/busy check failed for integration ${integration_id}:`,
          errorMessage,
          err
        );
        // Continue with other integrations
      }
    }

    // ============================================================================
    // 8. EVALUATE CALENDAR GROUP AVAILABILITY
    // ============================================================================
    const groupAvailabilities = new Map<
      string,
      {
        calendar_group_id: string;
        is_available: boolean;
        conflicts?: Array<{ calendar_id: string; start: string; end: string }>;
      }
    >();

    // Helper function to check if two time periods overlap
    const periodsOverlap = (
      period1Start: string,
      period1End: string,
      period2Start: string,
      period2End: string
    ): boolean => {
      const p1Start = new Date(period1Start).getTime();
      const p1End = new Date(period1End).getTime();
      const p2Start = new Date(period2Start).getTime();
      const p2End = new Date(period2End).getTime();

      // Two periods overlap if one starts before the other ends
      return p1Start < p2End && p2Start < p1End;
    };

    for (const [groupId, group] of calendarGroups) {
      // Check if default booking calendar has overlapping busy periods
      const defaultCalendarBusyPeriods = group.default_booking_calendar_id
        ? calendarBusyPeriods.get(group.default_booking_calendar_id) || []
        : [];

      // Filter to only periods that overlap with our requested time slot
      const defaultBusy = defaultCalendarBusyPeriods.filter((period) =>
        periodsOverlap(period.start, period.end, startTime, endTime)
      );

      // Check if any busy calendars have overlapping conflicts
      const busyConflicts: Array<{ calendar_id: string; start: string; end: string }> = [];
      for (const busyCalId of group.busy_calendar_ids) {
        const busyPeriods = calendarBusyPeriods.get(busyCalId) || [];
        const overlappingPeriods = busyPeriods.filter((period) =>
          periodsOverlap(period.start, period.end, startTime, endTime)
        );
        if (overlappingPeriods.length > 0) {
          busyConflicts.push(...overlappingPeriods.map((p) => ({ calendar_id: busyCalId, ...p })));
        }
      }

      // A calendar group is available if:
      // 1. Default booking calendar is free (or doesn't exist)
      // 2. All busy calendars are free
      const isAvailable = defaultBusy.length === 0 && busyConflicts.length === 0;

      groupAvailabilities.set(groupId, {
        calendar_group_id: groupId,
        is_available: isAvailable,
        conflicts: isAvailable
          ? undefined
          : [
              ...defaultBusy.map((p) => ({ calendar_id: group.default_booking_calendar_id, ...p })),
              ...busyConflicts,
            ],
      });
    }

    // ============================================================================
    // 9. EVALUATE REQUIREMENT EXPRESSION WITH AND/OR LOGIC
    // ============================================================================
    const evaluation = evaluateRequirementExpression(
      requirements,
      groupAvailabilities,
      startTime,
      endTime
    );

    // ============================================================================
    // 10. DETERMINE FINAL AVAILABILITY
    // ============================================================================
    const available = evaluation.is_available;

    return NextResponse.json({
      available,
      conflicts: evaluation.conflicts,
      serviceCardId,
      timeSlot: {
        start: startTime,
        end: endTime,
      },
      timezone: tzid,
      requirementsExpression: serviceCard.requirements_expression,
      checkedCalendars: calendarGroups.size,
      satisfiedGroups: evaluation.satisfied_groups,
    });
  } catch (error: unknown) {
    console.error("❌ Availability check error:", error);

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
