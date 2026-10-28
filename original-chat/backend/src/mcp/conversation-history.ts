import type { ChatMessage } from "../database/types";

export type ModelHistoryEntry = {
  role: "user" | "bot";
  message: string;
};

/** Convert persisted chat rows into the compact history sent to Gemini. */
export function toModelHistory(
  messages: ChatMessage[],
  limit = 20
): ModelHistoryEntry[] {
  return messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
    .slice(-limit)
    .map((message) => ({
      role: message.role === "user" ? "user" : "bot",
      message: message.content.trim(),
    }));
}
