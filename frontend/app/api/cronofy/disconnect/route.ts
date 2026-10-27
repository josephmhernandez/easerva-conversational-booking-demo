// /app/api/cronofy/disconnect/route.ts
/**
 * Disconnects a specific calendar integration for the authenticated user.
 * Revokes the Cronofy authorization and removes the DB record.
 *
 * Body: { integration_id: string }
 */
// @ts-expect-error: cronofy SDK has no types
import cronofy from "cronofy";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

const cronofyClient = new cronofy({
  client_id: process.env.CRONOFY_CLIENT_ID!,
  client_secret: process.env.CRONOFY_CLIENT_SECRET!,
  data_center: process.env.CRONOFY_DATA_CENTER as string,
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { integration_id } = body;

    if (!integration_id) {
      return NextResponse.json({ error: "missing integration_id" }, { status: 400 });
    }

    // Fetch the integration — verify it belongs to this user
    const { data: integration, error: fetchError } = await supabase
      .from("business_calendar_integrations")
      .select("id, refresh_token, account_id, user_id")
      .eq("id", integration_id)
      .eq("user_id", user.id)
      .eq("provider", "cronofy")
      .maybeSingle();

    if (fetchError || !integration) {
      return NextResponse.json({ error: "integration_not_found" }, { status: 404 });
    }

    // Check if other users share this account_id
    // If so, only revoke our token — don't revoke the whole Cronofy account
    const { data: otherUsers } = await supabase
      .from("business_calendar_integrations")
      .select("id")
      .eq("account_id", integration.account_id)
      .eq("provider", "cronofy")
      .neq("user_id", user.id);

    const isSharedAccount = otherUsers && otherUsers.length > 0;

    // Revoke on Cronofy's side
    try {
      if (isSharedAccount) {
        // Only revoke our specific token, not the whole account
        // This keeps other users' access intact
        await cronofyClient.revokeAuthorization({
          token: integration.refresh_token,
        });
      } else {
        // We're the only user — safe to revoke by sub
        await cronofyClient.revokeAuthorization({
          sub: integration.account_id,
        });
      }
    } catch (err) {
      // Log but continue — we still want to clean up our DB
      console.error("[cronofy/disconnect] Revoke failed:", err);
    }

    // delete in calendar_connections table
    const { error: deleteCalendarConnectionError } = await supabase
      .from("calendar_connections")
      .delete()
      .eq("integration_id", integration_id)
      .eq("owner_user_id", user.id);
    if (deleteCalendarConnectionError) {
      console.error(
        "[cronofy/disconnect] Failed to delete calendar connection:",
        deleteCalendarConnectionError
      );
    }

    // Delete from DB
    const { error: deleteError } = await supabase
      .from("business_calendar_integrations")
      .delete()
      .eq("id", integration_id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "db_delete_failed", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, was_shared: isSharedAccount });
  } catch (err) {
    console.error("[cronofy/disconnect] Unexpected error:", err);
    return NextResponse.json(
      { error: "internal_error", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
