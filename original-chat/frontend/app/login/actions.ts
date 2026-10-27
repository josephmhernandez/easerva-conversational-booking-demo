"use server";

import { createClient } from "@/app/utils/supabase/server";
import { PROFILES_TABLE } from "../constants/apiConstants";

export async function getIssuerForEmail(email: string): Promise<string> {
  try {
    // check if email is in system and has a provider.
    const supabaseAdmin = await createClient(true);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from(PROFILES_TABLE)
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (profileError || !profile) {
      return "";
    }

    // look at the identities array and return the provider.
    const user_id = profile.id;
    const { data: identities, error: identitiesError } = await supabaseAdmin.rpc(
      "get_user_identities",
      {
        user_id_param: user_id,
      }
    );

    if (identitiesError) {
      return "";
    }

    const issuer = identities?.[0]?.identity_data?.iss;

    if (!issuer) {
      return "";
    }
    if (issuer.includes("google")) {
      return "Google";
    }
    if (issuer.includes("apple")) {
      return "Apple";
    }

    return "";
  } catch (error) {
    console.error("Error getting issuer for email:", error);
    return "";
  }
}

// Should only be used after sign in with email.
// Using non-admin client to check if profile is complete.
export async function isProfileComplete(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not found: " + userError?.message);
    }

    const userId = user.id;

    const { data: profile, error: profileError } = await supabase
      .from(PROFILES_TABLE)
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error("Profile not found: " + profileError?.message);
    }

    return profile.is_profile_complete;
  } catch (error) {
    console.error("Error checking if profile is complete:", error);
    return false;
  }
}
