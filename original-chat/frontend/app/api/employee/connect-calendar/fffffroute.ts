// // app/api/employee/connect-calendar/route.ts
// import { NextResponse } from "next/server";
// import { createClient } from "../../../utils/supabase/server";

// interface ConnectCalendarRequest {
//   employeeId: string;
//   cronofyProfileId: string;
//   cronofyCalendarId: string;
//   calendarProvider: string;
// }

// export async function POST(request: Request) {
//   const supabase = await createClient();

//   // ============================================================================
//   // 1. AUTHENTICATION & AUTHORIZATION
//   // ============================================================================
//   const {
//     data: { user },
//     error: authError,
//   } = await supabase.auth.getUser();

//   if (authError || !user) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   // ============================================================================
//   // 2. PARSE REQUEST
//   // ============================================================================
//   let requestData: ConnectCalendarRequest;
//   try {
//     requestData = await request.json();
//   } catch {
//     return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
//   }

//   const { employeeId, cronofyProfileId, cronofyCalendarId, calendarProvider } = requestData;

//   if (!employeeId || !cronofyProfileId || !cronofyCalendarId) {
//     return NextResponse.json(
//       { error: "Missing required fields: employeeId, cronofyProfileId, cronofyCalendarId" },
//       { status: 400 }
//     );
//   }

//   try {
//     // ============================================================================
//     // 3. UPDATE EMPLOYEE RECORD
//     // ============================================================================
//     const { error: employeeError } = await supabase
//       .from("employees")
//       .update({
//         calendar_connected: true,
//         calendar_connection_required: false,
//         cronofy_profile_id: cronofyProfileId,
//         cronofy_calendar_id: cronofyCalendarId,
//       })
//       .eq("id", employeeId);

//     if (employeeError) {
//       console.error("Employee update error:", employeeError);
//       return NextResponse.json(
//         { error: "Failed to update employee calendar connection" },
//         { status: 500 }
//       );
//     }

//     // ============================================================================
//     // 4. UPDATE CALENDAR GROUPS
//     // ============================================================================
//     const { error: calendarError } = await supabase
//       .from("calendar_groups")
//       .update({
//         default_booking_calendar_id: cronofyCalendarId,
//         calendar_provider: calendarProvider || "google",
//         is_configured: true,
//         pending_configuration: false,
//       })
//       .eq("entity_type", "employee")
//       .eq("entity_id", employeeId);

//     if (calendarError) {
//       console.error("Calendar group update error:", calendarError);
//       return NextResponse.json(
//         { error: "Failed to update calendar groups" },
//         { status: 500 }
//       );
//     }

//     // ============================================================================
//     // 5. RECALCULATE SERVICE CARD READINESS
//     // ============================================================================
//     // Get all service cards that have requirements involving this employee
//     const { data: affectedCards, error: cardsError } = await supabase
//       .from("service_card_requirements")
//       .select(`
//         service_card_id,
//         service_cards!inner(
//           id,
//           business_id
//         )
//       `)
//       .eq("entity_type", "employee")
//       .eq("entity_id", employeeId);

//     if (cardsError) {
//       console.error("Error fetching affected cards:", cardsError);
//     } else if (affectedCards && affectedCards.length > 0) {
//       // For each affected card, recalculate requirements_ready
//       for (const card of affectedCards) {
//         const { data: requirements, error: reqError } = await supabase
//           .from("service_card_requirements")
//           .select(`
//             calendar_group_id,
//             calendar_groups!inner(
//               pending_configuration
//             )
//           `)
//           .eq("service_card_id", card.service_card_id)
//           .not("calendar_group_id", "is", null);

//         if (reqError) {
//           console.error("Error fetching requirements:", reqError);
//           continue;
//         }

//         // Count pending calendars
//         const pendingCount = requirements?.filter(
//           (req) => req.calendar_groups?.pending_configuration
//         ).length || 0;

//         const requirementsReady = pendingCount === 0;

//         // Update the service card
//         await supabase
//           .from("service_cards")
//           .update({
//             requirements_ready: requirementsReady,
//             pending_calendar_count: pendingCount,
//           })
//           .eq("id", card.service_card_id);
//       }
//     }

//     // ============================================================================
//     // 6. SUCCESS RESPONSE
//     // ============================================================================
//     return NextResponse.json({
//       success: true,
//       message: "Calendar connected successfully",
//       employeeId,
//       affectedCards: affectedCards?.length || 0,
//     });
//   } catch (error: unknown) {
//     console.error("❌ Calendar connection error:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         error: "Failed to connect calendar",
//         details: error instanceof Error ? error.message : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }
