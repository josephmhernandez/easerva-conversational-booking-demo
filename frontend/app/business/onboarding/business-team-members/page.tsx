"use client";

import OnboardingProgressBar from "@/components/onboarding/OnboardingProgressBar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Note } from "@/components/ui/note";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Car,
  FileText,
  MapPin,
  Monitor,
  Plus,
  RefreshCw,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { OnboardingStep } from "../../../constants/businessConstants";
import {
  businessTeamMembersPage,
  goNext,
  goPrevious,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import { getStepInfo } from "../../../utils/onboardingSteps";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  takesBookings: boolean;
  locationId: string;
}

interface Location {
  id: string;
  name: string;
  type: "physical" | "mobile" | "virtual";
  address?: string;
  teamMembers?: TeamMember[];
}

interface BusinessLocationData {
  "serviceTypes.mobile"?: {
    mobileServices: Array<{
      id: string;
      name: string;
      serviceArea: {
        type: string;
        radius?: number;
        zipCenter?: string;
        zipCodes?: string[];
      };
    }>;
  };
  "serviceTypes.virtual"?: {
    virtualServices: Array<{
      id: string;
      name: string;
      platform: string;
      defaultLink: string;
      instructions: string;
      timezone: string;
    }>;
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

export default function BusinessTeamMembersPage() {
  const router = useRouter();
  const [teamOption, setTeamOption] = useState<"alone" | "team">("alone");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState({
    fullName: "",
    email: "",
    role: "",
    takesBookings: false,
  });
  const [isLoadingPreviousStep, setIsLoadingPreviousStep] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [activeLocationTab, setActiveLocationTab] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [hasServiceTypes, setHasServiceTypes] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const { user, loading: authLoading } = useAuthCore();

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);

  // Load location structure from business_location step, then merge with business_team_members data
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

            // Check if we have any service types that require team members
            const hasPhysical = locationData["serviceTypes.physical"]?.addresses?.length > 0;
            const hasMobile = !!locationData["serviceTypes.mobile"];
            const hasVirtual = !!locationData["serviceTypes.virtual"];
            hasValidServiceTypes = hasPhysical || hasMobile || hasVirtual;
          }
        }

        // Now load existing business_team_members data and merge with location structure
        const teamMembersResponse = await fetch(
          `/api/business/onboarding/draft/business_team_members`
        );
        let existingTeamMembersData: Record<string, unknown> = {};
        let teamOptionFromData: "alone" | "team" = "alone";
        let allTeamMembers: TeamMember[] = [];

        if (teamMembersResponse.ok) {
          const { draftData: teamMembersData } = await teamMembersResponse.json();
          console.log("Loaded business_team_members draft data:", teamMembersData);
          if (teamMembersData && Object.keys(teamMembersData).length > 0) {
            existingTeamMembersData = teamMembersData;

            // Extract team option and all team members from saved data
            if (teamMembersData.teamOption) {
              teamOptionFromData = teamMembersData.teamOption as "alone" | "team";
            }

            // Collect all team members from all locations
            Object.values(teamMembersData as Record<string, unknown>).forEach((locationData) => {
              if (
                locationData &&
                typeof locationData === "object" &&
                "teamMembers" in locationData &&
                Array.isArray((locationData as { teamMembers?: TeamMember[] }).teamMembers)
              ) {
                allTeamMembers = [
                  ...allTeamMembers,
                  ...((locationData as { teamMembers?: TeamMember[] }).teamMembers as TeamMember[]),
                ];
              }
            });
          }
        }

        // Merge: Use location structure from business_location, but preserve team members from business_team_members
        const finalLocations = locationsFromBusinessStep.map((location) => {
          const existingLocationData = existingTeamMembersData[location.id] as
            | { teamMembers?: TeamMember[] }
            | undefined;
          if (existingLocationData && existingLocationData.teamMembers) {
            // Keep existing team members for this location
            return {
              ...location,
              teamMembers: existingLocationData.teamMembers,
            };
          }
          // New location or no existing team members - start with empty team members
          return location;
        });

        setLocations(finalLocations);
        setHasServiceTypes(hasValidServiceTypes);
        setTeamOption(teamOptionFromData);
        setTeamMembers(allTeamMembers);

        // Set the first location as active if any exist
        if (finalLocations.length > 0) {
          setActiveLocationTab(finalLocations[0].id);
        }

        console.log("Successfully merged locations from business_location with team members data");
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
          type: "physical",
          address: `${address.line1}, ${address.city}, ${address.state} ${address.zipCode}`,
        });
      });
    }

    // Add mobile tabs from actual mobile services
    const mobileServices = data["serviceTypes.mobile"]?.mobileServices ?? [];
    mobileServices.forEach((service) => {
      locations.push({
        id: service.id,
        name: service.name || "Mobile Service",
        type: "mobile",
      });
    });

    // Add virtual tabs from actual virtual services
    const virtualServices = data["serviceTypes.virtual"]?.virtualServices ?? [];
    virtualServices.forEach((service) => {
      locations.push({
        id: service.id,
        name: service.name || "Virtual Service",
        type: "virtual",
      });
    });

    return locations;
  };

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (teamOption || teamMembers.length > 0) {
        console.log("Auto-saving team data...");
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [teamOption, teamMembers]);

  const handleAddMember = useCallback(() => {
    if (!newMember.fullName || !newMember.email || !newMember.role || !activeLocationTab) return;

    const member: TeamMember = {
      id: Date.now().toString(),
      fullName: newMember.fullName,
      email: newMember.email,
      role: newMember.role,
      takesBookings: newMember.takesBookings,
      locationId: activeLocationTab,
    };

    // Batch all state updates together
    startTransition(() => {
      // Update global team members state
      setTeamMembers((prev) => [...prev, member]);

      // Also update the location's team members
      setLocations((prevLocations) =>
        prevLocations.map((location) => {
          if (location.id === activeLocationTab) {
            return {
              ...location,
              teamMembers: [...(location.teamMembers ?? []), member],
            };
          }
          return location;
        })
      );

      setNewMember({
        fullName: "",
        email: "",
        role: "",
        takesBookings: false,
      });

      // Close the form after adding
      setShowAddMemberForm(false);
    });
  }, [newMember, activeLocationTab]);

  const handleRemoveMember = useCallback(
    (id: string) => {
      // Batch state updates together
      startTransition(() => {
        // Update global team members state
        setTeamMembers((prev) => prev.filter((member) => member.id !== id));

        // Also update the location's team members
        setLocations((prevLocations) =>
          prevLocations.map((location) => {
            if (location.id === activeLocationTab) {
              return {
                ...location,
                teamMembers: (location.teamMembers ?? []).filter(
                  (member: TeamMember) => member.id !== id
                ),
              };
            }
            return location;
          })
        );
      });
    },
    [activeLocationTab]
  );

  const handleBulkImport = useCallback(() => {
    const lines = csvData
      .trim()
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const newMembers: TeamMember[] = [];

    // Check if first line looks like a header (contains typical header words)
    const firstLine = lines[0]?.toLowerCase() || "";
    const hasHeader =
      firstLine.includes("name") || firstLine.includes("email") || firstLine.includes("role");
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const [fullName, email, role, takesBookings] = line.split(",").map((item) => item.trim());

      if (fullName && email && role) {
        newMembers.push({
          id: Date.now().toString() + i,
          fullName,
          email,
          role,
          takesBookings:
            takesBookings?.toLowerCase() === "yes" || takesBookings?.toLowerCase() === "true",
          locationId: activeLocationTab,
        });
      }
    }

    // Batch all state updates together
    startTransition(() => {
      // Update global team members state
      setTeamMembers((prev) => [...prev, ...newMembers]);

      // Also update the location's team members
      setLocations((prevLocations) =>
        prevLocations.map((location) => {
          if (location.id === activeLocationTab) {
            return {
              ...location,
              teamMembers: [...(location.teamMembers ?? []), ...newMembers],
            };
          }
          return location;
        })
      );

      setCsvData("");
      setShowBulkImport(false);
    });
  }, [csvData, activeLocationTab]);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Check if we have service types that require team members
    if (!hasServiceTypes) {
      return true; // No validation needed if no service types
    }

    // Validate that each location with team members has proper team member data
    locations.forEach((location) => {
      const locationTeamMembers = teamMembers.filter((member) => member.locationId === location.id);
      locationTeamMembers.forEach((member, index) => {
        const prefix = `${location.id}.${index}`;

        if (!member.fullName.trim()) {
          newErrors[`${prefix}.fullName`] = "Full name is required";
        }

        if (!member.email.trim()) {
          newErrors[`${prefix}.email`] = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
          newErrors[`${prefix}.email`] = "Valid email is required";
        }

        if (!member.role.trim()) {
          newErrors[`${prefix}.role`] = "Role is required";
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler
  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Form submit triggered for business team members!");
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
      alert("Failed to save team members data. Please try again.");
      return;
    }
    router.push(goNext(businessTeamMembersPage)?.pageRef ?? "");
  };

  // Save team members data to API
  const handleSave = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Transform locations data for API
      const teamMembersData: Record<
        string,
        {
          name: string;
          type: string;
          teamMembers: TeamMember[];
        }
      > = {};

      locations.forEach((location) => {
        // Get team members from location data first, fallback to global state
        const locationTeamMembers =
          location.teamMembers ?? teamMembers.filter((member) => member.locationId === location.id);
        if (locationTeamMembers.length > 0) {
          teamMembersData[location.id] = {
            name: location.name,
            type: location.type,
            teamMembers: locationTeamMembers.map((member: TeamMember) => ({
              id: member.id,
              fullName: member.fullName,
              email: member.email,
              role: member.role,
              takesBookings: member.takesBookings,
              locationId: member.locationId,
            })),
          };
        }
      });

      // Include the team option in the saved data
      const dataToSave = {
        teamOption,
        ...teamMembersData,
      };

      console.log("Team members data to save:", dataToSave);

      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "business_team_members",
          stepData: dataToSave,
          currentStep: "business_team_members",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors((prev) => ({
          ...prev,
          submit: errorData.message || "Failed to save team members data",
        }));
        return false;
      }

      console.log("Team members data saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving team members data:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "An error occurred while saving. Please try again.",
      }));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Removed unused handleSkip to satisfy linter

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "physical":
        return <Building className="w-4 h-4" />;
      case "mobile":
        return <Car className="w-4 h-4" />;
      case "virtual":
        return <Monitor className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getTeamMembersForLocation = (locationId: string) => {
    // First check if the location has team members stored directly
    const location = locations.find((loc) => loc.id === locationId);
    if (location && location.teamMembers) {
      return location.teamMembers as TeamMember[];
    }

    // Fallback to filtering from global teamMembers state
    return teamMembers.filter((member) => member.locationId === locationId);
  };

  const isFormValid = teamOption === "alone" || (teamOption === "team" && teamMembers.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <OnboardingProgressBar
          currentStep={getStepInfo("business-team-members").currentStep}
          totalSteps={getStepInfo("business-team-members").totalSteps}
          stepName={getStepInfo("business-team-members").stepName}
          goPrevious={() => router.push(goPrevious(businessTeamMembersPage)?.pageRef ?? "")}
          user={user?.email ?? ""}
        />

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleFormSubmit}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Who&apos;s on your team?</h1>
              <p className="text-gray-600">
                Add your team members - we&apos;ll configure their services later
              </p>
            </div>

            {/* Show loading state while fetching data */}
            {isLoadingPreviousStep && (
              <div className="text-center py-12" data-testid="loading-previous-step">
                <LoadingSpinner size="md" />
                <p className="text-gray-600">Loading your business location data...</p>
              </div>
            )}

            {/* Show no team members message if no service types require team members */}
            {!isLoadingPreviousStep && !hasServiceTypes && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-6 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  No Business Location Data Found
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  We couldn&apos;t find your business location setup. Please go back to the Business
                  Location step to configure your service delivery methods first.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    type="button"
                    onClick={() => router.back()}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    Go Back to Business Location
                  </Button>
                  <Button
                    type="button"
                    onClick={handleContinue}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Skip Team Members Step
                  </Button>
                </div>
              </div>
            )}

            {/* Important Note */}
            <Note
              heading="Important Note"
              subheading="Only add team members if customers book with them directly. If customers don't pick a person and just book on a general calendar, don't add those team members here."
              icon={AlertCircle}
              variant="blue"
            />

            {/* Team Option Selector */}
            <div className="mb-8" data-testid="team-option-section">
              <RadioGroup
                value={teamOption}
                onValueChange={(value: "alone" | "team") => setTeamOption(value)}
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                    <RadioGroupItem value="alone" id="alone" data-testid="option-alone" />
                    <Label htmlFor="alone" className="cursor-pointer flex-1">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">Solo Provider</div>
                          <p className="text-sm text-gray-600">
                            It&apos;s just me — customers book directly with me.
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                    <RadioGroupItem value="team" id="team" data-testid="option-team" />
                    <Label htmlFor="team" className="cursor-pointer flex-1">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">Team Members</div>
                          <p className="text-sm text-gray-600">
                            I have a team — customers book directly with my staff members.
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Team Members Section with Location Tabs - only show if we have service types that need team members */}
            {!isLoadingPreviousStep && hasServiceTypes && teamOption === "team" && (
              <div className="space-y-6">
                {locations.length > 1 ? (
                  <Tabs
                    value={activeLocationTab}
                    onValueChange={(value) => {
                      setActiveLocationTab(value);
                      setShowBulkImport(false);
                      setShowAddMemberForm(false);
                      setCsvData("");
                    }}
                    className="w-full"
                    data-testid="locations-tabs"
                  >
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
                      {locations.map((location) => (
                        <TabsTrigger
                          key={location.id}
                          value={location.id}
                          className="flex items-center space-x-2 text-xs"
                          data-testid={`location-tab-${location.id}`}
                        >
                          {getLocationIcon(location.type)}
                          <span className="truncate">{location.name}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {locations.map((location) => (
                      <TabsContent key={location.id} value={location.id} className="space-y-6">
                        {/* Location Info */}
                        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                          {getLocationIcon(location.type)}
                          <div>
                            <h3 className="font-medium text-gray-900">{location.name}</h3>
                            {location.address && (
                              <p className="text-sm text-gray-600">{location.address}</p>
                            )}
                            <p className="text-xs text-gray-500 capitalize">
                              {location.type} location
                            </p>
                          </div>
                        </div>

                        {/* Add Member Options */}
                        <div className="space-y-4">
                          {/* Encourage CSV Import */}
                          <div className="text-center">
                            <div className="mb-4">
                              <h3 className="font-semibold text-gray-900 mb-2">Add Team Members</h3>
                              <p className="text-sm text-gray-600 mb-4">
                                For multiple team members, we recommend using CSV import for faster
                                setup.
                              </p>
                            </div>

                            <div className="flex gap-3 justify-center">
                              <Button
                                variant="primary"
                                type="button"
                                onClick={() => {
                                  setShowBulkImport(!showBulkImport);
                                  if (!showBulkImport) setShowAddMemberForm(false);
                                }}
                                // className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                data-testid="csv-import-button"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                CSV Import (Recommended)
                              </Button>
                              <Button
                                variant="outline"
                                type="button"
                                onClick={() => {
                                  setShowAddMemberForm(!showAddMemberForm);
                                  if (!showAddMemberForm) setShowBulkImport(false);
                                }}
                                className="bg-transparent"
                                data-testid="add-member-button"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Individual Member
                              </Button>
                            </div>
                          </div>

                          {/* Individual Add Form */}
                          {showAddMemberForm && (
                            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                              <h3 className="font-semibold text-gray-900 mb-4">
                                Add Individual Team Member to {location.name}
                              </h3>

                              <div className="space-y-4">
                                <div>
                                  <Label
                                    htmlFor="fullName"
                                    className="text-sm font-medium text-gray-700 mb-1 block"
                                  >
                                    Full Name *
                                  </Label>
                                  <Input
                                    id="fullName"
                                    placeholder="Enter full name"
                                    value={newMember.fullName}
                                    onChange={(e) =>
                                      setNewMember({ ...newMember, fullName: e.target.value })
                                    }
                                    className="h-12"
                                    data-testid="input-fullName"
                                  />
                                </div>

                                <div>
                                  <Label
                                    htmlFor="email"
                                    className="text-sm font-medium text-gray-700 mb-1 block"
                                  >
                                    Email *
                                  </Label>
                                  <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter email address"
                                    value={newMember.email}
                                    onChange={(e) =>
                                      setNewMember({ ...newMember, email: e.target.value })
                                    }
                                    className="h-12"
                                    data-testid="input-email"
                                  />
                                </div>

                                <div>
                                  <Label
                                    htmlFor="role"
                                    className="text-sm font-medium text-gray-700 mb-1 block"
                                  >
                                    Role/Title *
                                  </Label>
                                  <Input
                                    id="role"
                                    placeholder="e.g., Stylist, Therapist, Assistant"
                                    value={newMember.role}
                                    onChange={(e) =>
                                      setNewMember({ ...newMember, role: e.target.value })
                                    }
                                    className="h-12"
                                    data-testid="input-role"
                                  />
                                </div>

                                <div className="space-y-3">
                                  <Label className="text-sm font-medium text-gray-700">Type</Label>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="takesBookings"
                                      checked={newMember.takesBookings}
                                      onCheckedChange={(checked) =>
                                        setNewMember({
                                          ...newMember,
                                          takesBookings: !!checked,
                                        })
                                      }
                                      data-testid="checkbox-takesBookings"
                                    />
                                    <Label
                                      htmlFor="takesBookings"
                                      className="text-sm text-gray-700 flex items-center"
                                    >
                                      <Calendar className="w-4 h-4 mr-1" />
                                      Takes direct bookings
                                    </Label>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="primary"
                                  onClick={handleAddMember}
                                  disabled={
                                    !newMember.fullName ||
                                    !newMember.email ||
                                    !newMember.role ||
                                    isPending
                                  }
                                  // className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                  data-testid="add-team-member"
                                  loading={isPending}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Team Member
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Enhanced Bulk Import Form */}
                        {showBulkImport && (
                          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                            <h3 className="font-semibold text-gray-900 mb-4">
                              Bulk Import Team Members for {location.name}
                            </h3>

                            <div className="space-y-4">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2">
                                  CSV Format Instructions
                                </h4>
                                <p className="text-sm text-blue-800 mb-3">
                                  Each line should contain:{" "}
                                  <strong>Full Name, Email, Role, Takes Bookings (yes/no)</strong>
                                </p>
                                <div className="bg-white rounded p-3 text-sm font-mono text-gray-700">
                                  <div className="text-gray-500 mb-1">Example:</div>
                                  John Doe, john@example.com, Senior Stylist, yes
                                  <br />
                                  Jane Smith, jane@example.com, Hair Assistant, no
                                  <br />
                                  Mike Johnson, mike@example.com, Colorist, yes
                                </div>
                                <p className="text-xs text-blue-600 mt-2">
                                  • You can include or exclude a header row - we&apos;ll
                                  automatically detect it
                                  <br />
                                  • Empty lines will be ignored
                                  <br />• Use &quot;yes&quot; or &quot;true&quot; for team members
                                  who take bookings
                                </p>
                              </div>

                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Paste your CSV data:
                                </Label>
                                <textarea
                                  placeholder="Full Name, Email, Role, Takes Bookings&#10;John Doe, john@example.com, Stylist, yes&#10;Jane Smith, jane@example.com, Assistant, no"
                                  value={csvData}
                                  onChange={(e) => setCsvData(e.target.value)}
                                  className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  data-testid="csv-textarea"
                                />
                                {csvData && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {
                                      csvData
                                        .trim()
                                        .split("\n")
                                        .filter((line) => line.trim()).length
                                    }{" "}
                                    lines detected
                                  </p>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  onClick={handleBulkImport}
                                  disabled={!csvData.trim() || isPending}
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                  data-testid="csv-import-confirm"
                                  loading={isPending}
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Import Members
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setShowBulkImport(false);
                                    setShowAddMemberForm(false);
                                    setCsvData("");
                                  }}
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Team Members List for Current Location */}
                        {getTeamMembersForLocation(location.id).length > 0 && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-4">
                              Team Members at {location.name} (
                              {getTeamMembersForLocation(location.id).length})
                            </h3>
                            <div className="space-y-3">
                              {getTeamMembersForLocation(location.id).map((member: TeamMember) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {member.fullName}
                                      </div>
                                      <div className="text-sm text-gray-600">{member.email}</div>
                                      <div className="text-sm text-gray-500">{member.role}</div>
                                      <div className="flex gap-2 mt-1">
                                        {member.takesBookings && (
                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            Takes Bookings
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="text-red-600 hover:text-red-700 bg-transparent"
                                    data-testid={`remove-member-${member.id}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  // Single location - no tabs needed
                  <div className="space-y-6">
                    {/* Location Info */}
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      {getLocationIcon(locations[0]?.type)}
                      <div>
                        <h3 className="font-medium text-gray-900">{locations[0]?.name}</h3>
                        {locations[0]?.address && (
                          <p className="text-sm text-gray-600">{locations[0].address}</p>
                        )}
                        <p className="text-xs text-gray-500 capitalize">
                          {locations[0]?.type} location
                        </p>
                      </div>
                    </div>

                    {/* Add Member Options */}
                    <div className="space-y-4">
                      {/* Encourage CSV Import */}
                      <div className="text-center">
                        <div className="mb-4">
                          <h3 className="font-semibold text-gray-900 mb-2">Add Team Members</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            For multiple team members, we recommend using CSV import for faster
                            setup.
                          </p>
                        </div>

                        <div className="flex gap-3 justify-center">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                              setShowBulkImport(!showBulkImport);
                              if (!showBulkImport) setShowAddMemberForm(false);
                            }}
                            data-testid="csv-import-button"
                            // className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            CSV Import (Recommended)
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowAddMemberForm(!showAddMemberForm);
                              if (!showAddMemberForm) setShowBulkImport(false);
                            }}
                            className="bg-transparent"
                            data-testid="add-member-button"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Individual Member
                          </Button>
                        </div>
                      </div>

                      {/* Individual Add Form */}
                      {showAddMemberForm && (
                        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                          <h3 className="font-semibold text-gray-900 mb-4">
                            Add Individual Team Member
                          </h3>

                          <div className="space-y-4">
                            <div>
                              <Label
                                htmlFor="fullName"
                                className="text-sm font-medium text-gray-700 mb-1 block"
                              >
                                Full Name *
                              </Label>
                              <Input
                                id="fullName"
                                placeholder="Enter full name"
                                value={newMember.fullName}
                                onChange={(e) =>
                                  setNewMember({ ...newMember, fullName: e.target.value })
                                }
                                className="h-12"
                                data-testid="input-fullName"
                              />
                            </div>

                            <div>
                              <Label
                                htmlFor="email"
                                className="text-sm font-medium text-gray-700 mb-1 block"
                              >
                                Email *
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder="Enter email address"
                                value={newMember.email}
                                onChange={(e) =>
                                  setNewMember({ ...newMember, email: e.target.value })
                                }
                                className="h-12"
                                data-testid="input-email"
                              />
                            </div>

                            <div>
                              <Label
                                htmlFor="role"
                                className="text-sm font-medium text-gray-700 mb-1 block"
                              >
                                Role/Title *
                              </Label>
                              <Input
                                id="role"
                                placeholder="e.g., Stylist, Therapist, Assistant"
                                value={newMember.role}
                                onChange={(e) =>
                                  setNewMember({ ...newMember, role: e.target.value })
                                }
                                className="h-12"
                                data-testid="input-role"
                              />
                            </div>

                            <div className="space-y-3">
                              <Label className="text-sm font-medium text-gray-700">Type</Label>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="takesBookings"
                                  checked={newMember.takesBookings}
                                  onCheckedChange={(checked) =>
                                    setNewMember({
                                      ...newMember,
                                      takesBookings: !!checked,
                                    })
                                  }
                                  data-testid="checkbox-takesBookings"
                                />
                                <Label
                                  htmlFor="takesBookings"
                                  className="text-sm text-gray-700 flex items-center"
                                >
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Takes bookings
                                </Label>
                              </div>
                            </div>

                            <div className="flex justify-center">
                              <Button
                                type="button"
                                variant="primary"
                                onClick={handleAddMember}
                                disabled={
                                  !newMember.fullName ||
                                  !newMember.email ||
                                  !newMember.role ||
                                  isPending
                                }
                                className="flex justify-center"
                                data-testid="add-team-member"
                                loading={isPending}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Team Member
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Bulk Import Form for Single Location */}
                      {showBulkImport && (
                        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                          <h3 className="font-semibold text-gray-900 mb-4">
                            Bulk Import Team Members
                          </h3>

                          <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-900 mb-2">
                                CSV Format Instructions
                              </h4>
                              <p className="text-sm text-blue-800 mb-3">
                                Each line should contain:{" "}
                                <strong>Full Name, Email, Role, Takes Bookings (yes/no)</strong>
                              </p>
                              <div className="bg-white rounded p-3 text-sm font-mono text-gray-700">
                                <div className="text-gray-500 mb-1">Example:</div>
                                John Doe, john@example.com, Senior Stylist, yes
                                <br />
                                Jane Smith, jane@example.com, Hair Assistant, no
                                <br />
                                Mike Johnson, mike@example.com, Colorist, yes
                              </div>
                              <p className="text-xs text-blue-600 mt-2">
                                • You can include or exclude a header row - we&apos;ll automatically
                                detect it
                                <br />
                                • Empty lines will be ignored
                                <br />• Use &quot;yes&quot; or &quot;true&quot; for team members who
                                take bookings
                              </p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                Paste your CSV data:
                              </Label>
                              <textarea
                                placeholder="Full Name, Email, Role, Takes Bookings&#10;John Doe, john@example.com, Stylist, yes&#10;Jane Smith, jane@example.com, Assistant, no"
                                value={csvData}
                                onChange={(e) => setCsvData(e.target.value)}
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                data-testid="csv-textarea"
                              />
                              {csvData && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {
                                    csvData
                                      .trim()
                                      .split("\n")
                                      .filter((line) => line.trim()).length
                                  }{" "}
                                  lines detected
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="primary"
                                onClick={handleBulkImport}
                                disabled={!csvData.trim() || isPending}
                                data-testid="csv-import-confirm"
                                loading={isPending}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Import Members
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowBulkImport(false);
                                  setShowAddMemberForm(false);
                                  setCsvData("");
                                }}
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Team Members List */}
                    {teamMembers.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">
                          Team Members ({teamMembers.length})
                        </h3>
                        <div className="space-y-3">
                          {teamMembers.map((member: TeamMember) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{member.fullName}</div>
                                  <div className="text-sm text-gray-600">{member.email}</div>
                                  <div className="text-sm text-gray-500">{member.role}</div>
                                  <div className="flex gap-2 mt-1">
                                    {member.takesBookings && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        Takes Bookings
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-600 hover:text-red-700 bg-transparent"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Configuration Note */}
                {teamMembers.length > 0 && (
                  <Note
                    heading="We'll configure their services later"
                    subheading="Don't worry about detailed setup now - we'll handle service assignments and schedules in the next steps."
                    icon={FileText}
                    variant="blue"
                    className="mt-4"
                  />
                )}
              </div>
            )}
          </form>
        </div>

        {/* Form-wide error display */}
        {errors.submit && (
          <div className="my-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {errors.submit}
            </p>
          </div>
        )}

        {/* Action Buttons - only show when we have service types that need team members */}
        {!isLoadingPreviousStep && hasServiceTypes && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(goPrevious(businessTeamMembersPage)?.pageRef ?? "")}
              className="border-gray-200 hover:bg-gray-50 bg-transparent"
              disabled={isSaving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleContinue}
              disabled={!isFormValid || isSaving}
              className="px-8"
              data-testid="continue-button"
              loading={isSaving}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Fallback action buttons for when no service types */}
        {!isLoadingPreviousStep && !hasServiceTypes && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(goPrevious(businessTeamMembersPage)?.pageRef ?? "")}
              className="border-gray-200 hover:bg-gray-50 bg-transparent"
              disabled={isSaving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleContinue}
              disabled={isSaving}
              className="px-8"
              loading={isSaving}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            You can always add or modify team members later from your dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
