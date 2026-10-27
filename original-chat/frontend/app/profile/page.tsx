"use client";

import type React from "react";

import { useAuth } from "@/app/hooks/useAuth";
import { createClient } from "@/app/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Check,
  Mail,
  Phone,
  Save,
  User,
  MapPin,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProfileResponse } from "../types/apiTypes";
import { Address } from "../types/businessTypes";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";
import { updateProfile } from "./actions";
import { US_STATES, COUNTRIES } from "../constants/businessConstants";
import { Label } from "@/components/ui/label";

// Generate location ID
const generateLocationId = (): string => {
  return `location-${crypto.randomUUID()}`;
};

// Create default location
const createDefaultLocation = (): Address => ({
  id: generateLocationId(),
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "US",
  isValidated: false,
});

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState(""); // Read-only
  const [canUseCurrentLocation, setCanUseCurrentLocation] = useState(false);
  const [locations, setLocations] = useState<Address[]>([]);
  const [primaryLocation, setPrimaryLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState<string | null>(null);
  const supabase = createClient();
  const searchparams = useSearchParams();
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl("/login", currentPath));
    }
  }, [authLoading, user, router]);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        setDataLoading(true);

        // Get user profile data
        const profileResponse = await fetch("/api/profile");
        const profileData: ProfileResponse = await profileResponse.json();

        if (profileData) {
          // Split fullName into firstName and lastName
          setFirstName(profileData.firstName || "");
          setLastName(profileData.lastName || "");
          setPhoneNumber(profileData.phoneNumber || "");
          setCanUseCurrentLocation(profileData.canUseCurrentLocation || false);
          setLocations((profileData.locations as unknown as Address[]) || []);
          setPrimaryLocation(profileData.primaryLocationId || "");
        }

        // Set email from auth user
        setEmail(user.email || "");
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user, supabase]);

  // Update primary location options when locations or canUseCurrentLocation changes
  useEffect(() => {
    if (canUseCurrentLocation && !primaryLocation) {
      setPrimaryLocation("current_location");
    } else if (!canUseCurrentLocation && primaryLocation === "current_location") {
      setPrimaryLocation("");
    }
  }, [canUseCurrentLocation, primaryLocation]);

  // Location management functions
  const addLocation = useCallback(() => {
    if (locations.length >= 3) return;
    setLocations((prev) => [...prev, createDefaultLocation()]);
  }, [locations.length]);

  const removeLocation = useCallback(
    (locationId: string) => {
      setLocations((prev) => {
        const updated = prev.filter((loc) => loc.id !== locationId);
        // If removed location was primary, reset primary location
        if (primaryLocation === locationId) {
          setPrimaryLocation(canUseCurrentLocation ? "current_location" : "");
        }
        return updated;
      });
    },
    [primaryLocation, canUseCurrentLocation]
  );

  const updateLocation = useCallback(
    (locationId: string, field: keyof Address, value: string | boolean) => {
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId ? { ...loc, [field]: value, isValidated: false } : loc
        )
      );

      // Clear errors for the field being edited
      setErrors((prev) => {
        const errorKey = `${locationId}.${field}`;
        if (prev[errorKey]) {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        }
        return prev;
      });
    },
    []
  );

  // Address validation functions (copied from business-location page)
  const validateAddress = useCallback(
    async (locationId: string) => {
      const location = locations.find((loc) => loc.id === locationId);
      if (!location) return;

      setIsValidating(locationId);

      try {
        const response = await fetch("/api/business/address-validation", {
          method: "POST",
          body: JSON.stringify({ address: location }),
        });
        const data = await response.json();

        const suggestedAddress: Address = {
          ...location,
          line1: data.addressLines[0].replace(/\b\w/g, (l: string) => l.toUpperCase()),
          line2: data.addressLines[1] || "",
          city: data.locality.replace(/\b\w/g, (l: string) => l.toUpperCase()),
          zipCode: data.postalCode.replace(/(\d{5})(\d{4})/, "$1-$2"),
          isValidated: true,
          state: data.administrativeArea,
          country: data.regionCode,
        };

        setLocations((prev) =>
          prev.map((loc) => (loc.id === locationId ? { ...loc, suggestedAddress } : loc))
        );

        setShowSuggestion(locationId);
      } catch {
        setErrors((prev) => ({
          ...prev,
          [`${locationId}.validation`]: "Address validation failed. Please try again.",
        }));
      } finally {
        setIsValidating(null);
      }
    },
    [locations]
  );

  const acceptSuggestedAddress = useCallback((locationId: string) => {
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id === locationId && loc.suggestedAddress) {
          return {
            ...loc,
            ...loc.suggestedAddress,
            isValidated: true,
            suggestedAddress: undefined,
          };
        }
        return loc;
      })
    );
    setShowSuggestion(null);
  }, []);

  const keepOriginalAddress = useCallback((locationId: string) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId ? { ...loc, isValidated: true, suggestedAddress: undefined } : loc
      )
    );
    setShowSuggestion(null);
  }, []);

  // Form validation
  const validateForm = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    const numCount = phoneNumber.match(/\d/g)?.length ?? 0;
    if (!phoneNumber.trim() || numCount < 10) {
      newErrors.phoneNumber = "Phone number is required";
    }

    // Validate locations
    if (!canUseCurrentLocation) {
      if (locations.length === 0) {
        newErrors.locations = "At least one location is required when not using current location";
      } else {
        locations.forEach((location) => {
          if (!location.name.trim()) {
            newErrors[`${location.id}.name`] = "Location name is required";
          }
          if (!location.line1.trim()) {
            newErrors[`${location.id}.line1`] = "Address line 1 is required";
          }
          if (!location.city.trim()) {
            newErrors[`${location.id}.city`] = "City is required";
          }
          if (!location.state) {
            newErrors[`${location.id}.state`] = "State is required";
          }
          if (!location.zipCode.trim()) {
            newErrors[`${location.id}.zipCode`] = "ZIP code is required";
          }
          if (!location.country) {
            newErrors[`${location.id}.country`] = "Country is required";
          }
        });
      }
    }

    // Validate primary location
    if (!primaryLocation) {
      newErrors.primaryLocation = "Primary location is required";
    } else if (primaryLocation !== "current_location") {
      const locationExists = locations.some((loc) => loc.id === primaryLocation);
      if (!locationExists) {
        newErrors.primaryLocation = "Selected primary location does not exist";
      }
    }

    return newErrors;
  }, [firstName, lastName, phoneNumber, canUseCurrentLocation, locations, primaryLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate form
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Scroll to first error field
      const firstErrorKey = Object.keys(validationErrors)[0];
      setTimeout(() => {
        if (
          firstErrorKey === "firstName" ||
          firstErrorKey === "lastName" ||
          firstErrorKey === "phoneNumber"
        ) {
          const element = document.getElementById(firstErrorKey);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
          element?.focus();
        } else if (firstErrorKey === "primaryLocation") {
          const element = document.getElementById("primaryLocation");
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (firstErrorKey === "locations") {
          const locationsSection = document.querySelector("[data-locations-section]");
          locationsSection?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          // Location field error - find the location card
          const locationId = firstErrorKey.split(".")[0];
          const locationCard = document.querySelector(`[data-location-id="${locationId}"]`);
          locationCard?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("phoneNumber", phoneNumber.trim());
      formData.append("canUseCurrentLocation", canUseCurrentLocation.toString());
      formData.append("locations", JSON.stringify(locations));
      formData.append("primaryLocation", primaryLocation);

      const result = await updateProfile(formData);

      if (!result.success) {
        throw new Error(result.error || "Failed to update profile");
      }

      setIsSaved(true);

      // Redirect to next page.
      const next = searchparams.get("next");
      if (next) {
        router.push(next);
        return;
      }
      router.push("/");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(error instanceof Error ? error.message : "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Remove all non-digits first
    let digits = value.replace(/\D/g, "");

    // If starts with 1, remove it (US country code)
    if (digits.startsWith("1")) {
      digits = digits.slice(1);
    }

    // Limit to 10 digits max for US phone numbers
    digits = digits.slice(0, 10);

    // Format based on number of digits
    if (digits.length === 0) {
      value = "";
    } else if (digits.length <= 3) {
      value = `+1 (${digits}`;
    } else if (digits.length <= 6) {
      value = `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      value = `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    setPhoneNumber(value);
  };

  // Show loading state while authenticating
  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  const initials =
    `${firstName} ${lastName}`
      .trim()
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user.email?.charAt(0).toUpperCase() ||
    "U";

  const displayName = `${firstName} ${lastName}`.trim() || email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header */}
      <header className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="p-2" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-xl font-bold text-gray-900">easerva.com</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            onClick={() => router.push("/")}
          >
            Back to Home
          </Button>
        </div>
      </header>

      {/* Profile Settings */}
      <div className="flex items-start justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Profile{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                Settings
              </span>
            </h1>
            <p className="text-lg text-gray-600">
              Update your personal information and preferences
            </p>
          </div>

          {/* Profile Card */}
          <Card className="bg-white border-0 shadow-xl mb-6">
            <CardContent className="p-8">
              {/* Profile Avatar Section */}
              <div className="flex items-center space-x-4 pb-6 border-b border-gray-100">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{initials}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{displayName}</h3>
                  <p className="text-gray-500">
                    Member since{" "}
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })
                      : "Recently"}
                  </p>
                </div>
              </div>

              {dataLoading ? (
                <div className="text-center py-8">
                  <LoadingSpinner size="sm" text="Loading profile data..." />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* First Name Field */}
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      First Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Enter your first name"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (errors.firstName) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.firstName;
                              return newErrors;
                            });
                          }
                        }}
                        className={`pl-10 h-12 text-base border-gray-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-300 ${
                          errors.firstName ? "border-red-300" : ""
                        }`}
                        required
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  {/* Last Name Field */}
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Last Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Enter your last name"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          if (errors.lastName) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.lastName;
                              return newErrors;
                            });
                          }
                        }}
                        className={`pl-10 h-12 text-base border-gray-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-300 ${
                          errors.lastName ? "border-red-300" : ""
                        }`}
                        required
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>

                  {/* Email Field (Read-only) */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        className="pl-10 h-12 text-base border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                        disabled
                        readOnly
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Email address cannot be changed. Contact support if you need to update this.
                    </p>
                  </div>

                  {/* Phone Number Field */}
                  <div>
                    <label
                      htmlFor="phoneNumber"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phoneNumber}
                        onChange={(e) => {
                          handlePhoneChange(e);
                          if (errors.phoneNumber) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.phoneNumber;
                              return newErrors;
                            });
                          }
                        }}
                        className={`pl-10 h-12 text-base border-gray-200 focus:ring-2 focus:ring-orange-300 focus:border-orange-300 ${
                          errors.phoneNumber ? "border-red-300" : ""
                        }`}
                        maxLength={18}
                        required
                      />
                    </div>
                    {errors.phoneNumber && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.phoneNumber}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      We&apos;ll use this number to contact you about your property viewings.
                    </p>
                  </div>

                  {/* Can Use Current Location Switch */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <Label
                        htmlFor="canUseCurrentLocation"
                        className="text-sm font-medium text-gray-900"
                      >
                        Use Current Location
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Allow the app to use your current location as your primary location
                      </p>
                    </div>
                    <Switch
                      id="canUseCurrentLocation"
                      checked={canUseCurrentLocation}
                      onCheckedChange={(checked) => {
                        setCanUseCurrentLocation(checked);
                        if (checked && !primaryLocation) {
                          setPrimaryLocation("current_location");
                        } else if (!checked && primaryLocation === "current_location") {
                          setPrimaryLocation("");
                        }
                      }}
                    />
                  </div>

                  {/* Locations Section */}
                  <div className="space-y-4" data-locations-section>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Locations</h3>
                        <p className="text-sm text-gray-500">
                          {canUseCurrentLocation
                            ? "Add up to 3 locations (optional)"
                            : "Add at least one location (max 3)"}
                        </p>
                      </div>
                      {locations.length < 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addLocation}
                          className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Location
                        </Button>
                      )}
                    </div>

                    {errors.locations && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          {errors.locations}
                        </p>
                      </div>
                    )}

                    {locations.map((location, index) => (
                      <Card
                        key={location.id}
                        className="border border-gray-200"
                        data-location-id={location.id}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-md font-medium text-gray-900">
                              Location {index + 1}
                            </h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLocation(location.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            {/* Location Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Location Name *
                              </label>
                              <Input
                                value={location.name}
                                onChange={(e) =>
                                  updateLocation(location.id, "name", e.target.value)
                                }
                                placeholder="Home, Office, etc."
                                className={`h-12 ${
                                  errors[`${location.id}.name`] ? "border-red-300" : ""
                                }`}
                              />
                              {errors[`${location.id}.name`] && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  {errors[`${location.id}.name`]}
                                </p>
                              )}
                            </div>

                            {/* Address Line 1 */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address Line 1 *
                              </label>
                              <Input
                                value={location.line1}
                                onChange={(e) =>
                                  updateLocation(location.id, "line1", e.target.value)
                                }
                                placeholder="123 Main Street"
                                className={`h-12 ${
                                  errors[`${location.id}.line1`] ? "border-red-300" : ""
                                }`}
                              />
                              {errors[`${location.id}.line1`] && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  {errors[`${location.id}.line1`]}
                                </p>
                              )}
                            </div>

                            {/* Address Line 2 */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address Line 2 <span className="text-gray-400">(optional)</span>
                              </label>
                              <Input
                                value={location.line2}
                                onChange={(e) =>
                                  updateLocation(location.id, "line2", e.target.value)
                                }
                                placeholder="Suite 100"
                                className="h-12"
                              />
                            </div>

                            {/* City, State, ZIP */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  City *
                                </label>
                                <Input
                                  value={location.city}
                                  onChange={(e) =>
                                    updateLocation(location.id, "city", e.target.value)
                                  }
                                  placeholder="New York"
                                  className={`h-12 ${
                                    errors[`${location.id}.city`] ? "border-red-300" : ""
                                  }`}
                                />
                                {errors[`${location.id}.city`] && (
                                  <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {errors[`${location.id}.city`]}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  State *
                                </label>
                                <Select
                                  value={location.state}
                                  onValueChange={(value) =>
                                    updateLocation(location.id, "state", value)
                                  }
                                >
                                  <SelectTrigger
                                    className={`h-12 ${
                                      errors[`${location.id}.state`] ? "border-red-300" : ""
                                    }`}
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
                                {errors[`${location.id}.state`] && (
                                  <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {errors[`${location.id}.state`]}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  ZIP Code *
                                </label>
                                <Input
                                  value={location.zipCode}
                                  onChange={(e) =>
                                    updateLocation(location.id, "zipCode", e.target.value)
                                  }
                                  placeholder="10001"
                                  className={`h-12 ${
                                    errors[`${location.id}.zipCode`] ? "border-red-300" : ""
                                  }`}
                                />
                                {errors[`${location.id}.zipCode`] && (
                                  <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {errors[`${location.id}.zipCode`]}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Country */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Country *
                              </label>
                              <Select
                                value={location.country}
                                onValueChange={(value) =>
                                  updateLocation(location.id, "country", value)
                                }
                              >
                                <SelectTrigger
                                  className={`h-12 ${
                                    errors[`${location.id}.country`] ? "border-red-300" : ""
                                  }`}
                                >
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
                              {errors[`${location.id}.country`] && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  {errors[`${location.id}.country`]}
                                </p>
                              )}
                            </div>

                            {/* Address Validation */}
                            <div className="border-t border-gray-200 pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {location.isValidated ||
                                  location.suggestedAddress?.isValidated ? (
                                    <>
                                      <Check className="w-5 h-5 text-green-500" />
                                      <span className="text-sm font-medium text-green-700">
                                        Address verified
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <MapPin className="w-5 h-5 text-gray-400" />
                                      <span className="text-sm text-gray-600">
                                        Address not verified
                                      </span>
                                    </>
                                  )}
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => validateAddress(location.id)}
                                  disabled={
                                    isValidating === location.id ||
                                    !location.line1 ||
                                    !location.city
                                  }
                                  className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent"
                                >
                                  {isValidating === location.id ? (
                                    <div className="flex items-center space-x-2">
                                      <LoadingSpinner size="sm" />
                                      <span>Validating...</span>
                                    </div>
                                  ) : (
                                    "Validate Address"
                                  )}
                                </Button>
                              </div>

                              {errors[`${location.id}.validation`] && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                  <p className="text-red-600 text-sm flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {errors[`${location.id}.validation`]}
                                  </p>
                                </div>
                              )}

                              {showSuggestion === location.id && location.suggestedAddress && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                  <h4 className="font-medium text-blue-900 mb-2">
                                    Suggested standardized address:
                                  </h4>
                                  <div className="text-sm text-blue-800 mb-3">
                                    <p>{location.suggestedAddress.line1}</p>
                                    {location.suggestedAddress.line2 && (
                                      <p>{location.suggestedAddress.line2}</p>
                                    )}
                                    <p>
                                      {location.suggestedAddress.city},{" "}
                                      {location.suggestedAddress.state}{" "}
                                      {location.suggestedAddress.zipCode}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => acceptSuggestedAddress(location.id)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      Use Suggested
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => keepOriginalAddress(location.id)}
                                      className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
                                    >
                                      Keep Original
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Primary Location Selector */}
                  <div>
                    <label
                      htmlFor="primaryLocation"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Primary Location *
                    </label>
                    <Select
                      value={primaryLocation}
                      onValueChange={(value) => {
                        setPrimaryLocation(value);
                        if (errors.primaryLocation) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.primaryLocation;
                            return newErrors;
                          });
                        }
                      }}
                    >
                      <SelectTrigger
                        id="primaryLocation"
                        className={`h-12 ${errors.primaryLocation ? "border-red-300" : ""}`}
                      >
                        <SelectValue placeholder="Select primary location" />
                      </SelectTrigger>
                      <SelectContent>
                        {canUseCurrentLocation && (
                          <SelectItem value="current_location">Current Location</SelectItem>
                        )}
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name || `Location ${locations.indexOf(location) + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.primaryLocation && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.primaryLocation}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      This will be your default location for bookings and services.
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white font-medium text-base transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <LoadingSpinner size="sm" />
                        </div>
                      ) : isSaved ? (
                        <div className="flex items-center space-x-2">
                          <Check className="w-5 h-5" />
                          <span>Changes Saved!</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Save className="w-5 h-5" />
                          <span>Save Changes</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-8 sm:px-6 lg:px-8 bg-gray-50/50 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-pink-400 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">E</span>
            </div>
            <span className="text-lg font-bold text-gray-900">easerva.com</span>
          </div>
          <p className="text-sm text-gray-500">
            © 2024 easerva.com. Your service booking made easy.
          </p>
        </div>
      </footer>
    </div>
  );
}
