"use client";

import type React from "react";

import OnboardingProgressBar from "@/components/onboarding/OnboardingProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Note } from "@/components/ui/note";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  ChevronLeft,
  Copy,
  Edit,
  GripVertical,
  Monitor,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingStep } from "../../../constants/businessConstants";
import {
  businessResourcesPage,
  goNext,
  goPrevious,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import { getStepInfo } from "../../../utils/onboardingSteps";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";

interface Resource {
  id: string;
  name: string;
  type: "room" | "equipment" | "vehicle";
  description: string;
}

interface Location {
  id: string;
  name: string;
  resources: Resource[];
  type?: "physical" | "mobile";
}

interface BusinessLocationData {
  "serviceTypes.mobile"?: {
    mobileServices: Array<{
      id: string;
      name: string;
      serviceArea: {
        type: string;
        radius: number;
        zipCenter: string;
        zipCodesRaw: string;
      };
    }>;
  };
  "serviceTypes.virtual"?: {
    virtualSettings: {
      platform: string;
      timezone: string;
      defaultLink: string;
      instructions: string;
    };
  };
  "serviceTypes.physical"?: {
    addresses: Array<{
      id: string;
      city: string;
      name: string;
      line1: string;
      line2: string;
      phone: string;
      state: string;
      country: string;
      zipCode: string;
      timezone: string;
      isValidated: boolean;
    }>;
  };
}

export default function BusinessResourcesPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocationId, setActiveLocationId] = useState("");
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceType, setResourceType] = useState<"room" | "equipment" | "vehicle">("room");
  const [newResource, setNewResource] = useState({
    name: "",
    description: "",
  });
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [isLoadingPreviousStep, setIsLoadingPreviousStep] = useState(true);
  const [hasServiceTypes, setHasServiceTypes] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRoutingPrevious, setIsRoutingPrevious] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user, loading: authLoading } = useAuthCore();

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);

  // Load location structure from business_location step, then merge with business_resources data
  useEffect(() => {
    const loadDraftData = async () => {
      setIsLoadingPreviousStep(true);
      try {
        // ALWAYS load locations from business_location step first to get latest structure
        console.log("Loading locations from business_location step...");
        const locationResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_LOCATION}`
        );

        let locationsFromBusinessStep: Location[] = [];
        let hasValidServiceTypes = false;

        if (locationResponse.ok) {
          const { draftData: locationData } = await locationResponse.json();
          console.log("Loaded business_location draft data:", locationData);

          if (locationData) {
            locationsFromBusinessStep = generateLocationsFromData(locationData);

            // Check if we have any service types that require resources
            const hasPhysical = locationData["serviceTypes.physical"]?.addresses?.length > 0;
            const hasMobile = !!locationData["serviceTypes.mobile"];
            hasValidServiceTypes = hasPhysical || hasMobile;
          }
        }

        // Now load existing business_resources data and merge with location structure
        const resourcesResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_RESOURCES}`
        );
        let existingResourcesData: Record<string, unknown> = {};

        if (resourcesResponse.ok) {
          const { draftData: resourcesData } = await resourcesResponse.json();
          console.log("Loaded business_resources draft data:", resourcesData);
          if (resourcesData && Object.keys(resourcesData).length > 0) {
            existingResourcesData = resourcesData;
          }
        }

        // Merge: Use location structure from business_location, but preserve resources from business_resources
        const finalLocations = locationsFromBusinessStep.map((location) => {
          const existingLocationData = existingResourcesData[location.id] as
            | { resources?: Resource[] }
            | undefined;
          if (existingLocationData && existingLocationData.resources) {
            // Keep existing resources for this location
            return {
              ...location,
              resources: existingLocationData.resources,
            };
          }
          // New location or no existing resources - start with empty resources
          return location;
        });

        setLocations(finalLocations);
        setHasServiceTypes(hasValidServiceTypes);

        // Set the first location as active if any exist
        if (finalLocations.length > 0) {
          setActiveLocationId(finalLocations[0].id);
        }

        console.log("Successfully merged locations from business_location with resources data");
      } catch (error) {
        console.error("Error loading draft data:", error);
        setHasServiceTypes(false);
      } finally {
        setIsLoadingPreviousStep(false);
      }
    };

    loadDraftData();
  }, []);

  // Function to generate locations based on business location data
  const generateLocationsFromData = (data: BusinessLocationData): Location[] => {
    const locations: Location[] = [];

    // Add physical locations as tabs
    if (data["serviceTypes.physical"]?.addresses) {
      data["serviceTypes.physical"].addresses.forEach((address) => {
        locations.push({
          id: address.id,
          name: address.name || `${address.city || "Location"}`,
          resources: [],
          type: "physical",
        });
      });
    }

    // Add mobile services as tabs if mobile service type exists
    if (data["serviceTypes.mobile"]?.mobileServices) {
      data["serviceTypes.mobile"].mobileServices.forEach((mobileService) => {
        locations.push({
          id: mobileService.id,
          name: mobileService.name || "Mobile Service",
          resources: [],
          type: "mobile",
        });
      });
    }

    return locations;
  };

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Check if we have service types that require resources
    if (!hasServiceTypes) {
      return true; // No validation needed if no service types
    }

    // Validate that each location with resources has proper resource data
    locations.forEach((location) => {
      location.resources.forEach((resource, index) => {
        const prefix = `${location.id}.${index}`;

        if (!resource.name.trim()) {
          newErrors[`${prefix}.name`] =
            `${resource.type === "room" ? "Room name" : resource.type === "equipment" ? "Equipment name" : "Vehicle identifier"} is required`;
        }

        if (!resource.description.trim()) {
          newErrors[`${prefix}.description`] = `${resource.type} description is required`;
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler
  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Form submit triggered for business resources!");
    await handleContinue();
  };

  // Continue handler with validation and save
  const handleContinue = async () => {
    if (!validateForm()) {
      console.log("Validation failed, stopping here");
      return;
    }

    // Save before continuing
    const saved = await handleSave();
    if (!saved) {
      alert("Failed to save resources data. Please try again.");
      return;
    }
    router.push(goNext(businessResourcesPage)?.pageRef ?? "");
  };

  // Save resources data to API
  const handleSave = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Transform locations data for API
      const resourcesData: Record<
        string,
        {
          name: string;
          type: string;
          resources: {
            id: string;
            name: string;
            type: string;
            description: string;
            locationId: string;
          }[];
        }
      > = {};

      locations.forEach((location) => {
        if (location.resources.length > 0) {
          resourcesData[location.id] = {
            name: location.name,
            type: location.type || "physical",
            resources: location.resources.map((resource) => ({
              id: resource.id,
              name: resource.name,
              type: resource.type,
              description: resource.description,
              locationId: location.id,
            })),
          };
        }
      });

      console.log("Resources data to save:", resourcesData);

      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "business_resources",
          stepData: resourcesData,
          currentStep: "business_resources",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors((prev) => ({
          ...prev,
          submit: errorData.message || "Failed to save resources data",
        }));
        return false;
      }

      console.log("Resources data saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving resources data:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "An error occurred while saving. Please try again.",
      }));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewResource({
      name: "",
      description: "",
    });
    setEditingResource(null);
    setShowAddResource(false);
    // Clear form errors
    setErrors((prev) => ({
      ...prev,
      "newResource.name": "",
      "newResource.description": "",
      "newResource.location": "",
    }));
  };

  const addResource = () => {
    // Validate new resource fields
    const newErrors: Record<string, string> = {};

    if (!newResource.name.trim()) {
      newErrors["newResource.name"] =
        `${resourceType === "room" ? "Room name" : resourceType === "equipment" ? "Equipment name" : "Vehicle identifier"} is required`;
    }

    if (!newResource.description.trim()) {
      newErrors["newResource.description"] = `${resourceType} description is required`;
    }

    if (!activeLocationId) {
      newErrors["newResource.location"] = "Please select a location";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    const resource: Resource = {
      id: editingResource?.id || Date.now().toString(),
      name: newResource.name.trim(),
      type: resourceType,
      description: newResource.description.trim(),
    };

    setLocations((prevLocations) =>
      prevLocations.map((location) => {
        if (location.id === activeLocationId) {
          if (editingResource) {
            // Update existing resource
            return {
              ...location,
              resources: location.resources.map((r) =>
                r.id === editingResource.id ? resource : r
              ),
            };
          } else {
            // Add new resource
            return {
              ...location,
              resources: [...location.resources, resource],
            };
          }
        }
        return location;
      })
    );

    resetForm();
  };

  const editResource = (resource: Resource) => {
    setEditingResource(resource);
    setResourceType(resource.type);
    setNewResource({
      name: resource.name,
      description: resource.description,
    });
    setShowAddResource(true);

    // Scroll to the form after a short delay to ensure it's rendered
    setTimeout(() => {
      const formElement = document.getElementById("resource-form");
      if (formElement) {
        formElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const deleteResource = (id: string) => {
    setLocations((prevLocations) =>
      prevLocations.map((location) => {
        if (location.id === activeLocationId) {
          return {
            ...location,
            resources: location.resources.filter((r) => r.id !== id),
          };
        }
        return location;
      })
    );
  };

  const duplicateResource = (resource: Resource) => {
    const duplicate = {
      ...resource,
      id: Date.now().toString(),
      name: `${resource.name} (Copy)`,
    };

    setLocations((prevLocations) =>
      prevLocations.map((location) => {
        if (location.id === activeLocationId) {
          return {
            ...location,
            resources: [...location.resources, duplicate],
          };
        }
        return location;
      })
    );
  };

  const getResourcesByType = (type: "room" | "equipment" | "vehicle") => {
    const currentLocation = locations.find((location) => location.id === activeLocationId);
    return currentLocation ? currentLocation.resources.filter((r) => r.type === type) : [];
  };

  const getCurrentLocationResources = () => {
    const currentLocation = locations.find((location) => location.id === activeLocationId);
    return currentLocation ? currentLocation.resources : [];
  };

  // Check if there are any resources across all locations
  const hasAnyResources = () => {
    return locations.some((location) => location.resources.length > 0);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, resourceId: string) => {
    setDraggedItem(resourceId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, resourceId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverItem(resourceId);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const currentLocationResources = getCurrentLocationResources();
    const draggedResource = currentLocationResources.find((r) => r.id === draggedItem);
    const targetResource = currentLocationResources.find((r) => r.id === targetId);

    if (!draggedResource || !targetResource || draggedResource.type !== targetResource.type) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const resourcesOfType = getResourcesByType(draggedResource.type);
    const draggedIndex = resourcesOfType.findIndex((r) => r.id === draggedItem);
    const targetIndex = resourcesOfType.findIndex((r) => r.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Reorder within the same type
    const newResourcesOfType = [...resourcesOfType];
    const [removed] = newResourcesOfType.splice(draggedIndex, 1);
    newResourcesOfType.splice(targetIndex, 0, removed);

    // Update the location's resources array
    setLocations((prevLocations) =>
      prevLocations.map((location) => {
        if (location.id === activeLocationId) {
          const otherResources = location.resources.filter((r) => r.type !== draggedResource.type);
          return {
            ...location,
            resources: [...otherResources, ...newResourcesOfType],
          };
        }
        return location;
      })
    );

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleSkip = async () => {
    // Save empty resources data when skipping
    await handleSave();
    router.push(goNext(businessResourcesPage)?.pageRef ?? "");
  };

  const ResourceCard = ({ resource }: { resource: Resource }) => (
    <Card
      key={resource.id}
      className={`border transition-all duration-200 ${
        dragOverItem === resource.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
      } ${draggedItem === resource.id ? "opacity-50" : ""}`}
      draggable
      onDragStart={(e) => handleDragStart(e, resource.id)}
      onDragOver={(e) => handleDragOver(e, resource.id)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, resource.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <GripVertical className="h-4 w-4 text-gray-400 cursor-move mt-0.5" />
            <div className="flex-1">
              <h5 className="font-medium mb-1">{resource.name}</h5>
              <p className="text-sm text-gray-600 line-clamp-2">{resource.description}</p>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => duplicateResource(resource)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editResource(resource)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => deleteResource(resource.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex-1">
            <OnboardingProgressBar
              currentStep={getStepInfo("business-resources").currentStep}
              totalSteps={getStepInfo("business-resources").totalSteps}
              stepName={getStepInfo("business-resources").stepName}
              goPrevious={() => router.push(goPrevious(businessResourcesPage)?.pageRef ?? "")}
              user={user?.email ?? ""}
            />
          </div>
          <form onSubmit={handleFormSubmit}>
            {/* Header */}

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">What resources do you have?</h1>
              <p className="text-gray-600 mb-4">
                Resources are physical spaces or equipment needed for services
              </p>
              <Note
                heading="When do you need resources?"
                subheading="If your services require specific rooms, equipment, or vehicles to be available, add them here. For simple businesses where any space works, you can skip this step."
                variant="blue"
              />
              <Note
                heading="Important"
                subheading="Only include resources that have a booking calendar where you are required to check the availability of the resource before booking an appointment."
                icon={AlertCircle}
                variant="blue"
              />
            </div>

            {/* Show loading state while fetching data */}
            {isLoadingPreviousStep && (
              <>
                <LoadingSpinner size="md" />
                <p className="text-gray-600">Loading your business location data...</p>
              </>
            )}

            {/* Show no resources message if no service types require resources */}
            {!isLoadingPreviousStep && !hasServiceTypes && (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 mx-auto mb-6 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  No Business Location Data Found
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  We couldn&apos;t find your business location setup. Please go back to the Business
                  Location step to configure your service delivery methods first.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => router.back()}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    Go Back to Business Location
                  </Button>
                  <Button
                    onClick={handleContinue}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Skip Resources Step
                  </Button>
                </div>
              </div>
            )}

            {/* Location Tabs - only show if we have service types that need resources */}
            {!isLoadingPreviousStep && hasServiceTypes && locations.length > 0 && (
              <Tabs value={activeLocationId} onValueChange={setActiveLocationId} className="mb-8">
                <TabsList
                  className={`grid w-full ${locations.length === 1 ? "grid-cols-1" : locations.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
                >
                  {locations.map((location) => (
                    <TabsTrigger
                      key={location.id}
                      value={location.id}
                      className="flex items-center gap-2"
                    >
                      {location.type === "mobile" ? (
                        <Car className="h-4 w-4" />
                      ) : (
                        <Building2 className="h-4 w-4" />
                      )}
                      {location.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {locations.map((location) => (
                  <TabsContent key={location.id} value={location.id} className="py-8">
                    {/* Add Resource Button */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Resources{" "}
                        {location.type === "mobile" ? "for Mobile Services" : `at ${location.name}`}
                      </h3>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          setShowAddResource(true);
                          // Scroll to the form after a short delay to ensure it's rendered
                          setTimeout(() => {
                            const formElement = document.getElementById("resource-form");
                            if (formElement) {
                              formElement.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }
                          }, 100);
                        }}
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Resource
                      </Button>
                    </div>

                    {/* Resource Lists */}
                    <div className="space-y-6">
                      {/* Rooms/Spaces */}
                      {getResourcesByType("room").length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Rooms & Spaces
                          </h4>
                          <div className="space-y-2">
                            {getResourcesByType("room").map((resource) => (
                              <ResourceCard key={resource.id} resource={resource} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Equipment */}
                      {getResourcesByType("equipment").length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Equipment
                          </h4>
                          <div className="space-y-2">
                            {getResourcesByType("equipment").map((resource) => (
                              <ResourceCard key={resource.id} resource={resource} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vehicles */}
                      {getResourcesByType("vehicle").length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            Vehicles
                          </h4>
                          <div className="space-y-2">
                            {getResourcesByType("vehicle").map((resource) => (
                              <ResourceCard key={resource.id} resource={resource} />
                            ))}
                          </div>
                        </div>
                      )}

                      {getCurrentLocationResources().length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          {location.type === "mobile" ? (
                            <>
                              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No mobile resources added yet</p>
                              <p className="text-sm">
                                Add vehicles, equipment, or tools that travel with your mobile
                                services
                              </p>
                            </>
                          ) : (
                            <>
                              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No resources added yet</p>
                              <p className="text-sm">
                                Add rooms, equipment, or vehicles needed for your services at this
                                location
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Add/Edit Resource Form */}
                    {showAddResource && (
                      <Card id="resource-form" className="border-2 border-dashed border-gray-300">
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {editingResource ? "Edit Resource" : "Add New Resource"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Resource Type Selector */}
                          <div>
                            <Label className="text-base font-medium mb-3 block">
                              Resource Type
                            </Label>
                            <div className="flex gap-4">
                              <Button
                                type="button"
                                variant={resourceType === "room" ? "default" : "outline"}
                                onClick={() => setResourceType("room")}
                                className="flex items-center gap-2"
                                disabled={!!editingResource}
                              >
                                <Building2 className="h-4 w-4" />
                                Room/Space
                              </Button>
                              <Button
                                type="button"
                                variant={resourceType === "equipment" ? "default" : "outline"}
                                onClick={() => setResourceType("equipment")}
                                className="flex items-center gap-2"
                                disabled={!!editingResource}
                              >
                                <Monitor className="h-4 w-4" />
                                Equipment
                              </Button>
                              <Button
                                type="button"
                                variant={resourceType === "vehicle" ? "default" : "outline"}
                                onClick={() => setResourceType("vehicle")}
                                className="flex items-center gap-2"
                                disabled={!!editingResource}
                              >
                                <Car className="h-4 w-4" />
                                Vehicle
                              </Button>
                            </div>
                          </div>

                          {/* Resource Name */}
                          <div>
                            <Label htmlFor="resourceName">
                              {resourceType === "room"
                                ? "Room Name"
                                : resourceType === "equipment"
                                  ? "Equipment Name"
                                  : "Vehicle Identifier"}{" "}
                              *
                            </Label>
                            <Input
                              id="resourceName"
                              value={newResource.name}
                              onChange={(e) => {
                                setNewResource({ ...newResource, name: e.target.value });
                                // Clear errors when editing
                                if (errors["newResource.name"]) {
                                  setErrors((prev) => ({ ...prev, "newResource.name": "" }));
                                }
                              }}
                              placeholder={
                                resourceType === "room"
                                  ? "e.g., Exam Room 1"
                                  : resourceType === "equipment"
                                    ? "e.g., MRI Machine"
                                    : "e.g., Service Van #1"
                              }
                              className={errors["newResource.name"] ? "border-red-300" : ""}
                            />
                            {errors["newResource.name"] && (
                              <p className="text-red-500 text-sm mt-1 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                {errors["newResource.name"]}
                              </p>
                            )}
                          </div>

                          {/* Resource Description */}
                          <div>
                            <Label htmlFor="resourceDescription">
                              {resourceType === "room"
                                ? "Room Description"
                                : resourceType === "equipment"
                                  ? "Equipment Description"
                                  : "Vehicle Description"}{" "}
                              *
                            </Label>
                            <Textarea
                              id="resourceDescription"
                              value={newResource.description}
                              onChange={(e) => {
                                setNewResource({ ...newResource, description: e.target.value });
                                // Clear errors when editing
                                if (errors["newResource.description"]) {
                                  setErrors((prev) => ({ ...prev, "newResource.description": "" }));
                                }
                              }}
                              placeholder={
                                resourceType === "room"
                                  ? "Describe what this room is used for in detail..."
                                  : resourceType === "equipment"
                                    ? "Describe what this equipment is used for in detail..."
                                    : "Describe what this vehicle is used for in detail..."
                              }
                              className={`min-h-[100px] resize-vertical ${errors["newResource.description"] ? "border-red-300" : ""}`}
                            />
                            {errors["newResource.description"] && (
                              <p className="text-red-500 text-sm mt-1 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                {errors["newResource.description"]}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                              Just describe what this {resourceType} is used for in detail.
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              onClick={addResource}
                              disabled={!newResource.name || !newResource.description}
                            >
                              {editingResource ? "Update Resource" : "Add Resource"}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetForm}>
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {/* Form-wide error display */}
            {errors.submit && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Bottom Actions - only show when we have service types that need resources */}
            {!isLoadingPreviousStep && hasServiceTypes && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRoutingPrevious(true);
                    router.push(goPrevious(businessResourcesPage)?.pageRef ?? "");
                  }}
                  className="border-gray-200 hover:bg-gray-50 bg-transparent"
                  disabled={isSaving}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSave}
                    className="border-gray-200 hover:bg-gray-50 bg-transparent"
                    disabled={isSaving || isRoutingPrevious}
                    loading={isSaving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  {!hasAnyResources() && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSkip}
                      className="border-gray-200 hover:bg-gray-50 bg-transparent"
                      disabled={isSaving || isRoutingPrevious}
                    >
                      Skip this step
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSaving || isRoutingPrevious}
                    className="px-8"
                    loading={isSaving}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
