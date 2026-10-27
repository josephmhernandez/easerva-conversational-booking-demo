export interface ServiceCardsDB {
  id: string;
  business_id: string;
  card_type: string;
  display_name: string;
  tagline: string;
  description: string;
  media_type: string;
  media_url: string;
  media_storage_path: string;
  media_settings: Record<string, unknown>;
  profile_image_url: string;
  profile_storage_path: string;
}

export interface BusinessesDB {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  logo_url: string;
  logo_storage_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeesDB {
  id: string;
  business_id: string;
  location_id: string;
  full_name: string;
  email: string;
  phone: string;
  title: string;
  bio: string;
  profile_image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  calendar_connected: boolean;
  calendar_connection_required: boolean;
  cronofy_profile_id: string;
  cronofy_calendar_id: string;
  user_id: string;
}

export interface BusinessCalendarIntegrationsDB {
  id: string;
  business_id: string;
  user_id: string;
  provider: string;
  account_id: string;
  profile_id: string;
  provider_name: string;
  provider_service: string;
  access_token: string;
  refresh_token: string;
  scope: string;
  expires_at: string;
  created_at: string;
  default_calendar_id: string;
}

export interface CalendarGroupsDB {
  id: string;
  business_id: string;
  entity_type: string;
  entity_id: string;
  default_booking_calendar_id: string;
  busy_calendar_ids: string[];
  display_name: string;
  calendar_provider: string;
  is_configured: boolean;
  pending_configuration: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationsDB {
  id: string;
  business_id: string;
  name: string;
  location_type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  mobile_zip_codes: string[] | null;
  mobile_type: string | null;
  mobile_radius_miles: number | null;
  timezone: string | null; // IANA timezone identifier (e.g., 'America/Chicago')
}

export type KycStatus = "pending" | "submitted" | "approved" | "rejected" | "changes_requested";

export interface BusinessesPhase2DB extends BusinessesDB {
  // Phase 2 fields added in T-004 migration
  slug: string | null;
  category: string | null;
  category_slug: string | null;
  phone: string | null;
  website: string | null;
  price_range: "$" | "$$" | "$$$" | "$$$$" | null;
  static_published: boolean;
  static_last_built_at: string | null;
  kyc_approved: boolean;
  kyc_approved_at: string | null;
  kyc_approved_by: string | null;
  kyc_notes: string | null;
}
