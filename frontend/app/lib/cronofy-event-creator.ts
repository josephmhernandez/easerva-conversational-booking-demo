// /app/lib/cronofy-event-creator.ts
// Utility for creating calendar events on Cronofy

// @ts-expect-error: cronofy SDK has no types
import cronofy from "cronofy";
import { getAccessTokenForCalendar } from "./calendar-token-resolver";

export interface EventData {
  eventId: string; // Unique identifier (UUID)
  summary: string; // Event title (e.g., "Men's Haircut - John Doe")
  description?: string; // Customer notes
  start: string; // ISO8601 timestamp in location timezone
  end: string; // ISO8601 timestamp in location timezone
  tzid: string; // IANA timezone identifier
  location?: string; // Location address
}

export interface CreatedEvent {
  calendar_id: string;
  cronofy_event_id: string;
  cronofy_event_uid?: string;
  integration_id: string;
}

/**
 * Creates a calendar event on a specific Cronofy calendar
 * @param calendarId - Cronofy calendar_id
 * @param eventData - Event details
 * @returns Created event information
 */
export async function createEventOnCalendar(
  calendarId: string,
  eventData: EventData
): Promise<CreatedEvent> {
  // Get access token for the calendar
  const { access_token, integration_id } = await getAccessTokenForCalendar(calendarId);

  // Initialize Cronofy client
  const client = new cronofy({
    access_token,
    client_id: process.env.CRONOFY_CLIENT_ID!,
    client_secret: process.env.CRONOFY_CLIENT_SECRET!,
    data_center: process.env.CRONOFY_DATA_CENTER as string,
  });

  // Format times for Cronofy API
  // Cronofy expects ISO8601 timestamps with timezone
  // The start/end times should already be in the correct timezone format
  const startFormatted = eventData.start;
  const endFormatted = eventData.end;

  // Validate time range
  const startDate = new Date(startFormatted);
  const endDate = new Date(endFormatted);
  if (endDate <= startDate) {
    throw new Error(
      `Invalid time range: end (${endFormatted}) must be after start (${startFormatted})`
    );
  }

  console.log(`📅 Creating event on calendar ${calendarId}:`, {
    event_id: eventData.eventId,
    summary: eventData.summary,
    start: startFormatted,
    end: endFormatted,
    tzid: eventData.tzid,
    location: eventData.location,
  });

  try {
    // Prepare payload for Cronofy API
    const payload: {
      calendar_id: string;
      event_id: string;
      summary: string;
      start: string;
      end: string;
      tzid: string;
      description?: string;
      location?: { description: string };
    } = {
      calendar_id: calendarId,
      event_id: eventData.eventId,
      summary: eventData.summary,
      start: startFormatted,
      end: endFormatted,
      tzid: eventData.tzid,
    };

    // Add optional fields only if they exist
    if (eventData.description) {
      payload.description = eventData.description;
    }
    if (eventData.location) {
      payload.location = { description: eventData.location };
    }

    // Cronofy SDK may have either createEvent or upsertEvent depending on version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const create = (client as any).createEvent || (client as any).upsertEvent;
    if (!create) {
      throw new Error("Cronofy SDK createEvent/upsertEvent method not found");
    }

    // Call the method with the payload
    const response = await create.call(client, payload);

    console.log(`✅ Event created successfully on calendar ${calendarId}:`, {
      event_id: eventData.eventId,
      cronofy_event_id: response.event_id || eventData.eventId,
      cronofy_event_uid: response.event_uid,
    });

    return {
      calendar_id: calendarId,
      cronofy_event_id: response.event_id || eventData.eventId,
      cronofy_event_uid: response.event_uid,
      integration_id,
    };
  } catch (error) {
    console.error(`❌ Failed to create event on calendar ${calendarId}:`, error);
    throw new Error(
      `Failed to create event on calendar ${calendarId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Deletes a calendar event from Cronofy
 * @param calendarId - Cronofy calendar_id
 * @param eventId - Cronofy event_id
 */
export async function deleteEventFromCalendar(calendarId: string, eventId: string): Promise<void> {
  // Get access token for the calendar
  const { access_token } = await getAccessTokenForCalendar(calendarId);

  // Initialize Cronofy client
  const client = new cronofy({
    access_token,
    client_id: process.env.CRONOFY_CLIENT_ID!,
    client_secret: process.env.CRONOFY_CLIENT_SECRET!,
    data_center: process.env.CRONOFY_DATA_CENTER as string,
  });

  console.log(`🗑️ Deleting event ${eventId} from calendar ${calendarId}`);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).deleteEvent({
      calendar_id: calendarId,
      event_id: eventId,
    });

    console.log(`✅ Event ${eventId} deleted successfully from calendar ${calendarId}`);
  } catch (error) {
    console.error(`❌ Failed to delete event ${eventId} from calendar ${calendarId}:`, error);
    throw new Error(
      `Failed to delete event from calendar ${calendarId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
