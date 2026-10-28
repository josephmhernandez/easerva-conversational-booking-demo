import type { Card } from "../../shared/protocol";
import type { SearchParams } from "../tools/post-search-service-cards";

type DemoService = {
  id: string;
  category: string;
  business: string;
  name: string;
  tagline: string;
  description: string;
  city: string;
  priceType: "fixed" | "variable";
  priceCents?: number;
  priceMin?: number;
  priceMax?: number;
  duration: number;
  distance: number;
  badges: string[];
};

const DEMO_SERVICES: DemoService[] = [
  {
    id: "print-business-cards",
    category: "Printing Service",
    business: "Fort Worth Print House",
    name: "Premium Business Cards",
    tagline: "500 full-color cards with matte or gloss finish",
    description:
      "Design review, digital proof, double-sided printing, and local pickup within three business days.",
    city: "Fort Worth",
    priceType: "fixed",
    priceCents: 6900,
    duration: 30,
    distance: 2800,
    badges: ["Locally owned", "Free digital proof", "3-day turnaround"],
  },
  {
    id: "print-posters",
    category: "Printing Service",
    business: "Trinity River Graphics",
    name: "Large-Format Poster Printing",
    tagline: "Photo-quality posters from 18×24 to 36×48",
    description:
      "High-resolution poster printing on satin, gloss, or heavyweight matte stock with optional mounting.",
    city: "Fort Worth",
    priceType: "variable",
    priceMin: 2800,
    priceMax: 12500,
    duration: 45,
    distance: 5100,
    badges: ["300 DPI", "Same-day available", "Color matched"],
  },
  {
    id: "print-banners",
    category: "Printing Service",
    business: "DFW Signs & Banners",
    name: "Outdoor Vinyl Banners",
    tagline: "Weather-resistant event and storefront banners",
    description:
      "Custom vinyl banners with reinforced hems, grommets, and an artwork quality check before production.",
    city: "Arlington",
    priceType: "variable",
    priceMin: 5500,
    priceMax: 24000,
    duration: 30,
    distance: 18200,
    badges: ["Outdoor rated", "Design help included", "Local delivery"],
  },
  {
    id: "print-documents",
    category: "Printing Service",
    business: "Stockyards Copy Center",
    name: "Same-Day Document Printing",
    tagline: "Bound reports, presentations, menus, and flyers",
    description:
      "Fast black-and-white or color document production with folding, stapling, binding, and pickup options.",
    city: "Fort Worth",
    priceType: "variable",
    priceMin: 1500,
    priceMax: 18000,
    duration: 20,
    distance: 3600,
    badges: ["Same-day pickup", "Volume pricing", "Finishing available"],
  },
  {
    id: "pet-dog-walking",
    category: "Pet Services",
    business: "Plano Paws",
    name: "Neighborhood Dog Walking",
    tagline: "GPS-tracked 30 or 60 minute walks",
    description:
      "One-on-one walks with photo updates, water refresh, and route tracking throughout Plano neighborhoods.",
    city: "Plano",
    priceType: "fixed",
    priceCents: 2600,
    duration: 30,
    distance: 3200,
    badges: ["Insured", "GPS tracked", "Photo updates"],
  },
  {
    id: "pet-grooming",
    category: "Pet Services",
    business: "North Dallas Mobile Grooming",
    name: "Mobile Bath & Groom",
    tagline: "A full-service groomer that comes to you",
    description:
      "Breed-appropriate bath, haircut, nail trim, ear cleaning, and coat conditioning in a mobile salon.",
    city: "Plano",
    priceType: "variable",
    priceMin: 7500,
    priceMax: 14500,
    duration: 90,
    distance: 6700,
    badges: ["Mobile service", "Fear-free handling", "All breeds"],
  },
  {
    id: "pet-sitting",
    category: "Pet Services",
    business: "Legacy Pet Companions",
    name: "In-Home Pet Sitting",
    tagline: "Drop-in care while you work or travel",
    description:
      "Feeding, medication reminders, playtime, litter care, and a detailed visit report for dogs and cats.",
    city: "Plano",
    priceType: "fixed",
    priceCents: 3400,
    duration: 45,
    distance: 4900,
    badges: ["Background checked", "Medication support", "Daily reports"],
  },
  {
    id: "pet-boarding",
    category: "Pet Services",
    business: "Parkside Pet Lodge",
    name: "Overnight Dog Boarding",
    tagline: "Supervised play and comfortable overnight suites",
    description:
      "Overnight boarding with structured play groups, feeding to your schedule, and daily status updates.",
    city: "Frisco",
    priceType: "fixed",
    priceCents: 5800,
    duration: 1440,
    distance: 14600,
    badges: ["24-hour staff", "Daily updates", "Climate controlled"],
  },
  {
    id: "home-electrical",
    category: "Home Services",
    business: "Cowtown Electric Co.",
    name: "Residential Wiring Repair",
    tagline: "Licensed troubleshooting for outlets, circuits, and panels",
    description:
      "An on-site electrical diagnostic with straightforward repair options for faulty wiring, breakers, and outlets.",
    city: "Fort Worth",
    priceType: "variable",
    priceMin: 12900,
    priceMax: 65000,
    duration: 90,
    distance: 4200,
    badges: ["Licensed & insured", "Upfront estimate", "Same-week service"],
  },
  {
    id: "home-lighting",
    category: "Home Services",
    business: "Bright Side Electrical",
    name: "Lighting & Fixture Installation",
    tagline: "Indoor, outdoor, ceiling fan, and smart lighting installs",
    description:
      "Professional fixture replacement and new lighting installation with safety inspection and cleanup.",
    city: "Fort Worth",
    priceType: "variable",
    priceMin: 11000,
    priceMax: 42000,
    duration: 120,
    distance: 7800,
    badges: ["Licensed electrician", "Smart-home ready", "Work guaranteed"],
  },
  {
    id: "home-plumbing",
    category: "Home Services",
    business: "ClearFlow Plumbing",
    name: "Leak & Drain Repair",
    tagline: "Diagnosis and repair for common household plumbing issues",
    description:
      "Service for leaking fixtures, clogged drains, running toilets, and minor pipe repairs with upfront pricing.",
    city: "Fort Worth",
    priceType: "variable",
    priceMin: 9900,
    priceMax: 48000,
    duration: 90,
    distance: 9200,
    badges: ["Licensed plumber", "Upfront pricing", "Emergency slots"],
  },
  {
    id: "home-hvac",
    category: "Home Services",
    business: "Texas Comfort Air",
    name: "HVAC Tune-Up & Diagnostic",
    tagline: "Heating and cooling maintenance for North Texas homes",
    description:
      "A complete system inspection, performance test, filter check, and written repair recommendation.",
    city: "Fort Worth",
    priceType: "fixed",
    priceCents: 8900,
    duration: 75,
    distance: 11400,
    badges: ["Certified technicians", "Written report", "No-pressure quote"],
  },
  {
    id: "photo-portraits",
    category: "Photography",
    business: "Trinity Portrait Studio",
    name: "Professional Portrait Session",
    tagline: "Headshots, family portraits, and graduation photos",
    description:
      "A guided studio or outdoor session with retouching and a private gallery of high-resolution images.",
    city: "Fort Worth",
    priceType: "fixed",
    priceCents: 22500,
    duration: 60,
    distance: 3900,
    badges: ["10 edited images", "Private gallery", "Print release"],
  },
  {
    id: "photo-events",
    category: "Photography",
    business: "DFW Event Stories",
    name: "Event Photography",
    tagline: "Candid and posed coverage for private and corporate events",
    description:
      "Hourly event coverage with color correction, online delivery, and a preview gallery within 48 hours.",
    city: "Arlington",
    priceType: "variable",
    priceMin: 35000,
    priceMax: 140000,
    duration: 180,
    distance: 17500,
    badges: ["48-hour preview", "Backup equipment", "Commercial insured"],
  },
  {
    id: "photo-products",
    category: "Photography",
    business: "Commerce Lens Studio",
    name: "Product Photography",
    tagline: "Clean catalog and lifestyle images for online stores",
    description:
      "Consistent product imagery with background removal, color matching, and web-ready file exports.",
    city: "Dallas",
    priceType: "variable",
    priceMin: 18000,
    priceMax: 90000,
    duration: 120,
    distance: 27800,
    badges: ["E-commerce ready", "Color calibrated", "Bulk pricing"],
  },
  {
    id: "tech-web",
    category: "Technology Services",
    business: "North Texas Web Works",
    name: "Small-Business Website Build",
    tagline: "A fast, accessible website with analytics and hosting setup",
    description:
      "Design and development for a five-page business site, including mobile layouts, SEO basics, and launch support.",
    city: "Fort Worth",
    priceType: "variable",
    priceMin: 180000,
    priceMax: 650000,
    duration: 60,
    distance: 0,
    badges: ["Mobile friendly", "Source included", "Launch support"],
  },
  {
    id: "tech-support",
    category: "Technology Services",
    business: "Metroplex IT Desk",
    name: "On-Site Business IT Support",
    tagline: "Workstation, network, printer, and account troubleshooting",
    description:
      "On-site or remote diagnosis for small-business technology issues with a written summary of work completed.",
    city: "Plano",
    priceType: "fixed",
    priceCents: 14500,
    duration: 90,
    distance: 6100,
    badges: ["Same-day remote", "Business focused", "No contract required"],
  },
  {
    id: "tech-automation",
    category: "Technology Services",
    business: "Lone Star Automation Lab",
    name: "Workflow Automation Consultation",
    tagline: "Replace repetitive spreadsheets and handoffs with reliable workflows",
    description:
      "A discovery session and implementation plan covering integrations, data movement, approvals, and cloud deployment.",
    city: "Dallas",
    priceType: "fixed",
    priceCents: 17500,
    duration: 60,
    distance: 0,
    badges: ["Architecture plan", "Fixed-price discovery", "Cloud expertise"],
  },
];

function toCard(service: DemoService, relevanceScore: number): Card {
  return {
    card_id: `demo-card-${service.id}`,
    card_type: "service",
    business_id: `demo-business-${service.id}`,
    business_name: service.business,
    business_logo_url: null,
    display_name: service.name,
    tagline: service.tagline,
    description: service.description,
    media_url: null,
    media_type: "image",
    profile_image_url: null,
    cta_text: "View availability",
    service_id: `demo-service-${service.id}`,
    service_name: service.name,
    service_description: service.description,
    service_category_out: service.category,
    price_type: service.priceType,
    price_cents: service.priceCents ?? null,
    price_min: service.priceMin ?? null,
    price_max: service.priceMax ?? null,
    duration_minutes: service.duration,
    location_id: `demo-location-${service.id}`,
    location_name: `${service.business} — ${service.city}`,
    location_type: service.distance === 0 ? "virtual" : "physical",
    location_city: service.city,
    location_state: "TX",
    distance_meters: service.distance,
    employee_id: null,
    employee_name: null,
    employee_title: null,
    relevance_score: relevanceScore,
    badges: ["Demo provider", ...service.badges],
  };
}

export function searchDemoServiceCards(params: SearchParams): Card[] {
  const category = params.service_category?.trim().toLowerCase();
  const query = params.search_query?.trim().toLowerCase() ?? "";
  const queryTerms = query.split(/\s+/).filter((term) => term.length > 2);
  const limit = Math.min(Math.max(params.limit_results ?? 8, 1), 20);
  const offset = Math.max(params.offset_results ?? 0, 0);

  return DEMO_SERVICES.filter((service) => {
    if (category && service.category.toLowerCase() !== category) return false;
    if (params.min_price_cents != null) {
      const highest = service.priceCents ?? service.priceMax ?? service.priceMin ?? 0;
      if (highest < params.min_price_cents) return false;
    }
    if (params.max_price_cents != null) {
      const lowest = service.priceCents ?? service.priceMin ?? service.priceMax ?? 0;
      if (lowest > params.max_price_cents) return false;
    }
    if (params.min_duration_minutes != null && service.duration < params.min_duration_minutes) {
      return false;
    }
    if (params.max_duration_minutes != null && service.duration > params.max_duration_minutes) {
      return false;
    }
    return true;
  })
    .map((service) => {
      const searchable = [
        service.name,
        service.business,
        service.tagline,
        service.description,
        service.category,
        service.city,
        ...service.badges,
      ]
        .join(" ")
        .toLowerCase();
      const matches = queryTerms.filter((term) => searchable.includes(term)).length;
      const relevance = queryTerms.length === 0 ? 0.75 : 0.55 + matches / queryTerms.length;
      return {service, relevance};
    })
    .sort((a, b) => b.relevance - a.relevance || a.service.distance - b.service.distance)
    .slice(offset, offset + limit)
    .map(({service, relevance}) => toCard(service, Number(relevance.toFixed(3))));
}
