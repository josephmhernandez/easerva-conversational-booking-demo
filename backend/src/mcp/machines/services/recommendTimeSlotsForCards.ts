import { Card } from "../../../shared/protocol";
import { TimeSlot } from "../types";

export const getTimeSlotsForCard = async (
  card: Card,
  isMoreTimeSlots: boolean
): Promise<TimeSlot[]> => {
  console.log("TODO: complete this method: getTimeSlotsForCard: ", card, isMoreTimeSlots);

  // Wait for 2 seconds
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const mockTimeSlots = [
    {
      id: "1",
      date: "2024-01-15",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "2",
      date: "2024-01-15",
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "3",
      date: "2024-01-15",
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "4",
      date: "2024-01-16",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      durationMinutes: 60,
      available: true,
    },
    {
      id: "5",
      date: "2024-01-16",
      startTime: "11:00 AM",
      endTime: "12:00 PM",
      durationMinutes: 60,
      available: true,
    },
  ];

  return mockTimeSlots as TimeSlot[];
};
