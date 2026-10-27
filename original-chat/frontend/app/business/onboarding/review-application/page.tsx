"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Send,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import OnboardingProgressBar from "../../../../components/onboarding/OnboardingProgressBar";
import { OnboardingStep } from "../../../constants/businessConstants";
import {
  goPrevious,
  reviewApplicationPage,
  ROUTE_DASHBOARD,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import { getStepInfo } from "../../../utils/onboardingSteps";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";

interface ConfigurationItem {
  id: string;
  title: string;
  status: "complete" | "warning" | "incomplete";
  description: string;
  icon: React.ReactNode;
  category: "required" | "recommended" | "optional";
}

interface LocationData {
  draftData?: {
    "serviceTypes.physical"?: {
      addresses?: unknown[];
    };
    "serviceTypes.mobile"?: {
      mobileServices?: unknown[];
    };
    "serviceTypes.virtual"?: {
      virtualServices?: unknown[];
    };
  };
}

interface TeamData {
  draftData?: {
    teamOption?: string;
  };
}

interface ServiceLocationData {
  draftData?: {
    services?: unknown[];
    configurations?: Array<{ enabled: boolean }>;
  };
}

interface CalendarIntegrationData {
  draftData?: {
    resourceCalendars?: unknown[];
    calendarAssignments?: Array<{
      entityType: "employee" | "resource" | "location";
      entityId: string;
      calendarId?: string;
      isPending?: boolean;
    }>;
    serviceLocationCombos?: Array<{
      employeeId?: string;
      requirements?: unknown[];
    }>;
  };
}

interface OnboardingData {
  locationData?: LocationData;
  teamData?: TeamData;
  serviceLocationData?: ServiceLocationData;
  calendarIntegrationData?: CalendarIntegrationData;
  bookingStrategyData?: { draftData?: { bookingStrategy?: string; selectedStrategy?: string } };
}

export default function ReviewApplicationPage() {
  const router = useRouter();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const { user, loading: authLoading } = useAuthCore();
  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);
  // Process real data into configuration items
  const getConfigurationItems = (): ConfigurationItem[] => {
    const items: ConfigurationItem[] = [];

    // Business Information - Always complete if we're at this step
    items.push({
      id: "business-profile",
      title: "Business Information",
      status: "complete",
      description: "Business name, category, contact details, and logo",
      icon: <Building className="h-5 w-5" />,
      category: "required",
    });

    // Locations
    const physicalLocationCount =
      onboardingData.locationData?.draftData?.["serviceTypes.physical"]?.addresses?.length || 0;
    const mobileServiceCount =
      onboardingData.locationData?.draftData?.["serviceTypes.mobile"]?.mobileServices?.length || 0;
    const virtualServiceCount =
      onboardingData.locationData?.draftData?.["serviceTypes.virtual"]?.virtualServices?.length ||
      0;
    const totalLocationCount = physicalLocationCount + mobileServiceCount + virtualServiceCount;

    // Create location description based on what's configured
    let locationDescription = "Physical locations, mobile service areas, and virtual setup";
    const locationParts: string[] = [];

    if (physicalLocationCount > 0) {
      locationParts.push(
        `${physicalLocationCount} physical location${physicalLocationCount !== 1 ? "s" : ""}`
      );
    }
    if (mobileServiceCount > 0) {
      locationParts.push(
        `${mobileServiceCount} mobile service${mobileServiceCount !== 1 ? "s" : ""}`
      );
    }
    if (virtualServiceCount > 0) {
      locationParts.push(
        `${virtualServiceCount} virtual service${virtualServiceCount !== 1 ? "s" : ""}`
      );
    }

    if (locationParts.length > 0) {
      locationDescription = locationParts.join(", ");
    }

    items.push({
      id: "locations",
      title: `${totalLocationCount} Location${totalLocationCount !== 1 ? "s" : ""} Configured`,
      status: totalLocationCount > 0 ? "complete" : "incomplete",
      description: locationDescription,
      icon: <MapPin className="h-5 w-5" />,
      category: "required",
    });

    // Services
    const serviceCount = onboardingData.serviceLocationData?.draftData?.services?.length || 0;
    const configuredServices =
      onboardingData.serviceLocationData?.draftData?.configurations?.filter(
        (config) => config.enabled
      )?.length || 0;
    const serviceStatus =
      serviceCount > 0 && configuredServices === serviceCount
        ? "complete"
        : serviceCount > 0
          ? "warning"
          : "incomplete";
    items.push({
      id: "services",
      title: `${serviceCount} Service${serviceCount !== 1 ? "s" : ""} Configured`,
      status: serviceStatus,
      description:
        configuredServices < serviceCount
          ? `${configuredServices} of ${serviceCount} services fully configured`
          : "All services configured across locations",
      icon: <Briefcase className="h-5 w-5" />,
      category: "recommended",
    });

    // Team Members
    const teamOption = onboardingData.teamData?.draftData?.teamOption;
    const teamStatus =
      teamOption === "alone" ? "complete" : teamOption === "team" ? "warning" : "incomplete";
    const teamDescription =
      teamOption === "alone"
        ? "Working alone - no team members needed"
        : teamOption === "team"
          ? "Team members configured"
          : "Team setup incomplete";
    items.push({
      id: "team-members",
      title: teamOption === "alone" ? "Solo Business Setup" : "Team Members",
      status: teamStatus,
      description: teamDescription,
      icon: <Users className="h-5 w-5" />,
      category: "recommended",
    });

    // Calendar Integration - adapt by booking strategy
    const calendarData = onboardingData.calendarIntegrationData?.draftData;
    const bookingStrategy =
      onboardingData.bookingStrategyData?.draftData?.bookingStrategy ||
      onboardingData.bookingStrategyData?.draftData?.selectedStrategy ||
      "unknown";

    if (bookingStrategy === "hybrid") {
      const combos = Array.isArray(calendarData?.serviceLocationCombos)
        ? calendarData?.serviceLocationCombos
        : [];
      const totalCombos = combos.length;
      const combosWithRequirements = combos.filter(
        (c) => Array.isArray(c.requirements) && c.requirements.length > 0
      ).length;
      const comboEmployeeIds = Array.from(
        new Set(
          combos
            .map((c) => c.employeeId)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        )
      );
      const assignments = Array.isArray(calendarData?.calendarAssignments)
        ? calendarData?.calendarAssignments
        : [];
      const employeeAssignments = assignments.filter((a) => a.entityType === "employee");
      const coveredEmployees = comboEmployeeIds.filter((id) =>
        employeeAssignments.some(
          (a) => a.entityId === id && (a.isPending || a.calendarId !== "configure_later")
        )
      ).length;

      const calendarStatus =
        totalCombos > 0 &&
        combosWithRequirements === totalCombos &&
        coveredEmployees === comboEmployeeIds.length
          ? "complete"
          : combosWithRequirements > 0 || coveredEmployees > 0
            ? "warning"
            : "incomplete";

      items.push({
        id: "calendar-strategy",
        title: "Calendar Strategy: Hybrid",
        status: calendarStatus,
        description:
          totalCombos > 0
            ? `${combosWithRequirements}/${totalCombos} combinations configured • ${coveredEmployees}/${comboEmployeeIds.length} employees have connected or pending calendars`
            : "No combinations configured for calendar integration",
        icon: <Calendar className="h-5 w-5" />,
        category: "recommended",
      });
    } else {
      const resourceCalendars = Array.isArray(calendarData?.resourceCalendars)
        ? calendarData?.resourceCalendars
        : [];
      const calendarAssignments = Array.isArray(calendarData?.calendarAssignments)
        ? calendarData?.calendarAssignments
        : [];
      const connectedCalendars = calendarAssignments.filter(
        (assignment) => !assignment.isPending
      ).length;
      const totalResources = resourceCalendars.length;

      const calendarStatus =
        connectedCalendars === totalResources && totalResources > 0
          ? "complete"
          : connectedCalendars > 0
            ? "warning"
            : "incomplete";

      items.push({
        id: "calendar-strategy",
        title: "Calendar Strategy: Resource-based",
        status: calendarStatus,
        description:
          totalResources > 0
            ? `${connectedCalendars} of ${totalResources} resources have connected calendars`
            : "No resources configured for calendar integration",
        icon: <Calendar className="h-5 w-5" />,
        category: "recommended",
      });
    }

    // Business Cards - Always complete if we're at this step (assuming they went through card studio)
    items.push({
      id: "business-cards",
      title: "Business Cards Designed",
      status: "complete",
      description: "Business, location, service, and resource cards configured",
      icon: <CreditCard className="h-5 w-5" />,
      category: "required",
    });

    return items;
  };

  const configurationItems = getConfigurationItems();

  const requiredItems = configurationItems.filter((item) => item.category === "required");
  const recommendedItems = configurationItems.filter(
    (item) =>
      item.category === "recommended" && item.id !== "services" && item.id !== "team-members"
  );
  // const optionalItems = configurationItems.filter((item) => item.category === "optional")

  const requiredComplete = requiredItems.every((item) => item.status === "complete");
  const canSubmit = isConfirmed; // Allow submission regardless of completion status

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch business location data
        const locationResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_LOCATION}`
        );
        const locationData = await locationResponse.json();

        // Fetch team members data
        const teamResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_TEAM_MEMBERS}`
        );
        const teamData = await teamResponse.json();

        // Fetch service location data
        const serviceLocationResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.SERVICE_LOCATION}`
        );
        const serviceLocationData = await serviceLocationResponse.json();

        // Fetch calendar integration data
        const calendarIntegrationResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.CALENDAR_INTEGRATION_NEW}`
        );
        const calendarIntegrationData = await calendarIntegrationResponse.json();

        // Fetch booking strategy data (to drive review rendering)
        const bookingStrategyResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BOOKING_STRATEGY}`
        );
        const bookingStrategyData = await bookingStrategyResponse.json();

        // Store all fetched data
        setOnboardingData({
          locationData,
          teamData,
          serviceLocationData,
          calendarIntegrationData,
          bookingStrategyData,
        });

        console.log("locationData:", locationData);
        console.log("teamData:", teamData);
        console.log("serviceLocationData:", serviceLocationData);
        console.log("calendarIntegrationData:", calendarIntegrationData);
        console.log("bookingStrategyData:", bookingStrategyData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "incomplete":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Complete</Badge>;
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Needs Attention
          </Badge>
        );
      case "incomplete":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Incomplete</Badge>;
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    const response = await fetch("/api/business/onboarding/submit-application", {
      method: "POST",
      body: JSON.stringify(onboardingData),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Failed to submit application:", data);
      setIsSubmitting(false);
      alert("Failed to submit application. Please try again.");
      return;
    }

    router.push(ROUTE_DASHBOARD);
    setIsSubmitting(false);
  };

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <LoadingSpinner size="lg" text="Loading your application data..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}

        <OnboardingProgressBar
          currentStep={getStepInfo("review-application").currentStep}
          totalSteps={getStepInfo("review-application").totalSteps}
          stepName={getStepInfo("review-application").stepName}
          goPrevious={() => router.push(goPrevious(reviewApplicationPage)?.pageRef ?? "")}
          user={user?.email ?? ""}
        />

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Your Application</h1>
        <p className="text-gray-600">Review your configuration and submit for approval</p>

        {/* Configuration Summary */}
        <div className="grid gap-6 mb-8">
          {/* Required Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Required Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {requiredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recommended Items */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Recommended Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card> */}

          {/* Completeness Check */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Completeness Check</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {requiredComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    {requiredComplete
                      ? "All required sections complete"
                      : "Required sections incomplete"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const incompleteRecommended = recommendedItems.filter(
                      (item) => item.status !== "complete"
                    ).length;
                    const warningRecommended = recommendedItems.filter(
                      (item) => item.status === "warning"
                    ).length;

                    if (incompleteRecommended === 0) {
                      return (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">All recommended items complete</span>
                        </>
                      );
                    } else if (warningRecommended > 0) {
                      return (
                        <>
                          {/* <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">
                            {incompleteRecommended} recommended item
                            {incompleteRecommended !== 1 ? "s" : ""} need attention
                          </span> */}
                        </>
                      );
                    } else {
                      return (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm">
                            {incompleteRecommended} recommended item
                            {incompleteRecommended !== 1 ? "s" : ""} incomplete
                          </span>
                        </>
                      );
                    }
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Ready for submission</span>
                  {!requiredComplete && (
                    <span className="text-xs text-gray-500 ml-2">
                      (incomplete items will be noted in review)
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submission Section */}
        <Card className="bg-blue-50 border-blue-200 mb-8">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="confirm"
                  checked={isConfirmed}
                  onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
                  className="mt-1"
                />
                <label
                  htmlFor="confirm"
                  className="text-sm font-medium text-gray-900 cursor-pointer"
                >
                  I confirm all information is accurate and ready for review
                </label>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  // className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  variant="primary"
                  loading={isSubmitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Application
                </Button>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Our team will review your application within 24 hours
                </p>
                <p className="text-xs text-gray-500">
                  You&apos;ll receive an email confirmation immediately and another when your
                  business is approved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Post-Submission Options */}
        {/* <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            variant="outline"
            onClick={handleDownloadSummary}
            className="flex items-center gap-2 bg-transparent"
          >
            <Download className="h-4 w-4" />
            Download Summary
          </Button>
          <Button variant="ghost" onClick={handleContinueEditing}>
            Continue Editing
          </Button>
        </div> */}

        {/* What Happens Next */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Zap className="h-5 w-5" />
              What Happens Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-600" />
                  <span className="text-sm">You&apos;ll receive a confirmation email</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    Our team reviews your application (within 24 hours)
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-600" />
                  <span className="text-sm">You&apos;ll be notified of approval via email</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    Your business goes live and can accept bookings!
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
