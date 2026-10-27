import { ActorRef, createActor } from "xstate";
import { chatSessionsDB } from "../database/chat-sessions";
import { cardsMachine, CardsMachineInput } from "./machines/cardsMachine";
import { CardsSearchQuery, StoredMachineState, TimeSlot } from "./machines/types";

// TODO: Eventually this sessionActors will need to be an external cache. When we have multiple servers, we need to store the actors in a shared cache.
// This is a temporary solution to get the booking machine working.
// FIXME: store this in the supabase for now.
const chatHistories: Record<string, { role: "user" | "bot"; message: string }[]> = {};

// Audit this method needs to be rewritten & refactored. It's a mess.
export async function getOrCreateActor(
  sessionId: string,
  userId: string
): Promise<ActorRef<any, any>> {
  console.log(
    `[SessionStore] Getting or creating actor for session: ${sessionId} for user: ${userId}`
  );

  let storedState: StoredMachineState | null = null;
  try {
    if (!sessionId || !userId) {
      throw new Error("Session ID and user ID are required");
    }
    const chatSession = await chatSessionsDB.getSession(sessionId, userId);
    const storedStateJson = chatSession?.xstate_context;
    if (storedStateJson && typeof storedStateJson === "string") {
      storedState = JSON.parse(storedStateJson) as StoredMachineState;
    } else {
      console.warn("No stored state found for session:", sessionId);
      storedState = null;
    }
  } catch (error) {
    console.warn("Could not find stored state for session:", sessionId, "error:", error);
    storedState = null;
  }

  let actor: ActorRef<any, any>;

  if (!storedState || storedState.value === "" || storedState.value === undefined) {
    const context: CardsMachineInput = {
      userId: userId,
      sessionId: sessionId,
      socket: null as any,
      searchQuery: null as CardsSearchQuery | null,
      availableTimes: null as TimeSlot[] | null,
      selectedCard: null as any | null,
      selectedTimeSlot: null as TimeSlot | null,
      error: null as string | null,
    };

    const actor = createActor(cardsMachine, {
      input: context as CardsMachineInput,
    });
    actor.start();
    return actor;
  } else {
    console.log(
      `[SessionStore] Found stored state for session: ${sessionId} at state: ${storedState.value}`
    );

    const restoreInput: CardsMachineInput = {
      userId: storedState.context.userId || "",
      sessionId: sessionId,
      socket: null as any,
      searchQuery: null as CardsSearchQuery | null,
      availableTimes: null as TimeSlot[] | null,
      selectedCard: null as any | null,
      selectedTimeSlot: null as TimeSlot | null,
      error: null as string | null,
    };

    actor = createActor(cardsMachine, {
      input: restoreInput,
    });

    console.log("[SessionStore] Created actor for session: ", sessionId);

    actor.start();

    console.log(
      `[SessionStore] Restoring state for session: ${sessionId} to state: ${storedState.value}`
    );

    actor.send({
      type: "RESTORE_STATE",
      value: storedState.value,
    });

    return actor;
  }
}

export function getChatHistory(sessionId: string): { role: "user" | "bot"; message: string }[] {
  return chatHistories[sessionId] || [];
}

export function addToChatHistory(sessionId: string, role: "user" | "bot", message: string): void {
  if (!chatHistories[sessionId]) {
    chatHistories[sessionId] = [];
  }
  chatHistories[sessionId].push({ role, message });
}
