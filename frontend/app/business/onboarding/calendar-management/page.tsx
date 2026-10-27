"use client";

import { Note } from "@/components/ui/note";
import { Calendar } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import { OnboardingStep } from "../../../constants/businessConstants";
import {
  calendarManagementPage,
  goNext,
  goPrevious,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import { Address, BookingStrategyId } from "../../../types/businessTypes";
import { getStepInfo } from "../../../utils/onboardingSteps";
import BottomActionBar from "./components/BottomActionBar";
import CalendarManagementAccordion from "./components/CalendarManagementAccordion";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";
import OnboardingProgressBar from "@/components/onboarding/OnboardingProgressBar";
import "@/app/types/cronofy-elements";
import CalendarConnectionPanel from "./components/CalendarConnectionPanel";

// Calendar entity assignment type
type CalendarEntityAssignment = {
  entityType: "location" | "employee" | "resource" | "business";
  calendarId: string;
};

// Alternative: Simpler version using CalendarEntityAssignment arrays
type SimpleCalendarAssignment = {
  id: string;
  assignmentType: "location" | "employee" | "resource";
  assignmentId: string;
  assignmentName?: string; // Name for display purposes

  // The primary calendar where bookings will be created
  defaultBookingCalendar: CalendarEntityAssignment;

  // Required list of calendars to check for availability (empty array if none)
  busyCalendars: CalendarEntityAssignment[];
};

// Helper type for the calendar data you're receiving from Cronofy
type CronofyCalendar = {
  provider_name: string;
  profile_id: string;
  profile_name: string;
  calendar_id: string;
  calendar_name: string;
  calendar_readonly: boolean;
  calendar_deleted: boolean;
  calendar_primary: boolean;
  calendar_integrated_conferencing_available: boolean;
  calendar_attachments_available: boolean;
  permission_level: string;
  is_booking_calendar: boolean;
  is_busy_calendar: boolean;
  is_primary_booking: boolean;
};

export default function CalendarManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Calendar-specific state
  const [cronofyCalendars, setCronofyCalendars] = useState<CronofyCalendar[]>([]);
  const [cronofyElementToken, setCronofyElementToken] = useState("");
  const [calendarAssignments, setCalendarAssignments] = useState<SimpleCalendarAssignment[]>([]);

  // Error state from URL query params
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClearingCookies, setIsClearingCookies] = useState(false);

  // Function to clear Cronofy-specific cookies
  const clearCronofyCookies = useCallback(() => {
    setIsClearingCookies(true);
    try {
      // Cronofy cookies are typically set on app.cronofy.com domain
      // Due to browser security, we can only clear cookies from the current domain
      // But we can try to clear any cookies that might be related to Cronofy

      // List of common Cronofy cookie patterns
      const cronofyCookiePatterns = [
        "cronofy",
        "cronofy_",
        "_cronofy",
        "oauth",
        "oauth_",
        "authorization",
      ];

      // Get all cookies
      const cookies = document.cookie.split(";");

      // Clear cookies that match Cronofy patterns
      cookies.forEach((cookie) => {
        const cookieName = cookie.split("=")[0].trim().toLowerCase();
        const matchesPattern = cronofyCookiePatterns.some((pattern) =>
          cookieName.includes(pattern.toLowerCase())
        );

        if (matchesPattern) {
          // Clear cookie for current domain
          document.cookie = `${cookie.split("=")[0].trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          // Also try clearing for parent domain
          const domain = window.location.hostname;
          const domainParts = domain.split(".");
          if (domainParts.length > 1) {
            const parentDomain = "." + domainParts.slice(-2).join(".");
            document.cookie = `${cookie.split("=")[0].trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${parentDomain};`;
          }
        }
      });

      // Also clear localStorage and sessionStorage items that might be Cronofy-related
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.toLowerCase().includes("cronofy") || key.toLowerCase().includes("oauth")) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn("Could not clear localStorage:", e);
      }

      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.toLowerCase().includes("cronofy") || key.toLowerCase().includes("oauth")) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn("Could not clear sessionStorage:", e);
      }

      // Show success message
      setErrorMessage(
        "Cookies cleared! Please try connecting your calendar again. If the issue persists, try using an incognito/private browsing window."
      );

      // Clear the error after a delay
      setTimeout(() => {
        setErrorMessage(null);
        setIsClearingCookies(false);
        // Reload the page to ensure fresh state
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error("Error clearing cookies:", error);
      setErrorMessage(
        "Failed to clear cookies. Please try clearing your browser cookies manually or use an incognito/private browsing window."
      );
      setIsClearingCookies(false);
    }
  }, []);

  // Error state from URL query params
  // const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // const [isClearingCookies, setIsClearingCookies] = useState(false);

  // // Function to clear Cronofy-specific cookies
  // const clearCronofyCookies = useCallback(() => {
  //   setIsClearingCookies(true);
  //   try {
  //     // Cronofy cookies are typically set on app.cronofy.com domain
  //     // Due to browser security, we can only clear cookies from the current domain
  //     // But we can try to clear any cookies that might be related to Cronofy

  //     // List of common Cronofy cookie patterns
  //     const cronofyCookiePatterns = [
  //       "cronofy",
  //       "cronofy_",
  //       "_cronofy",
  //       "oauth",
  //       "oauth_",
  //       "authorization",
  //     ];

  //     // Get all cookies
  //     const cookies = document.cookie.split(";");

  //     // Clear cookies that match Cronofy patterns
  //     cookies.forEach((cookie) => {
  //       const cookieName = cookie.split("=")[0].trim().toLowerCase();
  //       const matchesPattern = cronofyCookiePatterns.some((pattern) =>
  //         cookieName.includes(pattern.toLowerCase())
  //       );

  //       if (matchesPattern) {
  //         // Clear cookie for current domain
  //         document.cookie = `${cookie.split("=")[0].trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  //         // Also try clearing for parent domain
  //         const domain = window.location.hostname;
  //         const domainParts = domain.split(".");
  //         if (domainParts.length > 1) {
  //           const parentDomain = "." + domainParts.slice(-2).join(".");
  //           document.cookie = `${cookie.split("=")[0].trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${parentDomain};`;
  //         }
  //       }
  //     });

  //     // Also clear localStorage and sessionStorage items that might be Cronofy-related
  //     try {
  //       Object.keys(localStorage).forEach((key) => {
  //         if (key.toLowerCase().includes("cronofy") || key.toLowerCase().includes("oauth")) {
  //           localStorage.removeItem(key);
  //         }
  //       });
  //     } catch (e) {
  //       console.warn("Could not clear localStorage:", e);
  //     }

  //     try {
  //       Object.keys(sessionStorage).forEach((key) => {
  //         if (key.toLowerCase().includes("cronofy") || key.toLowerCase().includes("oauth")) {
  //           sessionStorage.removeItem(key);
  //         }
  //       });
  //     } catch (e) {
  //       console.warn("Could not clear sessionStorage:", e);
  //     }

  //     // Show success message
  //     setErrorMessage(
  //       "Cookies cleared! Please try connecting your calendar again. If the issue persists, try using an incognito/private browsing window."
  //     );

  //     // Clear the error after a delay
  //     setTimeout(() => {
  //       setErrorMessage(null);
  //       setIsClearingCookies(false);
  //       // Reload the page to ensure fresh state
  //       window.location.reload();
  //     }, 3000);
  //   } catch (error) {
  //     console.error("Error clearing cookies:", error);
  //     setErrorMessage(
  //       "Failed to clear cookies. Please try clearing your browser cookies manually or use an incognito/private browsing window."
  //     );
  //     setIsClearingCookies(false);
  //   }
  // }, []);

  // Basic page state
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRoutingPrevious, setIsRoutingPrevious] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [bookingStrategy, setBookingStrategy] = useState<BookingStrategyId>("location");

  // Entity data from previous steps
  const [employees, setEmployees] = useState<
    Array<{
      id: string;
      fullName: string;
      email: string;
      role: string;
      locationId: string;
      takesBookings: boolean;
    }>
  >([]);
  const [locations, setLocations] = useState<
    Array<{
      id: string;
      name: string;
      type: string;
      address?: string;
    }>
  >([]);
  const [resources, setResources] = useState<
    Array<{
      id: string;
      name: string;
      type: string;
      description?: string;
    }>
  >([]);
  const { user, loading: authLoading } = useAuthCore();

  // Check for error messages from OAuth callback
  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    if (error && message) {
      setErrorMessage(decodeURIComponent(message));
      // Clear error from URL after displaying
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("error");
      newUrl.searchParams.delete("message");
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, router]);

  // Check for error messages from OAuth callback
  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    if (error && message) {
      setErrorMessage(decodeURIComponent(message));
      // Clear error from URL after displaying
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("error");
      newUrl.searchParams.delete("message");
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, router]);

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);

  const loadCalendarManagementData = useCallback(async () => {
    try {
      setLoading(true);

      // Load basic onboarding data
      const response = await fetch("/api/business/onboarding/draft");

      if (response.ok) {
        const data = await response.json();

        // Access the correct data structure
        const stepData = data.draft?.draft_data;

        // Load booking strategy
        if (stepData?.booking_strategy?.selectedStrategy) {
          const strategy = stepData.booking_strategy.selectedStrategy;
          setBookingStrategy(strategy);
        }

        // Load employees from business team members step
        if (stepData?.business_team_members) {
          const teamData = stepData.business_team_members;
          const allEmployees: typeof employees = [];

          // Extract employees from location-based team data
          Object.values(teamData as Record<string, unknown>).forEach((locationData) => {
            const typedLocationData = locationData as Record<string, unknown>;
            if (typedLocationData && Array.isArray(typedLocationData.teamMembers)) {
              allEmployees.push(...(typedLocationData.teamMembers as typeof employees));
            }
          });

          setEmployees(allEmployees);
        } else if (stepData?.booking_strategy?.employees) {
          // Fallback to booking strategy data
          const employees = stepData.booking_strategy.employees;
          setEmployees(employees);
        }

        // Load locations from business location step
        if (stepData?.business_location) {
          const allLocations: typeof locations = [];

          // Process physical locations
          if (stepData.business_location["serviceTypes.physical"]?.addresses) {
            const physicalLocations = stepData.business_location[
              "serviceTypes.physical"
            ].addresses.map((loc: Record<string, unknown>) => ({
              id: loc.id as string,
              name: loc.name as string,
              type: "physical" as const,
              address:
                `${loc.line1 as string}, ${loc.city as string}, ${loc.state as string} ${loc.zipCode as string}`.trim(),
            }));
            allLocations.push(...physicalLocations);
          }

          // Process mobile locations
          if (stepData.business_location["serviceTypes.mobile"]?.mobileServices) {
            const mobileLocations = stepData.business_location[
              "serviceTypes.mobile"
            ].mobileServices.map((mobile: Record<string, unknown>) => {
              const serviceArea = mobile.serviceArea as Record<string, unknown>;
              const radius = serviceArea?.radius || 0;
              const businessAddress = mobile?.businessAddress as Address;
              let formattedBusinessAddress = "";
              if (businessAddress) {
                formattedBusinessAddress = `${businessAddress?.line1} ${businessAddress.line2 || ""} ${businessAddress.city}, ${businessAddress.state} ${businessAddress.zipCode}`;
              }
              const zipCenter = serviceArea?.zipCenter || formattedBusinessAddress || "";
              return {
                id: mobile.id as string,
                name: mobile.name as string,
                type: "mobile" as const,
                address: `Radius: ${radius} miles from ${zipCenter}`,
              };
            });
            allLocations.push(...mobileLocations);
          }

          // Process virtual locations
          if (stepData.business_location["serviceTypes.virtual"]?.virtualServices) {
            const virtualLocations = stepData.business_location[
              "serviceTypes.virtual"
            ].virtualServices.map((virtual: Record<string, unknown>) => ({
              id: virtual.id as string,
              name: virtual.name as string,
              type: "virtual" as const,
              address: `Platform: ${virtual.platform as string}`,
            }));
            allLocations.push(...virtualLocations);
          }

          setLocations(allLocations);
        } else if (stepData?.booking_strategy?.locations) {
          // Fallback to booking strategy data
          const locations = stepData.booking_strategy.locations;
          setLocations(locations);
        }

        // Load resources from business resources step
        if (stepData?.business_resources) {
          const resourceData = stepData.business_resources;
          const allResources: typeof resources = [];

          // Extract resources from location-based resource data
          Object.values(resourceData as Record<string, unknown>).forEach((locationData) => {
            const typedLocationData = locationData as Record<string, unknown>;
            if (typedLocationData && Array.isArray(typedLocationData.resources)) {
              allResources.push(...(typedLocationData.resources as typeof resources));
            }
          });

          setResources(allResources);
        } else if (stepData?.booking_strategy?.resources) {
          console.error("Failed to load resources data from booking strategy");
          // Fallback to booking strategy data
          const resources = stepData.booking_strategy.resources;
          setResources(resources);
        }

        // Load any existing calendar data
        if (stepData?.calendar_management) {
          const calendarData = stepData.calendar_management;

          setCronofyCalendars(calendarData.cronofyCalendars || []);

          // Ensure all loaded calendar assignments have busyCalendars field
          const loadedAssignments = (calendarData.calendarAssignments || []).map(
            (assignment: SimpleCalendarAssignment) => ({
              ...assignment,
              busyCalendars: assignment.busyCalendars || [],
            })
          );
          console.log("JOEY loadedAssignments", loadedAssignments);
          setCalendarAssignments(loadedAssignments);
        }
      }

      // Try to fetch Cronofy calendars
      try {
        const cronofyResponse = await fetch("/api/cronofy/calendars");
        if (cronofyResponse.ok) {
          const cronofyData = await cronofyResponse.json();
          setCronofyCalendars(cronofyData.calendars || []);
        }
      } catch (error) {
        console.error("❌ Error fetching Cronofy calendars:", error);
      }

      // Try to fetch element token
      try {
        const tokenResponse = await fetch("/api/cronofy/element-token");
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          setCronofyElementToken(tokenData.element_token || "");
        }
      } catch (error) {
        console.error("❌ Error fetching element token:", error);
      }
    } catch (error) {
      console.error("Error loading calendar management data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadCalendarManagementData();
  }, [loadCalendarManagementData]);

  const saveCalendarManagementData = useCallback(async () => {
    try {
      setIsSaving(true);
      // Only save calendar-specific data, not entity data (which comes from other steps)
      // Ensure all calendar assignments have busyCalendars field (empty array if none)
      const processedCalendarAssignments = calendarAssignments.map((assignment) => ({
        ...assignment,
        busyCalendars: assignment.busyCalendars || [],
      }));

      const stepData = {
        cronofyCalendars,
        calendarAssignments: processedCalendarAssignments,
        cronofyElementToken,
      };

      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: OnboardingStep.CALENDAR_MANAGEMENT,
          stepData,
          currentStep: OnboardingStep.CALENDAR_MANAGEMENT,
        }),
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
      } else {
        console.error("❌ Failed to save calendar management data");
        console.error("📤 Response status:", response.status);
        const errorText = await response.text();
        console.error("📤 Response error:", errorText);
      }
    } catch (error) {
      console.error("💥 Error saving calendar management data:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    cronofyCalendars,
    calendarAssignments,
    cronofyElementToken,
    // Removed entity data dependencies - they're loaded from other steps
  ]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges) {
      const autoSaveInterval = setInterval(() => {
        saveCalendarManagementData();
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(autoSaveInterval);
    }
  }, [hasUnsavedChanges, saveCalendarManagementData]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Helper function to create calendar assignment with proper ID handling
  const createCalendarAssignment = useCallback(
    (
      assignmentType: "location" | "employee" | "resource",
      assignmentId: string,
      assignmentName: string,
      defaultBookingCalendar: CalendarEntityAssignment,
      busyCalendars: CalendarEntityAssignment[] = []
    ): SimpleCalendarAssignment => {
      // Remove the default booking calendar from busy calendars if it's included
      const filteredBusyCalendars = busyCalendars.filter(
        (busyCal) => busyCal.calendarId !== defaultBookingCalendar.calendarId
      );

      return {
        id: `${assignmentType}_${assignmentId}`,
        assignmentType,
        assignmentId,
        assignmentName,
        defaultBookingCalendar,
        busyCalendars: filteredBusyCalendars,
      };
    },
    []
  );

  const handleCalendarAssignment = useCallback(
    (
      assignmentType: "location" | "employee" | "resource",
      assignmentId: string,
      assignmentName: string,
      defaultBookingCalendar: CalendarEntityAssignment,
      busyCalendars: CalendarEntityAssignment[] = []
    ) => {
      const newAssignment = createCalendarAssignment(
        assignmentType,
        assignmentId,
        assignmentName,
        defaultBookingCalendar,
        busyCalendars
      );

      console.log("JOEY newAssignment", newAssignment);
      setCalendarAssignments((prev) => {
        const existingIndex = prev.findIndex(
          (a) => a.assignmentType === assignmentType && a.assignmentId === assignmentId
        );

        if (existingIndex >= 0) {
          // Update existing assignment
          const updated = [...prev];
          updated[existingIndex] = newAssignment;
          return updated;
        } else {
          // Add new assignment
          return [...prev, newAssignment];
        }
      });
      setHasUnsavedChanges(true);
    },
    [createCalendarAssignment]
  );

  // Enhanced callback for handling both default and busy calendar assignments
  const handleCalendarAssignmentUpdate = useCallback(
    (
      assignmentType: "location" | "employee" | "resource",
      assignmentId: string,
      assignmentName: string,
      defaultCalendarId: string,
      busyCalendarIds: string[] = []
    ) => {
      const defaultBookingCalendar: CalendarEntityAssignment = {
        entityType: "business", // Default entity type for now
        calendarId: defaultCalendarId,
      };

      const busyCalendars: CalendarEntityAssignment[] = busyCalendarIds.map((calendarId) => ({
        entityType: "business", // Default entity type for now
        calendarId: calendarId,
      }));

      handleCalendarAssignment(
        assignmentType,
        assignmentId,
        assignmentName,
        defaultBookingCalendar,
        busyCalendars
      );
    },
    [handleCalendarAssignment]
  );

  // Legacy wrapper for CalendarManagementAccordion compatibility
  const handleLegacyCalendarAssignment = useCallback(
    (assignment: {
      entityType: "location" | "resource" | "employee";
      entityId: string;
      calendarId: string;
      isPending: boolean;
    }) => {
      // Convert legacy assignment to new format
      const defaultBookingCalendar: CalendarEntityAssignment = {
        entityType: assignment.entityType,
        calendarId: assignment.calendarId,
      };

      handleCalendarAssignment(
        assignment.entityType,
        assignment.entityId,
        "", // assignmentName - will be filled from entity data
        defaultBookingCalendar,
        [] // busyCalendars - will be handled separately
      );
    },
    [handleCalendarAssignment]
  );

  // Navigation handlers
  const handleSave = async () => {
    await saveCalendarManagementData();
  };

  const handleContinue = async () => {
    await saveCalendarManagementData();
    const nextPage = goNext(calendarManagementPage);
    if (nextPage) {
      router.push(nextPage.pageRef);
    }
  };

  const handleBack = async () => {
    setIsRoutingPrevious(true);
    if (hasUnsavedChanges) {
      await saveCalendarManagementData();
    }
    const prevPage = goPrevious(calendarManagementPage);
    if (prevPage) {
      router.push(prevPage.pageRef);
    }
  };

  // Validation logic
  const areCalendarsConfigured = () => {
    // Check if at least one entity has a default booking calendar assigned
    // "configure_later" is considered a valid assignment for employees
    const hasBookingCalendarAssignment = calendarAssignments.some(
      (assignment) =>
        assignment.defaultBookingCalendar.calendarId &&
        assignment.defaultBookingCalendar.calendarId !== "" &&
        assignment.defaultBookingCalendar.calendarId !== "none"
      // Note: "configure_later" is a valid calendarId for employees
    );

    return hasBookingCalendarAssignment;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <LoadingSpinner text="Loading calendar management..." />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4"
      data-testid="ready-state"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <OnboardingProgressBar
          currentStep={getStepInfo("calendar-management").currentStep}
          totalSteps={getStepInfo("calendar-management").totalSteps}
          stepName={getStepInfo("calendar-management").stepName}
          goPrevious={() => router.push(goPrevious(calendarManagementPage)?.pageRef ?? "")}
          user={user?.email ?? ""}
        />
        <div className="text-center mb-8" data-testid="page-header">
          <p className="text-lg text-gray-600">
            Connect and configure your calendar accounts for booking management
          </p>
        </div>

        {/* Calendar Connection Section */}
        <div className="mb-8">
          <Note
            heading="Connect Your Calendar Accounts"
            subheading="Connect your calendar accounts to sync availability and manage bookings. You can connect multiple accounts (Google, Outlook, etc.) and choose which calendars to use."
            icon={Calendar}
            variant="blue"
          />

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                  <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                  {/* Show clear cookies button only for account_linked errors */}
                  {errorMessage.includes("already connected to another user") && (
                    <div className="mt-3">
                      <button
                        onClick={clearCronofyCookies}
                        disabled={isClearingCookies}
                        className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isClearingCookies ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Clearing cookies...
                          </>
                        ) : (
                          <>
                            <svg
                              className="-ml-1 mr-2 h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Clear Cronofy Cookies
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-400 hover:text-red-600"
                    disabled={isClearingCookies}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                  <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                  {/* Show clear cookies button only for account_linked errors */}
                  {errorMessage.includes("already connected to another user") && (
                    <div className="mt-3">
                      <button
                        onClick={clearCronofyCookies}
                        disabled={isClearingCookies}
                        className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isClearingCookies ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Clearing cookies...
                          </>
                        ) : (
                          <>
                            <svg
                              className="-ml-1 mr-2 h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Clear Cronofy Cookies
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-400 hover:text-red-600"
                    disabled={isClearingCookies}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cronofy Element Container */}
          <div className="mt-4">
            <CalendarConnectionPanel
              redirectPath="/business/onboarding/calendar-management"
              onCalendarsChange={(nextCalendars) => {
                setCronofyCalendars(nextCalendars as unknown as CronofyCalendar[]);
                setHasUnsavedChanges(true);
              }}
            />{" "}
          </div>
        </div>

        {/* Calendar Management Accordion */}
        <CalendarManagementAccordion
          locationCalendars={locations.map((loc) => ({
            id: loc.id,
            name: loc.name,
            address: loc.address || "",
            serviceCount: 0,
            resourceCount: resources.filter((r) => r.type === "room").length,
            calendar: {
              provider: "",
              connectionStatus: "disconnected",
              calendarId: "",
              calendarName: "",
            },
            settings: {
              bufferTime: 0,
              businessHoursOverride: false,
            },
          }))}
          resourceCalendars={resources.map((resource) => ({
            id: resource.id,
            name: resource.name,
            email: "",
            type: resource.type,
            description: resource.description,
            calendar: {},
            bookingLogic: "",
            isNew: false,
            locationId: locations[0]?.id || "main",
            capacity: {
              maxConcurrent: 1,
              bufferTime: 0,
            },
          }))}
          employeeCalendars={(() => {
            // Group employees by email address
            const employeesByEmail = employees
              .filter((emp) => emp.takesBookings)
              .reduce(
                (acc, employee) => {
                  const email = employee.email.toLowerCase();
                  if (!acc[email]) {
                    acc[email] = {
                      id: employee.id, // Use the first employee's ID as the consolidated ID
                      fullName: employee.fullName,
                      email: employee.email,
                      roles: [employee.role],
                      locationIds: [employee.locationId],
                      takesBookings: employee.takesBookings,
                      assignmentType: "",
                      calendar: {},
                      isNew: false,
                      // Store all employee IDs for this email
                      allEmployeeIds: [employee.id],
                    };
                  } else {
                    // Consolidate additional employees with the same email
                    acc[email].roles.push(employee.role);
                    acc[email].locationIds.push(employee.locationId);
                    acc[email].allEmployeeIds.push(employee.id);
                    // Update full name if different (take the longer one or first one)
                    if (employee.fullName.length > acc[email].fullName.length) {
                      acc[email].fullName = employee.fullName;
                    }
                  }
                  return acc;
                },
                {} as Record<
                  string,
                  {
                    id: string;
                    fullName: string;
                    email: string;
                    roles: string[];
                    locationIds: string[];
                    takesBookings: boolean;
                    assignmentType: string;
                    calendar: Record<string, unknown>;
                    isNew: boolean;
                    allEmployeeIds: string[];
                  }
                >
              );

            console.log("employeesByEmail", employeesByEmail);
            // Convert back to array with safety check
            const result = Object.values(employeesByEmail);
            console.log("result", result);
            // Ensure we always return an array
            if (!Array.isArray(result)) {
              console.warn(
                "employeeCalendars: Object.values() did not return an array, returning empty array"
              );
              return [];
            }
            return result;
          })()}
          calendarAssignments={calendarAssignments.map((assignment) => ({
            entityType: assignment.assignmentType,
            entityId: assignment.assignmentId,
            calendarId: assignment.defaultBookingCalendar.calendarId,
            isPending: false,
            busyCalendars: assignment.busyCalendars.map((bc) => bc.calendarId), // Pass busy calendar IDs
          }))}
          bookingStrategy={bookingStrategy}
          onCalendarAssignment={handleLegacyCalendarAssignment}
          // Add the enhanced callback for busy calendar handling
          onCalendarAssignmentUpdate={handleCalendarAssignmentUpdate}
        />

        {/* Bottom Action Bar */}
        <BottomActionBar
          isSaving={isSaving}
          isRoutingPrevious={isRoutingPrevious}
          areAllRequirementsConfigured={areCalendarsConfigured()}
          onSave={handleSave}
          onContinue={handleContinue}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
