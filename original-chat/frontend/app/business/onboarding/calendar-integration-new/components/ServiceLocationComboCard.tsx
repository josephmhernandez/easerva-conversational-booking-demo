"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, MapPin, Minus, User } from "lucide-react";

interface Service {
  id: string;
  name: string;
  price: number;
  locationId: string;
  priceType?: "fixed" | "variable";
  priceMin?: number;
  priceMax?: number;
}

interface CalendarResource {
  id: string;
  name: string;
  email?: string;
  type?: string;
  description?: string;
  calendar?: Record<string, unknown>;
  comboId?: string;
  bookingLogic?: string;
  isNew?: boolean;
  locationId?: string;
  capacity?: {
    maxConcurrent: number;
    bufferTime: number;
  };
}

interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: string;
  locationId: string;
  takesBookings: boolean;
  avatar?: string;
  assignmentType?: string;
  calendar?: Record<string, unknown>;
  comboId?: string;
  isNew?: boolean;
}

interface RequirementItem {
  id?: string;
  displayName?: string;
  logicOperator?: string;
  type?: string;
}

interface ServiceLocationCombo {
  id: string;
  locationId: string;
  locationName: string;
  address: string;
  cardType: string;
  services: Service[];
  resources: CalendarResource[];
  employees?: Employee[];
  employeeId?: string;
  employeeName?: string;
  employeeAvatar?: string;
  employeeCalendar?: Record<string, unknown>;
  combinedFromServices?: Record<string, unknown>[];
  logicType?: string;
  combiningAllowed?: boolean;
  requirements?: RequirementItem[];
}

interface CalendarAssignment {
  entityType: "location" | "resource" | "employee";
  entityId: string;
  calendarId: string;
  isPending: boolean;
}

interface ServiceLocationComboCardProps {
  combo: ServiceLocationCombo;
  isExpanded: boolean;
  isSelected: boolean;
  combiningMode: boolean;
  isDisabled?: boolean;
  calendarAssignments?: CalendarAssignment[];
  onToggleExpansion: (comboId: string) => void;
  onToggleSelection: (comboId: string) => void;
  onEditRequirements: (combo: ServiceLocationCombo) => void;
  onSplitService: (comboId: string, serviceId: string) => void;
  generateRequirementString: (requirements: RequirementItem[]) => string;
}

export default function ServiceLocationComboCard({
  combo,
  isExpanded,
  isSelected,
  combiningMode,
  isDisabled = false,
  // calendarAssignments = [],
  onToggleExpansion,
  onToggleSelection,
  onEditRequirements,
  onSplitService,
  generateRequirementString,
}: ServiceLocationComboCardProps) {
  // Check calendar assignment status
  // const getCalendarAssignmentStatus = () => {
  //   if (combo.employeeId) {
  //     // Employee-based combo
  //     const assignment = calendarAssignments.find(
  //       (a) => a.entityType === "employee" && a.entityId === combo.employeeId
  //     );
  //     if (!assignment) return "unassigned";

  //     // Check if this is a placeholder assignment
  //     if (assignment.calendarId === "configure_later" || assignment.isPending) {
  //       return "pending";
  //     }

  //     return "assigned";
  //   } else {
  //     // Location-based combo (including resource-based strategy using location-style cards)
  //     const assignment = calendarAssignments.find(
  //       (a) => a.entityType === "location" && a.entityId === combo.locationId
  //     );
  //     if (!assignment) return "unassigned";

  //     // Check if this is a placeholder assignment
  //     if (assignment.calendarId === "configure_later" || assignment.isPending) {
  //       return "pending";
  //     }

  //     return "assigned";
  //   }
  // };

  return (
    <Card
      data-testid="combo-card"
      className={`relative ${isSelected ? "ring-2 ring-blue-500" : ""} ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {/* Selection Checkbox */}
      {combiningMode && (
        <div className="absolute -top-2 -left-2 z-10">
          <Checkbox
            checked={isSelected}
            disabled={isDisabled}
            onCheckedChange={() => onToggleSelection(combo.id)}
            className="bg-white border-2"
          />
        </div>
      )}

      <CardHeader className="cursor-pointer" onClick={() => onToggleExpansion(combo.id)}>
        <div className="flex items-center justify-between">
          {combo.employeeId && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">{combo.employeeName}</p>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-500" />
                    <p className="text-xs text-gray-600">{combo.locationName}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!combo.employeeId && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">{combo.locationName}</p>
                  <p className="text-xs text-gray-600">{combo.address}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                onEditRequirements(combo);
              }}
            >
              Edit Requirements
            </Button>
            <Badge
              variant={
                combo.requirements && combo.requirements.length > 0 ? "default" : "destructive"
              }
            >
              {combo.requirements && combo.requirements.length > 0
                ? "Requirements Set"
                : "Requirements Not Configured"}
            </Badge>
            {/* <Badge
              variant={
                calendarStatus === "assigned"
                  ? "default"
                  : calendarStatus === "pending"
                    ? "secondary"
                    : "destructive"
              }
            >
              {calendarStatus === "assigned"
                ? "Calendar Assigned"
                : calendarStatus === "pending"
                  ? "Calendar Pending"
                  : "Calendar Not Assigned"}
            </Badge> */}
            <Badge variant="outline">{combo.services.length} services</Badge>
            <Badge variant="outline">{combo.resources.length} resources</Badge>
            <Badge variant="outline">
              {combo.employeeCalendar ? 1 : combo.employees?.length || 0} employees
            </Badge>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Services List */}
          <div>
            <h4 className="font-medium mb-3">Services at this location</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {combo.services.map((service: Service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      {service.priceType === "variable" &&
                      service.priceMin !== undefined &&
                      service.priceMax !== undefined ? (
                        <p className="text-sm text-gray-600">
                          ${service.priceMin} - ${service.priceMax}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">${service.price}</p>
                      )}
                    </div>
                  </div>
                  {combo.services.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSplitService(combo.id, service.id)}
                      className="text-xs"
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      Split Out
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Booking Requirements Summary */}
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-sm font-medium text-gray-900">Booking Requirements:</p>
            <p className="text-sm text-gray-600">
              {combo.requirements && combo.requirements.length > 0
                ? generateRequirementString(combo.requirements)
                : "No requirements set - click 'Edit Requirements' to configure"}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
