"use client";

import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";

interface Holiday {
  id: string;
  name: string;
  date: string;
  isRecurring: boolean;
}

interface HolidayModalProps {
  onClose: () => void;
  onAdd: (holiday: Omit<Holiday, "id">) => void;
  existingHolidays: Holiday[];
}

export function HolidayModal({ onClose, onAdd, existingHolidays }: HolidayModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; date?: string }>({});

  const commonHolidays = [
    { name: "New Year's Day", date: "2024-01-01", isRecurring: true },
    { name: "Martin Luther King Jr. Day", date: "2024-01-15", isRecurring: true },
    { name: "Presidents' Day", date: "2024-02-19", isRecurring: true },
    { name: "Memorial Day", date: "2024-05-27", isRecurring: true },
    { name: "Independence Day", date: "2024-07-04", isRecurring: true },
    { name: "Labor Day", date: "2024-09-02", isRecurring: true },
    { name: "Columbus Day", date: "2024-10-14", isRecurring: true },
    { name: "Veterans Day", date: "2024-11-11", isRecurring: true },
    { name: "Thanksgiving Day", date: "2024-11-28", isRecurring: true },
    { name: "Christmas Day", date: "2024-12-25", isRecurring: true },
  ];

  const availableCommonHolidays = commonHolidays.filter(
    (holiday) => !existingHolidays.some((existing) => existing.name === holiday.name)
  );

  const validateForm = () => {
    const newErrors: { name?: string; date?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Holiday name is required";
    }

    if (!date) {
      newErrors.date = "Date is required";
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!isRecurring && selectedDate < today) {
        newErrors.date = "Date cannot be in the past for one-time holidays";
      }

      // Check for duplicate dates
      const isDuplicate = existingHolidays.some((holiday) => {
        const holidayDate = new Date(holiday.date);
        return (
          holidayDate.getFullYear() === selectedDate.getFullYear() &&
          holidayDate.getMonth() === selectedDate.getMonth() &&
          holidayDate.getDate() === selectedDate.getDate()
        );
      });

      if (isDuplicate) {
        newErrors.date = "A holiday already exists on this date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onAdd({ name: name.trim(), date, isRecurring });
      handleClose();
    }
  };

  const handleClose = () => {
    setName("");
    setDate("");
    setIsRecurring(false);
    setErrors({});
    onClose();
  };

  const addCommonHoliday = (holiday: { name: string; date: string; isRecurring: boolean }) => {
    onAdd(holiday);
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Add Holiday or Closure</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Add Common Holidays */}
          {availableCommonHolidays.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <h3 className="font-medium text-gray-900">Quick Add Common Holidays</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableCommonHolidays.slice(0, 6).map((holiday) => (
                  <Button
                    key={holiday.name}
                    variant="outline"
                    size="sm"
                    onClick={() => addCommonHoliday(holiday)}
                    className="justify-start text-left h-auto p-3 border-gray-200 hover:bg-orange-50 hover:border-orange-200"
                  >
                    <div>
                      <div className="font-medium text-sm">{holiday.name}</div>
                      <div className="text-xs text-gray-500 flex items-center space-x-2">
                        <span>{new Date(holiday.date).toLocaleDateString()}</span>
                        {holiday.isRecurring && (
                          <Badge variant="outline" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
              {availableCommonHolidays.length > 6 && (
                <p className="text-sm text-gray-500 mt-2">
                  +{availableCommonHolidays.length - 6} more available
                </p>
              )}
            </div>
          )}

          {/* Custom Holiday Form */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Add Custom Holiday</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="holiday-name">Holiday Name</Label>
                <Input
                  id="holiday-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Company Retreat, Personal Day"
                  className={errors.name ? "border-red-300 focus:border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="holiday-date">Date</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={getTodayDate()}
                  className={errors.date ? "border-red-300 focus:border-red-500" : ""}
                />
                {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                />
                <Label htmlFor="recurring" className="text-sm">
                  Recurring annually
                </Label>
              </div>
              {isRecurring && (
                <p className="text-sm text-gray-600 ml-6">
                  This holiday will automatically repeat every year on the same date
                </p>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holiday
                </Button>
              </div>
            </form>
          </div>

          {/* Existing Holidays Preview */}
          {existingHolidays.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                Current Holidays ({existingHolidays.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {existingHolidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{holiday.name}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(holiday.date).toLocaleDateString()}
                      </span>
                      {holiday.isRecurring && (
                        <Badge variant="outline" className="text-xs">
                          Recurring
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
