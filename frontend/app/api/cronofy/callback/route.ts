// /app/api/cronofy/callback/route.ts

/**
 * OAuth callback from Cronofy after the user authorizes.
 *
 * KEY DESIGN:
 * - redirect_uri sent to Cronofy is ALWAYS the bare callback URL (no query params)
 * - userId and redirectPath are packed into the `state` param as base64url JSON
 * - This prevents the redirect_uri mismatch that causes invalid_grant errors
 */
import { createClient } from "@/app/utils/supabase/server";
import { getExternalRequestUrl } from "@/app/utils/server/request";
// @ts-expect-error: cronofy SDK has no types
import cronofy from "cronofy";
import { NextRequest, NextResponse } from "next/server";

const STEP = "[cronofy_callback]";

function logErr(step: string, err: unknown): void {
  console.error(`${STEP} ${step} failed:`, err instanceof Error ? err.message : String(err), err);
}

const client = new cronofy({
  client_id: process.env.CRONOFY_CLIENT_ID!,
  client_secret: process.env.CRONOFY_CLIENT_SECRET!,
  data_center: process.env.CRONOFY_DATA_CENTER as string,
});

// ─── Helpers ───────────────────────────────────────────────────────

type ParsedState = {
  userId: string | null;
  redirectPath: string | null;
};

function parseState(raw: string | null): ParsedState {
  if (!raw) return { userId: null, redirectPath: null };

  // Try base64url JSON first (new format)
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString());
    return {
      userId: decoded.userId || null,
      redirectPath: decoded.redirectPath || null,
    };
  } catch {
    // Fallback: treat as plain userId string (backward compat)
    return { userId: raw, redirectPath: null };
  }
}

// ─── Main Handler ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const defaultRedirect = "/business/onboarding/calendar-management";

  try {
    const callbackUrl = getExternalRequestUrl(req);
    const { searchParams } = callbackUrl;

    // 1. Check for OAuth errors
    const oauthError = searchParams.get("error");
    if (oauthError) {
      return NextResponse.redirect(
        new URL(
          `${defaultRedirect}?error=oauth_error&message=${encodeURIComponent(oauthError)}`,
          callbackUrl
        )
      );
    }

    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(
        new URL(
          `${defaultRedirect}?error=missing_code&message=${encodeURIComponent("No authorization code received.")}`,
          callbackUrl
        )
      );
    }

    // 2. Parse state
    const state = parseState(searchParams.get("state"));
    const finalRedirect = state.redirectPath || defaultRedirect;

    // 3. Exchange code for token — redirect_uri MUST be the bare callback URL
    const bareRedirectUri = `${callbackUrl.origin}${callbackUrl.pathname}`;
    let token: {
      access_token: string;
      refresh_token: string;
      expires_in?: number;
      scope?: string;
      account_id: string;
      sub?: string;
      linking_profile?: {
        profile_id: string;
        provider_name: string;
        provider_service: string;
      };
    };

    try {
      token = await client.requestAccessToken({ code, redirect_uri: bareRedirectUri });
      // In callback/route.ts, right after requestAccessToken:
      console.log(
        "🔑 FULL token response:",
        JSON.stringify(
          {
            account_id: token.account_id,
            sub: token.sub,
            access_token: token.access_token?.slice(0, 8) + "...",
            refresh_token: token.refresh_token?.slice(0, 8) + "...",
            linking_profile: token.linking_profile,
            expires_in: token.expires_in,
            scope: token.scope,
          },
          null,
          2
        )
      );
    } catch (err) {
      logErr("exchangeCodeForToken", err);
      return NextResponse.redirect(
        new URL(
          `${finalRedirect}?error=token_exchange&message=${encodeURIComponent("Failed to connect calendar. Please try again.")}`,
          callbackUrl
        )
      );
    }

    // 4. Fetch profile info
    let profileInfo = {
      provider_name: null as string | null,
      provider_service: null as string | null,
      profile_id: null as string | null,
    };
    try {
      const authed = new cronofy({
        access_token: token.access_token,
        data_center: process.env.CRONOFY_DATA_CENTER as string,
      });
      const profiles = await authed.profileInformation();
      const primary = profiles?.[0];
      profileInfo = {
        provider_name: primary?.provider_name ?? null,
        provider_service: primary?.provider_service ?? null,
        profile_id: primary?.profile_id ?? null,
      };
    } catch (err) {
      logErr("fetchProfile", err);
      // Non-fatal — continue without profile info
    }

    // 5. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL(
          `${finalRedirect}?error=not_authenticated&message=${encodeURIComponent("Please sign in and try again.")}`,
          callbackUrl
        )
      );
    }

    // 6. Security: verify state userId matches session
    if (state.userId && state.userId !== user.id) {
      console.error(`${STEP} SECURITY: state userId ${state.userId} !== session ${user.id}`);
      return NextResponse.redirect(
        new URL(
          `${finalRedirect}?error=user_mismatch&message=${encodeURIComponent("Security validation failed. Please try again.")}`,
          callbackUrl
        )
      );
    }

    // 7. Check for duplicate account_id across users
    const { data: existingOtherUsers } = await supabase
      .from("business_calendar_integrations")
      .select("user_id")
      .eq("account_id", token.account_id)
      .eq("provider", "cronofy")
      .neq("user_id", user.id);

    if (existingOtherUsers && existingOtherUsers.length > 0) {
      console.warn(
        `${STEP} account_id ${token.account_id} shared with ${existingOtherUsers.length} other user(s). Allowing — tokens are separate.`
      );
      // We allow this now — each user gets their own tokens
    }

    // 8. Save integration
    const business_id = "00000000-0000-0000-0000-000000000000";
    const expires_at = new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString();

    const { error: upsertError } = await supabase.from("business_calendar_integrations").upsert(
      {
        business_id,
        user_id: user.id,
        account_id: token.account_id,
        profile_id: token.linking_profile?.profile_id ?? profileInfo.profile_id,
        provider_name: token.linking_profile?.provider_name ?? profileInfo.provider_name,
        provider_service: token.linking_profile?.provider_service ?? profileInfo.provider_service,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        scope: token.scope,
        expires_at,
        provider: "cronofy",
      },
      { onConflict: "user_id,provider,account_id,profile_id" }
    );

    if (upsertError) {
      logErr("saveIntegration", upsertError);
      return NextResponse.redirect(
        new URL(
          `${finalRedirect}?error=save_failed&message=${encodeURIComponent("Connected successfully but failed to save. Please try again.")}`,
          callbackUrl
        )
      );
    }

    // 9. Redirect to final destination
    return NextResponse.redirect(new URL(finalRedirect, callbackUrl));
  } catch (err) {
    logErr("handler", err);
    return NextResponse.redirect(
      new URL(
        `${defaultRedirect}?error=unexpected&message=${encodeURIComponent("An unexpected error occurred.")}`,
        req.url
      )
    );
  }
}
