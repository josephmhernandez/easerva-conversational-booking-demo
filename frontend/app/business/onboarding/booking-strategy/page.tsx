"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Note } from "@/components/ui/note";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Info,
  MapPin,
  RefreshCw,
  Settings,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import OnboardingProgressBar from "../../../../components/onboarding/OnboardingProgressBar";
import { OnboardingStep } from "../../../constants/businessConstants";
import { bookingStrategyPage, goNext, goPrevious } from "../../../constants/routeConstants";
import {
  BOOKING_STRATEGIES,
  BookingStrategy,
  BookingStrategyComplexity,
} from "../../../types/businessTypes";
import { getStepInfo } from "../../../utils/onboardingSteps";

interface BookingStrategyWithUI extends BookingStrategy {
  icon: React.ReactNode;
  diagram: React.ReactNode;
}

export default function BookingStrategyPage() {
  const router = useRouter();
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [availableStrategies, setAvailableStrategies] = useState<string[]>([]);
  const [locations, setLocations] = useState<Record<string, unknown>[]>([]);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [resources, setResources] = useState<Record<string, unknown>[]>([]);

  const strategies: BookingStrategyWithUI[] = BOOKING_STRATEGIES.map((strategy) => {
    const baseStrategy = {
      ...strategy,
      icon: <Calendar className="h-8 w-8 text-blue-600" />,
      diagram: <div />,
    };

    // Add UI-specific properties based on strategy ID
    switch (strategy.id) {
      case "simple":
        return {
          ...baseStrategy,
          icon: <Calendar className="h-8 w-8 text-blue-600" />,
          diagram: (
            <div className="flex items-center justify-center space-x-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">Business Calendar</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-2">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">All Bookings</span>
              </div>
            </div>
          ),
        };
      case "location":
        return {
          ...baseStrategy,
          icon: <MapPin className="h-8 w-8 text-green-600" />,
          diagram: (
            <div className="space-y-3 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Location A</span>
                </div>
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Location B</span>
                </div>
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
            </div>
          ),
        };
      case "employee":
        return {
          ...baseStrategy,
          icon: <Users className="h-8 w-8 text-purple-600" />,
          diagram: (
            <div className="space-y-3 p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Sarah (Stylist)</span>
                </div>
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Mike (Barber)</span>
                </div>
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          ),
        };
      case "resource":
        return {
          ...baseStrategy,
          icon: <Settings className="h-8 w-8 text-orange-600" />,
          diagram: (
            <div className="space-y-3 p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Conference Room A</span>
                </div>
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">MRI Machine</span>
                </div>
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          ),
        };
      case "hybrid":
        return {
          ...baseStrategy,
          icon: <Clock className="h-8 w-8 text-indigo-600" />,
          diagram: (
            <div className="grid grid-cols-2 gap-2 p-4 bg-indigo-50 rounded-lg">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 text-indigo-600" />
                <span className="text-xs">Business</span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3 text-indigo-600" />
                <span className="text-xs">Staff</span>
              </div>
              <div className="flex items-center space-x-1">
                <Building className="h-3 w-3 text-indigo-600" />
                <span className="text-xs">Location</span>
              </div>
              <div className="flex items-center space-x-1">
                <Settings className="h-3 w-3 text-indigo-600" />
                <span className="text-xs">Resource</span>
              </div>
            </div>
          ),
        };
      default:
        return baseStrategy;
    }
  });

  // Load data from previous steps to determine available strategies
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      try {
        // Load locations, employees, resources data, and current booking strategy
        const [locationsRes, employeesRes, resourcesRes, bookingStrategyRes] = await Promise.all([
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_LOCATION}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_TEAM_MEMBERS}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_RESOURCES}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BOOKING_STRATEGY}`),
        ]);

        let loadedLocations: Record<string, unknown>[] = [];
        let loadedEmployees: Record<string, unknown>[] = [];
        let loadedResources: Record<string, unknown>[] = [];

        // Process locations data
        if (locationsRes.ok) {
          const { draftData: locationsData } = await locationsRes.json();
          if (locationsData) {
            // Handle physical locations
            if (locationsData["serviceTypes.physical"]?.addresses) {
              const physicalAddresses = locationsData["serviceTypes.physical"].addresses;
              loadedLocations = physicalAddresses.map((address: Record<string, unknown>) => ({
                id: address.id || `physical-${address.name}`,
                name: address.name || "Physical Location",
                type: "physical",
              }));
            }
          }
        }

        // Process employees data
        if (employeesRes.ok) {
          const { draftData: employeesData } = await employeesRes.json();
          if (employeesData && typeof employeesData === "object") {
            Object.values(employeesData as Record<string, unknown>).forEach((locationData) => {
              if (
                locationData &&
                typeof locationData === "object" &&
                "teamMembers" in locationData &&
                Array.isArray(
                  (locationData as { teamMembers?: Record<string, unknown>[] }).teamMembers
                )
              ) {
                loadedEmployees = [
                  ...loadedEmployees,
                  ...((locationData as { teamMembers?: Record<string, unknown>[] })
                    .teamMembers as Record<string, unknown>[]),
                ];
              }
            });
          }
        }

        // Process resources data
        if (resourcesRes.ok) {
          const { draftData: resourcesData } = await resourcesRes.json();
          if (resourcesData && typeof resourcesData === "object") {
            // Extract resources from all location objects
            Object.values(resourcesData).forEach((locationData: unknown) => {
              if (locationData && typeof locationData === "object" && "resources" in locationData) {
                const typedLocationData = locationData as { resources?: unknown[] };
                if (typedLocationData.resources && Array.isArray(typedLocationData.resources)) {
                  loadedResources = [
                    ...loadedResources,
                    ...(typedLocationData.resources as Record<string, unknown>[]),
                  ];
                }
              }
            });
          }
        }

        // Process booking strategy data
        let savedStrategy = "";
        if (bookingStrategyRes.ok) {
          const { draftData: bookingStrategyData } = await bookingStrategyRes.json();
          if (bookingStrategyData && bookingStrategyData.selectedStrategy) {
            savedStrategy = bookingStrategyData.selectedStrategy;
            console.log("Found saved booking strategy:", savedStrategy);
          }
        }

        setLocations(loadedLocations);
        setEmployees(loadedEmployees);
        setResources(loadedResources);

        console.log("Booking Strategy - Loaded data:", {
          locations: loadedLocations.length,
          employees: loadedEmployees.length,
          resources: loadedResources.length,
          resourceDetails: loadedResources,
          savedStrategy,
        });

        // Determine available strategies based on data
        const available: string[] = ["simple"]; // Simple is always available

        // Add location-based if multiple locations
        if (loadedLocations.length > 1) {
          available.push("location");
        }

        // Add employee-based if employees exist
        if (loadedEmployees.length > 0) {
          available.push("employee");
        }

        // Add resource-based if resources exist
        if (loadedResources.length > 0) {
          available.push("resource");
        }

        // Add hybrid if multiple strategy types are available
        if (available.length > 1) {
          available.push("hybrid");
        }

        setAvailableStrategies(available);

        // Pre-select the saved strategy if it exists and is available
        if (savedStrategy && available.includes(savedStrategy)) {
          setSelectedStrategy(savedStrategy);
          console.log("Pre-selected saved strategy:", savedStrategy);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        // Default to simple strategy if loading fails
        setAvailableStrategies(["simple"]);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();
  }, []);

  const handleContinueRouteB = async () => {
    if (!selectedStrategy) {
      alert("Please select a booking strategy before continuing.");
      return;
    }

    setIsSaving(true);
    try {
      // Save the selected strategy
      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: OnboardingStep.BOOKING_STRATEGY,
          stepData: {
            selectedStrategy,
            locations,
            employees,
            resources,
          },
          currentStep: OnboardingStep.BOOKING_STRATEGY,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save booking strategy");
      }

      router.push(goNext(bookingStrategyPage)?.pageRef ?? "");
    } catch (error) {
      console.error("Error saving booking strategy:", error);
      alert("Failed to save booking strategy. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getComplexityColor = (complexity: BookingStrategyComplexity) => {
    switch (complexity) {
      case "Simple":
        return "bg-green-100 text-green-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Complex":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <OnboardingProgressBar
          currentStep={getStepInfo("booking-strategy").currentStep}
          totalSteps={getStepInfo("booking-strategy").totalSteps}
          stepName={getStepInfo("booking-strategy").stepName}
        />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            How should bookings be scheduled?
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Choose the calendar strategy that best fits your business. You can customize this per
            service later.
          </p>
        </div>

        {/* Loading State */}
        {isDataLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="text-sm text-gray-600">Loading available strategies...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Strategy Cards */}
            <div className="grid gap-6 mb-8">
              {strategies
                .filter((strategy) => availableStrategies.includes(strategy.id))
                .map((strategy) => (
                  <Card
                    key={strategy.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedStrategy === strategy.id
                        ? "ring-2 ring-blue-500 shadow-lg"
                        : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedStrategy(strategy.id)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          {strategy.icon}
                          <div>
                            <CardTitle className="text-xl mb-1">{strategy.name}</CardTitle>
                            <CardDescription className="text-base">
                              {strategy.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={getComplexityColor(strategy.complexity)}>
                            {strategy.complexity}
                          </Badge>
                          {selectedStrategy === strategy.id && (
                            <CheckCircle className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Visual Diagram */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">How it works:</h4>
                          {strategy.diagram}
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Best for:</h4>
                            <ul className="space-y-1">
                              {strategy.bestFor.map((item, index) => (
                                <li key={index} className="text-sm text-gray-600 flex items-center">
                                  <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Benefits:</h4>
                            <ul className="space-y-1">
                              {strategy.pros.map((pro, index) => (
                                <li key={index} className="text-sm text-gray-600 flex items-center">
                                  <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </>
        )}

        {/* Info Box */}
        <Note
          heading="Good to know"
          subheading="You can change your strategy later or use different strategies for different services. This choice sets your default approach."
          icon={Info}
          variant="blue"
        />

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(goPrevious(bookingStrategyPage)?.pageRef ?? "")}
            disabled={isSaving}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center space-x-4">
            <Button
              variant="primary"
              onClick={handleContinueRouteB}
              disabled={!selectedStrategy || isDataLoading || isSaving}
              className="px-8"
              loading={isSaving}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
