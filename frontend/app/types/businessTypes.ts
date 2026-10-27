/**
 *
 * Used in Step 1: Business Profile
 *
 */
export interface TagSuggestion {
  [key: string]: string[];
}

/**
 *
 * Used in Step 2: Business Location
 *
 */
export interface Address {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  timezone?: string;
  isValidated?: boolean;
  suggestedAddress?: Address;
}

export interface ServiceArea {
  type: "radius_zip_code" | "zip_codes" | "radius_address";
  zipCenter?: string;
  radius?: number;
  zipCodes?: string[];
  zipCodesRaw?: string; // Raw textarea input for zip codes
  cities?: string[];
}

export type ServiceType = "physical" | "mobile" | "virtual" | "hybrid";

export type ServiceAreaValue = string | number | string[];

/**
 *
 * Used in Step 3: Service Form
 *
 */
// Service-related types
export interface ValidationConfig {
  // Text/Textarea validation
  minLength?: number;
  maxLength?: number;

  // Number/Integer validation
  min?: number;
  max?: number;
  allowDecimals?: boolean;
  decimalPlaces?: number;

  // Phone validation
  format?: string;

  // Address validation
  requiredComponents?: {
    [key: string]: boolean | undefined;
    street?: boolean;
    city?: boolean;
    state?: boolean;
    zip?: boolean;
    country?: boolean;
  };

  // File validation
  maxSize?: number;
  maxFiles?: number;
  allowedTypes?: string[];

  // Measurement validation
  units?: string[];
}

export interface ServiceQuestion {
  id: string;
  type:
    | "text"
    | "choice"
    | "number"
    | "date"
    | "textarea"
    | "integer"
    | "single-choice"
    | "multiple-choice"
    | "phone"
    | "email"
    | "website"
    | "address"
    | "datetime"
    | "image"
    | "document"
    | "measurement"
    | "yes-no";
  text: string;
  required: boolean;
  active: boolean;
  helpText?: string;
  businessNotes?: string;
  validation?: ValidationConfig;
  options?: Array<{ label: string; value: string }>;
  allowOther?: boolean;
}

export interface ServicePricing {
  type: "free" | "fixed" | "variable";
  amount: number;
  startingAt: number;
  upTo: number;
  displayText: string;
}

export interface ServiceRequirements {
  physicalLocation: boolean;
  virtual: boolean;
  customerLocation: boolean;
}

export interface BookingRules {
  minAdvanceNotice: string;
  maxAdvanceBooking: string;
}

export interface PaymentSettings {
  requirement: "none" | "card_on_file" | "deposit" | "full_payment";
  depositAmount: number;
  policy: string;
}

export interface Service {
  id?: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  durationType: "fixed" | "custom";
  pricing: ServicePricing;
  requirements: ServiceRequirements;
  bookingRules: BookingRules;
  questions: ServiceQuestion[];
  paymentSettings: PaymentSettings;
  searchTags: string[];
}

export interface ServiceFormData {
  name: string;
  category: string;
  description: string;
  duration: number;
  durationType: "fixed" | "custom";
  customHours: number;
  customMinutes: number;
  pricing: ServicePricing;
  requirements: ServiceRequirements;
  bookingRules: BookingRules;
  searchTags: string[];
  questions: ServiceQuestion[];
  paymentSettings: PaymentSettings;
}

export interface ServiceWithId extends Service {
  id: string;
  isActive: boolean;
}

/**
 *
 * Used in Step 4: Business Cards
 *
 */
export type CardApproach = "single" | "custom";

export type MediaType = "image" | "video" | "profile";

export type MediaSettings = {
  zoom: number;
  panX: number;
  panY: number;
  overlayOpacity: number;
  autoPlay?: boolean;
  muted?: boolean;
  thumbnailTime?: number;
};

export type BadgeSettings = {
  licensed: boolean;
  experience: boolean;
  experienceYears: number;
  locallyOwned: boolean;
  custom: string;
};

export interface CardDesign {
  id: string;
  name: string;
  mediaType: MediaType;
  mediaUrl?: string;
  mediaSettings: MediaSettings;
  profileImage?: string;
  showProfileImage?: boolean;
  backgroundColor: string;
  backgroundGradient?: string;
  pattern?: string;
  headline: string;
  tagline: string;
  bulletPoints: string[];
  ctaText: string;
  badges: BadgeSettings;
  // Optional badges array from database - if present, use this for display instead of badges
  badgesArray?: string[];
  serviceId: string;
}

/**
 *
 * Used in Step 8: Booking Strategy & Step 9: Calendar Integration
 *
 */
export type BookingStrategyId = "simple" | "location" | "employee" | "resource" | "hybrid";

export type BookingStrategyComplexity = "Simple" | "Medium" | "Complex";

export interface BookingStrategy {
  id: BookingStrategyId;
  name: string;
  description: string;
  bestFor: string[];
  complexity: BookingStrategyComplexity;
  pros: string[];
}

export const BOOKING_STRATEGIES: BookingStrategy[] = [
  {
    id: "simple",
    name: "Simple (One Calendar)",
    description: "All bookings go to one business calendar",
    bestFor: ["Solo practitioners", "Simple services", "Small businesses"],
    complexity: "Simple",
    pros: ["Easy to manage", "Quick setup", "No conflicts between staff"],
  },
  {
    id: "location",
    name: "Location-based",
    description: "Each location has its own calendar",
    bestFor: ["Multi-location businesses", "Franchises", "Regional services"],
    complexity: "Medium",
    pros: ["Location-specific scheduling", "Easy to manage per site", "Clear separation"],
  },
  {
    id: "employee",
    name: "Employee-based",
    description: "Each team member has their own calendar",
    bestFor: ["Salons", "Medical practices", "Personal services"],
    complexity: "Medium",
    pros: ["Individual availability", "Personal scheduling", "Client preferences"],
  },
  {
    id: "resource",
    name: "Resource-based",
    description: "Each room/equipment has its own calendar",
    bestFor: ["Equipment rentals", "Room bookings", "Facility management"],
    complexity: "Complex",
    pros: ["Resource optimization", "Equipment scheduling", "Facility management"],
  },
  {
    id: "hybrid",
    name: "Hybrid Custom",
    description: "Mix of the resource, location, and employee strategies",
    bestFor: ["Complex businesses", "Multiple service types", "Custom workflows"],
    complexity: "Complex",
    pros: ["Maximum flexibility", "Service-specific strategies", "Custom workflows"],
  },
];
