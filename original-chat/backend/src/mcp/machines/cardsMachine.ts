import { assertEvent, assign, fromPromise, setup } from "xstate";
import { Card } from "../../shared/protocol";
import { pushMessageToWs } from "./actorHelpers";
import { getTimeSlotsForCard } from "./services/recommendTimeSlotsForCards";
import {
  CardsReturnedEvent,
  CardsSearchQuery,
  InvalidSearchQueryEvent,
  RecommendTimeSlotsCardsInput,
  StoreMoreTimeSlotsEvent,
  TimeSlot,
  UpdateSocketEvent,
  ValidSearchQueryEvent,
} from "./types";

export interface CardsContext {
  userId: string;
  sessionId: string;
  socket: any;
  error?: string | null;
  searchQuery?: CardsSearchQuery | null;
  cards?: Card[] | null;
  availableTimes?: TimeSlot[] | null;
  selectedCard?: Card | null;
  selectedTimeSlot?: TimeSlot | null;
  invalidSearchQueryReasons?: object[] | [];
}

export interface CardsMachineInput {
  userId: string;
  sessionId: string;
  socket: any;
  searchQuery?: CardsSearchQuery | null;
  cards?: Card[] | null;
  availableTimes?: TimeSlot[] | null;
  selectedCard?: Card | null;
  selectedTimeSlot?: TimeSlot | null;
  error?: string | null;
  invalidSearchQueryReasons?: object[] | [];
}

export type CardsEvent =
  | UpdateSocketEvent
  | ValidSearchQueryEvent
  | InvalidSearchQueryEvent
  | StoreMoreTimeSlotsEvent
  | CardsReturnedEvent
  | {
      type: string;
      output?: any;
    };

// TODO: have RESTORE_STATE event to restore the state of the machine.
export const cardsMachine = setup({
  types: {
    context: {} as CardsContext,
    input: {} as CardsMachineInput,
    events: {} as CardsEvent,
  },
  actions: {
    logStateChange: ({ self }) => {
      console.log("[cardsMachine] - State changed to:", self.getSnapshot().value);
    },
    logCurrentContext: ({ context }) => {
      console.log("[cardsMachine] - DEBUGGING", context);
    },
    storeSearchQuery: assign({
      searchQuery: ({ event }) => {
        assertEvent(event, "VALID_SEARCH_QUERY");
        return event.output.searchQuery;
      },
    }),
    storeSelectedCard: assign({
      selectedCard: ({ event }) => {
        assertEvent(event, "CARD_SELECTED");
        return event.output.card;
      },
    }),
    updateSocket: assign({
      socket: ({ event }) => {
        console.log("[CardsMachine:updateSocket]: updateSocket action");
        assertEvent(event, "UPDATE_SOCKET");
        return (event as UpdateSocketEvent).socket;
      },
    }),
    pushErrorMessageToWebSocket: ({ context }) => {
      if (context.socket) {
        pushMessageToWs(
          context.socket,
          "error searching for cards",
          "An error occurred while searching for cards. Please try again."
        );
      }
    },
    pushMessageToWebSocket: ({ context }) => {
      if (context.socket) {
        pushMessageToWs(
          context.socket,
          "time.selection.confirmed",
          "Great choice! You've selected a time slot. Let's proceed with the next steps."
        );
      }
    },
    pushCardsToWebSocket: ({ context }) => {
      console.log("[cardsMachine:pushCardIdsToWebSocket] - Context:", {
        hasSocket: !!context.socket,
        hasCards: !!context.cards,
        cardsCount: context.cards?.length,
      });
      if (context.socket && context.cards) {
        console.log(
          "[cardsMachine:pushCardsToWebSocket] - Sending cards to websocket:",
          context.cards
        );
        pushMessageToWs(context.socket, "search for cards", "", {
          cards: context.cards,
        });
      } else {
        console.warn("[cardsMachine:pushCardIdsToWebSocket] - Cannot send cardIds:", {
          hasSocket: !!context.socket,
          hasCards: !!context.cards,
        });
      }
    },
    pushTimeSlotsToWebSocket: ({ context }) => {
      if (context.socket && context.availableTimes) {
        pushMessageToWs(context.socket, "waiting for a time slot answer", "", {
          availableTimes: context.availableTimes,
        });
      }
    },
    storeSelectedTimeSlot: assign({
      selectedTimeSlot: ({ event }) => {
        assertEvent(event, "TIME_SLOT_SELECTED");
        return event.output.timeSlot;
      },
    }),
  },
  actors: {
    recommendTimeSlots: fromPromise<{ timeSlots: TimeSlot[] }, RecommendTimeSlotsCardsInput>(
      async ({ input, signal }) => {
        console.log("[CardsMachine:recommendTimeSlots]: recommendTimeSlots action", input);
        const res: TimeSlot[] = await getTimeSlotsForCard(
          input?.selectedCard as Card,
          input?.isMoreTimeSlots ?? false
        );
        return { timeSlots: res };
      }
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAnCsCyrkAsBLAOzADoB3VQgFxKgAIAzAe3QYFdYx2aWGANiygkAxAGEAEgFFxAaQD6AVQDK0gEoKAgkoAqMgHK6AkuK0mA8gYDaABgC6iUAAcWsWoRbEnIAB6IATgB2AEYyIIBmIIA2WwAmIIBWaJDbEIiAGhAAT0QYuLII4IC4qICQgA5EgOiAX1qstEwcPCJSMgIwZABrTm52VA4afFFVDQVjFW09QxMzXWkAETtHJBBXdzovH38EEMSggsS4xJCkxMSAFjiK6Iqs3IQgy4qyAOST6Jr3r8T6xowWFwBBI5E6PT6PAYg2GozUmkmCgMFl00300iMpnMSxWPg2Hm2a12wVeiQq6Qix1sFTitkuAQeeXSZESlOu+wClzScUu-xATSBrVBlGodGIjFY7CgLBYEAY3AwBAYAEcODxsqIAGpaAAyxkWCjUWnUUgUAEUlBoAJq4tb4rbeImIOIhEIFCJuoLU9K3WwRTI5RCxIIsy6XM4RCoBclJCp8gUtEHtKgecXMNgMaWy+VgRX4FVq9Aa4wGbV6g1Gk2Sc2W9Q2hx4twEx2gXaVRK2MjRLnk67U8khS6MhD0sInE62apRgJ0wfxwGJtrkFNiiUZrNyhXoJWq9WjAAKi2xhos8mkultLibDp2iEqQQCLP2NNs+Ti3YZgYQRRDtInlySEI7hCAJ52aYElzILclUlBgEwkY1FimdRzyUdQDBxBs7WvTwWz8Z1BwiMh9m7U5SPDYcLleYDolCL0-RuOoGn5BcIOFaD81g+ClEPY8VFPORz0vdYcMJVtnSiApSkHaJogSCoggqP1hzDRJCniEpXQU1kIiYgFwKFdoVFzbd81QYhN2QdAWAEARRAwpYFGwCwUIUMx1CQ4T7Vw289gOI4TjOC4rkY+4v0qR9bGCU5Ark6IijiMDBSTchjLzaELPlKybLs9yK2kHVZAWZYsKvTYfKdPZqTU2J4tCdIw1ooJh3JLsklsP1KlkjtLgiJLF2FNLTIyyzrNs0RK1NC1rTcyQtAMABxTDVjK5tfP2Q4WUC84QtuMLHlKEMag6wdQnDV052YhM2KMkylXM0acoPI8FhPM8L1KkTyrE-C9giOICiqGkP3SQ64mHfZLnCCp6T2nk3T0liDJSqDOggDgBDAaEGDoABbMBRAgLxyBIAA3FhunIdAuhYXH8Ys3RCHxlQhBoWAvNEvDdkuY43nank5IfWjbGiSiAK22Ie2eWq-iu1jDPIWA0YxrHUBxpmCZ4az0DIZwBFQGhJVxshqeQWn6YgRnmdZ9nPu8n7ud56L4kuQWai9UWvwBtSvQCKJBz-F5Zf05LIJXeh0wGdX8flVmMtgCgeFEExsGkQ0dRRQ0CqK5bG2+rnAlCcIoliBJklSdIVN6sgRYYlITjDd9EeuhWRVTNco7xrHYDj8yE6TniXrT-j3o5-PfMiNTna+W5jlkz3HldzsgnaydZIiKL6X6m7l1FCPYLVrvY5YGh48T9AJt0Fy0+c1yU+HjPdBUMe1sq+iyF61SeY28MA0eXTojhAnHSa4LxDjN3lijcOaYD7R27r3Yg-cL4oWmioVEixjAADFMEaAxKiPKL8byVWCGESIMR4hJBSGkP+iAihQxAopUoJQkjvGDkjUOwpoEd2xkfHuJ8z5J2mnWWa80lolRWl9V+4kEAkOLuQsuVDK5fjJEcKIHYZ6BSAtvVuTASCEFgPgSAz0+ICSEnbTm613yvDUaDVIZINrDkjIA1kZCAZxE5Co+ozFiCyjgD4FuKU85SN+gAWgXogEJU8AjRJibE6JBxtFQL3jAjMXAoR8EEMIEgQSiHSNCM4k61CAJxWal+Q4Rw5IdnIUBAGQREmQXBL0NJAwhj4ByRVaRnoiI2P+nY8kBxhyHDUiLCc1S5IJHqZw5J3CNw5nSruIs7SHZ3gqLpMgVj3iTjDK7f6lEZzqVGQDck75eRy2RpBDikc4ILiWQXBApQwyFAUoccMrIBxiyhpSdxANrgHAuKBM5HDbrpQellMaAhbnrX+j7BI8RBwRiHF7VkZBVmwyUnJCILx3yTPaErQx6NMY8I1pCyq1xKKvhRQDTSHoyRKRCDi3e7crmHw1sfU+fdz4kukV8KG+QLi-3cXcRIlFqiUo7CLGc6Qzj0sBQNdoujiD6PxVy366Q6Qf2qOKkWoRkj7UQEHFkCkoiYtoncEBXjahAA */
  id: "cardsMachine",
  initial: "waiting for good search query",
  context: ({ input }: { input: CardsMachineInput }) => {
    return {
      userId: input.userId,
      sessionId: input.sessionId,
      socket: input.socket,
    };
  },
  states: {
    "waiting for good search query": {
      entry: ["logStateChange", "logCurrentContext"],
      on: {
        VALID_SEARCH_QUERY: {
          target: "search for cards",
          actions: ["storeSearchQuery"],
        },
        INVALID_SEARCH_QUERY: {
          target: "waiting for good search query",
          actions: assign({
            invalidSearchQueryReasons: ({ context, event }) => {
              assertEvent(event, "INVALID_SEARCH_QUERY");
              return [
                ...(context.invalidSearchQueryReasons ?? []),
                { reason: event.output.reason, confidenceScore: event.output.confidenceScore },
              ];
            },
          }),
        },
        CARDS_RETURNED: {
          target: "Search and scroll",
          actions: [
            ({ event }) => {
              assertEvent(event, "CARDS_RETURNED");
              console.log(
                "[cardsMachine:waiting for good search query] - CARDS_RETURNED event received:",
                {
                  hasOutput: !!(event as any).output,
                  hasCards: !!(event as any).output?.cards,
                  cardsCount: (event as any).output?.cards?.length,
                }
              );
            },
            assign({
              cards: ({ event }) => {
                assertEvent(event, "CARDS_RETURNED");
                const cards = event.output.cards as Card[];
                console.log("[cardsMachine:waiting for good search query] - Stored cards:", cards);
                return cards;
              },
            }),
            "pushCardsToWebSocket",
          ],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
    "search for cards": {
      entry: ["logStateChange", "logCurrentContext"],
      on: {
        CARDS_RETURNED: {
          target: "Search and scroll",
          actions: [
            ({ event }) => {
              assertEvent(event, "CARDS_RETURNED");
              console.log("[cardsMachine:search for cards] - CARDS_RETURNED event received:", {
                hasOutput: !!(event as any).output,
                hasCards: !!(event as any).output?.cards,
                cardsCount: (event as any).output?.cards?.length,
              });
            },
            assign({
              cards: ({ event }) => {
                assertEvent(event, "CARDS_RETURNED");
                const cards = event.output.cards as Card[];
                console.log("[cardsMachine:search for cards] - Stored cards:", cards);
                return cards;
              },
            }),
            "pushCardsToWebSocket",
          ],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
      onError: {
        entry: ["logCurrentContext"],
        actions: [
          ({ event }: { event: any }) => {
            console.error("[CardsMachine:search for cards]: Error searching for cards:", event);
          },
          "pushErrorMessageToWebSocket",
        ],
        target: "waiting for good search query",
      },
    },
    "Search and scroll": {
      entry: ["logStateChange"],
      on: {
        NEED_MORE_CARDS: {
          target: "search for cards",
        },
        CARD_SELECTED: {
          target: "schedule a time",
          actions: ["storeSelectedCard"],
        },
        SEARCH_QUERY_CHANGED: {
          target: "waiting for good search query",
          actions: ["storeSearchQuery"],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
    "schedule a time": {
      entry: ["logStateChange"],
      invoke: {
        id: "recommendTimeSlots",
        src: "recommendTimeSlots",
        input: ({ context }) =>
          ({
            selectedCard: context.selectedCard,
            isMoreTimeSlots: false,
          }) as unknown as RecommendTimeSlotsCardsInput,
        onDone: {
          actions: [
            assign({
              availableTimes: ({ event }) => {
                return event.output?.timeSlots ?? null;
              },
            }),
            "pushTimeSlotsToWebSocket",
          ],
          target: "waiting for a time slot answer",
        },
        onError: {
          target: "Search and scroll",
          actions: [
            ({ event }: { event: any }) => {
              console.error(
                "[CardsMachine:schedule a time]: CRITICAL Error scheduling a time:",
                event
              );
            },
          ],
        },
      },
    },
    "waiting for a time slot answer": {
      entry: ["logStateChange", "logCurrentContext"],
      on: {
        TIME_SLOT_SELECTED: {
          target: "finished",
          actions: ["storeSelectedTimeSlot", "pushMessageToWebSocket"],
        },
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
        STORE_MORE_TIME_SLOTS: {
          target: "waiting for a time slot answer",
          actions: assign({
            availableTimes: ({ event }) => {
              assertEvent(event, "STORE_MORE_TIME_SLOTS");
              return event.output.timeSlots as TimeSlot[];
            },
          }),
        },
        REQUEST_DIFFERENT_CARD: {
          target: "Search and scroll",
          // actions: ["addNewCardsToContext"],
        },
        QUERY_CHANGED: {
          target: "waiting for good search query",
          actions: ["storeSearchQuery"],
        },
      },
    },
    finished: {
      entry: ["logStateChange"],
      on: {
        UPDATE_SOCKET: {
          actions: ["updateSocket"],
        },
      },
    },
  },
});
