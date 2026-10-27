"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2, TestTube } from "lucide-react";

interface CalendarConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  selectedItem: {
    id: string;
    provider?: string;
    connectionStatus?: string;
  } | null;
  onItemChange: (item: { id: string; provider?: string; connectionStatus?: string }) => void;
  onConnectionTest: (itemId: string) => void;
  calendarProviders: Array<{ id: string; name: string }>;
}

export default function CalendarConnectionModal({
  isOpen,
  onClose,
  title,
  selectedItem,
  onItemChange,
  onConnectionTest,
  calendarProviders,
}: CalendarConnectionModalProps) {
  if (!selectedItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Calendar Provider</Label>
              <Select
                value={selectedItem.provider || ""}
                onValueChange={(value) => {
                  onItemChange({
                    ...selectedItem,
                    provider: value,
                  });
                }}
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
                onClick={() => onConnectionTest(selectedItem.id)}
                disabled={!selectedItem.provider || selectedItem.connectionStatus === "connecting"}
              >
                {selectedItem.connectionStatus === "connecting" ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Connect Calendar
              </Button>
              {selectedItem.connectionStatus === "connected" && (
                <Button variant="outline" onClick={() => onConnectionTest(selectedItem.id)}>
                  <TestTube className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>Connect Calendar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
