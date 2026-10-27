"use client";

import { useState } from "react";
import { resetPasswordAction } from "@/app/reset-password/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPasswordStrength } from "../utils/auth/validations";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordStrength = getPasswordStrength(password);
    if (passwordStrength.strength < 3) {
      if (!passwordStrength.checks.length) {
        setError("Password must be at least 8 characters long");
        return;
      }
      if (!passwordStrength.checks.uppercase) {
        setError("Password must contain at least one uppercase letter");
        return;
      }
      if (!passwordStrength.checks.lowercase) {
        setError("Password must contain at least one lowercase letter");
        return;
      }
      if (!passwordStrength.checks.number) {
        setError("Password must contain at least one number");
        return;
      }
      if (!passwordStrength.checks.special) {
        setError("Password must contain at least one special character");
        return;
      }
      return;
    }

    const result = await resetPasswordAction(password);

    if (result.error) {
      setError(result.error);
    } else {
      setMessage(result.message!);
      setLoading(false);
      router.push(next);
    }
    setLoading(false);
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
              Set New Password{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                Easerva
              </span>
            </h1>
            <p className="text-lg text-gray-600">Enter your new password</p>
          </div>

          <Card className="bg-white border-0 shadow-xl">
            <CardContent className="p-4">
              <form onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    New Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full p-2 border rounded mb-4"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full p-2 border rounded mb-4"
                  />
                </div>
                <Button type="submit" variant="primary" className="w-full" size="lg">
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>

              {message && <p className="mt-4 text-green-600">{message}</p>}
              {error && <p className="mt-4 text-red-600">{error}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
