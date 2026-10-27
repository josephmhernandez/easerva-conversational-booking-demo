"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Building2, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingProgressBar from "../../../../components/onboarding/OnboardingProgressBar";
import CardPreview from "../../../components/cards/CardPreview";
import { OnboardingStep } from "../../../constants/businessConstants";
import { cardAssignmentStrategyPage, goNext, goPrevious } from "../../../constants/routeConstants";
import { CardDesign } from "../../../types/businessTypes";
import { getStepInfo } from "../../../utils/onboardingSteps";

interface CardStrategy {
  id: string;
  title: string;
  description: string;
  bestFor: string;
  enabled: boolean;
  cardCount: number;
}

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

interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: string;
  takesBookings: boolean;
  locationId: string;
}

interface ServiceAssignment {
  employeeId: string;
  serviceId: string;
  locationId: string;
  enabled: boolean;
  customPrice?: number;
  customDuration?: number;
  visible: boolean;
}

export default function CardAssignmentStrategy() {
  const router = useRouter();
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRoutingPrevious, setIsRoutingPrevious] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [serviceLocationConfigs, setServiceLocationConfigs] = useState<ServiceLocationConfig[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [serviceAssignments, setServiceAssignments] = useState<ServiceAssignment[]>([]);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [employeeCardMode, setEmployeeCardMode] = useState<"general" | "per-service">("general");
  // const [businessName, setBusinessName] = useState<string>("Your Business");

  // Calculate real data from loaded configurations
  // const hasMultipleLocations = locations.length > 1;

  // Calculate employee data from loaded assignments
  const bookingEmployees = employees.filter((emp) => emp.takesBookings);
  const uniqueEmployees = new Map();
  bookingEmployees.forEach((emp) => {
    if (!uniqueEmployees.has(emp.email)) {
      uniqueEmployees.set(emp.email, emp);
    }
  });
  const deduplicatedEmployees = Array.from(uniqueEmployees.values());

  const hasEmployeeBooking = deduplicatedEmployees.length > 0;
  const serviceCount = services.length;
  const employeeCount = deduplicatedEmployees.length;
  const configuredServiceLocationCount = serviceLocationConfigs.filter((c) => c.enabled).length;

  // Calculate enabled service assignments
  const enabledServiceAssignments = serviceAssignments.filter((a) => a.enabled);
  const uniqueAssignedEmployees = new Set(enabledServiceAssignments.map((a) => a.employeeId));
  const assignedEmployeeCount = uniqueAssignedEmployees.size;

  // Counts refined for totals based on requirements
  // Cards for services = enabled service-location configurations across all locations
  const serviceCardsAcrossLocations = serviceLocationConfigs.filter((c) => c.enabled).length;
  // Cards for employees per-service = enabled employee-service assignments across all locations
  const employeeServiceCardsAcrossLocations = enabledServiceAssignments.length;

  const cardStrategies: CardStrategy[] = [
    // {
    //   id: "business",
    //   title: "One card for your business",
    //   description: "A single card representing your entire business",
    //   bestFor: "Simple businesses, single location",
    //   enabled: true,
    //   cardCount: 1,
    // },
    // {
    //   id: "locations",
    //   title: "Cards for each location",
    //   description: "Different cards for each of your locations",
    //   bestFor: "Multi-location businesses with varied offerings",
    //   enabled: hasMultipleLocations,
    //   cardCount: locationCount,
    // },
    {
      id: "services",
      title: "Cards for each service",
      description: "Unique cards highlighting individual services",
      bestFor: "Diverse services targeting different audiences",
      enabled: serviceCount > 0,
      cardCount: serviceCardsAcrossLocations,
    },
    {
      id: "employees",
      title: "Cards for each employee",
      description: "Personal cards for each team member",
      bestFor: "Businesses where customers choose specific providers",
      enabled: hasEmployeeBooking,
      cardCount:
        employeeCardMode === "per-service" ? employeeServiceCardsAcrossLocations : employeeCount,
    },
  ];

  const enabledStrategies = cardStrategies.filter((strategy) => strategy.enabled);

  const handleStrategyChange = (strategyId: string, checked: boolean) => {
    if (checked) {
      setSelectedStrategies((prev) => [...prev, strategyId]);
    } else {
      setSelectedStrategies((prev) => prev.filter((id) => id !== strategyId));
    }
  };

  const getTotalCardCount = () => {
    return selectedStrategies.reduce((total, strategyId) => {
      const strategy = cardStrategies.find((s) => s.id === strategyId);
      return total + (strategy?.cardCount || 0);
    }, 0);
  };

  const getCardBreakdown = () => {
    return selectedStrategies
      .map((strategyId) => {
        const strategy = cardStrategies.find((s) => s.id === strategyId);
        if (!strategy) return null;

        let label = "";
        switch (strategyId) {
          case "business":
            label = "1 business card";
            break;
          case "locations":
            label = `${strategy.cardCount} location cards`;
            break;
          case "services":
            label = `${strategy.cardCount} service cards`;
            break;
          case "employees":
            label =
              employeeCardMode === "per-service"
                ? `${strategy.cardCount} employee service cards`
                : `${strategy.cardCount} employee cards`;
            break;
        }
        return { label, count: strategy.cardCount };
      })
      .filter(Boolean);
  };

  const mockCardDesigns: Record<string, CardDesign> = {
    // business: {
    //   id: "business-card",
    //   name: businessName || "Business Card",
    //   mediaType: "image",
    //   mediaUrl: "/beauty-salon-interior.png",
    //   mediaSettings: {
    //     zoom: 1.2,
    //     panX: 0,
    //     panY: 0,
    //     overlayOpacity: 0.1,
    //   },
    //   backgroundColor: "#f3f4f6",
    //   headline: businessName || "Your Business",
    //   tagline:
    //     "Transform your look with our expert stylists and relaxing spa treatments in a luxurious environment.",
    //   bulletPoints: ["Hair Styling", "Massage", "Facials"],
    //   ctaText: "Book Now",
    //   badges: {
    //     licensed: true,
    //     experience: true,
    //     experienceYears: 10,
    //     locallyOwned: true,
    //     custom: "",
    //   },
    //   serviceIds: [],
    //   showProfileImage: false,
    // },
    // location: {
    //   id: "location-card",
    //   name: "Location Card",
    //   mediaType: "image",
    //   mediaUrl: "/beauty-salon-interior.png",
    //   mediaSettings: {
    //     zoom: 1.1,
    //     panX: 0,
    //     panY: 0,
    //     overlayOpacity: 0,
    //   },
    //   backgroundColor: "#f3f4f6",
    //   headline: "Bella Vista - Downtown",
    //   tagline:
    //     "Our flagship location in the heart of downtown, featuring premium hair and spa services.",
    //   bulletPoints: ["Hair Styling", "Massage"],
    //   ctaText: "Book Now",
    //   badges: {
    //     licensed: true,
    //     experience: false,
    //     experienceYears: 0,
    //     locallyOwned: true,
    //     custom: "",
    //   },
    //   serviceIds: [],
    //   showProfileImage: false,
    // },
    service: {
      id: "service-card",
      name: "Service Card",
      mediaType: "image",
      mediaUrl: "/beauty-salon-interior.png",
      mediaSettings: {
        zoom: 1.3,
        panX: 0,
        panY: 0,
        overlayOpacity: 0,
      },
      backgroundColor: "#f3f4f6",
      headline: "Deep Tissue Massage",
      tagline: "Relieve tension and stress with our therapeutic deep tissue massage therapy.",
      bulletPoints: ["60 min session", "Licensed therapists", "Relaxing environment"],
      ctaText: "Book Now",
      badges: {
        licensed: true,
        experience: true,
        experienceYears: 5,
        locallyOwned: false,
        custom: "",
      },
      serviceId: "",
      showProfileImage: false,
    },
    employee: {
      id: "employee-card",
      name: "Employee Card",
      mediaType: "image",
      mediaUrl: "/beauty-salon-interior.png",
      mediaSettings: {
        zoom: 1.0,
        panX: 0,
        panY: 0,
        overlayOpacity: 0.3,
      },
      backgroundColor: "#f3f4f6",
      headline: "Sarah Johnson",
      tagline: "Expert hair stylist specializing in color, cuts, and modern styling techniques.",
      bulletPoints: ["Color Specialist", "Modern Cuts", "Styling Expert"],
      ctaText: "Book with Sarah",
      badges: {
        licensed: true,
        experience: true,
        experienceYears: 8,
        locallyOwned: false,
        custom: "Color Expert",
      },
      serviceId: "",
      profileImage: "/beauty-salon-interior.png",
      showProfileImage: true,
    },
  };

  const renderPreviewCard = (type: string) => {
    const cardDesign = mockCardDesigns[type];
    if (!cardDesign) return null;

    // Customize duration, price, and distance based on card type
    let duration = "60 min";
    let priceRange = "$50-200";
    let distance = "0.5 mi";

    switch (type) {
      case "business":
        duration = "Various";
        priceRange = "$25-300";
        distance = "1.4 mi";
        break;
      case "location":
        duration = "Various";
        priceRange = "$30-250";
        distance = "0.3 mi";
        break;
      case "service":
        duration = "60 min";
        priceRange = "$80";
        distance = "0.5 mi";
        break;
      case "employee":
        duration = "45-90 min";
        priceRange = "$60-150";
        distance = "0.5 mi";
        break;
    }

    return (
      <CardPreview
        card={cardDesign}
        duration={duration}
        priceRange={priceRange}
        distance={distance}
        className="w-full max-w-none"
        expandedDescription={expandedDescription}
        onExpandDescription={setExpandedDescription}
      />
    );
  };

  const getPreviewCards = () => {
    const cards = [];
    if (selectedStrategies.includes("services")) {
      cards.push({ type: "service", label: "Service Card" });
    }
    if (selectedStrategies.includes("employees")) {
      cards.push({ type: "employee", label: "Employee Card" });
    }
    return cards;
  };

  const previewCards = getPreviewCards();

  // Ensure preview index stays within bounds when selection changes
  useEffect(() => {
    if (previewCards.length > 0 && previewIndex >= previewCards.length) {
      setPreviewIndex(0);
      setExpandedDescription(false);
    }
  }, [previewCards.length, previewIndex]);

  // Load data from previous steps
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load all data in parallel for better performance
        const [
          servicesResponse,
          locationsResponse,
          serviceLocationResponse,
          teamMembersResponse,
          employeeAssignmentResponse,
        ] = await Promise.all([
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_SERVICE_TEMPLATES}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_LOCATION}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.SERVICE_LOCATION}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_TEAM_MEMBERS}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT}`),
        ]);

        let loadedServices: Service[] = [];
        const loadedLocations: Location[] = [];
        let loadedConfigs: ServiceLocationConfig[] = [];
        let loadedEmployees: Employee[] = [];
        let loadedAssignments: ServiceAssignment[] = [];

        // Process services data
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

        // Process locations data
        if (locationsResponse.ok) {
          const { draftData: locationsData } = await locationsResponse.json();
          console.log("Loaded locations data:", locationsData);

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
                  resources: [],
                });
              });
            }

            // Handle mobile services (can be multiple)
            if (locationsData["serviceTypes.mobile"]?.mobileServices) {
              const mobileServices = locationsData["serviceTypes.mobile"].mobileServices;
              mobileServices.forEach((mobileService: Record<string, unknown>) => {
                const serviceArea = mobileService.serviceArea as
                  | Record<string, unknown>
                  | undefined;
                let areaDescription = "Mobile Service";

                if (serviceArea?.type === "radius" && serviceArea.zipCenter) {
                  areaDescription = `${serviceArea.radius} mile radius from ${serviceArea.zipCenter}`;
                } else if (serviceArea?.type === "specific" && serviceArea.selectedZips) {
                  areaDescription = `Service areas: ${(serviceArea.selectedZips as string[]).join(", ")}`;
                }

                loadedLocations.push({
                  id: String(mobileService.id),
                  name: String(mobileService.name || "Mobile Service"),
                  type: "mobile",
                  address: areaDescription,
                  resources: [],
                });
              });
            }

            // Handle virtual services (can be multiple)
            if (locationsData["serviceTypes.virtual"]?.virtualServices) {
              const virtualServices = locationsData["serviceTypes.virtual"].virtualServices;
              virtualServices.forEach((virtualService: Record<string, unknown>) => {
                loadedLocations.push({
                  id: String(virtualService.id),
                  name: String(virtualService.name || "Virtual Service"),
                  type: "virtual",
                  address: `${virtualService.platform || "Online"} Platform`,
                  resources: [],
                });
              });
            }
          }
        }

        // Process service-location configurations
        if (serviceLocationResponse.ok) {
          const { draftData: configData } = await serviceLocationResponse.json();
          console.log("Loaded service location data:", configData);
          if (configData && configData.configurations && Array.isArray(configData.configurations)) {
            loadedConfigs = configData.configurations;
          }
        }

        // Process team members data
        if (teamMembersResponse.ok) {
          const { draftData: teamMembersData } = await teamMembersResponse.json();
          console.log("Loaded team members data:", teamMembersData);

          if (teamMembersData && typeof teamMembersData === "object") {
            Object.values(teamMembersData as Record<string, unknown>).forEach((locationData) => {
              if (
                locationData &&
                typeof locationData === "object" &&
                "teamMembers" in locationData &&
                Array.isArray((locationData as { teamMembers?: Employee[] }).teamMembers)
              ) {
                loadedEmployees = [
                  ...loadedEmployees,
                  ...((locationData as { teamMembers?: Employee[] }).teamMembers as Employee[]),
                ];
              }
            });
          }
        }

        // Process employee service assignments
        if (employeeAssignmentResponse.ok) {
          const { draftData: assignmentData } = await employeeAssignmentResponse.json();
          console.log("Loaded employee service assignment data:", assignmentData);

          if (
            assignmentData &&
            assignmentData.assignments &&
            Array.isArray(assignmentData.assignments)
          ) {
            loadedAssignments = assignmentData.assignments;
          }
        }

        setServices(loadedServices);
        setLocations(loadedLocations);
        setServiceLocationConfigs(loadedConfigs);
        setEmployees(loadedEmployees);
        setServiceAssignments(loadedAssignments);

        // Load current step draft data if it exists
        const currentResponse = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.CARD_ASSIGNMENT_STRATEGY}`
        );
        if (currentResponse.ok) {
          const { draftData: currentData } = await currentResponse.json();
          console.log("Loaded current step data:", currentData);
          if (
            currentData &&
            currentData.selectedStrategies &&
            Array.isArray(currentData.selectedStrategies)
          ) {
            setSelectedStrategies(currentData.selectedStrategies);
          }
          if (currentData && currentData.employeeCardMode) {
            setEmployeeCardMode(
              currentData.employeeCardMode === "per-service" ? "per-service" : "general"
            );
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-save removed - manual save only

  // Auto-cycle preview
  useEffect(() => {
    if (previewCards.length > 1) {
      const interval = setInterval(() => {
        setPreviewIndex((prev) => (prev + 1) % previewCards.length);
        setExpandedDescription(false); // Reset description when switching cards
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [previewCards.length]);

  // Reset expanded description when manually switching cards
  useEffect(() => {
    setExpandedDescription(false);
  }, [previewIndex]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        selectedStrategies,
        employeeCardMode,
        services,
        locations,
        serviceLocationConfigs,
        employees,
        serviceAssignments,
      };

      console.log("Saving card assignment strategy data:", dataToSave);
      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: OnboardingStep.CARD_ASSIGNMENT_STRATEGY,
          stepData: dataToSave,
          currentStep: OnboardingStep.CARD_ASSIGNMENT_STRATEGY,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save card assignment strategy data");
      }

      console.log("Card assignment strategy data saved successfully");
    } catch (error) {
      console.error("Error saving card assignment strategy data:", error);
      alert("Failed to save card assignment strategy data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (selectedStrategies.length === 0) {
      alert("Please select at least one card strategy before continuing.");
      return;
    }

    // Save data before continuing
    await handleSave();
    router.push(goNext(cardAssignmentStrategyPage)?.pageRef ?? "");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="max-w-md mx-auto mb-8">
          <OnboardingProgressBar
            currentStep={getStepInfo("card-assignment-strategy").currentStep}
            totalSteps={getStepInfo("card-assignment-strategy").totalSteps}
            stepName={getStepInfo("card-assignment-strategy").stepName}
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            How should customers discover your services?
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Choose how your business will be presented in search results (you can select multiple
            options)
          </p>
          {!isLoading && (configuredServiceLocationCount > 0 || assignedEmployeeCount > 0) && (
            <div className="mt-4 text-sm text-gray-600">
              Based on your {configuredServiceLocationCount} configured service-location
              combinations
              {assignedEmployeeCount > 0 && ` and ${assignedEmployeeCount} assigned employees`}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <Card className="bg-white border-0 shadow-xl mb-8">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LoadingSpinner size="md" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Loading card strategy options...
              </h3>
              <p className="text-gray-600">
                We&apos;re loading your services and locations to determine available card
                strategies.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Panel - Strategy Selection */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Card Strategy Selection
                  </h2>

                  <div className="space-y-4">
                    {enabledStrategies.map((strategy) => (
                      <div
                        key={strategy.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={strategy.id}
                            checked={selectedStrategies.includes(strategy.id)}
                            onCheckedChange={(checked) =>
                              handleStrategyChange(strategy.id, checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={strategy.id}
                              className="font-medium text-gray-900 cursor-pointer"
                            >
                              {strategy.title}
                            </label>
                            <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                            <p className="text-sm text-blue-600 mt-1">
                              <strong>Best for:</strong> {strategy.bestFor}
                            </p>

                            {/* Employee card mode radios */}
                            {strategy.id === "employees" &&
                              selectedStrategies.includes("employees") && (
                                <div className="mt-3 pl-6 border-l">
                                  <p className="text-sm font-medium text-gray-900 mb-2">
                                    Employee cards mode
                                  </p>
                                  <div className="flex flex-col gap-2">
                                    <label className="inline-flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="employeeCardMode"
                                        value="general"
                                        checked={employeeCardMode === "general"}
                                        onChange={() => setEmployeeCardMode("general")}
                                        className="h-4 w-4"
                                      />
                                      <span className="text-sm text-gray-700">
                                        General card per employee
                                      </span>
                                    </label>
                                    <label className="inline-flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="employeeCardMode"
                                        value="per-service"
                                        checked={employeeCardMode === "per-service"}
                                        onChange={() => setEmployeeCardMode("per-service")}
                                        className="h-4 w-4"
                                      />
                                      <span className="text-sm text-gray-700">
                                        Service cards per employee (one per enabled service)
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedStrategies.length === 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">
                        Please select at least one card type to continue
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card Count Indicator */}
              {selectedStrategies.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      This will create approximately {getTotalCardCount()} cards:
                    </h3>
                    <ul className="space-y-1">
                      {getCardBreakdown().map((item, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          • {item?.label}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t">
                      <p className="font-medium text-gray-900">
                        Total: {getTotalCardCount()} cards
                      </p>
                      {(configuredServiceLocationCount > 0 || assignedEmployeeCount > 0) && (
                        <p className="text-sm text-gray-600 mt-1">
                          Based on {configuredServiceLocationCount} configured service-location
                          combinations
                          {assignedEmployeeCount > 0 &&
                            ` and ${assignedEmployeeCount} assigned employees`}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel - Preview */}
            <div className="lg:sticky lg:top-8 lg:h-fit">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Preview</h3>
                    <p className="text-sm text-gray-500">This is what customers might see</p>
                  </div>

                  {previewCards.length > 0 ? (
                    <div className="space-y-4">
                      {/* Card Preview Container */}
                      <div className="mx-auto w-80 flex items-center justify-center">
                        <div className="w-full max-w-[320px]">
                          {renderPreviewCard(previewCards[previewIndex]?.type)}
                        </div>
                      </div>

                      {/* Preview Navigation */}
                      {previewCards.length > 1 && (
                        <div className="flex items-center justify-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPreviewIndex((prev) =>
                                prev === 0 ? previewCards.length - 1 : prev - 1
                              );
                              setExpandedDescription(false);
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>

                          <div className="flex gap-2">
                            {previewCards.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setPreviewIndex(index);
                                  setExpandedDescription(false);
                                }}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                  index === previewIndex ? "bg-blue-600" : "bg-gray-300"
                                }`}
                              />
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPreviewIndex((prev) => (prev + 1) % previewCards.length);
                              setExpandedDescription(false);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Current Preview Label */}
                      <div className="text-center">
                        <Badge variant="outline">{previewCards[previewIndex]?.label}</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Select a card type to see preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        {!isLoading && (
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              onClick={() => {
                setIsRoutingPrevious(true);
                router.push(goPrevious(cardAssignmentStrategyPage)?.pageRef ?? "");
              }}
              disabled={isSaving}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || isRoutingPrevious}
                loading={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>

              <Button
                onClick={handleContinue}
                disabled={selectedStrategies.length === 0 || isSaving || isRoutingPrevious}
                variant="primary"
                loading={isSaving}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
