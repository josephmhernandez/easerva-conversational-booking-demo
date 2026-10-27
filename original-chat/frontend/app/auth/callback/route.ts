import { PROFILES_TABLE } from "@/app/constants/apiConstants";
import { getExternalRequestUrl } from "@/app/utils/server/request";
import { createClient } from "@/app/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: Request) {
  console.log("CALLBACK: Request:", request);
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = getExternalRequestUrl(request as NextRequest).origin;
  const next = requestUrl.searchParams.get("next") || "/";
  console.log("Next:", next);

  if (code) {
    const supabase = await createClient();
    // exchangeCodeForSession will update supabase.auth.session and set cookies
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth error:", error);
      return NextResponse.redirect(`${origin}/login?error=${error.message}`);
    }

    if (data.user) {
      // Check if the user's profile is complete.
      const { data: profile, error: profileError } = await supabase
        .from(PROFILES_TABLE)
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
      }

      if (!profile || !profile.is_profile_complete) {
        console.log("Profile is not complete, redirecting to profile page");
        return NextResponse.redirect(`${origin}/profile?incomplete=true&next=${next}`);
      } else {
        console.log("Profile is complete, redirecting to next: ", next);
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  console.log("No code or user, redirecting to:", `${origin}${next}`);
  return NextResponse.redirect(`${origin}${next}`);
}
