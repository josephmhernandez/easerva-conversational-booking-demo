// /app/lib/cronofyClient.ts
import { createClient } from "@/app/utils/supabase/server";
// @ts-expect-error: cronofy SDK has no types
import cronofy from "cronofy";
import { TimeZoneId } from "../constants/timezones";

type IntegrationRow = {
  user_id: string;
  provider: string;
  account_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  default_calendar_id?: string | null;
};

// ---------- Internal: DB helpers ----------

async function getIntegration(user_id: string): Promise<IntegrationRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_calendar_integrations")
    .select("*")
    .eq("user_id", user_id)
    .eq("provider", "cronofy")
    .maybeSingle();
  if (error || !data) throw new Error("No Cronofy integration for user");
  return data as IntegrationRow;
}

async function saveTokens(
  user_id: string,
  next: { access_token: string; refresh_token?: string; expires_in: number }
) {
  const expires_at = new Date(Date.now() + next.expires_in * 1000).toISOString();
  const update: { access_token: string; expires_at: string; refresh_token?: string } = {
    access_token: next.access_token,
    expires_at,
  };
  if (next.refresh_token) update.refresh_token = next.refresh_token;

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_calendar_integrations")
    .update(update)
    .eq("user_id", user_id)
    .eq("provider", "cronofy");
  if (error) throw new Error("Failed to update tokens: " + error.message);
}

async function saveDefaultCalendarId(user_id: string, calendar_id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_calendar_integrations")
    .update({ default_calendar_id: calendar_id })
    .eq("user_id", user_id)
    .eq("provider", "cronofy");
  if (error) throw new Error("Failed to save default calendar id: " + error.message);
}

// ---------- Public: base client + auto refresh ----------

export async function getCronofyAuthedClient(user_id: string) {
  const integ = await getIntegration(user_id);

  const needsRefresh =
    !integ.expires_at || Date.now() > new Date(integ.expires_at).getTime() - 60_000; // 60s leeway

  let client = new cronofy({
    access_token: integ.access_token,
    client_id: process.env.CRONOFY_CLIENT_ID!,
    client_secret: process.env.CRONOFY_CLIENT_SECRET!,
    data_center: process.env.CRONOFY_DATA_CENTER as string,
  });

  if (needsRefresh) {
    const refreshed = await client.refreshAccessToken({ refresh_token: integ.refresh_token });
    await saveTokens(user_id, refreshed);
    client = new cronofy({
      access_token: refreshed.access_token,
      client_id: process.env.CRONOFY_CLIENT_ID!,
      client_secret: process.env.CRONOFY_CLIENT_SECRET!,
      data_center: process.env.CRONOFY_DATA_CENTER as string,
    });
  }

  return { client, account_id: integ.account_id, integ };
}

/** Helper: call Cronofy with auto refresh/retry on 401 */
export async function withCronofy<T>(
  user_id: string,
  fn: (client: any, integ: IntegrationRow) => Promise<T>
): Promise<T> {
  const { client, integ } = await getCronofyAuthedClient(user_id);
  try {
    return await fn(client, integ);
  } catch (e: unknown) {
    const msg = String((e as { message?: string })?.message || "");
    const status = (e as { statusCode?: number })?.statusCode;
    const tokenExpired = status === 401 || /Token Expired/i.test(msg);
    if (!tokenExpired) throw e;

    const refreshed = await client.refreshAccessToken({ refresh_token: integ.refresh_token });
    await saveTokens(user_id, refreshed);
    const client2 = new cronofy({
      access_token: refreshed.access_token,
      client_id: process.env.CRONOFY_CLIENT_ID!,
      client_secret: process.env.CRONOFY_CLIENT_SECRET!,
      data_center: process.env.CRONOFY_DATA_CENTER as string,
    });
    return await fn(client2, integ);
  }
}

// ---------- New: convenience helpers for the POC ----------

/** List calendars for the host (business owner). */
export async function listCalendars(user_id: string) {
  return withCronofy(user_id, async (client) => {
    const cals = await (client as any).listCalendars();
    return cals as unknown[];
  });
}

/**
 * Pick a writable calendar for the host.
 * - If `preferCalendarId` provided and writable, returns it.
 * - Else uses saved `default_calendar_id` if present and writable.
 * - Else picks the first writable, saves it as default, and returns it.
 */

type CronofyCalendar = {
  calendar_id: string;
  calendar_deleted: boolean;
  calendar_readonly: boolean;
};

export async function getWritableCalendarId(user_id: string, preferCalendarId?: string) {
  return withCronofy(user_id, async (client, integ) => {
    const calendar = await (client as any).listCalendars();
    const cals = calendar.calendars as CronofyCalendar[];
    if (!cals) throw new Error("No calendars found for host");
    const isWritable = (c: CronofyCalendar) => !c.calendar_deleted && !c.calendar_readonly;

    const byId = (id?: string) => cals.find((c) => c.calendar_id === id && isWritable(c));

    if (preferCalendarId) {
      const found = byId(preferCalendarId);
      if (found) return found.calendar_id as string;
    }

    if (integ.default_calendar_id) {
      const found = byId(integ.default_calendar_id);
      if (found) return found.calendar_id as string;
    }

    const firstWritable = cals.find(isWritable);
    if (!firstWritable) throw new Error("No writable calendar found for host");
    // persist as default for next time
    await saveDefaultCalendarId(user_id, firstWritable.calendar_id);
    return firstWritable.calendar_id as string;
  });
}

/**
 * Check free/busy for a time window.
 * @returns { free: boolean, busyBlocks: any[] }
 */
export async function freeBusyRange(
  user_id: string,
  fromISO: string,
  toISO: string,
  tzid: TimeZoneId
) {
  console.log("[freeBusyRange] inputs", user_id, fromISO, toISO, tzid);
  return withCronofy(user_id, async (client) => {
    const blocks = await (client as any).freeBusy({ from: fromISO, to: toISO, tzid });

    const isBusy = (blocks || []).some((b: any) => b.free_busy_status !== "free");
    console.log("Cronofy freeBusy range", { from: fromISO, to: toISO, tzid, isBusy, blocks });
    return { free: !isBusy, busyBlocks: blocks || [] };
  });
}

/**
 * Create or upsert an event on the host's calendar and invite an attendee.
 * Required: start, end, attendeeEmail.
 * Optional: summary, description, location, calendar_id, event_id (idempotency).
 */
export async function bookEventOnHostCalendar(args: {
  host_user_id: string;
  start: string; // ISO
  end: string; // ISO
  attendeeEmail: string;
  attendeeName?: string;
  summary?: string;
  description?: string;
  location?: string; // plain text; converted to { description }
  calendar_id?: string;
  event_id?: string; // if omitted we generate one
}) {
  const {
    host_user_id,
    start,
    end,
    attendeeEmail,
    attendeeName,
    summary = "Intro meeting",
    description = "Booked via Joey Booking POC",
    location,
    calendar_id,
    event_id,
  } = args;

  return withCronofy(host_user_id, async (client) => {
    // pick calendar
    const targetCalendarId = await getWritableCalendarId(host_user_id, calendar_id);

    // payload (supports createEvent or upsertEvent depending on SDK version)
    const payload: any = {
      calendar_id: targetCalendarId,
      event_id: event_id || `joey-${Date.now()}`, // naive idempotency
      summary,
      description,
      start,
      end,
      attendees: {
        invite: [
          {
            email: attendeeEmail,
            display_name: attendeeName || attendeeEmail.split("@")[0],
          },
        ],
      },
      reminders: [{ minutes: 30 }],
    };
    if (location) payload.location = { description: location };

    const create = (client as any).createEvent || (client as any).upsertEvent;
    if (!create) throw new Error("Cronofy SDK createEvent/upsertEvent not found");

    const result = await create.call(client, payload);
    return {
      calendar_id: targetCalendarId,
      event_id: payload.event_id,
      result,
    };
  });
}
