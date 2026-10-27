import { createClient } from "@/app/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { localStringWithZoneToUtcIso } from "../../../utils/tz";

/**
 * POST /api/cronofy/book
 * Creates a calendar booking event for a business owner.
 *
 * Body:
 * {
 *   "host_user_id": "UUID",         // required (business owner in your system)
 *   "start": "2025-08-26T15:00:00", // required (local time string)
 *   "end": "2025-08-26T15:30:00",   // required (local time string)
 *   "summary": "Intro call",        // optional
 *   "location": "Google Meet",      // optional
 *   "calendar_id": "cal_xxx",       // optional (defaults to primary booking calendar)
 *   "event_id": "custom-id",       // optional (for idempotency)
 *   "tzid": "America/New_York"     // optional (timezone for start/end conversion)
 * }
 *
 * If no calendar_id is provided, automatically finds the primary booking calendar
 * for the business owner from the calendar_connections table.
 *
 * Uses the SUPABASE session to read the CONSUMER's email as the invitee.
 * Converts local time strings to UTC using the provided timezone.
 */
// Already mostly correct, just one small fix:
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { host_user_id, start, end, summary, location, calendar_id, event_id, tzid } = body;

    if (!host_user_id || !start || !end) {
      return NextResponse.json({ error: "Missing host_user_id, start, or end" }, { status: 400 });
    }

    // If no calendar_id provided, get primary booking calendar
    if (!calendar_id) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("calendar_connections")
        .select("calendar_id")
        .eq("owner_user_id", host_user_id) // Filter by user to ensure only their calendars
        .eq("owner_type", "business")
        .eq("is_booking_calendar", true)
        .eq("is_active", true)
        .order("is_primary_booking", { ascending: false })
        .limit(1)
        .single();

      calendar_id = data?.calendar_id;

      if (!calendar_id) {
        return NextResponse.json(
          {
            error: "No booking calendar configured",
          },
          { status: 400 }
        );
      }
    }

    // Rest of your existing code continues here...
    const startUtc = localStringWithZoneToUtcIso(start, tzid);
    const endUtc = localStringWithZoneToUtcIso(end, tzid);

    // ... rest of existing booking logic
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "booking failed" }, { status: 500 });
  }
}
