"use client";

import OnboardingProgressBar from "@/components/onboarding/OnboardingProgressBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Store,
  Video,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Label } from "../../../../components/ui/label";
import {
  COUNTRIES,
  SERVICE_RADIUS_OPTIONS,
  SUPPORTED_TIMEZONES,
  US_STATES,
  VIRTUAL_MEETING_PLATFORMS,
} from "../../../constants/businessConstants";
import {
  businessLocationPage,
  goNext,
  goPrevious,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import { TimeZoneId } from "../../../constants/tzConstants";
import {
  Address,
  LocationData,
  LocationErrors,
  MobileService,
  ServiceArea,
  ServiceTypeOption,
  VirtualService,
} from "../../../types/business-location";
import { getStepInfo } from "../../../utils/onboardingSteps";
import { formatTimeInTimezone } from "../../../utils/tz";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";

// Dynamic ID generation function
const generateLocationId = (type: "physical" | "mobile" | "online"): string => {
  return `${type}-${crypto.randomUUID()}`;
};

// Helper to create default mobile service
const createDefaultMobileService = (): MobileService => ({
  id: generateLocationId("mobile"),
  name: `Mobile Service 1`,
  serviceArea: {
    type: "radius_zip_code",
    zipCenter: "",
    radius: 25,
  },
});

// Helper to create default virtual group
const createDefaultVirtualService = (): VirtualService => {
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    id: generateLocationId("online"),
    name: `Virtual Group 1`,
    platform: "zoom",
    defaultLink: "",
    instructions: "",
    timezone: detectedTimezone,
  };
};

export default function BusinessLocationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthCore();
  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    physical: false,
    mobile: false,
    virtual: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormReady, setIsFormReady] = useState(false);

  const [formData, setFormData] = useState<LocationData>({
    serviceTypes: {
      physical: false,
      mobile: false,
      virtual: false,
    },
    addresses: [
      {
        id: generateLocationId("physical"),
        name: "Main Location",
        line1: "",
        line2: "",
        city: "",
        state: "",
        zipCode: "",
        country: "US",
        phone: "",
        timezone: "",
        isValidated: false,
      },
    ],
    mobileServices: [],
    virtualServices: [],
  });

  const [errors, setErrors] = useState<LocationErrors>({});

  // Memoize service type options to prevent recreation
  const serviceTypeOptions: ServiceTypeOption[] = useMemo(
    () => [
      {
        id: "physical",
        title: "Physical locations (customers come to us)",
        subtitle: "Fixed location like salon, office, clinic",
        icon: <Store className="w-5 h-5" />,
      },
      {
        id: "mobile",
        title: "Mobile service (we go to customers)",
        subtitle: "Mobile services like plumbing, landscaping, cleaning",
        icon: <Car className="w-5 h-5" />,
      },
      {
        id: "virtual",
        title: "Virtual/online services",
        subtitle: "Online consultations, coaching, teaching",
        icon: <Video className="w-5 h-5" />,
      },
    ],
    []
  );

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);

  // Load draft data on initial load
  useEffect(() => {
    const loadDraftData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/business/onboarding/draft/business_location`);
        if (response.ok) {
          const { draftData } = await response.json();

          if (draftData && typeof draftData === "object") {
            const updatedFormData: LocationData = {
              serviceTypes: {
                physical: false,
                mobile: false,
                virtual: false,
              },
              addresses: formData.addresses,
              mobileServices: [],
              virtualServices: [],
            };

            // Load service types and their data
            if (draftData["serviceTypes.physical"]) {
              updatedFormData.serviceTypes.physical = true;
              if (draftData["serviceTypes.physical"].addresses) {
                updatedFormData.addresses = draftData["serviceTypes.physical"].addresses;
              }
            }

            if (draftData["serviceTypes.mobile"]) {
              updatedFormData.serviceTypes.mobile = true;
              if (draftData["serviceTypes.mobile"].mobileServices) {
                updatedFormData.mobileServices = draftData["serviceTypes.mobile"].mobileServices;
              }
            }

            if (draftData["serviceTypes.virtual"]) {
              updatedFormData.serviceTypes.virtual = true;
              if (draftData["serviceTypes.virtual"].virtualServices) {
                updatedFormData.virtualServices = draftData["serviceTypes.virtual"].virtualServices;
              }
            }

            // Batch state updates
            setFormData(updatedFormData);
            setExpandedSections({
              physical: updatedFormData.serviceTypes.physical,
              mobile: updatedFormData.serviceTypes.mobile,
              virtual: updatedFormData.serviceTypes.virtual,
            });
          }
        }
      } catch (error) {
        console.error("Error loading draft location data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraftData();
  }, []);

  // Set form ready state after loading completes
  useEffect(() => {
    if (!isLoading) {
      setIsFormReady(true);
    }
  }, [isLoading]);

  // Consolidated service type change handler
  const handleServiceTypeChange = useCallback(
    (type: keyof LocationData["serviceTypes"], checked: boolean) => {
      setFormData((prev) => {
        const updates: LocationData = {
          ...prev,
          serviceTypes: {
            ...prev.serviceTypes,
            [type]: checked,
          },
        };

        // Add default services if needed
        if (checked) {
          if (type === "mobile" && prev.mobileServices.length === 0) {
            updates.mobileServices = [createDefaultMobileService()];
          } else if (type === "virtual" && prev.virtualServices.length === 0) {
            updates.virtualServices = [createDefaultVirtualService()];
          }
        }

        return updates;
      });

      // Update expanded sections separately
      if (checked) {
        setExpandedSections((prev) => ({ ...prev, [type]: true }));
      }

      setErrors({});
    },
    []
  );

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleAddressChange = useCallback((addressId: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses.map((addr) =>
        addr.id === addressId ? { ...addr, [field]: value, isValidated: false } : addr
      ),
    }));

    // Clear errors for the field being edited
    setErrors((prev) => {
      const errorKey = `${addressId}.${field}`;
      if (prev[errorKey]) {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const addMobileService = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      mobileServices: [
        ...prev.mobileServices,
        {
          ...createDefaultMobileService(),
          name: `Mobile Service ${prev.mobileServices.length + 1}`,
        },
      ],
    }));
  }, []);

  const addVirtualService = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      virtualServices: [
        ...prev.virtualServices,
        {
          ...createDefaultVirtualService(),
          name: `Virtual Group ${prev.virtualServices.length + 1}`,
        },
      ],
    }));
  }, []);

  const removeMobileService = useCallback((serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      mobileServices: prev.mobileServices.filter((service) => service.id !== serviceId),
    }));
  }, []);

  const removeVirtualService = useCallback((serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      virtualServices: prev.virtualServices.filter((service) => service.id !== serviceId),
    }));
  }, []);

  const updateMobileService = useCallback(
    (serviceId: string, field: keyof MobileService, value: string | ServiceArea) => {
      setFormData((prev) => ({
        ...prev,
        mobileServices: prev.mobileServices.map((service) => {
          if (service.id === serviceId) {
            const updatedService = { ...service, [field]: value };

            if (
              field === "serviceArea" &&
              typeof value === "object" &&
              value.type === "radius_address"
            ) {
              if (!updatedService.businessAddress) {
                updatedService.businessAddress = {
                  id: generateLocationId("physical"),
                  name: "Business Address",
                  line1: "",
                  line2: "",
                  city: "",
                  state: "",
                  zipCode: "",
                  country: "US",
                  phone: "",
                  timezone: "",
                  isValidated: false,
                };
              }
            }

            return updatedService;
          }
          return service;
        }),
      }));
    },
    []
  );

  const updateVirtualService = useCallback(
    (serviceId: string, field: keyof VirtualService, value: string) => {
      setFormData((prev) => ({
        ...prev,
        virtualServices: prev.virtualServices.map((service) =>
          service.id === serviceId ? { ...service, [field]: value } : service
        ),
      }));
    },
    []
  );

  const updateBusinessAddress = useCallback((serviceId: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      mobileServices: prev.mobileServices.map((service) => {
        if (service.id === serviceId && service.businessAddress) {
          return {
            ...service,
            businessAddress: {
              ...service.businessAddress,
              [field]: value,
              isValidated: false,
            },
          };
        }
        return service;
      }),
    }));

    setErrors((prev) => {
      const errorKey = `${serviceId}.businessAddress.${field}`;
      if (prev[errorKey]) {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const validateAddress = useCallback(
    async (addressId: string) => {
      const address = formData.addresses.find((addr) => addr.id === addressId);
      if (!address) return;

      setIsValidating(addressId);

      try {
        const response = await fetch("/api/business/address-validation", {
          method: "POST",
          body: JSON.stringify({ address }),
        });
        const data = await response.json();

        const suggestedAddress: Address = {
          ...address,
          line1: data.addressLines[0].replace(/\b\w/g, (l: string) => l.toUpperCase()),
          line2: data.addressLines[1] || "",
          city: data.locality.replace(/\b\w/g, (l: string) => l.toUpperCase()),
          zipCode: data.postalCode.replace(/(\d{5})(\d{4})/, "$1-$2"),
          isValidated: true,
          state: data.administrativeArea,
          country: data.regionCode,
        };

        setFormData((prev) => ({
          ...prev,
          addresses: prev.addresses.map((addr) =>
            addr.id === addressId ? { ...addr, suggestedAddress } : addr
          ),
        }));

        setShowSuggestion(addressId);
      } catch {
        setErrors((prev) => ({
          ...prev,
          [`${addressId}.validation`]: "Address validation failed. Please try again.",
        }));
      } finally {
        setIsValidating(null);
      }
    },
    [formData.addresses]
  );

  const acceptSuggestedAddress = useCallback((addressId: string) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses.map((addr) => {
        if (addr.id === addressId && addr.suggestedAddress) {
          return {
            ...addr,
            ...addr.suggestedAddress,
            isValidated: true,
            suggestedAddress: undefined,
          };
        }
        return addr;
      }),
    }));
    setShowSuggestion(null);
  }, []);

  const keepOriginalAddress = useCallback((addressId: string) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses.map((addr) =>
        addr.id === addressId ? { ...addr, isValidated: true, suggestedAddress: undefined } : addr
      ),
    }));
    setShowSuggestion(null);
  }, []);

  const addLocation = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      addresses: [
        ...prev.addresses,
        {
          id: generateLocationId("physical"),
          name: `Location ${prev.addresses.length + 1}`,
          line1: "",
          line2: "",
          city: "",
          state: "",
          zipCode: "",
          country: "US",
          phone: "",
          timezone: "",
          isValidated: false,
        },
      ],
    }));
  }, []);

  const removeLocation = useCallback((addressId: string) => {
    setFormData((prev) => {
      if (prev.addresses.length <= 1) return prev;
      return {
        ...prev,
        addresses: prev.addresses.filter((addr) => addr.id !== addressId),
      };
    });
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    const hasSelectedType = Object.values(formData.serviceTypes).some(Boolean);
    if (!hasSelectedType) {
      newErrors.serviceTypes = "Please select at least one service delivery method";
    }

    if (formData.serviceTypes.physical) {
      formData.addresses.forEach((address) => {
        if (!address.line1.trim()) {
          newErrors[`${address.id}.line1`] = "Address is required";
        }
        if (!address.city.trim()) {
          newErrors[`${address.id}.city`] = "City is required";
        }
        if (!address.state) {
          newErrors[`${address.id}.state`] = "State is required";
        }
        if (!address.zipCode.trim()) {
          newErrors[`${address.id}.zipCode`] = "ZIP code is required";
        }
      });
    }

    if (formData.serviceTypes.mobile) {
      if (formData.mobileServices.length === 0) {
        newErrors["mobileServices"] = "At least one mobile service configuration is required";
      } else {
        formData.mobileServices.forEach((mobileService, index) => {
          const serviceArea = mobileService.serviceArea;
          const prefix = `mobileService_${index}`;

          if (!serviceArea?.type) {
            newErrors[`${prefix}.type`] = "Please select a service area type";
            return;
          }

          if (serviceArea.type === "radius_zip_code") {
            if (!serviceArea.zipCenter?.trim()) {
              newErrors[`${prefix}.zipCenter`] = "Center ZIP code is required";
            } else if (!/^\d{5}(-\d{4})?$/.test(serviceArea.zipCenter.trim())) {
              newErrors[`${prefix}.zipCenter`] =
                "ZIP code must be 5 digits (e.g., 12345) or ZIP+4 format (e.g., 12345-6789)";
            }
            if (!serviceArea.radius || serviceArea.radius <= 0) {
              newErrors[`${prefix}.radius`] = "Service radius is required";
            }
          } else if (serviceArea.type === "radius_address") {
            if (!mobileService.businessAddress?.line1?.trim()) {
              newErrors[`${prefix}.business.line1`] = "Business address is required";
            }
            if (!mobileService.businessAddress?.city?.trim()) {
              newErrors[`${prefix}.business.city`] = "City is required";
            }
            if (!mobileService.businessAddress?.state) {
              newErrors[`${prefix}.business.state`] = "State is required";
            }
            if (!mobileService.businessAddress?.zipCode?.trim()) {
              newErrors[`${prefix}.business.zipCode`] = "ZIP code is required";
            } else if (!/^\d{5}(-\d{4})?$/.test(mobileService.businessAddress.zipCode.trim())) {
              newErrors[`${prefix}.business.zipCode`] =
                "ZIP code must be 5 digits (e.g., 12345) or ZIP+4 format (e.g., 12345-6789)";
            }
            if (!mobileService.businessAddress?.country) {
              newErrors[`${prefix}.business.country`] = "Country is required";
            }
            if (!serviceArea.radius || serviceArea.radius <= 0) {
              newErrors[`${prefix}.radius`] = "Service radius is required";
            }
          } else if (serviceArea.type === "zip_codes") {
            const rawZipCodes = serviceArea.zipCodesRaw || "";
            if (!rawZipCodes.trim()) {
              newErrors[`${prefix}.zipCodes`] = "At least one ZIP code is required";
            } else {
              const zipCodes = rawZipCodes
                .split(",")
                .map((zip: string) => zip.trim())
                .filter((zip: string) => zip);

              if (zipCodes.length === 0) {
                newErrors[`${prefix}.zipCodes`] = "At least one ZIP code is required";
              } else {
                const invalidZips = zipCodes.filter((zip: string) => {
                  return !zip || !/^\d{5}(-\d{4})?$/.test(zip);
                });

                if (invalidZips.length > 0) {
                  newErrors[`${prefix}.zipCodes`] =
                    `Invalid ZIP codes found. Each ZIP code must be 5 digits (e.g., 12345) or ZIP+4 format (e.g., 12345-6789)`;
                }
              }
            }
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSave = useCallback(
    async (dataToSaveParam?: LocationData) => {
      setIsSaving(true);
      try {
        const sourceData = dataToSaveParam || formData;
        let dataToSave = {};

        if (sourceData.serviceTypes.mobile === true) {
          dataToSave = {
            ...dataToSave,
            ["serviceTypes.mobile"]: {
              mobileServices: sourceData.mobileServices,
            },
          };
        }

        if (sourceData.serviceTypes.physical === true) {
          dataToSave = {
            ...dataToSave,
            ["serviceTypes.physical"]: {
              addresses: sourceData.addresses,
            },
          };
        }

        if (sourceData.serviceTypes.virtual === true) {
          dataToSave = {
            ...dataToSave,
            ["serviceTypes.virtual"]: {
              virtualServices: sourceData.virtualServices,
            },
          };
        }

        const response = await fetch("/api/business/onboarding/draft", {
          method: "POST",
          body: JSON.stringify({
            step: "business_location",
            stepData: dataToSave,
            currentStep: "business_location",
          }),
        });

        if (!response.ok) {
          setErrors((prev) => ({
            ...prev,
            ["business_location"]: "Failed to save application",
          }));
        }
      } catch (error) {
        console.error("Application save failed:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [formData]
  );

  const handleContinue = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    await handleSave(formData);
    router.push(goNext(businessLocationPage)?.pageRef ?? "");
  }, [formData, validateForm, handleSave, router]);

  const handleFormSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleContinue();
    },
    [handleContinue]
  );

  const renderBusinessAddressForm = useCallback(
    (address: Address, serviceId: string) => {
      return (
        <div className="space-y-4" data-testid={`business-address-form-${serviceId}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location Name</label>
            <Input
              name={`businessAddress_${serviceId}_name`}
              value={address.name || ""}
              onChange={(e) => updateBusinessAddress(serviceId, "name", e.target.value)}
              className="h-12"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
            <Input
              name={`businessAddress_${serviceId}_line1`}
              placeholder="123 Main Street"
              value={address.line1 || ""}
              onChange={(e) => updateBusinessAddress(serviceId, "line1", e.target.value)}
              className={`h-12 ${errors[`${serviceId}.businessAddress.line1`] ? "border-red-300" : ""}`}
            />
            {errors[`${serviceId}.businessAddress.line1`] && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors[`${serviceId}.businessAddress.line1`]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 2 <span className="text-gray-400">(optional)</span>
            </label>
            <Input
              placeholder="Suite 100"
              value={address.line2 || ""}
              onChange={(e) => updateBusinessAddress(serviceId, "line2", e.target.value)}
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <Input
                name={`businessAddress_${serviceId}_city`}
                placeholder="New York"
                value={address.city || ""}
                onChange={(e) => updateBusinessAddress(serviceId, "city", e.target.value)}
                className={`h-12 ${errors[`${serviceId}.businessAddress.city`] ? "border-red-300" : ""}`}
              />
              {errors[`${serviceId}.businessAddress.city`] && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors[`${serviceId}.businessAddress.city`]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
              <Select
                value={address.state || ""}
                onValueChange={(value) => updateBusinessAddress(serviceId, "state", value)}
              >
                <SelectTrigger
                  className={`h-12 ${errors[`${serviceId}.businessAddress.state`] ? "border-red-300" : ""}`}
                >
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors[`${serviceId}.businessAddress.state`] && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors[`${serviceId}.businessAddress.state`]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
              <Input
                name={`businessAddress_${serviceId}_zipCode`}
                placeholder="10001"
                value={address.zipCode || ""}
                onChange={(e) => updateBusinessAddress(serviceId, "zipCode", e.target.value)}
                className={`h-12 ${errors[`${serviceId}.businessAddress.zipCode`] ? "border-red-300" : ""}`}
                data-testid={`mobile-${serviceId}-zipcode`}
              />
              {errors[`${serviceId}.businessAddress.zipCode`] && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors[`${serviceId}.businessAddress.zipCode`]}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
              <Select
                value={address.country || ""}
                onValueChange={(value) => updateBusinessAddress(serviceId, "country", value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-gray-400">(optional)</span>
              </label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={address.phone || ""}
                onChange={(e) => updateBusinessAddress(serviceId, "phone", e.target.value)}
                className="h-12"
              />
            </div>
          </div>
        </div>
      );
    },
    [errors, updateBusinessAddress]
  );

  const renderAddressForm = useCallback(
    (address: Address) => {
      const prefix = address.id;

      return (
        <div className="space-y-4" data-testid={`address-form-${address.id}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location Name</label>
            <Input
              name={`address_${address.id}_name`}
              value={address.name || ""}
              onChange={(e) => handleAddressChange(address.id, "name", e.target.value)}
              className="h-12"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
            <Input
              name={`address_${prefix}_line1`}
              placeholder="123 Main Street"
              value={address.line1 || ""}
              onChange={(e) => handleAddressChange(address.id, "line1", e.target.value)}
              className={`h-12 ${errors[`${prefix}.line1`] ? "border-red-300" : ""}`}
            />
            {errors[`${prefix}.line1`] && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors[`${prefix}.line1`]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 2 <span className="text-gray-400">(optional)</span>
            </label>
            <Input
              placeholder="Suite 100"
              value={address.line2 || ""}
              onChange={(e) => handleAddressChange(address.id, "line2", e.target.value)}
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <Input
                name={`address_${prefix}_city`}
                placeholder="New York"
                value={address.city || ""}
                onChange={(e) => handleAddressChange(address.id, "city", e.target.value)}
                className={`h-12 ${errors[`${prefix}.city`] ? "border-red-300" : ""}`}
              />
              {errors[`${prefix}.city`] && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors[`${prefix}.city`]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
              <Select
                value={address.state || ""}
                onValueChange={(value) => handleAddressChange(address.id, "state", value)}
              >
                <SelectTrigger
                  className={`h-12 ${errors[`${prefix}.state`] ? "border-red-300" : ""}`}
                >
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors[`${prefix}.state`] && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors[`${prefix}.state`]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
              <Input
                name={`address_${prefix}_zipCode`}
                placeholder="10001"
                value={address.zipCode || ""}
                onChange={(e) => handleAddressChange(address.id, "zipCode", e.target.value)}
                className={`h-12 ${errors[`${prefix}.zipCode`] ? "border-red-300" : ""}`}
                data-testid={`address-${address.id}-zipcode`}
              />
              {errors[`${prefix}.zipCode`] && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors[`${prefix}.zipCode`]}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
              <Select
                value={address.country || ""}
                onValueChange={(value) => handleAddressChange(address.id, "country", value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-gray-400">(optional)</span>
              </label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={address.phone || ""}
                onChange={(e) => handleAddressChange(address.id, "phone", e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          {/* Address Validation */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {address.isValidated || address.suggestedAddress?.isValidated ? (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Address verified</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">Address not verified</span>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => validateAddress(address.id)}
                disabled={isValidating === address.id || !address.line1 || !address.city}
                className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent"
                loading={isValidating === address.id}
              >
                Validate Address
              </Button>
            </div>

            {errors[`${address.id}.validation`] && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors[`${address.id}.validation`]}
                </p>
              </div>
            )}

            {showSuggestion === address.id && address.suggestedAddress && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Suggested standardized address:</h4>
                <div className="text-sm text-blue-800 mb-3">
                  <p>{address.suggestedAddress.line1}</p>
                  {address.suggestedAddress.line2 && <p>{address.suggestedAddress.line2}</p>}
                  <p>
                    {address.suggestedAddress.city}, {address.suggestedAddress.state}{" "}
                    {address.suggestedAddress.zipCode}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => acceptSuggestedAddress(address.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Use Suggested
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => keepOriginalAddress(address.id)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
                  >
                    Keep Original
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    },
    [
      errors,
      handleAddressChange,
      isValidating,
      showSuggestion,
      validateAddress,
      acceptSuggestedAddress,
      keepOriginalAddress,
    ]
  );

  const getConfigurationStatus = useMemo(() => {
    const configured = [];
    if (
      formData.serviceTypes.physical &&
      formData.addresses.some((addr) => addr.line1 && addr.city)
    ) {
      configured.push("Physical");
    }
    if (
      formData.serviceTypes.mobile &&
      formData.mobileServices.length > 0 &&
      formData.mobileServices.some((service) => {
        const serviceArea = service.serviceArea;
        if (!serviceArea?.type) return false;

        const hasName = service.name?.trim();
        const hasRadius = serviceArea.radius && serviceArea.radius > 0;

        switch (serviceArea.type) {
          case "radius_zip_code":
            return hasName && hasRadius && serviceArea.zipCenter?.trim();
          case "radius_address":
            return hasName && hasRadius && service.businessAddress;
          case "zip_codes":
            return (
              hasName &&
              hasRadius &&
              serviceArea.zipCodesRaw &&
              serviceArea.zipCodesRaw.trim().length > 0
            );
          default:
            return false;
        }
      })
    ) {
      configured.push("Mobile");
    }
    if (formData.serviceTypes.virtual && formData.virtualServices.length > 0) {
      configured.push("Virtual");
    }
    return configured;
  }, [formData]);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4"
      data-testid={isFormReady ? "form-ready" : "form-loading"}
    >
      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <OnboardingProgressBar
          currentStep={getStepInfo("business-location").currentStep}
          totalSteps={getStepInfo("business-location").totalSteps}
          stepName={getStepInfo("business-location").stepName}
          goPrevious={() => router.push(goPrevious(businessLocationPage)?.pageRef ?? "")}
          user={user?.email ?? ""}
        />

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-4">
            How do you provide services?
          </h1>
          <p className="text-lg text-gray-600">
            Select all the ways you deliver services to customers.
          </p>
        </div>

        {isLoading ? (
          <Card className="bg-white border-0 shadow-xl mb-8">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LoadingSpinner size="md" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Loading your location settings...
              </h3>
              <p className="text-gray-600">
                We&apos;re fetching your saved location preferences and configurations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleFormSubmit} data-testid="business-location-form">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Service Delivery Methods
                </h2>
                <p className="text-gray-600 mb-6">Check all that apply:</p>

                {errors.serviceTypes && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {errors.serviceTypes}
                    </p>
                  </div>
                )}

                {errors.business_location && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {errors.business_location}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {serviceTypeOptions.map((type) => (
                    <div key={type.id} className="border border-gray-200 rounded-lg">
                      <div className="p-4">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={type.id}
                            name={`serviceType_${type.id}`}
                            checked={
                              formData.serviceTypes[type.id as keyof typeof formData.serviceTypes]
                            }
                            onCheckedChange={(checked) =>
                              handleServiceTypeChange(
                                type.id as keyof typeof formData.serviceTypes,
                                checked as boolean
                              )
                            }
                            data-testid={`service-type-${type.id}`}
                          />
                          <input
                            type="hidden"
                            name={`serviceType_${type.id}`}
                            value={
                              formData.serviceTypes[type.id as keyof typeof formData.serviceTypes]
                                ? "true"
                                : "false"
                            }
                          />
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="text-orange-500">{type.icon}</div>
                            <div>
                              <Label
                                htmlFor={type.id}
                                className="font-medium text-gray-900 cursor-pointer"
                              >
                                {type.title}
                              </Label>
                              <p className="text-sm text-gray-600">{type.subtitle}</p>
                            </div>
                          </div>
                          {formData.serviceTypes[type.id as keyof typeof formData.serviceTypes] && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSection(type.id)}
                              className="text-gray-500 hover:text-gray-700"
                              type="button"
                            >
                              {expandedSections[type.id] ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {formData.serviceTypes[type.id as keyof typeof formData.serviceTypes] &&
                        expandedSections[type.id] && (
                          <div
                            className="border-t border-gray-200 p-6 bg-gray-50"
                            data-testid={`${type.id}-section-expanded`}
                          >
                            {type.id === "physical" && (
                              <div data-testid="physical-locations-section">
                                <h3 className="font-medium text-gray-900 mb-4">
                                  Physical Locations Configuration
                                </h3>
                                {formData.addresses.map((address, index) => (
                                  <div key={address.id} className="mb-8">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg font-medium text-gray-900">
                                        {address.name}
                                      </h4>
                                      {formData.addresses.length > 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeLocation(address.id)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          type="button"
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Remove
                                        </Button>
                                      )}
                                    </div>

                                    {renderAddressForm(address)}

                                    {index < formData.addresses.length - 1 && (
                                      <div className="border-b border-gray-200 mt-8" />
                                    )}
                                  </div>
                                ))}

                                <Button
                                  variant="outline"
                                  onClick={addLocation}
                                  className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent"
                                  type="button"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Another Location
                                </Button>
                              </div>
                            )}

                            {type.id === "mobile" && (
                              <div className="space-y-8" data-testid="mobile-services-section">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium text-gray-900">
                                    Mobile Service Configurations
                                  </h3>
                                  <Button
                                    variant="outline"
                                    onClick={addMobileService}
                                    className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent"
                                    type="button"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Mobile Service
                                  </Button>
                                </div>

                                {errors.mobileServices && (
                                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-sm flex items-center">
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      {errors.mobileServices}
                                    </p>
                                  </div>
                                )}

                                {formData.mobileServices.map((mobileService, index) => (
                                  <div
                                    key={mobileService.id}
                                    className="border border-gray-200 rounded-lg p-6"
                                    data-testid={`mobile-service-card-${index}`}
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg font-medium text-gray-900">
                                        {mobileService.name}
                                      </h4>
                                      {formData.mobileServices.length > 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeMobileService(mobileService.id)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          type="button"
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Remove
                                        </Button>
                                      )}
                                    </div>

                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Service Name
                                        </label>
                                        <Input
                                          value={mobileService.name}
                                          onChange={(e) =>
                                            updateMobileService(
                                              mobileService.id,
                                              "name",
                                              e.target.value
                                            )
                                          }
                                          className="h-12"
                                        />
                                      </div>

                                      <div className="space-y-4">
                                        <h5 className="font-medium text-gray-900">
                                          Service Area Configuration
                                        </h5>
                                        <div className="space-y-4">
                                          <div className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center space-x-3 mb-3">
                                              <input
                                                type="radio"
                                                id={`radius_${mobileService.id}`}
                                                name={`serviceAreaType_${mobileService.id}`}
                                                checked={
                                                  mobileService.serviceArea?.type ===
                                                  "radius_zip_code"
                                                }
                                                onChange={() =>
                                                  updateMobileService(
                                                    mobileService.id,
                                                    "serviceArea",
                                                    {
                                                      ...mobileService.serviceArea,
                                                      type: "radius_zip_code",
                                                    }
                                                  )
                                                }
                                                className="w-4 h-4 text-orange-600"
                                                data-testid={`mobile-${mobileService.id}-radius-radio`}
                                              />
                                              <Label
                                                htmlFor={`radius_${mobileService.id}`}
                                                className="font-medium"
                                              >
                                                Radius from ZIP code
                                              </Label>
                                            </div>

                                            {mobileService.serviceArea?.type ===
                                              "radius_zip_code" && (
                                              <div className="ml-6 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                      Center ZIP Code *
                                                    </label>
                                                    <Input
                                                      placeholder="10001"
                                                      value={
                                                        mobileService.serviceArea.zipCenter || ""
                                                      }
                                                      onChange={(e) =>
                                                        updateMobileService(
                                                          mobileService.id,
                                                          "serviceArea",
                                                          {
                                                            ...mobileService.serviceArea,
                                                            zipCenter: e.target.value,
                                                          }
                                                        )
                                                      }
                                                      className={`h-12 ${errors[`mobileService_${index}.zipCenter`] ? "border-red-300" : ""}`}
                                                      data-testid={`mobile-${mobileService.id}-center-zipcode`}
                                                    />
                                                    {errors[`mobileService_${index}.zipCenter`] && (
                                                      <p className="text-red-500 text-sm mt-1 flex items-center">
                                                        <AlertCircle className="w-4 h-4 mr-1" />
                                                        {errors[`mobileService_${index}.zipCenter`]}
                                                      </p>
                                                    )}
                                                  </div>

                                                  <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                      Service Radius
                                                    </label>
                                                    <Select
                                                      value={mobileService.serviceArea.radius?.toString()}
                                                      onValueChange={(value) =>
                                                        updateMobileService(
                                                          mobileService.id,
                                                          "serviceArea",
                                                          {
                                                            ...mobileService.serviceArea,
                                                            radius: Number.parseInt(value),
                                                          }
                                                        )
                                                      }
                                                    >
                                                      <SelectTrigger className="h-12">
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {SERVICE_RADIUS_OPTIONS.map((radius) => (
                                                          <SelectItem
                                                            key={radius}
                                                            value={radius.toString()}
                                                          >
                                                            {radius} miles
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          <div className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center space-x-3 mb-3">
                                              <input
                                                type="radio"
                                                id={`businessRadius_${mobileService.id}`}
                                                name={`serviceAreaType_${mobileService.id}`}
                                                checked={
                                                  mobileService.serviceArea?.type ===
                                                  "radius_address"
                                                }
                                                onChange={() =>
                                                  updateMobileService(
                                                    mobileService.id,
                                                    "serviceArea",
                                                    {
                                                      ...mobileService.serviceArea,
                                                      type: "radius_address",
                                                    }
                                                  )
                                                }
                                                className="w-4 h-4 text-orange-600"
                                              />
                                              <Label
                                                htmlFor={`businessRadius_${mobileService.id}`}
                                                className="font-medium"
                                              >
                                                Radius from Address
                                              </Label>
                                            </div>

                                            {mobileService.serviceArea?.type ===
                                              "radius_address" && (
                                              <>
                                                <div className="ml-6">
                                                  {mobileService.businessAddress &&
                                                    renderBusinessAddressForm(
                                                      mobileService.businessAddress,
                                                      mobileService.id
                                                    )}
                                                </div>
                                                <div className="m-6">
                                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Service Radius
                                                  </label>
                                                  <Select
                                                    value={mobileService.serviceArea?.radius?.toString()}
                                                    onValueChange={(value) =>
                                                      updateMobileService(
                                                        mobileService.id,
                                                        "serviceArea",
                                                        {
                                                          ...mobileService.serviceArea,
                                                          radius: Number.parseInt(value),
                                                        }
                                                      )
                                                    }
                                                  >
                                                    <SelectTrigger className="h-12">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      {SERVICE_RADIUS_OPTIONS.map((radius) => (
                                                        <SelectItem
                                                          key={radius}
                                                          value={radius.toString()}
                                                        >
                                                          {radius} miles
                                                        </SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </>
                                            )}
                                          </div>

                                          <div className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center space-x-3 mb-3">
                                              <input
                                                type="radio"
                                                id={`zipcodes_${mobileService.id}`}
                                                name={`serviceAreaType_${mobileService.id}`}
                                                checked={
                                                  mobileService.serviceArea?.type === "zip_codes"
                                                }
                                                onChange={() =>
                                                  updateMobileService(
                                                    mobileService.id,
                                                    "serviceArea",
                                                    {
                                                      ...mobileService.serviceArea,
                                                      type: "zip_codes",
                                                    }
                                                  )
                                                }
                                                className="w-4 h-4 text-orange-600"
                                              />
                                              <Label
                                                htmlFor={`zipcodes_${mobileService.id}`}
                                                className="font-medium"
                                              >
                                                Specific ZIP codes
                                              </Label>
                                            </div>

                                            {mobileService.serviceArea?.type === "zip_codes" && (
                                              <div className="ml-6">
                                                <Textarea
                                                  placeholder="10001, 10002, 10003..."
                                                  value={
                                                    mobileService.serviceArea?.zipCodesRaw || ""
                                                  }
                                                  onChange={(e) =>
                                                    updateMobileService(
                                                      mobileService.id,
                                                      "serviceArea",
                                                      {
                                                        ...mobileService.serviceArea,
                                                        zipCodesRaw: e.target.value,
                                                      }
                                                    )
                                                  }
                                                  className="min-h-[100px]"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                  Enter ZIP codes separated by commas
                                                </p>
                                                {errors[`mobileService_${index}.zipCodes`] && (
                                                  <p className="text-red-500 text-sm mt-1 flex items-center">
                                                    <AlertCircle className="w-4 h-4 mr-1" />
                                                    {errors[`mobileService_${index}.zipCodes`]}
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {type.id === "virtual" && (
                              <div className="space-y-8" data-testid="virtual-services-section">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium text-gray-900">
                                    Virtual Group Configurations
                                  </h3>
                                  <Button
                                    variant="outline"
                                    onClick={addVirtualService}
                                    className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent"
                                    type="button"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Virtual Group
                                  </Button>
                                </div>

                                {errors.virtualServices && (
                                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-sm flex items-center">
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      {errors.virtualServices}
                                    </p>
                                  </div>
                                )}

                                {formData.virtualServices.map((virtualService) => (
                                  <div
                                    key={virtualService.id}
                                    className="border border-gray-200 rounded-lg p-6"
                                    data-testid={`virtual-service-card-${virtualService.id}`}
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg font-medium text-gray-900">
                                        {virtualService.name}
                                      </h4>
                                      {formData.virtualServices.length > 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeVirtualService(virtualService.id)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          type="button"
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Remove
                                        </Button>
                                      )}
                                    </div>

                                    <div className="space-y-6">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Service Name
                                        </label>
                                        <Input
                                          value={virtualService.name}
                                          onChange={(e) =>
                                            updateVirtualService(
                                              virtualService.id,
                                              "name",
                                              e.target.value
                                            )
                                          }
                                          className="h-12"
                                          data-testid="virtual-service-name"
                                          data-id={virtualService.id}
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Video Platform
                                        </label>
                                        <Select
                                          value={virtualService.platform}
                                          onValueChange={(value) =>
                                            updateVirtualService(
                                              virtualService.id,
                                              "platform",
                                              value
                                            )
                                          }
                                        >
                                          <SelectTrigger
                                            className="h-12"
                                            data-testid="virtual-platform-trigger"
                                            data-id={virtualService.id}
                                          >
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {VIRTUAL_MEETING_PLATFORMS.map((platform) => (
                                              <SelectItem key={platform.id} value={platform.id}>
                                                {platform.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Default Meeting Link{" "}
                                          <span className="text-gray-400">(optional)</span>
                                        </label>
                                        <Input
                                          placeholder="https://zoom.us/j/123456789"
                                          value={virtualService.defaultLink}
                                          onChange={(e) =>
                                            updateVirtualService(
                                              virtualService.id,
                                              "defaultLink",
                                              e.target.value
                                            )
                                          }
                                          className="h-12"
                                          data-testid="virtual-meeting-link"
                                          data-id={virtualService.id}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                          You can customize this for each appointment
                                        </p>
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Instructions for Clients{" "}
                                          <span className="text-gray-400">(optional)</span>
                                        </label>
                                        <Textarea
                                          placeholder="Please join the meeting 5 minutes early. Make sure you have a stable internet connection..."
                                          value={virtualService.instructions}
                                          onChange={(e) =>
                                            updateVirtualService(
                                              virtualService.id,
                                              "instructions",
                                              e.target.value
                                            )
                                          }
                                          className="min-h-[100px]"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Time Zone
                                        </label>
                                        <Select
                                          value={virtualService.timezone}
                                          onValueChange={(value) =>
                                            updateVirtualService(
                                              virtualService.id,
                                              "timezone",
                                              value
                                            )
                                          }
                                        >
                                          <SelectTrigger className="h-12">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {SUPPORTED_TIMEZONES.map((tz) => (
                                              <SelectItem key={tz} value={tz}>
                                                {tz.replace("America/", "").replace("_", " ")}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <div className="flex items-center space-x-2 mt-2">
                                          <Clock className="w-4 h-4 text-gray-400" />
                                          <span className="text-xs text-gray-500">
                                            Current time in timezone:{" "}
                                            {formatTimeInTimezone(
                                              virtualService.timezone as TimeZoneId
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration Summary */}
              {Object.values(formData.serviceTypes).some(Boolean) && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Configuration Summary
                  </h2>
                  <div className="space-y-3">
                    {formData.serviceTypes.physical && (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Store className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-900">Physical Locations</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {formData.addresses.some((addr) => addr.line1 && addr.city) ? (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">Configured</span>
                            </>
                          ) : (
                            <span className="text-sm text-orange-600">Needs configuration</span>
                          )}
                        </div>
                      </div>
                    )}

                    {formData.serviceTypes.mobile && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Car className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Mobile Services</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {formData.mobileServices.length > 0 &&
                          formData.mobileServices.some((service) => {
                            const serviceArea = service.serviceArea;
                            if (!serviceArea?.type) return false;

                            const hasName = service.name?.trim();
                            const hasRadius = serviceArea.radius && serviceArea.radius > 0;

                            switch (serviceArea.type) {
                              case "radius_zip_code":
                                return hasName && hasRadius && serviceArea.zipCenter?.trim();
                              case "radius_address":
                                return hasName && hasRadius && service.businessAddress;
                              case "zip_codes":
                                return (
                                  hasName &&
                                  hasRadius &&
                                  serviceArea.zipCodesRaw &&
                                  serviceArea.zipCodesRaw.trim().length > 0
                                );
                              default:
                                return false;
                            }
                          }) ? (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">Configured</span>
                            </>
                          ) : (
                            <span className="text-sm text-orange-600">Needs configuration</span>
                          )}
                        </div>
                      </div>
                    )}

                    {formData.serviceTypes.virtual && (
                      <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Video className="w-5 h-5 text-purple-600" />
                          <span className="font-medium text-purple-900">Virtual Groups</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {formData.virtualServices.length > 0 ? (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">Configured</span>
                            </>
                          ) : (
                            <span className="text-sm text-orange-600">Needs configuration</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {getConfigurationStatus.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ {getConfigurationStatus.join(", ")} service delivery method
                        {getConfigurationStatus.length > 1 ? "s" : ""} configured
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => router.push(goPrevious(businessLocationPage)?.pageRef ?? "")}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                  type="button"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-8"
                  variant="primary"
                  data-testid="continue-button"
                  loading={isSaving}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
