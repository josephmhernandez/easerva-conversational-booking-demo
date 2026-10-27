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
  Check,
  CheckSquare,
  Clock,
  DollarSign,
  Save,
  Settings,
  Square,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import OnboardingProgressBar from "../../../../components/onboarding/OnboardingProgressBar";
import { OnboardingStep } from "../../../constants/businessConstants";
import {
  employeeServiceAssignmentPage,
  goNext,
  goPrevious,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import { getStepInfo } from "../../../utils/onboardingSteps";
import { BadgeSettings, MediaSettings } from "../../../types/businessTypes";
import { CardData } from "../card-studio/page";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";

interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: string;
  takesBookings: boolean;
  locationId: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
  baseDuration: number;
  basePrice: number;
  locations: string[];
  requiresEmployee: boolean;
  anonymous: boolean;
}

// Raw shapes used when parsing draft payloads
type RawService = {
  id: string;
  name: string;
  category: string;
  duration: number;
  price?: number;
  deliveryOptions?: {
    inPerson?: boolean;
    mobile?: boolean;
    virtual?: boolean;
  };
};

type RawLocation = {
  id: string;
  name: string;
  type: "physical" | "mobile" | "virtual";
  address?: string;
};

interface Location {
  id: string;
  name: string;
  type: "physical" | "mobile" | "virtual";
  address?: string;
}

interface ServiceAssignment {
  employeeId: string;
  serviceId: string;
  locationId: string;
  enabled: boolean;
  customPrice?: number;
  customDuration?: number;
  visible: boolean; // Whether employee is shown for this service
}

export default function EmployeeServiceAssignmentPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<ServiceAssignment[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ServiceAssignment | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isRoutingPrevious, setIsRoutingPrevious] = useState(false);
  const { user, loading: authLoading } = useAuthCore();
  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);

  // Helper function to get booking-eligible employees
  // If ANY instance of an email has takesBookings: true, then ALL instances of that email are eligible
  const getBookingEligibleEmployees = (employeeList: Employee[]): Employee[] => {
    // Group employees by email
    const employeesByEmail = new Map<string, Employee[]>();
    employeeList.forEach((emp) => {
      if (!employeesByEmail.has(emp.email)) {
        employeesByEmail.set(emp.email, []);
      }
      employeesByEmail.get(emp.email)!.push(emp);
    });

    // Determine which emails take bookings (if ANY instance takes bookings, the email takes bookings)
    const emailsThatTakeBookings = new Set<string>();
    employeesByEmail.forEach((emps, email) => {
      if (emps.some((emp) => emp.takesBookings)) {
        emailsThatTakeBookings.add(email);
      }
    });

    // Collect all employees whose email takes bookings
    const eligibleEmployees: Employee[] = [];
    employeesByEmail.forEach((emps, email) => {
      if (emailsThatTakeBookings.has(email)) {
        eligibleEmployees.push(...emps);
      }
    });

    // Deduplicate by email, preferring employees that take bookings
    const uniqueEmployees = new Map<string, Employee>();
    eligibleEmployees.forEach((emp) => {
      if (!uniqueEmployees.has(emp.email)) {
        uniqueEmployees.set(emp.email, emp);
      } else {
        // If current employee takes bookings and stored one doesn't, replace it
        const stored = uniqueEmployees.get(emp.email)!;
        if (emp.takesBookings && !stored.takesBookings) {
          uniqueEmployees.set(emp.email, emp);
        }
      }
    });

    return Array.from(uniqueEmployees.values());
  };

  // Filter employees who take bookings and deduplicate by email - memoized to prevent infinite re-renders
  const bookingEmployees = useMemo(() => {
    return getBookingEligibleEmployees(employees);
  }, [employees]);

  // Set client-side flag to prevent hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load data from previous steps and current step
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        console.log("Loading employee service assignment data...");

        // Load all data in parallel for better performance
        const [teamMembersResponse, serviceLocationResponse, currentStepResponse] =
          await Promise.all([
            fetch(`/api/business/onboarding/draft/business_team_members`),
            fetch(`/api/business/onboarding/draft/${OnboardingStep.SERVICE_LOCATION}`),
            fetch(`/api/business/onboarding/draft/employee_service_assignment`),
          ]);

        let loadedEmployees: Employee[] = [];
        let loadedServices: Service[] = [];
        let loadedLocations: Location[] = [];
        let existingAssignments: ServiceAssignment[] = [];

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

        // Process service location data
        if (serviceLocationResponse.ok) {
          const { draftData: serviceLocationData } = await serviceLocationResponse.json();
          console.log("Loaded service location data:", serviceLocationData);

          if (serviceLocationData) {
            // Extract services
            if (serviceLocationData.services && Array.isArray(serviceLocationData.services)) {
              loadedServices = serviceLocationData.services.map((service: RawService) => ({
                id: service.id,
                name: service.name,
                category: service.category,
                baseDuration: service.duration,
                basePrice: service.price || 0,
                locations: service.deliveryOptions
                  ? [
                      ...(service.deliveryOptions.inPerson ? ["physical"] : []),
                      ...(service.deliveryOptions.mobile ? ["mobile"] : []),
                      ...(service.deliveryOptions.virtual ? ["virtual"] : []),
                    ]
                  : [],
                requiresEmployee: true,
                anonymous: false,
              }));
            }

            // Extract locations
            if (serviceLocationData.locations && Array.isArray(serviceLocationData.locations)) {
              loadedLocations = serviceLocationData.locations.map((location: RawLocation) => ({
                id: location.id,
                name: location.name,
                type: location.type,
                address: location.address,
              }));
            }
          }
        }

        // Process existing assignments from current step
        if (currentStepResponse.ok) {
          const { draftData: currentStepData } = await currentStepResponse.json();
          console.log("Loaded existing assignments:", currentStepData);

          if (
            currentStepData &&
            currentStepData.assignments &&
            Array.isArray(currentStepData.assignments)
          ) {
            existingAssignments = currentStepData.assignments;
          }
        }

        setEmployees(loadedEmployees);
        setServices(loadedServices);
        setLocations(loadedLocations);

        // Initialize assignments - use existing ones or create new ones
        let initialAssignments: ServiceAssignment[] = [];

        if (existingAssignments.length > 0) {
          // Use existing assignments
          initialAssignments = existingAssignments;
          console.log("Using existing assignments:", existingAssignments.length);
        } else {
          // Create new assignments based on loaded data
          console.log("Creating new assignments...");

          // Use the same helper function to get booking-eligible employees
          // This ensures we use the same employee IDs that will be displayed
          const bookingEligibleEmployees = getBookingEligibleEmployees(loadedEmployees);

          bookingEligibleEmployees.forEach((employee) => {
            loadedServices.forEach((service) => {
              // Only create assignments for services that require employees
              if (service.requiresEmployee) {
                // Use the SAME logic as getIntersectionLocations to find valid locations

                // Get all locations where this employee actually works (by email for deduplication)
                const allEmployeeLocations = loadedEmployees
                  .filter((emp) => emp.email === employee.email)
                  .map((emp) => emp.locationId);

                // Find intersection: where employee works AND service is offered
                const validLocations = loadedLocations.filter((loc) => {
                  // Check if employee works at this location
                  const employeeWorksHere =
                    allEmployeeLocations.includes(loc.id) ||
                    allEmployeeLocations.some((empLocId) => {
                      if (empLocId === "mobile" && loc.type === "mobile") return true;
                      if (empLocId === "virtual" && loc.type === "virtual") return true;
                      if (empLocId === "physical" && loc.type === "physical") return true;
                      return false;
                    });

                  // Check if service is offered at this location type
                  const serviceOfferedHere = service.locations.includes(loc.type);

                  // Only valid if BOTH conditions are true
                  return employeeWorksHere && serviceOfferedHere;
                });

                // Create assignments ONLY for valid intersection locations
                validLocations.forEach((location) => {
                  initialAssignments.push({
                    employeeId: employee.id,
                    serviceId: service.id,
                    locationId: location.id,
                    enabled: false,
                    visible: true,
                  });
                });
              }
            });
          });
        }

        setAssignments(initialAssignments);
        console.log("Successfully loaded all data and initialized assignments");
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getAssignment = (employeeId: string, serviceId: string, locationId: string) => {
    return assignments.find(
      (a) => a.employeeId === employeeId && a.serviceId === serviceId && a.locationId === locationId
    );
  };

  const updateAssignment = (assignment: ServiceAssignment) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.employeeId === assignment.employeeId &&
        a.serviceId === assignment.serviceId &&
        a.locationId === assignment.locationId
          ? assignment
          : a
      )
    );
  };

  const toggleAssignment = (
    employeeId: string,
    serviceId: string,
    locationId: string,
    enabled: boolean
  ) => {
    const assignment = getAssignment(employeeId, serviceId, locationId);
    if (assignment) {
      updateAssignment({ ...assignment, enabled });
    } else {
      // Defensive check: if assignment doesn't exist, create it on-the-fly
      // This can happen if there's a mismatch between initialization and display
      console.warn(
        `Assignment not found for employee ${employeeId}, service ${serviceId}, location ${locationId}. Creating on-the-fly.`
      );
      const newAssignment: ServiceAssignment = {
        employeeId,
        serviceId,
        locationId,
        enabled,
        visible: true,
      };
      setAssignments((prev) => [...prev, newAssignment]);
    }
  };

  // Helper to calculate intersection locations for an employee-service pair
  const getIntersectionLocations = (employeeId: string, serviceId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    const service = services.find((s) => s.id === serviceId);

    if (!employee || !service) return [];

    // Get all locations where this employee works (by email for deduplication)
    const allEmployeeLocations = employees
      .filter((emp) => emp.email === employee.email)
      .map((emp) => emp.locationId);

    // Find intersection: where employee works AND service is offered
    return locations.filter((loc) => {
      const employeeWorksHere =
        allEmployeeLocations.includes(loc.id) ||
        allEmployeeLocations.some((empLocId) => {
          if (empLocId === "mobile" && loc.type === "mobile") return true;
          if (empLocId === "virtual" && loc.type === "virtual") return true;
          if (empLocId === "physical" && loc.type === "physical") return true;
          return false;
        });

      const serviceOfferedHere = service.locations.includes(loc.type);
      return employeeWorksHere && serviceOfferedHere;
    });
  };

  // Helper to get visible assignments for an employee (used for row counts)
  const getVisibleEmployeeAssignments = (employeeId: string) => {
    const visibleAssignments: ServiceAssignment[] = [];

    // Only count assignments for services that are currently filtered/visible
    filteredServices
      .filter((s) => s.requiresEmployee)
      .forEach((service) => {
        const intersectionLocations = getIntersectionLocations(employeeId, service.id);

        // Add assignments for each intersection location
        intersectionLocations.forEach((location) => {
          const assignment = getAssignment(employeeId, service.id, location.id);
          if (assignment) {
            visibleAssignments.push(assignment);
          }
        });
      });

    return visibleAssignments;
  };

  // Helper to get visible assignments for a service (used for column counts)
  const getVisibleServiceAssignments = (serviceId: string) => {
    const visibleAssignments: ServiceAssignment[] = [];

    // Only count assignments for employees that are currently filtered/visible
    filteredEmployees.forEach((employee) => {
      const intersectionLocations = getIntersectionLocations(employee.id, serviceId);

      // Add assignments for each intersection location
      intersectionLocations.forEach((location) => {
        const assignment = getAssignment(employee.id, serviceId, location.id);
        if (assignment) {
          visibleAssignments.push(assignment);
        }
      });
    });

    return visibleAssignments;
  };

  // Toggle all assignments for a specific employee (row)
  const toggleEmployeeRow = (employeeId: string, enabled: boolean) => {
    // Only toggle assignments for services that are currently filtered/visible
    filteredServices
      .filter((s) => s.requiresEmployee)
      .forEach((service) => {
        const intersectionLocations = getIntersectionLocations(employeeId, service.id);

        // Only toggle for locations that would be rendered in the matrix
        intersectionLocations.forEach((location) => {
          const assignment = getAssignment(employeeId, service.id, location.id);
          if (assignment) {
            updateAssignment({ ...assignment, enabled });
          }
        });
      });
  };

  // Toggle all assignments for a specific service (column)
  const toggleServiceColumn = (serviceId: string, enabled: boolean) => {
    // Only toggle assignments for employees that are currently filtered/visible
    filteredEmployees.forEach((employee) => {
      const intersectionLocations = getIntersectionLocations(employee.id, serviceId);

      // Only toggle for locations that would be rendered in the matrix
      intersectionLocations.forEach((location) => {
        const assignment = getAssignment(employee.id, serviceId, location.id);
        if (assignment) {
          updateAssignment({ ...assignment, enabled });
        }
      });
    });
  };

  const saveOverrides = () => {
    if (selectedAssignment) {
      updateAssignment(selectedAssignment);
      setShowOverrideDialog(false);
      setSelectedAssignment(null);
    }
  };

  const getAssignmentStats = () => {
    const totalPossible = assignments.length;
    const assigned = assignments.filter((a) => a.enabled).length;
    const servicesWithoutCoverage = services
      .filter((s) => s.requiresEmployee)
      .filter((service) => {
        return !assignments.some((a) => a.serviceId === service.id && a.enabled);
      });

    return { totalPossible, assigned, servicesWithoutCoverage };
  };

  const stats = getAssignmentStats();

  // Helper function to generate default cards based on strategy
  const generateDefaultCards = (
    selectedStrategies: string[],
    employeeCardMode: "general" | "per-service",
    servicesData: Array<Record<string, unknown>>,
    locationsData: Array<Record<string, unknown>>,
    employeesData: Array<Record<string, unknown>>,
    serviceLocationConfigs: Array<Record<string, unknown>>,
    serviceAssignments: Array<Record<string, unknown>>,
    businessProfileData?: Record<string, unknown>
  ): CardData[] => {
    const defaultMediaSettings: MediaSettings = {
      zoom: 1,
      panX: 0,
      panY: 0,
      overlayOpacity: 0,
      muted: false,
    };

    const nextCards: CardData[] = [];

    // Generate service cards
    if (selectedStrategies.includes("services")) {
      const enabledConfigs = serviceLocationConfigs.filter((c) => c?.enabled);
      enabledConfigs.forEach((cfg, idx) => {
        const svc = servicesData.find((s) => s.id === cfg.serviceId) || {};
        const loc = locationsData.find((l) => l.id === cfg.locationId) || {};

        let priceDisplay = undefined as string | undefined;
        if (cfg.customPriceType === "variable") {
          const min =
            cfg.customPriceMin != null ? Math.round(Number(cfg.customPriceMin)) : undefined;
          const max =
            cfg.customPriceMax != null ? Math.round(Number(cfg.customPriceMax)) : undefined;
          if (min != null && max != null) priceDisplay = `$${min}-${max}`;
          else if (min != null) priceDisplay = `$${min}+`;
          else if (max != null) priceDisplay = `$${max}`;
        } else if (cfg.customPrice != null) {
          priceDisplay = `$${Math.round(Number(cfg.customPrice))}`;
        } else if (svc.priceType === "variable" && (svc.priceMin || svc.priceMax)) {
          const min = svc.priceMin != null ? Math.round(Number(svc.priceMin)) : undefined;
          const max = svc.priceMax != null ? Math.round(Number(svc.priceMax)) : undefined;
          if (min != null && max != null) priceDisplay = `$${min}-${max}`;
          else if (min != null) priceDisplay = `$${min}+`;
          else if (max != null) priceDisplay = `$${max}`;
        } else if (svc.price != null) {
          priceDisplay = `$${Math.round(Number(svc.price))}`;
        }

        nextCards.push({
          id: `service-${cfg.serviceId || idx}@${cfg.locationId || "loc"}`,
          type: "service",
          name: String(svc.name || "Service"),
          headline: String(svc.name || "Service"),
          tagline: String(loc.name || ""),
          description: String(svc.description || ""),
          price: priceDisplay,
          media: "",
          mediaType: "image",
          mediaUrl: "",
          mediaSettings: { ...defaultMediaSettings },
          backgroundColor: "#ffffff",
          backgroundType: "solid",
          gradient: "from-pink-400 to-red-500",
          badges: {
            licensed: false,
            experience: true,
            experienceYears: 3,
            locallyOwned: false,
            custom: "",
          },
          bulletPoints: [
            cfg.customDuration
              ? `${cfg.customDuration} min`
              : svc.duration
                ? `${svc.duration} min`
                : "Flexible",
            svc.category ? String(svc.category) : "Popular",
          ],
          fontFamily: "Inter",
          headlineColor: "#1f2937",
          textColor: "#6b7280",
          textAlignment: "left",
          showPrice: Boolean(priceDisplay),
          template: "modern",
          logoPlacement: "top-left",
          layout: "spacious",
          ctaText: "Book Service",
          serviceId: String(cfg.serviceId || ""),
          showProfileImage: false,
          isComplete: false,
          locationId: String(cfg.locationId || ""),
          locationName: String(loc.name || "Location"),
          serviceName: String(svc.name || "Service"),
        });
      });
    }

    // Generate employee cards
    if (selectedStrategies.includes("employees")) {
      if (employeeCardMode === "per-service") {
        const enabled = serviceAssignments.filter((a) => a?.enabled);
        enabled.forEach((asmt, idx) => {
          const emp = employeesData.find((e) => e.id === asmt.employeeId) || {};
          const svc = servicesData.find((s) => s.id === asmt.serviceId) || {};
          const loc = locationsData.find((l) => l.id === asmt.locationId) || {};
          nextCards.push({
            id: `emp-${asmt.employeeId}-${asmt.serviceId}-${asmt.locationId}-${idx}`,
            type: "employee",
            name: `${String(emp.fullName || "Employee")} - ${String(svc.name || "Service")}`,
            headline: String(emp.fullName || "Employee"),
            tagline: `${String(svc.name || "Service")} @ ${String(loc.name || "Location")}`,
            description: String(emp.role || ""),
            media: "",
            mediaType: "image",
            mediaUrl: "",
            mediaSettings: { ...defaultMediaSettings },
            profileImage: "",
            showProfileImage: false,
            backgroundColor: "#ffffff",
            backgroundType: "solid",
            gradient: "from-purple-400 to-pink-500",
            badges: {
              licensed: true,
              experience: true,
              experienceYears: 5,
              locallyOwned: false,
              custom: "",
            },
            bulletPoints: [String(loc.name || "Location")],
            fontFamily: "Inter",
            headlineColor: "#1f2937",
            textColor: "#6b7280",
            textAlignment: "center",
            showPrice: false,
            template: "personal",
            logoPlacement: "top-center",
            layout: "spacious",
            ctaText: `Book with ${String(emp.fullName || "Member")}`,
            serviceId: String(asmt.serviceId || ""),
            isComplete: false,
            employeeId: String(asmt.employeeId || ""),
            employeeName: String(emp.fullName || "Employee"),
            serviceName: String(svc.name || "Service"),
            locationId: String(asmt.locationId || ""),
            locationName: String(loc.name || "Location"),
          });
        });
      } else {
        // general card per employee (booking employees or deduped)
        const bookingEmployees = employeesData.filter((e) => e?.takesBookings);
        const dedupMap = new Map<string, Record<string, unknown>>();
        bookingEmployees.forEach((emp) => {
          const key = String(emp.email || emp.id);
          if (!dedupMap.has(key)) dedupMap.set(key, emp);
        });
        Array.from(dedupMap.values()).forEach((emp, idx) => {
          nextCards.push({
            id: `employee-${emp.id || idx}`,
            type: "employee",
            name: String(emp.fullName || "Team Member"),
            headline: String(emp.fullName || "Team Member"),
            tagline: String(emp.role || ""),
            description: String(emp.role || ""),
            media: "",
            mediaType: "image",
            mediaUrl: "",
            mediaSettings: { ...defaultMediaSettings },
            profileImage: "",
            showProfileImage: false,
            backgroundColor: "#ffffff",
            backgroundType: "solid",
            gradient: "from-purple-400 to-pink-500",
            badges: {
              licensed: true,
              experience: true,
              experienceYears: 5,
              locallyOwned: false,
              custom: "",
            },
            bulletPoints: ["Great reviews", "Customer favorite"],
            fontFamily: "Inter",
            headlineColor: "#1f2937",
            textColor: "#6b7280",
            textAlignment: "center",
            showPrice: false,
            template: "personal",
            logoPlacement: "top-center",
            layout: "spacious",
            ctaText: `Book with ${String(emp.fullName || "Member")}`,
            serviceId: "",
            isComplete: false,
            employeeId: String(emp.id || ""),
            employeeName: String(emp.fullName || "Team Member"),
          });
        });
      }
    }

    return nextCards;
  };

  // Save assignments data
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Filter assignments to only include valid intersections
      const validAssignments = assignments.filter((assignment) => {
        const intersectionLocations = getIntersectionLocations(
          assignment.employeeId,
          assignment.serviceId
        );

        // Only include if this assignment's location is in the valid intersections
        return intersectionLocations.some((loc) => loc.id === assignment.locationId);
      });

      const dataToSave = {
        assignments: validAssignments, // Use filtered assignments
        employees: employees,
        services: services,
        locations: locations,
      };

      console.log("Saving employee service assignment data:", dataToSave);
      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "employee_service_assignment",
          stepData: dataToSave,
          currentStep: "employee_service_assignment",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save employee service assignment data");
      }

      console.log("Employee service assignment data saved successfully");

      // Determine card strategy based on booking employees
      const hasBookingEmployees = bookingEmployees.length > 0;
      const employeeCardMode: "general" | "per-service" = hasBookingEmployees
        ? "per-service"
        : "general";
      const selectedStrategies: string[] = hasBookingEmployees
        ? ["employees", "services"]
        : ["services"];

      // Load required data for card generation
      const [serviceLocationRes, businessProfileRes] = await Promise.all([
        fetch(`/api/business/onboarding/draft/${OnboardingStep.SERVICE_LOCATION}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_INFO}`),
      ]);

      let serviceLocationConfigs: Array<Record<string, unknown>> = [];
      if (serviceLocationRes.ok) {
        const serviceLocationJson = await serviceLocationRes.json();
        const serviceLocationData = serviceLocationJson?.draftData || {};
        serviceLocationConfigs = Array.isArray(serviceLocationData.configurations)
          ? serviceLocationData.configurations
          : [];
      }

      let businessProfileData: Record<string, unknown> = {};
      if (businessProfileRes.ok) {
        const businessProfileJson = await businessProfileRes.json();
        businessProfileData = businessProfileJson?.draftData || {};
      }

      // Transform data to match card-assignment-strategy format
      const servicesForStrategy = services.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        duration: s.baseDuration,
        price: s.basePrice,
        priceType: "fixed" as const,
        description: "",
        deliveryOptions: {
          inPerson: s.locations.includes("physical"),
          mobile: s.locations.includes("mobile"),
          virtual: s.locations.includes("virtual"),
        },
      }));

      const locationsForStrategy = locations.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        address: l.address || "",
        resources: [],
      }));

      const employeesForStrategy = employees.map((e) => ({
        id: e.id,
        fullName: e.fullName,
        email: e.email,
        role: e.role,
        takesBookings: e.takesBookings,
        locationId: e.locationId,
      }));

      const serviceAssignmentsForStrategy = validAssignments.map((a) => ({
        employeeId: a.employeeId,
        serviceId: a.serviceId,
        locationId: a.locationId,
        enabled: a.enabled,
        customPrice: a.customPrice,
        customDuration: a.customDuration,
        visible: a.visible,
      }));

      // Save card-assignment-strategy data
      const cardStrategyData = {
        selectedStrategies,
        employeeCardMode,
        services: servicesForStrategy,
        locations: locationsForStrategy,
        serviceLocationConfigs,
        employees: employeesForStrategy,
        serviceAssignments: serviceAssignmentsForStrategy,
      };

      console.log("Saving card assignment strategy data:", cardStrategyData);
      const cardStrategyResponse = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: OnboardingStep.CARD_ASSIGNMENT_STRATEGY,
          stepData: cardStrategyData,
          currentStep: OnboardingStep.CARD_ASSIGNMENT_STRATEGY,
        }),
      });

      if (!cardStrategyResponse.ok) {
        throw new Error("Failed to save card assignment strategy data");
      }

      console.log("Card assignment strategy data saved successfully");

      // Generate default cards
      const generatedCards = generateDefaultCards(
        selectedStrategies,
        employeeCardMode,
        servicesForStrategy,
        locationsForStrategy,
        employeesForStrategy,
        serviceLocationConfigs,
        serviceAssignmentsForStrategy,
        businessProfileData
      );

      // Save card-studio data
      const cardStudioData = {
        cards: generatedCards,
        employeeCardMode,
        lastSaved: new Date().toISOString(),
      };

      console.log("Saving card studio data:", cardStudioData);
      const cardStudioResponse = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: OnboardingStep.CARD_STUDIO,
          stepData: cardStudioData,
          currentStep: OnboardingStep.CARD_STUDIO,
        }),
      });

      if (!cardStudioResponse.ok) {
        throw new Error("Failed to save card studio data");
      }

      console.log("Card studio data saved successfully");

      // Load booking strategy data (locations, employees, resources) the same way booking-strategy page does
      const [locationsRes, employeesRes, resourcesRes] = await Promise.all([
        fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_LOCATION}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_TEAM_MEMBERS}`),
        fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_RESOURCES}`),
      ]);

      let bookingStrategyLocations: Record<string, unknown>[] = [];
      let bookingStrategyEmployees: Record<string, unknown>[] = [];
      let bookingStrategyResources: Record<string, unknown>[] = [];

      // Process locations data (same as booking-strategy page)
      if (locationsRes.ok) {
        const { draftData: locationsData } = await locationsRes.json();
        if (locationsData) {
          // Handle physical locations
          if (locationsData["serviceTypes.physical"]?.addresses) {
            const physicalAddresses = locationsData["serviceTypes.physical"].addresses;
            bookingStrategyLocations = physicalAddresses.map(
              (address: Record<string, unknown>) => ({
                id: address.id || `physical-${address.name}`,
                name: address.name || "Physical Location",
                type: "physical",
              })
            );
          }
        }
      }

      // Process employees data (same as booking-strategy page)
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
              bookingStrategyEmployees = [
                ...bookingStrategyEmployees,
                ...((locationData as { teamMembers?: Record<string, unknown>[] })
                  .teamMembers as Record<string, unknown>[]),
              ];
            }
          });
        }
      }

      // Process resources data (same as booking-strategy page)
      if (resourcesRes.ok) {
        const { draftData: resourcesData } = await resourcesRes.json();
        if (resourcesData && typeof resourcesData === "object") {
          // Extract resources from all location objects
          Object.values(resourcesData).forEach((locationData: unknown) => {
            if (locationData && typeof locationData === "object" && "resources" in locationData) {
              const typedLocationData = locationData as { resources?: unknown[] };
              if (typedLocationData.resources && Array.isArray(typedLocationData.resources)) {
                bookingStrategyResources = [
                  ...bookingStrategyResources,
                  ...(typedLocationData.resources as Record<string, unknown>[]),
                ];
              }
            }
          });
        }
      }

      // Save booking strategy data with selectedStrategy: "hybrid"
      const bookingStrategyData = {
        selectedStrategy: "hybrid",
        locations: bookingStrategyLocations,
        employees: bookingStrategyEmployees,
        resources: bookingStrategyResources,
      };

      console.log("Saving booking strategy data:", bookingStrategyData);
      const bookingStrategyResponse = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: OnboardingStep.BOOKING_STRATEGY,
          stepData: bookingStrategyData,
          currentStep: OnboardingStep.BOOKING_STRATEGY,
        }),
      });

      if (!bookingStrategyResponse.ok) {
        throw new Error("Failed to save booking strategy data");
      }

      console.log("Booking strategy data saved successfully");

      return true;
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Failed to save data. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    // Save data before continuing
    const saveSuccess = await handleSave();
    if (saveSuccess) {
      router.push(goNext(employeeServiceAssignmentPage)?.pageRef ?? "");
    }
  };

  const filteredServices = useMemo(() => {
    if (selectedLocation === "all") {
      return services;
    }

    // Find the selected location to get its type
    const selectedLoc = locations.find((loc) => loc.id === selectedLocation);
    if (!selectedLoc) return services;

    // Filter services that support this location type
    return services.filter((s) => s.locations.includes(selectedLoc.type));
  }, [selectedLocation, services, locations]);

  const filteredEmployees = useMemo(() => {
    if (selectedLocation === "all") {
      return bookingEmployees;
    }

    // Filter employees who work at the selected location
    // This should match the exact location ID from the business team members data
    const filtered = bookingEmployees.filter((e) => e.locationId === selectedLocation);
    console.log(`Filtering employees for location ${selectedLocation}:`, {
      allEmployees: bookingEmployees,
      filteredEmployees: filtered,
      selectedLocation,
    });
    return filtered;
  }, [selectedLocation, bookingEmployees]);

  if (isClient && !isLoading && bookingEmployees.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <OnboardingProgressBar
            currentStep={getStepInfo("employee-service-assignment").currentStep}
            totalSteps={getStepInfo("employee-service-assignment").totalSteps}
            stepName={getStepInfo("employee-service-assignment").stepName}
            goPrevious={() => router.push(goPrevious(employeeServiceAssignmentPage)?.pageRef ?? "")}
            user={user?.email ?? ""}
          />

          {/* No Booking Employees */}
          <Card className="text-center p-12">
            <CardContent>
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No booking employees found</h2>
              <p className="text-gray-600 mb-6">
                You haven&apos;t added any team members who take bookings. You can skip this step.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="primary"
                  onClick={async () => {
                    const saveSuccess = await handleSave();
                    if (saveSuccess) {
                      router.push(goNext(employeeServiceAssignmentPage)?.pageRef ?? "");
                    }
                  }}
                  loading={isSaving}
                >
                  Skip This Step
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <OnboardingProgressBar
          currentStep={getStepInfo("employee-service-assignment").currentStep}
          totalSteps={getStepInfo("employee-service-assignment").totalSteps}
          stepName={getStepInfo("employee-service-assignment").stepName}
          goPrevious={() => router.push(goPrevious(employeeServiceAssignmentPage)?.pageRef ?? "")}
          user={user?.email ?? ""}
        />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Who can perform each service?</h1>
          <p className="text-gray-600 mb-4">
            Assign your team members to the services they can provide. You can customize pricing and
            duration for each assignment.
          </p>

          {/* Stats and Controls */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              {stats.servicesWithoutCoverage.length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.servicesWithoutCoverage.length} services without coverage
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="location-filter" className="text-sm">
                Filter by location:
              </Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Enhanced Loading State */}
        {!isClient || isLoading ? (
          <Card className="bg-white border-0 shadow-xl mb-8">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <LoadingSpinner size="md" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Setting up your service assignments
              </h3>
              <div className="space-y-2 text-gray-600 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  Loading team members from previous steps...
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  Loading services and locations...
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  Building assignment matrix...
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>What we&apos;re doing:</strong> We&apos;re gathering your team members,
                  services, and locations to create a matrix where you can assign which employees
                  can perform which services at which locations.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isClient ? (
          <>
            {/* Matrix View */}
            <Card>
              <CardHeader>
                <CardTitle>Employee × Service Assignment Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-3 border-b">Employee</th>
                        {filteredServices
                          .filter((s) => s.requiresEmployee)
                          .map((service) => {
                            const visibleAssignments = getVisibleServiceAssignments(service.id);
                            const enabledCount = visibleAssignments.filter((a) => a.enabled).length;
                            const totalCount = visibleAssignments.length;
                            const allEnabled = totalCount > 0 && enabledCount === totalCount;

                            return (
                              <th
                                key={service.id}
                                className="text-center p-3 border-b min-w-[120px]"
                              >
                                <div className="space-y-2">
                                  <div>
                                    <p className="font-medium">{service.name}</p>
                                    <p className="text-xs text-gray-500">{service.category}</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleServiceColumn(service.id, !allEnabled)}
                                    className="text-xs"
                                  >
                                    {allEnabled ? (
                                      <>
                                        <CheckSquare className="h-3 w-3 mr-1" />
                                        Uncheck All
                                      </>
                                    ) : (
                                      <>
                                        <Square className="h-3 w-3 mr-1" />
                                        Check All
                                      </>
                                    )}
                                  </Button>
                                  <div className="text-xs text-gray-500">
                                    {enabledCount}/{totalCount}
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} className="border-b">
                          <td className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{employee.fullName}</p>
                                  <p className="text-sm text-gray-500">{employee.role}</p>
                                </div>
                              </div>
                              {(() => {
                                const visibleAssignments = getVisibleEmployeeAssignments(
                                  employee.id
                                );
                                const enabledCount = visibleAssignments.filter(
                                  (a) => a.enabled
                                ).length;
                                const totalCount = visibleAssignments.length;
                                const allEnabled = totalCount > 0 && enabledCount === totalCount;

                                return (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleEmployeeRow(employee.id, !allEnabled)}
                                      className="text-xs"
                                    >
                                      {allEnabled ? (
                                        <>
                                          <CheckSquare className="h-3 w-3 mr-1" />
                                          Uncheck All
                                        </>
                                      ) : (
                                        <>
                                          <Square className="h-3 w-3 mr-1" />
                                          Check All
                                        </>
                                      )}
                                    </Button>
                                    <div className="text-xs text-gray-500">
                                      {enabledCount}/{totalCount}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          {filteredServices
                            .filter((s) => s.requiresEmployee)
                            .map((service) => {
                              // Find the intersection: locations where both employee works AND service is offered
                              const intersectionLocations = getIntersectionLocations(
                                employee.id,
                                service.id
                              );

                              if (intersectionLocations.length === 0) {
                                return (
                                  <td key={service.id} className="p-3 text-center">
                                    <span className="text-gray-400 text-xs">N/A</span>
                                  </td>
                                );
                              }

                              // Get assignments for intersection locations
                              const assignments = intersectionLocations.map((location) =>
                                getAssignment(employee.id, service.id, location.id)
                              );

                              const enabledAssignments = assignments.filter((a) => a?.enabled);
                              const totalAssignments = assignments.length;

                              return (
                                <td key={service.id} className="p-3 text-center">
                                  <div className="space-y-1">
                                    <div className="text-sm">
                                      {enabledAssignments.length > 0 ? (
                                        <Badge
                                          variant="default"
                                          className="bg-green-100 text-green-800"
                                        >
                                          <Check className="h-3 w-3 mr-1" />
                                          {enabledAssignments.length}/{totalAssignments} Assigned
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary">
                                          <X className="h-3 w-3 mr-1" />
                                          0/{totalAssignments} Assigned
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      {intersectionLocations.map((location) => {
                                        const assignment = getAssignment(
                                          employee.id,
                                          service.id,
                                          location.id
                                        );

                                        return (
                                          <div
                                            key={location.id}
                                            className="flex items-center justify-center space-x-2"
                                          >
                                            <Checkbox
                                              checked={assignment?.enabled || false}
                                              onCheckedChange={(checked) =>
                                                toggleAssignment(
                                                  employee.id,
                                                  service.id,
                                                  location.id,
                                                  !!checked
                                                )
                                              }
                                            />
                                            <span className="text-xs text-gray-600">
                                              {location.name}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
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
        ) : (
          <Card className="bg-white border-0 shadow-xl mb-8">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LoadingSpinner size="md" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
            </CardContent>
          </Card>
        )}

        {/* Services Without Employee Requirements */}
        {isClient && services.filter((s) => !s.requiresEmployee).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Services That Don&apos;t Require Specific Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services
                  .filter((s) => !s.requiresEmployee)
                  .map((service) => (
                    <div key={service.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <p className="text-sm text-gray-600">{service.category}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.baseDuration}min
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />${service.basePrice}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {service.anonymous ? "Anonymous" : "Self-Service"}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Override Dialog */}
        <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Customize Assignment</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              {selectedAssignment && (
                <div className="p-6 space-y-4">
                  <div>
                    <Label>Custom Price (optional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        type="number"
                        placeholder="Override price"
                        value={selectedAssignment.customPrice || ""}
                        onChange={(e) =>
                          setSelectedAssignment((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  customPrice: e.target.value ? Number(e.target.value) : undefined,
                                }
                              : null
                          )
                        }
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Custom Duration (optional)</Label>
                    <Input
                      type="number"
                      placeholder="Override duration (minutes)"
                      value={selectedAssignment.customDuration || ""}
                      onChange={(e) =>
                        setSelectedAssignment((prev) =>
                          prev
                            ? {
                                ...prev,
                                customDuration: e.target.value ? Number(e.target.value) : undefined,
                              }
                            : null
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show employee name to customers</Label>
                      <p className="text-sm text-gray-600">
                        When disabled, customers see the business name instead
                      </p>
                    </div>
                    <Switch
                      checked={selectedAssignment.visible}
                      onCheckedChange={(visible) =>
                        setSelectedAssignment((prev) => (prev ? { ...prev, visible } : null))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveOverrides} variant="primary">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(goPrevious(employeeServiceAssignmentPage)?.pageRef ?? "")}
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
            >
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleContinue}
              disabled={isSaving || isRoutingPrevious}
              className="px-8"
              loading={isSaving}
            >
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
