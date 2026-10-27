// /app/api/cronofy/calendars/route.ts
/**
 * Lists calendars for the authenticated user using their stored access_token.
 * This avoids the element_token/account_id leak — each user only sees
 * calendars from their own authorization, even if two users share an account_id.
 */
// @ts-expect-error: cronofy SDK has no types
import cronofy from "cronofy";
import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

async function getValidAccessToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  integration: {
    id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
    account_id: string;
  }
) {
  const now = new Date();
  const expiresAt = new Date(integration.expires_at);

  // If token expires in the next 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshClient = new cronofy({
      client_id: process.env.CRONOFY_CLIENT_ID!,
      client_secret: process.env.CRONOFY_CLIENT_SECRET!,
      data_center: process.env.CRONOFY_DATA_CENTER as string,
    });

    try {
      const refreshed = await refreshClient.refreshAccessToken({
        refresh_token: integration.refresh_token,
      });

      const newExpiresAt = new Date(
        Date.now() + (refreshed.expires_in ?? 3600) * 1000
      ).toISOString();

      // Update tokens in DB
      await supabase
        .from("business_calendar_integrations")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? integration.refresh_token,
          expires_at: newExpiresAt,
        })
        .eq("id", integration.id);

      return refreshed.access_token;
    } catch (err) {
      console.error("[cronofy/calendars] Token refresh failed:", err);
      // Fall back to existing token — it might still work
      return integration.access_token;
    }
  }

  return integration.access_token;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Get ALL integrations for this user
    const { data: integrations, error } = await supabase
      .from("business_calendar_integrations")
      .select("id, account_id, access_token, refresh_token, expires_at, provider_name, profile_id")
      .eq("user_id", user.id)
      .eq("provider", "cronofy");

    if (error || !integrations || integrations.length === 0) {
      return NextResponse.json({ calendars: [], integrations: [] });
    }

    // For each integration, get a valid token and list calendars
    const allCalendars: Array<{
      provider_name: string;
      profile_id: string;
      profile_name: string;
      calendar_id: string;
      calendar_name: string;
      calendar_readonly: boolean;
      calendar_deleted: boolean;
      calendar_primary: boolean;
      calendar_integrated_conferencing_available: boolean;
      calendar_attachments_available: boolean;
      permission_level: string;
      // Extra fields for our UI
      integration_id: string;
      account_id: string;
    }> = [];

    const integrationSummaries: Array<{
      id: string;
      account_id: string;
      provider_name: string | null;
      profile_id: string | null;
      calendar_count: number;
    }> = [];

    for (const integration of integrations) {
      try {
        const accessToken = await getValidAccessToken(supabase, integration);

        const userClient = new cronofy({
          access_token: accessToken,
          data_center: process.env.CRONOFY_DATA_CENTER as string,
        });

        const response = await userClient.listCalendars();
        const calendars = response?.calendars ?? [];

        // Filter out deleted calendars and tag each with integration info
        const activeCalendars = calendars
          .filter(
            (cal: { calendar_deleted: boolean; profile_id: string }) =>
              !cal.calendar_deleted &&
              (!integration.profile_id || cal.profile_id === integration.profile_id)
          )
          .map((cal: Record<string, unknown>) => ({
            ...cal,
            integration_id: integration.id,
            account_id: integration.account_id,
          }));

        const calendarData = activeCalendars.map((cal: Record<string, unknown>) => ({
          calendar_id: String(cal.calendar_id ?? ""),
          calendar_name: String(cal.calendar_name ?? ""),
          profile_id: String(cal.profile_id ?? ""),
          profile_name: String(cal.profile_name ?? ""),
        }));

        if (calendarData.length > 0) {
          const { data: syncResult, error: syncError } = await supabase.rpc(
            "upsert_calendar_connections",
            {
              p_owner_user_id: user.id,
              p_integration_id: integration.id,
              p_calendars: calendarData,
            }
          );

          if (syncError || (syncResult && syncResult.success === false)) {
            console.error("[cronofy/calendars] Failed to sync calendar connections:", {
              integration_id: integration.id,
              error: syncError?.message ?? syncResult?.error,
            });
          }
        }

        allCalendars.push(...activeCalendars);

        integrationSummaries.push({
          id: integration.id,
          account_id: integration.account_id,
          provider_name: integration.provider_name,
          profile_id: integration.profile_id,
          calendar_count: activeCalendars.length,
        });
      } catch (err) {
        console.error(
          `[cronofy/calendars] Failed to list calendars for integration ${integration.id}:`,
          err
        );
        integrationSummaries.push({
          id: integration.id,
          account_id: integration.account_id,
          provider_name: integration.provider_name,
          profile_id: integration.profile_id,
          calendar_count: 0,
        });
      }
    }

    return NextResponse.json({
      calendars: allCalendars,
      integrations: integrationSummaries,
    });
  } catch (err) {
    console.error("[cronofy/calendars] Unexpected error:", err);
    return NextResponse.json(
      { error: "internal_error", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

// // /app/api/cronofy/calendars/route.ts
// import { createClient } from "@/app/utils/supabase/server";
// import { NextResponse } from "next/server";
// // @ts-expect-error: cronofy SDK has no types
// import cronofy from "cronofy";

// interface Calendar {
//   calendar_id: string;
//   calendar_name: string;
//   profile_id: string;
//   profile_name: string;
//   is_booking_calendar?: boolean;
//   is_busy_calendar?: boolean;
//   is_primary_booking?: boolean;
// }

// // CalendarListResponse interface removed - not used in this file

// export async function GET() {
//   const supabase = await createClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user?.id) {
//     return NextResponse.json({ error: "no_user" }, { status: 401 });
//   }

//   // Get ALL integrations for this user
//   const { data: integrations } = await supabase
//     .from("business_calendar_integrations")
//     .select("*")
//     .eq("user_id", user.id)
//     .eq("provider", "cronofy");

//   if (!integrations || integrations.length === 0) {
//     return NextResponse.json({ calendars: [] });
//   }

//   const integrationIds = integrations.map((i) => i.id);
//   const allCalendarsFromAPI: Calendar[] = [];

//   // Fetch calendars for EACH integration and store them
//   for (const integration of integrations) {
//     try {
//       // Use the specific integration's tokens, not just any integration for the user
//       const authedClient = new cronofy({
//         access_token: integration.access_token,
//         client_id: process.env.CRONOFY_CLIENT_ID!,
//         client_secret: process.env.CRONOFY_CLIENT_SECRET!,
//         data_center: process.env.CRONOFY_DATA_CENTER as string,
//       });

//       const calendars = await authedClient.listCalendars();

//       console.log("📅 Calendars fetched from Cronofy:", {
//         integration_id: integration.id,
//         calendar_count: calendars?.calendars?.length || 0,
//         calendar_ids: calendars?.calendars?.map((c: Calendar) => c.calendar_id) || [],
//       });

//       // Prepare calendar data for RPC
//       const calendarData =
//         calendars?.calendars?.map((cal: Calendar) => ({
//           calendar_id: cal.calendar_id,
//           calendar_name: cal.calendar_name,
//           profile_id: cal.profile_id,
//           profile_name: cal.profile_name,
//         })) || [];

//       // Only call RPC if there are calendars to upsert
//       if (calendarData.length > 0) {
//         console.log("📤 Calling RPC with:", {
//           p_owner_user_id: integration.user_id,
//           p_integration_id: integration.id,
//           calendar_count: calendarData.length,
//           calendar_data: calendarData,
//         });

//         // Store calendars in calendar_connections table using RPC
//         const { data, error } = await supabase.rpc("upsert_calendar_connections", {
//           p_owner_user_id: integration.user_id,
//           p_integration_id: integration.id,
//           p_calendars: calendarData,
//         });

//         console.log("📥 RPC Response:", {
//           integration_id: integration.id,
//           data: data,
//           error: error,
//           has_error: !!error,
//           has_data: !!data,
//         });

//         // Check for errors in both the error field and the data response
//         const rpcError = error || (data && data.success === false ? data.error : null);
//         const hasRpcError = !!rpcError || (data && data.success === false);

//         if (hasRpcError) {
//           console.error("❌ Error upserting calendars:", {
//             integration_id: integration.id,
//             user_id: integration.user_id,
//             rpc_error: rpcError,
//             error: error?.message || error,
//             error_code: error?.code,
//             error_details: error,
//             error_hint: error?.hint,
//             rpc_response: data,
//           });
//         } else {
//           const upsertedCount = data?.upserted_count ?? data?.count ?? 0;
//           if (upsertedCount === 0 && calendarData.length > 0) {
//             console.warn("⚠️ RPC returned 0 upserted calendars but we sent calendars:", {
//               integration_id: integration.id,
//               calendars_sent: calendarData.length,
//               rpc_response: data,
//             });
//           } else {
//             console.log(`✅ Upserted ${upsertedCount} calendars for integration ${integration.id}`);
//           }
//         }
//       } else {
//         console.log(`ℹ️ No calendars to upsert for integration ${integration.id}`);
//       }

//       // Store calendars from API as fallback
//       if (calendars?.calendars) {
//         allCalendarsFromAPI.push(...calendars.calendars);
//       }
//     } catch (error) {
//       console.error(`Error fetching calendars for integration ${integration.id}:`, error);
//     }
//   }

//   // Get calendars from database - ONLY for current user's integrations
//   // This ensures we only return calendars that belong to the current user
//   // @typescript-eslint prefer-const is not rational here, but it's needed to avoid the linter error.
//   // eslint-disable-next-line prefer-const
//   let { data: calendarConnections, error: dbError } = await supabase
//     .from("calendar_connections")
//     .select("*")
//     .in("integration_id", integrationIds) // Only get calendars from current user's integrations
//     .eq("owner_user_id", user.id) // Ensure we only get calendars for the current user
//     .eq("owner_type", "user"); // Match the owner_type used in the RPC

//   // Fallback: Try with "business" owner_type if "user" returns nothing
//   if ((!calendarConnections || calendarConnections.length === 0) && !dbError) {
//     console.log("⚠️ No calendars found with owner_type='user', trying owner_type='business'");
//     const fallbackResult = await supabase
//       .from("calendar_connections")
//       .select("*")
//       .in("integration_id", integrationIds)
//       .eq("owner_user_id", user.id)
//       .eq("owner_type", "business");

//     if (fallbackResult.data && fallbackResult.data.length > 0) {
//       calendarConnections = fallbackResult.data;
//       console.log("✅ Found calendars with owner_type='business'");
//     }
//   }

//   console.log("📊 Calendar connections from database:", {
//     user_id: user.id,
//     integration_ids: integrationIds,
//     calendar_count: calendarConnections?.length || 0,
//     calendar_ids: calendarConnections?.map((c) => c.calendar_id) || [],
//     db_error: dbError?.message,
//   });

//   // If we have calendars in the database, use those (they have settings)
//   if (calendarConnections && calendarConnections.length > 0) {
//     const calendarsWithSettings: Calendar[] = calendarConnections.map((conn) => ({
//       calendar_id: conn.calendar_id,
//       calendar_name: conn.calendar_name,
//       profile_id: conn.cronofy_profile_id || "",
//       profile_name: conn.cronofy_profile_name || "",
//       is_booking_calendar: conn.is_booking_calendar || false,
//       is_busy_calendar: conn.is_busy_calendar || false,
//       is_primary_booking: conn.is_primary_booking || false,
//     }));

//     return NextResponse.json({ calendars: calendarsWithSettings });
//   }

//   // Fallback: If database is empty but we have calendars from API, return those
//   // This handles cases where RPC failed but calendars were fetched successfully
//   if (allCalendarsFromAPI.length > 0) {
//     console.log("⚠️ Using calendars from API as fallback (database query returned empty):", {
//       api_calendar_count: allCalendarsFromAPI.length,
//       calendar_ids: allCalendarsFromAPI.map((c) => c.calendar_id),
//     });

//     return NextResponse.json({
//       calendars: allCalendarsFromAPI.map((cal) => ({
//         ...cal,
//         is_booking_calendar: false,
//         is_busy_calendar: false,
//         is_primary_booking: false,
//       })),
//     });
//   }

//   // No calendars found
//   return NextResponse.json({ calendars: [] });
// }
