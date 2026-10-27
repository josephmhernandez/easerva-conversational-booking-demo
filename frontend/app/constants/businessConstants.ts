// Constants that should probably be moved to a separate backend core.

import { TagSuggestion } from "../types/businessTypes";
import { TimeZoneId } from "./tzConstants";

export enum OnboardingStep {
  BUSINESS_INFO = "business_info",
  BUSINESS_LOCATION = "business_location",
  BUSINESS_RESOURCES = "business_resources",
  BUSINESS_SERVICE_TEMPLATES = "business_service_templates",
  SERVICE_LOCATION = "service_location",
  CARD_ASSIGNMENT_STRATEGY = "card_assignment_strategy",
  BUSINESS_TEAM_MEMBERS = "business_team_members",
  EMPLOYEE_SERVICE_ASSIGNMENT = "employee_service_assignment",
  CARD_STUDIO = "card_studio",
  // TODO: Audit this.
  BOOKING_STRATEGY = "booking_strategy",
  CALENDAR_MANAGEMENT = "calendar_management",
  CALENDAR_INTEGRATION_NEW = "calendar_integration_new",
  BUSINESS_EMPLOYEE_AVAILABILITY = "business_employee_availability",
}

/**
 *
 * Used in Step 1: Business Details
 *
 */
export const BUSINESS_CATEGORIES = [
  "Beauty",
  "Medical",
  "Legal",
  "Real Estate",
  "Home Services",
  "Fitness",
  "Education",
  "Pet Services",
  "Food and Beverage",
  "Automotive",
  "Entertainment",
  "Professional Services",
  "Financial Services",
  "Travel and Tourism",
  "Event Planning",
  "Technology Services",
  "Retail and Shopping",
  "Wellness and Counseling",
  "Child Care and Family Services",
  "Photography",
  "Art and Design",
  "Other",
];

export const TAG_SUGGESTIONS: TagSuggestion = {
  Beauty: ["hair", "nails", "skincare", "makeup", "spa", "massage", "waxing", "eyebrows"],
  Medical: ["consultation", "checkup", "therapy", "treatment", "diagnosis", "wellness"],
  Legal: [
    "consultation",
    "contracts",
    "litigation",
    "family law",
    "business law",
    "estate planning",
  ],
  "Real Estate": ["buying", "selling", "rental", "property management", "investment", "commercial"],
  "Home Services": ["cleaning", "plumbing", "electrical", "landscaping", "repairs", "maintenance"],
  Fitness: ["personal training", "group classes", "yoga", "pilates", "nutrition", "wellness"],
  Education: ["tutoring", "coaching", "workshops", "online courses", "certification", "training"],
};

// Sub selection of timezones that are supported by us currently. Only use TimeZoneId enum values. No other values.
export const SUPPORTED_TIMEZONES = [
  TimeZoneId.AmericaNewYork,
  TimeZoneId.AmericaChicago,
  TimeZoneId.AmericaDenver,
  TimeZoneId.AmericaLosAngeles,
  TimeZoneId.AmericaAnchorage,
  TimeZoneId.PacificHonolulu,
];

export const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

export const COUNTRIES = [
  { code: "US", name: "United States" },
  // { code: "CA", name: "Canada" },
  // { code: "GB", name: "United Kingdom" },
  // { code: "AU", name: "Australia" },
];

export const VIRTUAL_MEETING_PLATFORMS = [
  { id: "zoom", name: "Zoom" },
  { id: "google-meet", name: "Google Meet" },
  { id: "teams", name: "Microsoft Teams" },
  { id: "custom", name: "Custom Link" },
];

export const SERVICE_RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200];

/**
 *
 * Used in Step 3: Service Form and service form modal
 *
 */

export const SERVICE_DURATION_OPTIONS = [
  { label: "15min", value: "15" },
  { label: "30min", value: "30" },
  { label: "45min", value: "45" },
  { label: "1hr", value: "60" },
  { label: "90min", value: "90" },
  { label: "2hr", value: "120" },
  { label: "3hr", value: "180" },
  { label: "4hr", value: "240" },
  { label: "6hr", value: "360" },
  { label: "8hr", value: "480" },
  { label: "Custom", value: "custom" },
];

export const SERVICE_ADVANCE_NOTICE_OPTIONS = [
  { label: "None", value: "none" },
  { label: "1 hour", value: "1hr" },
  { label: "2 hours", value: "2hr" },
  { label: "next day", value: "next_day" },
  { label: "24 hours", value: "24hr" },
  { label: "2 days", value: "2days" },
  { label: "1 week", value: "1week" },
  { label: "2 weeks", value: "2weeks" },
  { label: "Next business week", value: "next_business_week" },
];

export const SERVICE_BUFFER_TIME_OPTIONS = [
  { label: "None", value: 0 },
  { label: "5 minutes", value: 5 },
  { label: "10 minutes", value: 10 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "1 hour", value: 60 },
];

export const SERVICE_MAX_BOOKING_OPTIONS = [
  { label: "1 week", value: "1 week" },
  { label: "2 weeks", value: "2 weeks" },
  { label: "1 month", value: "1 month" },
  { label: "3 months", value: "3 months" },
  { label: "6 months", value: "6 months" },
  { label: "1 year", value: "1 year" },
];

export const SERVICE_ANSWER_TYPES = [
  { value: "text", label: "Text Answer", group: "Text" },
  { value: "textarea", label: "Long Text", group: "Text" },
  { value: "number", label: "Number", group: "Numbers" },
  { value: "integer", label: "Whole Number Only", group: "Numbers" },
  { value: "single-choice", label: "Single Choice", group: "Selection" },
  { value: "multiple-choice", label: "Multiple Choice", group: "Selection" },
  { value: "phone", label: "Phone", group: "Contact Info" },
  { value: "email", label: "Email", group: "Contact Info" },
  { value: "website", label: "Website", group: "Contact Info" },
  { value: "address", label: "Address", group: "Contact Info" },
  { value: "date", label: "Date Only", group: "Date/Time" },
  { value: "datetime", label: "Date and Time", group: "Date/Time" },
  { value: "image", label: "Image Upload", group: "Files" },
  { value: "document", label: "Document Upload", group: "Files" },
  { value: "measurement", label: "Size/Dimensions", group: "Measurements" },
  { value: "yes-no", label: "Yes/No", group: "Yes/No" },
];

/**
 *
 * Used in Step 4: Business Cards
 *
 */

export const BUSINESS_DESCRIPTION_INITIAL_VIEW_LIMIT = 65;
