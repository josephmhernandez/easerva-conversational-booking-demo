"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, TestTube } from "lucide-react";
import { Button } from "../../../../../../components/ui/button";

// CalendarAssignment removed as it's not used in this component

// CalendarManagementData removed as it's not used in this component

interface SimpleStrategyRendererProps {
  businessCalendar: {
    provider: string;
    connectionStatus: string;
    calendarId: string;
    calendarName: string;
  };
  calendarProviders: Array<{ id: string; name: string }>;
  onBusinessCalendarChange: (calendar: {
    provider: string;
    connectionStatus: string;
    calendarId: string;
    calendarName: string;
  }) => void;
  onConnectionTest: (type: string, id?: string) => void;
}

export default function SimpleStrategyRenderer({
  businessCalendar,
  calendarProviders,
  onBusinessCalendarChange,
  onConnectionTest,
}: SimpleStrategyRendererProps) {
  return (
    <div className="space-y-6">
      {/* Business Calendar Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Business Calendar Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Calendar Provider</Label>
            <Select
              value={businessCalendar.provider}
              onValueChange={(value) =>
                onBusinessCalendarChange({
                  ...businessCalendar,
                  provider: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose provider" />
              </SelectTrigger>
              <SelectContent>
                {calendarProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => onConnectionTest("business")}
              disabled={
                !businessCalendar.provider || businessCalendar.connectionStatus === "connecting"
              }
            >
              {businessCalendar.connectionStatus === "connecting" ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Connect Calendar
            </Button>
            {businessCalendar.connectionStatus === "connected" && (
              <Button variant="outline" onClick={() => onConnectionTest("business")}>
                <TestTube className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
