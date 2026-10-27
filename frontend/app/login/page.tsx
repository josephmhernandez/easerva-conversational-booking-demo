"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, Check, Eye, EyeOff, Info, Lock, Mail, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { getAndClearRedirectUrl, buildAuthUrl } from "@/app/utils/auth/redirect";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { createClient } from "../utils/supabase/client";
import { getIssuerForEmail, isProfileComplete } from "./actions";
import Script from "next/script";
import { Note } from "@/components/ui/note";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdInitializeConfig) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleIdInitializeConfig {
  client_id: string;
  callback: (response: { credential: string }) => void;
  nonce?: string;
  use_fedcm_for_prompt?: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuthCore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  type GoogleCredentialResponse = { credential: string };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const redirectUrl = getAndClearRedirectUrl() || "/";
      router.push(redirectUrl);
    }
  }, [isAuthenticated, authLoading, router]);

  const generateNonce = async (): Promise<[string, string]> => {
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const encoder = new TextEncoder();
    const encodedNonce = encoder.encode(nonce);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return [nonce, hashedNonce];
  };

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    strength = Object.values(checks).filter(Boolean).length;
    return { strength, checks };
  };

  const passwordStrength = getPasswordStrength(password);

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return "bg-red-400";
    if (strength < 4) return "bg-yellow-400";
    return "bg-green-400";
  };

  const getStrengthText = (strength: number) => {
    if (strength < 2) return "Weak";
    if (strength < 4) return "Good";
    return "Strong";
  };

  const initializeGoogleOneTap = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;
      // const hostname = window.location.hostname;
      // if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      //   alert("Google One Tap is currently enabled only on localhost.");
      //   return;
      // }

      const [nonce, hashedNonce] = await generateNonce();

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session", error);
      }
      if (data?.session) {
        router.push("/");
        return;
      }

      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response: GoogleCredentialResponse) => {
          try {
            // Persist current guest session id for linking after OAuth redirect (only if not already set)
            try {
              const existingPendingId = sessionStorage.getItem("pending_link_session_id");
              if (!existingPendingId) {
                const stored = sessionStorage.getItem("chat_session");
                if (stored) {
                  const parsed = JSON.parse(stored) as { id?: string } | null;
                  if (parsed?.id) sessionStorage.setItem("pending_link_session_id", parsed.id);
                }
              }
            } catch {}
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce,
            });
            if (error) {
              console.error("Error signing in with Google One Tap", error);
            }
            if (error) throw error;

            // Close modal and refresh page to ensure WebSocket reconnects
            // handleClose();
          } catch (err) {
            console.error("Error logging in with Google One Tap", err);
          }
        },
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
      });

      window.google.accounts.id.prompt();
    } catch (err) {
      console.error("Error initializing Google One Tap", err);
    }
  }, [router, supabase]);

  const handleEmailAuth = useCallback(async () => {
    setError(null);
    setInfo(null);
    // Validation for signup mode
    if (mode === "signup") {
      if (!email || !password || !confirmPassword) {
        setError("All fields are required");
        return;
      }

      if (!validateEmail(email)) {
        setError("Please enter a valid email address");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords don't match");
        return;
      }

      if (passwordStrength.strength < 3) {
        setError("Password is too weak. Please use a stronger password.");
        return;
      }
    } else {
      // Validation for signin mode
      if (!email || !password) {
        setError("Email and password are required");
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      setInfo(null);

      if (mode === "signin") {
        const next = searchParams.get("next") || "/";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        // Check if email is in system and has a provider.
        if (error && error.code === "invalid_credentials") {
          const issuer = await getIssuerForEmail(email);
          if (issuer) {
            setError(
              `An account with this email already exists. Please Continue with ${issuer} instead.`
            );
            return;
          }
        }

        if (error && error.code === "email_not_confirmed") {
          setInfo("Email not confirmed. Please check your email for a confirmation link.");
          return;
        }
        if (error) throw error;

        // Check if profile is complete.
        const isProfileCompleteResult = await isProfileComplete();
        if (!isProfileCompleteResult) {
          const redirectUrl = "/profile?incomplete=true&next=" + next;
          router.push(redirectUrl);
          return;
        }

        router.push(next);
      } else {
        // get next query param from the url.
        const next = searchParams.get("next") || "/";
        const emailRedirectTo = buildAuthUrl("/auth/callback", next);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {},
            emailRedirectTo: emailRedirectTo,
          },
        });

        // is email verified?
        // check if the email_verified key is there and is false.
        if (data.user?.user_metadata?.email_verified !== undefined) {
          if (data.user?.user_metadata?.email_verified === false) {
            setInfo("Please check your email for a confirmation link.");
            return;
          }
        }

        if (error) throw error;
        if (!data.user) throw new Error("User not found");

        const issuer = await getIssuerForEmail(email);
        if (issuer) {
          setError(
            `An account with this email already exists. Please Continue with ${issuer} instead.`
          );
          return;
        }

        // Redirect to login.
        setError("Account already exists. Please sign in.");
        setMode("signin");
        return;
      }
    } catch (err) {
      console.error("Error signing up with email", err);
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, mode, supabase, router, passwordStrength]);

  const handleOAuth = useCallback(
    async (provider: "google" | "apple") => {
      try {
        setLoading(true);
        setError(null);
        setInfo(null);
        // Persist current guest session id for linking after OAuth redirect (only if not already set)
        try {
          const existingPendingId = sessionStorage.getItem("pending_link_session_id");
          if (!existingPendingId) {
            const stored = sessionStorage.getItem("chat_session");
            if (stored) {
              const parsed = JSON.parse(stored) as { id?: string } | null;
              if (parsed?.id) sessionStorage.setItem("pending_link_session_id", parsed.id);
            }
          }
        } catch {}

        // Get current path for redirect
        const next = searchParams.get("next") || "/";
        const redirectTo = buildAuthUrl("/auth/callback", next);

        console.log("Calling signInWithOAuth with redirectTo: ", redirectTo);
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });
        if (error) throw error;
      } catch (err) {
        console.error("Error signing in with OAuth", err);
        const message = err instanceof Error ? err.message : "OAuth failed";
        setError(message);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header */}
      <header className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Easerva</span>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Welcome Text */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {mode === "signin" ? "Welcome back to" : "Join"}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                Easerva
              </span>
            </h1>
            <p className="text-lg text-gray-600">
              {mode === "signin"
                ? "Sign in to continue your journey"
                : "Create your account to get started"}
            </p>
          </div>

          {/* Login Card */}
          <Card className="bg-white border-0 shadow-xl">
            <CardContent className="p-8">
              {/* Sign In/Sign Up Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEmailAuth();
                }}
                className="space-y-6"
              >
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 text-base border-gray-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 text-base border-gray-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator - Signup Only */}
                  {mode === "signup" && password && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getStrengthColor(passwordStrength.strength)}`}
                            style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {getStrengthText(passwordStrength.strength)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center space-x-2">
                          {passwordStrength.checks.length ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-400" />
                          )}
                          <span>At least 8 characters</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordStrength.checks.uppercase ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-400" />
                          )}
                          <span>One uppercase letter</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordStrength.checks.lowercase ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-400" />
                          )}
                          <span>One lowercase letter</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordStrength.checks.number ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-400" />
                          )}
                          <span>One number</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordStrength.checks.special ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-400" />
                          )}
                          <span>One special character</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Display */}
                  {info && <Note subheading={info} variant="blue" className="mt-2" icon={Info} />}

                  {/* Error Display */}
                  {error && (
                    <Note subheading={error} variant="error" className="mt-2" icon={AlertCircle} />
                  )}
                </div>

                {/* Confirm Password Field - Signup Only */}
                {mode === "signup" && (
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 text-base border-gray-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {`Passwords don't match`}
                      </p>
                    )}
                  </div>
                )}

                {/* Forgot Password Link - Signin Only */}
                {mode === "signin" && (
                  <div className="text-right">
                    <button
                      type="button"
                      className="cursor-pointer text-sm text-orange-500 hover:text-orange-600 font-medium"
                      disabled={loading}
                      onClick={() => {
                        if (email) {
                          router.push("/forgot-password?email=" + email);
                        } else {
                          router.push("/forgot-password");
                        }
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white font-medium text-base transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>{mode === "signin" ? "Signing in..." : "Creating account..."}</span>
                    </div>
                  ) : mode === "signin" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or continue with</span>
                  </div>
                </div>

                {/* OAuth Buttons */}
                <div className="grid grid-rows-1 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-gray-200 hover:bg-gray-50 bg-transparent"
                    disabled={loading}
                    onClick={() => handleOAuth("google")}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  {/* <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-gray-200 hover:bg-gray-50 bg-transparent"
                    disabled={loading}
                    onClick={() => handleOAuth("apple")}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    Apple
                  </Button> */}
                </div>

                {/* Sign Up/Sign In Toggle Link */}
                <div className="text-center pt-4">
                  <p className="text-gray-600">
                    {mode === "signin" ? (
                      <>
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("signup");
                            setError(null);
                            setInfo(null);
                          }}
                          className="cursor-pointer text-orange-500 hover:text-orange-600 font-medium"
                          disabled={loading}
                        >
                          Sign up
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("signin");
                            setError(null);
                            setConfirmPassword("");
                            setInfo(null);
                          }}
                          className="cursor-pointer text-orange-500 hover:text-orange-600 font-medium"
                          disabled={loading}
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              By signing in, you agree to our{" "}
              <a href="#" className="text-orange-500 hover:text-orange-600">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-orange-500 hover:text-orange-600">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
        <Script
          onReady={() => {
            void initializeGoogleOneTap();
          }}
          src="https://accounts.google.com/gsi/client"
        />
      </div>

      {/* Footer */}
      <footer className="px-4 py-8 sm:px-6 lg:px-8 bg-gray-50/50 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-pink-400 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">E</span>
            </div>
            <span className="text-lg font-bold text-gray-900">easerva.com</span>
          </div>
          <p className="text-sm text-gray-500">© 2024 Easerva. Your service booking made easy.</p>
        </div>
      </footer>
    </div>
  );
}
