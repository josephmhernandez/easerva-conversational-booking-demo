// /app/api/cronofy/calendar-settings/route.ts
import { createClient } from "@/app/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { calendars, business_id } = body;

  if (!calendars || !business_id) {
    return NextResponse.json(
      {
        error: "Missing calendars or business_id",
      },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "no_user" }, { status: 401 });
  }

  // Get current user's integrations to ensure they can only update their own calendars
  const { data: integrations } = await supabase
    .from("business_calendar_integrations")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "cronofy");

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ error: "no_integrations" }, { status: 403 });
  }

  const integrationIds = integrations.map((i) => i.id);

  for (const cal of calendars) {
    const { error } = await supabase
      .from("calendar_connections")
      .update({
        is_booking_calendar: cal.is_booking_calendar || false,
        is_busy_calendar: cal.is_busy_calendar || false,
        is_primary_booking: cal.is_primary_booking || false,
      })
      .eq("calendar_id", cal.calendar_id)
      .eq("owner_business_id", business_id)
      .eq("owner_user_id", user.id) // Ensure user can only update their own calendars
      .eq("owner_type", "business")
      .in("integration_id", integrationIds); // Only allow updates to current user's integrations

    if (error) {
      console.error("❌ Error updating calendar settings:", {
        calendar_id: cal.calendar_id,
        user_id: user.id,
        business_id,
        error: error.message,
      });
    }
  }

  return NextResponse.json({ success: true });
}
