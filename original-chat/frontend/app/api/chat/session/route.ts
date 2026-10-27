import { createClient } from "@/app/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("[Chat Session]1234 Getting chat session");
    const supabase = await createClient();

    // Check if a user's logged in; if not, use guest flow to call backend without Authorization
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();

    // Make request to backend
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend URL not configured" }, { status: 500 });
    }

    const url = `${backendUrl}/api/chat/session`;
    console.log("🔍 Making request to backend:", url);

    const response = await fetch(
      url,
      authSession
        ? {
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
            },
          }
        : undefined
    );

    if (!response.ok) {
      if (response.status === 404) {
        // No session found - this is normal for new users or after session linking
        console.log("🔍 No active session found (404)");
        return NextResponse.json({ session: null, messages: [] });
      }

      const errorText = await response.text();
      console.error("🔍 Backend response error:", errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error in chat session API route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    // Allow unauthenticated users to start a new session in backend; we'll handle ID via websocket
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();

    // Make request to backend
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend URL not configured" }, { status: 500 });
    }

    const url = `${backendUrl}/api/chat/session`;
    console.log("🔍 Making POST request to backend:", url);

    const response = await fetch(
      url,
      authSession
        ? {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
              "Content-Type": "application/json",
            },
          }
        : {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔍 Backend response error:", errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error in chat session API route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
