import assert from "node:assert/strict";
import test from "node:test";
import { parseStoredMachineSnapshot, sanitizeMachineSnapshot } from "./machine-snapshot";

test("accepts a persisted XState snapshot and removes its socket", () => {
  const stored = sanitizeMachineSnapshot({
    status: "active",
    value: "Search and scroll",
    context: { sessionId: "session-1", selectedCard: { card_id: "dog-walk" }, socket: {} },
    children: {},
  });

  assert.equal(stored.context.socket, null);
  assert.equal(parseStoredMachineSnapshot(JSON.stringify(stored))?.value, "Search and scroll");
});

test("rejects empty and legacy partial state that XState cannot rehydrate", () => {
  assert.equal(parseStoredMachineSnapshot("{}"), null);
  assert.equal(parseStoredMachineSnapshot({ value: "finished", context: {} }), null);
});
