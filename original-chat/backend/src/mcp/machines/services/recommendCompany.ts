import { chatSessionsDB } from "../../../database/chat-sessions";
import { BookingContext, Company, TimeSlot } from "../types";

export const recommendCompanies = async (): Promise<Company[]> => {
  // This function would typically call an external API or database to get company recommendations
  // For now, we'll return a static list of companies as a placeholder

  // Randomly select a company from the list

  // return the first three companies as a string
  const selectedCompanies = mockedCompanies.slice(0, 3) as Company[];
  const companyList = selectedCompanies
    .map((company) => `- **${company.name}**: ${company.description}`)
    .join("\n");

  // actor emit event to notify that companies have been recommended
  // actor.send({
  //     type: 'COMPANIES_RECOMMENDED',
  //     output: {
  //         companies: selectedCompanies
  //     }
  // } as RecommendCompanyEvent);

  // Set timeout to 2 sec
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return selectedCompanies;
  // return `Here are some recommended companies:\n\n${companyList}\n\nIf you need more information about any of these companies, feel free to ask!`;
};

export const recommendAdditionalCompanies = async (
  context?: BookingContext
): Promise<Company[]> => {
  // This function would typically call an external API or database to get company recommendations
  // For now, we'll return a static list of companies as a placeholder

  // Get the current companies from the context that have already been recommended:
  const currentCompanies = context?.companies;

  // only return max three more companies
  const selectedCompanies = mockedCompanies
    .filter((company) => !currentCompanies?.some((c) => c.id === company.id))
    .slice(0, 3);

  return selectedCompanies;
};

const mockedCompanies = [
  {
    id: "1",
    name: "Tech Innovators Inc.",
    description: "Leading provider of innovative tech solutions.",
  },
  {
    id: "2",
    name: "Green Solutions Ltd.",
    description: "Experts in sustainable and eco-friendly products.",
    questions: [
      {
        id: "1",
        text: "What sustainable products do you need?",
      },
    ],
  },
  {
    id: "3",
    name: "HealthPlus Services",
    description: "Comprehensive health and wellness services.",
  },
  {
    id: "4",
    name: "EduSmart Technologies",
    description: "Cutting-edge educational technology solutions.",
    questions: [
      {
        id: "1",
        text: "Describe the software solution you need.",
      },
      {
        id: "2",
        text: "What time do you need the service?",
      },
    ],
  },
  {
    id: "5",
    name: "Global Logistics Co.",
    description: "Worldwide logistics and supply chain management.",
    questions: [
      {
        id: "1",
        text: "What supply chain services do you need?",
      },
      {
        id: "2",
        text: "What time do you need the service?",
      },
    ],
  },
];

export const getTimeSlotsForCompany = async (
  company: Company,
  isMoreTimeSlots: boolean
): Promise<TimeSlot[]> => {
  console.log("TODO: complete this method: getTimeSlotsForCompany: ", company, isMoreTimeSlots);

  if (isMoreTimeSlots) {
    return [
      {
        id: "1",
        date: "2024-01-17",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        durationMinutes: 60,
        available: true,
      },
    ] as TimeSlot[];
  }

  // Wait for 2 seconds
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const mockTimeSlots = [
    {
      id: "1",
      date: "2024-01-15",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "2",
      date: "2024-01-15",
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "3",
      date: "2024-01-15",
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "4",
      date: "2024-01-16",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "5",
      date: "2024-01-16",
      startTime: "11:00 AM",
      endTime: "12:00 PM",
      durationMinutes: 60,
      available: true,
    },
  ];

  return mockTimeSlots as TimeSlot[];
};

export const checkUserAuthentication = async (
  sessionId: string,
  userId: string
): Promise<boolean> => {
  try {
    // Get the session from the database
    const session = await chatSessionsDB.getSession(sessionId, userId);

    if (!session) {
      console.log(`No session found for sessionId: ${sessionId}, userId: ${userId}`);
      return false;
    }

    // Check if the session is authenticated
    const isAuthenticated = Boolean(session.is_authenticated);
    console.log(`Session ${sessionId} authentication status: ${isAuthenticated}`);

    return isAuthenticated;
  } catch (error) {
    console.error("Error checking user authentication:", error);
    return false;
  }
};
