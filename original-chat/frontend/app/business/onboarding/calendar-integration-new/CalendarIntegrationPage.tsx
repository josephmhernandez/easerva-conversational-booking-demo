"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Note } from "@/components/ui/note";
import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OnboardingStep } from "../../../constants/businessConstants";
import {
  calendarIntegrationNewPage,
  goNext,
  goPrevious,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import { BookingStrategyId } from "../../../types/businessTypes";
import { getStepInfo } from "../../../utils/onboardingSteps";

// Import components
import BookingRequirementsBuilder from "./components/BookingRequirementsBuilder";
import BookingStrategyDisplay from "./components/BookingStrategyDisplay";
import BottomActionBar from "./components/BottomActionBar";
import CalendarIntegrationHeader from "./components/CalendarIntegrationHeader";
import CombiningInterface from "./components/CombiningInterface";

// Import strategy renderers

// Import new strategy renderers
import EmployeeBasedStrategyRendererNew from "./components/strategy-renderers/EmployeeBasedStrategyRendererNew";
import HybridStrategyRendererNew from "./components/strategy-renderers/HybridStrategyRendererNew";
import LocationBasedStrategyRendererNew from "./components/strategy-renderers/LocationBasedStrategyRendererNew";
import ResourceBasedStrategyRendererNew from "./components/strategy-renderers/ResourceBasedStrategyRendererNew";
import SimpleStrategyRendererNew from "./components/strategy-renderers/SimpleStrategyRendererNew";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";
import { useAuthCore } from "@/app/hooks/useAuthCore";

// Type definitions for service location data
interface ServiceLocationService {
  id: string;
  name: string;
  price: number;
  priceType?: "fixed" | "variable";
  priceMin?: number;
  priceMax?: number;
  deliveryOptions?: {
    inPerson: boolean;
    mobile: boolean;
    virtual: boolean;
  };
}

interface ServiceLocationConfiguration {
  enabled: boolean;
  serviceId: string;
  locationId: string;
  maxCapacity: number;
  requiredResources: string[];
  customPrice?: number;
  customPriceMin?: number;
  customPriceMax?: number;
  customPriceType?: "fixed" | "variable";
  customDuration?: number;
}

interface EmployeeServiceAssignment {
  enabled: boolean;
  visible: boolean;
  serviceId: string;
  employeeId: string;
  locationId: string;
}

interface EmployeeServiceAssignmentEmployee {
  id: string;
  role: string;
  email: string;
  fullName: string;
  locationId: string;
  takesBookings: boolean;
}

interface EmployeeServiceAssignmentLocation {
  id: string;
  name: string;
  type: string;
  address: string;
}

interface EmployeeServiceAssignmentService {
  id: string;
  name: string;
  category: string;
  anonymous: boolean;
  basePrice: number;
  locations: string[];
  baseDuration: number;
  requiresEmployee: boolean;
}

// Type definitions (moved from main page)
interface CalendarResource {
  id: string;
  name: string;
  email?: string;
  type?: string;
  description?: string;
  calendar?: Record<string, unknown>;
  comboId?: string;
  bookingLogic?: string;
  isNew?: boolean;
  locationId?: string;
  capacity?: {
    maxConcurrent: number;
    bufferTime: number;
  };
}

interface CalendarAssignment {
  entityType: "location" | "resource" | "employee";
  entityId: string;
  calendarId: string;
  isPending: boolean;
}

interface PendingEmployeeConnection {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  status: "pending" | "connected" | "error";
  reminderSent?: boolean;
  lastReminderDate?: string;
}

interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: string;
  locationId: string;
  takesBookings: boolean;
  avatar?: string;
  assignmentType?: string;
  calendar?: Record<string, unknown>;
  comboId?: string;
  isNew?: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  locationId: string;
  priceType?: "fixed" | "variable";
  priceMin?: number;
  priceMax?: number;
}

interface ServiceLocationCombo {
  id: string;
  locationId: string;
  locationName: string;
  address: string;
  cardType: string;
  services: Service[];
  resources: CalendarResource[];
  employees?: Employee[];
  employeeId?: string;
  employeeName?: string;
  employeeAvatar?: string;
  employeeCalendar?: Record<string, unknown>;
  combinedFromServices?: Record<string, unknown>[];
  logicType?: string;
  combiningAllowed?: boolean;
  requirements?: RequirementItem[];
}

interface LocationCalendar {
  id: string;
  name: string;
  address: string;
  serviceCount: number;
  resourceCount: number;
  calendar: {
    provider: string;
    connectionStatus: string;
    calendarId: string;
    calendarName: string;
  };
  settings: {
    bufferTime: number;
    businessHoursOverride: boolean;
  };
}

interface RequirementItem {
  id?: string;
  displayName?: string;
  logicOperator?: string;
  type?: string;
}

const calendarProviders = [
  { id: "google", name: "Google Calendar" },
  { id: "outlook", name: "Outlook/Office 365" },
  { id: "apple", name: "Apple Calendar" },
  { id: "caldav", name: "CalDAV" },
  { id: "custom", name: "Custom Integration" },
];

export default function CalendarIntegrationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthCore();

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);
  // State management
  const [loading, setLoading] = useState(true);
  const [bookingStrategy, setBookingStrategy] = useState<BookingStrategyId>("hybrid");
  const [combiningMode, setCombiningMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [expandedCards, setExpandedCards] = useState<string[]>([]);
  const [serviceLocationCombos, setServiceLocationCombos] = useState<ServiceLocationCombo[]>([]);
  const [locationCalendars, setLocationCalendars] = useState<LocationCalendar[]>([]);
  const [resourceCalendars, setResourceCalendars] = useState<CalendarResource[]>([]);
  const [employeeCalendars, setEmployeeCalendars] = useState<Employee[]>([]);

  // Modal states (keeping only booking requirements modal for now)
  const [bookingRequirementsModalOpen, setBookingRequirementsModalOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<ServiceLocationCombo | null>(null);
  const [isSavingRequirements, setIsSavingRequirements] = useState(false);

  // Business calendar state
  const [businessCalendar, setBusinessCalendar] = useState({
    provider: "",
    connectionStatus: "disconnected",
    calendarId: "",
    calendarName: "",
  });

  const [busyCalendars] = useState<
    Array<{
      id: string;
      name: string;
      provider: string;
      connectionStatus: string;
    }>
  >([]);

  const [pendingEmployeeConnections, setPendingEmployeeConnections] = useState<
    Array<{
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
      status: "pending" | "connected" | "error";
    }>
  >([]);
  const [calendarAssignments, setCalendarAssignments] = useState<CalendarAssignment[]>([]);

  // Calendar management data for strategy renderers
  const [calendarManagementData, setCalendarManagementData] = useState<
    | {
        cronofyCalendars: Array<{
          profile_id: string;
          calendar_id: string;
          profile_name: string;
          calendar_name: string;
          provider_name: string;
          calendar_deleted: boolean;
          calendar_primary: boolean;
          is_busy_calendar: boolean;
          permission_level: string;
          calendar_readonly: boolean;
          is_primary_booking: boolean;
          is_booking_calendar: boolean;
          calendar_attachments_available: boolean;
          calendar_integrated_conferencing_available: boolean;
        }>;
        calendarAssignments: Array<{
          id: string;
          assignmentId: string;
          busyCalendars: Array<{
            calendarId: string;
            entityType: string;
          }>;
          assignmentName: string;
          assignmentType: string;
          defaultBookingCalendar: {
            calendarId: string;
            entityType: string;
          };
        }>;
        cronofyElementToken: string;
      }
    | undefined
  >(undefined);

  // Employee service assignment data for employee-based strategy
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [employeeServiceAssignmentData, setEmployeeServiceAssignmentData] = useState<{
    services: Array<{
      id: string;
      name: string;
      category: string;
      anonymous: boolean;
      basePrice: number;
      locations: string[];
      baseDuration: number;
      requiresEmployee: boolean;
    }>;
    employees: Array<{
      id: string;
      role: string;
      email: string;
      fullName: string;
      locationId: string;
      takesBookings: boolean;
    }>;
    locations: Array<{
      id: string;
      name: string;
      type: string;
      address: string;
    }>;
    assignments: Array<{
      enabled: boolean;
      visible: boolean;
      serviceId: string;
      employeeId: string;
      locationId: string;
    }>;
  }>({
    services: [],
    employees: [],
    locations: [],
    assignments: [],
  });

  // Save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRoutingPrevious, setIsRoutingPrevious] = useState(false);

  // Debug: Log when serviceLocationCombos changes
  useEffect(() => {
    console.log("=== SERVICE LOCATION COMBOS STATE CHANGED ===");
    console.log("Total combos:", serviceLocationCombos.length);
    console.log(
      "Combos with requirements:",
      serviceLocationCombos.filter((c) => c.requirements && c.requirements.length > 0).length
    );
    serviceLocationCombos.forEach((combo, index) => {
      console.log(
        `Combo ${index + 1}: ${combo.employeeName} - Requirements: ${combo.requirements?.length || 0}`
      );
    });

    // Debug: Check the first combo's requirements in detail after state change
    if (serviceLocationCombos.length > 0) {
      const firstCombo = serviceLocationCombos[0];
      console.log("=== FIRST COMBO AFTER STATE SET ===");
      console.log("First combo:", firstCombo);
      console.log("First combo requirements:", firstCombo.requirements);
      console.log("First combo requirements type:", typeof firstCombo.requirements);
      console.log("First combo requirements length:", firstCombo.requirements?.length);
    }
  }, [serviceLocationCombos]);

  const saveCalendarIntegrationData = useCallback(async () => {
    try {
      setIsSaving(true);

      const stepData = {
        combiningMode,
        serviceLocationCombos,
        locationCalendars,
        resourceCalendars,
        employeeCalendars,
        businessCalendar,
        busyCalendars,
        calendarAssignments,
        pendingEmployeeConnections,
      };

      console.log("Saving calendar integration data:", stepData);

      // Debug: Check if all combos have requirements
      const combosWithRequirements = stepData.serviceLocationCombos.filter(
        (combo) => combo.requirements && combo.requirements.length > 0
      );
      const combosWithoutRequirements = stepData.serviceLocationCombos.filter(
        (combo) => !combo.requirements || combo.requirements.length === 0
      );

      console.log(
        "Combos WITH requirements:",
        combosWithRequirements.length,
        combosWithRequirements.map((c) => ({
          id: c.id,
          employeeName: c.employeeName,
          requirements: c.requirements,
        }))
      );
      console.log(
        "Combos WITHOUT requirements:",
        combosWithoutRequirements.length,
        combosWithoutRequirements.map((c) => ({ id: c.id, employeeName: c.employeeName }))
      );

      // Debug: Check requirements structure
      stepData.serviceLocationCombos.forEach((combo, index) => {
        console.log(`Combo ${index + 1} (${combo.employeeName}):`, {
          id: combo.id,
          hasRequirements: !!(combo.requirements && combo.requirements.length > 0),
          requirementsCount: combo.requirements?.length || 0,
          requirements: combo.requirements,
        });
      });

      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: OnboardingStep.CALENDAR_INTEGRATION_NEW,
          stepData,
          currentStep: OnboardingStep.CALENDAR_INTEGRATION_NEW,
        }),
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving calendar integration data:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    combiningMode,
    serviceLocationCombos,
    locationCalendars,
    resourceCalendars,
    employeeCalendars,
    businessCalendar,
    busyCalendars,
    calendarAssignments,
    pendingEmployeeConnections,
  ]);

  // Auto-save every 30 seconds when there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      const autoSaveInterval = setInterval(() => {
        saveCalendarIntegrationData();
      }, 30000);

      return () => clearInterval(autoSaveInterval);
    }
  }, [hasUnsavedChanges, saveCalendarIntegrationData]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadCalendarIntegrationData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🔄 Starting loadCalendarIntegrationData...");

      // Load all required data in parallel
      const [
        businessLocationResponse,
        businessTeamMembersResponse,
        bookingStrategyResponse,
        businessResourcesResponse,
        cardStudioResponse,
        serviceLocationResponse,
        calendarIntegrationResponse,
        calendarManagementResponse,
        employeeServiceAssignmentResponse,
      ] = await Promise.all([
        fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_LOCATION}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_TEAM_MEMBERS}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.BOOKING_STRATEGY}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_RESOURCES}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.CARD_STUDIO}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.SERVICE_LOCATION}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.CALENDAR_INTEGRATION_NEW}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.CALENDAR_MANAGEMENT}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT}`),
      ]);
      // Process responses
      const businessLocationData = businessLocationResponse.ok
        ? await businessLocationResponse.json()
        : { draftData: {} };

      const businessTeamMembersData = businessTeamMembersResponse.ok
        ? await businessTeamMembersResponse.json()
        : { draftData: {} };

      const bookingStrategyData = bookingStrategyResponse.ok
        ? await bookingStrategyResponse.json()
        : { draftData: { selectedStrategy: "hybrid" } };

      const businessResourcesData = businessResourcesResponse.ok
        ? await businessResourcesResponse.json()
        : { draftData: {} };

      const cardStudioData = cardStudioResponse.ok
        ? await cardStudioResponse.json()
        : { draftData: {} };

      const serviceLocationData = serviceLocationResponse.ok
        ? await serviceLocationResponse.json()
        : { draftData: {} };

      const calendarIntegrationData = calendarIntegrationResponse.ok
        ? await calendarIntegrationResponse.json()
        : { draftData: {} };

      // Process calendar management data from the Promise.all response
      const calendarManagementData = calendarManagementResponse.ok
        ? await calendarManagementResponse.json()
        : { draftData: {} };

      const employeeServiceAssignmentData = employeeServiceAssignmentResponse.ok
        ? await employeeServiceAssignmentResponse.json()
        : { draftData: {} };

      console.log("🔍 Calendar Management Response Debug:");
      console.log("  - calendarManagementResponse.ok:", calendarManagementResponse.ok);
      console.log("  - calendarManagementResponse.status:", calendarManagementResponse.status);
      console.log("  - Raw calendarManagementData:", calendarManagementData);
      console.log("  - calendarManagementData.draftData:", calendarManagementData.draftData);
      console.log(
        "  - calendarManagementData.draft?.draft_data:",
        calendarManagementData.draft?.draft_data
      );

      console.log("📡 API Responses loaded:");
      console.log("  - businessLocationData:", businessLocationData);
      console.log("  - businessTeamMembersData:", businessTeamMembersData);
      console.log("  - bookingStrategyData:", bookingStrategyData);
      console.log("  - businessResourcesData:", businessResourcesData);
      console.log("  - cardStudioData:", cardStudioData);
      console.log("  - serviceLocationData:", serviceLocationData);
      console.log("  - calendarManagementData:", calendarManagementData);
      console.log("  - employeeServiceAssignmentData:", employeeServiceAssignmentData);

      // Set employee service assignment data
      if (employeeServiceAssignmentData.draftData) {
        console.log(
          "🔧 Setting employee service assignment data:",
          employeeServiceAssignmentData.draftData
        );
        setEmployeeServiceAssignmentData(employeeServiceAssignmentData.draftData);
      }
      // Set booking strategy from saved data
      const savedStrategy = bookingStrategyData.draftData?.selectedStrategy || "hybrid";
      setBookingStrategy(savedStrategy as BookingStrategyId);

      // Check if we have saved combos (used later for conditional logic)
      const hasSavedCombos = calendarIntegrationData.draftData?.serviceLocationCombos?.length > 0;

      // Restore saved calendar integration data if it exists
      if (calendarIntegrationData.draftData) {
        const savedData = calendarIntegrationData.draftData;

        // Note: We don't restore bookingStrategy from saved data - it comes from the booking strategy step

        if (savedData.combiningMode !== undefined) {
          setCombiningMode(savedData.combiningMode);
        }

        if (savedData.serviceLocationCombos) {
          console.log("Loading saved service location combos:", savedData.serviceLocationCombos);

          // Debug: Check requirements in loaded data
          const loadedCombosWithRequirements = savedData.serviceLocationCombos.filter(
            (combo: ServiceLocationCombo) => combo.requirements && combo.requirements.length > 0
          );
          const loadedCombosWithoutRequirements = savedData.serviceLocationCombos.filter(
            (combo: ServiceLocationCombo) => !combo.requirements || combo.requirements.length === 0
          );

          console.log(
            "LOADED - Combos WITH requirements:",
            loadedCombosWithRequirements.length,
            loadedCombosWithRequirements.map((c: ServiceLocationCombo) => ({
              id: c.id,
              employeeName: c.employeeName,
              requirements: c.requirements,
            }))
          );
          console.log(
            "LOADED - Combos WITHOUT requirements:",
            loadedCombosWithoutRequirements.length,
            loadedCombosWithoutRequirements.map((c: ServiceLocationCombo) => ({
              id: c.id,
              employeeName: c.employeeName,
            }))
          );

          // Debug: Check the first combo's requirements in detail
          if (savedData.serviceLocationCombos.length > 0) {
            const firstCombo = savedData.serviceLocationCombos[0];
            console.log("=== FIRST COMBO DEBUG ===");
            console.log("First combo:", firstCombo);
            console.log("First combo requirements:", firstCombo.requirements);
            console.log("First combo requirements type:", typeof firstCombo.requirements);
            console.log("First combo requirements length:", firstCombo.requirements?.length);
          }

          // Use saved combos directly instead of recreating them
          console.log("=== USING SAVED COMBOS DIRECTLY ===");
          setServiceLocationCombos(savedData.serviceLocationCombos);

          // Also set other saved data if available (but calendar management data will override these)
          if (savedData.locationCalendars) {
            setLocationCalendars(savedData.locationCalendars);
          }
          if (savedData.resourceCalendars) {
            setResourceCalendars(savedData.resourceCalendars);
          }
          if (savedData.employeeCalendars) {
            setEmployeeCalendars(savedData.employeeCalendars);
          }
          if (savedData.businessCalendar) {
            setBusinessCalendar(savedData.businessCalendar);
          }

          // Don't return early - we still need to process calendar management data
          // setLoading(false);
          // return; // Exit early to avoid recreating combos
        }

        if (savedData.locationCalendars) {
          setLocationCalendars(savedData.locationCalendars);
        }

        if (savedData.resourceCalendars) {
          setResourceCalendars(savedData.resourceCalendars);
        }

        if (savedData.employeeCalendars) {
          setEmployeeCalendars(savedData.employeeCalendars);
        }

        if (savedData.businessCalendar) {
          setBusinessCalendar(savedData.businessCalendar);
        }

        if (savedData.calendarAssignments) {
          setCalendarAssignments(savedData.calendarAssignments);
        }
        if (savedData.pendingEmployeeConnections) {
          setPendingEmployeeConnections(savedData.pendingEmployeeConnections);
        }
      }

      // Load calendar data from calendar management step (takes precedence over saved data)
      console.log("📅 Processing calendar management data...");

      // Handle different possible data structures
      let calMgmtDraftData = calendarManagementData.draftData;
      if (!calMgmtDraftData || Object.keys(calMgmtDraftData).length === 0) {
        // Try alternative data access path
        calMgmtDraftData = calendarManagementData.draft?.draft_data;
      }

      console.log("  - calendarManagementData.draftData:", calendarManagementData.draftData);
      console.log(
        "  - calendarManagementData.draft?.draft_data:",
        calendarManagementData.draft?.draft_data
      );
      console.log("  - Final calMgmtDraftData:", calMgmtDraftData);
      console.log(
        "  - Has calendar management data:",
        !!(calMgmtDraftData && Object.keys(calMgmtDraftData).length > 0)
      );
      console.log("  - Has saved combos:", hasSavedCombos);

      if (calMgmtDraftData && Object.keys(calMgmtDraftData).length > 0) {
        console.log("✅ Using calendar management data");
        const calMgmtData = calMgmtDraftData as Record<string, unknown>;

        // Handle the new calendar management API response structure
        if (calMgmtData.calendarAssignments && Array.isArray(calMgmtData.calendarAssignments)) {
          console.log(
            "📋 Setting calendar assignments from calendar management:",
            calMgmtData.calendarAssignments
          );
          console.log(
            "📋 Calendar assignments details:",
            JSON.stringify(calMgmtData.calendarAssignments, null, 2)
          );

          // Process the new calendar assignments structure
          const newApiAssignments = (
            calMgmtData.calendarAssignments as Array<{
              id: string;
              assignmentId: string;
              busyCalendars: Array<{
                calendarId: string;
                entityType: string;
              }>;
              assignmentName: string;
              assignmentType: string;
              defaultBookingCalendar: {
                calendarId: string;
                entityType: string;
              };
            }>
          ).map((assignment) => {
            // Convert the new API structure to the expected CalendarAssignment format
            const calendarAssignment: CalendarAssignment = {
              entityType: assignment.assignmentType as "employee" | "resource" | "location",
              entityId: assignment.assignmentId,
              calendarId: assignment.defaultBookingCalendar.calendarId,
              isPending: assignment.defaultBookingCalendar.calendarId === "configure_later",
            };
            return calendarAssignment;
          });

          console.log("🔄 Converted calendar assignments:", newApiAssignments);

          // Fix: Ensure all employees have calendar assignments
          const assignments = [...newApiAssignments];

          // Get all employee IDs from calendar management data
          // In the new API structure, employees are embedded in calendarAssignments
          const employeeAssignments = newApiAssignments.filter((a) => a.entityType === "employee");
          const allEmployeeIds = employeeAssignments.map((a) => a.entityId);

          console.log("👥 Found employee assignments:", employeeAssignments.length);
          console.log("👥 Employee IDs:", allEmployeeIds);

          setCalendarAssignments(assignments);

          // Also store the new API format for strategy renderers
          setCalendarManagementData({
            cronofyCalendars: calMgmtData.cronofyCalendars as Array<{
              profile_id: string;
              calendar_id: string;
              profile_name: string;
              calendar_name: string;
              provider_name: string;
              calendar_deleted: boolean;
              calendar_primary: boolean;
              is_busy_calendar: boolean;
              permission_level: string;
              calendar_readonly: boolean;
              is_primary_booking: boolean;
              is_booking_calendar: boolean;
              calendar_attachments_available: boolean;
              calendar_integrated_conferencing_available: boolean;
            }>,
            calendarAssignments: calMgmtData.calendarAssignments as Array<{
              id: string;
              assignmentId: string;
              busyCalendars: Array<{
                calendarId: string;
                entityType: string;
              }>;
              assignmentName: string;
              assignmentType: string;
              defaultBookingCalendar: {
                calendarId: string;
                entityType: string;
              };
            }>,
            cronofyElementToken: calMgmtData.cronofyElementToken as string,
          });
        }
        if (calMgmtData.pendingEmployeeConnections) {
          setPendingEmployeeConnections(
            calMgmtData.pendingEmployeeConnections as PendingEmployeeConnection[]
          );
        }

        // Also use entities from calendar management if available (ensures consistency)
        console.log("👥 Processing employees from calendar management...");

        // Extract employees from calendarAssignments in the new API structure
        if (calMgmtData.calendarAssignments && Array.isArray(calMgmtData.calendarAssignments)) {
          const employeeAssignments = (
            calMgmtData.calendarAssignments as Array<{
              id: string;
              assignmentId: string;
              assignmentName: string;
              assignmentType: string;
              defaultBookingCalendar: {
                calendarId: string;
                entityType: string;
              };
            }>
          ).filter((assignment) => assignment.assignmentType === "employee");

          if (employeeAssignments.length > 0) {
            const calMgmtEmployees = employeeAssignments.map((assignment) => {
              // Try to get employee name from business team members data as fallback
              const teamMemberData = businessTeamMembersData?.draftData;
              let fallbackName = `Employee ${assignment.assignmentId}`;

              if (teamMemberData) {
                // Look for employee in team members data
                for (const locationId in teamMemberData) {
                  const locationData = teamMemberData[locationId];
                  if (locationData.teamMembers) {
                    const teamMember = locationData.teamMembers.find(
                      (member: { id: string; fullName: string }) =>
                        member.id === assignment.assignmentId
                    );
                    if (teamMember && teamMember.fullName) {
                      fallbackName = teamMember.fullName;
                      break;
                    }
                  }
                }
              }

              const finalName = assignment.assignmentName?.trim() || fallbackName;

              return {
                id: assignment.assignmentId,
                fullName: finalName,
                email: "", // Not available in new API structure
                role: "", // Not available in new API structure
                locationId: "", // Not available in new API structure
                takesBookings: true, // Default to true
                avatar: "",
                assignmentType: "",
                calendar: {},
                comboId: "",
                isNew: false,
              };
            });

            setEmployeeCalendars(calMgmtEmployees);
          }
        }

        console.log("📍 Processing locations from calendar management...");

        // Extract locations from calendarAssignments in the new API structure
        if (calMgmtData.calendarAssignments && Array.isArray(calMgmtData.calendarAssignments)) {
          const locationAssignments = (
            calMgmtData.calendarAssignments as Array<{
              id: string;
              assignmentId: string;
              assignmentName: string;
              assignmentType: string;
              defaultBookingCalendar: {
                calendarId: string;
                entityType: string;
              };
            }>
          ).filter((assignment) => assignment.assignmentType === "location");

          if (locationAssignments.length > 0) {
            const resolveLocationNameFromBusinessData = (locationId: string) => {
              // Physical addresses
              const physical = (
                businessLocationData.draftData?.["serviceTypes.physical"]?.addresses || []
              ).find((addr: { id: string; name: string }) => addr.id === locationId);
              if (physical?.name) return physical.name;

              // Virtual services
              const virtual = (
                businessLocationData.draftData?.["serviceTypes.virtual"]?.virtualServices || []
              ).find((svc: { id: string; name: string }) => svc.id === locationId);
              if (virtual?.name) return virtual.name;

              // Mobile services
              const mobile = (
                businessLocationData.draftData?.["serviceTypes.mobile"]?.mobileServices || []
              ).find((svc: { id: string; name: string }) => svc.id === locationId);
              if (mobile?.name) return mobile.name;

              return "";
            };

            const calMgmtLocations = locationAssignments.map((assignment) => {
              const resolvedName = resolveLocationNameFromBusinessData(assignment.assignmentId);
              const name =
                assignment.assignmentName && assignment.assignmentName.trim().length > 0
                  ? assignment.assignmentName
                  : resolvedName || `Location ${assignment.assignmentId}`;
              return {
                id: assignment.assignmentId,
                name,
                address: "", // Not available in new API structure
                serviceCount: 0,
                resourceCount: 0,
                calendar: {
                  provider: "",
                  connectionStatus: "disconnected",
                  calendarId: assignment.defaultBookingCalendar?.calendarId as string,
                  calendarName: "",
                },
                settings: {
                  bufferTime: 0,
                  businessHoursOverride: false,
                },
              } as LocationCalendar;
            });

            console.log(
              "✅ Setting locations from calendar management:",
              calMgmtLocations.length,
              "locations"
            );
            console.log("✅ Location details:", calMgmtLocations);
            setLocationCalendars(calMgmtLocations);
          }
        }

        console.log("🪑 Processing resources from calendar management...");

        // Extract resources from calendarAssignments in the new API structure
        if (calMgmtData.calendarAssignments && Array.isArray(calMgmtData.calendarAssignments)) {
          const resourceAssignments = (
            calMgmtData.calendarAssignments as Array<{
              id: string;
              assignmentId: string;
              assignmentName: string;
              assignmentType: string;
              defaultBookingCalendar: {
                calendarId: string;
                entityType: string;
              };
            }>
          ).filter((assignment) => assignment.assignmentType === "resource");

          if (resourceAssignments.length > 0) {
            const resolveResourceNameFromBusinessData = (resourceId: string) => {
              const entries = Object.values(businessResourcesData.draftData || {}) as Array<{
                resources?: Array<{ id: string; name: string; type: string; description: string }>;
              }>;
              for (const entry of entries) {
                const found = (entry.resources || []).find((r) => r.id === resourceId);
                if (found?.name) return found.name;
              }
              return "";
            };

            const calMgmtResources = resourceAssignments.map((assignment) => {
              const resolvedName = resolveResourceNameFromBusinessData(assignment.assignmentId);
              const name =
                assignment.assignmentName && assignment.assignmentName.trim().length > 0
                  ? assignment.assignmentName
                  : resolvedName || `Resource ${assignment.assignmentId}`;
              return {
                id: assignment.assignmentId,
                name,
                email: "",
                type: "resource", // Default type
                description: "",
                calendar: {
                  provider: "",
                  calendarId: assignment.defaultBookingCalendar?.calendarId as string,
                  calendarName: "",
                  connectionStatus: "disconnected",
                },
                comboId: "",
                bookingLogic: "",
                isNew: false,
                locationId: "", // Not available in new API structure
                capacity: {
                  maxConcurrent: 1,
                  bufferTime: 0,
                },
              } as CalendarResource;
            });

            console.log(
              "✅ Setting resources from calendar management:",
              calMgmtResources.length,
              "resources"
            );
            console.log("✅ Resource details:", calMgmtResources);
            setResourceCalendars(calMgmtResources);
          }
        }
      }

      // Only load from business steps if we don't have saved combos
      const hasCalendarManagementData =
        calendarManagementData.draftData &&
        Object.keys(calendarManagementData.draftData).length > 0;

      console.log("🔍 Combo creation decision:");
      console.log("  - hasCalendarManagementData:", hasCalendarManagementData);
      console.log("  - hasSavedCombos:", hasSavedCombos);
      console.log("  - Should create combos:", !hasSavedCombos);

      if (!hasSavedCombos) {
        // Process locations from business location data
        const loadedLocations: Array<{
          id: string;
          name: string;
          type: string;
          address: string;
          resources: unknown[];
        }> = [];

        // Process physical locations
        if (businessLocationData.draftData?.["serviceTypes.physical"]?.addresses) {
          businessLocationData.draftData["serviceTypes.physical"].addresses.forEach(
            (address: {
              id: string;
              name: string;
              line1: string;
              city: string;
              state: string;
              zipCode: string;
            }) => {
              loadedLocations.push({
                id: address.id,
                name: address.name,
                type: "physical",
                address: `${address.line1}, ${address.city}, ${address.state} ${address.zipCode}`,
                resources: [],
              });
            }
          );
        }

        // Process virtual services
        if (businessLocationData.draftData?.["serviceTypes.virtual"]?.virtualServices) {
          const virtualServices =
            businessLocationData.draftData["serviceTypes.virtual"].virtualServices;
          virtualServices.forEach(
            (virtualService: {
              id: string;
              name: string;
              platform: string;
              timezone: string;
              defaultLink: string;
              instructions: string;
            }) => {
              loadedLocations.push({
                id: virtualService.id,
                name: virtualService.name,
                type: "virtual",
                address: `Platform: ${virtualService.platform} | Timezone: ${virtualService.timezone}`,
                resources: [],
              });
            }
          );
        }

        // Process mobile services
        if (businessLocationData.draftData?.["serviceTypes.mobile"]?.mobileServices) {
          const mobileServices =
            businessLocationData.draftData["serviceTypes.mobile"].mobileServices;
          mobileServices.forEach(
            (mobileService: {
              id: string;
              name: string;
              serviceArea: {
                type: string;
                radius?: number;
                zipCenter?: string;
                zipCodesRaw?: string;
              };
            }) => {
              // Create address string from service area
              let addressString = "";
              if (mobileService.serviceArea.type === "zipcodes") {
                addressString = `Service Area: ${mobileService.serviceArea.zipCodesRaw}`;
              } else if (mobileService.serviceArea.type === "radius") {
                addressString = `Service Area: ${mobileService.serviceArea.radius} miles from ${mobileService.serviceArea.zipCenter}`;
              } else {
                addressString = `Mobile Service Area`;
              }

              loadedLocations.push({
                id: mobileService.id,
                name: mobileService.name,
                type: "mobile",
                address: addressString,
                resources: [],
              });
            }
          );
        }

        // Process employees from team members data
        const loadedEmployees: Employee[] = [];
        (
          Object.values(businessTeamMembersData.draftData || {}) as Array<{
            teamMembers: Array<{
              id: string;
              fullName: string;
              email: string;
              role: string;
              locationId: string;
              takesBookings: boolean;
            }>;
          }>
        ).forEach((locationData) => {
          if (locationData.teamMembers) {
            locationData.teamMembers.forEach(
              (employee: {
                id: string;
                fullName: string;
                email: string;
                role: string;
                locationId: string;
                takesBookings: boolean;
              }) => {
                loadedEmployees.push({
                  id: employee.id,
                  fullName: employee.fullName,
                  email: employee.email,
                  role: employee.role,
                  locationId: employee.locationId,
                  takesBookings: employee.takesBookings,
                });
              }
            );
          }
        });

        // Process resources from business resources data
        const loadedResources: CalendarResource[] = [];
        // The business resources data structure has location ID as the key, not as a property
        Object.entries(businessResourcesData.draftData || {}).forEach(
          ([locationId, locationData]) => {
            const locationResources =
              (
                locationData as {
                  resources?: Array<{
                    id: string;
                    name: string;
                    type: string;
                    description: string;
                  }>;
                }
              )?.resources || [];
            if (Array.isArray(locationResources)) {
              locationResources.forEach(
                (resource: { id: string; name: string; type: string; description: string }) => {
                  loadedResources.push({
                    id: resource.id,
                    name: resource.name,
                    type: resource.type,
                    description: resource.description,
                    locationId: locationId, // Use the location ID from the key
                  });
                }
              );
            }
          }
        );

        // Process services from service location data
        const loadedServices: Service[] = [];
        if (serviceLocationData.draftData?.services) {
          // Get all services with their delivery options and pricing info
          const allServices = serviceLocationData.draftData.services.map(
            (service: ServiceLocationService) => ({
              id: service.id,
              name: service.name,
              price: service.price,
              priceType: service.priceType,
              priceMin: service.priceMin,
              priceMax: service.priceMax,
              deliveryOptions: service.deliveryOptions || {
                inPerson: true,
                mobile: false,
                virtual: false,
              },
            })
          );

          // Get enabled configurations to filter services
          const enabledConfigurations =
            serviceLocationData.draftData?.configurations?.filter(
              (config: ServiceLocationConfiguration) => config.enabled
            ) || [];

          console.log("🔍 Service processing debug:");
          console.log("  - All services:", allServices);
          console.log("  - Enabled configurations:", enabledConfigurations);

          // Create a mapping from service location IDs to business location IDs
          const locationIdMapping: Record<string, string> = {
            "mobile-service": "mobile", // Map service location ID to business location ID
          };

          // Process each enabled configuration
          enabledConfigurations.forEach((config: ServiceLocationConfiguration) => {
            const service = allServices.find(
              (s: ServiceLocationService) => s.id === config.serviceId
            );
            if (service) {
              // Map the service location ID to the business location ID
              const mappedLocationId = locationIdMapping[config.locationId] || config.locationId;

              // Find the location for this configuration
              const location = loadedLocations.find((loc) => loc.id === mappedLocationId);
              if (location) {
                // Check if service delivery options match location type
                const canOffer =
                  (location.type === "physical" && service.deliveryOptions.inPerson) ||
                  (location.type === "mobile" && service.deliveryOptions.mobile) ||
                  (location.type === "virtual" && service.deliveryOptions.virtual);

                if (canOffer) {
                  // Apply custom pricing if present, otherwise use base pricing
                  const priceType = config.customPriceType || service.priceType || "fixed";
                  const price = config.customPrice ?? service.price ?? 0;
                  const priceMin = config.customPriceMin ?? service.priceMin;
                  const priceMax = config.customPriceMax ?? service.priceMax;

                  loadedServices.push({
                    id: service.id,
                    name: service.name,
                    price: price,
                    priceType: priceType,
                    priceMin: priceMin,
                    priceMax: priceMax,
                    locationId: mappedLocationId, // Use the mapped location ID
                  });
                  console.log(
                    `✅ Added service "${service.name}" for ${location.type} location "${location.name}" (mapped from ${config.locationId} to ${mappedLocationId})`
                  );
                } else {
                  console.log(
                    `❌ Skipped service "${service.name}" - delivery options don't match ${location.type} location`
                  );
                }
              } else {
                console.log(
                  `❌ Location not found for service "${service.name}" - looking for location ID: ${mappedLocationId}`
                );
              }
            }
          });

          console.log("  - Final loadedServices:", loadedServices);
        }

        console.log("🚀 About to start combo creation...");
        console.log("  - savedStrategy:", savedStrategy);
        console.log("  - Should create combos:", !hasSavedCombos);

        // Create service location combinations based on strategy
        const combos: ServiceLocationCombo[] = [];
        console.log("🔧 Starting combo creation with strategy:", savedStrategy);
        console.log("🔧 Available data:");
        console.log("  - loadedLocations:", loadedLocations);
        console.log("  - loadedServices:", loadedServices);
        console.log("  - loadedResources:", loadedResources);
        console.log("  - loadedEmployees:", loadedEmployees);
        console.log("  - serviceLocationData.draftData:", serviceLocationData.draftData);

        if (savedStrategy === "employee") {
          // Employee-based strategy: Create combinations for each employee using assignment data
          console.log("🔧 Employee-based strategy: Using employeeServiceAssignmentData");
          console.log("  - employeeServiceAssignmentData:", employeeServiceAssignmentData);

          // Check if employeeServiceAssignmentData has the required structure
          const assignmentData =
            employeeServiceAssignmentData?.draftData || employeeServiceAssignmentData;
          if (
            !assignmentData ||
            !assignmentData.assignments ||
            !Array.isArray(assignmentData.assignments)
          ) {
            console.warn(
              "🔧 Employee-based strategy: employeeServiceAssignmentData is missing or invalid, falling back to default logic"
            );
            console.log("  - employeeServiceAssignmentData:", employeeServiceAssignmentData);
            console.log("  - assignmentData:", assignmentData);
            console.log("  - assignments:", assignmentData?.assignments);

            // Fall back to the original logic for now
            loadedEmployees.forEach((employee) => {
              const employeeLocation = loadedLocations.find(
                (loc) => loc.id === employee.locationId
              );
              const employeeResources = loadedResources.filter(
                (r: CalendarResource) => r.locationId === employee.locationId
              );

              // Get services for this employee's location from configurations
              const employeeServiceConfigs =
                serviceLocationData.draftData?.configurations?.filter(
                  (config: {
                    locationId: string;
                    enabled: boolean;
                    serviceId: string;
                    maxCapacity: number;
                    requiredResources: string[];
                  }) => config.locationId === employee.locationId && config.enabled
                ) || [];

              const employeeServices = employeeServiceConfigs
                .map(
                  (config: {
                    locationId: string;
                    enabled: boolean;
                    serviceId: string;
                    maxCapacity: number;
                    requiredResources: string[];
                  }) => {
                    const service = loadedServices.find((s) => s.id === config.serviceId);
                    return service
                      ? {
                          ...service,
                          locationId: employee.locationId,
                          maxCapacity: config.maxCapacity,
                          requiredResources: config.requiredResources || [],
                        }
                      : null;
                  }
                )
                .filter(Boolean) as Service[];

              combos.push({
                id: `combo-${employee.locationId}-${employee.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                locationId: employee.locationId,
                locationName: (employeeLocation?.name as string) || "Unknown Location",
                address: (employeeLocation?.address as string) || "",
                employeeId: employee.id,
                employeeName: employee.fullName,
                cardType: "employee-location",
                services: employeeServices,
                resources: employeeResources.map((r) => ({
                  ...r,
                  calendar: {
                    provider: "",
                    calendarId: "",
                    calendarName: "",
                    connectionStatus: "disconnected",
                  },
                  bookingLogic: "required",
                  capacity: {
                    maxConcurrent: 1,
                    bufferTime: 0,
                  },
                })),
                employeeCalendar: {
                  employeeId: employee.id,
                  employeeName: employee.fullName,
                  calendar: {
                    provider: "",
                    calendarId: "",
                    calendarName: "",
                    connectionStatus: "disconnected",
                  },
                  availability: {
                    bufferTime: 0,
                    serviceRestrictions: [],
                  },
                },
                logicType: "any",
                combinedFromServices: [],
                combiningAllowed: true,
              });
            });
          } else {
            // Group assignments by employee
            const assignmentsByEmployee = assignmentData.assignments.reduce(
              (
                acc: Record<string, EmployeeServiceAssignment[]>,
                assignment: EmployeeServiceAssignment
              ) => {
                if (!acc[assignment.employeeId]) {
                  acc[assignment.employeeId] = [];
                }
                acc[assignment.employeeId].push(assignment);
                return acc;
              },
              {} as Record<string, EmployeeServiceAssignment[]>
            );

            console.log("  - assignmentsByEmployee:", assignmentsByEmployee);

            // Create combos for each employee
            Object.entries(assignmentsByEmployee).forEach(([employeeId, employeeAssignments]) => {
              const employee = assignmentData.employees.find(
                (emp: EmployeeServiceAssignmentEmployee) => emp.id === employeeId
              );
              if (!employee) {
                console.warn(`Employee ${employeeId} not found in assignmentData`);
                return;
              }

              console.log(`🔧 Processing employee: ${employee.fullName} (${employeeId})`);
              console.log(`  - Employee assignments:`, employeeAssignments);

              // Group assignments by location for this employee
              const assignmentsByLocation = (
                employeeAssignments as EmployeeServiceAssignment[]
              ).reduce(
                (
                  acc: Record<string, EmployeeServiceAssignment[]>,
                  assignment: EmployeeServiceAssignment
                ) => {
                  if (!acc[assignment.locationId]) {
                    acc[assignment.locationId] = [];
                  }
                  acc[assignment.locationId].push(assignment);
                  return acc;
                },
                {} as Record<string, EmployeeServiceAssignment[]>
              );

              console.log(
                `  - Assignments by location for ${employee.fullName}:`,
                assignmentsByLocation
              );

              // Create a combo for each location this employee works at
              Object.entries(assignmentsByLocation).forEach(([locationId, locationAssignments]) => {
                const location = assignmentData.locations.find(
                  (loc: EmployeeServiceAssignmentLocation) => loc.id === locationId
                );
                if (!location) {
                  console.warn(`Location ${locationId} not found in assignmentData`);
                  return;
                }

                console.log(
                  `🔧 Processing location: ${location.name} (${locationId}) for employee ${employee.fullName}`
                );
                console.log(`  - Location assignments:`, locationAssignments);

                // Get services for this employee at this location from assignments
                const employeeServices = (locationAssignments as EmployeeServiceAssignment[])
                  .filter(
                    (assignment: EmployeeServiceAssignment) =>
                      assignment.enabled && assignment.visible
                  )
                  .map((assignment: EmployeeServiceAssignment) => {
                    const service = assignmentData.services.find(
                      (s: EmployeeServiceAssignmentService) => s.id === assignment.serviceId
                    );
                    if (!service) {
                      console.warn(`Service ${assignment.serviceId} not found in assignmentData`);
                      return null;
                    }

                    // Get full service details from service location data for pricing info
                    const fullService = serviceLocationData.draftData?.services?.find(
                      (s: ServiceLocationService) => s.id === service.id
                    );

                    // Get configuration for custom pricing
                    const config = serviceLocationData.draftData?.configurations?.find(
                      (c: ServiceLocationConfiguration) =>
                        c.serviceId === service.id && c.locationId === locationId && c.enabled
                    );

                    // Apply custom pricing if present, otherwise use base/full service pricing
                    const priceType = config?.customPriceType || fullService?.priceType || "fixed";
                    const price = config?.customPrice ?? fullService?.price ?? service.basePrice;
                    const priceMin = config?.customPriceMin ?? fullService?.priceMin;
                    const priceMax = config?.customPriceMax ?? fullService?.priceMax;

                    return {
                      id: service.id,
                      name: service.name,
                      price: price,
                      priceType: priceType,
                      priceMin: priceMin,
                      priceMax: priceMax,
                      locationId: locationId,
                    };
                  })
                  .filter(Boolean) as Service[];

                console.log(
                  `  - Services for ${employee.fullName} at ${location.name}:`,
                  employeeServices
                );

                if (employeeServices.length > 0) {
                  const employeeResources = loadedResources.filter(
                    (r: CalendarResource) => r.locationId === locationId
                  );

                  combos.push({
                    id: `combo-${employeeId}-${locationId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    locationId: locationId,
                    locationName: location.name,
                    address: location.address,
                    employeeId: employee.id,
                    employeeName: employee.fullName,
                    cardType: "employee-location",
                    services: employeeServices,
                    resources: employeeResources.map((r) => ({
                      ...r,
                      calendar: {
                        provider: "",
                        calendarId: "",
                        calendarName: "",
                        connectionStatus: "disconnected",
                      },
                      bookingLogic: "required",
                      capacity: {
                        maxConcurrent: 1,
                        bufferTime: 0,
                      },
                    })),
                    employeeCalendar: {
                      employeeId: employee.id,
                      employeeName: employee.fullName,
                      calendar: {
                        provider: "",
                        calendarId: "",
                        calendarName: "",
                        connectionStatus: "disconnected",
                      },
                      availability: {
                        bufferTime: 0,
                        serviceRestrictions: [],
                      },
                    },
                    logicType: "any",
                    combinedFromServices: [],
                    combiningAllowed: true,
                  });

                  console.log(`✅ Created combo for ${employee.fullName} at ${location.name}:`, {
                    employeeName: employee.fullName,
                    locationName: location.name,
                    services: employeeServices.map((s) => s.name),
                  });
                }
              });
            });
          }
        } else if (savedStrategy === "resource") {
          // Resource-based strategy: Create a combo for each individual resource
          console.log("🔧 Resource-based strategy - Processing resources:", loadedResources);
          console.log("🔧 Available services:", loadedServices);

          // Create a combo for each resource
          loadedResources.forEach((resource) => {
            console.log("🔧 Processing resource:", resource);

            // Find the location for this resource
            const location = loadedLocations.find((loc) => loc.id === resource.locationId);
            if (!location) {
              console.log(
                `❌ Location not found for resource ${resource.name} (locationId: ${resource.locationId})`
              );
              return;
            }

            // Get all services that can be offered at this location
            const locationServices = loadedServices.filter(
              (service) => service.locationId === location.id
            );

            console.log(
              `🔧 Found ${locationServices.length} services for resource ${resource.name} at location ${location.name}`
            );

            // Create a combo for this resource
            combos.push({
              id: `combo-${resource.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              locationId: location.id,
              locationName: `${location.name} - ${resource.name}`, // Include resource name in card title
              address: location.address,
              cardType: "resource", // Use resource card type
              services: locationServices,
              resources: [
                {
                  ...resource,
                  calendar: {
                    provider: "",
                    calendarId: "",
                    connectionStatus: "disconnected",
                    calendarName: "",
                  },
                  bookingLogic: "required",
                  capacity: {
                    maxConcurrent: 1,
                    bufferTime: 0,
                  },
                },
              ],
              employees: [], // Resources don't have employees
              logicType: "any",
              combinedFromServices: [],
              combiningAllowed: false, // Resources are individual
            });

            console.log(`✅ Created combo for resource ${resource.name}:`, {
              resourceName: resource.name,
              locationName: location.name,
              services: locationServices.map((s) => s.name),
            });
          });
        } else if (savedStrategy === "hybrid") {
          // Hybrid strategy: Create location-employee combinations
          console.log("🔧 Hybrid strategy: Creating employee-location combinations");

          // Step 1: Get all unique employees by email address from business_team_members
          // Group employees by email to handle same person at multiple locations
          const employeesByEmail = new Map<
            string,
            Array<{
              id: string;
              email: string;
              fullName: string;
              role: string;
              locationId: string;
              takesBookings: boolean;
            }>
          >();

          // Iterate through all locations in business_team_members
          Object.entries(businessTeamMembersData.draftData || {}).forEach(
            ([locationId, locationData]) => {
              const teamMembers =
                (
                  locationData as {
                    teamMembers?: Array<{
                      id: string;
                      fullName: string;
                      email: string;
                      role: string;
                      locationId: string;
                      takesBookings: boolean;
                    }>;
                  }
                )?.teamMembers || [];

              teamMembers.forEach((member) => {
                if (!employeesByEmail.has(member.email)) {
                  employeesByEmail.set(member.email, []);
                }
                employeesByEmail.get(member.email)!.push({
                  ...member,
                  locationId: locationId, // Use the key from business_team_members
                });
              });
            }
          );

          console.log("🔧 Employees grouped by email:", employeesByEmail);

          // Create a mapping from business_team_members location IDs to actual location IDs
          // business_team_members uses specific location IDs that should map directly to loadedLocations
          const locationIdMap = new Map<string, string>();

          loadedLocations.forEach((loc) => {
            // Map each location by its actual ID - no special handling needed
            locationIdMap.set(loc.id as string, loc.id as string);
          });

          console.log("🔧 Location ID mapping:", locationIdMap);

          // Get employee service assignment data for service filtering
          const assignmentData =
            employeeServiceAssignmentData?.draftData || employeeServiceAssignmentData;

          if (
            assignmentData &&
            assignmentData.assignments &&
            Array.isArray(assignmentData.assignments)
          ) {
            console.log("🔧 Using employee service assignment data for filtering services");

            // Step 2: For each unique employee (by email), create cards for each location they work at
            employeesByEmail.forEach((employeeInstances, email) => {
              console.log(`🔧 Processing employee with email: ${email}`);
              console.log(`  - Works at ${employeeInstances.length} location(s)`);

              // For each location this employee works at
              employeeInstances.forEach((employeeAtLocation) => {
                const businessTeamMembersLocationId = employeeAtLocation.locationId;

                // Map the business_team_members location ID to the actual location ID
                const actualLocationId = locationIdMap.get(businessTeamMembersLocationId);

                console.log(
                  `  - Checking ${employeeAtLocation.fullName} at location ${businessTeamMembersLocationId} (maps to ${actualLocationId})`
                );

                if (!actualLocationId) {
                  console.warn(
                    `Could not map location ${businessTeamMembersLocationId} to an actual location`
                  );
                  return;
                }

                // Find the location details from loaded locations using the mapped ID
                const location = loadedLocations.find((loc) => loc.id === actualLocationId);
                if (!location) {
                  console.warn(`Location ${actualLocationId} not found in loaded locations`);
                  return;
                }

                // Find services this employee offers at this specific location
                // Look for assignments that match this employee's email and this location
                // Use the actual location ID directly - no special mapping needed
                const assignmentLocationId = actualLocationId;

                console.log(
                  `    - Looking for assignments with locationId: ${assignmentLocationId}`
                );

                const employeeAssignmentsAtLocation = assignmentData.assignments.filter(
                  (assignment: EmployeeServiceAssignment) => {
                    // Find the employee in assignment data by matching email
                    const assignmentEmployee = assignmentData.employees.find(
                      (emp: EmployeeServiceAssignmentEmployee) =>
                        emp.id === assignment.employeeId && emp.email === email
                    );

                    return (
                      assignmentEmployee &&
                      assignment.locationId === assignmentLocationId &&
                      assignment.enabled &&
                      assignment.visible
                    );
                  }
                );

                console.log(
                  `    - Found ${employeeAssignmentsAtLocation.length} service assignment(s) at this location`
                );

                // Get the services for these assignments
                const employeeServices = employeeAssignmentsAtLocation
                  .map((assignment: EmployeeServiceAssignment) => {
                    const service = assignmentData.services.find(
                      (s: EmployeeServiceAssignmentService) => s.id === assignment.serviceId
                    );
                    if (!service) return null;

                    // Get full service details from service location data for pricing info
                    const fullService = serviceLocationData.draftData?.services?.find(
                      (s: ServiceLocationService) => s.id === service.id
                    );

                    // Get configuration for custom pricing
                    const config = serviceLocationData.draftData?.configurations?.find(
                      (c: ServiceLocationConfiguration) =>
                        c.serviceId === service.id && c.locationId === actualLocationId && c.enabled
                    );

                    // Apply custom pricing if present, otherwise use base/full service pricing
                    const priceType = config?.customPriceType || fullService?.priceType || "fixed";
                    const price = config?.customPrice ?? fullService?.price ?? service.basePrice;
                    const priceMin = config?.customPriceMin ?? fullService?.priceMin;
                    const priceMax = config?.customPriceMax ?? fullService?.priceMax;

                    return {
                      id: service.id,
                      name: service.name,
                      price: price,
                      priceType: priceType,
                      priceMin: priceMin,
                      priceMax: priceMax,
                      locationId: actualLocationId,
                    };
                  })
                  .filter(Boolean) as Service[];

                console.log(
                  `    - Services: ${employeeServices.map((s) => s.name).join(", ") || "none"}`
                );

                // Only create a card if this employee offers at least one service at this location
                if (employeeServices.length > 0) {
                  // Get resources for this location
                  const locationResources = loadedResources.filter(
                    (r: CalendarResource) => r.locationId === actualLocationId
                  );

                  combos.push({
                    id: `combo-${actualLocationId}-${employeeAtLocation.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    locationId: actualLocationId,
                    locationName: location.name as string,
                    address: (location.address as string) || "",
                    employeeId: employeeAtLocation.id,
                    employeeName: employeeAtLocation.fullName,
                    cardType: "employee-location",
                    services: employeeServices,
                    resources: locationResources.map((r) => ({
                      ...r,
                      calendar: {
                        provider: "",
                        calendarId: "",
                        calendarName: "",
                        connectionStatus: "disconnected",
                      },
                      bookingLogic: "required",
                      capacity: {
                        maxConcurrent: 1,
                        bufferTime: 0,
                      },
                    })),
                    employeeCalendar: {
                      employeeId: employeeAtLocation.id,
                      employeeName: employeeAtLocation.fullName,
                      calendar: {
                        provider: "",
                        calendarId: "",
                        calendarName: "",
                        connectionStatus: "disconnected",
                      },
                      availability: {
                        bufferTime: 0,
                        serviceRestrictions: [],
                      },
                    },
                    logicType: "any",
                    combinedFromServices: [],
                    combiningAllowed: true,
                  });

                  console.log(
                    `✅ Created hybrid combo for ${employeeAtLocation.fullName} at ${location.name}:`,
                    {
                      employeeName: employeeAtLocation.fullName,
                      locationName: location.name,
                      services: employeeServices.map((s) => s.name),
                    }
                  );
                } else {
                  console.log(
                    `⏭️ Skipped ${employeeAtLocation.fullName} at ${location.name} - no services offered`
                  );
                }
              });
            });
          } else {
            console.warn(
              "🔧 Hybrid strategy: No employee service assignment data available, falling back to location-based logic"
            );

            // Fallback to location-based logic if no assignment data
            loadedLocations.forEach((location) => {
              // Get services for this location from configurations
              const locationServiceConfigs =
                serviceLocationData.draftData?.configurations?.filter(
                  (config: {
                    locationId: string;
                    enabled: boolean;
                    serviceId: string;
                    maxCapacity: number;
                    requiredResources: string[];
                  }) => config.locationId === location.id && config.enabled
                ) || [];

              const locationServices = locationServiceConfigs
                .map(
                  (config: {
                    locationId: string;
                    enabled: boolean;
                    serviceId: string;
                    maxCapacity: number;
                    requiredResources: string[];
                  }) => {
                    const service = loadedServices.find((s) => s.id === config.serviceId);
                    return service
                      ? {
                          ...service,
                          locationId: location.id as string,
                          maxCapacity: config.maxCapacity,
                          requiredResources: config.requiredResources || [],
                        }
                      : null;
                  }
                )
                .filter(Boolean) as Service[];

              const locationEmployees = loadedEmployees.filter((e) => e.locationId === location.id);
              const locationResources = loadedResources.filter(
                (r: CalendarResource) => r.locationId === location.id
              );

              combos.push({
                id: `combo-${location.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                locationId: location.id as string,
                locationName: location.name as string,
                address: (location.address as string) || "",
                cardType: "location",
                services: locationServices,
                resources: locationResources.map((r) => ({
                  ...r,
                  calendar: {
                    provider: "",
                    calendarId: "",
                    calendarName: "",
                    connectionStatus: "disconnected",
                  },
                  bookingLogic: "required",
                  capacity: {
                    maxConcurrent: 1,
                    bufferTime: 0,
                  },
                })),
                employees: locationEmployees.map((e) => ({
                  ...e,
                  calendar: {
                    provider: "",
                    calendarId: "",
                    calendarName: "",
                    connectionStatus: "disconnected",
                  },
                  availability: {
                    bufferTime: 0,
                    serviceRestrictions: [],
                  },
                  assignmentType: "optional",
                })),
                logicType: "any",
                combinedFromServices: [],
                combiningAllowed: true,
              });
            });
          }

          // Step 3: Create generic location cards for locations without employees but with service marketing cards
          console.log(
            "🔧 Hybrid strategy: Creating generic location cards for locations with service marketing cards"
          );

          // Get service marketing cards from card studio data
          const serviceMarketingCards =
            cardStudioData.draftData?.cards?.filter(
              (card: { type: string; locationId: string; serviceId: string }) =>
                card.type === "service"
            ) || [];

          console.log("🔧 Service marketing cards found:", serviceMarketingCards.length);
          console.log("🔧 Service marketing cards:", serviceMarketingCards);

          // Track which locations have employee combos
          const locationsWithEmployees = new Set(combos.map((combo) => combo.locationId));

          console.log("🔧 Locations with employees:", Array.from(locationsWithEmployees));

          // For each location, check for service marketing cards (regardless of whether it has employees)
          loadedLocations.forEach((location) => {
            console.log(
              `🔧 Checking location ${location.name} (${location.id}) for service marketing cards`
            );

            // Find service marketing cards for this location
            const locationServiceCards = serviceMarketingCards.filter(
              (card: { type: string; locationId: string; serviceId: string }) =>
                card.locationId === location.id
            );

            console.log(
              `  - Found ${locationServiceCards.length} service marketing cards for this location`
            );

            if (locationServiceCards.length > 0) {
              // Extract unique service IDs from these cards
              const serviceIds = [
                ...new Set(
                  locationServiceCards.map(
                    (card: { type: string; locationId: string; serviceId: string }) =>
                      card.serviceId
                  )
                ),
              ];

              console.log(`  - Unique service IDs: ${serviceIds.join(", ")}`);

              // Get service details for these IDs
              const locationServices = serviceIds
                .map((serviceId) => {
                  // Find service in assignment data
                  const assignmentService = assignmentData?.services?.find(
                    (s: { id: string; name: string; basePrice: number }) => s.id === serviceId
                  );

                  if (!assignmentService) {
                    console.warn(`Service ${serviceId} not found in assignment data`);
                    return null;
                  }

                  // Get full service details from service location data for pricing info
                  const fullService = serviceLocationData.draftData?.services?.find(
                    (s: ServiceLocationService) => s.id === serviceId
                  );

                  // Get configuration for custom pricing
                  const config = serviceLocationData.draftData?.configurations?.find(
                    (c: ServiceLocationConfiguration) =>
                      c.serviceId === serviceId && c.locationId === location.id && c.enabled
                  );

                  // Apply custom pricing if present, otherwise use base/full service pricing
                  const priceType = config?.customPriceType || fullService?.priceType || "fixed";
                  const price =
                    config?.customPrice ?? fullService?.price ?? assignmentService.basePrice;
                  const priceMin = config?.customPriceMin ?? fullService?.priceMin;
                  const priceMax = config?.customPriceMax ?? fullService?.priceMax;

                  return {
                    id: serviceId,
                    name: assignmentService.name,
                    price: price,
                    priceType: priceType,
                    priceMin: priceMin,
                    priceMax: priceMax,
                    locationId: location.id,
                  };
                })
                .filter(Boolean) as Service[];

              console.log(
                `  - Built ${locationServices.length} services for generic location card`
              );

              if (locationServices.length > 0) {
                // Get resources for this location
                const locationResources = loadedResources.filter(
                  (r: CalendarResource) => r.locationId === location.id
                );

                // Create generic location card
                combos.push({
                  id: `combo-location-${location.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  locationId: location.id,
                  locationName: location.name,
                  address: location.address,
                  cardType: "location",
                  services: locationServices,
                  resources: locationResources.map((r) => ({
                    ...r,
                    calendar: {
                      provider: "",
                      calendarId: "",
                      calendarName: "",
                      connectionStatus: "disconnected",
                    },
                    bookingLogic: "required",
                    capacity: {
                      maxConcurrent: 1,
                      bufferTime: 0,
                    },
                  })),
                  employees: [],
                  logicType: "any",
                  combinedFromServices: [],
                  combiningAllowed: true,
                });

                console.log(`✅ Created generic location card for ${location.name}:`, {
                  locationName: location.name,
                  services: locationServices.map((s) => s.name),
                });
              } else {
                console.log(`⏭️ Skipped ${location.name} - no valid services found`);
              }
            } else {
              console.log(`⏭️ Skipped ${location.name} - no service marketing cards found`);
            }
          });
        } else {
          // Location-based strategy: Create combinations for each location
          loadedLocations.forEach((location) => {
            // Get services for this location from configurations
            const locationServiceConfigs =
              serviceLocationData.draftData?.configurations?.filter(
                (config: {
                  locationId: string;
                  enabled: boolean;
                  serviceId: string;
                  maxCapacity: number;
                  requiredResources: string[];
                }) => config.locationId === location.id && config.enabled
              ) || [];

            const locationServices = locationServiceConfigs
              .map(
                (config: {
                  locationId: string;
                  enabled: boolean;
                  serviceId: string;
                  maxCapacity: number;
                  requiredResources: string[];
                }) => {
                  const service = loadedServices.find((s) => s.id === config.serviceId);
                  return service
                    ? {
                        ...service,
                        locationId: location.id as string,
                        maxCapacity: config.maxCapacity,
                        requiredResources: config.requiredResources || [],
                      }
                    : null;
                }
              )
              .filter(Boolean) as Service[];

            const locationEmployees = loadedEmployees.filter((e) => e.locationId === location.id);
            const locationResources = loadedResources.filter(
              (r: CalendarResource) => r.locationId === location.id
            );

            combos.push({
              id: `combo-${location.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              locationId: location.id as string,
              locationName: location.name as string,
              address: (location.address as string) || "",
              cardType: "location",
              services: locationServices,
              resources: locationResources.map((r) => ({
                ...r,
                calendar: {
                  provider: "",
                  calendarId: "",
                  calendarName: "",
                  connectionStatus: "disconnected",
                },
                bookingLogic: "required",
                capacity: {
                  maxConcurrent: 1,
                  bufferTime: 0,
                },
              })),
              employees: locationEmployees.map((e) => ({
                ...e,
                calendar: {
                  provider: "",
                  calendarId: "",
                  calendarName: "",
                  connectionStatus: "disconnected",
                },
                availability: {
                  bufferTime: 0,
                  serviceRestrictions: [],
                },
                assignmentType: "optional",
              })),
              logicType: "any",
              combinedFromServices: [],
              combiningAllowed: true,
            });
          });
        }

        console.log("🔧 Final combo creation results:");
        console.log("  - Total combos created:", combos.length);
        console.log("  - Combos:", combos);

        setServiceLocationCombos(combos);

        // Set up location calendars for location-based strategy
        const locationCalendarsData: LocationCalendar[] = loadedLocations.map((location) => {
          const locationType = location.type as string;
          let calendarName = (location.name as string) || "Unknown Location";

          // Add type-specific suffix to calendar name
          if (locationType === "virtual") {
            calendarName += " (Virtual)";
          } else if (locationType === "mobile") {
            calendarName += " (Mobile)";
          }

          return {
            id: location.id as string,
            name: calendarName,
            address: (location.address as string) || "",
            serviceCount: combos.find((c) => c.locationId === location.id)?.services.length || 0,
            resourceCount: combos.find((c) => c.locationId === location.id)?.resources.length || 0,
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
          };
        });

        setLocationCalendars(locationCalendarsData);
        setResourceCalendars(loadedResources);
        setEmployeeCalendars(loadedEmployees);
      } // End of business data loading conditional

      // Set up pending employee connections for employee-based strategy
      if (savedStrategy === "employee") {
        const pendingConnections = employeeCalendars.map((employee: Employee) => ({
          employeeId: employee.id,
          employeeName: employee.fullName,
          employeeEmail: employee.email,
          status: "pending" as const,
        }));
        setPendingEmployeeConnections(pendingConnections);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading calendar integration data:", error);
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load data on component mount
  useEffect(() => {
    loadCalendarIntegrationData();
  }, [loadCalendarIntegrationData]);

  // Event handlers
  const handleCombiningModeChange = (enabled: boolean) => {
    setCombiningMode(enabled);
    if (!enabled) {
      setSelectedCards([]);
    }
    setHasUnsavedChanges(true);
  };

  // Check if a card can be combined based on booking strategy and current selections
  const canCombineCard = (comboId: string) => {
    if (selectedCards.length >= 2) {
      return false; // Already have 2 cards selected
    }

    if (selectedCards.length === 0) {
      return true; // Can select first card
    }

    // Get the currently selected card
    const selectedCard = serviceLocationCombos.find((combo) => combo.id === selectedCards[0]);
    const candidateCard = serviceLocationCombos.find((combo) => combo.id === comboId);

    if (!selectedCard || !candidateCard) {
      return false;
    }

    // Strategy-based restrictions
    if (bookingStrategy === "employee") {
      // For employee-based strategy, both cards must have the same employee and location
      return (
        selectedCard.employeeId === candidateCard.employeeId &&
        selectedCard.locationId === candidateCard.locationId
      );
    } else if (bookingStrategy === "hybrid") {
      // For hybrid strategy, need to distinguish between employee and location cards
      const selectedIsEmployeeCard = !!selectedCard.employeeId;
      const candidateIsEmployeeCard = !!candidateCard.employeeId;

      // Employee cards and location cards cannot be combined together
      if (selectedIsEmployeeCard !== candidateIsEmployeeCard) {
        return false;
      }

      // If both are employee cards, must have same employee and location
      if (selectedIsEmployeeCard && candidateIsEmployeeCard) {
        return (
          selectedCard.employeeId === candidateCard.employeeId &&
          selectedCard.locationId === candidateCard.locationId
        );
      }

      // If both are location cards, must have same location
      return selectedCard.locationId === candidateCard.locationId;
    } else if (["location", "resource"].includes(bookingStrategy)) {
      // For location/resource strategies, both cards must have the same location
      return selectedCard.locationId === candidateCard.locationId;
    }

    return false;
  };

  const handleCardSelection = (comboId: string) => {
    if (selectedCards.includes(comboId)) {
      // Remove from selection
      setSelectedCards(selectedCards.filter((id) => id !== comboId));
    } else {
      // Check if this card can be combined
      if (canCombineCard(comboId)) {
        setSelectedCards([...selectedCards, comboId]);
      }
    }
  };

  const handleToggleCardExpansion = (comboId: string) => {
    if (expandedCards.includes(comboId)) {
      setExpandedCards(expandedCards.filter((id) => id !== comboId));
    } else {
      setExpandedCards([...expandedCards, comboId]);
    }
  };

  const handleEditRequirements = (combo: ServiceLocationCombo) => {
    setSelectedCombo(combo);
    setBookingRequirementsModalOpen(true);
  };

  const handleSplitService = (comboId: string, serviceId: string) => {
    // Find the combo to split
    const comboToSplit = serviceLocationCombos.find((combo) => combo.id === comboId);
    if (!comboToSplit || comboToSplit.services.length <= 1) {
      return; // Can't split if there's only one service
    }

    // Find the service to split out
    const serviceToSplit = comboToSplit.services.find((service) => service.id === serviceId);
    if (!serviceToSplit) {
      return;
    }

    // Create new combo with just the split service
    const newCombo: ServiceLocationCombo = {
      id: `${comboId}-split-${serviceId}`,
      locationId: comboToSplit.locationId,
      locationName: comboToSplit.locationName,
      address: comboToSplit.address,
      cardType: comboToSplit.cardType,
      services: [serviceToSplit], // Only the split service
      resources: [...comboToSplit.resources], // Copy all resources
      employees: comboToSplit.employees ? [...comboToSplit.employees] : undefined,
      employeeId: comboToSplit.employeeId,
      employeeName: comboToSplit.employeeName,
      employeeAvatar: comboToSplit.employeeAvatar,
      employeeCalendar: comboToSplit.employeeCalendar,
      combinedFromServices: [],
      logicType: comboToSplit.logicType,
      combiningAllowed: comboToSplit.combiningAllowed,
      requirements: comboToSplit.requirements ? [...comboToSplit.requirements] : [],
    };

    // Remove the service from the original combo
    const updatedOriginalCombo = {
      ...comboToSplit,
      services: comboToSplit.services.filter((service) => service.id !== serviceId),
    };

    // Update the service location combos
    setServiceLocationCombos((prevCombos) => {
      const updatedCombos = prevCombos.map((combo) =>
        combo.id === comboId ? updatedOriginalCombo : combo
      );

      // Add the new split combo
      return [...updatedCombos, newCombo];
    });

    setHasUnsavedChanges(true);
  };

  const handleConnectionTest = (type: string, id?: string) => {
    // Implementation for testing connections
    console.log("Testing connection:", type, id);
  };

  const generateRequirementString = (
    requirements: RequirementItem[],
    combo?: ServiceLocationCombo
  ) => {
    if (!requirements || requirements.length === 0) return "No requirements set";

    let baseRequirements = "";
    if (requirements.length === 1) {
      baseRequirements = requirements[0].displayName || "Unknown requirement";
    } else {
      let result = "";
      let currentGroup = "";
      let inOrGroup = false;

      requirements.forEach((item, index) => {
        if (index === 0) {
          currentGroup = item.displayName || "Unknown requirement";
        } else {
          const operator = item.logicOperator || "AND";

          if (operator === "OR") {
            if (!inOrGroup) {
              currentGroup = `(${currentGroup}`;
              inOrGroup = true;
            }
            currentGroup += ` OR ${item.displayName}`;
          } else {
            // AND
            if (inOrGroup) {
              currentGroup += `)`;
              inOrGroup = false;
            }
            result += (result ? " AND " : "") + currentGroup;
            currentGroup = item.displayName || "Unknown requirement";
          }
        }
      });

      if (inOrGroup) {
        currentGroup += `)`;
      }
      result += (result ? " AND " : "") + currentGroup;
      baseRequirements = result;
    }

    // Add calendar assignment status
    if (combo) {
      const calendarStatus = getCalendarAssignmentStatus(combo);
      if (calendarStatus === "pending") {
        return `${baseRequirements} (calendar pending)`;
      } else if (calendarStatus === "assigned") {
        return `${baseRequirements} (calendar connected)`;
      } else {
        return `${baseRequirements} (calendar not assigned)`;
      }
    }

    return baseRequirements;
  };

  const getCalendarAssignmentStatus = (combo: ServiceLocationCombo) => {
    if (combo.employeeId) {
      // Employee-based combo
      const assignment = calendarAssignments.find(
        (a) => a.entityType === "employee" && a.entityId === combo.employeeId
      );
      if (!assignment) return "unassigned";

      // Check if this is a placeholder assignment
      if (assignment.calendarId === "configure_later" || assignment.isPending) {
        return "pending";
      }

      return "assigned";
    } else if (bookingStrategy === "resource" && combo.resources && combo.resources.length > 0) {
      // Resource-based strategy - check if all required resources have calendar assignments
      console.log("🔍 Checking calendar assignments for resource combo:", combo.id);
      console.log(
        "  - combo.resources:",
        combo.resources.map((r) => ({ id: r.id, name: r.name }))
      );
      console.log("  - available calendarAssignments:", calendarAssignments);

      const resourceAssignments = combo.resources.map((resource) =>
        calendarAssignments.find((a) => a.entityType === "resource" && a.entityId === resource.id)
      );

      console.log("  - resourceAssignments:", resourceAssignments);

      // If any resource doesn't have an assignment, it's unassigned
      if (resourceAssignments.some((assignment) => !assignment)) {
        return "unassigned";
      }

      // If any resource has a placeholder assignment, it's pending
      if (
        resourceAssignments.some(
          (assignment) =>
            assignment && (assignment.calendarId === "configure_later" || assignment.isPending)
        )
      ) {
        console.log("  - Result: pending (some resources have placeholder assignments)");
        return "pending";
      }

      console.log("  - Result: assigned (all resources have calendar assignments)");
      return "assigned";
    } else {
      // Location-based combo
      const assignment = calendarAssignments.find(
        (a) => a.entityType === "location" && a.entityId === combo.locationId
      );
      if (!assignment) return "unassigned";

      // Check if this is a placeholder assignment
      if (assignment.calendarId === "configure_later" || assignment.isPending) {
        return "pending";
      }

      return "assigned";
    }
  };

  const areAllRequirementsConfigured = () => {
    // New rule: if each combo has any requirements (non-empty array), allow Continue
    const allCombosHaveRequirements = serviceLocationCombos.every((combo) => {
      const reqs = combo.requirements || [];
      return reqs.length > 0;
    });

    return allCombosHaveRequirements;
  };

  const handleSave = async () => {
    console.log("=== SAVE Draft BUTTON CLICKED ===");
    console.log("Current serviceLocationCombos state:", serviceLocationCombos);
    console.log(
      "Current serviceLocationCombos with requirements:",
      serviceLocationCombos.filter((c) => c.requirements && c.requirements.length > 0)
    );
    return await saveCalendarIntegrationData();
  };

  const handleContinue = async () => {
    const saved = await saveCalendarIntegrationData();
    if (saved) {
      router.push(goNext(calendarIntegrationNewPage)?.pageRef ?? "");
    }
  };

  const handleBack = () => {
    setIsRoutingPrevious(true);
    router.push(goPrevious(calendarIntegrationNewPage)?.pageRef ?? "");
  };

  // Render strategy content
  const renderStrategyContent = () => {
    switch (bookingStrategy) {
      case "simple":
        return (
          <SimpleStrategyRendererNew
            businessCalendar={businessCalendar}
            calendarProviders={calendarProviders}
            onBusinessCalendarChange={setBusinessCalendar}
            onConnectionTest={handleConnectionTest}
          />
        );
      case "location":
        return (
          <LocationBasedStrategyRendererNew
            serviceLocationCombos={serviceLocationCombos}
            expandedCards={expandedCards}
            selectedCards={selectedCards}
            combiningMode={combiningMode}
            canCombineCard={canCombineCard}
            onToggleCardExpansion={handleToggleCardExpansion}
            onCardSelection={handleCardSelection}
            onEditRequirements={handleEditRequirements}
            onSplitService={handleSplitService}
            generateRequirementString={generateRequirementString}
          />
        );
      case "employee":
        console.log("🔧 Rendering employee strategy with combos:", serviceLocationCombos);
        return (
          <EmployeeBasedStrategyRendererNew
            serviceLocationCombos={serviceLocationCombos}
            expandedCards={expandedCards}
            selectedCards={selectedCards}
            combiningMode={combiningMode}
            canCombineCard={canCombineCard}
            onToggleCardExpansion={handleToggleCardExpansion}
            onCardSelection={handleCardSelection}
            onEditRequirements={handleEditRequirements}
            onSplitService={handleSplitService}
            generateRequirementString={generateRequirementString}
          />
        );
      case "resource":
        return (
          <ResourceBasedStrategyRendererNew
            serviceLocationCombos={serviceLocationCombos}
            expandedCards={expandedCards}
            selectedCards={selectedCards}
            combiningMode={combiningMode}
            canCombineCard={canCombineCard}
            onToggleCardExpansion={handleToggleCardExpansion}
            onCardSelection={handleCardSelection}
            onEditRequirements={handleEditRequirements}
            onSplitService={handleSplitService}
            generateRequirementString={generateRequirementString}
          />
        );
      case "hybrid":
        return (
          <HybridStrategyRendererNew
            serviceLocationCombos={serviceLocationCombos}
            expandedCards={expandedCards}
            selectedCards={selectedCards}
            combiningMode={combiningMode}
            canCombineCard={canCombineCard}
            onToggleCardExpansion={handleToggleCardExpansion}
            onCardSelection={handleCardSelection}
            onEditRequirements={handleEditRequirements}
            onSplitService={handleSplitService}
            generateRequirementString={generateRequirementString}
          />
        );
      default:
        return (
          <LocationBasedStrategyRendererNew
            serviceLocationCombos={serviceLocationCombos}
            expandedCards={expandedCards}
            selectedCards={selectedCards}
            combiningMode={combiningMode}
            canCombineCard={canCombineCard}
            onToggleCardExpansion={handleToggleCardExpansion}
            onCardSelection={handleCardSelection}
            onEditRequirements={handleEditRequirements}
            onSplitService={handleSplitService}
            generateRequirementString={generateRequirementString}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <LoadingSpinner size="md" />
            <p className="text-gray-600">Loading calendar integration data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <CalendarIntegrationHeader
          currentStep={getStepInfo("calendar-integration-new").currentStep}
          totalSteps={getStepInfo("calendar-integration-new").totalSteps}
          title="Calendar Integration Setup"
          subtitle="Configure booking requirements and service integrations for your calendar system"
          stepName={getStepInfo("calendar-integration-new").stepName}
          goPrevious={handleBack}
          user={user?.email ?? ""}
        />

        {/* Note about Calendar Management */}
        <div className="mb-8">
          <Note
            heading="Calendar Integration & Requirements"
            subheading="Your calendar connections are managed in the previous step. This page focuses on setting up booking requirements and service configurations for your integrated calendars."
            icon={Calendar}
            variant="blue"
          />
        </div>

        {/* Booking Strategy Display */}
        <BookingStrategyDisplay selectedStrategy={bookingStrategy} />

        {/* Combining Interface */}
        {["resource", "employee", "hybrid"].includes(bookingStrategy) && (
          <CombiningInterface
            combiningMode={combiningMode}
            selectedCards={selectedCards}
            bookingStrategy={bookingStrategy}
            onToggleCombining={() => handleCombiningModeChange(!combiningMode)}
            onCombineSelected={() => {
              if (selectedCards.length !== 2) return;

              const [firstCardId, secondCardId] = selectedCards;
              const firstCard = serviceLocationCombos.find((combo) => combo.id === firstCardId);
              const secondCard = serviceLocationCombos.find((combo) => combo.id === secondCardId);

              if (!firstCard || !secondCard) return;

              // Combine services from both cards
              const combinedServices = [...firstCard.services, ...secondCard.services];

              // Create new combined card
              const combinedCard: ServiceLocationCombo = {
                id: `${firstCardId}-combined-${secondCardId}`,
                locationId: firstCard.locationId,
                locationName: firstCard.locationName,
                address: firstCard.address,
                cardType: firstCard.cardType,
                services: combinedServices,
                resources: [...firstCard.resources, ...secondCard.resources],
                employees: firstCard.employees ? [...firstCard.employees] : undefined,
                employeeId: firstCard.employeeId,
                employeeName: firstCard.employeeName,
                employeeAvatar: firstCard.employeeAvatar,
                employeeCalendar: firstCard.employeeCalendar,
                combinedFromServices: [
                  { from: firstCardId, services: firstCard.services },
                  { from: secondCardId, services: secondCard.services },
                ],
                logicType: firstCard.logicType,
                combiningAllowed: firstCard.combiningAllowed,
                requirements: firstCard.requirements ? [...firstCard.requirements] : [],
              };

              // Remove original cards and add combined card
              setServiceLocationCombos((prevCombos) => {
                const filteredCombos = prevCombos.filter(
                  (combo) => combo.id !== firstCardId && combo.id !== secondCardId
                );
                return [...filteredCombos, combinedCard];
              });

              setCombiningMode(false);
              setSelectedCards([]);
              setHasUnsavedChanges(true);
            }}
            onCancelCombining={() => {
              setCombiningMode(false);
              setSelectedCards([]);
            }}
          />
        )}

        {/* Strategy Content */}
        {renderStrategyContent()}

        {/* Modals */}

        {/* Booking Requirements Dialog */}
        <Dialog open={bookingRequirementsModalOpen} onOpenChange={setBookingRequirementsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Booking Requirements</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <BookingRequirementsBuilder
                employees={employeeCalendars}
                resources={resourceCalendars}
                locationCalendars={locationCalendars}
                requirements={selectedCombo?.requirements || []}
                calendarAssignments={calendarAssignments}
                calendarManagementData={calendarManagementData}
                onRequirementsChange={(requirements) => {
                  if (selectedCombo) {
                    console.log("=== REQUIREMENTS CHANGED ===");
                    console.log("Combo ID:", selectedCombo.id);
                    console.log("Employee Name:", selectedCombo.employeeName);
                    console.log("New requirements:", requirements);
                    console.log(
                      "Requirements with OR/AND operators:",
                      requirements.map((r) => ({
                        displayName: r.displayName,
                        logicOperator: r.logicOperator,
                        type: r.type,
                      }))
                    );
                    setSelectedCombo({ ...selectedCombo, requirements });
                    setHasUnsavedChanges(true);
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBookingRequirementsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  setIsSavingRequirements(true);
                  if (selectedCombo) {
                    // Get the current requirements from the selectedCombo
                    const currentRequirements = selectedCombo.requirements || [];
                    console.log("=== SAVE REQUIREMENTS BUTTON CLICKED ===");
                    console.log(
                      "Saving requirements for combo:",
                      selectedCombo.id,
                      selectedCombo.employeeName
                    );
                    console.log("Current requirements:", currentRequirements);
                    console.log(
                      "Requirements with operators:",
                      currentRequirements.map((r) => ({
                        displayName: r.displayName,
                        logicOperator: r.logicOperator,
                        type: r.type,
                      }))
                    );

                    // Update the service location combos with the new requirements
                    const updatedCombos = serviceLocationCombos.map((combo) =>
                      combo.id === selectedCombo.id
                        ? { ...combo, requirements: currentRequirements }
                        : combo
                    );

                    console.log("Updated service location combos:", updatedCombos);
                    setServiceLocationCombos(updatedCombos);
                    setHasUnsavedChanges(true);

                    // Save the updated data immediately with the new state
                    const updatedStepData = {
                      combiningMode,
                      serviceLocationCombos: updatedCombos,
                      locationCalendars,
                      resourceCalendars,
                      employeeCalendars,
                      businessCalendar,
                      busyCalendars,
                    };

                    console.log("Saving with updated data:", updatedStepData);

                    const response = await fetch("/api/business/onboarding/draft", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        step: OnboardingStep.CALENDAR_INTEGRATION_NEW,
                        stepData: updatedStepData,
                        currentStep: OnboardingStep.CALENDAR_INTEGRATION_NEW,
                      }),
                    });

                    if (response.ok) {
                      setHasUnsavedChanges(false);
                      console.log("Successfully saved requirements");
                    } else {
                      console.error("Failed to save requirements");
                    }
                  }
                  setBookingRequirementsModalOpen(false);
                  setSelectedCombo(null);
                  setIsSavingRequirements(false);
                }}
                disabled={isSavingRequirements}
                loading={isSavingRequirements}
              >
                Save Requirements
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bottom Action Bar */}
        <BottomActionBar
          isSaving={isSaving}
          isRoutingPrevious={isRoutingPrevious}
          areAllRequirementsConfigured={areAllRequirementsConfigured()}
          onSave={handleSave}
          onContinue={handleContinue}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
