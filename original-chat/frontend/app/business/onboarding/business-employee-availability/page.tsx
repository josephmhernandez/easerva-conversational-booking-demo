"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Building2, ChevronDown, ChevronUp, Save } from "lucide-react";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import OnboardingProgressBar from "../../../../components/onboarding/OnboardingProgressBar";
import {
  OnboardingStep,
  SERVICE_ADVANCE_NOTICE_OPTIONS,
  SERVICE_BUFFER_TIME_OPTIONS,
} from "../../../constants/businessConstants";
import {
  businessEmployeeAvailabilityPage,
  goNext,
  goPrevious,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import { getStepInfo } from "../../../utils/onboardingSteps";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";

// Business Default Settings
interface BusinessDefaults {
  bufferTime: number;
  advanceBookingNotice: string; // advance notice period (can be hours, days, weeks, or special values)
}

// Employee permissions and settings
interface EmployeePermissions {
  canEditEmployeeCards: boolean;
  canCreateEditServices: boolean;
  canConnectCalendar: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: EmployeePermissions; // All true by default
}

export default function BusinessEmployeeAvailability() {
  const router = useRouter();

  // Business default settings
  const [businessDefaults, setBusinessDefaults] = useState<BusinessDefaults>({
    bufferTime: 0,
    advanceBookingNotice: SERVICE_ADVANCE_NOTICE_OPTIONS[3].value,
  });

  // Collapsible state
  const [isBusinessDefaultsOpen, setIsBusinessDefaultsOpen] = useState(true);

  // Bulk permission toggles (for future use) - commented out until needed
  // const [bulkEditEmployeeCards, setBulkEditEmployeeCards] = useState(false);
  // const [bulkCreateEditServices, setBulkCreateEditServices] = useState(false);

  // Employee data with permissions
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRoutingPrevious, setIsRoutingPrevious] = useState(false);
  const { user, loading: authLoading } = useAuthCore();

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);
  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch business location data
        // const locationResponse = await fetch(
        //   `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_LOCATION}`
        // );
        // const locationData = await locationResponse.json();

        // Fetch team members data
        const teamResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_TEAM_MEMBERS}`
        );
        const teamData = await teamResponse.json();

        // Fetch service location data - COMMENTED OUT
        // const serviceLocationResponse = await fetch(
        //   `/api/business/onboarding/draft/${OnboardingStep.SERVICE_LOCATION}`
        // );
        // const serviceLocationData = await serviceLocationResponse.json();

        // Process location data - COMMENTED OUT
        // if (locationData.draftData && locationData.draftData["serviceTypes.physical"]) {
        //   const addresses = locationData.draftData["serviceTypes.physical"].addresses || [];
        //   const processedLocations = addresses.map(
        //     (addr: {
        //       id: string;
        //       name: string;
        //       line1: string;
        //       city: string;
        //       state: string;
        //       zipCode: string;
        //     }) => ({
        //       id: addr.id,
        //       name: addr.name,
        //       type: "physical",
        //       address: `${addr.line1}, ${addr.city}, ${addr.state} ${addr.zipCode}`,
        //       services: [],
        //     })
        //   );
        //   setLocationSettings(processedLocations);
        // }

        // Process team members data
        if (teamData.draftData) {
          const teamMembers = Object.values(teamData.draftData).flatMap((location: unknown) => {
            const typedLocation = location as {
              teamMembers?: Array<{
                id: string;
                fullName: string;
                email: string;
                role: string;
                takesBookings: boolean;
              }>;
            };
            return typedLocation.teamMembers || [];
          });

          const processedEmployees = teamMembers.map(
            (member: {
              id: string;
              fullName: string;
              email: string;
              role: string;
              takesBookings: boolean;
            }) => ({
              id: member.id,
              name: member.fullName,
              email: member.email,
              role: member.role,
              permissions: {
                canEditEmployeeCards: true,
                canCreateEditServices: true,
                canConnectCalendar: true,
              },
            })
          );

          setEmployees(processedEmployees);
        }

        // Process service location data - COMMENTED OUT
        // if (serviceLocationData.draftData) {
        //   const { services, locations, configurations } = serviceLocationData.draftData;

        //   // Update location settings with service configurations
        //   const updatedLocations = locations.map(
        //     (location: { id: string; name: string; type: string; address: string }) => {
        //       const locationConfigs = configurations.filter(
        //         (config: { locationId: string; serviceId: string }) =>
        //           config.locationId === location.id
        //       );
        //       const locationServices = locationConfigs.map((config: { serviceId: string }) => {
        //         const service = services.find(
        //           (s: {
        //             id: string;
        //             name: string;
        //             category: string;
        //             duration: number;
        //             price: number;
        //           }) => s.id === config.serviceId
        //         );
        //         return {
        //           serviceId: service.id,
        //           serviceName: service.name,
        //           category: service.category,
        //           duration: service.duration,
        //           price: service.price,
        //           useBusinessDefaults: true,
        //         };
        //       });

        //       return {
        //         id: location.id,
        //         name: location.name,
        //         type: location.type,
        //         address: location.address,
        //         services: locationServices,
        //       };
        //     }
        //   );

        //   setLocationSettings(updatedLocations);
        // }

        // Load saved business employee availability data
        const savedResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_EMPLOYEE_AVAILABILITY}`
        );
        if (savedResponse.ok) {
          const savedData = await savedResponse.json();
          if (savedData.draftData) {
            const { businessDefaults: savedBusinessDefaults, employees: savedEmployees } =
              savedData.draftData;

            if (savedBusinessDefaults) {
              setBusinessDefaults(savedBusinessDefaults);
            }
            if (savedEmployees) {
              setEmployees(savedEmployees);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-save functionality
  const handleAutoSave = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const stepData = {
        businessDefaults,
        employees,
      };

      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_EMPLOYEE_AVAILABILITY,
          stepData,
          currentStep: OnboardingStep.BUSINESS_EMPLOYEE_AVAILABILITY,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error?.error || "Failed to save draft");
        return false; // Return false on failure
      }

      setHasUnsavedChanges(false);
      return true; // Return true on success
    } catch (error) {
      console.error("Auto-save failed:", error);
      return false; // Return false on exception
    } finally {
      setIsSaving(false);
    }
  }, [businessDefaults, employees]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Update business defaults
  const updateBusinessDefaults = (updates: Partial<BusinessDefaults>) => {
    setBusinessDefaults((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  // Update employee permissions - COMMENTED OUT
  // const updateEmployeePermissions = (
  //   employeeId: string,
  //   permissions: Partial<EmployeePermissions>
  // ) => {
  //   setEmployees((prev) =>
  //     prev.map((emp) =>
  //       emp.id === employeeId
  //         ? { ...emp, permissions: { ...emp.permissions, ...permissions } }
  //         : emp
  //     )
  //   );
  //   setHasUnsavedChanges(true);
  // };

  // Bulk permission functions - COMMENTED OUT
  // const handleBulkEditEmployeeCards = (checked: boolean) => {
  //   setBulkEditEmployeeCards(checked);
  //   setEmployees((prev) =>
  //     prev.map((emp) => ({
  //       ...emp,
  //       permissions: { ...emp.permissions, canEditEmployeeCards: checked },
  //     }))
  //   );
  //   setHasUnsavedChanges(true);
  // };

  // const handleBulkCreateEditServices = (checked: boolean) => {
  //   setBulkCreateEditServices(checked);
  //   setEmployees((prev) =>
  //     prev.map((emp) => ({
  //       ...emp,
  //       permissions: { ...emp.permissions, canCreateEditServices: checked },
  //     }))
  //   );
  //   setHasUnsavedChanges(true);
  // };

  // Handle save and exit
  const handleSave = async () => {
    await handleAutoSave();
  };

  // Handle continue/complete setup
  const handleContinue = async () => {
    setIsSaving(true);
    const saveSuccess = await handleAutoSave();
    setIsSaving(false);

    if (saveSuccess) {
      router.push(goNext(businessEmployeeAvailabilityPage)?.pageRef ?? "");
    }
    // If save failed, stay on current page (alert already shown in handleAutoSave)
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white rounded-2xl shadow-xl">
            <CardContent className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
              <p className="ml-2 text-gray-600">Loading settings...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white rounded-2xl shadow-xl">
          <CardHeader className="text-center pb-6">
            <OnboardingProgressBar
              currentStep={getStepInfo("business-employee-availability").currentStep}
              totalSteps={getStepInfo("business-employee-availability").totalSteps}
              stepName={getStepInfo("business-employee-availability").stepName}
              goPrevious={() =>
                router.push(goPrevious(businessEmployeeAvailabilityPage)?.pageRef ?? "")
              }
              user={user?.email ?? ""}
            />

            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              Business Settings & Team Permissions
            </CardTitle>
            <p className="text-gray-600">
              Configure business defaults, location settings, and employee permissions
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Business Defaults Section */}
            <Card>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsBusinessDefaultsOpen(!isBusinessDefaultsOpen)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <CardTitle>Business Defaults</CardTitle>
                  </div>
                  {isBusinessDefaultsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Set default settings that apply to all services and employees
                </p>
              </CardHeader>

              {isBusinessDefaultsOpen && (
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessBufferTime">Default Buffer Time</Label>
                      <Select
                        value={businessDefaults.bufferTime.toString()}
                        onValueChange={(value) =>
                          updateBusinessDefaults({ bufferTime: Number.parseInt(value) })
                        }
                      >
                        <SelectTrigger aria-label="Default buffer time">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_BUFFER_TIME_OPTIONS.map(
                            (option: { label: string; value: number }) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Time between appointments for all services
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="advanceBookingNotice">Advance Booking Notice</Label>
                      <Select
                        value={businessDefaults.advanceBookingNotice}
                        onValueChange={(value) =>
                          updateBusinessDefaults({ advanceBookingNotice: value })
                        }
                      >
                        <SelectTrigger aria-label="Advance booking notice">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_ADVANCE_NOTICE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        How far in advance customers must book
                      </p>
                    </div>
                  </div>

                  {/* <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Employee Calendar Connection</p>
                          <p className="text-sm text-gray-600">
                            Allow employees to connect their personal calendars
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={businessDefaults.allowEmployeeCalendarConnection}
                        onCheckedChange={(checked) =>
                          updateBusinessDefaults({ allowEmployeeCalendarConnection: checked })
                        }
                      />
                    </div> */}
                </CardContent>
              )}
            </Card>

            {/* Location Settings Section - COMMENTED OUT */}
            {/* <Card>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsLocationSettingsOpen(!isLocationSettingsOpen)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <CardTitle>Location Settings</CardTitle>
                  </div>
                  {isLocationSettingsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Override business defaults for specific services at each location
                </p>
              </CardHeader>

              {isLocationSettingsOpen && (
                <CardContent>
                  <div className="space-y-6">
                    {locationSettings.map((location) => (
                      <div key={location.id} className="p-4 border rounded-lg">
                        <div className="mb-4">
                          <h4 className="font-semibold text-lg">{location.name}</h4>
                          <p className="text-sm text-gray-600">{location.address}</p>
                        </div>

                        <div className="space-y-4">
                          {location.services.map((service) => (
                            <div
                              key={service.serviceId}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {service.serviceName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium">{service.serviceName}</p>
                                  <p className="text-sm text-gray-600">
                                    {service.duration} min • {service.category}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={!service.useBusinessDefaults}
                                    onCheckedChange={(checked) =>
                                      updateLocationServiceSettings(
                                        location.id,
                                        service.serviceId,
                                        { useBusinessDefaults: !checked }
                                      )
                                    }
                                  />
                                  <span className="text-sm">Custom settings</span>
                                </div>

                                {!service.useBusinessDefaults && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-1">
                                      <Label className="text-xs">Buffer Time</Label>
                                      <Select
                                        value={
                                          service.bufferTime?.toString() ||
                                          businessDefaults.bufferTime.toString()
                                        }
                                        onValueChange={(value) =>
                                          updateLocationServiceSettings(
                                            location.id,
                                            service.serviceId,
                                            { bufferTime: Number.parseInt(value) }
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-24 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="0">0 min</SelectItem>
                                          <SelectItem value="5">5 min</SelectItem>
                                          <SelectItem value="10">10 min</SelectItem>
                                          <SelectItem value="15">15 min</SelectItem>
                                          <SelectItem value="30">30 min</SelectItem>
                                          <SelectItem value="45">45 min</SelectItem>
                                          <SelectItem value="60">1 hour</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                      <Label className="text-xs">Booking Notice</Label>
                                      <Select
                                        value={
                                          service.advanceBookingNotice ||
                                          businessDefaults.advanceBookingNotice
                                        }
                                        onValueChange={(value) =>
                                          updateLocationServiceSettings(
                                            location.id,
                                            service.serviceId,
                                            { advanceBookingNotice: value }
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-24 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {SERVICE_ADVANCE_NOTICE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card> */}

            {/* Employee Settings Section - COMMENTED OUT */}
            {/* <Card>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsEmployeeSettingsOpen(!isEmployeeSettingsOpen)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <CardTitle>Employee Permissions</CardTitle>
                  </div>
                  {isEmployeeSettingsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Control what each employee can access and modify
                </p>
              </CardHeader>

              {isEmployeeSettingsOpen && (
                <CardContent>
                  <div className="space-y-4">
                    {employees.map((employee) => (
                      <div key={employee.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {employee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <h4 className="font-semibold">{employee.name}</h4>
                              <p className="text-sm text-gray-600">{employee.role}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card> */}

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRoutingPrevious(true);
                  router.push(goPrevious(businessEmployeeAvailabilityPage)?.pageRef ?? "");
                }}
                disabled={isLoading || isSaving}
                className="flex items-center gap-2"
                type="button"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={isSaving || isRoutingPrevious}
                  loading={isSaving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  disabled={isSaving || isRoutingPrevious}
                  onClick={handleContinue}
                  className="px-8"
                  loading={isSaving}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
