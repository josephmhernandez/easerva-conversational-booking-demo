// hooks/useAuthCore.ts
"use client";
import { createClient } from "@/app/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

export function useAuthCore() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const newUser = session?.user ?? null;
      const newUserId = newUser?.id ?? null;
      const previousUserId = previousUserIdRef.current;

      // console.log("🔐 Initial session check:", {
      //   previousUserId,
      //   newUserId,
      //   userChanged: previousUserId !== newUserId,
      // });

      // Check if authentication state changed (important for OAuth redirects)
      if (previousUserId !== newUserId && newUserId !== null && previousUserId !== null) {
        console.log("🔐 User authenticated via redirect");
      } else if (previousUserId !== newUserId && newUserId !== null) {
        console.log("🔐 Initial user authentication detected");
      }

      setUser(newUser);
      previousUserIdRef.current = newUserId;
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;
      const newUserId = newUser?.id ?? null;
      const previousUserId = previousUserIdRef.current;

      console.log("🔐 Auth state change:", {
        event,
        previousUserId,
        newUserId,
        userChanged: previousUserId !== newUserId,
      });

      // Check if user authentication state changed
      if (previousUserId !== newUserId) {
        // User authentication state changed (signed in, signed out, or switched users)
        if (event === "SIGNED_IN" || (previousUserId === null && newUserId !== null)) {
          console.log("🔐 User signed in");
        } else if (event === "SIGNED_OUT" || (previousUserId !== null && newUserId === null)) {
          console.log("🔐 User signed out");
        }
      }

      setUser(newUser);
      previousUserIdRef.current = newUserId;
      setLoading(false);
    });

    // Also check for session changes when the window regains focus
    // This handles cases where OAuth completed in another tab/window
    const handleFocus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const newUser = session?.user ?? null;
      const newUserId = newUser?.id ?? null;
      const previousUserId = previousUserIdRef.current;

      if (previousUserId !== newUserId && newUserId !== null) {
        console.log("🔐 User authenticated while window was unfocused");
        setUser(newUser);
        previousUserIdRef.current = newUserId;
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, [supabase]);

  // Helper methods for common auth operations
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithOAuth = async (provider: "google" | "github" | "apple", redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("OAuth sign in error:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("Email sign in error:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    console.log("🔐 Attempting to sign up with email:", email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile`,
      },
    });

    if (error) {
      console.error("❌ Email sign up error:", error);

      // Provide more helpful error messages for common issues
      if (error.message?.includes("405") || error.message?.includes("hook")) {
        const helpfulError = new Error(
          "Signup failed due to server configuration issue. Please contact support or try again later. " +
            "If this persists, check your Supabase webhook configurations."
        );
        helpfulError.name = error.name;
        throw helpfulError;
      }

      throw error;
    }

    console.log("✅ Email sign up successful:", {
      user: data.user?.id,
      session: data.session ? "Session created" : "No session (email confirmation required)",
    });

    return data;
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signOut,
    signInWithOAuth,
    signInWithEmail,
    signUpWithEmail,
  };
}
