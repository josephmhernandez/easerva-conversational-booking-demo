// /components/ConnectedCalendars.tsx
"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

type Cal = {
  calendar_id: string;
  profile_name: string;
  calendar_name: string;
  calendar_deleted?: boolean;
  provider_name: string;
};

export default function ConnectedCalendars() {
  const [cals, setCals] = useState<Cal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/cronofy/calendars");
      if (r.ok) {
        const { calendars } = await r.json();
        setCals(calendars || []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Loading calendars…</div>;
  if (!cals.length) return <div className="text-sm">No calendars connected yet.</div>;

  return (
    <div className="space-y-2">
      {cals.map((c) => (
        <div
          key={c.calendar_id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div>
            <div className="text-xs text-muted-foreground">{c.provider_name}</div>
            <div className="font-medium">{c.calendar_name || "Unnamed calendar"}</div>

            <div className="text-xs text-muted-foreground">{c.profile_name}</div>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Connected" />
        </div>
      ))}
    </div>
  );
}
