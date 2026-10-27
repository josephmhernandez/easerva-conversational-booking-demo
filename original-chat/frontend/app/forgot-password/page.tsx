"use client";

import { useEffect, useState } from "react";
import { forgotPasswordAction } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const email = searchParams.get("email");
    if (email) {
      setEmail(email);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const result = await forgotPasswordAction(email);

    if (result.error) {
      setError(result.error);
    } else {
      setMessage(result.message!);
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
              Reset Password{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                Easerva
              </span>
            </h1>
            <p className="text-lg text-gray-600">Enter your email to reset your password</p>
          </div>

          <Card className="bg-white border-0 shadow-xl">
            <CardContent className="p-4">
              <form onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-2 border rounded mb-4"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
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
