import { createClient } from "@/app/utils/supabase/server";
import { NextResponse } from "next/server";
import { PROFILES_TABLE } from "../../constants/apiConstants";
import { ProfileResponse } from "../../types/apiTypes";

export async function GET(): Promise<NextResponse<ProfileResponse | { error: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized - please log in" }, { status: 401 });
    }

    const profile = await getFromProfilesTable(supabase, user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profileResponse = {
      email: user.email,
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      phoneNumber: profile?.phone_number ?? "",
      canUseCurrentLocation: profile?.can_use_current_location ?? false,
      locations: profile?.locations ? JSON.parse(profile.locations) : [],
      primaryLocationId: profile?.primary_location_id ?? "",
      isProfileComplete: profile?.is_profile_complete ?? false,
    } as ProfileResponse;

    return NextResponse.json(profileResponse);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFromProfilesTable = async (supabase: any, userId: string): Promise<Profile | null> => {
  const { data: profile, error: profileError } = await supabase
    .from(PROFILES_TABLE)
    .select("*")
    .eq("id", userId)
    .single();

  if (!profileError) {
    return profile;
  }

  if (profileError?.code === "PGRST116") {
    return null;
  }

  throw profileError;
};

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  can_use_current_location: boolean;
  locations: string;
  primary_location_id: string;
  is_profile_complete: boolean;
  updated_at: string;
};

/**
 * 
 * 
 * create table public.profiles (
  id uuid not null,
  email text not null,
  phone_number text null,
  is_profile_complete boolean null default false,
  primary_location_id text null,
  locations jsonb null,
  first_name text null,
  last_name text null,
  can_use_current_location boolean null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null,
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id)
) TABLESPACE pg_default;
 * 
 * 
 */
