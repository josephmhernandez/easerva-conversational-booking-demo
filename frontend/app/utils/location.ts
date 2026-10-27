export const STATE_ABBRS: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

const STATE_NAMES_BY_ABBR = Object.entries(STATE_ABBRS).reduce<Record<string, string>>(
  (acc, [name, abbr]) => {
    acc[abbr] = name;
    return acc;
  },
  {}
);

export function toCitySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function toStateAbbr(state: string): string {
  if (!state) return "";
  const trimmed = state.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();

  const matched = Object.entries(STATE_ABBRS).find(
    ([name]) => name.toLowerCase() === trimmed.toLowerCase()
  );

  return matched?.[1] ?? trimmed.slice(0, 2).toUpperCase();
}

export function toStateName(state: string): string {
  if (!state) return "";
  const trimmed = state.trim();

  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    return STATE_NAMES_BY_ABBR[upper] ?? upper;
  }

  const matched = Object.keys(STATE_ABBRS).find(
    (name) => name.toLowerCase() === trimmed.toLowerCase()
  );

  return matched ?? trimmed;
}

interface AddressInput {
  line1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export function extractPrimaryAddressFromBusinessLocationStep(stepData: Record<string, unknown>): AddressInput | null {
  const physical = (stepData?.["serviceTypes.physical"] as { addresses?: AddressInput[] } | undefined)
    ?.addresses;

  if (Array.isArray(physical)) {
    const primary = physical.find((address) => address?.line1 && address?.city && address?.state);
    if (primary) return primary;
  }

  return null;
}
