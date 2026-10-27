import { Address } from "cluster";

export interface ProfileUpdatePayload {
  id: string;
  display_name: string;
  avatar_url: string;
  phone_number: string;
  updated_at: string;
}

export interface ProfileResponse {
  email: string;
  firstName: string;
  lastName: string;
  canUseCurrentLocation: boolean;
  locations: Address[];
  primaryLocationId: string;
  isProfileComplete: boolean;
  phoneNumber: string;
}

// Profile form data types
export interface ProfileFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  canUseCurrentLocation: boolean;
  locations: import("./businessTypes").Address[];
  primaryLocation: string; // UUID or "current_location"
}
