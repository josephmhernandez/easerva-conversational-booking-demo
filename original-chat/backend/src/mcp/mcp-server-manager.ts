import { Company } from "./machines/types";
import { getNextQuestion } from "./resources/get-next-question";
import { getServices } from "./resources/get-services";
import { getCurrentCompanies } from "./tools/get-current-companies";
import { postAccurateResponse, PostAccurateResponseStruct } from "./tools/post-accurate-response";
import { postSearchServiceCards, SearchParams } from "./tools/post-search-service-cards";
import { postServiceMatch } from "./tools/post-service-match";
import { postUserNeedsMoreTimeSlots } from "./tools/post-user-needs-more-time-slots";
import {
  postUserSelectsCompany,
  PostUserSelectsCompanyOutput,
} from "./tools/post-user-selects-company";
import { postUserSelectsDifferentCompany } from "./tools/post-user-selects-different-company";
import { postUserSelectsTimeSlot } from "./tools/post-user-selects-time-slot";

export interface MCPServerManager {
  updateToolsForState: (currentState: string, actor: any) => void;
  getCurrentTools: () => any[];
  executeTool: (toolName: string, args: any, actor: any) => Promise<any>;
}

// Global tools available in all states
const GLOBAL_TOOLS = [
  {
    name: "get-services",
    description:
      "Get list of available services that the user can book. This is important for the user to understand and ",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get-current-state-context",
    description:
      "Get current state and context of the workflow. This is useful for understanding the current state of the booking process, but more importantly the current goal of the step we are in. Use this to get the context to guide the user to the next step.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "restart-workflow",
    description: "Restart the entire workflow from the beginning",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Reason for restarting" },
      },
    },
  },
];

// State-specific tools
const STATE_SPECIFIC_TOOLS: Record<string, any[]> = {
  "waiting on service message": [
    {
      name: "post-service-match",
      description:
        "Call this tool when the user has inputted enough information to match a service. This is critical for the booking process so call as soon as you have enough information.",
      inputSchema: {
        type: "object",
        properties: {
          serviceId: { type: "string", description: "ID of the selected service" },
          confidence: { type: "number", description: "Confidence level of the match" },
        },
        required: ["serviceId"],
      },
    },
  ],
  "waiting for a service question answer": [
    {
      name: "get-current-question",
      description: "Get the current question to ask the user",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "post-accurate-response",
      description: "Save user response to current question",
      inputSchema: {
        type: "object",
        properties: {
          questionId: { type: "string", description: "ID of the question" },
          questionText: { type: "string", description: "Text of the question" },
          response: { type: "string", description: "User response" },
          accuracy: { type: "number", description: "Response accuracy score" },
        },
        required: ["questionId", "response", "questionText", "accuracy"],
      },
    },
  ],
  "choosing a company": [
    {
      name: "get-current-companies",
      description: "Get the current companies that are available to the user",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get-more-companies",
      description: "Get additional company options",
      inputSchema: {
        type: "object",
        properties: {
          filters: { type: "object", description: "Company filters" },
          limit: { type: "number", description: "Maximum number of companies to return" },
        },
      },
    },
    {
      name: "post-user-selects-company",
      description: "Process user company selection",
      inputSchema: {
        type: "object",
        properties: {
          companyId: { type: "string", description: "Selected company ID" },
          notes: { type: "string", description: "Additional selection notes" },
        },
        required: ["companyId"],
      },
    },
  ],
  "waiting for a company question answer": [
    {
      name: "get-current-question",
      description: "Get the current question to ask the user",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "post-accurate-response",
      description: "Save user response to current question",
      inputSchema: {
        type: "object",
        properties: {
          questionId: { type: "string", description: "ID of the question" },
          questionText: { type: "string", description: "Text of the question" },
          response: { type: "string", description: "User response" },
          accuracy: { type: "number", description: "Response accuracy score" },
        },
        required: ["questionId", "response", "questionText", "accuracy"],
      },
    },
  ],
  "waiting for a time slot answer": [
    {
      name: "post-user-selects-time-slot",
      description: "Save time slot that the user has selected",
      inputSchema: {
        type: "object",
        properties: {
          timeSlotId: { type: "string", description: "ID of the time slot" },
          date: { type: "string", description: "Date of the time slot" },
          startTime: { type: "string", description: "Start time of the time slot" },
          endTime: { type: "string", description: "End time of the time slot" },
        },
        required: ["timeSlotId", "date", "startTime", "endTime"],
      },
    },
    {
      name: "post-user-needs-more-time-slots",
      description:
        "User needs more time slots to choose from. This is a flexible tool that can be used to get more time slots from a RAG tool or a database query.",
      inputSchema: {
        type: "object",
        properties: {
          notes: {
            type: "string",
            description:
              "Additional selection notes to help a RAG tool understand what the time slots the user is looking for or when the user is available.",
          },
        },
        required: [], // No required fields. Flexible to user input if notes are provided.
      },
    },
    {
      name: "post-user-wants-different-company",
      description: "User wants to choose a different company",
      inputSchema: {
        type: "object",
        properties: {
          companyId: { type: "string", description: "ID of the company" },
          notes: { type: "string", description: "Additional selection notes" },
        },
        required: [], // No required fields. Flexible to user input.
      },
    },
  ],
  "schedule a time": [],
  "waiting for good search query": [
    {
      name: "post-search-service-cards",
      description:
        "When there is a valid search query, call this tool to search for service cards for the user. This will return you service and employee cards for the user to select their desired service.",
      inputSchema: {
        type: "object",
        properties: {
          // Search
          search_query: {
            type: "string",
            description:
              "Search text - matches names, descriptions, services (min 4 chars for fuzzy)",
          },

          // Filters
          service_category: {
            type: "string",
            enum: getServices().map((service) => service.id),
            description:
              "Exact category to filter by. ONLY values available are: " +
              getServices()
                .map((service) => service.id)
                .join(", "),
          },
          card_type_filter: {
            type: "string",
            enum: ["service", "employee"],
            description:
              "Type of card to show. ONLY values available are: " +
              ["service", "employee"].join(", "),
          },
          employee_name_filter: {
            type: "string",
            description: "Filter by employee name (partial match)",
          },

          // Price range
          min_price_cents: { type: "number", description: "Minimum price in cents" },
          max_price_cents: { type: "number", description: "Maximum price in cents" },

          // Duration range
          min_duration_minutes: { type: "number" },
          max_duration_minutes: { type: "number" },

          // Location
          user_lat: {
            type: "number",
            description: "User location latitude or location latitude of the desired service",
          },
          user_lng: {
            type: "number",
            description: "User location longitude or location longitude of the desired service",
          },
          max_distance_meters: {
            type: "number",
            description: "Search radius in meters (default: 50000 for ~30 miles)",
          },

          // Pagination
          limit_results: { type: "number", default: 20 },
          offset_results: { type: "number", default: 0 },
        },
        required: ["search_query", "service_category"],
      },
    },
  ],
};

export function createMCPServerManager(): MCPServerManager {
  let currentTools: any[] = [...GLOBAL_TOOLS];

  const updateToolsForState = (currentState: string, actor: any) => {
    // Combine global tools with state-specific tools
    const stateTools = STATE_SPECIFIC_TOOLS[currentState] || [];
    const globalTools =
      currentState === "waiting for good search query"
        ? GLOBAL_TOOLS.filter((tool) => tool.name !== "get-current-state-context")
        : GLOBAL_TOOLS;
    currentTools = [...globalTools, ...stateTools];

    console.log(`[MCPManager:updateToolsForState] Updated tools for state: ${currentState}`, {
      globalTools: GLOBAL_TOOLS.length,
      stateTools: stateTools.length,
      totalTools: currentTools.length,
    });

    console.log(
      `[MCPManager:updateToolsForState] State-specific tools for "${currentState}": ${JSON.stringify(stateTools)}`
    );
  };

  const getCurrentTools = () => currentTools;

  const executeTool = async (toolName: string, args: any, actor: any): Promise<any> => {
    if (!actor) {
      throw new Error("No active actor available for tool execution");
    }

    const { context } = actor.getSnapshot();
    console.log(`[MCP] Executing tool: ${toolName} with args:`, args);
    switch (toolName) {
      // Global tools
      case "get-services":
        const myServices = getServices();
        console.log("[MCP] Fetching services:", myServices);
        return myServices;

      case "get-current-state-context":
        const snapshot = actor.getSnapshot();
        return {
          currentState: snapshot.value,
          goal: "You need to guide the user to complete the booking process. As soon as the user selects a service that matches the current services we offer, use the post-service-match tool to post the match.",
        };

      case "restart-workflow":
        console.log("[MCP] Restarting workflow:", args.reason);
        return { success: true, message: "Workflow restarted", reason: args.reason };

      // State-specific tools
      case "post-service-match":
        const res = await postServiceMatch(actor, args.serviceId);
        return res;

      case "get-current-question":
        const resGetNextQuestion = await getNextQuestion(actor);
        return resGetNextQuestion;

      case "post-accurate-response":
        const resPostAccurateResponse = await postAccurateResponse(
          actor,
          args.questionId,
          args.questionText,
          args.response,
          args.accuracy
        );
        console.log("[MCP] Response from post-accurate-response:", resPostAccurateResponse);
        return resPostAccurateResponse as PostAccurateResponseStruct;

      case "post-user-selects-time-slot":
        console.log(
          "[MCP] User selecting time slot:",
          args.timeSlotId,
          args.date,
          args.startTime,
          args.endTime
        );
        const resPostUserSelectsTimeSlot = await postUserSelectsTimeSlot(
          actor,
          args.timeSlotId,
          args.date,
          args.startTime,
          args.endTime
        );
        return resPostUserSelectsTimeSlot;

      case "post-user-needs-more-time-slots":
        console.log("[MCP] User needs more time slots");
        const resPostUserNeedsMoreTimeSlots = await postUserNeedsMoreTimeSlots(actor, args.notes);
        return resPostUserNeedsMoreTimeSlots;

      case "post-user-selects-different-company":
        console.log("[MCP] User selecting different company:", args.companyId, args.notes);
        const resPostUserSelectsDifferentCompany = await postUserSelectsDifferentCompany(
          actor,
          args.companyId,
          args.notes
        );
        return resPostUserSelectsDifferentCompany;

      // case "post-user-wants-different-company":
      // TODO: do we need separate tools for more companies / select different company?
      //   console.log("[MCP] User wants to choose a different company:", args.companyId, args.notes);

      case "get-more-companies":
        console.log("[MCP] Fetching more companies with filters:", args.filters);
        return {
          companies: [
            { id: "comp1", name: "Company A", description: "Company A description", questions: [] },
            { id: "comp2", name: "Company B", description: "Company B description", questions: [] },
          ] as Company[],
        };

      case "get-current-companies":
        const resGetCurrentCompanies = await getCurrentCompanies(actor);
        return resGetCurrentCompanies;

      case "post-user-selects-company":
        console.log("[MCP] User selecting company:", args.companyId, args.notes);
        const resPostUserSelectsCompany: PostUserSelectsCompanyOutput =
          await postUserSelectsCompany(actor, args.companyId);
        return resPostUserSelectsCompany;

      case "post-search-service-cards":
        console.log("[MCP] Searching for service cards:", args);
        const resPostSearchServiceCards = await postSearchServiceCards(actor, args as SearchParams);
        return resPostSearchServiceCards.cards;
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  };

  return {
    updateToolsForState,
    getCurrentTools,
    executeTool,
  };
}

// Initialize and start MCP server (simplified)
export async function startMCPServer(mcpManager: MCPServerManager) {
  console.log("[MCP] Dynamic MCP server manager initialized");
}
