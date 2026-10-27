import { createClient } from "@/app/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { PROFILES_TABLE } from "../../../constants/apiConstants";
import { ProfileUpdatePayload } from "../../../types/apiTypes";

export async function POST(request: NextRequest) {
  try {
    const { fullName, phoneNumber } = await request.json();

    // Validate required fields
    if (!fullName || typeof fullName !== "string") {
      return NextResponse.json(
        { error: "Full name is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate phone number format if provided
    if (phoneNumber && typeof phoneNumber !== "string") {
      return NextResponse.json({ error: "Phone number must be a string" }, { status: 400 });
    }

    // Create Supabase client with server-side auth
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized - please log in" }, { status: 401 });
    }

    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking profile:", checkError);
      return NextResponse.json({ error: "Database error while checking profile" }, { status: 500 });
    }

    const profileData = {
      id: user.id,
      display_name: fullName ? fullName.trim() : null,
      phone_number: phoneNumber ? phoneNumber.trim() : null,
      updated_at: new Date().toISOString(),
    } as ProfileUpdatePayload;

    let result;
    if (existingProfile) {
      // Update existing profile
      result = await supabase
        .from(PROFILES_TABLE)
        .update({
          display_name: profileData.display_name,
          phone_number: profileData.phone_number,
          updated_at: profileData.updated_at,
        })
        .eq("id", user.id)
        .select()
        .single();
    } else {
      // Insert new profile
      result = await supabase
        .from(PROFILES_TABLE)
        .insert({
          ...profileData,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("Error updating profile:", result.error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: result.data,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
