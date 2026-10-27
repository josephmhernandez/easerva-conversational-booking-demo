// Business Location Types
// This file contains all types related to business location configuration

export interface Address {
  id: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  timezone: string;
  isValidated: boolean;
  suggestedAddress?: Address;
}

export interface ServiceArea {
  type: "radius_zip_code" | "radius_address" | "zip_codes";
  zipCenter?: string;
  radius?: number;
  zipCodesRaw?: string;
  zipCodes?: string[];
  cities?: string[];
}

export interface MobileService {
  id: string;
  name: string;
  serviceArea: ServiceArea;
  businessAddress?: Address;
}

export interface VirtualService {
  id: string;
  name: string;
  platform: string;
  defaultLink: string;
  instructions: string;
  timezone: string;
}

export interface ServiceTypes {
  physical: boolean;
  mobile: boolean;
  virtual: boolean;
}

export interface LocationData {
  serviceTypes: ServiceTypes;
  addresses: Address[];
  mobileServices: MobileService[];
  virtualServices: VirtualService[];
}

// Form validation types
export interface LocationErrors {
  [key: string]: string;
}

// Service type options for UI
export interface ServiceTypeOption {
  id: keyof ServiceTypes;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

// Address validation response from Google API
export interface AddressValidationResponse {
  regionCode: string;
  languageCode: string;
  postalCode: string;
  administrativeArea: string;
  locality: string;
  addressLines: string[];
}

// Draft data structure for saving/loading
export interface LocationDraftData {
  "serviceTypes.physical"?: {
    addresses: Address[];
  };
  "serviceTypes.mobile"?: {
    mobileServices: MobileService[];
  };
  "serviceTypes.virtual"?: {
    virtualServices: VirtualService[];
  };
}

// Configuration status for UI display
export interface ConfigurationStatus {
  physical: boolean;
  mobile: boolean;
  virtual: boolean;
}

// Service area configuration types
export type ServiceAreaType = "radius_zip_code" | "radius_address" | "zip_codes";

export interface RadiusServiceArea {
  type: "radius_zip_code";
  zipCenter: string;
  radius: number;
}

export interface BusinessRadiusServiceArea {
  type: "radius_address";
  businessAddress: Address;
  radius: number;
}

export interface ZipCodesServiceArea {
  type: "zip_codes";
  zipCodesRaw: string;
  zipCodes: string[];
}

// Union type for all service area configurations
export type ServiceAreaConfig = RadiusServiceArea | BusinessRadiusServiceArea | ZipCodesServiceArea;

// Mobile service configuration with specific service area
export interface MobileServiceConfig {
  id: string;
  name: string;
  serviceArea: ServiceAreaConfig;
}

// Virtual service platform options
export interface VirtualPlatform {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

// Timezone configuration
export interface TimezoneConfig {
  id: string;
  name: string;
  offset: string;
}

// Form field types for validation
export type AddressField = keyof Omit<Address, "id" | "isValidated" | "suggestedAddress">;
export type MobileServiceField = keyof Omit<MobileService, "id">;
export type VirtualServiceField = keyof Omit<VirtualService, "id">;

// Error message types
export interface FieldError {
  field: string;
  message: string;
}

// Service configuration status
export interface ServiceConfigStatus {
  isConfigured: boolean;
  hasErrors: boolean;
  errors: string[];
}

// Location summary for display
export interface LocationSummary {
  totalLocations: number;
  totalMobileServices: number;
  totalVirtualServices: number;
  configuredServices: string[];
}

// All types are already exported individually above
