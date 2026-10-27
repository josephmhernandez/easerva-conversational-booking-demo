// /app/hooks/useAvailabilityCheck.ts
// Custom hook for checking service availability using TanStack Query

import { useQuery } from "@tanstack/react-query";

interface AvailabilityCheckRequest {
  serviceCardId: string;
  startTime: string; // ISO8601
  endTime: string; // ISO8601
  timezone?: string;
}

interface AvailabilityCheckResponse {
  available: boolean;
  conflicts: Array<{
    calendarGroupId: string;
    entity: string;
    entityType: string;
    conflictingEvent: {
      title: string;
      start: string;
      end: string;
    };
  }>;
  serviceCardId: string;
  timeSlot: {
    start: string;
    end: string;
  };
  timezone?: string;
  requirementsExpression?: string;
  checkedCalendars?: number;
  satisfiedGroups?: string[];
}

/**
 * Custom hook to check availability for a service card at a specific time slot
 * Uses TanStack Query for caching, retry logic, and error handling
 */
export function useAvailabilityCheck(
  request: AvailabilityCheckRequest | null,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery<AvailabilityCheckResponse, Error>({
    queryKey: ["availability", request?.serviceCardId, request?.startTime, request?.endTime],
    queryFn: async () => {
      if (!request) {
        throw new Error("Availability check request is required");
      }

      const response = await fetch("/api/availability/check", {
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
      !!request.startTime &&
      !!request.endTime,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    retry: (failureCount, error) => {
      // Don't retry if disabled
      if (options?.enabled === false) return false;

      // Don't retry on 4xx errors (client errors like missing calendar connections)
      if (error instanceof Error && "status" in error) {
        const status = (error as Error & { status?: number }).status;
        if (status !== undefined && status >= 400 && status < 500) {
          // For 404/400 errors (like missing calendar connections), don't retry
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
