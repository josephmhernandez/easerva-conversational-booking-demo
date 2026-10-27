// /app/lib/availability-checker.ts
// Client-side utility to check availability for a specific time slot
// Uses cached busy periods from the day endpoint

import { evaluateRequirementExpression } from "./calendar-logic-evaluator";

interface BusyPeriod {
  calendar_id: string;
  start: string;
  end: string;
  calendar_group_id: string;
}

interface CalendarGroup {
  id: string;
  display_name: string;
  default_booking_calendar_id: string;
  busy_calendar_ids: string[];
}

interface Requirement {
  sequence_order: number;
  logic_operator: string | null;
  calendar_group_id: string | null;
  entity_type: string;
  entity_id: string;
  display_name: string;
}

interface CalendarGroupAvailability {
  calendar_group_id: string;
  is_available: boolean;
  conflicts?: Array<{
    calendar_id: string;
    start: string;
    end: string;
  }>;
}

/**
 * Checks if two time periods overlap
 */
function periodsOverlap(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
): boolean {
  const p1Start = new Date(period1Start).getTime();
  const p1End = new Date(period1End).getTime();
  const p2Start = new Date(period2Start).getTime();
  const p2End = new Date(period2End).getTime();

  // Two periods overlap if one starts before the other ends
  return p1Start < p2End && p2Start < p1End;
}

/**
 * Checks availability for a specific time slot using cached busy periods
 * @param busyPeriods - All busy periods for the day
 * @param calendarGroups - Calendar group definitions
 * @param requirements - Service card requirements with logic operators
 * @param startTime - ISO8601 start time for the slot
 * @param endTime - ISO8601 end time for the slot
 */
export function checkAvailabilityForSlot(
  busyPeriods: BusyPeriod[],
  calendarGroups: CalendarGroup[],
  requirements: Requirement[],
  startTime: string,
  endTime: string
): {
  available: boolean;
  conflicts: Array<{
    calendarGroupId: string;
    entity: string;
    entityType: string;
    conflictingEvent: {
      title: string;
      start: string;
      end: string;
    };
  }>;
} {
  // Group busy periods by calendar_group_id
  const busyPeriodsByGroup = new Map<string, BusyPeriod[]>();
  for (const period of busyPeriods) {
    if (!busyPeriodsByGroup.has(period.calendar_group_id)) {
      busyPeriodsByGroup.set(period.calendar_group_id, []);
    }
    busyPeriodsByGroup.get(period.calendar_group_id)!.push(period);
  }

  // Evaluate each calendar group's availability
  const groupAvailabilities = new Map<string, CalendarGroupAvailability>();

  for (const group of calendarGroups) {
    const groupBusyPeriods = busyPeriodsByGroup.get(group.id) || [];

    // Filter to only periods that overlap with our requested time slot
    const overlappingPeriods = groupBusyPeriods.filter((period) =>
      periodsOverlap(period.start, period.end, startTime, endTime)
    );

    const isAvailable = overlappingPeriods.length === 0;

    groupAvailabilities.set(group.id, {
      calendar_group_id: group.id,
      is_available: isAvailable,
      conflicts: isAvailable
        ? undefined
        : overlappingPeriods.map((p) => ({
            calendar_id: p.calendar_id,
            start: p.start,
            end: p.end,
          })),
    });
  }

  // Evaluate the requirement expression using the existing logic evaluator
  const evaluation = evaluateRequirementExpression(
    requirements,
    groupAvailabilities,
    startTime,
    endTime
  );

  return {
    available: evaluation.is_available,
    conflicts: evaluation.conflicts,
  };
}
