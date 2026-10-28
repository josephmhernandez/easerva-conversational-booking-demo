// ===== FRONTEND: Next.js API Route for WebSocket Token =====
// frontend/app/api/auth/websocket-token/route.ts
import { createClient } from "@/app/utils/supabase/server";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("[WebSocket Token]1234 Generating WebSocket token");
    // 1. Attempt to get authenticated Supabase user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. If no user, create or reuse a persistent guest ID via cookie
    const cookieStore = await cookies();
    const { guestId: providedGuestId } = await req.json().catch(() => ({ guestId: undefined }));
    let resolvedUserId = user?.id as string | undefined;
    let newGuestIdToSet: string | null = null;
    if (!resolvedUserId) {
      // The durable HttpOnly cookie is authoritative. The body value is accepted
      // only for one-time migration from older clients.
      let guestId = cookieStore.get("guest_id")?.value || providedGuestId;
      if (!guestId) {
        guestId = randomUUID();
        newGuestIdToSet = guestId;
      }
      resolvedUserId = guestId;
    }

    // 3. Generate short-lived WebSocket token (5 minutes max)
    const wsToken = jwt.sign(
      {
        userId: resolvedUserId,
        email: user?.email,
        type: "websocket",
        iat: Math.floor(Date.now() / 1000),
        // Short expiry for security
        exp: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
      },
      process.env.JWT_WEBSOCKET_SECRET!
    );

    // 4. Return token (no sensitive data) and set guest cookie if needed
    const res = NextResponse.json({
      token: wsToken,
      expiresIn: 1200, // 20 minutes in seconds
    });

    if (newGuestIdToSet) {
      res.cookies.set("guest_id", newGuestIdToSet, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return res;
  } catch (error) {
    console.error("WebSocket token generation error:", error);
    return NextResponse.json({ error: "Failed to generate WebSocket token" }, { status: 500 });
  }
}
