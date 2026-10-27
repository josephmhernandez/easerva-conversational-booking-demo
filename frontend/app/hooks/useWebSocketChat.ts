// useWebSocketChat.ts (top of file)
"use client";

import { createClient } from "@/app/utils/supabase/client";
import type {
  Card,
  ClientEvent,
  Company,
  ServerEvent,
  SnapshotMessage,
  TimeSlot,
  UUID,
} from "@shared/protocol";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearGuestKeysIfAuthenticated,
  clearTemporaryChatSessionKeys,
} from "../../lib/storage-utils";
import { SecureChatWebSocketClient } from "../../lib/websocket-client";
import { webSocketReconnectEmitter } from "../../lib/websocket-reconnect-event";
import { webSocketSingleton } from "../../lib/websocket-singleton";
import { useAuth } from "./useAuth";

// Keep your domain models if you need them on the client:
export type UIMessage = Omit<SnapshotMessage, "timestamp"> & {
  timestamp: Date;
  status?: "sending" | "sent" | "error" | "streaming";
};

export interface ChatSession {
  id: UUID;
  user_id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

const STORAGE_KEYS = {
  SESSION: "chat_session",
  MESSAGES: "chat_messages",
  LAST_SYNC: "chat_last_sync",
  LAST_SEQ: (sid: string) => `chat_last_seq_${sid}`,
} as const;

const nowISO = () => new Date().toISOString();

function toUIMessage(m: SnapshotMessage): UIMessage {
  return { ...m, timestamp: new Date(m.timestamp) };
}

// Retry configuration -> for api calls NOT websocket.
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_MULTIPLIER: 2,
} as const;

export const useWebSocketChat = (options?: {
  initialSession?: ChatSession | null;
  initialMessages?: UIMessage[];
  initialCompanies?: Company[];
  initialTimeSlots?: TimeSlot[];
  initialCards?: Card[];
}) => {
  const { user, loading } = useAuth();
  const [session, setSession] = useState<ChatSession | null>(options?.initialSession ?? null);
  const [companies, setCompanies] = useState<Company[]>(options?.initialCompanies ?? []);
  const [cards, setCards] = useState<Card[]>(options?.initialCards ?? []);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(options?.initialTimeSlots ?? []);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<SecureChatWebSocketClient | null>(null);
  const connectionIdRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<UIMessage[]>(options?.initialMessages ?? []);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [showUserPromptImAuthenticated, setShowUserPromptImAuthenticated] =
    useState<boolean>(false);

  const lastSeqSeenRef = useRef<number>(0); // authoritative per-session
  const headSeqRef = useRef<number>(0); // from connection.established
  const streamIndexById = useRef<Map<string, number>>(new Map()); // streamId->index
  const finalizedStreamIdsRef = useRef<Set<string>>(new Set()); // ai.done de-dup in dev

  const hasLoadedFromStorage = useRef(!!(options?.initialSession || options?.initialMessages));
  const hasLoadedFromServer = useRef(!!(options?.initialSession || options?.initialMessages));
  const hasAttemptedConnect = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serverRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serverRetryAttempts = useRef(0);
  const isServerRetrying = useRef(false);
  const isManualConnect = useRef(false);
  const hasAttemptedSessionLink = useRef(false);

  // Storage functions
  const clearStorage = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.MESSAGES);
    sessionStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  }, []);

  const loadFromStorage = useCallback(() => {
    try {
      const sessionData = sessionStorage.getItem(STORAGE_KEYS.SESSION);
      const messagesData = sessionStorage.getItem(STORAGE_KEYS.MESSAGES);

      if (sessionData) {
        const storedSession: ChatSession = JSON.parse(sessionData);

        // Check if session is still valid
        const expiresAt = new Date(storedSession.expires_at);
        if (expiresAt > new Date()) {
          console.log("✅ Loaded valid session from storage:", storedSession.id);
          setSession(storedSession);

          if (messagesData) {
            const storedMessages: UIMessage[] = JSON.parse(messagesData);
            const messagesWithDates = storedMessages.map((msg) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }));
            console.log("✅ Loaded messages from storage:", messagesWithDates.length);
            setMessages(messagesWithDates);

            // If the last message is data_type is company or time_slot or, set the companies or timeSlots state.
            // data is json string, so we need to parse it.
            if (messagesWithDates[messagesWithDates.length - 1].message_data_type === "COMPANY") {
              const companies = JSON.parse(
                messagesWithDates[messagesWithDates.length - 1].data as unknown as string
              ) as Company[];
              console.log("✅ Loaded companies from storage:", companies);
              setCompanies(companies);
            } else if (
              messagesWithDates[messagesWithDates.length - 1].message_data_type === "TIME_SLOT"
            ) {
              const timeSlots = JSON.parse(
                messagesWithDates[messagesWithDates.length - 1].data as unknown as string
              ) as TimeSlot[];
              console.log("✅ Loaded time slots from storage:", timeSlots);
              setTimeSlots(timeSlots);
            } else if (
              messagesWithDates[messagesWithDates.length - 1].message_data_type === "CARD"
            ) {
              const cards = JSON.parse(
                messagesWithDates[messagesWithDates.length - 1].data as unknown as string
              ) as Card[];
              console.log("✅ Loaded cards from storage:", cards);
              setCards(cards);
            }
          }
        } else {
          console.log("⏰ Session expired, clearing storage");
          clearStorage();
        }
      }
    } catch (error) {
      console.error("Failed to load from storage:", error);
      clearStorage();
    }
  }, [clearStorage]);

  const saveToStorage = useCallback(() => {
    try {
      if (session) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      }
      if (messages.length > 0) {
        sessionStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
        sessionStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      }
    } catch (error) {
      console.error("Failed to save to storage:", error);
    }
  }, [session, messages]);

  const loadSessionFromServer = useCallback(
    async (isRetry = false) => {
      console.log("🔍 Loading session from server", isRetry ? "(retry)" : "");
      // Only fetch from server when authenticated; guests will get session via WebSocket init
      // if (!user) return null;

      // Prevent multiple simultaneous requests
      if (isServerRetrying.current && !isRetry) {
        console.log("⏸️ Server request already in progress, skipping");
        return null;
      }

      try {
        if (!isRetry) {
          setIsLoading(true);
          setError(null);
          isServerRetrying.current = true;
        }

        const url = `/api/chat/session`;
        const chatSessionResponse = await fetch(url);

        if (!chatSessionResponse.ok) {
          const errorText = await chatSessionResponse.text();
          console.error("🔍 Response error:", errorText);
          throw new Error(`HTTP ${chatSessionResponse.status}: ${chatSessionResponse.statusText}`);
        }
        const { session: chatSession, messages: serverMessages } = await chatSessionResponse.json();

        console.log("✅ Loaded from server:", {
          sessionId: chatSession?.id,
          messageCount: serverMessages?.length || 0,
        });

        // Reset retry state on success
        serverRetryAttempts.current = 0;
        isServerRetrying.current = false;

        // Update local state
        if (chatSession) {
          setSession(chatSession);
        } else {
          console.log("No session returned from server - user may need to start a new chat");
        }

        // Convert timestamps and update messages
        if (serverMessages && Array.isArray(serverMessages)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const serverMessagesWithDates = serverMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(serverMessagesWithDates);
        }

        return chatSession;
      } catch (error) {
        console.error("❌ Failed to load session from server:", error);

        // Handle retry logic
        if (!isRetry && serverRetryAttempts.current < RETRY_CONFIG.MAX_ATTEMPTS) {
          serverRetryAttempts.current += 1;
          const delay = Math.min(
            RETRY_CONFIG.INITIAL_DELAY *
              Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, serverRetryAttempts.current - 1),
            RETRY_CONFIG.MAX_DELAY
          );

          console.log(
            `🔄 Retrying in ${delay}ms (attempt ${serverRetryAttempts.current}/${RETRY_CONFIG.MAX_ATTEMPTS})`
          );

          // Clear any existing retry timeout
          if (serverRetryTimeoutRef.current) {
            clearTimeout(serverRetryTimeoutRef.current);
          }

          serverRetryTimeoutRef.current = setTimeout(() => {
            loadSessionFromServer(true);
          }, delay);

          // Set a temporary error message
          setError(`Backend unavailable - retrying in ${Math.round(delay / 1000)}s...`);
          return null;
        } else {
          // Final failure or max retries reached
          isServerRetrying.current = false;
          serverRetryAttempts.current = 0;

          const errorMessage = error instanceof Error ? error.message : "Failed to load messages";
          setError(`Backend unavailable: ${errorMessage}`);

          // Mark as loaded to prevent further attempts
          hasLoadedFromServer.current = true;
          throw error;
        }
      } finally {
        if (!isRetry) {
          setIsLoading(false);
        }
      }
    },
    [user]
  );

  // When user becomes authenticated, reflect in local session but keep guest_id until server confirms link
  useEffect(() => {
    if (user) {
      setSession((prev) => (prev ? { ...prev, user_id: prev.user_id ?? user.id } : prev));
    } else {
      // Reset session link attempt flag when user signs out
      hasAttemptedSessionLink.current = false;
    }
  }, [user]);

  // Helper to persist lastSeqSeen in sessionStorage.
  const persistLastSeq = useCallback((sid: string, seq: number) => {
    lastSeqSeenRef.current = seq;
    sessionStorage.setItem(STORAGE_KEYS.LAST_SEQ(sid), String(seq));
  }, []);

  // Helper to apply sequence numbers to events.
  const applySeq = useCallback(
    (sid: string, seq?: number) => {
      if (typeof seq !== "number") return true; // non-sequenced event (rare)
      const last = lastSeqSeenRef.current;
      if (seq <= last) return false; // duplicate or old, ignore
      // For v1 we accept out-of-order *forward* jumps; logging only
      if (seq !== last + 1) {
        console.warn("Non-consecutive seq", { last, seq, sid });
      }
      persistLastSeq(sid, seq);
      return true;
    },
    [persistLastSeq]
  );

  // Helper to load lastSeqSeen from sessionStorage
  const getLastSeqSeen = useCallback((sid?: string | null) => {
    if (!sid) return 0;
    const raw = sessionStorage.getItem(STORAGE_KEYS.LAST_SEQ(sid));
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  }, []);

  // WebSocket message handlers
  const handleMessage = useCallback(
    (raw: ServerEvent) => {
      const e = raw as ServerEvent;

      switch (e.type) {
        case "connection.established": {
          setIsConnected(true);
          setIsConnecting(false);

          // Update client reference from singleton
          const singletonClient = webSocketSingleton.getClient();
          if (singletonClient && singletonClient !== client) {
            setClient(singletonClient);
          }

          // adopt session if needed
          if (!session || session.id !== e.sessionId) {
            setSession((prev) =>
              prev
                ? { ...prev, id: e.sessionId }
                : {
                    id: e.sessionId,
                    user_id: user?.id ?? "guest",
                    created_at: nowISO(),
                    updated_at: nowISO(),
                    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                    xstate_context: {},
                    is_active: true,
                  }
            );
          }

          // set head & busy flag
          headSeqRef.current = e.headSeq ?? 0;
          setIsBusy(e.turn === "streaming");

          // initialize lastSeqSeen if missing
          const stored = getLastSeqSeen(e.sessionId);
          if (stored > 0) lastSeqSeenRef.current = stored;

          // clear UX errors about connection
          setError((prev) =>
            prev && (prev.includes("Not connected") || prev.includes("WebSocket")) ? null : prev
          );
          break;
        }

        case "session.created": {
          const newId = e.sessionId;

          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  id: newId,
                  updated_at: new Date().toISOString(),
                  is_active: true,
                }
              : {
                  id: newId,
                  user_id: user?.id ?? "guest",
                  created_at: nowISO(),
                  updated_at: nowISO(),
                  expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                }
          );

          setMessages([]);
          setCompanies([]);
          setTimeSlots([]);

          break;
        }

        case "session.snapshot": {
          // For session.snapshot, we should always accept it as it represents the current state
          // Update our sequence tracking to match the server's head sequence
          if (e.headSeq && typeof e.headSeq === "number") {
            persistLastSeq(e.sessionId, e.headSeq);
          }

          if (showUserPromptImAuthenticated) {
            setShowUserPromptImAuthenticated(false);
          }

          if (e.messages[e.messages.length - 1]?.message_data_type === "COMPANY") {
            const companyData = e.messages[e.messages.length - 1].data as string;
            // parse the data as a json string
            const companies = JSON.parse(companyData) as Company[];
            setCompanies(companies);
          } else if (e.messages[e.messages.length - 1]?.message_data_type === "TIME_SLOT") {
            const timeSlotData = e.messages[e.messages.length - 1].data as string;
            const timeSlots = JSON.parse(timeSlotData) as TimeSlot[];
            setTimeSlots(timeSlots);
          } else if (e.messages[e.messages.length - 1]?.message_data_type === "CARD") {
            const cardData = e.messages[e.messages.length - 1].data as string;
            const cards = JSON.parse(cardData) as Card[];
            setCards(cards);
          } else if (
            e.messages[e.messages.length - 1]?.message_data_type === "USER_AUTH" &&
            user?.email
          ) {
            // Hacky fix to ensure the companies are added to the messages after user auth flow.
            setShowUserPromptImAuthenticated(true);
          }

          streamIndexById.current.clear();
          setMessages(e.messages.map(toUIMessage));
          setIsBusy(e.turn === "streaming");
          break;
        }

        case "session.state": {
          setIsBusy(e.turn === "streaming");
          applySeq(e.sessionId, e?.seq); // optional if server sequences state
          break;
        }

        case "message.accepted": {
          if (!applySeq(e.sessionId, e.seq)) break;
          setMessages((prev) =>
            prev.map((m) => (m.id === e.messageId ? { ...m, status: "sent" } : m))
          );
          break;
        }

        case "message.rejected": {
          // typically reason: "busy"|"invalid"|"unauthorized"
          if (!applySeq(e.sessionId, e?.seq)) break;
          setMessages((prev) =>
            prev.map((m) => (m.id === e.messageId ? { ...m, status: "error" } : m))
          );
          setError(`Message rejected: ${e.reason}`);
          break;
        }

        case "ai.message": {
          if (!applySeq(e.sessionId, e.seq)) break;
          setMessages((prev: UIMessage[]) => [
            ...prev,
            {
              id: `ai_message_${Date.now()}`,
              role: "assistant",
              content: e.message,
              timestamp: new Date(),
              status: "sent",
            },
          ]);
          break;
        }

        case "ai.delta": {
          if (!applySeq(e.sessionId, e.seq)) break;

          setMessages((prev: UIMessage[]) => {
            const idx = streamIndexById.current.get(e.streamId);
            if (idx != null) {
              // Safety check: ensure the index is still valid
              if (idx >= prev.length) {
                console.warn("Stream index out of bounds, clearing and recreating", {
                  idx,
                  prevLength: prev.length,
                });
                streamIndexById.current.delete(e.streamId);
                // Fall through to create new message
              } else {
                const copy = [...prev];
                const target = copy[idx];
                copy[idx] = { ...target, content: (target.content || "") + e.chunk };
                return copy;
              }
            }

            // Create the streaming bubble (either first chunk or index was invalid)
            const newMsg: UIMessage = {
              id: e.streamId,
              role: "assistant",
              content: e.chunk,
              timestamp: new Date(),
              status: "streaming",
            };
            const copy = [...prev, newMsg];
            streamIndexById.current.set(e.streamId, copy.length - 1);
            return copy;
          });
          break;
        }

        case "ai.done": {
          console.log("ai.done", e);
          console.log("status", e.status);
          if (!applySeq(e.sessionId, e.seq)) break;
          console.log("ai.done applySeq", e.status);
          // Dev StrictMode can invoke the updater twice; guard finalization per streamId.
          if (finalizedStreamIdsRef.current.has(e.streamId)) break;
          finalizedStreamIdsRef.current.add(e.streamId);
          const idx = streamIndexById.current.get(e.streamId);
          console.log("ai.done idx", idx);

          if (idx == null && e.status === "error") {
            // Set last message to error.

            // Add an assistant message to the end of the message saying error
            setMessages((prev) => [
              ...prev,
              {
                id: `error_${Date.now()}`,
                role: "system",
                content: "Sorry, we cannot process that request at this time.",
                timestamp: new Date(),
                status: "error",
              },
            ]);
            break;
          }

          setMessages((prev) => {
            if (idx == null) return prev;
            const copy = [...prev];
            const target = copy[idx];
            copy[idx] = {
              ...target,
              status: e.status === "ok" ? "sent" : "error",
              content: e.final ?? target.content,
            };

            return copy;
          });

          // Cleanup index outside the updater (avoid side effects inside)
          streamIndexById.current.delete(e.streamId);
          break;
        }

        case "cards.search.results": {
          const cards = e.cards as Card[];
          setCards(cards);
          setMessages((prev) => [
            ...prev,
            {
              id: `cards_${Date.now()}`,
              role: "system",
              content: "Here are some cards that match your needs:",
              timestamp: new Date(),
              message_data_type: "CARD",
              data: JSON.stringify(cards),
            },
          ]);
          break;
        }
        case "card.selection.confirmed": {
          // const card = e.card;
          setCards([]);
          setMessages((prev) => [
            ...prev,
            {
              id: `card_confirm_${Date.now()}`,
              role: "assistant",
              content: e.message,
              timestamp: new Date(),
            },
          ]);
          break;
        }

        // Legacy/custom events you still emit today; keep until you migrate them behind protocol types:
        case "company.recommendations": {
          const recs = e.companies as Company[];
          setCompanies(recs);
          setMessages((prev) => [
            ...prev,
            {
              id: `company_rec_${Date.now()}`,
              role: "system",
              content: "Here are some companies that match your needs:",
              timestamp: new Date(),
            },
          ]);
          break;
        }
        case "time.slots.recommendations": {
          const slots = e.timeSlots as TimeSlot[];
          setTimeSlots(slots);
          setMessages((prev) => [
            ...prev,
            {
              id: `time_slots_${Date.now()}`,
              role: "system",
              content: "Here are some available times:",
              timestamp: new Date(),
            },
          ]);
          break;
        }
        case "company.selection.confirmed": {
          setCompanies([]);
          setMessages((prev) => [
            ...prev,
            {
              id: `company_confirm_${Date.now()}`,
              role: "assistant",
              content: e.message,
              timestamp: new Date(),
            },
          ]);
          break;
        }
        case "time.selection.confirmed": {
          setTimeSlots([]);
          setMessages((prev) => [
            ...prev,
            {
              id: `time_confirm_${Date.now()}`,
              role: "assistant",
              content: e.message,
              timestamp: new Date(),
            },
          ]);
          break;
        }

        case "error": {
          console.log("IN HANDLER ERROR message from backend", e);
          // new protocol uses { code, message }
          const msg = e.message ?? "Unknown error";
          setError(msg);
          console.error("WebSocket error:", e);
          break;
        }

        default:
          console.warn("Unhandled event", e);
      }
    },
    [applySeq, getLastSeqSeen, session, user?.id]
  );

  const handleError = useCallback((error: Event) => {
    console.error("WebSocket error:", error);
    setIsConnected(false);
    setIsConnecting(false);
    setError("Connection error occurred");
  }, []);

  const handleClose = useCallback(() => {
    console.log("WebSocket connection closed");
    setIsConnected(false);
    setIsConnecting(false);

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  // Main connection function
  const performConnection = useCallback(async () => {
    console.log("🚀 Connecting to WebSocket...");

    // Check if singleton is already connected
    if (webSocketSingleton.isConnected()) {
      console.log("♻️ Singleton already connected, syncing state");
      const singletonClient = webSocketSingleton.getClient();
      if (singletonClient) {
        setClient(singletonClient);
        setIsConnected(true);
        setIsConnecting(false);
      } else {
        // Singleton says it's connected but client is null - reset and retry
        console.log("🔄 Singleton state mismatch, resetting");
        hasAttemptedConnect.current = false;
        setIsConnecting(false);
      }
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnecting || loading) {
      console.log("⏸️ Skipping connect - already connecting", {
        isConnecting,
        loading,
      });
      return;
    }

    // Check if we're currently retrying server requests
    if (isServerRetrying.current) {
      console.log("⏸️ Skipping WebSocket connect - server request in progress");
      return;
    }

    hasAttemptedConnect.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      console.log("🔄 Starting WebSocket connection...");

      // Load session from server if we don't have one and user is authenticated
      let currentSession = session;
      if (!currentSession && user) {
        console.log("📡 Loading session for WebSocket connection...");
        try {
          currentSession = await loadSessionFromServer();
        } catch (error) {
          console.error("❌ Failed to load session for WebSocket connection:", error);
          // Don't throw here, just log the error and continue
          // The WebSocket client will handle connection failure
        }
      }

      console.log("🔌 Creating WebSocket connection via singleton...");
      const lastSeqSeen = getLastSeqSeen(currentSession?.id);

      // Connect via singleton
      const singletonClient = await webSocketSingleton.connect({
        sessionId: currentSession?.id,
        lastSeqSeen,
      });

      if (singletonClient) {
        setClient(singletonClient);
        setIsConnected(true);
        setIsConnecting(false);
      } else {
        // Connection failed but singleton handled it - reset state and allow retry
        console.log("🔄 Singleton returned null, connection will retry on next attempt");
        setIsConnecting(false);
        hasAttemptedConnect.current = false; // Reset to allow retry
      }
    } catch (error) {
      console.error("❌ Failed to connect:", error);
      setIsConnecting(false);
      hasAttemptedConnect.current = false; // Reset on error
      isManualConnect.current = false; // Reset manual connect flag

      // Set appropriate error message based on the type of failure
      if (error instanceof Error && error.message.includes("Backend server is unavailable")) {
        setError("Backend server is unavailable - WebSocket connection failed");
      } else {
        setError(error instanceof Error ? error.message : "Failed to connect");
      }
    }
  }, [
    isConnecting,
    loading,
    user,
    session,
    loadSessionFromServer,
    handleMessage,
    handleError,
    handleClose,
    getLastSeqSeen,
  ]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      if (!webSocketSingleton.isConnected()) {
        setError("Not connected");
        return;
      }
      if (!session?.id) {
        setError("No active session");
        return;
      }
      if (isBusy) {
        setError("Assistant is responding—please wait.");
        return;
      }
      const messageId = crypto.randomUUID();

      // optimistic bubble (status = sending)
      const optimistic: UIMessage = {
        id: messageId,
        role: "user",
        content,
        timestamp: new Date(),
        status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);

      const evt: ClientEvent = {
        type: "user.message",
        sessionId: session.id,
        messageId,
        text: content,
        ts: nowISO(),
      };

      try {
        webSocketSingleton.sendMessage(evt);
      } catch (e) {
        console.error("Failed to send message:", e);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, status: "error" } : m))
        );
        setError("Failed to send message.");
      }
    },
    [client, session?.id, isBusy]
  );

  const startNewChat = useCallback(() => {
    if (!webSocketSingleton.isConnected()) {
      setError("Not connected");
      return;
    }

    try {
      const newSessionMessage: ClientEvent = {
        type: "new.session",
        ts: new Date().toISOString(),
      };
      webSocketSingleton.sendMessage(newSessionMessage);

      // clear the companies and time slots
      setCompanies([]);
      setTimeSlots([]);
      setCards([]);
    } catch (error) {
      console.error("Failed to start new chat:", error);
      setError("Failed to start new chat. Please try again.");
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log("Disconnecting WebSocket...");

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear server retry timeout
    if (serverRetryTimeoutRef.current) {
      clearTimeout(serverRetryTimeoutRef.current);
      serverRetryTimeoutRef.current = null;
    }

    // Reset flags
    hasAttemptedConnect.current = false;
    serverRetryAttempts.current = 0;
    isServerRetrying.current = false;
    isManualConnect.current = false;
    hasAttemptedSessionLink.current = false;

    // Unregister from singleton
    if (connectionIdRef.current) {
      webSocketSingleton.unregister(connectionIdRef.current);
      connectionIdRef.current = null;
    }

    setClient(null);
    setIsConnected(false);
  }, []);

  const refreshMessages = useCallback(async () => {
    hasLoadedFromServer.current = false; // Reset the flag
    serverRetryAttempts.current = 0; // Reset retry attempts
    isServerRetrying.current = false; // Reset retry state

    // Clear any existing retry timeout
    if (serverRetryTimeoutRef.current) {
      clearTimeout(serverRetryTimeoutRef.current);
      serverRetryTimeoutRef.current = null;
    }

    try {
      await loadSessionFromServer();
      hasLoadedFromServer.current = true;
    } catch (error) {
      console.error("Failed to refresh messages:", error);
      // hasLoadedFromServer.current is set in loadSessionFromServer on final failure
    }
  }, [loadSessionFromServer]);

  const retryConnection = useCallback(async () => {
    console.log("🔄 Manual retry triggered");

    // Reset all retry state
    serverRetryAttempts.current = 0;
    isServerRetrying.current = false;
    hasLoadedFromServer.current = false;

    // Clear any existing timeouts
    if (serverRetryTimeoutRef.current) {
      clearTimeout(serverRetryTimeoutRef.current);
      serverRetryTimeoutRef.current = null;
    }

    setError(null);

    try {
      await loadSessionFromServer();
      hasLoadedFromServer.current = true;
    } catch (error) {
      console.error("Manual retry failed:", error);
      // Error is already set in loadSessionFromServer
    }
  }, [loadSessionFromServer]);

  // Force reconnect with fresh authentication
  const forceReconnect = useCallback(async () => {
    console.log("🔄 Force reconnect triggered - authentication state changed");

    try {
      await webSocketSingleton.forceReconnect();
      const newClient = webSocketSingleton.getClient();
      setClient(newClient);
      setIsConnected(newClient?.isConnected() ?? false);
      console.log("✅ WebSocket force reconnect successful");
    } catch (error) {
      console.error("❌ WebSocket force reconnect failed:", error);
      // Fall back to regular retry
      retryConnection();
    }
  }, [retryConnection]);

  // Register this hook instance exactly once per mount.
  useEffect(() => {
    if (!connectionIdRef.current) {
      connectionIdRef.current = webSocketSingleton.register({
        onMessage: handleMessage,
        onError: handleError,
        onClose: handleClose,
      });
    }
    return () => {
      if (connectionIdRef.current) {
        webSocketSingleton.unregister(connectionIdRef.current);
        connectionIdRef.current = null;
      }
    };
  }, [handleMessage, handleError, handleClose]);

  // Effects
  // Load from sessionStorage on mount and clean up guest keys if user is authenticated
  useEffect(() => {
    console.log("🔄 useEffect firing - loadFromStorage", {
      user: !!user,
      hasLoaded: hasLoadedFromStorage.current,
    });
    if (!hasLoadedFromStorage.current) {
      loadFromStorage();
      hasLoadedFromStorage.current = true;

      // Clear guest keys if user is already authenticated
      if (user) {
        clearGuestKeysIfAuthenticated(async () => true); // User is authenticated
      }
    }
  }, [user, loadFromStorage]);

  // Load messages from server when user is ready (separate from WebSocket connection)
  useEffect(() => {
    console.log("🔄 useEffect firing - loadFromServer", {
      user: !!user,
      loading,
      hasLoadedFromServer: hasLoadedFromServer.current,
    });

    const hasPendingLink =
      typeof window !== "undefined" &&
      sessionStorage.getItem("guest_id") &&
      sessionStorage.getItem("pending_link_session_id");

    if (
      user &&
      !loading &&
      !hasLoadedFromServer.current &&
      !hasPendingLink &&
      !hasAttemptedSessionLink.current
    ) {
      console.log("📡 Loading messages from server on mount...");
      loadSessionFromServer()
        .then(() => {
          hasLoadedFromServer.current = true;
        })
        .catch((error) => {
          console.error("❌ Failed to load messages on mount:", error);
          // hasLoadedFromServer.current is now set to true in loadSessionFromServer on final failure
        });
    } else if (hasAttemptedSessionLink.current) {
      console.log("⏸️ Skipping server load - session linking already attempted");
    }
  }, [user, loading, loadSessionFromServer]);

  // After login, if we have guestId and pending_link_session_id, call backend to link
  useEffect(() => {
    const tryLinkSession = async () => {
      if (!user) return;

      // Prevent duplicate link session calls by checking if we've already attempted
      if (hasAttemptedSessionLink.current) {
        console.log("[link-session] Skipping - already attempted session linking");
        return;
      }

      try {
        const guestId = sessionStorage.getItem("guest_id");
        let pendingSessionId = sessionStorage.getItem("pending_link_session_id");

        // Fallback: if pending id not set yet but we have a session in memory AND we have a guest ID,
        // set pending session for linking (only for guest-to-authenticated user transitions)
        if (!pendingSessionId && session?.id && guestId && session.user_id !== user.id) {
          try {
            sessionStorage.setItem("pending_link_session_id", session.id);
            pendingSessionId = session.id;
            console.log("[link-session] Fallback set pending_link_session_id from guest session", {
              pendingSessionId,
              hasGuestId: !!guestId,
              sessionUserId: session.user_id,
              currentUserId: user.id,
            });
          } catch {}
        }

        console.log("[link-session] Preconditions", {
          hasUser: !!user,
          guestIdPresent: !!guestId,
          pendingSessionId,
          hasAttempted: hasAttemptedSessionLink.current,
        });

        if (guestId && pendingSessionId) {
          // Mark that we're attempting session linking to prevent duplicates
          hasAttemptedSessionLink.current = true;

          // Get Supabase access token to call backend with Authorization header
          const supabase = createClient();
          const {
            data: { session: supaSession },
          } = await supabase.auth.getSession();
          const accessToken = supaSession?.access_token;
          if (!accessToken) {
            console.warn("No Supabase access token available for linking");
            hasAttemptedSessionLink.current = false; // Reset on failure
            return;
          }

          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
          const resp = await fetch(`${backendUrl}/api/chat/link-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ pendingSessionId, guestId }),
            credentials: "include",
          });
          if (resp.ok) {
            const linkResult = await resp.json();
            console.log("[link-session] Successfully linked session", linkResult);

            // Update session and messages with the data returned from link-session
            if (linkResult.session) {
              setSession(linkResult.session);
            }

            // Convert timestamps and update messages
            if (linkResult.messages && Array.isArray(linkResult.messages)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const serverMessagesWithDates = linkResult.messages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }));
              // Add a loading message after sign-in
              const loadingMessage: UIMessage = {
                id: `loading_session_${Date.now()}`,
                content: "Hang tight, we're loading your session...",
                role: "system",
                timestamp: new Date(),
                message_data_type: "USER_AUTH",
              };
              setMessages([...serverMessagesWithDates, loadingMessage]);
            }

            // Mark that we've successfully loaded from server to prevent duplicate calls
            hasLoadedFromServer.current = true;

            // Clear temporary markers
            clearTemporaryChatSessionKeys();
          } else {
            const text = await resp.text();
            console.error("Failed to link session:", text);
            hasAttemptedSessionLink.current = false; // Reset on failure to allow retry
          }
        }
      } catch (e) {
        console.error("Error attempting to link session:", e);
        hasAttemptedSessionLink.current = false; // Reset on error to allow retry
      }
    };
    void tryLinkSession();
  }, [user, session, setSession]);

  // Auto-connect WebSocket when user is ready
  useEffect(() => {
    console.log("🔄 useEffect firing - autoConnect", {
      user: !!user,
      loading,
      hasAttempted: hasAttemptedConnect.current,
      hasClient: !!client,
      isServerRetrying: isServerRetrying.current,
      isManualConnect: isManualConnect.current,
      singletonConnected: webSocketSingleton.isConnected(),
    });

    const hasPendingLink =
      typeof window !== "undefined" &&
      sessionStorage.getItem("guest_id") &&
      sessionStorage.getItem("pending_link_session_id");

    // Check if singleton already has a connection
    if (webSocketSingleton.isConnected() && !client) {
      console.log("♻️ Singleton already connected, syncing client state");
      const singletonClient = webSocketSingleton.getClient();
      if (singletonClient) {
        setClient(singletonClient);
        setIsConnected(true);
      }
      return;
    }

    // Only attempt auto-connect if:
    // 1. Not loading (user may be null for guest)
    // 2. We haven't attempted connection yet OR singleton isn't connected
    // 3. No client exists AND singleton isn't connected
    // 4. We're not currently retrying server requests
    // 5. We're not in the middle of a manual connect
    if (
      !loading &&
      (!hasAttemptedConnect.current || !webSocketSingleton.isConnected()) &&
      !client &&
      !webSocketSingleton.isConnected() &&
      !isServerRetrying.current &&
      !isManualConnect.current &&
      !hasPendingLink
    ) {
      console.log("🚀 Auto-connecting WebSocket...");
      // Small delay to ensure server retry logic has time to complete
      setTimeout(() => {
        performConnection();
      }, 100);
    } else if (isServerRetrying.current) {
      console.log("⏸️ Skipping auto-connect - server retry in progress");
    } else if (isManualConnect.current) {
      console.log("⏸️ Skipping auto-connect - manual connect in progress");
    } else if (hasPendingLink) {
      console.log("⏸️ Skipping auto-connect - pending session link in progress");
    } else if (webSocketSingleton.isConnected()) {
      console.log("⏸️ Skipping auto-connect - singleton already connected");
    }
  }, [user, loading, performConnection]);

  // Disable WebSocket-based linking; we'll use HTTP API linking instead
  useEffect(() => {
    // intentionally empty
  }, [user, client, isConnected, session]);

  // Save to sessionStorage whenever state changes
  useEffect(() => {
    // check if status is not streaming
    if (messages[messages.length - 1]?.status !== "streaming") {
      saveToStorage();
    }
  }, [saveToStorage, messages]);

  // Listen for authentication changes that require WebSocket reconnection
  useEffect(() => {
    const cleanup = webSocketReconnectEmitter.addListener(() => {
      console.log("🔄 Received WebSocket reconnection event");
      forceReconnect();
    });

    return cleanup;
  }, [forceReconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();

      // Clear server retry timeout
      if (serverRetryTimeoutRef.current) {
        clearTimeout(serverRetryTimeoutRef.current);
        serverRetryTimeoutRef.current = null;
      }

      // Reset manual connect flag
      isManualConnect.current = false;

      // Ensure we unregister from singleton on unmount
      if (connectionIdRef.current) {
        webSocketSingleton.unregister(connectionIdRef.current);
        connectionIdRef.current = null;
      }
    };
  }, [disconnect]);

  return {
    // State
    session,
    messages,
    companies,
    timeSlots,
    cards,
    isConnected,
    isConnecting,
    isLoading,
    isBusy,
    error,
    user,
    loading,
    showUserPromptImAuthenticated,

    // Actions
    sendMessage,
    startNewChat,
    disconnect,
    refreshMessages,
    retryConnection,
    forceReconnect,
    setShowUserPromptImAuthenticated,

    // Utilities
    client,
  };
};
