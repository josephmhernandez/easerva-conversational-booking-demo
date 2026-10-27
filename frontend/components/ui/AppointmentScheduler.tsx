"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  available: boolean;
}

interface AppointmentSchedulerProps {
  businessName: string;
  availableSlots: TimeSlot[];
  onTimeSelect: (slot: TimeSlot) => void;
  onRequestMore?: () => void;
  selectedSlot?: TimeSlot | null;
  isLoading?: boolean;
}

export default function AppointmentScheduler({
  businessName,
  availableSlots,
  onTimeSelect,
  onRequestMore,
  selectedSlot = null,
  isLoading = false,
}: AppointmentSchedulerProps) {
  const [localSelectedSlot, setLocalSelectedSlot] = useState<TimeSlot | null>(selectedSlot);

  // Group slots by date
  const groupedSlots = availableSlots.reduce(
    (acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push(slot);
      return acc;
    },
    {} as Record<string, TimeSlot[]>
  );

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    setLocalSelectedSlot(slot);
    onTimeSelect(slot);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  if (availableSlots.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Here are some available times with {businessName}:
      </div>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Schedule with {businessName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(groupedSlots).map(([date, slots]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {formatDate(date)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => (
                  <Button
                    key={slot.id}
                    variant={localSelectedSlot?.id === slot.id ? "default" : "outline"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => handleSlotSelect(slot)}
                    className={`
                      relative h-10 text-sm transition-all
                      ${localSelectedSlot?.id === slot.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
                      ${!slot.available ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {slot.startTime}
                    {localSelectedSlot?.id === slot.id && <CheckCircle className="h-3 w-3 ml-1" />}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {localSelectedSlot && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Selected: {formatDate(localSelectedSlot.date)} at {localSelectedSlot.startTime}
              </div>
            </div>
          )}

          {onRequestMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={onRequestMore}
                disabled={isLoading}
                className="w-full max-w-xs"
              >
                {isLoading ? "Loading more..." : "Show more times"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
