"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CombiningInterfaceProps {
  combiningMode: boolean;
  selectedCards: string[];
  bookingStrategy: string;
  onToggleCombining: () => void;
  onCombineSelected: () => void;
  onCancelCombining: () => void;
}

export default function CombiningInterface({
  combiningMode,
  selectedCards,
  bookingStrategy,
  onToggleCombining,
  onCombineSelected,
  onCancelCombining,
}: CombiningInterfaceProps) {
  if (!combiningMode) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6 p-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={onToggleCombining}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="combine-services-button"
          >
            Combine Services
          </Button>
          <div className="text-center flex-1 mx-4">
            <p className="text-sm text-gray-600">
              Select services to combine them into a single booking card
            </p>
            <p className="text-xs text-gray-500">This helps streamline your booking process</p>
          </div>
          <div className="w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              Combining Mode
            </Badge>
            <span className="text-sm text-blue-700">
              {bookingStrategy === "employee"
                ? "Select exactly 2 services from the same employee and location to combine"
                : "Select exactly 2 services from the same location to combine"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onCombineSelected}
              disabled={selectedCards.length !== 2}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Combine Selected ({selectedCards.length}/2)
            </Button>
            <Button
              onClick={onCancelCombining}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Cancel Combining
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
