// /app/lib/multi-calendar-booking.ts
// Handles creating events on multiple calendars with rollback on failure

import {
  createEventOnCalendar,
  deleteEventFromCalendar,
  EventData,
  CreatedEvent,
} from "./cronofy-event-creator";

export interface MultiCalendarBookingResult {
  createdEvents: CreatedEvent[];
  failedCalendars: Array<{ calendar_id: string; error: string }>;
}

/**
 * Creates events on multiple calendars with automatic rollback on failure
 * @param calendarIds - Array of Cronofy calendar_ids to create events on
 * @param eventData - Event details (same event will be created on all calendars)
 * @returns Result with created events and any failures
 */
export async function createEventsOnMultipleCalendars(
  calendarIds: string[],
  eventData: EventData
): Promise<MultiCalendarBookingResult> {
  if (calendarIds.length === 0) {
    throw new Error("No calendar IDs provided");
  }

  console.log(`📅 Creating events on ${calendarIds.length} calendar(s):`, calendarIds);

  const createdEvents: CreatedEvent[] = [];
  const failedCalendars: Array<{ calendar_id: string; error: string }> = [];

  // Create events sequentially to track progress
  for (const calendarId of calendarIds) {
    try {
      const createdEvent = await createEventOnCalendar(calendarId, eventData);
      createdEvents.push(createdEvent);
      console.log(`✅ Successfully created event on calendar ${calendarId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to create event on calendar ${calendarId}:`, errorMessage, error);
      failedCalendars.push({
        calendar_id: calendarId,
        error: errorMessage,
      });

      // Rollback: Delete all successfully created events
      console.log(`🔄 Rolling back ${createdEvents.length} successfully created event(s)...`);
      for (const createdEvent of createdEvents) {
        try {
          await deleteEventFromCalendar(createdEvent.calendar_id, createdEvent.cronofy_event_id);
          console.log(`✅ Rolled back event on calendar ${createdEvent.calendar_id}`);
        } catch (rollbackError) {
          console.error(
            `⚠️ Failed to rollback event on calendar ${createdEvent.calendar_id}:`,
            rollbackError
          );
          // Continue rolling back other events even if one fails
        }
      }

      // Throw error with details
      throw new Error(
        `Failed to create event on calendar ${calendarId}. ` +
          `Successfully created ${createdEvents.length} event(s) before failure, all rolled back. ` +
          `Error: ${errorMessage}`
      );
    }
  }

  console.log(`✅ Successfully created events on all ${createdEvents.length} calendar(s)`);

  return {
    createdEvents,
    failedCalendars,
  };
}
