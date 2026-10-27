// components/ui/Header.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { buildAuthUrl } from "@/app/utils/auth/redirect";
import {
  ROUTE_BUSINESS_START_ONBOARDING_PAGE,
  ROUTE_LOGIN_PAGE,
} from "@/app/constants/routeConstants";

export function Header({
  email,
  rightSlot,
}: {
  email: string | null;
  rightSlot?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="px-4 py-6 sm:px-6 lg:px-8 w-full">
      <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
        <Logo />
        <Button
          onClick={() => {
            if (email) {
              router.push(ROUTE_BUSINESS_START_ONBOARDING_PAGE);
            } else {
              const welcomeUrl = buildAuthUrl(
                ROUTE_LOGIN_PAGE,
                ROUTE_BUSINESS_START_ONBOARDING_PAGE
              );
              router.push(welcomeUrl);
            }
          }}
          className="bg-gradient-to-r from-orange-400 to-pink-500 text-white"
        >
          Business Owners
        </Button>
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
          {/* Business Link - Always visible */}
          <Link href="/business">
            <Button
              variant="outline"
              className="bg-gradient-to-r from-orange-400 to-pink-400 text-white border-0 hover:from-orange-500 hover:to-pink-500 text-xs sm:text-sm px-3 sm:px-4 font-medium"
            >
              {`I'm a business`}
            </Button>
          </Link>

          {email && (
            <p className="text-gray-700 text-xs sm:text-sm px-2 sm:px-4 truncate max-w-[120px] sm:max-w-none">
              <span className="hidden sm:inline">Welcome, {email}</span>
            </p>
          )}
          {email && (
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => router.push("/profile")}
              title="Profile Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
