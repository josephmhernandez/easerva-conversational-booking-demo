"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Note } from "@/components/ui/note";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  MapPin,
  Package,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface CalendarAssignment {
  entityType: "location" | "resource" | "employee";
  entityId: string;
  calendarId: string;
  isPending: boolean;
  busyCalendars?: string[]; // Array of busy calendar IDs
}

interface CalendarManagementAccordionProps {
  locationCalendars: Array<{
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
  }>;
  resourceCalendars: Array<{
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
  }>;
  employeeCalendars: Array<{
    id: string;
    fullName: string;
    email: string;
    roles: string[];
    locationIds: string[];
    takesBookings: boolean;
    avatar?: string;
    assignmentType?: string;
    calendar?: Record<string, unknown>;
    comboId?: string;
    isNew?: boolean;
    allEmployeeIds?: string[];
  }>;

  calendarAssignments: CalendarAssignment[];
  bookingStrategy: string;

  onCalendarAssignment: (assignment: CalendarAssignment) => void;
  onCalendarAssignmentUpdate?: (
    assignmentType: "location" | "employee" | "resource",
    assignmentId: string,
    assignmentName: string,
    defaultCalendarId: string,
    busyCalendarIds: string[]
  ) => void;
}

export default function CalendarManagementAccordion({
  locationCalendars,
  resourceCalendars,
  employeeCalendars,
  calendarAssignments,
  bookingStrategy,
  onCalendarAssignment,
  onCalendarAssignmentUpdate,
}: CalendarManagementAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("step1");
  const [connectedCalendars, setConnectedCalendars] = useState<
    Array<{
      calendar_id: string;
      profile_name: string;
      calendar_name: string;
      provider_name: string;
    }>
  >([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    locations: true,
    employees: true,
    resources: true,
  });

  // Bulk edit state
  const [bulkEditMode, setBulkEditMode] = useState({
    locations: false,
    employees: false,
    resources: false,
  });
  const [bulkSettings, setBulkSettings] = useState({
    defaultBookingCalendar: "",
    busyCalendars: [] as string[],
  });

  // Local state for tracking busy calendars per entity
  const [entityBusyCalendars, setEntityBusyCalendars] = useState<Record<string, string[]>>({});
  const [busyCalendarsInitialized, setBusyCalendarsInitialized] = useState(false);

  // Initialize entityBusyCalendars from calendarAssignments when they change
  useEffect(() => {
    const initialBusyCalendars: Record<string, string[]> = {};

    calendarAssignments.forEach((assignment) => {
      const entityKey = `${assignment.entityType}-${assignment.entityId}`;
      // Use the busy calendars from the assignment
      initialBusyCalendars[entityKey] = assignment.busyCalendars || [];
    });

    setEntityBusyCalendars(initialBusyCalendars);
    setBusyCalendarsInitialized(true);
  }, [calendarAssignments]);

  // Default all employees to "configure_later" if they don't have an assignment
  useEffect(() => {
    if (employeeCalendars.length === 0 || !onCalendarAssignment) {
      return;
    }

    employeeCalendars.forEach((employee) => {
      // Check if this employee (or any of their consolidated IDs) has an assignment
      const employeeIds = employee.allEmployeeIds || [employee.id];
      const hasAssignment = employeeIds.some((empId) =>
        calendarAssignments.some(
          (assignment) => assignment.entityType === "employee" && assignment.entityId === empId
        )
      );

      // If no assignment exists, default to "configure_later"
      if (!hasAssignment) {
        employeeIds.forEach((empId) => {
          onCalendarAssignment({
            entityType: "employee",
            entityId: empId,
            calendarId: "configure_later",
            isPending: true,
          });
        });
      }
    });
  }, [employeeCalendars, calendarAssignments, onCalendarAssignment]);

  // Load connected calendars when component mounts
  useEffect(() => {
    const loadCalendars = async () => {
      setLoadingCalendars(true);
      try {
        const response = await fetch("/api/cronofy/calendars");
        if (response.ok) {
          const { calendars } = await response.json();
          setConnectedCalendars(calendars || []);
        }
      } catch (error) {
        console.error("Error loading calendars:", error);
      } finally {
        setLoadingCalendars(false);
      }
    };

    if (isExpanded) {
      loadCalendars();
    }
  }, [isExpanded]);

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Toggle bulk edit mode
  const toggleBulkEdit = (section: keyof typeof bulkEditMode) => {
    setBulkEditMode((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
    // Reset bulk settings when entering bulk edit mode
    if (!bulkEditMode[section]) {
      setBulkSettings({
        defaultBookingCalendar: "",
        busyCalendars: [],
      });
    }
  };

  // Apply bulk settings
  const applyBulkSettings = (section: keyof typeof bulkEditMode, entityType: string) => {
    const entities =
      section === "locations"
        ? locationCalendars
        : section === "employees"
          ? employeeCalendars
          : resourceCalendars;

    entities.forEach((entity) => {
      // Apply default booking calendar
      if (bulkSettings.defaultBookingCalendar) {
        onCalendarAssignment({
          entityType: entityType as "location" | "employee" | "resource",
          entityId: entity.id,
          calendarId: bulkSettings.defaultBookingCalendar,
          isPending: bulkSettings.defaultBookingCalendar === "configure_later",
        });
      }

      // Apply busy calendars (this would need additional API support)
      if (bulkSettings.busyCalendars.length > 0) {
        console.log(`Applying busy calendars to ${entityType}:`, bulkSettings.busyCalendars);
        // TODO: Implement busy calendar assignment logic
      }
    });

    // Exit bulk edit mode
    setBulkEditMode((prev) => ({
      ...prev,
      [section]: false,
    }));
  };

  return (
    <Card className="mb-6 py-4">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Management
          </CardTitle>
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="step1">Step 1: View Connected Calendars</TabsTrigger>
              <TabsTrigger value="step2">Step 2: Assign Calendars</TabsTrigger>
            </TabsList>

            {/* Step 1: Connected Calendars */}
            <TabsContent value="step1" className="space-y-6">
              <Note
                heading="Connected Calendars"
                subheading="View and manage your connected calendar accounts. Use the connection tool above to add new accounts."
                icon={Calendar}
                variant="blue"
              />

              {/* Connected Calendars List */}
              <div className="space-y-4">
                <h4 className="font-medium">Your Connected Calendars</h4>
                {loadingCalendars ? (
                  <div className="text-center py-4 text-gray-500">Loading calendars...</div>
                ) : connectedCalendars.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No calendars connected yet</p>
                    <p className="text-sm">
                      Use the connection tool above to connect your calendar accounts
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectedCalendars.map((calendar) => (
                      <div
                        key={calendar.calendar_id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="text-xs text-gray-500">{calendar.provider_name}</div>
                            <div className="font-medium">
                              {calendar.calendar_name || "Unnamed calendar"}
                            </div>
                            <div className="text-xs text-gray-500">{calendar.profile_name}</div>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Step 2: Assign Calendars */}
            <TabsContent value="step2" className="space-y-6">
              <Note
                heading="Assign Calendars to your Locations, Resources, and Employees"
                subheading={`Create logical groups for your connected calendars`}
                icon={Settings}
                variant="amber"
              />

              {/* Entity Calendar Assignments */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {bookingStrategy === "employee"
                      ? "Employee"
                      : bookingStrategy === "location"
                        ? "Location"
                        : bookingStrategy === "resource"
                          ? "Resource"
                          : "Entity"}{" "}
                    Calendar Assignments
                  </h4>
                  <p className="text-sm text-gray-600">
                    Strategy:{" "}
                    {bookingStrategy === "employee"
                      ? "Employee-based"
                      : bookingStrategy === "location"
                        ? "Location-based"
                        : bookingStrategy === "resource"
                          ? "Resource-based"
                          : "Hybrid"}
                  </p>
                </div>

                <div className="space-y-6">
                  {connectedCalendars.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No calendars available</p>
                      <p className="text-sm">Connect calendar accounts in Step 1 first</p>
                    </div>
                  ) : (
                    <>
                      {/* Location Calendar Assignments - Always shown */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => toggleSection("locations")}
                          >
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <h5 className="font-medium text-lg">Location Calendar Assignments</h5>
                            {expandedSections.locations ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleBulkEdit("locations")}
                              className="flex items-center gap-1"
                            >
                              {bulkEditMode.locations ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Edit3 className="h-3 w-3" />
                              )}
                              {bulkEditMode.locations ? "Exit Bulk Edit" : "Bulk Edit"}
                            </Button>
                          </div>
                        </div>

                        {expandedSections.locations && (
                          <div className="space-y-4">
                            {/* Bulk Edit Controls */}
                            {bulkEditMode.locations && (
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h6 className="font-medium text-blue-900 mb-3">
                                  Bulk Edit Settings
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Default Booking Calendar
                                    </label>
                                    <select
                                      value={bulkSettings.defaultBookingCalendar}
                                      onChange={(e) =>
                                        setBulkSettings((prev) => ({
                                          ...prev,
                                          defaultBookingCalendar: e.target.value,
                                        }))
                                      }
                                      className="w-full text-sm border rounded px-3 py-2"
                                    >
                                      <option value="">Select booking calendar...</option>
                                      {connectedCalendars.map((cal) => (
                                        <option key={cal.calendar_id} value={cal.calendar_id}>
                                          {cal.calendar_name} ({cal.profile_name})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Busy Calendars (Optional)
                                    </label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto  p-3">
                                      {connectedCalendars.map((cal) => (
                                        <div
                                          key={cal.calendar_id}
                                          className="flex items-center space-x-2"
                                        >
                                          <Checkbox
                                            id={`bulk-busy-${cal.calendar_id}`}
                                            checked={bulkSettings.busyCalendars.includes(
                                              cal.calendar_id
                                            )}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                setBulkSettings((prev) => ({
                                                  ...prev,
                                                  busyCalendars: [
                                                    ...prev.busyCalendars,
                                                    cal.calendar_id,
                                                  ],
                                                }));
                                              } else {
                                                setBulkSettings((prev) => ({
                                                  ...prev,
                                                  busyCalendars: prev.busyCalendars.filter(
                                                    (id) => id !== cal.calendar_id
                                                  ),
                                                }));
                                              }
                                            }}
                                          />
                                          <label
                                            htmlFor={`bulk-busy-${cal.calendar_id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                          >
                                            {cal.calendar_name} ({cal.profile_name})
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                  <Button
                                    size="sm"
                                    onClick={() => applyBulkSettings("locations", "location")}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    Apply to All Locations
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleBulkEdit("locations")}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            <div className="space-y-4">
                              {locationCalendars.map((location) => {
                                const assignment = calendarAssignments.find(
                                  (a) => a.entityType === "location" && a.entityId === location.id
                                );
                                return (
                                  <div key={location.id} className="p-4 -lg space-y-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        <MapPin className="h-4 w-4 text-gray-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{location.name}</p>
                                        <p className="text-sm text-gray-600">{location.address}</p>
                                        {/* <p className="text-xs text-gray-500">
                                          {location.serviceCount} services, {location.resourceCount}{" "}
                                          resources
                                        </p> */}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Default Booking Calendar
                                        </label>
                                        <select
                                          value={assignment?.calendarId || ""}
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              onCalendarAssignment({
                                                entityType: "location",
                                                entityId: location.id,
                                                calendarId: e.target.value,
                                                isPending: false,
                                              });
                                            }
                                          }}
                                          className="w-full text-sm border rounded px-3 py-2"
                                        >
                                          <option value="">Select booking calendar...</option>
                                          {connectedCalendars.map((cal) => (
                                            <option key={cal.calendar_id} value={cal.calendar_id}>
                                              {cal.calendar_name} ({cal.profile_name})
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Busy Calendars (Optional)
                                        </label>
                                        <div className="space-y-2 max-h-40 overflow-y-auto  p-3">
                                          {connectedCalendars.map((cal) => (
                                            <div
                                              key={cal.calendar_id}
                                              className="flex items-center space-x-2"
                                            >
                                              <Checkbox
                                                id={`location-${location.id}-busy-${cal.calendar_id}`}
                                                checked={
                                                  busyCalendarsInitialized
                                                    ? entityBusyCalendars[
                                                        `location-${location.id}`
                                                      ]?.includes(cal.calendar_id) || false
                                                    : false
                                                }
                                                disabled={(() => {
                                                  const currentAssignment =
                                                    calendarAssignments.find(
                                                      (a) =>
                                                        a.entityType === "location" &&
                                                        a.entityId === location.id
                                                    );
                                                  return (
                                                    currentAssignment?.calendarId ===
                                                    cal.calendar_id
                                                  );
                                                })()}
                                                onCheckedChange={(checked) => {
                                                  // Handle individual busy calendar selection
                                                  const entityKey = `location-${location.id}`;
                                                  const currentBusyCalendars =
                                                    entityBusyCalendars[entityKey] || [];

                                                  let newBusyCalendars: string[];
                                                  if (checked) {
                                                    newBusyCalendars = [
                                                      ...currentBusyCalendars,
                                                      cal.calendar_id,
                                                    ];
                                                  } else {
                                                    newBusyCalendars = currentBusyCalendars.filter(
                                                      (id) => id !== cal.calendar_id
                                                    );
                                                  }

                                                  // Update local state
                                                  setEntityBusyCalendars((prev) => ({
                                                    ...prev,
                                                    [entityKey]: newBusyCalendars,
                                                  }));

                                                  // Call the update callback if available
                                                  if (onCalendarAssignmentUpdate) {
                                                    const currentAssignment =
                                                      calendarAssignments.find(
                                                        (a) =>
                                                          a.entityType === "location" &&
                                                          a.entityId === location.id
                                                      );
                                                    const defaultCalendarId =
                                                      currentAssignment?.calendarId || "";

                                                    onCalendarAssignmentUpdate(
                                                      "location",
                                                      location.id,
                                                      location.name,
                                                      defaultCalendarId,
                                                      newBusyCalendars
                                                    );
                                                  }
                                                }}
                                              />
                                              <label
                                                htmlFor={`location-${location.id}-busy-${cal.calendar_id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                              >
                                                {cal.calendar_name} ({cal.profile_name})
                                              </label>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Employee Calendar Assignments - Show when employees exist */}
                      {employeeCalendars.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => toggleSection("employees")}
                            >
                              <Users className="h-5 w-5 text-green-600" />
                              <h5 className="font-medium text-lg">Employee Calendar Assignments</h5>
                              {expandedSections.employees ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleBulkEdit("employees")}
                                className="flex items-center gap-1"
                              >
                                {bulkEditMode.employees ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Edit3 className="h-3 w-3" />
                                )}
                                {bulkEditMode.employees ? "Exit Bulk Edit" : "Bulk Edit"}
                              </Button>
                            </div>
                          </div>

                          {expandedSections.employees && (
                            <div className="space-y-4">
                              {/* Bulk Edit Controls */}
                              {bulkEditMode.employees && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                  <h6 className="font-medium text-green-900 mb-3">
                                    Bulk Edit Settings
                                  </h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Default Booking Calendar
                                      </label>
                                      <select
                                        value={bulkSettings.defaultBookingCalendar}
                                        onChange={(e) =>
                                          setBulkSettings((prev) => ({
                                            ...prev,
                                            defaultBookingCalendar: e.target.value,
                                          }))
                                        }
                                        className="w-full text-sm border rounded px-3 py-2"
                                      >
                                        <option value="">Select booking calendar...</option>
                                        <option value="configure_later" className="text-orange-600">
                                          Employees will configure later
                                        </option>
                                        {connectedCalendars.map((cal) => (
                                          <option key={cal.calendar_id} value={cal.calendar_id}>
                                            {cal.calendar_name} ({cal.profile_name})
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Busy Calendars (Optional)
                                      </label>
                                      <div className="space-y-2 max-h-40 overflow-y-auto  p-3">
                                        {connectedCalendars.map((cal) => (
                                          <div
                                            key={cal.calendar_id}
                                            className="flex items-center space-x-2"
                                          >
                                            <Checkbox
                                              id={`bulk-employee-busy-${cal.calendar_id}`}
                                              checked={bulkSettings.busyCalendars.includes(
                                                cal.calendar_id
                                              )}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  setBulkSettings((prev) => ({
                                                    ...prev,
                                                    busyCalendars: [
                                                      ...prev.busyCalendars,
                                                      cal.calendar_id,
                                                    ],
                                                  }));
                                                } else {
                                                  setBulkSettings((prev) => ({
                                                    ...prev,
                                                    busyCalendars: prev.busyCalendars.filter(
                                                      (id) => id !== cal.calendar_id
                                                    ),
                                                  }));
                                                }
                                              }}
                                            />
                                            <label
                                              htmlFor={`bulk-employee-busy-${cal.calendar_id}`}
                                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                              {cal.calendar_name} ({cal.profile_name})
                                            </label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-4">
                                    <Button
                                      size="sm"
                                      onClick={() => applyBulkSettings("employees", "employee")}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Apply to All Employees
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toggleBulkEdit("employees")}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-4">
                                {employeeCalendars.map((employee) => {
                                  // For consolidated employees, check if any of the employee IDs have an assignment
                                  const assignment = calendarAssignments.find(
                                    (a) =>
                                      a.entityType === "employee" &&
                                      (a.entityId === employee.id ||
                                        (employee.allEmployeeIds &&
                                          employee.allEmployeeIds.includes(a.entityId)))
                                  );
                                  return (
                                    <div key={employee.id} className="p-4 -lg space-y-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium text-gray-600">
                                            {employee.fullName
                                              .split(" ")
                                              .map((n) => n[0])
                                              .join("")}
                                          </span>
                                        </div>
                                        <div className="flex-1">
                                          <p className="font-medium">{employee.fullName}</p>
                                          <p className="text-sm text-gray-600">{employee.email}</p>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {employee.roles.map((role, index) => (
                                              <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                              >
                                                {role}
                                              </span>
                                            ))}
                                          </div>
                                          {employee.locationIds.length > 1 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              {employee.locationIds.length} locations
                                            </p>
                                          )}
                                        </div>
                                        {assignment?.calendarId === "configure_later" && (
                                          <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                            <span className="text-xs text-orange-600 font-medium">
                                              Will configure later
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default Booking Calendar
                                          </label>
                                          <select
                                            value={assignment?.calendarId || ""}
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                // For consolidated employees, create assignments for all employee IDs
                                                const employeeIds = employee.allEmployeeIds || [
                                                  employee.id,
                                                ];
                                                employeeIds.forEach((empId) => {
                                                  onCalendarAssignment({
                                                    entityType: "employee",
                                                    entityId: empId,
                                                    calendarId: e.target.value,
                                                    isPending: e.target.value === "configure_later",
                                                  });
                                                });
                                              }
                                            }}
                                            className="w-full text-sm border rounded px-3 py-2"
                                          >
                                            <option value="">Select booking calendar...</option>
                                            <option
                                              value="configure_later"
                                              className="text-orange-600"
                                            >
                                              Employee will configure later
                                            </option>
                                            {connectedCalendars.map((cal) => (
                                              <option key={cal.calendar_id} value={cal.calendar_id}>
                                                {cal.calendar_name} ({cal.profile_name})
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            More Busy Calendars (Optional)
                                          </label>
                                          <div className="space-y-2 max-h-40 overflow-y-auto  p-3">
                                            {connectedCalendars.map((cal) => (
                                              <div
                                                key={cal.calendar_id}
                                                className="flex items-center space-x-2"
                                              >
                                                <Checkbox
                                                  id={`employee-${employee.id}-busy-${cal.calendar_id}`}
                                                  checked={
                                                    busyCalendarsInitialized
                                                      ? entityBusyCalendars[
                                                          `employee-${employee.id}`
                                                        ]?.includes(cal.calendar_id) || false
                                                      : false
                                                  }
                                                  disabled={(() => {
                                                    const currentAssignment =
                                                      calendarAssignments.find(
                                                        (a) =>
                                                          a.entityType === "employee" &&
                                                          a.entityId === employee.id
                                                      );
                                                    return (
                                                      currentAssignment?.calendarId ===
                                                      cal.calendar_id
                                                    );
                                                  })()}
                                                  onCheckedChange={(checked) => {
                                                    // Handle individual busy calendar selection
                                                    const entityKey = `employee-${employee.id}`;
                                                    const currentBusyCalendars =
                                                      entityBusyCalendars[entityKey] || [];

                                                    let newBusyCalendars: string[];
                                                    if (checked) {
                                                      newBusyCalendars = [
                                                        ...currentBusyCalendars,
                                                        cal.calendar_id,
                                                      ];
                                                    } else {
                                                      newBusyCalendars =
                                                        currentBusyCalendars.filter(
                                                          (id) => id !== cal.calendar_id
                                                        );
                                                    }

                                                    // Update local state
                                                    setEntityBusyCalendars((prev) => ({
                                                      ...prev,
                                                      [entityKey]: newBusyCalendars,
                                                    }));

                                                    // Call the update callback if available
                                                    if (onCalendarAssignmentUpdate) {
                                                      const currentAssignment =
                                                        calendarAssignments.find(
                                                          (a) =>
                                                            a.entityType === "employee" &&
                                                            a.entityId === employee.id
                                                        );
                                                      const defaultCalendarId =
                                                        currentAssignment?.calendarId || "";

                                                      onCalendarAssignmentUpdate(
                                                        "employee",
                                                        employee.id,
                                                        employee.fullName,
                                                        defaultCalendarId,
                                                        newBusyCalendars
                                                      );
                                                    }
                                                  }}
                                                />
                                                <label
                                                  htmlFor={`employee-${employee.id}-busy-${cal.calendar_id}`}
                                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                  {cal.calendar_name} ({cal.profile_name})
                                                </label>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Resource Calendar Assignments - Show for resource and hybrid strategies */}
                      {(bookingStrategy === "resource" || resourceCalendars.length > 0) && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => toggleSection("resources")}
                            >
                              <Package className="h-5 w-5 text-purple-600" />
                              <h5 className="font-medium text-lg">Resource Calendar Assignments</h5>
                              {expandedSections.resources ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleBulkEdit("resources")}
                                className="flex items-center gap-1"
                              >
                                {bulkEditMode.resources ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Edit3 className="h-3 w-3" />
                                )}
                                {bulkEditMode.resources ? "Exit Bulk Edit" : "Bulk Edit"}
                              </Button>
                            </div>
                          </div>

                          {expandedSections.resources && (
                            <div className="space-y-4">
                              {/* Bulk Edit Controls */}
                              {bulkEditMode.resources && (
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                  <h6 className="font-medium text-purple-900 mb-3">
                                    Bulk Edit Settings
                                  </h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Default Booking Calendar
                                      </label>
                                      <select
                                        value={bulkSettings.defaultBookingCalendar}
                                        onChange={(e) =>
                                          setBulkSettings((prev) => ({
                                            ...prev,
                                            defaultBookingCalendar: e.target.value,
                                          }))
                                        }
                                        className="w-full text-sm border rounded px-3 py-2"
                                      >
                                        <option value="">Select booking calendar...</option>
                                        {connectedCalendars.map((cal) => (
                                          <option key={cal.calendar_id} value={cal.calendar_id}>
                                            {cal.calendar_name} ({cal.profile_name})
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Busy Calendars (Optional)
                                      </label>
                                      <div className="space-y-2 max-h-40 overflow-y-auto  p-3">
                                        {connectedCalendars.map((cal) => (
                                          <div
                                            key={cal.calendar_id}
                                            className="flex items-center space-x-2"
                                          >
                                            <Checkbox
                                              id={`bulk-resource-busy-${cal.calendar_id}`}
                                              checked={bulkSettings.busyCalendars.includes(
                                                cal.calendar_id
                                              )}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  setBulkSettings((prev) => ({
                                                    ...prev,
                                                    busyCalendars: [
                                                      ...prev.busyCalendars,
                                                      cal.calendar_id,
                                                    ],
                                                  }));
                                                } else {
                                                  setBulkSettings((prev) => ({
                                                    ...prev,
                                                    busyCalendars: prev.busyCalendars.filter(
                                                      (id) => id !== cal.calendar_id
                                                    ),
                                                  }));
                                                }
                                              }}
                                            />
                                            <label
                                              htmlFor={`bulk-resource-busy-${cal.calendar_id}`}
                                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                              {cal.calendar_name} ({cal.profile_name})
                                            </label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-4">
                                    <Button
                                      size="sm"
                                      onClick={() => applyBulkSettings("resources", "resource")}
                                      className="bg-purple-600 hover:bg-purple-700"
                                    >
                                      Apply to All Resources
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toggleBulkEdit("resources")}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-4">
                                {resourceCalendars.map((resource) => {
                                  const assignment = calendarAssignments.find(
                                    (a) => a.entityType === "resource" && a.entityId === resource.id
                                  );
                                  return (
                                    <div key={resource.id} className="p-4 -lg space-y-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                          <Package className="h-4 w-4 text-gray-600" />
                                        </div>
                                        <div>
                                          <p className="font-medium">{resource.name}</p>
                                          <p className="text-sm text-gray-600">{resource.type}</p>
                                          {resource.description && (
                                            <p className="text-xs text-gray-500">
                                              {resource.description}
                                            </p>
                                          )}
                                          {resource.locationId && (
                                            <p className="text-xs text-blue-600">
                                              Location: {resource.locationId}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default Booking Calendar
                                          </label>
                                          <select
                                            value={assignment?.calendarId || ""}
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                onCalendarAssignment({
                                                  entityType: "resource",
                                                  entityId: resource.id,
                                                  calendarId: e.target.value,
                                                  isPending: false,
                                                });
                                              }
                                            }}
                                            className="w-full text-sm border rounded px-3 py-2"
                                          >
                                            <option value="">Select booking calendar...</option>
                                            {connectedCalendars.map((cal) => (
                                              <option key={cal.calendar_id} value={cal.calendar_id}>
                                                {cal.calendar_name} ({cal.profile_name})
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Busy Calendars (Optional)
                                          </label>
                                          <p className="text-xs text-gray-500 mb-2">
                                            Calendars already selected as default booking calendar
                                            are disabled.
                                          </p>
                                          <div className="space-y-2 max-h-40 overflow-y-auto  p-3">
                                            {connectedCalendars.map((cal) => (
                                              <div
                                                key={cal.calendar_id}
                                                className="flex items-center space-x-2"
                                              >
                                                <Checkbox
                                                  id={`resource-${resource.id}-busy-${cal.calendar_id}`}
                                                  checked={
                                                    busyCalendarsInitialized
                                                      ? entityBusyCalendars[
                                                          `resource-${resource.id}`
                                                        ]?.includes(cal.calendar_id) || false
                                                      : false
                                                  }
                                                  disabled={(() => {
                                                    const currentAssignment =
                                                      calendarAssignments.find(
                                                        (a) =>
                                                          a.entityType === "resource" &&
                                                          a.entityId === resource.id
                                                      );
                                                    return (
                                                      currentAssignment?.calendarId ===
                                                      cal.calendar_id
                                                    );
                                                  })()}
                                                  onCheckedChange={(checked) => {
                                                    // Handle individual busy calendar selection
                                                    const entityKey = `resource-${resource.id}`;
                                                    const currentBusyCalendars =
                                                      entityBusyCalendars[entityKey] || [];

                                                    let newBusyCalendars: string[];
                                                    if (checked) {
                                                      newBusyCalendars = [
                                                        ...currentBusyCalendars,
                                                        cal.calendar_id,
                                                      ];
                                                    } else {
                                                      newBusyCalendars =
                                                        currentBusyCalendars.filter(
                                                          (id) => id !== cal.calendar_id
                                                        );
                                                    }

                                                    // Update local state
                                                    setEntityBusyCalendars((prev) => ({
                                                      ...prev,
                                                      [entityKey]: newBusyCalendars,
                                                    }));

                                                    // Call the update callback if available
                                                    if (onCalendarAssignmentUpdate) {
                                                      const currentAssignment =
                                                        calendarAssignments.find(
                                                          (a) =>
                                                            a.entityType === "resource" &&
                                                            a.entityId === resource.id
                                                        );
                                                      const defaultCalendarId =
                                                        currentAssignment?.calendarId || "";

                                                      onCalendarAssignmentUpdate(
                                                        "resource",
                                                        resource.id,
                                                        resource.name,
                                                        defaultCalendarId,
                                                        newBusyCalendars
                                                      );
                                                    }
                                                  }}
                                                />
                                                <label
                                                  htmlFor={`resource-${resource.id}-busy-${cal.calendar_id}`}
                                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                  {cal.calendar_name} ({cal.profile_name})
                                                </label>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
