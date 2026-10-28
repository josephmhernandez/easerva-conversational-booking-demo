import assert from "node:assert/strict";
import test from "node:test";
import type { ChatMessage } from "../database/types";
import { toModelHistory } from "./conversation-history";

function row(role: ChatMessage["role"], content: string, index: number): ChatMessage {
  return {
    id: String(index),
    chat_session_id: "session-1",
    role,
    content,
    timestamp: new Date(index * 1000).toISOString(),
  };
}

test("maps durable user and assistant messages to Gemini history", () => {
  const history = toModelHistory([
    row("system", "internal", 1),
    row("user", "My dog's name is Luna.", 2),
    row("assistant", "How long should Luna's walk be?", 3),
    row("assistant", "", 4),
  ]);

  assert.deepEqual(history, [
    { role: "user", message: "My dog's name is Luna." },
    { role: "bot", message: "How long should Luna's walk be?" },
  ]);
});

test("keeps only the most recent model context", () => {
  const history = toModelHistory(
    Array.from({ length: 25 }, (_, index) => row("user", `message-${index}`, index)),
    10
  );

  assert.equal(history.length, 10);
  assert.equal(history[0].message, "message-15");
  assert.equal(history[9].message, "message-24");
});
