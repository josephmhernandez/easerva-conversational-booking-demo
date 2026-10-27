// NEED this for Implicit auth flow that supabase sometimes uses.
// This page is used to confirm the authentication link that is sent to the user's email.
"use client";

import { createClient } from "@/app/utils/supabase/client";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const supabase = createClient();

        // Get the next parameter from URL
        const next = searchParams.get("next") || "/";

        console.log("Auth confirmation page - checking for hash params");

        // Check for hash params (implicit flow from generateLink)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        console.log("Hash params found:", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
        });

        if (accessToken && refreshToken) {
          console.log("Setting session from hash tokens");

          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Error setting session:", sessionError);
            setError(sessionError.message);
            setLoading(false);
            return;
          }

          console.log("✅ Session set successfully for:", data.user?.email);
          console.log("Redirecting to:", next);

          // Clear the hash from URL before redirecting
          window.history.replaceState(null, "", window.location.pathname + window.location.search);

          // Redirect to next page
          router.push(next);
          return;
        }

        // Check for PKCE code in query params (fallback)
        const code = searchParams.get("code");
        if (code) {
          console.log("Found PKCE code, exchanging");
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);

          if (codeError) {
            console.error("Error exchanging code:", codeError);
            setError(codeError.message);
            setLoading(false);
            return;
          }

          console.log("✅ Code exchanged successfully");
          router.push(next);
          return;
        }

        // No valid auth parameters
        console.log("❌ No valid auth parameters found");
        setError("Invalid authentication link");
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    handleAuth();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="md" />
          <p className="mb-4 text-lg font-medium text-gray-900">
            Confirming your authentication...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button variant="primary" size="lg" onClick={() => router.push("/")}>
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
