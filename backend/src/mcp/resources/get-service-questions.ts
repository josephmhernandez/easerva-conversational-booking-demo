import { Question } from "../machines/types";

export function getServiceQuestions(serviceId: string): Question[] {
  switch (serviceId) {
    case "electrical":
      return [
        {
          id: "electrical-type",
          text: "What type of electrical work do you need?",
        },
        {
          id: "electrical-urgency",
          text: "Is this an emergency or routine maintenance?",
        },
        {
          id: "electrical-location",
          text: "Which area of your property needs electrical work?",
        },
      ];

    case "plumbing":
      return [
        {
          id: "plumbing-issue",
          text: "What plumbing issue are you experiencing?",
        },
        {
          id: "plumbing-location",
          text: "Where is the plumbing problem located?",
        },
        {
          id: "plumbing-urgency",
          text: "How urgent is this plumbing repair?",
        },
      ];

    case "cleaning":
      return [
        {
          id: "cleaning-type",
          text: "What type of cleaning service do you need?",
        },
        {
          id: "cleaning-frequency",
          text: "How often would you like cleaning service?",
        },
        {
          id: "cleaning-size",
          text: "What size is the space that needs cleaning?",
        },
        {
          id: "cleaning-special",
          text: "Do you have any special cleaning requirements?",
        },
      ];

    case "landscaping":
      return [
        {
          id: "landscaping-size",
          text: "How large is your outdoor space?",
        },
      ];

    case "painting":
      return [
        {
          id: "painting-location",
          text: "Do you need interior or exterior painting?",
        },
        {
          id: "painting-rooms",
          text: "How many rooms or what area needs painting?",
        },
        {
          id: "painting-condition",
          text: "What's the current condition of the surfaces?",
        },
        {
          id: "painting-timeline",
          text: "When do you need the painting completed?",
        },
      ];

    case "carpentry":
      return [
        {
          id: "carpentry-project",
          text: "What type of carpentry project do you need?",
        },
        {
          id: "carpentry-materials",
          text: "Do you have materials or need them provided?",
        },
        {
          id: "carpentry-timeline",
          text: "What's your preferred timeline for completion?",
        },
      ];

    case "hvac":
      return [
        {
          id: "hvac-service",
          text: "What HVAC service do you need?",
        },
        {
          id: "hvac-system",
          text: "What type of HVAC system do you have?",
        },
        {
          id: "hvac-problem",
          text: "What issue are you experiencing?",
        },
        {
          id: "hvac-maintenance",
          text: "When was your system last serviced?",
        },
      ];

    case "roofing":
      return [
        {
          id: "roofing-issue",
          text: "What roofing issue do you have?",
        },
        {
          id: "roofing-type",
          text: "What type of roof do you have?",
        },
        {
          id: "roofing-age",
          text: "How old is your current roof?",
        },
        {
          id: "roofing-urgency",
          text: "Is this repair urgent due to leaks or damage?",
        },
      ];

    case "real-estate-listing":
      return [
        {
          id: "listing-property-type",
          text: "What type of property are you looking to list?",
        },
        {
          id: "listing-timeline",
          text: "When are you hoping to list your property?",
        },
        {
          id: "listing-condition",
          text: "What condition is your property in?",
        },
        {
          id: "listing-experience",
          text: "Have you sold property before?",
        },
        {
          id: "listing-price-range",
          text: "What's your expected price range?",
        },
      ];

    case "real-estate-purchase":
      return [
        {
          id: "purchase-property-type",
          text: "What type of property are you looking to buy?",
        },
        {
          id: "purchase-budget",
          text: "What's your budget range?",
        },
        {
          id: "purchase-location",
          text: "Which areas are you considering?",
        },
        {
          id: "purchase-timeline",
          text: "When do you want to make a purchase?",
        },
        {
          id: "purchase-financing",
          text: "Do you need financing assistance?",
        },
      ];

    case "real-estate-appraisal":
      return [
        {
          id: "appraisal-purpose",
          text: "What's the purpose of this appraisal?",
        },
        {
          id: "appraisal-property-type",
          text: "What type of property needs appraisal?",
        },
        {
          id: "appraisal-timeline",
          text: "When do you need the appraisal completed?",
        },
        {
          id: "appraisal-recent",
          text: "Have you had a recent appraisal done?",
        },
      ];

    case "real-estate-investment":
      return [
        {
          id: "investment-experience",
          text: "What's your experience with real estate investing?",
        },
        {
          id: "investment-budget",
          text: "What's your investment budget?",
        },
        {
          id: "investment-strategy",
          text: "What type of investment strategy interests you?",
        },
        {
          id: "investment-timeline",
          text: "What's your investment timeline?",
        },
        {
          id: "investment-risk",
          text: "What's your risk tolerance level?",
        },
      ];

    default:
      console.error(`[MCP] No service questions found for service: ${serviceId}`);
      return [];
  }
}
