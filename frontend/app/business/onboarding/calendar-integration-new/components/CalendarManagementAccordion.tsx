"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Used interfaces
interface CalendarAssignment {
  entityType: "location" | "resource" | "employee";
  entityId: string;
  calendarId: string;
  isPending: boolean;
}

interface CalendarManagementAccordionProps {
  // Legacy props (to be removed)
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
    role: string;
    locationId: string;
    takesBookings: boolean;
    avatar?: string;
    assignmentType?: string;
    calendar?: Record<string, unknown>;
    comboId?: string;
    isNew?: boolean;
  }>;

  // Active props
  calendarAssignments: CalendarAssignment[];
  bookingStrategy: string;

  // Event handlers
  onCalendarAssignment: (assignment: CalendarAssignment) => void;
}

export default function CalendarManagementAccordion({
  locationCalendars,
  resourceCalendars,
  employeeCalendars,
  calendarAssignments,
  bookingStrategy,
  onCalendarAssignment,
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
    locations: false,
    employees: false,
    resources: false,
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
          isPending: false,
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
    <Card className="mb-6">
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
                heading="Assign Calendars to Entities"
                subheading={`Assign your connected calendars to ${
                  bookingStrategy === "employee"
                    ? "employees"
                    : bookingStrategy === "location"
                      ? "locations"
                      : bookingStrategy === "resource"
                        ? "resources"
                        : "entities"
                } and configure booking settings.`}
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
                                    <select
                                      multiple
                                      value={bulkSettings.busyCalendars}
                                      onChange={(e) => {
                                        const selectedValues = Array.from(
                                          e.target.selectedOptions,
                                          (option) => option.value
                                        );
                                        setBulkSettings((prev) => ({
                                          ...prev,
                                          busyCalendars: selectedValues,
                                        }));
                                      }}
                                      className="w-full text-sm border rounded px-3 py-2 min-h-[40px]"
                                    >
                                      {connectedCalendars.map((cal) => (
                                        <option key={cal.calendar_id} value={cal.calendar_id}>
                                          {cal.calendar_name} ({cal.profile_name})
                                        </option>
                                      ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Hold Ctrl/Cmd to select multiple
                                    </p>
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
                                  <div
                                    key={location.id}
                                    className="p-4 border rounded-lg space-y-4"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        <MapPin className="h-4 w-4 text-gray-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{location.name}</p>
                                        <p className="text-sm text-gray-600">{location.address}</p>
                                        <p className="text-xs text-gray-500">
                                          {location.serviceCount} services, {location.resourceCount}{" "}
                                          resources
                                        </p>
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
                                        <select
                                          multiple
                                          className="w-full text-sm border rounded px-3 py-2 min-h-[40px]"
                                          onChange={(e) => {
                                            const selectedValues = Array.from(
                                              e.target.selectedOptions,
                                              (option) => option.value
                                            );
                                            // Handle multiple busy calendar selection
                                            console.log(
                                              "Selected busy calendars for location:",
                                              location.name,
                                              selectedValues
                                            );
                                          }}
                                        >
                                          {connectedCalendars.map((cal) => (
                                            <option key={cal.calendar_id} value={cal.calendar_id}>
                                              {cal.calendar_name} ({cal.profile_name})
                                            </option>
                                          ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Hold Ctrl/Cmd to select multiple
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Employee Calendar Assignments - Show for employee and hybrid strategies */}
                      {(bookingStrategy === "employee" || bookingStrategy === "hybrid") && (
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
                                      <select
                                        multiple
                                        value={bulkSettings.busyCalendars}
                                        onChange={(e) => {
                                          const selectedValues = Array.from(
                                            e.target.selectedOptions,
                                            (option) => option.value
                                          );
                                          setBulkSettings((prev) => ({
                                            ...prev,
                                            busyCalendars: selectedValues,
                                          }));
                                        }}
                                        className="w-full text-sm border rounded px-3 py-2 min-h-[40px]"
                                      >
                                        {connectedCalendars.map((cal) => (
                                          <option key={cal.calendar_id} value={cal.calendar_id}>
                                            {cal.calendar_name} ({cal.profile_name})
                                          </option>
                                        ))}
                                      </select>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Hold Ctrl/Cmd to select multiple
                                      </p>
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
                                  const assignment = calendarAssignments.find(
                                    (a) => a.entityType === "employee" && a.entityId === employee.id
                                  );
                                  return (
                                    <div
                                      key={employee.id}
                                      className="p-4 border rounded-lg space-y-4"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium text-gray-600">
                                            {employee.fullName
                                              .split(" ")
                                              .map((n) => n[0])
                                              .join("")}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="font-medium">{employee.fullName}</p>
                                          <p className="text-sm text-gray-600">{employee.email}</p>
                                          <p className="text-xs text-gray-500">{employee.role}</p>
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
                                                  entityType: "employee",
                                                  entityId: employee.id,
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
                                          <select
                                            multiple
                                            className="w-full text-sm border rounded px-3 py-2 min-h-[40px]"
                                            onChange={(e) => {
                                              const selectedValues = Array.from(
                                                e.target.selectedOptions,
                                                (option) => option.value
                                              );
                                              // Handle multiple busy calendar selection
                                              console.log(
                                                "Selected busy calendars for employee:",
                                                employee.fullName,
                                                selectedValues
                                              );
                                            }}
                                          >
                                            {connectedCalendars.map((cal) => (
                                              <option key={cal.calendar_id} value={cal.calendar_id}>
                                                {cal.calendar_name} ({cal.profile_name})
                                              </option>
                                            ))}
                                          </select>
                                          <p className="text-xs text-gray-500 mt-1">
                                            Hold Ctrl/Cmd to select multiple
                                          </p>
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
                      {(bookingStrategy === "resource" || bookingStrategy === "hybrid") && (
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
                                      <select
                                        multiple
                                        value={bulkSettings.busyCalendars}
                                        onChange={(e) => {
                                          const selectedValues = Array.from(
                                            e.target.selectedOptions,
                                            (option) => option.value
                                          );
                                          setBulkSettings((prev) => ({
                                            ...prev,
                                            busyCalendars: selectedValues,
                                          }));
                                        }}
                                        className="w-full text-sm border rounded px-3 py-2 min-h-[40px]"
                                      >
                                        {connectedCalendars.map((cal) => (
                                          <option key={cal.calendar_id} value={cal.calendar_id}>
                                            {cal.calendar_name} ({cal.profile_name})
                                          </option>
                                        ))}
                                      </select>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Hold Ctrl/Cmd to select multiple
                                      </p>
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
                                    <div
                                      key={resource.id}
                                      className="p-4 border rounded-lg space-y-4"
                                    >
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
                                          <select
                                            multiple
                                            className="w-full text-sm border rounded px-3 py-2 min-h-[40px]"
                                            onChange={(e) => {
                                              const selectedValues = Array.from(
                                                e.target.selectedOptions,
                                                (option) => option.value
                                              );
                                              // Handle multiple busy calendar selection
                                              console.log(
                                                "Selected busy calendars for resource:",
                                                resource.name,
                                                selectedValues
                                              );
                                            }}
                                          >
                                            {connectedCalendars.map((cal) => (
                                              <option key={cal.calendar_id} value={cal.calendar_id}>
                                                {cal.calendar_name} ({cal.profile_name})
                                              </option>
                                            ))}
                                          </select>
                                          <p className="text-xs text-gray-500 mt-1">
                                            Hold Ctrl/Cmd to select multiple
                                          </p>
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
