// backend/src/websocket/websocketUtils.ts
import { appendEvent } from "../database/chat-events";
import { chatMessagesDB } from "../database/chat-messages";
import { liveChatSessionDB } from "../database/chat-session-live";
import { ServerEvent } from "../shared/protocol";
import { AuthenticatedWebSocket } from "./handler";

// JOEY: let's use this method as the "system" message to confirm possibly?
// thoughts on keeping ai messages on the left. and then system messages / confirmations in the middle?
// Need system messages to persist to the database.
export const sendConfirmationMessageToWebSocket = async (
  ws: AuthenticatedWebSocket,
  messageType: ServerEvent["type"],
  message: string
) => {
  if (ws.sessionId) {
    emitPersisted(ws, ws.sessionId, messageType, {
      message: message,
    });
    chatMessagesDB.addMessage(ws.sessionId, "assistant", message);
  } else {
    console.error(
      "JOEY SHOULDNT SEE THIS...[sendConfirmationMessageToWebSocket] No active session"
    );
  }
};

function nowISO() {
  return new Date().toISOString();
}

export async function emitPersisted(
  ws: AuthenticatedWebSocket,
  sessionId: string,
  type: ServerEvent["type"],
  payload: Omit<ServerEvent, "type"> | Record<string, unknown>,
  opts?: { messageId?: string; streamId?: string }
) {
  console.log("[websocketUtils:emitPersisted] Emitting event type: ", { type });

  const ts = nowISO();
  const { seq } = await appendEvent(sessionId, type, { ...payload, ts }, opts);
  const event = { type, ...payload, sessionId, ts, seq } as ServerEvent;

  const canSend = await liveChatSessionDB.isActiveConn(sessionId, ws.connectionId!);
  if (canSend) {
    ws.send(JSON.stringify(event));
  }

  if (!canSend && ws.sessionId === sessionId && ws.readyState === ws.OPEN) {
    console.log(
      "[websocketUtils:emitPersisted] Sending event to WebSocket even though not active connection in db."
    );
    ws.send(JSON.stringify(event));
  }
}
