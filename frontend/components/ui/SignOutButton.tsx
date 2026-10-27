"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { ROUTE_LOGIN_PAGE } from "@/app/constants/routeConstants";
import { clearAllSessionStorage } from "../../lib/storage-utils";
import { Button } from "./button";

export function SignOutButton() {
  const router = useRouter();
  const { isAuthenticated } = useAuthCore();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);

      // Clear all session storage data
      clearAllSessionStorage();

      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        // page reload to clear session storage
        window.location.reload();
        // router.push("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push(ROUTE_LOGIN_PAGE);
  };

  const handleSignUp = () => {
    router.push(ROUTE_LOGIN_PAGE);
  };

  // If user is not authenticated, show Sign In button
  if (!isAuthenticated) {
    return (
      <>
        <div className="flex-row items-center space-x-2">
          <Button
            onClick={handleSignIn}
            variant="outline"
            className="text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
          >
            Sign In
          </Button>
          <Button
            onClick={handleSignUp}
            variant="outline"
            className="text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
          >
            Sign Up
          </Button>
        </div>
      </>
    );
  }

  // If user is authenticated, show Sign Out button
  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      className="text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
      disabled={loading}
    >
      {loading ? "Signing Out..." : "Sign Out"}
    </Button>
  );
}
