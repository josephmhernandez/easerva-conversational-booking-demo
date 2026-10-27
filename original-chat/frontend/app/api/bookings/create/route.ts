// app/api/bookings/create/route.ts
// Creates calendar events on Cronofy for a booking
import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { evaluateRequirementExpression } from "@/app/lib/calendar-logic-evaluator";
import { getAccessTokensForCalendars } from "@/app/lib/calendar-token-resolver";
import { createEventsOnMultipleCalendars } from "@/app/lib/multi-calendar-booking";
import { EventData } from "@/app/lib/cronofy-event-creator";
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

// Generate UUID using crypto (built-in Node.js)
function generateUUID(): string {
  return crypto.randomUUID();
}

interface BookingCreateRequest {
  serviceCardId: string;
  startTime: string; // ISO8601 UTC
  endTime: string; // ISO8601 UTC
  timezone: string; // IANA timezone (from location)
  customer: {
    fullName: string;
    email: string;
    phone: string;
    notes?: string;
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // ============================================================================
  // 1. PARSE REQUEST
  // ============================================================================
  let requestData: BookingCreateRequest;
  try {
    requestData = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { serviceCardId, startTime, endTime, timezone, customer } = requestData;

  if (!serviceCardId || !startTime || !endTime || !timezone || !customer) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        details: "serviceCardId, startTime, endTime, timezone, and customer are required",
      },
      { status: 400 }
    );
  }

  if (!customer.fullName || !customer.email || !customer.phone) {
    return NextResponse.json(
      {
        error: "Missing required customer fields",
        details: "customer.fullName, customer.email, and customer.phone are required",
      },
      { status: 400 }
    );
  }

  // Validate time range
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  if (endDate <= startDate) {
    return NextResponse.json(
      {
        error: "Invalid time range",
        details: `endTime (${endTime}) must be after startTime (${startTime})`,
      },
      { status: 400 }
    );
  }

  try {
    // ============================================================================
    // 2. FETCH SERVICE CARD AND VALIDATE
    // ============================================================================
    const { data: serviceCard, error: cardError } = await supabase
      .from("service_cards")
      .select(
        `
        id,
        business_id,
        service_id,
        location_id,
        employee_id,
        display_name,
        requirements_ready,
        pending_calendar_count,
        services:service_id (
          id,
          name,
          duration,
          price_cents
        ),
        locations:location_id (
          id,
          name,
          address,
          city,
          state,
          zip_code,
          timezone
        )
      `
      )
      .eq("id", serviceCardId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .single();

    if (cardError || !serviceCard) {
      return NextResponse.json({ error: "Service card not found" }, { status: 404 });
    }

    if (!serviceCard.requirements_ready) {
      return NextResponse.json(
        {
          error: "Service not ready for booking",
          details: "This service requires calendar connections that are not yet configured",
        },
        { status: 400 }
      );
    }

    // Get location timezone if not provided
    const locationTimezone =
      (serviceCard.locations as { timezone?: string } | undefined)?.timezone ||
      timezone ||
      "America/Chicago";

    // ============================================================================
    // 3. RE-CHECK AVAILABILITY (PREVENT RACE CONDITIONS)
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
      return NextResponse.json(
        {
          error: "No calendar requirements found",
          details: "This service has no calendar requirements configured",
        },
        { status: 400 }
      );
    }

    // Collect calendar IDs to check availability
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
        continue;
      }

      calendarGroups.set(req.calendar_group_id, {
        id: req.calendar_group_id,
        default_booking_calendar_id: group.default_booking_calendar_id,
        busy_calendar_ids: group.busy_calendar_ids || [],
        display_name: group.display_name,
      });

      if (group.default_booking_calendar_id) {
        calendarIdsToCheck.add(group.default_booking_calendar_id);
      }

      if (Array.isArray(group.busy_calendar_ids)) {
        group.busy_calendar_ids.forEach((id: string) => {
          if (id) calendarIdsToCheck.add(id);
        });
      }
    }

    if (calendarIdsToCheck.size === 0) {
      return NextResponse.json(
        {
          error: "No calendars to check",
          details: "No configured calendars found for this service",
        },
        { status: 400 }
      );
    }

    // Check free/busy for the time slot
    const integrationTokens = await getAccessTokensForCalendars(Array.from(calendarIdsToCheck));
    const calendarBusyPeriods = new Map<string, Array<{ start: string; end: string }>>();

    // Helper to check if periods overlap
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
      return p1Start < p2End && p2Start < p1End;
    };

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

        // Get date range for free/busy check
        const fromDate = startTime.split("T")[0];
        const toDateObj = new Date(endTime);
        toDateObj.setUTCDate(toDateObj.getUTCDate() + 1);
        const toDate = toDateObj.toISOString().split("T")[0];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await (client as any).freeBusy({
          from: fromDate,
          to: toDate,
          calendar_ids: integrationCalendarIds,
          tzid: locationTimezone,
        });

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

    // Evaluate calendar group availability
    const groupAvailabilities = new Map<
      string,
      {
        calendar_group_id: string;
        is_available: boolean;
        conflicts?: Array<{ calendar_id: string; start: string; end: string }>;
      }
    >();

    for (const [groupId, group] of calendarGroups) {
      const defaultCalendarBusyPeriods = group.default_booking_calendar_id
        ? calendarBusyPeriods.get(group.default_booking_calendar_id) || []
        : [];

      const defaultBusy = defaultCalendarBusyPeriods.filter((period) =>
        periodsOverlap(period.start, period.end, startTime, endTime)
      );

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

    // Evaluate requirement expression
    const evaluation = evaluateRequirementExpression(
      requirements,
      groupAvailabilities,
      startTime,
      endTime
    );

    if (!evaluation.is_available) {
      return NextResponse.json(
        {
          error: "Time slot no longer available",
          details: "The selected time slot has been booked by someone else",
          conflicts: evaluation.conflicts,
        },
        { status: 409 }
      );
    }

    // ============================================================================
    // 4. DETERMINE WHICH CALENDAR GROUPS ARE SATISFIED
    // ============================================================================
    const satisfiedGroupIds = evaluation.satisfied_groups;
    if (satisfiedGroupIds.length === 0) {
      return NextResponse.json(
        {
          error: "No calendar groups satisfied",
          details: "Unable to determine which calendars to book on",
        },
        { status: 400 }
      );
    }

    // Collect default_booking_calendar_id from all satisfied groups
    const calendarsToBook: string[] = [];
    const calendarGroupMap = new Map<string, string>(); // calendar_id -> calendar_group_id

    for (const groupId of satisfiedGroupIds) {
      const group = calendarGroups.get(groupId);
      if (group && group.default_booking_calendar_id) {
        calendarsToBook.push(group.default_booking_calendar_id);
        calendarGroupMap.set(group.default_booking_calendar_id, groupId);
      }
    }

    if (calendarsToBook.length === 0) {
      return NextResponse.json(
        {
          error: "No booking calendars found",
          details: "No default booking calendars found for satisfied calendar groups",
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // 5. CREATE EVENTS ON ALL SATISFIED CALENDAR GROUPS
    // ============================================================================
    const service = serviceCard.services as { name?: string } | undefined;
    const location = serviceCard.locations as
      | {
          address?: string;
          city?: string;
          state?: string;
          zip_code?: string;
        }
      | undefined;
    const serviceName = service?.name || serviceCard.display_name || "Appointment";

    // Build location address string
    const addressParts = [
      location?.address,
      location?.city,
      location?.state,
      location?.zip_code,
    ].filter(Boolean);
    const locationAddress = addressParts.length > 0 ? addressParts.join(", ") : undefined;

    // Generate unique event ID
    const eventId = generateUUID();

    // Format event title with customer name
    const eventTitle = `${serviceName} - ${customer.fullName}`;

    // Prepare event data
    const eventData: EventData = {
      eventId,
      summary: eventTitle,
      description: customer.notes || undefined,
      start: startTime,
      end: endTime,
      tzid: locationTimezone,
      location: locationAddress,
    };

    console.log(`📅 Creating booking events on ${calendarsToBook.length} calendar(s):`, {
      serviceCardId,
      eventId,
      calendars: calendarsToBook,
      satisfiedGroups: satisfiedGroupIds,
    });

    // Create events on all calendars (with automatic rollback on failure)
    const bookingResult = await createEventsOnMultipleCalendars(calendarsToBook, eventData);

    // ============================================================================
    // 6. RETURN SUCCESS RESPONSE
    // ============================================================================
    return NextResponse.json({
      success: true,
      booking: {
        serviceCardId,
        serviceName,
        startTime,
        endTime,
        timezone: locationTimezone,
        customer: {
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          notes: customer.notes,
        },
        calendarEvents: bookingResult.createdEvents.map((event) => ({
          calendar_id: event.calendar_id,
          calendar_group_id: calendarGroupMap.get(event.calendar_id),
          cronofy_event_id: event.cronofy_event_id,
          cronofy_event_uid: event.cronofy_event_uid,
          integration_id: event.integration_id,
        })),
        satisfiedCalendarGroups: satisfiedGroupIds,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Booking creation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create booking",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
