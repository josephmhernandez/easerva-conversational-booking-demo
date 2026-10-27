"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { saveEmployeeCalendarSettings, SaveEmployeeCalendarSettingsResponse } from "./actions";
import {
  ROUTE_DASHBOARD,
  ROUTE_LOGIN_PAGE,
  ROUTE_SIGNUP_PAGE,
} from "@/app/constants/routeConstants";
import { getOrigin } from "@/app/utils/environment";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import "@/app/types/cronofy-elements";

interface CronofyCalendar {
  calendar_id: string;
  calendar_name: string;
  profile_id: string;
  profile_name: string;
  provider_name?: string;
  calendar_readonly?: boolean;
  calendar_deleted?: boolean;
  is_booking_calendar?: boolean;
  is_busy_calendar?: boolean;
  is_primary_booking?: boolean;
}

interface Employee {
  id: string;
  business_id: string;
  full_name: string;
  email: string;
}

// Calendar Connection Widget Component
function CalendarConnectionWidget() {
  const targetId = "cronofy-calendar-connection";
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "loading" | "new_user" | "existing_user" | "error"
  >("loading");
  const elementRef = useRef<{ destroy?: () => void } | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // Load script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.CronofyElements) {
      setReady(true);
      return;
    }

    if (window.__cronofyElementsLoaded || document.getElementById("cronofy-elements-script")) {
      const t = setInterval(() => {
        if (window.CronofyElements) {
          clearInterval(t);
          setReady(true);
        }
      }, 50);
      return () => clearInterval(t);
    }

    const s = document.createElement("script");
    s.id = "cronofy-elements-script";
    s.src = "https://elements.cronofy.com/js/CronofyElements.v1.66.3.js";
    s.async = true;
    s.onload = () => {
      window.__cronofyElementsLoaded = true;
      setReady(true);
    };
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!mounted || !ready || !window.CronofyElements) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      const clientId = process.env.NEXT_PUBLIC_CRONOFY_CLIENT_ID;
      const redirectUri = `${getOrigin()}${process.env.NEXT_PUBLIC_CRONOFY_REDIRECT_URI!}?redirect_uri=${encodeURIComponent(window.location.pathname)}`;

      if (!clientId || !redirectUri) {
        const el = document.getElementById(targetId);
        if (el) {
          el.innerHTML = `<div class="text-red-600 text-sm">
            Cronofy authorization missing. Set NEXT_PUBLIC_CRONOFY_CLIENT_ID and NEXT_PUBLIC_CRONOFY_REDIRECT_URI.
          </div>`;
        }
        setConnectionStatus("error");
        return;
      }

      // Check if user has an existing Cronofy connection
      let element_token: string | undefined;
      let hasExistingAccount = false;

      try {
        const r = await fetch("/api/cronofy/element-token");
        if (r.ok) {
          const j = await r.json();
          if (typeof j.element_token === "string" && j.element_token.length > 0) {
            element_token = j.element_token;
            hasExistingAccount = true;
            console.log("✅ User has existing Cronofy account");
          }
        } else if (r.status === 404) {
          // This is expected for new users - they don't have a connection yet
          console.log("ℹ️ New user - no existing Cronofy account");
          hasExistingAccount = false;
        } else {
          console.error("⚠️ Unexpected response from element-token:", r.status);
        }
      } catch (err) {
        console.error("❌ Error fetching element token:", err);
      }

      setConnectionStatus(hasExistingAccount ? "existing_user" : "new_user");

      // CRITICAL: Use completely different configurations for new vs existing users
      let opts;

      if (hasExistingAccount && element_token) {
        // EXISTING USER: Show their connected calendars, allow adding more
        // The element_token scopes all operations to their existing Cronofy account
        console.log("🔧 Initializing CalendarSync for EXISTING user");
        opts = {
          target_id: targetId,
          element_token: element_token,
          // Include authorization so they can add more calendar providers
          authorization: {
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: "free_busy_write",
            avoid_linking: true, // ✅ THE KEY FIX - prevents account linking
          },
          styles: {
            colors: {
              primary: "#14b8a6",
              hairline: "#e5e7eb",
            },
          },
          config: { logs: "info" },
        };
      } else {
        // NEW USER: Fresh OAuth flow - will create a NEW Cronofy account
        // DO NOT include element_token - this ensures a fresh account is created
        console.log("🔧 Initializing CalendarSync for NEW user (fresh OAuth)");
        opts = {
          target_id: targetId,
          // NO element_token here - forces fresh account creation
          authorization: {
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: "free_busy_write",
            avoid_linking: true, // ✅ THE KEY FIX - prevents account linking
          },
          styles: {
            colors: {
              primary: "#14b8a6",
              hairline: "#e5e7eb",
            },
          },
          config: { logs: "info" },
        };
      }

      console.log("🚀 CalendarSync options:", {
        hasElementToken: !!opts.element_token,
        hasAuthorization: !!opts.authorization,
        avoidLinking: true,
        targetId: opts.target_id,
      });

      try {
        elementRef.current?.destroy?.();
      } catch {}

      elementRef.current = window.CronofyElements?.CalendarSync(opts) ?? null;
    })();

    return () => {
      initializedRef.current = false;
      try {
        elementRef.current?.destroy?.();
      } catch {}
    };
  }, [mounted, ready]);

  if (!mounted) {
    return (
      <div className="w-full rounded-xl border p-4 bg-white shadow-sm flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Loading calendar sync…</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto rounded-xl border bg-white shadow-sm p-4 sm:p-6 lg:p-8 transition-all duration-300">
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-4 p-2 bg-gray-100 rounded text-xs">Status: {connectionStatus}</div>
      )}
      <div id={targetId} />
    </div>
  );
}

export default function EmployeeAddCalendarPage() {
  const router = useRouter();

  // State management
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [calendars, setCalendars] = useState<CronofyCalendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [defaultBookingCalendarId, setDefaultBookingCalendarId] = useState<string>("");
  const [busyCalendarIds, setBusyCalendarIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasIntegration, setHasIntegration] = useState(false);

  // Track if calendars have been loaded to prevent duplicate requests
  const calendarsLoadedRef = useRef(false);

  // If user is not authenticated, redirect to login page
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push(ROUTE_LOGIN_PAGE);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      }
    };
    checkAuthentication();
  }, [router]);

  // Load calendars from Cronofy
  const loadCalendars = useCallback(async () => {
    // Prevent duplicate calls
    if (calendarsLoadedRef.current) return;
    calendarsLoadedRef.current = true;

    try {
      setLoadingCalendars(true);
      const response = await fetch("/api/cronofy/calendars");
      if (response.ok) {
        const data = await response.json();
        const calendarList = (data.calendars || []).filter(
          (cal: CronofyCalendar) => !cal.calendar_deleted && !cal.calendar_readonly
        );
        setCalendars(calendarList);
      } else {
        console.error("Failed to load calendars");
      }
    } catch (error) {
      console.error("Error loading calendars:", error);
    } finally {
      setLoadingCalendars(false);
    }
  }, []);

  // Load employee data and existing calendar configuration
  const loadEmployeeData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not authenticated");
        return;
      }

      // Find employee record
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id, business_id, full_name, email")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (employeeError) {
        console.error("Error finding employee:", employeeError);
        return;
      }

      if (!employeeData) {
        console.error("Employee record not found");

        router.push(ROUTE_SIGNUP_PAGE);
        return;
      }

      setEmployee(employeeData);

      // Check for calendar integration
      const { data: integration, error: integrationError } = await supabase
        .from("business_calendar_integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", "cronofy")
        .maybeSingle();

      if (!integrationError && integration) {
        setHasIntegration(true);
        // Load calendars
        await loadCalendars();
      }

      // Load existing calendar group configuration
      const { data: calendarGroup, error: groupError } = await supabase
        .from("calendar_groups")
        .select("id, default_booking_calendar_id, busy_calendar_ids, is_configured")
        .eq("business_id", employeeData.business_id)
        .eq("entity_type", "employee")
        .eq("entity_id", employeeData.id)
        .maybeSingle();

      if (!groupError && calendarGroup) {
        setDefaultBookingCalendarId(calendarGroup.default_booking_calendar_id || "");
        setBusyCalendarIds(calendarGroup.busy_calendar_ids || []);
      }
    } catch (error) {
      console.error("Error loading employee data:", error);
    } finally {
      setLoading(false);
    }
  }, [loadCalendars, router]);

  // Poll for calendar integration after connection
  useEffect(() => {
    if (hasIntegration) {
      // Only load calendars once when integration is detected
      loadCalendars();
      return;
    }

    // Reset the ref when integration is lost
    calendarsLoadedRef.current = false;

    // Poll for integration if not yet connected
    const pollInterval = setInterval(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: integration } = await supabase
        .from("business_calendar_integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", "cronofy")
        .maybeSingle();

      if (integration && !hasIntegration) {
        setHasIntegration(true);
        loadCalendars();
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIntegration]);

  // Load data on mount
  useEffect(() => {
    loadEmployeeData();
  }, [loadEmployeeData]);

  // Handle save
  const handleSave = async () => {
    if (!defaultBookingCalendarId) {
      setSaveError("Please select a default booking calendar");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result: SaveEmployeeCalendarSettingsResponse = await saveEmployeeCalendarSettings(
        defaultBookingCalendarId,
        busyCalendarIds
      );

      if (result.success) {
        setSaveSuccess(true);
        setSaveError(null);
      } else {
        setSaveError(result.error || "Failed to save calendar settings");
        setSaveSuccess(false);
      }
    } catch (error) {
      console.error("Error saving calendar settings:", error);
      setSaveError("An unexpected error occurred");
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle busy calendar toggle
  const handleBusyCalendarToggle = (calendarId: string, checked: boolean) => {
    if (checked) {
      setBusyCalendarIds((prev) => [...prev, calendarId]);
    } else {
      setBusyCalendarIds((prev) => prev.filter((id) => id !== calendarId));
    }
  };

  const handleDefaultBookingCalendarChange = (value: string) => {
    setDefaultBookingCalendarId(value);
    setSaveError(null);
    setSaveSuccess(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <LoadingSpinner size="md" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>Employee record not found. Please contact support.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect Your Calendar</h1>
          <p className="text-gray-600">
            Connect your calendar account and configure your booking settings
          </p>
        </div>

        {/* Calendar Connection Widget */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Step 1: Connect Your Calendar
          </h2>
          <CalendarConnectionWidget />
        </div>

        {/* Calendar Selection */}
        {hasIntegration && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Step 2: Configure Your Calendars
            </h2>

            {loadingCalendars ? (
              <div className="text-center py-8">
                <LoadingSpinner size="sm" />
                <p className="text-gray-600 text-sm">Loading calendars...</p>
              </div>
            ) : calendars.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p>No calendars available. Please connect your calendar account first.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Default Booking Calendar */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Default Booking Calendar <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    This calendar will be used to create new bookings
                  </p>
                  <Select
                    value={defaultBookingCalendarId}
                    onValueChange={(value) => handleDefaultBookingCalendarChange(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a calendar for bookings..." />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map((cal) => (
                        <SelectItem key={cal.calendar_id} value={cal.calendar_id}>
                          {cal.calendar_name} ({cal.profile_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Busy Calendars */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Busy Calendars (Optional)
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Select additional calendars to check for availability
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {calendars
                      .filter((cal) => cal.calendar_id !== defaultBookingCalendarId)
                      .map((cal) => (
                        <div key={cal.calendar_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`busy-${cal.calendar_id}`}
                            checked={busyCalendarIds.includes(cal.calendar_id)}
                            onCheckedChange={(checked) =>
                              handleBusyCalendarToggle(cal.calendar_id, checked === true)
                            }
                          />
                          <label
                            htmlFor={`busy-${cal.calendar_id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {cal.calendar_name} ({cal.profile_name})
                          </label>
                        </div>
                      ))}
                    {calendars.filter((cal) => cal.calendar_id !== defaultBookingCalendarId)
                      .length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No additional calendars available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Success Message */}
        {saveSuccess && (
          <Card className="p-4 mb-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-3 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">Calendar settings saved successfully!</p>
            </div>
          </Card>
        )}

        {/* Error Message */}
        {saveError && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{saveError}</p>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {hasIntegration && calendars.length > 0 && (
          <div className="flex items-center justify-end gap-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !defaultBookingCalendarId}
              size="default"
              variant="primary"
              loading={isSaving}
            >
              Save Calendar Settings
            </Button>
            {saveSuccess && (
              <Button
                variant="outline"
                onClick={() => router.push(ROUTE_DASHBOARD)}
                className="flex-1"
              >
                Go to Dashboard
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
