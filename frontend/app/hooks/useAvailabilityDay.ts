// /app/hooks/useAvailabilityDay.ts
// Custom hook for fetching all busy periods for a day (optimized - one API call per day)
import { useQuery } from "@tanstack/react-query";

interface AvailabilityDayRequest {
  serviceCardId: string;
  date: string; // YYYY-MM-DD format
  timezone?: string;
}

interface BusyPeriod {
  calendar_id: string;
  start: string;
  end: string;
  calendar_group_id: string;
}

interface CalendarGroup {
  id: string;
  display_name: string;
  default_booking_calendar_id: string;
  busy_calendar_ids: string[];
}

interface Requirement {
  sequence_order: number;
  logic_operator: string | null;
  calendar_group_id: string | null;
  entity_type: string;
  entity_id: string;
  display_name: string;
}

interface AvailabilityDayResponse {
  date: string;
  timezone: string;
  busyPeriods: BusyPeriod[];
  calendarGroups: CalendarGroup[];
  requirements: Requirement[];
  requirementsExpression?: string | null;
  checkedCalendars?: number;
}

/**
 * Custom hook to fetch all busy periods for a given date
 * Uses TanStack Query for caching, retry logic, and error handling
 * This is optimized to make ONE API call per day instead of one per time slot
 */
export function useAvailabilityDay(
  request: AvailabilityDayRequest | null,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery<AvailabilityDayResponse, Error>({
    queryKey: ["availability-day", request?.serviceCardId, request?.date],
    queryFn: async () => {
      if (!request) {
        throw new Error("Availability day request is required");
      }

      const response = await fetch("/api/availability/day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          (errorData as { error?: string }).error || `HTTP error! status: ${response.status}`
        );
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

      return response.json();
    },
    enabled:
      options?.enabled !== false &&
      !!request &&
      !!request.serviceCardId &&
      !!request.date &&
      /^\d{4}-\d{2}-\d{2}$/.test(request.date),
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: (failureCount, error) => {
      if (options?.enabled === false) return false;

      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && "status" in error) {
        const status = (error as Error & { status?: number }).status;
        if (status !== undefined && status >= 400 && status < 500) {
          return false;
        }
      }

      // Retry up to 2 times for network/server errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s
      return Math.min(1000 * 2 ** attemptIndex, 5000);
    },
  });
}
