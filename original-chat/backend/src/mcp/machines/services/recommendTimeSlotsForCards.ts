import type { Card } from "../../../shared/protocol";
import type { TimeSlot } from "../types";

function nextBusinessDay(offset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  let remaining = offset;

  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining -= 1;
  }

  return date.toISOString().slice(0, 10);
}

export const getTimeSlotsForCard = async (
  card: Card,
  isMoreTimeSlots: boolean
): Promise<TimeSlot[]> => {
  console.log("[Booking] Generating demo availability:", card.card_id, isMoreTimeSlots);

  await new Promise((resolve) => setTimeout(resolve, 250));

  const firstDay = nextBusinessDay(isMoreTimeSlots ? 4 : 1);
  const secondDay = nextBusinessDay(isMoreTimeSlots ? 5 : 2);
  const durationMinutes = card.duration_minutes ?? 60;

  const mockTimeSlots = [
    {
      id: "1",
      date: firstDay,
      startTime: "9:00 AM",
      endTime: "9:30 AM",
      durationMinutes,
      available: true,
    },
    {
      id: "2",
      date: firstDay,
      startTime: "10:00 AM",
      endTime: "10:30 AM",
      durationMinutes,
      available: true,
    },
    {
      id: "3",
      date: firstDay,
      startTime: "2:00 PM",
      endTime: "2:30 PM",
      durationMinutes,
      available: true,
    },
    {
      id: "4",
      date: secondDay,
      startTime: "9:00 AM",
      endTime: "9:30 AM",
      durationMinutes,
      available: true,
    },
    {
      id: "5",
      date: secondDay,
      startTime: "11:00 AM",
      endTime: "11:30 AM",
      durationMinutes,
      available: true,
    },
  ];

  return mockTimeSlots as TimeSlot[];
};
