import { TimeSlot } from "../machines/types";

/**
 * Used to send the time slot that the user has selected to the state machine.
 */
export async function postUserSelectsTimeSlot(
  actor: any,
  timeSlotId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<TimeSlot> {
  console.log("[MCP] User selecting time slot:", timeSlotId);

  actor.send({
    type: "TIME_SELECTED",
    output: {
      timeSlot: {
        id: timeSlotId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        durationMinutes: 60,
        available: true,
      } as TimeSlot,
    },
  });

  return {
    id: timeSlotId,
    date: date,
    startTime: startTime,
    endTime: endTime,
    durationMinutes: 60,
    available: true,
  } as TimeSlot;
}
