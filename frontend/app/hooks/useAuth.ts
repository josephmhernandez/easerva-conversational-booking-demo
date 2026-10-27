// hooks/useAuth.ts
"use client";
import { createClient } from "@/app/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { webSocketReconnectEmitter } from "../../lib/websocket-reconnect-event";

export function useAuth() {
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

      console.log("🔐 Initial session check:", {
        previousUserId,
        newUserId,
        userChanged: previousUserId !== newUserId,
      });

      // Check if authentication state changed (important for OAuth redirects)
      // Only trigger reconnect if we had a previous user state (not initial load)
      if (previousUserId !== newUserId && newUserId !== null && previousUserId !== null) {
        // User signed in (likely via OAuth redirect) - trigger WebSocket reconnection
        console.log("🔄 User authenticated via redirect, triggering WebSocket reconnection");
        setTimeout(() => {
          webSocketReconnectEmitter.triggerReconnect();
        }, 3000); // Small delay to ensure auth state is fully updated
      } else if (previousUserId !== newUserId && newUserId !== null) {
        console.log("🔐 Initial user authentication detected, no reconnect needed");
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
          // User signed in - trigger WebSocket reconnection with new credentials
          console.log("🔄 User signed in, triggering WebSocket reconnection");
          setTimeout(() => {
            webSocketReconnectEmitter.triggerReconnect();
          }, 1000); // Small delay to ensure auth state is fully updated
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
        console.log(
          "🔄 User authenticated while window was unfocused, triggering WebSocket reconnection"
        );
        setTimeout(() => {
          webSocketReconnectEmitter.triggerReconnect();
        }, 3000);
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

  return { user, loading, isAuthenticated: !!user };
}
