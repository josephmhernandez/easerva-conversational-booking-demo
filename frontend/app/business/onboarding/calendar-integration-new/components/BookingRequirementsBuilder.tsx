"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Note } from "@/components/ui/note";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";

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

interface LocationCalendar {
  id: string;
  name: string;
  address: string;
  serviceCount: number;
  resourceCount: number;
  calendar: {
    provider: string;
    connectionStatus: string;
    calendarId: string;
    calendarName: string;
  };
  settings: {
    bufferTime: number;
    businessHoursOverride: boolean;
  };
}

interface RequirementItem {
  id?: string;
  displayName?: string;
  logicOperator?: string;
  type?: string;
  index?: number;
}

interface CalendarAssignment {
  entityType: "location" | "resource" | "employee";
  entityId: string;
  calendarId: string;
  isPending?: boolean;
}

interface BookingRequirementsBuilderProps {
  employees: Employee[];
  resources: CalendarResource[];
  locationCalendars: LocationCalendar[];
  requirements: RequirementItem[];
  calendarAssignments: CalendarAssignment[];
  // Full calendar management data to enrich requirement items with calendar metadata
  calendarManagementData?: {
    cronofyCalendars: Array<{
      profile_id: string;
      calendar_id: string;
      profile_name: string;
      calendar_name: string;
      provider_name: string;
      calendar_deleted: boolean;
      calendar_primary: boolean;
      is_busy_calendar: boolean;
      permission_level: string;
      calendar_readonly: boolean;
      is_primary_booking: boolean;
      is_booking_calendar: boolean;
      calendar_attachments_available: boolean;
      calendar_integrated_conferencing_available: boolean;
    }>;
    calendarAssignments: Array<{
      id: string;
      assignmentId: string;
      busyCalendars: Array<{ calendarId: string; entityType: string }>;
      assignmentName: string;
      assignmentType: string; // "employee" | "resource" | "location"
      defaultBookingCalendar: { calendarId: string; entityType: string };
    }>;
    cronofyElementToken: string;
  };
  onRequirementsChange: (requirements: RequirementItem[]) => void;
}

export default function BookingRequirementsBuilder({
  employees,
  resources,
  locationCalendars,
  requirements,
  calendarAssignments,
  calendarManagementData,
  onRequirementsChange,
}: BookingRequirementsBuilderProps) {
  const [selectedItems, setSelectedItems] = useState<RequirementItem[]>(requirements || []);
  const [logicOperators, setLogicOperators] = useState<string[]>([]);

  // Debug logging
  console.log("🔧 BookingRequirementsBuilder received props:");
  console.log("  - employees:", employees.length, "employees");
  console.log("  - resources:", resources.length, "resources");
  console.log("  - locationCalendars:", locationCalendars.length, "locations");
  console.log("  - calendarAssignments:", calendarAssignments.length, "assignments");
  console.log("  - calendarAssignments data:", calendarAssignments);

  // Enhanced debugging for employee data
  console.log("🔍 DEBUGGING EMPLOYEE DATA:");
  console.log("  - employees array:", employees);
  console.log(
    "  - employees IDs:",
    employees.map((e) => ({
      id: e.id,
      name: e.fullName,
      hasName: !!e.fullName,
      fullEmployee: e,
    }))
  );
  console.log("  - calendarAssignments (prop):", calendarAssignments);
  console.log("  - calendarManagementData:", calendarManagementData);
  console.log(
    "  - calendarManagementData.calendarAssignments:",
    calendarManagementData?.calendarAssignments
  );

  // Log employee matching
  employees.forEach((emp) => {
    const assignment = calendarAssignments.find(
      (a) => a.entityType === "employee" && a.entityId === emp.id
    );
    console.log(`  - Employee ${emp.fullName} (${emp.id}):`, {
      hasAssignment: !!assignment,
      assignment: assignment,
      isPending: assignment?.isPending,
    });
  });

  // Log calendar management assignments
  if (calendarManagementData?.calendarAssignments) {
    console.log("  - Calendar Management Assignments (employees only):");
    calendarManagementData.calendarAssignments
      .filter((a) => a.assignmentType === "employee")
      .forEach((a) => {
        console.log(`    - ${a.assignmentName} (ID: ${a.assignmentId})`, a);
      });
  }

  // Helper function to get employee calendar name from calendar management data
  const getEmployeeCalendarName = (employeeId: string, fallbackName: string) => {
    console.log(`🔍 Getting calendar name for employee ID: ${employeeId}`);
    console.log(`  - fallbackName provided:`, fallbackName);

    // Try to find in calendar management data
    const calendarAssignment = calendarManagementData?.calendarAssignments?.find(
      (a) => a.assignmentType === "employee" && a.assignmentId === employeeId
    );

    console.log(`  - Found in calendarManagementData:`, calendarAssignment);
    console.log(`  - assignmentName:`, calendarAssignment?.assignmentName);
    console.log(`  - assignmentName type:`, typeof calendarAssignment?.assignmentName);
    console.log(`  - assignmentName length:`, calendarAssignment?.assignmentName?.length);
    console.log(`  - assignmentName trimmed:`, calendarAssignment?.assignmentName?.trim());

    // Use assignmentName only if it's not empty after trimming
    const name = calendarAssignment?.assignmentName?.trim() || fallbackName;
    console.log(`  - Final name being used:`, name);
    console.log(`  - Final name type:`, typeof name);
    console.log(`  - Final name length:`, name?.length);

    return name;
  };

  // Filter entities to only show those with calendar configurations
  const getConfiguredEmployees = () => {
    const filtered = employees.filter((employee) => {
      const assignment = calendarAssignments.find(
        (a) => a.entityType === "employee" && a.entityId === employee.id
      );
      // Include if has assignment with calendar OR if calendar will be "configured later"
      const isConfigured = assignment && (assignment.calendarId || assignment.isPending);
      console.log(
        `  - Employee ${employee.fullName} (${employee.id}): assignment=${!!assignment}, configured=${isConfigured}`
      );
      return isConfigured;
    });
    console.log("🔍 Filtered employees:", filtered.length, "out of", employees.length);
    return filtered;
  };

  const getConfiguredResources = () => {
    const filtered = resources.filter((resource) => {
      const assignment = calendarAssignments.find(
        (a) => a.entityType === "resource" && a.entityId === resource.id
      );
      // Include if has assignment with calendar OR if calendar will be "configured later"
      const isConfigured = assignment && (assignment.calendarId || assignment.isPending);
      console.log(
        `  - Resource ${resource.name} (${resource.id}): assignment=${!!assignment}, configured=${isConfigured}`
      );
      return isConfigured;
    });
    console.log("🔍 Filtered resources:", filtered.length, "out of", resources.length);
    return filtered;
  };

  const getConfiguredLocations = () => {
    const filtered = locationCalendars.filter((location) => {
      const assignment = calendarAssignments.find(
        (a) => a.entityType === "location" && a.entityId === location.id
      );
      // Include if has assignment with calendar OR if calendar will be "configured later"
      const isConfigured = assignment && (assignment.calendarId || assignment.isPending);
      console.log(
        `  - Location ${location.name} (${location.id}): assignment=${!!assignment}, configured=${isConfigured}`
      );
      return isConfigured;
    });
    console.log("🔍 Filtered locations:", filtered.length, "out of", locationCalendars.length);
    return filtered;
  };

  const configuredEmployees = getConfiguredEmployees();
  const configuredResources = getConfiguredResources();
  const configuredLocations = getConfiguredLocations();

  // Initialize/sync logic operators from incoming requirements without clobbering user choice
  useEffect(() => {
    if (!requirements) return;
    const derivedOperators: string[] = [];
    requirements.forEach((item: RequirementItem, idx: number) => {
      if (idx === 0) return;
      const op = typeof item.logicOperator === "string" ? item.logicOperator : undefined;
      derivedOperators.push(op === "OR" ? "OR" : "AND");
    });
    const isDifferent =
      derivedOperators.length !== logicOperators.length ||
      derivedOperators.some((op, i) => op !== logicOperators[i]);
    if (isDifferent) {
      setLogicOperators(derivedOperators);
    }
  }, [requirements, logicOperators]); // Added logicOperators back to dependency array

  const buildEnrichedRequirement = (base: RequirementItem): RequirementItem => {
    // Only enrich when we have calendarManagementData and the base has an id and type
    if (!calendarManagementData || !base?.id || !base?.type) return base;

    const type = base.type as "employee" | "resource" | "location";

    // Find the full assignment for this entity
    const assignment = calendarManagementData.calendarAssignments.find(
      (a) => a.assignmentType === type && a.assignmentId === base.id
    );

    if (!assignment) return base;

    const defaultCalendarId = assignment.defaultBookingCalendar?.calendarId || "";
    const busyCalendarIds = (assignment.busyCalendars || []).map((b) => b.calendarId);

    // Try to resolve a logical calendar name via Cronofy calendars
    const calendarEntry = calendarManagementData.cronofyCalendars?.find(
      (c) => c.calendar_id === defaultCalendarId
    );
    const logicalName = calendarEntry?.calendar_name || "";

    // Return a compact requirement object containing only fields we need downstream
    return {
      id: base.id,
      type,
      displayName: base.displayName,
      logicOperator: base.logicOperator, // will be set by outer logic
      // calendar details grouped under calendar key
      calendar: {
        logicalName,
        calendarManagementAssignmentId: assignment.id,
        defaultCalendarId,
        busyCalendars: busyCalendarIds,
      },
    } as RequirementItem;
  };

  const addItem = (item: RequirementItem) => {
    const enriched = buildEnrichedRequirement(item);
    const newItems = [...selectedItems, enriched];
    setSelectedItems(newItems);

    // Add logic operator if we have more than one item
    if (newItems.length > 1) {
      setLogicOperators([...logicOperators, "AND"]);
    }

    // Update requirements with logic operators
    const requirementsWithLogic = newItems.map((req, index) => ({
      ...req,
      logicOperator: index > 0 ? logicOperators[index - 1] || "AND" : undefined,
      index,
    }));

    onRequirementsChange(requirementsWithLogic);
  };

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(newItems);

    // Remove corresponding logic operator
    if (logicOperators.length > 0) {
      const newOperators = logicOperators.filter((_, i) => i !== index - 1);
      setLogicOperators(newOperators);
    }

    // Update requirements with logic operators
    const requirementsWithLogic = newItems.map((req, index) => ({
      ...req,
      logicOperator: index > 0 ? logicOperators[index - 1] || "AND" : undefined,
      index,
    }));

    onRequirementsChange(requirementsWithLogic);
  };

  const updateLogicOperator = (index: number, operator: string) => {
    const newOperators = [...logicOperators];
    newOperators[index] = operator;
    setLogicOperators(newOperators);

    // Update requirements with new logic operators
    const requirementsWithLogic = selectedItems.map((req, idx) => ({
      ...req,
      logicOperator: idx > 0 ? newOperators[idx - 1] || "AND" : undefined,
      index: idx,
    }));

    onRequirementsChange(requirementsWithLogic);
  };

  const generateRequirementString = () => {
    if (selectedItems.length === 0) return "No requirements set";

    let result = "";
    let currentGroup = "";
    let inOrGroup = false;

    selectedItems.forEach((item, index) => {
      if (index === 0) {
        currentGroup = item.displayName as string;
      } else {
        const operator = logicOperators[index - 1] || "AND";

        if (operator === "OR") {
          if (!inOrGroup) {
            currentGroup = `(${currentGroup}`;
            inOrGroup = true;
          }
          currentGroup += ` OR ${item.displayName}`;
        } else {
          // AND
          if (inOrGroup) {
            currentGroup += `)`;
            inOrGroup = false;
          }
          result += (result ? " AND " : "") + currentGroup;
          currentGroup = item.displayName as string;
        }
      }
    });

    if (inOrGroup) {
      currentGroup += `)`;
    }
    result += (result ? " AND " : "") + currentGroup;

    return result;
  };

  return (
    <div className="space-y-6 px-4">
      {/* Current Requirements Display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Current Requirements:</h4>
        <p className="text-sm text-gray-700">{generateRequirementString()}</p>
      </div>

      {/* Add Items Section */}
      <div>
        <h4 className="font-medium mb-3">Add Requirements:</h4>
        {(() => {
          const hasConfiguredEmployees = configuredEmployees.length > 0;
          const hasConfiguredResources = configuredResources.length > 0;
          const hasConfiguredLocations = configuredLocations.length > 0;
          const hasAnyOptions =
            hasConfiguredEmployees || hasConfiguredResources || hasConfiguredLocations;

          if (!hasAnyOptions) {
            return (
              <div className="text-center py-8">
                <Note
                  heading="No Configured Entities Available"
                  subheading="To add booking requirements, you need to first configure calendar assignments for employees, resources, or locations in the Calendar Management section above. Only entities with assigned calendars (or marked as 'configured later') will appear here."
                  icon={Info}
                  variant="amber"
                />
              </div>
            );
          }

          return (
            <div className="flex flex-col md:flex-row gap-4 justify-center items-start">
              {/* Employees - Only show configured employees */}
              {hasConfiguredEmployees && (
                <div className="flex-1 max-w-1/3">
                  <div className="mb-2">
                    <Label className="text-sm font-medium text-gray-700 block">Employees</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Only employees with calendar configurations are shown
                    </p>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {configuredEmployees.map((employee) => {
                      const assignment = calendarAssignments.find(
                        (a) => a.entityType === "employee" && a.entityId === employee.id
                      );
                      const isPending = assignment?.isPending;

                      console.log(`🔍 Rendering employee: ${employee.fullName} (${employee.id})`);
                      console.log(`  - employee object:`, employee);
                      console.log(`  - employee.fullName:`, employee.fullName);
                      console.log(`  - has fullName:`, !!employee.fullName);
                      console.log(`  - employee.fullName type:`, typeof employee.fullName);
                      console.log(`  - employee.fullName length:`, employee.fullName?.length);
                      console.log(`  - assignment:`, assignment);
                      console.log(`  - isPending:`, isPending);
                      console.log(
                        `  - calendarManagementData available:`,
                        !!calendarManagementData
                      );

                      return (
                        <div key={employee.id} className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{employee.fullName}</span>
                            <span className="text-xs text-gray-500">
                              {employee.role}
                              {isPending &&
                                ` • ${getEmployeeCalendarName(employee.id, employee.fullName)}'s Calendar (configured later)`}
                              {!isPending && assignment && ` • Calendar configured`}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              addItem({
                                ...employee,
                                type: "employee",
                                displayName: employee.fullName,
                              })
                            }
                            disabled={selectedItems.some((item) => item.id === employee.id)}
                          >
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resources - Only show configured resources */}
              {hasConfiguredResources && (
                <div className="flex-1 max-w-1/3">
                  <div className="mb-2">
                    <Label className="text-sm font-medium text-gray-700 block">Resources</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Only resources with calendar configurations are shown
                    </p>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {configuredResources.map((resource) => {
                      const assignment = calendarAssignments.find(
                        (a) => a.entityType === "resource" && a.entityId === resource.id
                      );
                      const isPending = assignment?.isPending;

                      return (
                        <div key={resource.id} className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{resource.name}</span>
                            {isPending && (
                              <span className="text-xs text-gray-500">
                                Calendar configured later
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              addItem({ ...resource, type: "resource", displayName: resource.name })
                            }
                            disabled={selectedItems.some((item) => item.id === resource.id)}
                          >
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Location Calendars - Only show configured locations */}
              {hasConfiguredLocations && (
                <div className="flex-1 max-w-1/3">
                  <div className="mb-2">
                    <Label className="text-sm font-medium text-gray-700 block">
                      Location Calendars
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Only locations with calendar configurations are shown
                    </p>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {configuredLocations.map((location) => {
                      const assignment = calendarAssignments.find(
                        (a) => a.entityType === "location" && a.entityId === location.id
                      );
                      const isPending = assignment?.isPending;

                      return (
                        <div key={location.id} className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{location.name}</span>
                            <span className="text-xs text-gray-500">
                              {location.address} {isPending && "• Calendar configured later"}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              addItem({
                                id: location.id,
                                type: "location",
                                displayName: location.name,
                              })
                            }
                            disabled={selectedItems.some((item) => item.id === location.id)}
                          >
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Selected Requirements Section - Always Show */}
      <div>
        <h4 className="font-medium mb-3">Selected Requirements:</h4>
        {/* Live preview of what will be saved, with OR precedence note */}
        {/* <div className="mb-1"> */}
        <div className="text-xs uppercase text-gray-500">Preview</div>
        <div className="text-sm text-gray-700 pb-2">{generateRequirementString()}</div>
        {/* </div> */}
        {selectedItems.length === 0 ? (
          <Note
            variant="blue"
            icon={Info}
            heading="Add Requirements"
            subheading={(() => {
              const hasEmployees = employees.length > 0;
              const hasResources = resources.length > 0;
              const hasConnectedLocations =
                locationCalendars.filter(
                  (location) => location.calendar.connectionStatus === "connected"
                ).length > 0;
              const hasAnyOptions = hasEmployees || hasResources || hasConnectedLocations;

              if (!hasAnyOptions) {
                return "No requirements are currently available to add. Connect your calendars and add employees or resources to see options.";
              }

              const availableOptions = [];
              if (hasEmployees) availableOptions.push("employees");
              if (hasResources) availableOptions.push("resources");
              if (hasConnectedLocations) availableOptions.push("locations");

              const optionsText = availableOptions.join(", ");
              return `Select an ${optionsText} from the options above to add them as booking requirements.`;
            })()}
          />
        ) : (
          <div className="space-y-2">
            {selectedItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center gap-2">
                {index > 0 && (
                  <Select
                    value={logicOperators[index - 1] || "AND"}
                    onValueChange={(value) => updateLogicOperator(index - 1, value)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg flex-1">
                  <Badge variant="outline" className="text-xs">
                    {item.type === "employee"
                      ? "Employee"
                      : item.type === "resource"
                        ? "Resource"
                        : "Location"}
                  </Badge>
                  <span className="text-sm font-medium">{item.displayName}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
