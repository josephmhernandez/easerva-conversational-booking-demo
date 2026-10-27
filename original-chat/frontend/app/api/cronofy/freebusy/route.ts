// /api/cronofy/freebusy/route.ts
import { getAccessTokensForCalendars } from "@/app/lib/calendar-token-resolver";
// @ts-expect-error: cronofy SDK has no types
import cronofy from "cronofy";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Extract query parameters
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const tzid = req.nextUrl.searchParams.get("tzid");
  const calendarIdsParam = req.nextUrl.searchParams.get("calendar_ids");

  // Validate required parameters
  if (!from || !to || !tzid) {
    return NextResponse.json(
      { error: "Missing required parameters: from, to, tzid" },
      { status: 400 }
    );
  }

  // Parse calendar_ids (can be comma-separated or array)
  let calendar_ids: string[] = [];
  if (calendarIdsParam) {
    calendar_ids = Array.isArray(calendarIdsParam)
      ? calendarIdsParam
      : calendarIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
  }

  if (calendar_ids.length === 0) {
    return NextResponse.json({ busy: [] });
  }

  try {
    // Get access tokens grouped by integration
    const integrationTokens = await getAccessTokensForCalendars(calendar_ids);

    // Check free/busy for each integration
    const allBusyPeriods: any[] = [];

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

        const data = await (client as any).freeBusy({
          from,
          to,
          tzid,
          calendar_ids: integrationCalendarIds,
        });

        allBusyPeriods.push(...(data?.free_busy || data?.busy || []));
      } catch (err) {
        console.error(`Free/busy check failed for integration ${integration_id}:`, err);
        // Continue with other integrations even if one fails
      }
    }

    return NextResponse.json({ busy: allBusyPeriods });
  } catch (error) {
    console.error("Error in free/busy check:", error);
    return NextResponse.json(
      {
        error: "Failed to check free/busy",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
