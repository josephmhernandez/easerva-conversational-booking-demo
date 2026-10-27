export interface BusinessCategory {
  name: string;
  slug: string;
  schemaType: string | string[];
  icon?: string;
}

export const CANONICAL_BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    name: "Attorney",
    slug: "attorney",
    schemaType: ["LegalService", "ProfessionalService"],
    icon: "scale",
  },
  {
    name: "Lawyer",
    slug: "lawyer",
    schemaType: ["LegalService", "ProfessionalService"],
    icon: "scale",
  },
  { name: "Accountant", slug: "accountant", schemaType: "AccountingService", icon: "calculator" },
  {
    name: "Financial Advisor",
    slug: "financial-advisor",
    schemaType: "FinancialService",
    icon: "chart-line",
  },
  {
    name: "Insurance Agent",
    slug: "insurance-agent",
    schemaType: "InsuranceAgency",
    icon: "shield",
  },
  { name: "Notary", slug: "notary", schemaType: "Notary", icon: "stamp" },
  { name: "Consultant", slug: "consultant", schemaType: "ProfessionalService", icon: "briefcase" },
  {
    name: "Real Estate Agent",
    slug: "real-estate-agent",
    schemaType: "RealEstateAgent",
    icon: "home",
  },
  {
    name: "Property Manager",
    slug: "property-manager",
    schemaType: "ProfessionalService",
    icon: "building",
  },
  {
    name: "Mortgage Broker",
    slug: "mortgage-broker",
    schemaType: "FinancialService",
    icon: "file-contract",
  },
  { name: "Car Dealership", slug: "car-dealership", schemaType: "AutoDealer", icon: "car" },
  { name: "Auto Repair", slug: "auto-repair", schemaType: "AutoRepair", icon: "wrench" },
  { name: "Auto Body Shop", slug: "auto-body-shop", schemaType: "AutoBodyShop", icon: "car-crash" },
  { name: "Dentist", slug: "dentist", schemaType: ["Dentist", "MedicalBusiness"], icon: "tooth" },
  {
    name: "Doctor",
    slug: "doctor",
    schemaType: ["Physician", "MedicalBusiness"],
    icon: "stethoscope",
  },
  { name: "Chiropractor", slug: "chiropractor", schemaType: "Chiropractor", icon: "bone" },
  { name: "Optometrist", slug: "optometrist", schemaType: "Optician", icon: "eye" },
  {
    name: "Physical Therapist",
    slug: "physical-therapist",
    schemaType: "PhysicalTherapy",
    icon: "dumbbell",
  },
  { name: "Mental Health", slug: "mental-health", schemaType: "MedicalBusiness", icon: "brain" },
  { name: "Veterinarian", slug: "veterinarian", schemaType: "VeterinaryCare", icon: "paw" },
  { name: "Hair Salon", slug: "hair-salon", schemaType: "HairSalon", icon: "cut" },
  { name: "Barber Shop", slug: "barber-shop", schemaType: "BarberShop", icon: "scissors" },
  { name: "Spa", slug: "spa", schemaType: "DaySpa", icon: "spa" },
  { name: "Nail Salon", slug: "nail-salon", schemaType: "NailSalon", icon: "hand-sparkles" },
  { name: "Tattoo Parlor", slug: "tattoo-parlor", schemaType: "TattooParlor", icon: "palette" },
  {
    name: "Personal Trainer",
    slug: "personal-trainer",
    schemaType: "HealthAndBeautyBusiness",
    icon: "dumbbell",
  },
  { name: "Plumber", slug: "plumber", schemaType: "Plumber", icon: "faucet" },
  { name: "Electrician", slug: "electrician", schemaType: "Electrician", icon: "bolt" },
  { name: "HVAC", slug: "hvac", schemaType: "HVACBusiness", icon: "fan" },
  { name: "Locksmith", slug: "locksmith", schemaType: "Locksmith", icon: "key" },
  { name: "Landscaper", slug: "landscaper", schemaType: "LandscapingBusiness", icon: "leaf" },
  {
    name: "Cleaning Service",
    slug: "cleaning-service",
    schemaType: "HousekeepingService",
    icon: "broom",
  },
  {
    name: "Pest Control",
    slug: "pest-control",
    schemaType: "HomeAndConstructionBusiness",
    icon: "bug",
  },
  { name: "Roofing", slug: "roofing", schemaType: "RoofingContractor", icon: "house" },
  {
    name: "General Contractor",
    slug: "general-contractor",
    schemaType: "GeneralContractor",
    icon: "hard-hat",
  },
  { name: "Pet Grooming", slug: "pet-grooming", schemaType: "PetStore", icon: "dog" },
  { name: "Pet Boarding", slug: "pet-boarding", schemaType: "PetStore", icon: "paw" },
  { name: "Dog Walker", slug: "dog-walker", schemaType: "LocalBusiness", icon: "dog" },
  { name: "Pet Sitting", slug: "pet-sitting", schemaType: "LocalBusiness", icon: "cat" },
  { name: "Tutor", slug: "tutor", schemaType: "EducationalOrganization", icon: "book" },
  {
    name: "Music Teacher",
    slug: "music-teacher",
    schemaType: "EducationalOrganization",
    icon: "music",
  },
  { name: "Driving School", slug: "driving-school", schemaType: "DrivingSchool", icon: "car" },
  { name: "Dance Studio", slug: "dance-studio", schemaType: "DanceSchool", icon: "music" },
  { name: "Photographer", slug: "photographer", schemaType: "ProfessionalService", icon: "camera" },
  { name: "Videographer", slug: "videographer", schemaType: "ProfessionalService", icon: "video" },
  {
    name: "Event Planner",
    slug: "event-planner",
    schemaType: "ProfessionalService",
    icon: "calendar",
  },
  { name: "Caterer", slug: "caterer", schemaType: "FoodEstablishment", icon: "utensils" },
  { name: "DJ", slug: "dj", schemaType: "EntertainmentBusiness", icon: "music" },
  {
    name: "Entertainment",
    slug: "entertainment",
    schemaType: "EntertainmentBusiness",
    icon: "star",
  },
  {
    name: "Printing Service",
    slug: "printing-service",
    schemaType: "ProfessionalService",
    icon: "print",
  },
  {
    name: "Shipping & Mailing",
    slug: "shipping-mailing",
    schemaType: "ProfessionalService",
    icon: "box",
  },
  {
    name: "Professional Services",
    slug: "professional-services",
    schemaType: "ProfessionalService",
    icon: "briefcase",
  },
  { name: "Local Business", slug: "local-business", schemaType: "LocalBusiness", icon: "store" },
];

export function getCanonicalBusinessCategoryBySlug(slug: string): BusinessCategory | undefined {
  return CANONICAL_BUSINESS_CATEGORIES.find((category) => category.slug === slug.toLowerCase());
}

export function getCanonicalBusinessCategoryByName(name: string): BusinessCategory | undefined {
  return CANONICAL_BUSINESS_CATEGORIES.find(
    (category) => category.name.toLowerCase() === name.toLowerCase()
  );
}

export function getCanonicalBusinessCategoryNames(): string[] {
  return CANONICAL_BUSINESS_CATEGORIES.map((category) => category.name);
}
