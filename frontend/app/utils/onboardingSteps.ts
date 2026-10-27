import {
  businessEmployeeAvailabilityPage,
  businessLocationPage,
  businessProfilePage,
  businessResourcesPage,
  businessServiceTemplatesPage,
  businessTeamMembersPage,
  calendarIntegrationNewPage,
  calendarManagementPage,
  employeeServiceAssignmentPage,
  reviewApplicationPage,
  serviceLocationPage,
} from "../constants/routeConstants";

// Define the complete onboarding flow based on routeConstants.ts
const onboardingFlow = [
  businessProfilePage,
  businessLocationPage,
  businessTeamMembersPage,
  businessResourcesPage,
  businessServiceTemplatesPage,
  serviceLocationPage,
  employeeServiceAssignmentPage,
  calendarManagementPage,
  calendarIntegrationNewPage,
  businessEmployeeAvailabilityPage,
  reviewApplicationPage,
].filter((page) => page !== undefined && page !== null);

export function getStepInfo(pageId: string) {
  const stepIndex = onboardingFlow.findIndex((page) => page && page.id === pageId);

  if (stepIndex === -1) {
    return {
      currentStep: 1,
      totalSteps: onboardingFlow.length,
      stepName: "Unknown Step",
    };
  }

  return {
    currentStep: stepIndex + 1,
    totalSteps: onboardingFlow.length,
    stepName: getStepDisplayName(pageId),
  };
}

function getStepDisplayName(pageId: string): string {
  const stepNames: Record<string, string> = {
    "business-profile": "Business Profile",
    "business-location": "Business Location",
    "business-team-members": "Team Members",
    "business-resources": "Business Resources",
    "business-service-templates": "Service Templates",
    "service-location": "Service Location",
    "employee-service-assignment": "Service Assignment",
    "card-assignment-strategy": "Card Strategy",
    "card-studio": "Card Studio",
    // "booking-strategy": "Booking Strategy",
    "calendar-management": "Calendar Management",
    "calendar-integration-new": "Calendar Integration",
    "business-employee-availability": "Employee Availability",
    "review-application": "Review Application",
  };

  return stepNames[pageId] || "Unknown Step";
}
