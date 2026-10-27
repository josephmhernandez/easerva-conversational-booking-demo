// Used for PKCE flow for recovery email links that are send with built in supabase auth that uses PKCE.
"use server";

import { getOrigin } from "@/app/utils/environment";
import { createClient } from "@/app/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  console.log("auth/confirm route Request:", request);
  const { searchParams } = new URL(request.url);
  const origin = getOrigin();
  const code = searchParams.get("code");
  const next = "/reset-password";

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successfully exchanged code, redirect to reset password page
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Error exchanging code:", error);
    return NextResponse.redirect(`${origin}/error?message=${encodeURIComponent(error.message)}`);
  } else {
    console.log("No code provided, redirecting to error page");
  }

  // No code provided
  return NextResponse.redirect(`${origin}/error?message=No+code+provided`);
}
