const test = require("node:test");
const assert = require("node:assert/strict");
const { nextStep } = require("./workflow");

test("booking workflow progresses through discovery, providers, slots, and confirmation", () => {
  const location = nextStep(0, "I need a brand consultant");
  assert.equal(location.state, 1);
  const matches = nextStep(location.state, "online");
  assert.equal(matches.event.type, "company.recommendations");
  assert.equal(matches.event.companies.length, 3);
  const availability = nextStep(matches.state, "North Star Studio");
  assert.equal(availability.event.type, "time.slots.recommendations");
  const confirmation = nextStep(availability.state, "Tuesday");
  assert.equal(confirmation.event.type, "booking.confirmed");
});

test("workflow bounds reflected user input", () => {
  const result = nextStep(1, "x".repeat(900));
  assert.ok(result.message.length < 800);
});
