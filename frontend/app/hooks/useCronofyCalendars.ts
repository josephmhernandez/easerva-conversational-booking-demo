// /app/hooks/useCronofyCalendars.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { CronofyCalendar, CronofyIntegration } from "../types/cronofy";

type UseCronofyCalendarsReturn = {
  calendars: CronofyCalendar[];
  integrations: CronofyIntegration[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  connect: (provider?: string) => Promise<void>;
  disconnect: (integrationId: string) => Promise<boolean>;
  connecting: boolean;
  disconnecting: string | null; // integration_id being disconnected
};

export function useCronofyCalendars(redirectPath?: string): UseCronofyCalendarsReturn {
  const [calendars, setCalendars] = useState<CronofyCalendar[]>([]);
  const [integrations, setIntegrations] = useState<CronofyIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/cronofy/calendars");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in to view calendars.");
          return;
        }
        throw new Error(`Failed to load calendars: ${res.status}`);
      }
      const data = await res.json();
      setCalendars(data.calendars ?? []);
      setIntegrations(data.integrations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendars");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(
    async (provider?: string) => {
      try {
        setConnecting(true);
        setError(null);
        const params = new URLSearchParams();
        if (redirectPath) params.set("redirect_path", redirectPath);
        if (provider) params.set("provider", provider);

        const res = await fetch(`/api/cronofy/connect?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to get connect URL");

        const { url } = await res.json();
        window.location.href = url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect");
        setConnecting(false);
      }
    },
    [redirectPath]
  );

  const disconnect = useCallback(
    async (integrationId: string): Promise<boolean> => {
      try {
        setDisconnecting(integrationId);
        setError(null);
        const res = await fetch("/api/cronofy/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration_id: integrationId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to disconnect");
        }

        // Refresh the list
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to disconnect");
        return false;
      } finally {
        setDisconnecting(null);
      }
    },
    [refresh]
  );

  return {
    calendars,
    integrations,
    loading,
    error,
    refresh,
    connect,
    disconnect,
    connecting,
    disconnecting,
  };
}
