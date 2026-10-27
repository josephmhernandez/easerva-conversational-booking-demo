// /app/api/cronofy/connect/route.ts
/**
 * Returns the Cronofy OAuth authorization URL.
 * The client calls this instead of using the CalendarSync widget's
 * built-in authorization, giving us full control over the redirect_uri.
 *
 * Query params:
 *   redirect_path — optional path to redirect after callback (e.g., /business/onboarding/calendar-management)
 *   provider      — optional provider pre-selection (google, outlook, apple, exchange)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const redirectPath = req.nextUrl.searchParams.get("redirect_path") ?? "";
    const provider = req.nextUrl.searchParams.get("provider");

    const host = req.headers.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const origin = `${protocol}://${host}`;
    const callbackPath = process.env.CRONOFY_REDIRECT_URI!; // e.g., /api/cronofy/callback
    const redirectUri = `${origin}${callbackPath}`;

    // Pack userId + redirectPath into state
    const statePayload = JSON.stringify({
      userId: user.id,
      redirectPath,
    });
    const state = Buffer.from(statePayload).toString("base64url");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.CRONOFY_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "free_busy_write",
      state,
      avoid_linking: "true",
    });

    if (provider) {
      params.set("provider_name", provider);
    }

    const dataCenterUrls: Record<string, string> = {
      us: "https://app.cronofy.com",
      de: "https://app-de.cronofy.com",
      au: "https://app-au.cronofy.com",
      ca: "https://app-ca.cronofy.com",
      sg: "https://app-sg.cronofy.com",
      gb: "https://app-gb.cronofy.com",
    };
    const baseUrl = dataCenterUrls[process.env.CRONOFY_DATA_CENTER ?? "us"] ?? dataCenterUrls.us;

    const url = `${baseUrl}/oauth/authorize?${params.toString()}`;

    console.log("🔗 Cronofy authorize URL:", url);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[cronofy/connect] Error:", err);
    return NextResponse.json(
      { error: "internal_error", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
