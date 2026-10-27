import { toZonedTime } from "date-fns-tz";
import { TimeZoneId } from "../constants/tzConstants";

export function formatTimeInTimezone(timezone: TimeZoneId): string {
  return new Date().toLocaleString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

export function getSystemTzid() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function getValidSystemTzid(): TimeZoneId | "Etc/UTC" {
  const tz = getSystemTzid();
  return (Object.values(TimeZoneId) as string[]).includes(tz) ? (tz as TimeZoneId) : "Etc/UTC";
}

// HELPER.
// build "YYYY-MM-DDTHH:mm:ss" from a Date (no Z, no offset)
function fmtNaive(dt: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

/** Convert <input type="datetime-local"> value + duration to naive local range */
export function buildCronofyLocalRange(localValue: string, minutes: number) {
  if (!localValue) return null;
  // datetime-local gives "YYYY-MM-DDTHH:mm" in the browser's local tz
  const start = new Date(localValue); // interpreted as *local* by JS
  if (!isFinite(+start)) return null;
  const end = new Date(start.getTime() + Math.max(1, minutes) * 60_000);
  return { from: fmtNaive(start), to: fmtNaive(end) };
}

export function localStringWithZoneToUtcIso(localDateTime: string, tzid: string): string {
  // Parse the input string as if it’s “local wall time”
  // Example: "2025-08-29T10:00:00"
  const localDate = new Date(localDateTime);

  // Convert to UTC according to the tzid
  const utcDate = toZonedTime(localDate, tzid);

  return utcDate.toISOString();
}
