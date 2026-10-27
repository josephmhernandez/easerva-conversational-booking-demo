// // app/api/bookings/create/route.ts
// import { NextResponse } from "next/server";
// import { createClient } from "../../../utils/supabase/server";

// interface CreateBookingRequest {
//   serviceCardId: string;
//   startTime: string; // ISO8601
//   endTime: string; // ISO8601
//   customerInfo: {
//     name: string;
//     email: string;
//     phone?: string;
//   };
//   notes?: string;
// }

// interface BookingCalendar {
//   calendarGroupId: string;
//   cronofyCalendarId: string;
//   entityName: string;
//   entityType: string;
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
//   let requestData: CreateBookingRequest;
//   try {
//     requestData = await request.json();
//   } catch {
//     return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
//   }

//   const { serviceCardId, startTime, endTime, customerInfo, notes } = requestData;

//   if (!serviceCardId || !startTime || !endTime || !customerInfo?.name || !customerInfo?.email) {
//     return NextResponse.json(
//       { error: "Missing required fields: serviceCardId, startTime, endTime, customerInfo.name, customerInfo.email" },
//       { status: 400 }
//     );
//   }

//   try {
//     // ============================================================================
//     // 3. VALIDATE SERVICE CARD
//     // ============================================================================
//     const { data: serviceCard, error: cardError } = await supabase
//       .from("service_cards")
//       .select(`
//         id,
//         display_name,
//         requirements_ready,
//         pending_calendar_count,
//         business_id,
//         service_ids,
//         location_id,
//         employee_id
//       `)
//       .eq("id", serviceCardId)
//       .single();

//     if (cardError || !serviceCard) {
//       return NextResponse.json(
//         { error: "Service card not found" },
//         { status: 404 }
//       );
//     }

//     if (!serviceCard.requirements_ready) {
//       return NextResponse.json(
//         {
//           error: "Service not ready",
//           message: "This service requires calendar connections that are not yet configured",
//           pendingCalendars: serviceCard.pending_calendar_count,
//         },
//         { status: 400 }
//       );
//     }

//     // ============================================================================
//     // 4. FETCH BOOKING CALENDAR ASSIGNMENTS
//     // ============================================================================
//     const { data: assignments, error: assignError } = await supabase
//       .from("booking_calendar_assignments")
//       .select(`
//         calendar_group_id,
//         should_create_booking,
//         calendar_groups!inner(
//           id,
//           default_booking_calendar_id,
//           display_name,
//           entity_type,
//           entity_id,
//           is_configured,
//           pending_configuration
//         )
//       `)
//       .eq("service_card_id", serviceCardId)
//       .eq("should_create_booking", true);

//     if (assignError) {
//       console.error("Error fetching booking assignments:", assignError);
//       return NextResponse.json(
//         { error: "Failed to fetch booking calendar assignments" },
//         { status: 500 }
//       );
//     }

//     if (!assignments || assignments.length === 0) {
//       return NextResponse.json(
//         { error: "No booking calendars configured for this service" },
//         { status: 400 }
//       );
//     }

//     // ============================================================================
//     // 5. PREPARE BOOKING CALENDARS
//     // ============================================================================
//     const bookingCalendars: BookingCalendar[] = [];
//     const unconfiguredCalendars: string[] = [];

//     for (const assignment of assignments) {
//       const group = assignment.calendar_groups as {
//         id: string;
//         default_booking_calendar_id: string;
//         display_name: string;
//         entity_type: string;
//         entity_id: string;
//         is_configured: boolean;
//         pending_configuration: boolean;
//       };

//       if (!group.is_configured || group.pending_configuration) {
//         unconfiguredCalendars.push(group.display_name || "Unknown");
//         continue;
//       }

//       if (group.default_booking_calendar_id && group.default_booking_calendar_id !== "configure_later") {
//         bookingCalendars.push({
//           calendarGroupId: group.id,
//           cronofyCalendarId: group.default_booking_calendar_id,
//           entityName: group.display_name || "Unknown",
//           entityType: group.entity_type,
//         });
//       }
//     }

//     if (unconfiguredCalendars.length > 0) {
//       return NextResponse.json(
//         {
//           error: "Service not ready",
//           message: "Some required calendars are not yet configured",
//           unconfiguredCalendars,
//         },
//         { status: 400 }
//       );
//     }

//     // ============================================================================
//     // 6. CREATE BOOKING RECORD
//     // ============================================================================
//     const bookingData = {
//       service_card_id: serviceCardId,
//       business_id: serviceCard.business_id,
//       customer_name: customerInfo.name,
//       customer_email: customerInfo.email,
//       customer_phone: customerInfo.phone || null,
//       start_time: startTime,
//       end_time: endTime,
//       status: "confirmed",
//       notes: notes || null,
//       created_by: user.id,
//     };

//     const { data: booking, error: bookingError } = await supabase
//       .from("bookings")
//       .insert(bookingData)
//       .select()
//       .single();

//     if (bookingError) {
//       console.error("Error creating booking:", bookingError);
//       return NextResponse.json(
//         { error: "Failed to create booking" },
//         { status: 500 }
//       );
//     }

//     // ============================================================================
//     // 7. CREATE CALENDAR EVENTS (VIA CRONOFY)
//     // ============================================================================
//     const calendarEvents = [];
//     const eventTitle = `${serviceCard.display_name} - ${customerInfo.name}`;
//     const eventDescription = `Booking for ${serviceCard.display_name}\nCustomer: ${customerInfo.name}\nEmail: ${customerInfo.email}${customerInfo.phone ? `\nPhone: ${customerInfo.phone}` : ""}${notes ? `\nNotes: ${notes}` : ""}`;

//     // TODO: Replace this with actual Cronofy API calls
//     // For now, simulate creating events on multiple calendars
//     for (const calendar of bookingCalendars) {
//       try {
//         // Simulate Cronofy API call
//         const eventData = {
//           calendar_id: calendar.cronofyCalendarId,
//           event: {
//             event_id: `booking-${booking.id}-${calendar.calendarGroupId}`,
//             summary: eventTitle,
//             description: eventDescription,
//             start: startTime,
//             end: endTime,
//             location: {
//               description: calendar.entityName,
//             },
//           },
//         };

//         // In a real implementation, you would call:
//         // await cronofyClient.createEvent(eventData);

//         calendarEvents.push({
//           calendarGroupId: calendar.calendarGroupId,
//           cronofyCalendarId: calendar.cronofyCalendarId,
//           entityName: calendar.entityName,
//           eventId: eventData.event.event_id,
//           status: "created", // or "failed" if there was an error
//         });

//         console.log(`✅ Created event on ${calendar.entityName} calendar`);
//       } catch (error) {
//         console.error(`❌ Failed to create event on ${calendar.entityName}:`, error);
//         calendarEvents.push({
//           calendarGroupId: calendar.calendarGroupId,
//           cronofyCalendarId: calendar.cronofyCalendarId,
//           entityName: calendar.entityName,
//           eventId: null,
//           status: "failed",
//           error: error instanceof Error ? error.message : String(error),
//         });
//       }
//     }

//     // ============================================================================
//     // 8. SUCCESS RESPONSE
//     // ============================================================================
//     return NextResponse.json({
//       success: true,
//       booking: {
//         id: booking.id,
//         serviceCardId,
//         customerName: customerInfo.name,
//         customerEmail: customerInfo.email,
//         startTime,
//         endTime,
//         status: "confirmed",
//       },
//       calendarEvents,
//       createdOnCalendars: bookingCalendars.length,
//       failedCalendars: calendarEvents.filter(e => e.status === "failed").length,
//     });
//   } catch (error: unknown) {
//     console.error("❌ Booking creation error:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         error: "Failed to create booking",
//         details: error instanceof Error ? error.message : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }
