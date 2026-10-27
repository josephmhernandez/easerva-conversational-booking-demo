import { assertEvent, assign, fromCallback, fromPromise, setup } from "xstate";
import { appendEvent } from "../../database/chat-events";
import { chatMessagesDB } from "../../database/chat-messages";
import { chatSessionsDB } from "../../database/chat-sessions";
import { sendConfirmationMessageToWebSocket } from "../../websocket/websocketUtils";
import { pushMessageToWs } from "./actorHelpers";
import {
  checkUserAuthentication,
  getTimeSlotsForCompany,
  recommendAdditionalCompanies,
  recommendCompanies,
} from "./services/recommendCompany";
import {
  BookingContext,
  BookingMachineInput,
  Company,
  Question,
  Response,
  TimeSlot,
} from "./types";

// type UserMessageEvent = { type: "USER_MESSAGE"; message: string };
type RetryEvent = { type: "RETRY" };
type DoneInvokeValidateServiceUserInputEvent = {
  type: "done.invoke.validateServiceUserInput";
  output: { valid: boolean; followUpQuestions: Question[]; appointment: any };
};

type InvalidServiceUserInputEvent = {
  type: "INVALID_SERVICE_USER_INPUT";
  output: { valid: boolean; followUpQuestions: Question[]; appointment: any };
};
type InvalidServiceQuestionAnswerEvent = {
  type: "INVALID_SERVICE_QUESTION_ANSWER";
  output: { valid: boolean; followUpQuestions: Question[]; appointment: any };
};

/**
 * EVENTS For the BookingMachine
 */
export type RestoreStateEvent = {
  type: "RESTORE_STATE";
  value: string;
};
export type ValidServiceUserInputEvent = {
  type: "VALID_SERVICE_USER_INPUT";
  output: { valid: boolean; followUpQuestions: Question[]; appointment: any; serviceId: string };
};
export type ValidServiceQuestionAnswerEvent = {
  type: "VALID_SERVICE_QUESTION_ANSWER";
  output: { valid: boolean; questionId: string; answer: string };
};
export type RecommendCompanyEvent = {
  type: "COMPANIES_RECOMMENDED";
  output: { companies: Company[]; pushMessage: string };
};
export type MessagePushedEvent = { type: "MESSAGE_PUSHED" };
export type MoreCompaniesRequestedEvent = { type: "MORE_COMPANIES_REQUESTED" };
export type CompanySelectedEvent = { type: "COMPANY_SELECTED"; output: { company: Company } };
export type RequestMoreTimeSlotsEvent = {
  type: "REQUEST_MORE_TIME_SLOTS";
  output: { timeSlots: TimeSlot[] };
};
export type TimeSelectedEvent = { type: "TIME_SELECTED"; output: { timeSlot: TimeSlot } };
export type SelectDifferentCompanyEvent = {
  type: "SELECT_DIFFERENT_COMPANY";
  output: { company: Company };
};
export type RecommendTimeSlotsEvent = {
  type: "TIME_SLOTS_RECOMMENDED";
  output: { timeSlots: TimeSlot[]; pushMessage: string };
};
export type StoreMoreTimeSlotsEvent = {
  type: "STORE_MORE_TIME_SLOTS";
  output: { timeSlots: TimeSlot[] };
};
export type RequestDifferentCompanyEvent = {
  type: "REQUEST_DIFFERENT_COMPANY";
  output: { companies: Company[] };
};

export type UpdateSocketEvent = {
  type: "UPDATE_SOCKET";
  socket: any;
};

export type CheckUserAuthenticationEvent = {
  type: "CHECK_USER_AUTHENTICATION";
};

export type UserIsAuthenticatedEvent = {
  type: "USER_IS_AUTHENTICATED";
};

export type UserIsNotAuthenticatedEvent = {
  type: "USER_IS_NOT_AUTHENTICATED";
};
/**
 * ON DONE BookingMachine Events
 */
type DoneInvokeRecommendTimeSlotsEvent = {
  type: "done.invoke.recommendTimeSlots";
  output: { timeSlots: TimeSlot[] };
};

// All events for the BookingMachine
export type BookingEvent =
  | RetryEvent
  | DoneInvokeValidateServiceUserInputEvent
  | ValidServiceUserInputEvent
  | InvalidServiceUserInputEvent
  | ValidServiceQuestionAnswerEvent
  | InvalidServiceQuestionAnswerEvent
  | RecommendCompanyEvent
  | MessagePushedEvent
  | MoreCompaniesRequestedEvent
  | CompanySelectedEvent
  | TimeSelectedEvent
  | RecommendTimeSlotsEvent
  | RequestMoreTimeSlotsEvent
  | SelectDifferentCompanyEvent
  | RequestDifferentCompanyEvent
  | UpdateSocketEvent
  | DoneInvokeRecommendTimeSlotsEvent
  | StoreMoreTimeSlotsEvent
  | CheckUserAuthenticationEvent
  | UserIsAuthenticatedEvent
  | UserIsNotAuthenticatedEvent;

export type RecommendTimeSlotsInput = {
  selectedCompany: Company;
  userId: string;
  sessionId: string;
  isMoreTimeSlots?: boolean;
};

const performDatabaseSave = ({ context, self }: { context: BookingContext; self: any }) => {
  setTimeout(() => {
    const currentState = self.getSnapshot().value;

    chatSessionsDB
      .updateContext(context.sessionId, context.userId, context, currentState)
      .catch((error: any) => {
        console.error("[BookingMachine] Error updating context in database:", error);
      });
  }, 0);
};

export const bookingMachine = setup({
  types: {
    context: {} as BookingContext,
    input: {} as BookingMachineInput,
    events: {} as BookingEvent,
  },
  actions: {
    logCurrentContext: ({ context }) => {
      console.log("[BookingMachine] - DEBUGGING", context);
    },
    storeServiceId: assign({
      serviceId: ({ event }) => {
        assertEvent(event, "VALID_SERVICE_USER_INPUT");
        return event.output.serviceId;
      },
    }),
    storeResponse: assign(({ context, event }) => {
      assertEvent(event, "VALID_SERVICE_QUESTION_ANSWER");
      const response = event.output;
      // Look for the question in the context.questions array
      const questionId = event.output.questionId;
      const question = context.questions?.find((q) => q.id === questionId);
      if (!question) {
        console.error("No question found to store response for:", response);
        return {};
      }
      const responseData = {
        ...question,
        answer: response.answer,
        confidenceScore: response,
      };
      return {
        responses: [...(context.responses || []), responseData],
      };
    }),
    removeQuestion: assign({
      questions: ({ context, event }) => {
        assertEvent(event, "VALID_SERVICE_QUESTION_ANSWER");
        const id = event.output.questionId;
        if (!id) {
          console.error("No question ID found to remove:", event);
          return context.questions;
        }
        return context.questions?.filter((q) => q.id !== id);
      },
    }),
    storeCompanies: assign(({ context, event }) => {
      assertEvent(event, "COMPANIES_RECOMMENDED");
      return {
        companies: event.output.companies,
        pushMessage: event.output.pushMessage,
      };
    }),
    storeSelectedTimeSlot: assign({
      selectedTimeSlot: ({ event }) => {
        assertEvent(event, ["TIME_SELECTED"]);
        return event.output.timeSlot;
      },
    }),
    storeTimeSlots: assign(({ context, event }) => {
      assertEvent(event, ["STORE_MORE_TIME_SLOTS"]);
      const fullAvailableTimes = [
        ...(context.availableTimes || []),
        ...(event.output.timeSlots || []),
      ];
      return {
        availableTimes: fullAvailableTimes,
      };
    }),
    storeQuestions: assign({
      questions: ({ event }) => {
        assertEvent(event, "VALID_SERVICE_USER_INPUT");
        return event.output.followUpQuestions;
      },
    }),
    pushCompanies: assign({
      pushMessage: ({ context, event }) => {
        if (event.type !== "COMPANIES_RECOMMENDED") {
          return "";
        }
        assertEvent(event, "COMPANIES_RECOMMENDED");
        return event.output.pushMessage;
      },
    }),
    updateSocket: assign({
      socket: ({ event }) => {
        console.log("[BookingMachine:updateSocket] updateSocket action");
        assertEvent(event, "UPDATE_SOCKET");
        return event.socket;
      },
    }),
    storeCompanySelection: assign(({ event }) => {
      assertEvent(event, ["COMPANY_SELECTED", "SELECT_DIFFERENT_COMPANY"]);
      return {
        selectedCompany: event.output.company,
        questions: event.output.company.questions,
      };
    }),
    addNewCompaniesToContext: assign({
      companies: ({ event }) => {
        assertEvent(event, "REQUEST_DIFFERENT_COMPANY");
        return [...event.output.companies] as Company[];
      },
    }),
    pushTimeSlotsToWs: ({ context }) => {
      if (context.socket && context.availableTimes && context.availableTimes.length > 0) {
        console.log("📤 Calling pushMessageToWs with time slots:", context.availableTimes);
        pushMessageToWs(context.socket, "waiting for a time slot answer", "", {
          availableTimes: context.availableTimes,
        });
      }
    },
    pushCompanyConfirmationMessageToWs: ({ context }) => {
      if (context.socket && context.selectedCompany) {
        sendConfirmationMessageToWebSocket(
          context.socket,
          "company.selection.confirmed",
          `Great choice! You've selected ${context.selectedCompany.name}. Let's proceed with the next steps.`
        );
      }
    },
    pushTimeSelectionConfirmationMessageToWs: ({ context }) => {
      if (context.socket && context.selectedTimeSlot) {
        sendConfirmationMessageToWebSocket(
          context.socket,
          "time.selection.confirmed",
          `Confirming your appointment time ${context.selectedTimeSlot.startTime}`
        );
      }
    },
    performDatabaseSave,
  },
  guards: {
    hasQuestionsLeft: ({ context }) => {
      return !!(context.questions && context.questions.length > 0);
    },
  },
  actors: {
    recommendCompany: fromCallback(({ sendBack }) => {
      recommendCompanies()
        .then((companies) => {
          let rtnString = "";
          for (const company of companies as Company[]) {
            rtnString += `- **${company.name}**: ${company.description}\n`;
          }

          // Set push message to rtnString
          // pushMessage: rtnString,
          // // set companies to companies
          // companies: companies,

          // Push the message to ws.

          sendBack({
            type: "COMPANIES_RECOMMENDED",
            output: {
              companies: companies,
              pushMessage: rtnString,
            },
          } as RecommendCompanyEvent);
        })
        .catch((error) => {
          console.error("Error recommending companies:", error);
        });
    }),
    recommendAdditionalCompanies: fromCallback(({ sendBack }) => {
      recommendAdditionalCompanies()
        .then((companies) => {
          let rtnString = "";
          for (const company of companies as Company[]) {
            rtnString += `- **${company.name}**: ${company.description}\n`;
          }
          sendBack({
            type: "ADDITIONAL_COMPANIES_RECOMMENDED",
            output: {
              companies: companies,
              pushMessage: rtnString,
            },
          });
        })
        .catch((error) => {
          console.error("Error recommending additional companies:", error);
        });
    }),
    recommendTimeSlots: fromPromise<{ timeSlots: TimeSlot[] }, RecommendTimeSlotsInput>(
      async ({ input, signal }) => {
        console.log("[BookingMachine: recommendTimeSlots] - actors - recommendTimeSlots: ", input);
        const res: TimeSlot[] = await getTimeSlotsForCompany(
          input?.selectedCompany as Company,
          input?.isMoreTimeSlots ?? false
        );
        console.log(
          "[BookingMachine: recommendTimeSlots] - actors - FINISHED recommendTimeSlots: ",
          res
        );
        return { timeSlots: res };
      }
    ),
    ensureUserIsAuthenticated: fromCallback(({ sendBack, input }) => {
      const context = input as BookingContext;
      checkUserAuthentication(context.sessionId, context.userId)
        .then((isAuthenticated: boolean) => {
          sendBack({
            type: isAuthenticated ? "USER_IS_AUTHENTICATED" : "USER_IS_NOT_AUTHENTICATED",
          });
        })
        .catch((error: any) => {
          console.error("Error checking user authentication:", error);
          sendBack({ type: "USER_IS_NOT_AUTHENTICATED" });
        });
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCMD2qDWBLAdlAYgDaoDuAdCQIZYAuuUABKjg7GAE4BuWAxmAwFs4sSjADEANQCCAGQCSAEQD6AZQCiAJQlyAwmqUBVdRqVyAcgAUDAFQDaABgC6iUAAdUsWlmYuQAD0QAZgAWAE4yYIA2ACZg+3swgA4AdlD4wIAaEABPRFDk6LIARkSAVmjQwMTA6NLk+yKAX0astEx6IlIKajo8JhY2Ll5+IVgRcQMLBSlrfRUAeR0AaTU7J193TzofJH9EItiyCsjk4NLI0vtkovtoxKzchDTEiKKTy+jkwMj7RODm1robB4TrkKhePrMVgcbh8QTCURgMQaNQqazzFGqawzNQOZy7TZeHagAIIA6lMj5YKJNLJGnxRL2UIPRCJIrBMjfSJpGKRRIVK4AkBtYEEYhgnr0BgAM1Q7AYlGhQzhAEcAK5wbYsSg4WAkDiSWSKVSabR6JQARQMqOscnmZiUUjMKgA6po8RsPEScL5SSFwlFYvEkql0iyEAV7GRIjdqYluZFgoECkKRR1xd0IYxZfLFYNYfx1ZrvNrdfr2GJJtNZqpFis1vi3F6tb7EMkYmR+fyKkUiqE3pFw5EY5SwpdquyfoFSqmgemulBUDQGJxKIQsBAlQWGEXYFqFWWDVWcbXlqsPQTmyXW2T7IEIude6HKtFjkPzp3gn2zkVk8FkuUs7tCCGaLsuq7rpu+bDDuGp7iWB56gaF5Nls167H6YQRDEcQJKEKRpHe4Z-FGib8vYJyToGQGiqCZBgSua4bluMG7vuOpIRWthFI2ICEi2GFBFhga4SGhGZDkiDRG80Y3FUJwAaE45NC0wpziBXTsGAPCoAIQg4BAUqKjpAiuDq2RiDo8wALIWE6ciokoKJWdZ1lqGYChqAoKF8VexJ7LenxkKUKRstyDL9qU4bRBRnanGUcSlIE9h1CcNHzuQWkmfphl9MZulmTgFnHjWCxng2npof5pLtlGNTVDGpSlIRDThjckTBbUVw-NEMaMnS6UaeQPAABboJ4eUMCZhUWdZGL6C5dlmA5KhOWoVo2l5Pn8ehJL7CFFK-EUdJRIEyXfNE0XlMUMRnTc5zfF8g1il0o3jUZU0FeZlk2UtACaJoyGoOizN56yXlVPqCWSB1kEdJ2RGdd4xOGwRJpSIW-PhBSlF+T2qWmQ1kG9XqTdN30lXMdbnuDqHejev4nNGBH4fhX7JcEbXRPeNTUuyoRftyx0qYCwEvZl2m6TlCoQIZWprp9pk6lgcA-bZ9mOc5NluR5W2075kMMz8FKVEU5R3HEzyc5JMMvL2sQpClsb5DOBPqeLZBZVLYAGTLcslgr5M4CrsCVlMJ5lfW21+VDe1kkp4Tc2jXx0hUiT3DbbLRgBVxHYjZH-G7Yt0WwhDaTQkAKorM1iNHhvQ6+FRw8mNRvLjjtRTbgacjSITUpcJT5IEz0l2AZc8BXm75UrRW1zxlX0w3r7hHeXzSRc1L1J3jxNUUxTsr2ybtqUfbRCPGbgr02ZylXQfZLBxZQhx5aGvIyjGGa+gbWidoOk6rrun1jtaqUll7NzXm3TeKVoqhEKHSSo1RzgxSTAkc+XRL5ShzLfL6RUH7wSfoeCslNTxRyATHG8vUsIpVuPUbkyQ6TxmiiEYodxPhXDiMmS4kQ0HkAYoqCCzE754PYoQsO1YqblTrovOOfYfhHAouyOIjJKhJnDMlF4kZvjsj+EmN4w8i60VAkuKuAjNxCLYghZ+yEyH1zjo3FeLd17ty3qjA4nZeoNXqClaoSkeH0WMfwpiZicH3wsQQzic9eLANjgFex4DW4bw7uGLhZAALHQqIEX8040Z+NgKNSAaoy5VzoEIMQEBmBgDILgTgmBKlez0j7CA1gsBCBUMQGgsApECTsTUKMcQYgCxCjSakg4bbNQpP+RM+FuahD5IEUIuT8kQEKfwRUJSkQcHYHKMgrhCCUBoDmAQntJYNIMs01p7TOk2OkbE2Zds+SnDRmOFIqNZnBVSFvX4NIDh+IwX0LBayWn8FgO0xCL9bRuUBsDUGXTdoBRuEFEKdI3iEW+dvNs3wIiwISMdNIqUFkGIypmK+Mob6AqEKwUFViKxonmkoOamIIVzBkPMawKhYUgIjCfI4fxlG-HeBRVGKUjinFOEyKZyDfmSn+WShg6zKUBNESib+1glAKDkPgfAmh3KqsWk6P6HKYmkgRckYKoUUURTNmo+IlJYizIyYyJMZwpVZlJbmOVQKFXLmpWIdQQMQZqo1VqlEZhdW-X1YahmNCzXIvCljK1YzMkRGCNJfIdJyjNULqLQx6DpXX3dfKkFiqInEMjjTKJ5DoZ0g6vyJKzVXwND7MkNRvYjgO1mQnHq8Y-HSlwFgWAI1IBiIjtTCqEMbl+m5h1KINIQppBCC8ruyVOTtj+GK+k1xkjNFUjgVAEA4C+EJuLBe3SAoAFoijhjPdwwlRM-mMChNBOEoxxhgBPXC0k6dmZMh5Hedq042rxFNVEC4AtPg0lqAS7NRL71uqrk+wscERGcXfZy7khQ+qMh+MdEK1Jwy1UpKESo5RMlEekn4hipiWKqiQ5YwhqGjWIH-PhpqnZ+zwPZJ8WBW7b0e3qTlD6d8GM3gKHvJk8luYUQ3s2m2MUKR1DCDFP9SQah+JJhNRg08ZrCehlk8IOjD6-jqPEUZjxG4rsU1UXqClXbQaJvxxpftvSBxwSHHTMj073nwmbWo1wzZsgko8EoUYChhG0evfkVRclj3LpXLT5l3PwvyHvIz4HhyxF7BnR4IGjhnCRWEMLgFeN0VgwC6u5lhF0ZQ+O09pJfOFD7MmT4x0uTnDUWdYoyL2SnHOLAm9dmPZ8MYpBcruCwmlmq3TWr+x6S2pGYjdhpxAtMauKk+o-5kYC2OlmtSxcMx5MHcsop5K301Y-VJOoDXKgFE3a10zTH8giuHAppMMRPgupJWVwtVL6Nnc5T12SyV0vflgck5dmTU1fjvFEX8Pa+0DsgIlydvxoy1DOqkEIONrY7ybim4c-YvwptiDx5oQA */
  id: "bookingFlow",
  initial: "waiting on service message",
  context: ({ input }: { input: BookingMachineInput }) => {
    return {
      userId: input.userId,
      sessionId: input.sessionId,
      serviceId: input.serviceId ?? "",
      appointmentInfo: input.appointmentInfo ?? ({} as Record<string, any>),
      questions: input.questions ?? [],
      pushMessage: input.pushMessage ?? "",
      socket: input.socket ?? null,
      responses: input.responses as Response[] | [],
      companies: input.companies as Company[] | [],
      availableTimes: input.availableTimes as TimeSlot[] | [],
      selectedCompany: input.selectedCompany as Company | null,
      selectedTimeSlot: input.selectedTimeSlot as TimeSlot | null,
      hasAddedCompaniesToMessages: input.hasAddedCompaniesToMessages ?? false,
    };
  },
  states: {
    "waiting on service message": {
      on: {
        VALID_SERVICE_USER_INPUT: {
          target: "waiting for a service question answer",
          actions: ["storeServiceId", "storeQuestions", "logCurrentContext"],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
        RESTORE_STATE: [
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "waiting for a service question answer";
            },
            target: "waiting for a service question answer",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "got valid service question answer";
            },
            target: "got valid service question answer",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "recommending a company";
            },
            target: "recommending a company",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "choosing a company";
            },
            target: "choosing a company",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "recommend additional companies";
            },
            target: "recommend additional companies",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "selected a company";
            },
            target: "selected a company",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "waiting for a company question answer";
            },
            target: "waiting for a company question answer",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "got a valid company question answer";
            },
            target: "got a valid company question answer",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "waiting for a time slot answer";
            },
            target: "waiting for a time slot answer",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "finished";
            },
            target: "finished",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "waiting for user auth";
            },
            target: "waiting for user auth",
          },
          {
            guard: ({ context, event }: { context: BookingContext; event: RestoreStateEvent }) => {
              assertEvent(event, "RESTORE_STATE");
              return event.value === "check user auth";
            },
            target: "check user auth",
          },
          {
            target: "waiting on service message",
          },
        ],
      },
    },
    "waiting for a service question answer": {
      entry: ["logCurrentContext", "performDatabaseSave"],
      on: {
        VALID_SERVICE_QUESTION_ANSWER: {
          target: "got valid service question answer",
          actions: ["storeResponse", "removeQuestion"],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
    "got valid service question answer": {
      always: [
        {
          guard: "hasQuestionsLeft",
          target: "waiting for a service question answer",
        },
        {
          target: "recommending a company",
        },
      ],
      on: {
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
    "recommending a company": {
      entry: ["performDatabaseSave"],
      invoke: {
        src: "recommendCompany",
      },
      on: {
        COMPANIES_RECOMMENDED: {
          target: "check user auth", // Ensure the user is authenticated.
          actions: ["storeCompanies"],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
    "check user auth": {
      entry: ["performDatabaseSave"],
      invoke: {
        src: "ensureUserIsAuthenticated",
        input: ({ context }) => context,
      },
      on: {
        USER_IS_AUTHENTICATED: {
          target: "choosing a company",
        },
        USER_IS_NOT_AUTHENTICATED: {
          target: "waiting for user auth",
        },
      },
    },
    "waiting for user auth": {
      entry: [
        "performDatabaseSave",
        ({ context }) => {
          if (context.socket) {
            pushMessageToWs(
              context.socket,
              "waiting for user auth",
              "Thanks for using our booking platform. Please sign in or sign up to book your appointment.",
              {}
            );
          }
        },
      ],
      on: {
        CHECK_USER_AUTHENTICATION: {
          target: "check user auth",
        },
      },
    },
    "choosing a company": {
      entry: [
        "logCurrentContext",
        "pushCompanies",
        assign(({ context }) => {
          console.log(
            "🏢 Entering 'choosing a company' state with companies:",
            JSON.stringify(context.companies)
          );
          let hasAddedCompaniesToMessages = context.hasAddedCompaniesToMessages;
          // Send company recommendations to WebSocket
          if (
            context.socket &&
            context.companies &&
            context.companies.length > 0 &&
            !context.hasAddedCompaniesToMessages
          ) {
            pushMessageToWs(context.socket, "choosing a company", "", {
              companies: context.companies,
            });
            hasAddedCompaniesToMessages = true;
          } else {
            // Need to persist the companies even when the websocket is not connected. This has a chance to not be connected because it is reconnecting after user auth.
            if (context.sessionId && !context.hasAddedCompaniesToMessages) {
              appendEvent(context.sessionId, "company.recommendations", {
                companies: context.companies,
                timestamp: new Date().toISOString(),
              }).catch((error) => {
                console.error("Error appending event to chat_events DB:", error);
              });
              chatMessagesDB
                .addMessage(
                  context.sessionId,
                  "assistant",
                  "Here are some companies that we found for you...",
                  "COMPANY",
                  context.companies as Company[]
                )
                .catch((error) => {
                  console.error("Error adding message to chat_messages DB:", error);
                });
              // if it errors here then we're not in a great place..
              hasAddedCompaniesToMessages = true;
            }
          }
          return { hasAddedCompaniesToMessages };
        }),
        performDatabaseSave,
      ],
      on: {
        MORE_COMPANIES_REQUESTED: {
          target: "recommend additional companies",
          actions: ["storeCompanies"],
        },
        COMPANY_SELECTED: {
          target: "selected a company",
          actions: ["storeCompanySelection"],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
    "recommend additional companies": {
      entry: ["performDatabaseSave"],
      invoke: {
        src: "recommendAdditionalCompanies",
        input: ({ context }) => context,
      },
      on: {
        COMPANIES_RECOMMENDED: {
          target: "choosing a company",
          actions: ["storeCompanies"],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
    "selected a company": {
      entry: ["performDatabaseSave", "pushCompanyConfirmationMessageToWs"],
      always: [
        {
          guard: "hasQuestionsLeft",
          target: "waiting for a company question answer",
        },
        {
          target: "schedule a time",
        },
      ],
    },
    "waiting for a company question answer": {
      entry: [
        "logCurrentContext",
        "performDatabaseSave",
        ({ context }) => {
          console.log(
            "🏢 Entering 'waiting for a company question answer' state with companies: ",
            JSON.stringify(context.companies)
          );
          // if no questions. Early skip to validate company question answer
          // push to ws
          if (context?.socket) {
            pushMessageToWs(
              context.socket,
              "waiting for a company question answer",
              "",
              context.questions[0]
            );
          }
        },
      ],
      on: {
        VALID_SERVICE_QUESTION_ANSWER: {
          target: "got a valid company question answer",
          actions: ["storeResponse", "removeQuestion"],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
    "got a valid company question answer": {
      always: [
        {
          guard: "hasQuestionsLeft",
          target: "waiting for a company question answer",
        },
        {
          target: "schedule a time",
        },
      ],
      on: {
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
    "schedule a time": {
      // entry: ["performDatabaseSave"],
      invoke: {
        id: "recommendTimeSlots",
        src: "recommendTimeSlots",
        input: ({ context }) =>
          ({
            selectedCompany: context.selectedCompany,
            isMoreTimeSlots: false,
          }) as RecommendTimeSlotsInput,
        onDone: {
          // Action to store the time slots that were just recommended.
          actions: assign({
            availableTimes: ({ event }) => {
              return event.output.timeSlots as TimeSlot[];
            },
          }),
          target: "waiting for a time slot answer",
        },
        onError: {
          target: "finished",
          actions: [
            ({ event }: { event: any }) => console.log("onError V BAD triggered:", event),
            assign({
              availableTimes: () => [],
            }),
          ],
        },
      },
    },
    "waiting for a time slot answer": {
      entry: [
        "logCurrentContext",
        ({ context }) => {
          // push the time slots to the socket
          if (context.socket && context.availableTimes && context.availableTimes.length > 0) {
            console.log("📤 Calling pushMessageToWs with time slots:", context.availableTimes);
            pushMessageToWs(context.socket, "waiting for a time slot answer", "", {
              availableTimes: context.availableTimes,
            });
          } else {
            console.log("⚠️ No socket or time slots available:", {
              sessionId: context.sessionId,
              hasSocket: !!context.socket,
              timeSlotsCount: context.availableTimes?.length,
            });
          }
        },
        "performDatabaseSave",
      ],
      on: {
        TIME_SELECTED: {
          target: "finished",
          actions: ["storeSelectedTimeSlot", "pushTimeSelectionConfirmationMessageToWs"],
        },
        STORE_MORE_TIME_SLOTS: {
          target: "waiting for a time slot answer",
          actions: ["storeTimeSlots", "pushTimeSlotsToWs"],
        },
        REQUEST_DIFFERENT_COMPANY: {
          target: "choosing a company",
          actions: ["addNewCompaniesToContext"], //TODO: ADD something here?
        },
        SELECT_DIFFERENT_COMPANY: {
          target: "choosing a company",
          actions: ["storeCompanySelection"],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
      target: "finished",
    },
    // "recommend additional time slots": {
    //   invoke: {
    //     id: "recommendAdditionalTimeSlots",
    //     src: "recommendTimeSlots",
    //     input: ({ context }) => ({ selectedCompany: context.selectedCompany, isMoreTimeSlots: true } as RecommendTimeSlotsInput),
    //     onDone: {
    //       // Action to store the time slots that were just recommended.
    //       actions: assign({
    //         availableTimes: ({ event }) => {
    //           return event.output.timeSlots as TimeSlot[];
    //         },
    //       }),
    //       target: "waiting for a time slot answer",
    //     },
    //     onError: {
    //       target: "finished",
    //       actions: [
    //         ({ event }: { event: any }) => console.log("onError triggered:", event),
    //         assign({
    //           availableTimes: () => []
    //         }),
    //       ]
    //     }
    //   },
    // },
    finished: {
      entry: [
        "logCurrentContext",
        "performDatabaseSave",
        ({ context }) => {
          console.log(
            "🏢 Entering 'finished' state with companies: ",
            JSON.stringify(context.companies)
          );
          // push to ws
          if (context?.socket) {
            pushMessageToWs(
              context.socket,
              "finished",
              "Thank you for using our service! We'll be in touch soon.",
              undefined
            );
          }
        },
      ],
      on: {
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
  },
});
