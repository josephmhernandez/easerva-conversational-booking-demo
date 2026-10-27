// Flattened data interfaces
export interface FlattenedLocation {
  id: string;
  name: string;
  type: "physical" | "mobile" | "virtual";
  address?: string;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
  }>;
}

export interface FlattenedService {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  pricing: {
    type: string;
    amount?: number;
    min?: number;
    max?: number;
    displayText?: string;
  };
  locations: string[]; // Location IDs where this service is offered
  employees: string[]; // Employee IDs who can perform this service
}

export interface FlattenedEmployee {
  id: string;
  fullName: string;
  role: string;
  email: string;
  locationId: string;
  takesBookings: boolean;
  services: string[]; // Service IDs this employee can perform
}

export interface FlattenedCard {
  id: string;
  name: string;
  type: "business" | "location" | "service" | "employee";
  headline: string;
  tagline: string;
  description: string;
  serviceIds: string[];
  locationId?: string;
  employeeId?: string;
  mediaUrl?: string;
  mediaSettings?: {
    zoom: number;
    panX: number;
    panY: number;
    overlayOpacity: number;
    autoPlay?: boolean;
    muted?: boolean;
  };
  profileImage?: string;
  showProfileImage?: boolean;
  price?: string;
  ctaText: string;
  isComplete: boolean;
}

export interface BookingRequirement {
  id: string;
  name: string;
  type: "resource" | "employee";
  locationId?: string;
  description?: string;
  displayName: string;
  logicOperator?: "AND" | "OR";
}

export interface BookingCombination {
  id: string;
  locationId: string;
  locationName: string;
  locationAddress: string;
  cardType: string;
  logicType: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
    priceType?: string;
    priceMin?: number;
    priceMax?: number;
    locationId: string;
    requiredResources: string[];
  }>;
  employees: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
  }>;
  requirements: BookingRequirement[];
  combiningAllowed: boolean;
  combinedFromServices: Array<{
    from: string;
    services: Array<{
      id: string;
      name: string;
      price: number;
      locationId: string;
      requiredResources: string[];
    }>;
  }>;
  associatedCardId?: string | null;
}

export interface FlattenedCalendarManagement {
  employeeCalendars: Array<{
    id: string;
    name: string;
    email?: string;
    calendarId: string;
    calendarName: string;
    provider: string;
    isConfigured: boolean;
    needsConfiguration: boolean;
    usedInBookings: boolean;
  }>;
  locationCalendars: Array<{
    id: string;
    name: string;
    calendarId: string;
    calendarName: string;
    provider: string;
    isConfigured: boolean;
    needsConfiguration: boolean;
    usedInBookings: boolean;
  }>;
  resourceCalendars: Array<{
    id: string;
    name: string;
    type: string;
    calendarId: string;
    calendarName: string;
    provider: string;
    isConfigured: boolean;
    needsConfiguration: boolean;
    usedInBookings: boolean;
  }>;
  summary: {
    totalEmployeeCalendars: number;
    totalLocationCalendars: number;
    totalResourceCalendars: number;
    unconfiguredCount: number;
  };
}

export interface ProcessedApplication {
  id: string;
  user_id: string;
  business_id: string;
  status: string;
  current_step: string;
  created_at: string;
  updated_at: string;
  last_saved_at: string;

  // Business info
  businessInfo: {
    name: string;
    slug: string;
    category: string;
    description: string;
    phone: string;
    email: string;
    website: string;
    logoUrl?: string;
    tags: string[];
  };

  // Flattened data
  locations: FlattenedLocation[];
  services: FlattenedService[];
  employees: FlattenedEmployee[];
  cards: FlattenedCard[];
  bookingCombinations: BookingCombination[];
  calendarManagement: FlattenedCalendarManagement;

  // Summary stats
  summary: {
    totalLocations: number;
    totalServices: number;
    totalEmployees: number;
    totalCards: number;
    totalBookingCombinations: number;
    completedSteps: number;
    totalSteps: number;
  };
}

// Raw draft interfaces
export interface RawDraftData {
  business_info?: {
    name?: string;
    slug?: string;
    category?: string;
    description?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
    tags?: string[];
  };
  business_location?: {
    "serviceTypes.physical"?: {
      addresses?: Array<{
        id: string;
        name: string;
        line1: string;
        line2?: string;
        city: string;
        state: string;
        zipCode: string;
        phone?: string;
      }>;
    };
    "serviceTypes.mobile"?: {
      serviceArea?: {
        type: string;
        radius?: number;
      };
    };
    "serviceTypes.virtual"?: {
      virtualSettings?: {
        platform?: string;
        timezone?: string;
      };
    };
  };
  business_resources?: Record<
    string,
    {
      name?: string;
      type?: string;
      resources?: Array<{
        id: string;
        name: string;
        type: string;
        description: string;
      }>;
    }
  >;
  business_services?: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    duration: number;
    pricing?: {
      type?: string;
      displayText?: string;
    };
    price?: number;
    priceType?: string;
    priceMin?: number;
    priceMax?: number;
  }>;
  business_service_templates?: {
    services?: Array<{
      id: string;
      name: string;
      category: string;
      description: string;
      duration: number;
      pricing?: {
        type?: string;
        displayText?: string;
      };
      price?: number;
      priceType?: string;
      priceMin?: number;
      priceMax?: number;
    }>;
  };
  service_location?: {
    configurations?: Array<{
      serviceId: string;
      locationId: string;
      enabled: boolean;
    }>;
  };
  employee_service_assignment?: {
    assignments?: Array<{
      serviceId: string;
      employeeId: string;
      enabled: boolean;
    }>;
  };
  booking_strategy?: {
    employees?: Array<{
      id: string;
      fullName: string;
      role: string;
      email: string;
      locationId: string;
      takesBookings: boolean;
    }>;
  };
  card_studio?: {
    cards?: Array<{
      id: string;
      name: string;
      type: string;
      headline: string;
      tagline: string;
      description: string;
      serviceIds?: string[];
      locationId?: string;
      employeeId?: string;
      mediaUrl?: string;
      price?: string;
      ctaText: string;
      isComplete: boolean;
    }>;
  };
  calendar_management?: {
    calendars?: Array<{
      chronifyCalendarId: string;
      name: string;
      providerName: string;
      [key: string]: unknown;
    }>;
  };
  calendar_integration_new?: {
    serviceLocationCombos?: Array<{
      id: string;
      employeeId?: string;
      locationId: string;
      locationName: string;
      address: string;
      cardType: string;
      logicType: string;
      services: Array<{
        id: string;
        name: string;
        price: number;
        locationId: string;
        requiredResources: string[];
      }>;
      employees: Array<{
        id: string;
        name: string;
        role?: string;
      }>;
      resources: Array<{
        id: string;
        name: string;
        type: string;
        description?: string;
      }>;
      requirements: Array<{
        id: string;
        name: string;
        type: string;
        locationId?: string;
        description?: string;
        displayName: string;
        logicOperator?: string;
      }>;
      combiningAllowed: boolean;
      combinedFromServices: Array<{
        from: string;
        services: Array<{
          id: string;
          name: string;
          price: number;
          locationId: string;
          requiredResources: string[];
        }>;
      }>;
    }>;
    employeeCalendars?: Array<{
      id: string;
      fullName?: string;
      name?: string;
      email?: string;
    }>;
    locationCalendars?: Array<{
      id: string;
      name: string;
      calendar?: {
        calendarId?: string;
        calendarName?: string;
        provider?: string;
      };
    }>;
    resourceCalendars?: Array<{
      id: string;
      name: string;
      type: string;
      calendar?: {
        calendarId?: string;
        calendarName?: string;
        provider?: string;
        connectionStatus?: string;
      };
    }>;
    calendarAssignments?: Array<{
      entityId: string;
      entityType: string;
      calendarId?: string;
      isPending?: boolean;
      calendarName?: string;
      provider?: string;
    }>;
  };
}

export interface RawDraft {
  id: string;
  user_id: string;
  business_id: string;
  status: string;
  current_step: string;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
  draft_data?: RawDraftData;
  step_validation?: Record<
    string,
    {
      completed: boolean;
    }
  >;
}

// Additional types for processing
export interface Address {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  pricing?: {
    type?: string;
    displayText?: string;
  };
  price?: number;
  priceType?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface ServiceConfiguration {
  serviceId: string;
  locationId: string;
  enabled: boolean;
}

export interface EmployeeServiceAssignment {
  serviceId: string;
  employeeId: string;
  enabled: boolean;
}

export interface Employee {
  id: string;
  fullName: string;
  role: string;
  email: string;
  locationId: string;
  takesBookings: boolean;
}

export interface Card {
  id: string;
  name: string;
  type: string;
  headline: string;
  tagline: string;
  description: string;
  serviceIds?: string[];
  locationId?: string;
  employeeId?: string;
  mediaUrl?: string;
  mediaSettings?: {
    zoom?: number;
    panX?: number;
    panY?: number;
    overlayOpacity?: number;
    autoPlay?: boolean;
    muted?: boolean;
  };
  profileImage?: string;
  showProfileImage?: boolean;
  price?: string;
  ctaText: string;
  isComplete: boolean;
}

export interface ServiceLocationCombo {
  id: string;
  employeeId?: string;
  locationId: string;
  locationName: string;
  address: string;
  cardType: string;
  logicType: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
    locationId: string;
    requiredResources: string[];
  }>;
  employees: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
  }>;
  requirements: Array<{
    id: string;
    name: string;
    type: string;
    locationId?: string;
    description?: string;
    displayName: string;
    logicOperator?: string;
  }>;
  combiningAllowed: boolean;
  combinedFromServices: Array<{
    from: string;
    services: Array<{
      id: string;
      name: string;
      price: number;
      locationId: string;
      requiredResources: string[];
    }>;
  }>;
}

export interface StepValidation {
  completed: boolean;
}
