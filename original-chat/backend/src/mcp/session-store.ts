import { ActorRef, createActor } from "xstate";
import { chatSessionsDB } from "../database/chat-sessions";
import { cardsMachine, type CardsMachineInput } from "./machines/cardsMachine";
import type { CardsSearchQuery, TimeSlot } from "./machines/types";
import { parseStoredMachineSnapshot, sanitizeMachineSnapshot } from "./machine-snapshot";

type SessionActorRecord = {
  actor: ActorRef<any, any>;
  persistChain: Promise<void>;
};

const sessionActors = new Map<string, SessionActorRecord>();

function createFreshInput(sessionId: string, userId: string): CardsMachineInput {
  return {
    userId,
    sessionId,
    socket: null,
    searchQuery: null as CardsSearchQuery | null,
    cards: null,
    availableTimes: null as TimeSlot[] | null,
    selectedCard: null,
    selectedTimeSlot: null,
    error: null,
  };
}

export async function getOrCreateActor(
  sessionId: string,
  userId: string
): Promise<ActorRef<any, any>> {
  if (!sessionId || !userId) throw new Error("Session ID and user ID are required");

  const cached = sessionActors.get(sessionId);
  if (cached) return cached.actor;

  const chatSession = await chatSessionsDB.getSession(sessionId, userId);
  const storedSnapshot = parseStoredMachineSnapshot(chatSession?.xstate_context);
  const actor = storedSnapshot
    ? createActor(cardsMachine, {
        snapshot: storedSnapshot as any,
        input: createFreshInput(sessionId, userId),
      })
    : createActor(cardsMachine, { input: createFreshInput(sessionId, userId) });

  const record: SessionActorRecord = { actor, persistChain: Promise.resolve() };
  sessionActors.set(sessionId, record);

  actor.subscribe({
    next: () => {
      const persisted = sanitizeMachineSnapshot((actor as any).getPersistedSnapshot());
      record.persistChain = record.persistChain
        .then(() => chatSessionsDB.updateMachineSnapshot(sessionId, userId, persisted))
        .catch((error) => {
          console.error("[SessionStore] Failed to persist machine snapshot:", error);
        });
    },
    error: (error) => console.error("[SessionStore] Actor failed:", error),
  });

  actor.start();
  console.log(
    storedSnapshot
      ? `[SessionStore] Restored actor ${sessionId} at ${JSON.stringify(actor.getSnapshot().value)}`
      : `[SessionStore] Started new actor ${sessionId}`
  );

  return actor;
}

export async function removeSessionActor(sessionId: string): Promise<void> {
  const record = sessionActors.get(sessionId);
  if (!record) return;
  await record.persistChain;
  record.actor.stop();
  sessionActors.delete(sessionId);
}

export function hasSessionActor(sessionId: string): boolean {
  return sessionActors.has(sessionId);
}
