// /app/lib/calendar-token-resolver.ts
// Resolves calendar IDs to access tokens via calendar_connections and business_calendar_integrations

import { createAdminClient } from "@/app/utils/supabase/server";
// @ts-expect-error: cronofy SDK has no types
import cronofy from "cronofy";

interface CalendarTokenInfo {
  access_token: string;
  integration_id: string;
  user_id: string;
  calendar_id: string;
}

type CalendarConnectionRow = {
  calendar_id: string;
  integration_id: string;
  owner_user_id: string;
  is_active: boolean;
};

type IntegrationRow = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  profile_id: string | null;
};

async function getValidAccessTokenForIntegration(
  supabaseServiceRoleClient: Awaited<ReturnType<typeof createAdminClient>>,
  integration: IntegrationRow
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(integration.expires_at);

  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshClient = new cronofy({
      client_id: process.env.CRONOFY_CLIENT_ID!,
      client_secret: process.env.CRONOFY_CLIENT_SECRET!,
      data_center: process.env.CRONOFY_DATA_CENTER as string,
    });

    const refreshed = await refreshClient.refreshAccessToken({
      refresh_token: integration.refresh_token,
    });

    const newExpiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();

    await supabaseServiceRoleClient
      .from("business_calendar_integrations")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? integration.refresh_token,
        expires_at: newExpiresAt,
      })
      .eq("id", integration.id);

    return refreshed.access_token;
  }

  return integration.access_token;
}

async function resolveCalendarConnections(
  supabaseServiceRoleClient: Awaited<ReturnType<typeof createAdminClient>>,
  calendarIds: string[]
): Promise<CalendarConnectionRow[]> {
  const uniqueCalendarIds = [...new Set(calendarIds)];
  if (uniqueCalendarIds.length === 0) return [];

  const { data: integrations, error } = await supabaseServiceRoleClient
    .from("business_calendar_integrations")
    .select("id, user_id, access_token, refresh_token, expires_at, profile_id")
    .eq("provider", "cronofy");

  if (error || !integrations || integrations.length === 0) {
    return [];
  }

  const resolved: CalendarConnectionRow[] = [];
  const remainingIds = new Set(uniqueCalendarIds);

  for (const integration of integrations as IntegrationRow[]) {
    if (remainingIds.size === 0) break;

    try {
      const accessToken = await getValidAccessTokenForIntegration(
        supabaseServiceRoleClient,
        integration
      );

      const client = new cronofy({
        access_token: accessToken,
        data_center: process.env.CRONOFY_DATA_CENTER as string,
      });

      const response = await client.listCalendars();
      const calendars = (response?.calendars || []).filter(
        (cal: { calendar_deleted: boolean; profile_id: string }) =>
          !cal.calendar_deleted &&
          (!integration.profile_id || cal.profile_id === integration.profile_id)
      );

      for (const cal of calendars) {
        if (!remainingIds.has(cal.calendar_id)) continue;

        resolved.push({
          calendar_id: cal.calendar_id,
          integration_id: integration.id,
          owner_user_id: integration.user_id,
          is_active: true,
        });
        remainingIds.delete(cal.calendar_id);
      }
    } catch (error) {
      console.warn(`⚠️ Failed fallback calendar lookup for integration ${integration.id}:`, error);
    }
  }

  return resolved;
}

/**
 * Get access token for a specific calendar ID
 * Resolves via calendar_connections first, then falls back to Cronofy calendar listing if needed.
 */
export async function getAccessTokenForCalendar(calendar_id: string): Promise<CalendarTokenInfo> {
  const tokenMap = await getAccessTokensForCalendars([calendar_id]);

  for (const [integration_id, { access_token, user_id, calendar_ids }] of tokenMap) {
    if (!calendar_ids.includes(calendar_id)) continue;
    return {
      access_token,
      integration_id,
      user_id,
      calendar_id,
    };
  }

  throw new Error(`Calendar connection not found for calendar_id: ${calendar_id}`);
}

/**
 * Get access tokens for multiple calendar IDs, grouped by integration
 * Returns a map: integration_id → { access_token, user_id, calendar_ids[] }
 */
export async function getAccessTokensForCalendars(
  calendar_ids: string[]
): Promise<Map<string, { access_token: string; user_id: string; calendar_ids: string[] }>> {
  const supabaseServiceRoleClient = await createAdminClient();

  const uniqueCalendarIds = [...new Set(calendar_ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueCalendarIds.length === 0) {
    throw new Error("No calendar IDs provided");
  }

  console.log("🔍 Looking for calendar connections:", uniqueCalendarIds);

  const { data: connections, error: connError } = await supabaseServiceRoleClient
    .from("calendar_connections")
    .select("calendar_id, integration_id, owner_user_id, is_active")
    .in("calendar_id", uniqueCalendarIds);

  if (connError) {
    console.error("❌ Database error fetching calendar connections:", connError);
    throw new Error(`Failed to fetch calendar connections: ${connError.message}`);
  }

  console.log(
    `📊 Found ${connections?.length || 0} calendar connections out of ${uniqueCalendarIds.length} requested`
  );

  let activeConnections: CalendarConnectionRow[] = (connections || []).filter(
    (conn) => conn.is_active === true
  );
  console.log(`✅ Active connections: ${activeConnections.length}`);

  let foundIds = new Set(activeConnections.map((c) => c.calendar_id));
  let missingIds = uniqueCalendarIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    console.warn(`⚠️ Missing calendar connections for IDs: ${missingIds.join(", ")}`);

    const inactiveConnections = (connections || []).filter(
      (conn) => conn.is_active === false && missingIds.includes(conn.calendar_id)
    );

    if (inactiveConnections.length > 0) {
      console.warn(
        `⚠️ Found ${inactiveConnections.length} inactive calendar connection(s) for missing IDs`
      );
    }

    const fallbackConnections = await resolveCalendarConnections(
      supabaseServiceRoleClient,
      missingIds
    );

    if (fallbackConnections.length > 0) {
      console.log(
        `🛟 Resolved ${fallbackConnections.length} missing calendar connection(s) via Cronofy lookup`
      );
      activeConnections = [...activeConnections, ...fallbackConnections];
      foundIds = new Set(activeConnections.map((c) => c.calendar_id));
      missingIds = uniqueCalendarIds.filter((id) => !foundIds.has(id));
    }
  }

  if (activeConnections.length === 0) {
    const inactiveConnections = (connections || []).filter((conn) => conn.is_active === false);
    if (inactiveConnections.length > 0) {
      console.warn(`⚠️ Found ${inactiveConnections.length} inactive calendar connections`);
      throw new Error(
        `No active calendar connections found. ${inactiveConnections.length} connection(s) exist but are marked as inactive. ` +
          `Requested calendar_ids: ${uniqueCalendarIds.join(", ")}`
      );
    }

    throw new Error(
      `No calendar connections found for calendar_ids: ${uniqueCalendarIds.join(", ")}. ` +
        `Missing IDs: ${missingIds.join(", ")}`
    );
  }

  if (missingIds.length > 0) {
    console.log(
      `ℹ️ Proceeding with ${activeConnections.length} found calendar connection(s), ${missingIds.length} missing`
    );
  }

  const integrationMap = new Map<string, { user_id: string; calendar_ids: string[] }>();

  for (const conn of activeConnections) {
    if (!conn.integration_id) {
      console.warn(`⚠️ Calendar connection ${conn.calendar_id} has no integration_id`);
      continue;
    }

    if (!integrationMap.has(conn.integration_id)) {
      integrationMap.set(conn.integration_id, {
        user_id: conn.owner_user_id,
        calendar_ids: [],
      });
    }
    integrationMap.get(conn.integration_id)!.calendar_ids.push(conn.calendar_id);
  }

  const result = new Map<
    string,
    { access_token: string; user_id: string; calendar_ids: string[] }
  >();

  for (const [integration_id, { user_id, calendar_ids }] of integrationMap) {
    const { data: integration, error: integError } = await supabaseServiceRoleClient
      .from("business_calendar_integrations")
      .select("id, user_id, access_token, refresh_token, expires_at, profile_id")
      .eq("id", integration_id)
      .eq("provider", "cronofy")
      .maybeSingle();

    if (integError || !integration) {
      console.warn(`⚠️ Integration ${integration_id} not found while resolving calendar tokens`);
      continue;
    }

    const access_token = await getValidAccessTokenForIntegration(
      supabaseServiceRoleClient,
      integration as IntegrationRow
    );

    result.set(integration_id, {
      access_token,
      user_id,
      calendar_ids,
    });
  }

  return result;
}
