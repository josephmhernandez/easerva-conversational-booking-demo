import { TimeSlot } from "../machines/types";

export async function postUserNeedsMoreTimeSlots(actor: any, notes: string): Promise<TimeSlot[]> {
  console.log("[MCP] User needs more time slots");

  // We'll need to call a RAG tool or form a query to the database to get more time slots.
  console.log("notes: ", notes);

  const moreMockedTimeSlots = [
    {
      id: "m1",
      date: "2024-01-17",
      startTime: "9:05 AM",
      endTime: "10:05 AM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "m2",
      date: "2024-01-17",
      startTime: "10:05 AM",
      endTime: "11:05 AM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "m3",
      date: "2024-01-17",
      startTime: "11:05 AM",
      endTime: "12:05 PM",
      durationMinutes: 60,
      available: true,
    },
  ];
  const moreTimeSlots = moreMockedTimeSlots as TimeSlot[];

  actor.send({
    type: "STORE_MORE_TIME_SLOTS",
    output: {
      timeSlots: moreTimeSlots,
    },
  });

  return moreTimeSlots;
}
