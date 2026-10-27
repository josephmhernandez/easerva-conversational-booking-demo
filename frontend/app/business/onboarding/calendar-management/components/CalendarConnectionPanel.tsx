// /app/components/cronofy/CalendarConnectionPanel.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { useCronofyCalendars } from "../../../../hooks/useCronofyCalendars";
import type { CronofyCalendar } from "../../../../types/cronofy";
import { getProviderMeta } from "../../../../types/cronofy";
import ProviderIcon from "./ProviderIcon";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Unlink,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";

// Provider ids used only for displaying icons (Cronofy flow lets user choose)
const PROVIDER_IDS = ["google", "outlook", "apple", "exchange"] as const;

type CalendarConnectionPanelProps = {
  /** Current page path — used for redirect after OAuth */
  redirectPath?: string;
  /** Callback when calendars change — passes the updated calendar list */
  onCalendarsChange?: (calendars: CronofyCalendar[]) => void;
};

export default function CalendarConnectionPanel({
  redirectPath,
  onCalendarsChange,
}: CalendarConnectionPanelProps) {
  const {
    calendars,
    integrations,
    loading,
    error,
    refresh,
    connect,
    disconnect,
    connecting,
    disconnecting,
  } = useCronofyCalendars(redirectPath);

  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);

  // Notify parent when calendars change
  const prevCalendarRef = useMemo(() => ({ current: calendars }), [calendars]);
  if (onCalendarsChange && prevCalendarRef.current !== calendars) {
    onCalendarsChange(calendars);
  }

  // Group calendars by profile (provider + profile_name)
  const calendarsByProfile = useMemo(() => {
    const groups: Record<
      string,
      {
        profileId: string;
        profileName: string;
        providerName: string;
        integrationId: string;
        calendars: CronofyCalendar[];
      }
    > = {};

    for (const cal of calendars) {
      const key = cal.profile_id;
      if (!groups[key]) {
        groups[key] = {
          profileId: cal.profile_id,
          profileName: cal.profile_name,
          providerName: cal.provider_name,
          integrationId: cal.integration_id,
          calendars: [],
        };
      }
      groups[key].calendars.push(cal);
    }

    // Sort: primary calendars first within each group
    Object.values(groups).forEach((g) => {
      g.calendars.sort((a, b) => {
        if (a.calendar_primary && !b.calendar_primary) return -1;
        if (!a.calendar_primary && b.calendar_primary) return 1;
        return a.calendar_name.localeCompare(b.calendar_name);
      });
    });

    return groups;
  }, [calendars]);

  const hasIntegrations = integrations.length > 0;
  const profileCount = Object.keys(calendarsByProfile).length;

  const handleDisconnect = useCallback(
    async (integrationId: string) => {
      const success = await disconnect(integrationId);
      if (success) {
        setConfirmDisconnect(null);
      }
    },
    [disconnect]
  );

  // ─── Loading State ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading calendar connections…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <Shield className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              onClick={() => refresh()}
              className="mt-1 text-red-600 underline underline-offset-2 hover:text-red-800 text-xs"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ─── Connected Accounts ──────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Connected Accounts</h3>
              <p className="text-xs text-gray-500">
                {hasIntegrations
                  ? `${profileCount} provider${profileCount !== 1 ? "s" : ""} · ${calendars.length} calendar${calendars.length !== 1 ? "s" : ""}`
                  : "No calendar accounts connected yet"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasIntegrations && (
              <button
                onClick={() => refresh()}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title="Refresh calendars"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {hasIntegrations ? (
          <div className="divide-y divide-gray-100">
            {Object.values(calendarsByProfile).map((profile) => (
              <ProfileSection
                key={profile.profileId}
                profile={profile}
                isDisconnecting={disconnecting === profile.integrationId}
                isConfirmingDisconnect={confirmDisconnect === profile.integrationId}
                onConfirmDisconnect={() => setConfirmDisconnect(profile.integrationId)}
                onCancelDisconnect={() => setConfirmDisconnect(null)}
                onDisconnect={() => handleDisconnect(profile.integrationId)}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">Connect your first calendar</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Link your Google, Outlook, Apple, or Exchange calendar to manage availability and
              bookings.
            </p>
          </div>
        )}

        {/* Connect a Calendar — single button triggers Cronofy flow (user picks provider there) */}
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
              <span>Connect:</span>
              {PROVIDER_IDS.map((id) => (
                <span key={id} className="inline-flex">
                  <ProviderIcon provider={id} size="sm" />
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => connect()}
              disabled={connecting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Connect a Calendar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Section (collapsible group of calendars) ────────────────
type ProfileSectionProps = {
  profile: {
    profileId: string;
    profileName: string;
    providerName: string;
    integrationId: string;
    calendars: CronofyCalendar[];
  };
  isDisconnecting: boolean;
  isConfirmingDisconnect: boolean;
  onConfirmDisconnect: () => void;
  onCancelDisconnect: () => void;
  onDisconnect: () => void;
};

function ProfileSection({
  profile,
  isDisconnecting,
  isConfirmingDisconnect,
  onConfirmDisconnect,
  onCancelDisconnect,
  onDisconnect,
}: ProfileSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const meta = getProviderMeta(profile.providerName);

  return (
    <div className={`${isDisconnecting ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Profile Header */}
      <div className="px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <ProviderIcon provider={profile.providerName} size="md" />
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{meta.label}</p>
            <p className="text-xs text-gray-500 truncate">{profile.profileName}</p>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          )}
        </button>

        <div className="flex items-center gap-1 ml-3">
          <span className="text-xs text-gray-400 mr-1">
            {profile.calendars.length} cal{profile.calendars.length !== 1 ? "s" : ""}
          </span>
          {isConfirmingDisconnect ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onDisconnect}
                disabled={isDisconnecting}
                className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
              >
                {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
              </button>
              <button
                onClick={onCancelDisconnect}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onConfirmDisconnect}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Disconnect this account"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Calendar List */}
      {expanded && (
        <div className="px-5 pb-3">
          <div className="ml-11 space-y-0.5">
            {profile.calendars.map((cal) => (
              <CalendarRow key={cal.calendar_id} calendar={cal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single Calendar Row ────────────────────────────────────────────
function CalendarRow({ calendar }: { calendar: CronofyCalendar }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{
          backgroundColor: calendar.calendar_primary
            ? getProviderMeta(calendar.provider_name).color
            : "#9CA3AF",
        }}
      />

      {/* Name */}
      <span className="text-sm text-gray-700 truncate flex-1">{calendar.calendar_name}</span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {calendar.calendar_primary && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-teal-50 text-teal-700 rounded">
            Primary
          </span>
        )}
        {calendar.calendar_readonly && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-amber-50 text-amber-700 rounded flex items-center gap-0.5">
            <EyeOff className="w-2.5 h-2.5" />
            Read-only
          </span>
        )}
      </div>
    </div>
  );
}
