import assert from "node:assert/strict";
import test from "node:test";
import { createActor, waitFor } from "xstate";
import type { Card } from "../../shared/protocol";
import { sanitizeMachineSnapshot } from "../machine-snapshot";
import { cardsMachine } from "./cardsMachine";

const card: Card = {
  card_id: "demo-card-pet-dog-walking",
  card_type: "service",
  business_id: "plano-paws",
  business_name: "Plano Paws",
  business_logo_url: null,
  display_name: "Neighborhood Dog Walking",
  tagline: "GPS-tracked walks",
  description: "A calm neighborhood walk.",
  media_url: "/demo/plano-paws/dog-walking-hero.webp",
  media_type: "image",
  profile_image_url: "/demo/plano-paws/walker-profile.webp",
  cta_text: "View availability",
  service_id: "dog-walking",
  service_name: "Neighborhood Dog Walking",
  service_description: "A calm neighborhood walk.",
  service_category_out: "Pet Services",
  price_type: "fixed",
  price_cents: 2600,
  price_min: null,
  price_max: null,
  duration_minutes: 30,
  location_id: "plano",
  location_name: "Plano",
  location_type: "mobile",
  location_city: "Plano",
  location_state: "TX",
  distance_meters: 0,
  employee_id: null,
  employee_name: null,
  employee_title: null,
  relevance_score: 1,
  badges: ["Demo provider"],
};

const input = {
  userId: "guest-1",
  sessionId: "session-1",
  socket: null,
};

test("moves from search results through card selection to durable time-slot state", async () => {
  const actor = createActor(cardsMachine, { input });
  actor.start();

  actor.send({ type: "CARDS_RETURNED", output: { cards: [card] } });
  assert.equal(actor.getSnapshot().value, "Search and scroll");

  actor.send({ type: "CARD_SELECTED", output: { card } });
  await waitFor(actor, (snapshot) => snapshot.value === "waiting for a time slot answer", {
    timeout: 2000,
  });

  assert.equal(actor.getSnapshot().context.selectedCard?.card_id, card.card_id);
  assert.equal(actor.getSnapshot().context.availableTimes?.length, 5);

  const persisted = sanitizeMachineSnapshot((actor as any).getPersistedSnapshot());
  actor.stop();

  const restored = createActor(cardsMachine, { input, snapshot: persisted as any });
  restored.start();
  assert.equal(restored.getSnapshot().value, "waiting for a time slot answer");
  assert.equal(restored.getSnapshot().context.selectedCard?.card_id, card.card_id);

  restored.send({
    type: "TIME_SLOT_SELECTED",
    output: { timeSlot: restored.getSnapshot().context.availableTimes?.[0] },
  });
  assert.equal(restored.getSnapshot().value, "finished");
  restored.stop();
});
