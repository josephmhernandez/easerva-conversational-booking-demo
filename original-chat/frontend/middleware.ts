import { updateSession } from "@/app/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

/**
 * QA Basic Auth gate.
 *
 * When ENVIRONMENT=qa, every request requires HTTP Basic Auth
 * (same credentials as the CloudFront Function on the static site).
 * Exempted: /api/health (Railway health checks must pass without auth).
 */
function checkBasicAuth(request: NextRequest): NextResponse | null {
  if (process.env.ENVIRONMENT !== "qa") return null;

  // Allow Railway health check through without auth
  if (request.nextUrl.pathname === "/api/health") return null;

  const user = process.env.QA_BASIC_AUTH_USER;
  const pass = process.env.QA_BASIC_AUTH_PASS;

  if (!user || !pass) {
    // Env vars not set — skip auth (handles local dev where ENVIRONMENT isn't 'qa')
    return null;
  }

  const expected = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  const incoming = request.headers.get("authorization");

  if (!incoming || incoming !== expected) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Easerva QA"',
        "Cache-Control": "no-store",
      },
    });
  }

  return null; // Auth passed — continue to next handler
}

export async function middleware(request: NextRequest) {
  // QA Basic Auth check runs before everything else
  const authResponse = checkBasicAuth(request);
  if (authResponse) return authResponse;

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all paths except for: Next assets, images, and favicon
    // (includes /api/* so health check exclusion above is reached)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
