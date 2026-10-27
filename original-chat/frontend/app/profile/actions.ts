"use server";

import { createClient } from "@/app/utils/supabase/server";
import { PROFILES_TABLE } from "../constants/apiConstants";
import { Address } from "../types/businessTypes";

export async function updateProfile(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required fields
    const validation = validateFormData(formData);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // Extract form data
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const canUseCurrentLocation = formData.get("canUseCurrentLocation") === "true";
    const locationsJson = formData.get("locations") as string;
    const primaryLocationId = formData.get("primaryLocation") as string;

    // Parse locations
    let locations: Address[] = [];
    try {
      if (locationsJson) {
        locations = JSON.parse(locationsJson);
      }
    } catch (error) {
      console.error("Error parsing locations data:", error);
      return { success: false, error: "Invalid locations data format" };
    }

    // Create Supabase client with server-side auth
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized - please log in" };
    }

    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from(PROFILES_TABLE)
      .select("id")
      .eq("id", user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking profile:", checkError);
      return { success: false, error: "Database error while checking profile" };
    }

    // Prepare profile data
    const profileData: Record<string, unknown> = {
      id: user.id,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      phone_number: phoneNumber ? phoneNumber.trim() : null,
      can_use_current_location: canUseCurrentLocation,
      locations: locations.length > 0 ? JSON.stringify(locations) : null,
      primary_location_id: primaryLocationId || null,
      updated_at: new Date().toISOString(),
      is_profile_complete: true,
    };

    let result;
    if (existingProfile) {
      // Update existing profile
      result = await supabase
        .from(PROFILES_TABLE)
        .update(profileData)
        .eq("id", user.id)
        .select()
        .single();
    } else {
      // Insert new profile
      result = await supabase.from(PROFILES_TABLE).insert(profileData).select().single();
    }

    if (result.error) {
      console.error("Error updating profile:", result.error);
      return { success: false, error: "Failed to update profile" };
    }

    return { success: true };
  } catch (error) {
    console.error("Profile update error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

function validateFormData(formData: FormData): { success: boolean; error?: string } {
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const phoneNumber = formData.get("phoneNumber");
  const canUseCurrentLocation = formData.get("canUseCurrentLocation");
  const locationsJson = formData.get("locations");
  const primaryLocation = formData.get("primaryLocation");

  if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
    return { success: false, error: "First name is required" };
  }

  if (!lastName || typeof lastName !== "string" || !lastName.trim()) {
    return { success: false, error: "Last name is required" };
  }

  if (phoneNumber && typeof phoneNumber !== "string") {
    return { success: false, error: "Phone number must be a string" };
  }

  if (canUseCurrentLocation !== "true" && canUseCurrentLocation !== "false") {
    return { success: false, error: "Invalid can use current location value" };
  }

  if (!primaryLocation || typeof primaryLocation !== "string") {
    return { success: false, error: "Primary location is required" };
  }

  // Validate locations if provided
  if (locationsJson && typeof locationsJson === "string") {
    try {
      const locations = JSON.parse(locationsJson);
      if (!Array.isArray(locations)) {
        return { success: false, error: "Locations must be an array" };
      }
      if (locations.length > 3) {
        return { success: false, error: "Maximum 3 locations allowed" };
      }
    } catch {
      return { success: false, error: "Invalid locations format" };
    }
  }

  return { success: true };
}
