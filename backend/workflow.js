const providers = [
  { id: "north-star", name: "North Star Studio", match: 96, specialty: "Brand strategy", mode: "Online", rating: "4.9" },
  { id: "bright-path", name: "Bright Path Consulting", match: 91, specialty: "Business coaching", mode: "Online", rating: "4.8" },
  { id: "juniper", name: "Juniper Creative", match: 87, specialty: "Web presence", mode: "Austin, TX", rating: "4.7" }
];

const slots = [
  { id: "tue-1030", label: "Tuesday, 10:30 AM", timezone: "Central" },
  { id: "wed-1400", label: "Wednesday, 2:00 PM", timezone: "Central" },
  { id: "thu-0900", label: "Thursday, 9:00 AM", timezone: "Central" }
];

function nextStep(state = 0, text = "") {
  const safeText = String(text).trim().slice(0, 500);
  if (state <= 0) {
    return {
      state: 1,
      message: `I can help with that. To narrow the search, should this service be online, in person, or either?`,
      event: null
    };
  }
  if (state === 1) {
    return {
      state: 2,
      message: `I matched your request${safeText ? ` (${safeText.toLowerCase()})` : ""} with three demo providers. These are synthetic records created for the portfolio sandbox.`,
      event: { type: "company.recommendations", companies: providers }
    };
  }
  if (state === 2) {
    return {
      state: 3,
      message: "North Star Studio has several introductory consultation times available. Choose one to continue.",
      event: { type: "time.slots.recommendations", timeSlots: slots }
    };
  }
  if (state === 3) {
    return {
      state: 4,
      message: "Your demo appointment is confirmed. In production this step would create the booking through the provider calendar; this sandbox stores no appointment.",
      event: { type: "booking.confirmed", confirmation: "DEMO-2471" }
    };
  }
  return {
    state: 1,
    message: "That completed the sample booking journey. Tell me what kind of service you need to start another search.",
    event: { type: "session.completed" }
  };
}

module.exports = { nextStep, providers, slots };
