"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Note } from "@/components/ui/note";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building,
  Car,
  Check,
  Clock,
  DollarSign,
  MapPin,
  Monitor,
  Save,
  Settings,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingProgressBar from "../../../../components/onboarding/OnboardingProgressBar";
import { OnboardingStep, SERVICE_DURATION_OPTIONS } from "../../../constants/businessConstants";
import {
  goNext,
  goPrevious,
  ROUTE_LOGIN_PAGE,
  serviceLocationPage,
} from "../../../constants/routeConstants";
import { getStepInfo } from "../../../utils/onboardingSteps";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  priceType?: "fixed" | "variable";
  priceMin?: number;
  priceMax?: number;
  description: string;
  deliveryOptions: {
    inPerson: boolean;
    mobile: boolean;
    virtual: boolean;
  };
}

interface Location {
  id: string;
  name: string;
  type: "physical" | "mobile" | "virtual";
  address: string;
  resources: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface ServiceLocationConfig {
  serviceId: string;
  locationId: string;
  enabled: boolean;
  customPriceType?: "fixed" | "variable";
  customPrice?: number;
  customPriceMin?: number;
  customPriceMax?: number;
  customDuration?: number;
  requiredResources: string[];
  maxCapacity: number;
}

let durationOptions: { label: string; value: string }[] = SERVICE_DURATION_OPTIONS;
// drop custom option
durationOptions = durationOptions.filter((option) => option.value !== "custom");

const formatDuration = (minutes: number) => {
  const option = durationOptions.find((opt) => opt.value === minutes.toString());
  return option ? option.label : `${minutes}min`;
};

export default function ServiceLocationPage() {
  const router = useRouter();
  const [configurations, setConfigurations] = useState<ServiceLocationConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ServiceLocationConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  // Removed unused locationResources state
  const [isLoading, setIsLoading] = useState(true);
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

  // Load data from previous steps and current draft
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load services from business service templates step
        const servicesResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_SERVICE_TEMPLATES}`
        );
        let loadedServices: Service[] = [];
        if (servicesResponse.ok) {
          const { draftData: servicesData } = await servicesResponse.json();
          console.log("Loaded services data:", servicesData);
          if (servicesData && servicesData.services && Array.isArray(servicesData.services)) {
            loadedServices = servicesData.services.map((service: Record<string, unknown>) => ({
              id: service.id,
              name: service.name,
              category: service.category,
              duration: service.duration,
              price: service.price || 0,
              priceType: service.priceType || "fixed",
              priceMin: service.priceMin,
              priceMax: service.priceMax,
              description: service.description,
              deliveryOptions: service.deliveryOptions || {
                inPerson: true,
                mobile: false,
                virtual: false,
              },
            }));
          }
        }

        // Load locations from business location step
        const locationsResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_LOCATION}`
        );
        const loadedLocations: Location[] = [];
        if (locationsResponse.ok) {
          const { draftData: locationsData } = await locationsResponse.json();
          console.log("Loaded locations data:", locationsData);

          // Parse the business location data structure
          if (locationsData) {
            // Handle physical locations
            if (locationsData["serviceTypes.physical"]?.addresses) {
              const physicalAddresses = locationsData["serviceTypes.physical"].addresses;
              physicalAddresses.forEach((address: Record<string, unknown>) => {
                loadedLocations.push({
                  id: String(address.id || `physical-${address.name}`),
                  name: String(address.name || "Physical Location"),
                  type: "physical",
                  address: `${address.line1}${address.line2 ? ", " + address.line2 : ""}, ${address.city}, ${address.state} ${address.zipCode}`,
                  resources: [], // Will be populated from business resources step
                });
              });
            }

            // Handle mobile services (new schema)
            if (locationsData["serviceTypes.mobile"]?.mobileServices) {
              const mobileServices = locationsData["serviceTypes.mobile"].mobileServices;
              mobileServices.forEach(
                (ms: {
                  id: string;
                  name?: string;
                  serviceArea?: {
                    type?: string;
                    radius?: number;
                    zipCenter?: string;
                    selectedZips?: string[];
                  };
                }) => {
                  const area = ms.serviceArea;
                  let areaDescription = ms.name || "Mobile Service";
                  if (area?.type === "radius_zip_code" && area.zipCenter) {
                    areaDescription = `${area.radius} mile radius from ${area.zipCenter}`;
                  } else if (area?.type === "zip_codes" && area.selectedZips) {
                    areaDescription = `Service areas: ${area.selectedZips.join(", ")}`;
                  } else if (area?.type === "radius_address" && area.radius) {
                    areaDescription = `${area.radius} mile radius from business address`;
                  }
                  loadedLocations.push({
                    id: String(ms.id),
                    name: String(ms.name || "Mobile Service"),
                    type: "mobile",
                    address: areaDescription,
                    resources: [], // Will be populated from business resources step
                  });
                }
              );
            }

            // Handle virtual services (new schema)
            if (locationsData["serviceTypes.virtual"]?.virtualServices) {
              const virtualServices = locationsData["serviceTypes.virtual"].virtualServices;
              virtualServices.forEach((vs: { id: string; name?: string; platform?: string }) => {
                loadedLocations.push({
                  id: String(vs.id),
                  name: String(vs.name || "Virtual Service"),
                  type: "virtual",
                  address: `${vs.platform || "Online"} Platform`,
                  resources: [],
                });
              });
            }
          }
        }

        // Load resources from business resources step
        const resourcesResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.BUSINESS_RESOURCES}`
        );
        const loadedResources: Record<
          string,
          Array<{ id: string; name: string; type: string }>
        > = {};
        if (resourcesResponse.ok) {
          const { draftData: resourcesData } = await resourcesResponse.json();
          console.log("Loaded resources data:", resourcesData);
          if (resourcesData && typeof resourcesData === "object") {
            // Parse resources data structure
            Object.entries(resourcesData).forEach(([locationId, locationData]) => {
              const typedLocationData = locationData as {
                resources?: Array<{ id: string; name: string; type: string }>;
              };
              if (typedLocationData.resources && Array.isArray(typedLocationData.resources)) {
                loadedResources[locationId] = typedLocationData.resources;
              }
            });
          }
        }

        // Update locations with actual resources instead of hardcoded ones
        const locationsWithResources = loadedLocations.map((location) => ({
          ...location,
          resources: loadedResources[location.id] || [],
        }));

        setServices(loadedServices);
        setLocations(locationsWithResources);
        // Removed setLocationResources call as state was removed

        // Initialize configurations based on loaded data
        const initialConfigs: ServiceLocationConfig[] = [];
        loadedServices.forEach((service) => {
          locationsWithResources.forEach((location) => {
            // Only create config if service delivery options match location type
            const canOffer =
              (location.type === "physical" && service.deliveryOptions.inPerson) ||
              (location.type === "mobile" && service.deliveryOptions.mobile) ||
              (location.type === "virtual" && service.deliveryOptions.virtual);

            if (canOffer) {
              initialConfigs.push({
                serviceId: service.id,
                locationId: location.id,
                enabled: false,
                requiredResources: [],
                maxCapacity: 1,
              });
            }
          });
        });

        // Load current step draft data to override initial configs
        const currentResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.SERVICE_LOCATION}`
        );
        if (currentResponse.ok) {
          const { draftData: currentData } = await currentResponse.json();
          console.log("Loaded current step data:", currentData);
          if (
            currentData &&
            currentData.configurations &&
            Array.isArray(currentData.configurations)
          ) {
            // Override initial configs with saved configurations
            const savedConfigs = currentData.configurations;
            savedConfigs.forEach((savedConfig: ServiceLocationConfig) => {
              const index = initialConfigs.findIndex(
                (config) =>
                  config.serviceId === savedConfig.serviceId &&
                  config.locationId === savedConfig.locationId
              );
              if (index >= 0) {
                initialConfigs[index] = savedConfig;
              }
            });
          }
        }

        setConfigurations(initialConfigs);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getConfiguration = (serviceId: string, locationId: string) => {
    return configurations.find((c) => c.serviceId === serviceId && c.locationId === locationId);
  };

  const updateConfiguration = (config: ServiceLocationConfig) => {
    setConfigurations((prev) =>
      prev.map((c) =>
        c.serviceId === config.serviceId && c.locationId === config.locationId ? config : c
      )
    );
  };

  const openConfigModal = (serviceId: string, locationId: string) => {
    const config = getConfiguration(serviceId, locationId);
    if (config) {
      setSelectedConfig(config);
      setIsModalOpen(true);
    }
  };

  const saveConfiguration = () => {
    if (selectedConfig) {
      updateConfiguration(selectedConfig);
      setIsModalOpen(false);
      setSelectedConfig(null);
    }
  };

  // Removed copy-to-all functionality per request

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "physical":
        return <Building className="h-4 w-4" />;
      case "mobile":
        return <Car className="h-4 w-4" />;
      case "virtual":
        return <Monitor className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getConfigurationStatus = (serviceId: string, locationId: string) => {
    const config = getConfiguration(serviceId, locationId);
    if (!config) return "unavailable";
    if (!config.enabled) return "disabled";
    return "configured";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "configured":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Configured
          </Badge>
        );
      case "disabled":
        return (
          <Badge variant="secondary">
            <X className="h-3 w-3 mr-1" />
            Disabled
          </Badge>
        );
      case "unavailable":
        return (
          <Badge variant="outline" className="opacity-50">
            N/A
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const selectedService = services.find((s) => s.id === selectedConfig?.serviceId);
  const selectedLocation = locations.find((l) => l.id === selectedConfig?.locationId);

  const configuredCount = configurations.filter((c) => c.enabled).length;
  const totalPossible = configurations.length;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        configurations: configurations,
        services: services,
        locations: locations,
      };

      console.log("Saving service location data:", dataToSave);
      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: OnboardingStep.SERVICE_LOCATION,
          stepData: dataToSave,
          currentStep: OnboardingStep.SERVICE_LOCATION,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save service location data");
      }

      console.log("Service location data saved successfully");
    } catch (error) {
      console.error("Error saving service location data:", error);
      alert("Failed to save service location data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (configuredCount === 0) {
      alert("Please configure at least one service-location combination before continuing.");
      return;
    }

    // Save data before continuing
    await handleSave();
    router.push(goNext(serviceLocationPage)?.pageRef ?? "");
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4"
      data-testid="service-location-page"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <OnboardingProgressBar
            currentStep={getStepInfo("service-location").currentStep}
            totalSteps={getStepInfo("service-location").totalSteps}
            stepName={getStepInfo("service-location").stepName}
            goPrevious={() => router.push(goPrevious(serviceLocationPage)?.pageRef ?? "")}
            user={user?.email ?? ""}
          />

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configure services at each location
          </h1>
          <p className="text-gray-600 mb-4">
            Set up how each service works at your different locations. Configure pricing, resources,
            and requirements.
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {configuredCount} of {totalPossible} service-location combinations configured
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <Card className="bg-white border-0 shadow-xl mb-8" data-testid="loading-state">
            <CardContent className="p-12 text-center">
              <LoadingSpinner size="lg" text="Loading service configuration..." />
              <p className="text-gray-600">
                We&apos;re loading your services and locations to set up the configuration matrix.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Matrix View */}
            <Card className="mb-8" data-testid="matrix-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="matrix-header">
                  <Settings className="h-5 w-5" />
                  Service-Location Matrix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-3 border-b">Service</th>
                        {locations.map((location) => (
                          <th
                            key={location.id}
                            className="text-center p-3 border-b min-w-[150px]"
                            data-testid={`location-col-${location.id}`}
                            data-address={location.address}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {getLocationIcon(location.type)}
                              <span
                                className="font-medium"
                                data-testid={`location-name-${location.id}`}
                              >
                                {location.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{location.type}</p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service) => (
                        <tr
                          key={service.id}
                          className="border-b"
                          data-testid={`service-row-${service.id}`}
                        >
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-gray-500">{service.category}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {service.duration}min
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {service.priceType === "variable"
                                    ? service.priceMin && service.priceMax
                                      ? `$${service.priceMin}-$${service.priceMax}`
                                      : "Variable"
                                    : service.price > 0
                                      ? `$${service.price}`
                                      : "Free"}
                                </span>
                              </div>
                            </div>
                          </td>
                          {locations.map((location) => {
                            const status = getConfigurationStatus(service.id, location.id);
                            const config = getConfiguration(service.id, location.id);

                            return (
                              <td
                                key={location.id}
                                className="p-3 text-center align-middle"
                                data-testid={`cell-${service.id}-${location.id}`}
                              >
                                {status === "unavailable" ? (
                                  <div className="text-gray-400">
                                    <X className="h-4 w-4 mx-auto mb-1" />
                                    <p className="text-xs">Not compatible</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <div data-testid={`status-badge-${service.id}-${location.id}`}>
                                      {getStatusBadge(status)}
                                    </div>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => openConfigModal(service.id, location.id)}
                                      data-testid={`configure-btn-${service.id}-${location.id}`}
                                      className="flex items-center gap-1"
                                    >
                                      <Settings className="h-3 w-3" />
                                      Configure
                                    </Button>
                                    {config?.enabled && (
                                      <div className="text-xs text-gray-600 text-center space-y-1">
                                        {config.customPriceType === "variable" &&
                                        config.customPriceMin &&
                                        config.customPriceMax ? (
                                          <p>
                                            ${config.customPriceMin}-${config.customPriceMax}
                                          </p>
                                        ) : config.customPrice ? (
                                          <p>${config.customPrice}</p>
                                        ) : null}
                                        {config.customDuration && (
                                          <p>{formatDuration(config.customDuration)}</p>
                                        )}
                                        {config.requiredResources.length > 0 && (
                                          <p>{config.requiredResources.length} resources</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Configuration Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl" data-testid="config-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configure: {selectedService?.name} at {selectedLocation?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              {selectedConfig && selectedService && selectedLocation && (
                <div className="p-6 space-y-6">
                  {/* Enable Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base font-medium">
                        Offer this service at {selectedLocation.name}
                      </Label>
                      <p className="text-sm text-gray-600">
                        Enable this service for booking at this location
                      </p>
                    </div>
                    <Switch
                      checked={selectedConfig.enabled}
                      onCheckedChange={(enabled) =>
                        setSelectedConfig((prev) => (prev ? { ...prev, enabled } : null))
                      }
                      data-testid="enable-switch"
                    />
                  </div>

                  {selectedConfig.enabled && (
                    <>
                      {/* Resource Requirements */}
                      {selectedLocation.resources.length > 0 && (
                        <div className="space-y-4" data-testid="resources-section">
                          <h2 className="text-xl font-semibold">Resource Requirements</h2>
                          {selectedConfig.requiredResources.length === 0 && (
                            <Note
                              heading="Warning: No required resources selected"
                              subheading="This service can be booked without any specific resources."
                              icon={AlertTriangle}
                              variant="blue"
                            />
                          )}
                          <p className="text-sm text-gray-600">
                            Select which resources this service needs at this location
                          </p>

                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-red-600">
                                Required Resources
                              </Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {selectedLocation.resources.map((resource) => (
                                  <div key={resource.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`required-${resource.id}`}
                                      checked={selectedConfig.requiredResources.includes(
                                        resource.id
                                      )}
                                      onCheckedChange={(checked) => {
                                        setSelectedConfig((prev) => {
                                          if (!prev) return null;
                                          const requiredResources = checked
                                            ? [...prev.requiredResources, resource.id]
                                            : prev.requiredResources.filter(
                                                (id) => id !== resource.id
                                              );

                                          return { ...prev, requiredResources };
                                        });
                                      }}
                                    />
                                    <Label htmlFor={`required-${resource.id}`} className="text-sm">
                                      {resource.name} ({resource.type})
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Override Configuration - section header */}
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold">Override Configuration</h2>
                      </div>

                      {/* Pricing Override */}
                      <div className="space-y-4">
                        <h3 className="font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Pricing Configuration
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Base Price</Label>
                            <Input
                              value={
                                selectedService.priceType === "variable"
                                  ? selectedService.priceMin && selectedService.priceMax
                                    ? `$${selectedService.priceMin} - $${selectedService.priceMax}`
                                    : "Variable pricing"
                                  : selectedService.price > 0
                                    ? `$${selectedService.price}`
                                    : "Free"
                              }
                              disabled
                            />
                          </div>
                          <div>
                            <Label>Custom Pricing (optional)</Label>

                            {/* Price Type Selection */}
                            <div className="space-y-3 mb-3">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="fixed-price-custom"
                                    name="customPriceType"
                                    checked={
                                      !selectedConfig.customPriceType ||
                                      selectedConfig.customPriceType === "fixed"
                                    }
                                    onChange={() =>
                                      setSelectedConfig((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              customPriceType: "fixed",
                                              customPriceMin: undefined,
                                              customPriceMax: undefined,
                                            }
                                          : null
                                      )
                                    }
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <label
                                    htmlFor="fixed-price-custom"
                                    className="text-sm font-medium text-gray-700"
                                  >
                                    Fixed Price
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="variable-price-custom"
                                    name="customPriceType"
                                    checked={selectedConfig.customPriceType === "variable"}
                                    onChange={() =>
                                      setSelectedConfig((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              customPriceType: "variable",
                                              customPrice: undefined,
                                            }
                                          : null
                                      )
                                    }
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <label
                                    htmlFor="variable-price-custom"
                                    className="text-sm font-medium text-gray-700"
                                  >
                                    Variable Price Range
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Fixed Price Input */}
                            {(!selectedConfig.customPriceType ||
                              selectedConfig.customPriceType === "fixed") && (
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Override price"
                                  value={selectedConfig.customPrice || ""}
                                  onChange={(e) =>
                                    setSelectedConfig((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            customPrice:
                                              Number.parseFloat(e.target.value) || undefined,
                                          }
                                        : null
                                    )
                                  }
                                  className="pl-8"
                                />
                              </div>
                            )}

                            {/* Variable Price Range Inputs */}
                            {selectedConfig.customPriceType === "variable" && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Minimum Price
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                      $
                                    </span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={selectedConfig.customPriceMin || ""}
                                      onChange={(e) =>
                                        setSelectedConfig((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                customPriceMin:
                                                  Number.parseFloat(e.target.value) || undefined,
                                              }
                                            : null
                                        )
                                      }
                                      className="pl-8"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Maximum Price
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                      $
                                    </span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={selectedConfig.customPriceMax || ""}
                                      onChange={(e) =>
                                        setSelectedConfig((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                customPriceMax:
                                                  Number.parseFloat(e.target.value) || undefined,
                                              }
                                            : null
                                        )
                                      }
                                      className="pl-8"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedConfig.customPriceType === "variable" && (
                              <p className="text-xs text-gray-500 mt-1">
                                Set a price range for services that vary based on complexity, time,
                                or customization at this location
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Duration Override */}
                      <div className="space-y-4">
                        <h3 className="font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Duration Configuration
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Base Duration</Label>
                            <Input value={`${selectedService.duration} minutes`} disabled />
                          </div>
                          <div>
                            <Label>Custom Duration (optional)</Label>
                            <div className="flex gap-2">
                              <Select
                                value={selectedConfig.customDuration?.toString()}
                                onValueChange={(value) =>
                                  setSelectedConfig((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          customDuration: Number.parseInt(value),
                                        }
                                      : null
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={`Use base duration (${selectedService.duration} minutes)`}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {durationOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedConfig.customDuration && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setSelectedConfig((prev) =>
                                      prev ? { ...prev, customDuration: undefined } : null
                                    )
                                  }
                                  className="px-3"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* TODO: Leaving booking capacity here for later use */}
                      {/* <div className="space-y-4">
                      <h3 className="font-medium">Booking Capacity</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Maximum concurrent bookings</Label>
                          <Input
                            type="number"
                            min="1"
                            value={selectedConfig.maxCapacity}
                            onChange={(e) =>
                              setSelectedConfig((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      maxCapacity: Math.max(1, Number(e.target.value)),
                                    }
                                  : null
                              )
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            How many customers can book this service at the same time?
                          </p>
                        </div>
                      </div>
                    </div> */}
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveConfiguration} variant="primary" data-testid="save-config-btn">
                Save Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bottom Actions */}
        {!isLoading && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRoutingPrevious(true);
                router.push(goPrevious(serviceLocationPage)?.pageRef ?? "");
              }}
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
                disabled={isSaving || isRoutingPrevious}
                loading={isSaving}
                data-testid="save-draft-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleContinue}
                disabled={configuredCount === 0 || isSaving || isRoutingPrevious}
                className="px-8"
                loading={isSaving}
                data-testid="continue-btn"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
        {/* Ready-state marker for tests */}
        {!isLoading && (
          <div data-testid="ready-state" data-ready="true" style={{ display: "none" }} />
        )}
      </div>
    </div>
  );
}
