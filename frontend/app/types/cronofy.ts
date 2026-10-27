// /app/types/cronofy.ts

export type CronofyCalendar = {
  provider_name: string;
  profile_id: string;
  profile_name: string;
  calendar_id: string;
  calendar_name: string;
  calendar_readonly: boolean;
  calendar_deleted: boolean;
  calendar_primary: boolean;
  calendar_integrated_conferencing_available: boolean;
  calendar_attachments_available: boolean;
  permission_level: string;
  // Added by our API
  integration_id: string;
  account_id: string;
};

export type CronofyIntegration = {
  id: string;
  account_id: string;
  provider_name: string | null;
  profile_id: string | null;
  calendar_count: number;
};

export type CalendarProvider = "google" | "apple" | "outlook" | "exchange" | "office365";

export const PROVIDER_META: Record<string, { label: string; color: string; icon: string }> = {
  google: { label: "Google", color: "#4285F4", icon: "G" },
  apple: { label: "Apple", color: "#333333", icon: "" },
  outlook: { label: "Outlook", color: "#0078D4", icon: "O" },
  live_connect: { label: "Outlook.com", color: "#0078D4", icon: "O" },
  exchange: { label: "Exchange", color: "#0F6CBD", icon: "E" },
  office365: { label: "Office 365", color: "#D83B01", icon: "365" },
  default: { label: "Calendar", color: "#6B7280", icon: "C" },
};

export function getProviderMeta(providerName: string | null) {
  if (!providerName) return PROVIDER_META.default;
  return PROVIDER_META[providerName.toLowerCase()] ?? PROVIDER_META.default;
}
