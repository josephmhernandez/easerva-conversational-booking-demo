// backend/src/websocket/handler.ts - Updated with AI integration
import { IncomingMessage } from "http";
import { WebSocket } from "ws";
import { ActorRef, EventObject } from "xstate";
import { verifyWebSocketToken } from "../auth/jwt";
import { supabase } from "../auth/supabase";
import { readSnapshot } from "../database/chat-events";
import { chatMessagesDB } from "../database/chat-messages";
import { liveChatSessionDB } from "../database/chat-session-live";
import { chatSessionsDB } from "../database/chat-sessions";
import { beginTurn, endTurn, heartbeatTurn } from "../database/turn";
import { ChatSession } from "../database/types";
import { ClaudeMCPClient } from "../mcp/claude-mcp-client";
import { Company, TimeSlot } from "../mcp/machines/types";
import { createMCPServerManager } from "../mcp/mcp-server-manager";
import { addToChatHistory, getOrCreateActor } from "../mcp/session-store";
import { Card, ClientEvent, ServerEvent, SnapshotMessage, UUID } from "../shared/protocol";
import { emitPersisted } from "./websocketUtils";

export interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  sessionId?: string;
  connectionId?: string;
  isAuthenticated?: boolean;
  supabaseEmail?: string;
  lastActivity?: number;
}

// Store active connections for rate limiting and management
const activeConnections = new Map<string, AuthenticatedWebSocket>();
const userConnections = new Map<string, Set<string>>();
const connectionRateLimit = new Map<string, number[]>();

// Initialize MCP server manager
const mcpManager = createMCPServerManager();

// Session-based Claude clients
const claudeClients: Record<string, ClaudeMCPClient> = {};

export function authenticateWebSocket(
  ws: WebSocket,
  request: IncomingMessage
): AuthenticatedWebSocket | null {
  const authenticatedWs = ws as AuthenticatedWebSocket;

  // Don't authenticate here - wait for auth message with token in body
  authenticatedWs.isAuthenticated = false;
  authenticatedWs.lastActivity = Date.now();

  return authenticatedWs;
}

export function handleWebSocketConnection(ws: AuthenticatedWebSocket): void {
  console.log("🔌 New WebSocket connection established");

  // Set connection timeout for authentication
  const authTimeout = setTimeout(() => {
    if (!ws.isAuthenticated) {
      console.log("WebSocket authentication timeout");
      ws.close(1008, "Authentication timeout");
    }
  }, 10000); // 10 seconds to authenticate

  ws.on("message", async (data) => {
    try {
      const message: ClientEvent = JSON.parse(data.toString());
      ws.lastActivity = Date.now();
      console.log("📨 Received message:", message.type);

      // Handle authentication message - token comes in message body, not query params
      if (message.type === "authenticate") {
        const authResult: AuthenticationResult = await handleAuthentication(
          ws,
          message.token,
          message.accessToken
        );
        clearTimeout(authTimeout);

        if (!authResult.backendJwtAuthSuccess) {
          // Only checking the backend JWT token for the start of the flow. Allow guest_id sessions.
          // TODO: we are not handling this error on the frontend....
          console.log("❌ Authentication failed:", authResult.error);
          const sessionCreateFailedEvent: ServerEvent = {
            type: "session.create.failed",
            error: authResult.error ?? "Authentication failed.",
            ts: new Date().toISOString(),
          };
          ws.send(JSON.stringify(sessionCreateFailedEvent));
          ws.close(1008, "Authentication failed");
          return;
        }

        console.log("✅ Authentication successful for user:", ws.userId);

        // Initialize Claude client for this session
        // JOEY: revisit this later. I'm not sure we're using this correctly.
        //  -> claudeClients is a global map of claude clients for all users.
        //  -> how does this play into a distributed backend system. Because this is deployed separately. Unsure about infrastructure to use to support this pattern...
        if (!claudeClients[ws.userId]) {
          claudeClients[ws.userId] = new ClaudeMCPClient();
          await claudeClients[ws.userId].initialize();
          // Set the tool executor
          claudeClients[ws.userId].setToolExecutor(mcpManager);
        }

        // ✅ LOAD OR CREATE SESSION LIKE YOUR WORKING VERSION
        try {
          await initializeUserSession(ws);
        } catch (error) {
          console.error("❌ Failed to initialize session:", error);
        }
        console.log(`[handleWebSocketConnection] Sending auth success for user: ${ws.userId}`);
        if (message.sessionId !== ws.sessionId) {
          console.warn("need to diagnose why these could be different.");
          console.error(
            `[handleWebSocketConnection] Session ID mismatch: ${message.sessionId} !== ${ws.sessionId}`
          );
          // return;
        }
        const resumeSessionId: string | undefined = message.sessionId || ws.sessionId;

        await liveChatSessionDB.setActiveConn(resumeSessionId!, ws.connectionId!);

        const actor = await getOrCreateActor(resumeSessionId!, ws.userId);
        const turn = "idle";
        const { headSeq, messages }: { headSeq: number; messages: SnapshotMessage[] } =
          await readSnapshot(resumeSessionId!, 50);
        const connectionEstablishedEvent: ServerEvent = {
          type: "connection.established",
          sessionId: resumeSessionId!,
          connectionId: ws.connectionId!,
          headSeq: headSeq,
          ts: new Date().toISOString(),
          turn: turn,
        };
        ws.send(JSON.stringify(connectionEstablishedEvent));

        const sessionSnapshotEvent: ServerEvent = {
          type: "session.snapshot",
          sessionId: resumeSessionId!,
          headSeq: headSeq,
          messages: messages,
          ts: new Date().toISOString(),
          turn: turn,
        };
        ws.send(JSON.stringify(sessionSnapshotEvent));

        /**
         * Checking the current state of the actor and doing appropriate actions to continue the workflow.
         *
         *
         *
         *
         */

        if (authResult.supabaseAuthSuccess) {
          // Need to get an actor and then send a auth event to the actor.
          // const actor = await getOrCreateActor(ws.sessionId!, ws.userId);
          const currentState = actor.getSnapshot().value;
          if (currentState === "waiting for user to login") {
            actor.send({
              type: "CHECK_USER_AUTHENTICATION",
            });
          }
        }

        // Selection state for the user? If applicable, send the current selection data through the websocket.
        console.log(
          "[handleWebSocketConnection:initializeUserSession] Checking for selection state for user: ",
          ws.userId
        );
        const chatSession: ChatSession | null = await chatSessionsDB.getSession(
          resumeSessionId!,
          ws.userId
        );
        if (chatSession) {
          console.log(
            "[handleWebSocketConnection:initializeUserSession] Sending current selection data to WebSocket"
          );
        }

        return;
      }

      // Require authentication for all other messages
      if (!ws.isAuthenticated) {
        const errorEvent: ServerEvent = {
          type: "error",
          code: "auth_required",
          message: "Authentication required",
          ts: new Date().toISOString(),
        };
        ws.send(JSON.stringify(errorEvent));
        return;
      }

      // Apply rate limiting
      if (!checkRateLimit(ws.userId)) {
        const errorEvent: ServerEvent = {
          type: "error",
          code: "rate_limit_exceeded",
          message: "Rate limit exceeded",
          ts: new Date().toISOString(),
        };
        ws.send(JSON.stringify(errorEvent));
        return;
      }

      // Handle authenticated messages using your working logic
      console.log("🔍 Handling message:", message);
      await handleWebSocketMessage(ws, message);
    } catch (error) {
      console.error("❌ WebSocket message error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          error: "Invalid message format",
        })
      );
    }
  });

  ws.on("close", () => {
    clearTimeout(authTimeout);
    handleDisconnection(ws);
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
    clearTimeout(authTimeout);
    handleDisconnection(ws);
  });

  // Heartbeat to detect dead connections
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const now = Date.now();
      if (now - (ws.lastActivity || 0) > 60000) {
        console.log("💔 WebSocket inactive, closing connection");
        ws.close(1001, "Inactive connection");
      }
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
}

// ✅ INITIALIZE SESSION LIKE YOUR WORKING VERSION
async function initializeUserSession(ws: AuthenticatedWebSocket): Promise<void> {
  try {
    console.log(`🔍 Initializing session for user: ${ws.userId}`);

    // Get or create session for this user (matching your working logic)
    let session = await chatSessionsDB.getActiveSession(ws.userId);
    const isAuthenticated = Boolean(ws.supabaseEmail); // User is authenticated if they have a Supabase email

    if (!session) {
      session = await chatSessionsDB.createSession(ws.userId, 48, isAuthenticated);
      console.log(`🆕 Created new session: ${session.id} (authenticated: ${isAuthenticated})`);
    } else {
      console.log(`📋 Using existing session: ${session.id}`);
      // Update authentication status if it has changed
      if (session.is_authenticated !== isAuthenticated) {
        await chatSessionsDB.updateAuthenticationStatus(session.id, isAuthenticated);
      }
    }

    // Update WebSocket with session ID
    ws.sessionId = session.id;

    console.log(
      `[handleWebSocketConnection] Sending connection confirmation with session info for session: ${session.id}`
    );
    // Use the isAuthenticated variable already declared above

    // Persist the boolean in the xstate_context for this session
    try {
      // If authenticated via Supabase, ensure session owner and is_authenticated are correct
      if (isAuthenticated) {
        const alreadyAuthed = session.is_authenticated === true;
        const ownerChanged = session.user_id !== ws.userId;
        if (!alreadyAuthed || ownerChanged) {
          await chatSessionsDB.upsertAuthState(session.id, session.user_id, ws.userId, true);
        }
      }
    } catch (err) {
      console.warn("Failed to persist auth state:", err);
    }
  } catch (error) {
    console.error("❌ Failed to initialize session:", error);
    await emitPersisted(ws, ws.sessionId!, "error", {
      message: "Failed to initialize session",
    });
    throw error;
  }
}

type AuthenticationResult = {
  supabaseAuthSuccess: boolean;
  backendJwtAuthSuccess: boolean;
  error?: string;
};

async function handleAuthentication(
  ws: AuthenticatedWebSocket,
  token: string,
  supabaseAccessToken?: string
): Promise<AuthenticationResult> {
  let rtnSupabaseAuthSuccess = false;
  let rtnBackendJwtAuthSuccess = false;
  try {
    // Verify JWT token from message body, not query params

    const payload = verifyWebSocketToken(token);

    if (payload.type !== "websocket") {
      return {
        supabaseAuthSuccess: rtnSupabaseAuthSuccess,
        backendJwtAuthSuccess: rtnBackendJwtAuthSuccess,
        error: "Invalid token type",
      };
    }

    // If a Supabase access token is provided, validate it server-side to ensure active session
    // We are only using the JWT token for the backend to allow the start of the flows with a guest user connected.
    if (supabaseAccessToken) {
      const { data, error } = await supabase.auth.getUser(supabaseAccessToken);
      if (error || !data?.user) {
        return {
          supabaseAuthSuccess: rtnSupabaseAuthSuccess,
          backendJwtAuthSuccess: rtnBackendJwtAuthSuccess,
          error: "Invalid Supabase session",
        };
      }
      // Always trust Supabase for authenticated identity
      ws.userId = data.user.id;
      ws.supabaseEmail = data.user.email || undefined;
      rtnSupabaseAuthSuccess = true;
    }

    // Rate limiting checks...
    const now = Date.now();
    const userConnectionTimes = connectionRateLimit.get(payload.userId) || [];
    const recentConnections = userConnectionTimes.filter((time) => now - time < 60000);

    if (recentConnections.length >= 10) {
      return {
        supabaseAuthSuccess: rtnSupabaseAuthSuccess,
        backendJwtAuthSuccess: rtnBackendJwtAuthSuccess,
        error: "Too many connection attempts",
      };
    }

    recentConnections.push(now);
    connectionRateLimit.set(payload.userId, recentConnections);

    const userConnects = userConnections.get(payload.userId) || new Set();
    if (userConnects.size >= 3) {
      return {
        supabaseAuthSuccess: rtnSupabaseAuthSuccess,
        backendJwtAuthSuccess: rtnBackendJwtAuthSuccess,
        error: "Too many concurrent connections",
      };
    }

    // After jwt verify and rate limiting, we can set the backend auth to true.
    rtnBackendJwtAuthSuccess = true;

    // Set up authenticated connection
    const connectionId = crypto.randomUUID();
    // If not authenticated with Supabase access token, fallback to JWT userId (guest or legacy)
    if (!ws.userId) {
      ws.userId = payload.userId;
    }
    ws.supabaseEmail = payload.email;
    ws.connectionId = connectionId;
    ws.isAuthenticated = true;

    // Store connection references
    activeConnections.set(connectionId, ws);
    userConnects.add(connectionId);
    userConnections.set(payload.userId, userConnects);

    console.log(`✅ WebSocket authenticated for user ${payload.userId}`);
    return {
      supabaseAuthSuccess: rtnSupabaseAuthSuccess,
      backendJwtAuthSuccess: rtnBackendJwtAuthSuccess,
    };
  } catch (error) {
    console.error("❌ WebSocket authentication error:", error);
    return {
      supabaseAuthSuccess: rtnSupabaseAuthSuccess,
      backendJwtAuthSuccess: rtnBackendJwtAuthSuccess,
      error: "Authentication failed",
    };
  }
}

function handleDisconnection(ws: AuthenticatedWebSocket): void {
  if (ws.connectionId) {
    activeConnections.delete(ws.connectionId);

    if (ws.userId) {
      const userConnects = userConnections.get(ws.userId);
      if (userConnects) {
        userConnects.delete(ws.connectionId);
        if (userConnects.size === 0) {
          userConnections.delete(ws.userId);
        }
      }

      // Clean up Claude client
      if (claudeClients[ws.userId]) {
        claudeClients[ws.userId].disconnect();
        delete claudeClients[ws.userId];
      }
    }
  }
  console.log(`👋 WebSocket disconnected for user: ${ws.userId}`);
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const key = `rate_${userId}`;
  const userMessages = connectionRateLimit.get(key) || [];
  const recentMessages = userMessages.filter((time) => now - time < 60000);

  if (recentMessages.length >= 60) {
    return false;
  }

  recentMessages.push(now);
  connectionRateLimit.set(key, recentMessages);
  return true;
}

// ✅ YOUR WORKING MESSAGE HANDLER LOGIC - Updated with AI integration
async function handleWebSocketMessage(ws: AuthenticatedWebSocket, message: ClientEvent) {
  // const { type, messageId, text, ts, sessionId } = message;

  // Resolve the effective session ID: prefer message.sessionId, fallback to ws.sessionId
  let effectiveSessionId: string | undefined = ws.sessionId;
  if (message.type === "user.message" && message.sessionId) {
    effectiveSessionId = message.sessionId;
  }

  console.log(
    `[handler:handleWebSocketMessage] Getting or creating actor for session: ${effectiveSessionId} for user: ${ws.userId}`
  );
  const actor = await getOrCreateActor(effectiveSessionId!, ws.userId);
  actor.send({
    type: "UPDATE_SOCKET",
    socket: ws,
  });
  // Get initial state and update tools
  const initialSnapshot = actor.getSnapshot();
  const initialState =
    typeof initialSnapshot.value === "string"
      ? initialSnapshot.value
      : Object.keys(initialSnapshot.value)[0];

  if (initialState === "waiting for user to login" && ws.supabaseEmail) {
    actor.send({
      type: "CHECK_USER_AUTHENTICATION",
    });
    return;
  }

  console.log(`[handleWebSocketMessage] Updating tools for state: ${initialState}`);
  mcpManager.updateToolsForState(initialState, actor);
  claudeClients[ws.userId].updateAvailableTools(mcpManager.getCurrentTools());

  switch (message.type) {
    case "user.message":
      console.log("[handler:handleWebSocketMessage] - user.message: ", message);
      await handleUserMessage(actor, ws, message);
      break;

    case "new.session":
      console.log("[handler:handleWebSocketMessage] - new_session: ", message);
      await handleNewSession(ws, message);
      break;

    case "company.selected":
      console.log("[handler:handleWebSocketMessage] - company_selected: ", message);
      await handleCompanySelected(actor, ws, message.company);
      break;

    case "card.selected":
      console.log("[handler:handleWebSocketMessage] - card_selected: ", message);
      await handleCardSelected(actor, ws, message.card);
      break;

    case "time.selected":
      console.log("[handler:handleWebSocketMessage] - time_selected: ", message);
      await handleTimeSelected(actor, ws, message.timeSlot);
      break;

    case "check.user.authentication":
      console.log("[handler:handleWebSocketMessage] - check_user_authentication: ", message);
      await handleCheckUserAuthentication(actor, ws);
      break;

    default:
      console.error(`[handler:handleWebSocketMessage] - unknown message type: ${message.type}`);

      ws.send(
        JSON.stringify({
          type: "error",
          message: `Unknown message type: ${message.type}`,
          timestamp: new Date().toISOString(),
        })
      );
  }
}

// ✅ COMPANY SELECTION HANDLER
// Handling selection logic outside of an llm flow because this is a button the user will click in their chat window.
async function handleCompanySelected(
  actor: ActorRef<any, any>,
  ws: AuthenticatedWebSocket,
  company: any
) {
  console.log("[handleCompanySelected] handleCompanySelected", company);

  if (!ws.sessionId) {
    console.error("SHOULDNT SEE THIS...[handleCompanySelected] No active session");
    return;
  }

  try {
    // - Store selected company in session
    // - Trigger next step in booking flow
    // - Send confirmation to user

    // Send confirmation to user
    const confirmationMessage = `Great choice! You've selected ${company.name}. Let's proceed with the next steps.`;
    await emitPersisted(ws, ws.sessionId, "company.selection.confirmed", {
      company: company,
      message: confirmationMessage,
    });

    // Save response to database.
    chatMessagesDB.addMessage(ws.sessionId, "assistant", confirmationMessage);

    // Send company selection event to booking machine
    actor.send({
      type: "COMPANY_SELECTED",
      output: { company: company as Company },
    });
  } catch (error) {
    console.error("❌ Error handling company selection:", error);
    await emitPersisted(ws, ws.sessionId, "error", {
      message: "Failed to process company selection",
    });
  }
}

async function handleCardSelected(
  actor: ActorRef<any, any>,
  ws: AuthenticatedWebSocket,
  card: Card
) {
  console.log("[handleCardSelected] handleCardSelected", card);
  if (!ws.sessionId) {
    console.error("SHOULDNT SEE THIS...[handleCardSelected] No active session");
    return;
  }

  try {
    // Send confirmation to user
    const confirmationMessage = `Great choice! Let's proceed with the next steps.`;
    await emitPersisted(ws, ws.sessionId, "card.selection.confirmed", {
      card: card,
      message: confirmationMessage,
    });

    // Save response to database.
    chatMessagesDB.addMessage(ws.sessionId, "assistant", confirmationMessage);

    // Send card selection event to booking machine
    actor.send({
      type: "CARD_SELECTED",
      output: { card: card as Card },
    });
  } catch (error) {
    console.error("❌ Error handling card selection:", error);
    await emitPersisted(ws, ws.sessionId, "error", {
      message: "Failed to process card selection",
    });
  }
}

// ✅ YOUR WORKING TIME SELECTION HANDLER
async function handleTimeSelected(
  actor: ActorRef<any, any>,
  ws: AuthenticatedWebSocket,
  timeSlot: TimeSlot
) {
  console.log("[handleTimeSelected] handleTimeSelected", timeSlot);
  if (!ws.sessionId) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "No active session",
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  try {
    // Send confirmation to user
    const confirmationMessage = `Great choice! You've selected ${timeSlot.date} at ${timeSlot.startTime}. Let's proceed with the next steps.`;
    ws.send(
      JSON.stringify({
        type: "time_selection_confirmed",
        timeSlot: timeSlot,
        message: confirmationMessage,
        timestamp: new Date().toISOString(),
      })
    );
    // Save response to database.
    // I don't think we need to do this... It should be handled in bookingMachine.ts.
    chatMessagesDB.addMessage(ws.sessionId, "assistant", confirmationMessage);

    // Save time selection to chat history
    addToChatHistory(ws.sessionId, "bot", confirmationMessage);

    actor.send({
      type: "TIME_SELECTED",
      output: { timeSlot: timeSlot as TimeSlot },
    });
  } catch (error) {
    console.error("❌ Error handling time selection:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Failed to process time selection",
        timestamp: new Date().toISOString(),
      })
    );
  }
}

// LOGGING HELPER ONLY - Pretty prints context for debugging.
function filterContext(context: any): any {
  const filtered = {};
  for (const [key, value] of Object.entries(context)) {
    if (!key.startsWith("_")) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        // Recursively filter nested objects
        (filtered as Record<string, any>)[key] = filterContext(value);
      } else {
        (filtered as Record<string, any>)[key] = value;
      }
    }
  }
  return filtered;
}

async function handleCheckUserAuthentication(
  actor: ActorRef<any, any>,
  ws: AuthenticatedWebSocket
) {
  console.log("[handler:handleCheckUserAuthentication] - check_user_authentication: ", ws);
  actor.send({ type: "CHECK_USER_AUTHENTICATION" });
}

async function handleUserMessage(
  actor: ActorRef<any, any, EventObject>,
  ws: AuthenticatedWebSocket,
  message: { type: "user.message"; sessionId: UUID; messageId: UUID; text: string; ts: string }
) {
  console.log(`[handleUserMessage] 📨 Starting handleUserMessage for user: ${ws.userId}`);
  const { sessionId, messageId, text, ts } = message;
  console.log(
    `[handleUserMessage] 📝 Message details - sessionId: ${sessionId}, messageId: ${messageId}, text length: ${text.length}, ts: ${ts}`
  );

  console.log(`[handleUserMessage] 🔄 Beginning turn for session: ${sessionId} with 180s timeout`);
  const admit = await beginTurn(sessionId, 180);
  console.log(`[handleUserMessage] 🎫 Turn admit result:`, {
    status: admit.status,
    leaseId: admit.status === "ok" ? admit.leaseId : "N/A",
  });
  if (admit.status === "busy") {
    console.log(
      `[handleUserMessage] 🚫 Turn is busy for session: ${sessionId}, rejecting message: ${messageId}`
    );
    await emitPersisted(ws, sessionId, "message.rejected", {
      messageId,
      reason: "busy",
      ts,
      sessionId,
    });
    console.log(`[handleUserMessage] ✅ Sent message.rejected for busy turn`);
    return;
  }

  if (admit.status === "missing") {
    console.log(
      `[handleUserMessage] ❌ Turn is missing for session: ${sessionId}, rejecting message: ${messageId}`
    );
    await emitPersisted(ws, sessionId, "error", {
      messageId,
      reason: "Session is missing",
      ts,
      sessionId,
    });
    console.log(`[handleUserMessage] ✅ Sent error for missing turn`);
    return;
  }

  console.log(`[handleUserMessage] ✅ Turn admitted successfully with leaseId: ${admit.leaseId}`);

  const leaseId = admit.leaseId;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  try {
    // Start a heartbeat timer while you stream to keep turn alive.
    heartbeatTimer = setInterval(() => {
      heartbeatTurn(ws.sessionId!, leaseId).catch((e) => {
        console.warn(`[handleUserMessage] ⚠️ Turn heartbeat failed for leaseId ${leaseId}:`, e);
      });
    }, 30_000);

    await chatSessionsDB.setTurnState(sessionId, "streaming");
    await emitPersisted(ws, sessionId, "session.state", {
      turn: "streaming",
    });

    // 2) Persist to chat_messages (materialized view)
    await chatMessagesDB.addMessage(sessionId, "user", text);

    // 3) Persist + emit acceptance
    await emitPersisted(ws, sessionId, "message.accepted", { messageId });

    // 4) start ai stream
    const streamId = crypto.randomUUID();
    let finalText = "";

    await claudeClients[ws.userId].processUserMessage(ws, text, actor, []);

    if (finalText.trim()) {
      // console.log(`[handleUserMessage] 💾 Persisting AI response to chat_messages DB`);
      await chatMessagesDB.addMessage(sessionId, "assistant", finalText);
      // console.log(`[handleUserMessage] ✅ AI response persisted to DB`);
    } else {
      console.warn(`[handleUserMessage] ⚠️ AI response was empty, skipping DB persistence`);
    }

    await emitPersisted(
      ws,
      sessionId,
      "ai.done",
      {
        streamId,
        final: finalText,
        status: "ok",
      },
      { streamId }
    );
    console.log(`[handleUserMessage] ✅ AI done emitted successfully`);
  } catch (error) {
    console.error(
      `[handleUserMessage] ❌ Error during message processing for session ${sessionId}:`,
      error
    );
    console.log(`[handleUserMessage] 🚨 Emitting ai.done with error status`);
    await emitPersisted(ws, sessionId, "ai.done", {
      streamId: crypto.randomUUID(),
      status: "error",
    });
    console.log(`[handleUserMessage] ✅ Error ai.done emitted`);
  } finally {
    console.log(
      `[handleUserMessage] 🧹 Starting cleanup for session ${sessionId}, leaseId: ${leaseId}`
    );

    if (heartbeatTimer) {
      console.log(`[handleUserMessage] ⏰ Clearing heartbeat timer`);
      clearInterval(heartbeatTimer);
    }

    console.log(`[handleUserMessage] 🔚 Ending turn for session ${sessionId}`);
    const ended = await endTurn(sessionId, leaseId).catch((e) => {
      console.error(`[handleUserMessage] ❌ Turn end failed for session ${sessionId}:`, e);
      return false;
    });

    if (!ended) {
      console.warn(
        `[handleUserMessage] ⚠️ turn_end returned false for session ${sessionId} (expired or mismatched lease)`
      );
    } else {
      console.log(`[handleUserMessage] ✅ Turn ended successfully for session ${sessionId}`);
    }

    console.log(`[handleUserMessage] 🔄 Setting turn state to idle for session ${sessionId}`);
    // This "setTurnState" is for the frontend to know that the turn is over.
    await chatSessionsDB.setTurnState(sessionId, "idle");
    console.log(`[handleUserMessage] 📡 Emitting session.state idle`);
    await emitPersisted(ws, sessionId, "session.state", {
      turn: "idle",
    });
    console.log(`[handleUserMessage] 🎉 Message processing completed for session ${sessionId}`);
  }
}

async function handleNewSession(
  ws: AuthenticatedWebSocket,
  message: { type: "new.session"; ts: string }
) {
  console.log("[handler:handleNewSession] - new_session: ", message);

  try {
    const oldSessionId = ws.sessionId;

    try {
      await chatSessionsDB.deactivateSession(oldSessionId!);
    } catch (error) {
      console.warn("[handler:handleNewSession] - error deactivating session : ", error);
    }

    try {
      await liveChatSessionDB.deleteLiveRow(oldSessionId!);
    } catch (error) {
      console.warn("[handler:handleNewSession] - error deleting live row: ", error);
    }

    // Create a fresh session
    const isAuthenticated = Boolean(ws.supabaseEmail);
    const newSession = await chatSessionsDB.createSession(ws.userId, 48, isAuthenticated);

    // Set the new session as the active connection
    // this creates a race condition on emitPersisted.
    await liveChatSessionDB.setActiveConn(newSession.id, ws.connectionId!);

    // 3) Boot a fresh actor for the new session and bind this socket
    const newActor = await getOrCreateActor(newSession.id, ws.userId);
    newActor.send({ type: "UPDATE_SOCKET", socket: ws });

    // 4) Swap socket’s session pointer
    ws.sessionId = newSession.id;

    // 5) Tell the client
    await emitPersisted(ws, newSession.id, "session.created", {
      headSeq: 0,
      turn: "idle",
    });

    const sessionSnapshotEvent: ServerEvent = {
      type: "session.snapshot",
      sessionId: newSession.id,
      headSeq: 0,
      messages: [],
      ts: new Date().toISOString(),
      turn: "idle",
    };
    ws.send(JSON.stringify(sessionSnapshotEvent));
  } catch (error) {
    console.error("[handler:handleNewSession] - error: ", error);

    const errorEvent: ServerEvent = {
      type: "error",
      code: "NEW_SESSION_ERROR",
      message: "Failed to create new session",
      ts: new Date().toISOString(),
    };
    ws.send(JSON.stringify(errorEvent));
  }
}
