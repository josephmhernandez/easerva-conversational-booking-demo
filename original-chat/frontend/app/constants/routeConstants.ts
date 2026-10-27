export const ROUTE_LOGIN_PAGE = "/login";
export const ROUTE_SIGNUP_PAGE = "/business/welcome";
export const ROUTE_DASHBOARD = "/business/dashboard";
export const ROUTE_BUSINESS_START_ONBOARDING_PAGE = "/business/onboarding/business-profile";
export const ROUTE_EMPLOYEE_ADD_CALENDAR_PAGE = "/business/onboarding/calendar-settings";

type StepNode = {
  id: string;
  pageRef: string;
  next?: StepNode;
  previous?: StepNode;
};

export const businessProfilePage: StepNode = {
  id: "business-profile",
  pageRef: "/business/onboarding/business-profile",
};
export const businessLocationPage: StepNode = {
  id: "business-location",
  pageRef: "/business/onboarding/business-location",
};
export const employeeServiceAssignmentPage: StepNode = {
  id: "employee-service-assignment",
  pageRef: "/business/onboarding/employee-service-assignment",
};
export const bookingStrategyPage: StepNode = {
  id: "booking-strategy",
  pageRef: "/business/onboarding/booking-strategy",
};
export const cardAssignmentStrategyPage: StepNode = {
  id: "card-assignment-strategy",
  pageRef: "/business/onboarding/card-assignment-strategy",
};
export const cardStudioPage: StepNode = {
  id: "card-studio",
  pageRef: "/business/onboarding/card-studio",
};
export const reviewApplicationPage: StepNode = {
  id: "review-application",
  pageRef: "/business/onboarding/review-application",
};
export const businessResourcesPage: StepNode = {
  id: "business-resources",
  pageRef: "/business/onboarding/business-resources",
};
export const businessServiceTemplatesPage: StepNode = {
  id: "business-service-templates",
  pageRef: "/business/onboarding/business-service-templates",
};
export const serviceLocationPage: StepNode = {
  id: "service-location",
  pageRef: "/business/onboarding/service-location",
};
export const businessTeamMembersPage: StepNode = {
  id: "business-team-members",
  pageRef: "/business/onboarding/business-team-members",
};
export const businessCalendarIntegrationPage: StepNode = {
  id: "business-calendar-integration",
  pageRef: "/business/onboarding/business-calendar-integration",
};
export const businessEmployeeAvailabilityPage: StepNode = {
  id: "business-employee-availability",
  pageRef: "/business/onboarding/business-employee-availability",
};
export const calendarManagementPage: StepNode = {
  id: "calendar-management",
  pageRef: "/business/onboarding/calendar-management",
};
export const calendarIntegrationNewPage: StepNode = {
  id: "calendar-integration-new",
  pageRef: "/business/onboarding/calendar-integration-new",
};

/**
 * Onboarding Order
 * Onboarding Flow
 */

businessProfilePage.next = businessLocationPage;

businessLocationPage.previous = businessProfilePage;
businessLocationPage.next = businessTeamMembersPage;

businessTeamMembersPage.previous = businessLocationPage;
businessTeamMembersPage.next = businessResourcesPage;

businessResourcesPage.previous = businessTeamMembersPage;
businessResourcesPage.next = businessServiceTemplatesPage;

businessServiceTemplatesPage.previous = businessResourcesPage;
businessServiceTemplatesPage.next = serviceLocationPage;

serviceLocationPage.previous = businessServiceTemplatesPage;
serviceLocationPage.next = employeeServiceAssignmentPage;

employeeServiceAssignmentPage.previous = serviceLocationPage;
employeeServiceAssignmentPage.next = calendarManagementPage;

// cardAssignmentStrategyPage.previous = employeeServiceAssignmentPage;
// cardAssignmentStrategyPage.next = cardStudioPage;

// cardStudioPage.previous = cardAssignmentStrategyPage;
// cardStudioPage.next = calendarManagementPage;

calendarManagementPage.previous = employeeServiceAssignmentPage;
calendarManagementPage.next = calendarIntegrationNewPage;

calendarIntegrationNewPage.previous = calendarManagementPage;
calendarIntegrationNewPage.next = businessEmployeeAvailabilityPage;

businessEmployeeAvailabilityPage.previous = calendarIntegrationNewPage;
businessEmployeeAvailabilityPage.next = reviewApplicationPage;

reviewApplicationPage.previous = businessEmployeeAvailabilityPage;
export function goNext(step: StepNode) {
  return step.next ?? null;
}

export function goPrevious(step: StepNode) {
  return step.previous ?? null;
}
