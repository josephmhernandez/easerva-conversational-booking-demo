"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  Building,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ImageIcon,
  MapPin,
  Save,
  Shield,
  Upload,
  Users,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import OnboardingProgressBar from "../../../../components/onboarding/OnboardingProgressBar";
import CardPreview from "../../../components/cards/CardPreview";
import { OnboardingStep } from "../../../constants/businessConstants";
import { cardStudioPage, goNext, goPrevious } from "../../../constants/routeConstants";
import { BadgeSettings, MediaSettings, MediaType } from "../../../types/businessTypes";
import { getStepInfo } from "../../../utils/onboardingSteps";

export interface CardData {
  id: string;
  type: "business" | "location" | "service" | "employee";
  name: string;
  headline: string;
  tagline: string;
  description: string;
  price?: string;
  media?: string;
  mediaType: MediaType;
  mediaUrl?: string;
  // Persisted storage path for background media
  mediaStoragePath?: string;
  mediaSettings: MediaSettings;
  profileImage?: string;
  // Persisted storage path for profile image
  profileStoragePath?: string;
  showProfileImage?: boolean;
  backgroundColor: string;
  backgroundType: "solid" | "gradient" | "pattern";
  gradient: string;
  badges: BadgeSettings;
  bulletPoints: string[];
  fontFamily: string;
  headlineColor: string;
  textColor: string;
  textAlignment: "left" | "center" | "right";
  showPrice: boolean;
  template: string;
  logoPlacement: "top-left" | "top-center" | "bottom";
  layout: "compact" | "spacious";
  ctaText: string;
  // serviceIds?: string[];
  isComplete: boolean;
  // Optional metadata for grouping
  locationId?: string;
  locationName?: string;
  serviceId: string;
  serviceName?: string;
  employeeId?: string;
  employeeName?: string;
}

export default function CardStudio() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [manualSelection] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string>("business");
  const [activeCard, setActiveCard] = useState<string>("");
  const [, setLastSaved] = useState<Date | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [showOpacityTooltip, setShowOpacityTooltip] = useState(false);
  const [, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeCardMode, setEmployeeCardMode] = useState<"general" | "per-service">("general");
  const [expandedServiceLocation, setExpandedServiceLocation] = useState<string | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRoutingPrevious, setIsRoutingPrevious] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dragOver, setDragOver] = useState<Record<string, boolean>>({});

  const [cards, setCards] = useState<CardData[]>([]);

  // Load card data from draft API
  useEffect(() => {
    const loadCardStudioData = async () => {
      setIsLoading(true);
      try {
        // First, try to load existing card studio data
        const cardStudioRes = await fetch(
          `/api/business/onboarding/draft/${OnboardingStep.CARD_STUDIO}`
        );

        if (cardStudioRes.ok) {
          const cardStudioJson = await cardStudioRes.json();
          const cardStudioData = cardStudioJson?.draftData || {};

          if (
            cardStudioData.cards &&
            Array.isArray(cardStudioData.cards) &&
            cardStudioData.cards.length > 0
          ) {
            // Use saved card data
            setCards(cardStudioData.cards);
            if (cardStudioData.employeeCardMode) {
              setEmployeeCardMode(cardStudioData.employeeCardMode);
            }
            setHasUnsavedChanges(false);

            // Expand first available group by default
            const firstType = cardStudioData.cards[0]?.type;
            if (firstType) setExpandedAccordion(firstType);
            return;
          }
        }

        // If no saved card data, generate cards from strategy data
        const [businessProfileRes, strategyRes, empAssignRes] = await Promise.all([
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_INFO}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.CARD_ASSIGNMENT_STRATEGY}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.EMPLOYEE_SERVICE_ASSIGNMENT}`),
        ]);

        if (!strategyRes.ok) throw new Error("Failed to load card assignment strategy draft");
        const strategyJson = await strategyRes.json();
        const draft = strategyJson?.draftData || {};

        // Load business profile data
        let businessProfileData: Record<string, unknown> = {};
        if (businessProfileRes.ok) {
          const businessProfileJson = await businessProfileRes.json();
          businessProfileData = businessProfileJson?.draftData || {};
        }

        let empAssignDraft: Record<string, unknown> | null = null;
        if (empAssignRes.ok) {
          const empJson = await empAssignRes.json();
          empAssignDraft = empJson?.draftData || null;
        }
        const selectedStrategies: string[] = Array.isArray(draft.selectedStrategies)
          ? draft.selectedStrategies
          : [];
        // Base data from strategy draft
        let services: Array<Record<string, unknown>> = Array.isArray(draft.services)
          ? draft.services
          : [];
        let locations: Array<Record<string, unknown>> = Array.isArray(draft.locations)
          ? draft.locations
          : [];
        let employees: Array<Record<string, unknown>> = Array.isArray(draft.employees)
          ? draft.employees
          : [];
        let serviceAssignments: Array<Record<string, unknown>> = Array.isArray(
          draft.serviceAssignments
        )
          ? draft.serviceAssignments
          : [];
        const serviceLocationConfigs: Array<Record<string, unknown>> = Array.isArray(
          draft.serviceLocationConfigs
        )
          ? draft.serviceLocationConfigs
          : [];
        const mode: "per-service" | "general" =
          draft.employeeCardMode === "per-service" ? "per-service" : "general";
        setEmployeeCardMode(mode);

        // If employee per-service mode, prefer data from EMPLOYEE_SERVICE_ASSIGNMENT for accuracy
        if (empAssignDraft && mode === "per-service") {
          services = Array.isArray(empAssignDraft.services) ? empAssignDraft.services : services;
          locations = Array.isArray(empAssignDraft.locations)
            ? empAssignDraft.locations
            : locations;
          employees = Array.isArray(empAssignDraft.employees)
            ? empAssignDraft.employees
            : employees;
          serviceAssignments = Array.isArray(empAssignDraft.assignments)
            ? empAssignDraft.assignments
            : serviceAssignments;
        }

        const defaultMediaSettings: MediaSettings = {
          zoom: 1,
          panX: 0,
          panY: 0,
          overlayOpacity: 0,
          muted: false,
        };

        const nextCards: CardData[] = [];

        if (selectedStrategies.includes("business")) {
          const businessName = (businessProfileData.name as string) || "Your Business";
          const businessDescription =
            (businessProfileData.description as string) ||
            "Tailored experiences your customers will love";

          nextCards.push({
            id: `business-1`,
            type: "business",
            name: businessName,
            headline: businessName,
            tagline: businessDescription || "Premium services",
            description: businessDescription,
            media: "",
            mediaType: "image",
            mediaUrl: "",
            mediaSettings: { ...defaultMediaSettings },
            backgroundColor: "#ffffff",
            backgroundType: "solid",
            gradient: "from-blue-500 to-purple-600",
            badges: {
              licensed: false,
              experience: false,
              experienceYears: 1,
              locallyOwned: true,
              custom: "",
            },
            bulletPoints: ["Quality", "Convenience", "Trusted"],
            fontFamily: "Inter",
            headlineColor: "#1f2937",
            textColor: "#6b7280",
            textAlignment: "left",
            showPrice: false,
            template: "modern",
            logoPlacement: "top-left",
            layout: "spacious",
            ctaText: "Book Now",
            serviceId: "",
            showProfileImage: false,
            isComplete: false,
          });
        }

        if (selectedStrategies.includes("locations")) {
          const physicalLocations = locations.filter((l) => l?.type === "physical");
          physicalLocations.forEach((loc, idx) => {
            nextCards.push({
              id: `location-${loc.id || idx}`,
              type: "location",
              name: String(loc.name || "Location"),
              headline: String(loc.name || "Location"),
              tagline: String(loc.address || ""),
              description: String(loc.address || ""),
              media: "",
              mediaType: "image",
              mediaUrl: "",
              mediaSettings: { ...defaultMediaSettings },
              backgroundColor: "#f3f4f6",
              backgroundType: "gradient",
              gradient: "from-green-400 to-blue-500",
              badges: {
                licensed: true,
                experience: false,
                experienceYears: 0,
                locallyOwned: true,
                custom: "",
              },
              bulletPoints: ["Easy access", "Great staff"],
              fontFamily: "Inter",
              headlineColor: "#1f2937",
              textColor: "#6b7280",
              textAlignment: "center",
              showPrice: false,
              template: "clean",
              logoPlacement: "top-center",
              layout: "compact",
              ctaText: "Visit Us",
              serviceId: "",
              showProfileImage: false,
              isComplete: false,
              locationId: String(loc.id || ""),
              locationName: String(loc.name || "Location"),
            });
          });
        }

        if (selectedStrategies.includes("services")) {
          const enabledConfigs = serviceLocationConfigs.filter((c) => c?.enabled);
          enabledConfigs.forEach((cfg, idx) => {
            const svc = services.find((s) => s.id === cfg.serviceId) || {};
            const loc = locations.find((l) => l.id === cfg.locationId) || {};
            if (!svc || !svc.id) {
              console.warn("[CardStudio] Service not found for cfg", cfg);
            }
            if (!loc || !loc.id) {
              console.warn("[CardStudio] Location not found for cfg", cfg);
            }
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

        if (selectedStrategies.includes("employees")) {
          if (mode === "per-service") {
            let enabled = serviceAssignments.filter((a) => a?.enabled);
            // Fallback: if none enabled from strategy draft, try employee assignment draft if present
            if (
              enabled.length === 0 &&
              empAssignDraft &&
              Array.isArray(empAssignDraft.assignments)
            ) {
              enabled = empAssignDraft.assignments.filter(
                (a: Record<string, unknown>) => a?.enabled
              );
            }
            enabled.forEach((asmt, idx) => {
              const emp = employees.find((e) => e.id === asmt.employeeId) || {};
              const svc = services.find((s) => s.id === asmt.serviceId) || {};
              const loc = locations.find((l) => l.id === asmt.locationId) || {};
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
            const bookingEmployees = employees.filter((e) => e?.takesBookings);
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

        setCards(nextCards);
        setHasUnsavedChanges(false); // Reset unsaved changes after loading

        // Expand first available group by default
        const firstType = nextCards[0]?.type;
        if (firstType) setExpandedAccordion(firstType);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    loadCardStudioData();
  }, []);

  const cardGroups = {
    // business: cards.filter((card) => card.type === "business"),
    // location: cards.filter((card) => card.type === "location"),
    service: cards.filter((card) => card.type === "service"),
    employee: cards.filter((card) => card.type === "employee"),
  };

  // Group helpers for nested accordions
  const servicesByLocation: Record<string, CardData[]> = cardGroups.service.reduce(
    (acc, card) => {
      const key = card.locationName || "Other";
      (acc[key] = acc[key] || []).push(card);
      return acc;
    },
    {} as Record<string, CardData[]>
  );

  const employeeServiceCardsByEmployee: Record<string, CardData[]> = cardGroups.employee.reduce(
    (acc, card) => {
      if (employeeCardMode !== "per-service") return acc;
      const key = card.employeeName || "Employee";
      (acc[key] = acc[key] || []).push(card);
      return acc;
    },
    {} as Record<string, CardData[]>
  );

  const groupIcons = {
    business: Building,
    location: MapPin,
    service: Briefcase,
    employee: Users,
  };

  const groupLabels = {
    // business: "Business Cards",
    // location: "Location Cards",
    service: "Service Cards",
    employee: "Employee Cards",
  };

  // Auto-save functionality
  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize lastSaved on client side and auto-save simulation
  useEffect(() => {
    // Set initial date on client side only
    setLastSaved(new Date());

    const interval = setInterval(() => {
      setLastSaved(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Removed JS scroll logic per request; use anchor navigation + scroll margins instead

  const updateCard = (cardId: string, updates: Partial<CardData>) => {
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, ...updates } : card)));
    setHasUnsavedChanges(true);
  };

  const handleNestedUpdate = (
    cardId: string,
    parent: keyof CardData,
    field: string,
    value: string | boolean | number
  ) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? {
              ...card,
              [parent]: {
                ...(card[parent] as Record<string, unknown>),
                [field]: value,
              },
            }
          : card
      )
    );
    setHasUnsavedChanges(true);
  };

  const isVideoCompatible = (file: File): boolean => {
    const compatibleTypes = ["video/mp4", "video/webm", "video/mov", "video/quicktime"];
    const compatibleExtensions = [".mp4", ".webm", ".mov"];

    const hasCompatibleType = compatibleTypes.includes(file.type);
    const hasCompatibleExtension = compatibleExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    return hasCompatibleType || hasCompatibleExtension;
  };

  const handleMediaUpload = async (cardId: string, type: MediaType, file: File) => {
    setIsUploadingMedia(true);
    setUploadProgress((prev) => ({ ...prev, [type]: 0 }));
    setUploadErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[type];
      return newErrors;
    });

    // Client-side file validation
    const maxSize = type === "video" ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for images
    if (file.size > maxSize) {
      const sizeLimit = type === "video" ? "100MB" : "10MB";
      const errorMessage = `File size must be less than ${sizeLimit}`;
      setUploadErrors((prev) => ({ ...prev, [type]: errorMessage }));
      setIsUploadingMedia(false);
      return;
    }

    // Check video compatibility for better user experience
    if (type === "video" && !isVideoCompatible(file)) {
      const errorMessage = `${file.name} uses a codec that may not play in browsers. Please convert to MP4 format for best compatibility.`;
      setUploadErrors((prev) => ({ ...prev, [type]: errorMessage }));
      setIsUploadingMedia(false);
      return;
    }

    try {
      // Ensure we have a businessId in localStorage (persisted by draft saves)
      let businessId = localStorage.getItem("onboarding_business_id");
      if (!businessId) {
        // Save first to obtain a businessId from backend
        setUploadProgress((prev) => ({ ...prev, [type]: 10 }));
        await saveCardStudioData();
        businessId = localStorage.getItem("onboarding_business_id");
      }

      if (!businessId) {
        throw new Error("Unable to get business ID. Please try saving your progress first.");
      }

      setUploadProgress((prev) => ({ ...prev, [type]: 20 }));

      // Create preview immediately for better UX
      const previewUrl = URL.createObjectURL(file);
      if (type === "profile") {
        updateCard(cardId, { profileImage: previewUrl, showProfileImage: true });
      } else {
        updateCard(cardId, { mediaUrl: previewUrl, mediaType: type });
      }

      // Begin server upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("businessId", businessId);
      formData.append("cardId", cardId);
      formData.append("mediaType", type);

      setUploadProgress((prev) => ({ ...prev, [type]: 50 }));

      const response = await fetch("/api/business/onboarding/upload-media", {
        method: "POST",
        body: formData,
      });

      setUploadProgress((prev) => ({ ...prev, [type]: 80 }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload media");
      }

      const { url, fileName } = await response.json();

      if (type === "profile") {
        updateCard(cardId, {
          profileImage: url,
          showProfileImage: true,
          profileStoragePath: fileName,
        });
      } else {
        updateCard(cardId, {
          mediaUrl: url,
          mediaType: type,
          mediaStoragePath: fileName,
        });
      }

      setUploadProgress((prev) => ({ ...prev, [type]: 100 }));

      // Persist immediately after successful upload
      try {
        await saveCardStudioData();
      } catch (e) {
        console.error("Auto-save after upload failed:", e);
      }

      // Clean up the blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(previewUrl);
      }, 5000);
    } catch (error) {
      console.error("Media upload failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setUploadErrors((prev) => ({ ...prev, [type]: errorMessage }));

      // Reset the preview on error
      if (type === "profile") {
        updateCard(cardId, { profileImage: "", showProfileImage: false });
      } else {
        updateCard(cardId, { mediaUrl: "", mediaType: "image" });
      }
    } finally {
      setIsUploadingMedia(false);
      setTimeout(() => {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[type];
          return newProgress;
        });
      }, 3000);
    }
  };

  const handleDropUpload = (
    cardId: string,
    type: MediaType,
    event: React.DragEvent<HTMLButtonElement | HTMLDivElement>
  ) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleMediaUpload(cardId, type, file);
    }
    setDragOver((prev) => ({ ...prev, [`${type}-${cardId}`]: false }));
  };

  const setDragOverState = (key: string, value: boolean) => {
    setDragOver((prev) => ({ ...prev, [key]: value }));
  };

  const isDragOver = (key: string) => Boolean(dragOver[key]);

  const copyFromCard = (targetCardId: string, sourceCardId: string) => {
    const source = cards.find((c) => c.id === sourceCardId);
    const target = cards.find((c) => c.id === targetCardId);
    if (!source || !target) return;

    const styleUpdates: Partial<CardData> = {
      // Media and imagery
      mediaType: source.mediaType,
      mediaUrl: source.mediaUrl,
      mediaStoragePath: source.mediaStoragePath,
      mediaSettings: { ...source.mediaSettings },
      profileImage: source.profileImage,
      profileStoragePath: source.profileStoragePath,
      showProfileImage: source.showProfileImage,

      // Visual design
      backgroundColor: source.backgroundColor,
      backgroundType: source.backgroundType,
      gradient: source.gradient,
      fontFamily: source.fontFamily,
      headlineColor: source.headlineColor,
      textColor: source.textColor,
      textAlignment: source.textAlignment,
      template: source.template,
      logoPlacement: source.logoPlacement,
      layout: source.layout,
      ctaText: source.ctaText,

      // Badges and bullet points (presentation helpers)
      badges: { ...source.badges },
      bulletPoints: [...source.bulletPoints],

      // Price visibility is a display toggle; keep structure-specific price data intact
      showPrice: source.showPrice,
    };

    setCards((prev) =>
      prev.map((card) => (card.id === targetCardId ? { ...card, ...styleUpdates } : card))
    );
    setHasUnsavedChanges(true);
  };

  const getActiveCard = () => cards.find((card) => card.id === activeCard);

  // Bulk apply removed

  // Save functionality
  const saveCardStudioData = useCallback(async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        cards,
        employeeCardMode,
        lastSaved: new Date().toISOString(),
      };

      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: OnboardingStep.CARD_STUDIO,
          stepData: dataToSave,
          currentStep: OnboardingStep.CARD_STUDIO,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save card studio data");
      }

      // Capture businessId like business-cards page does (if backend returns it)
      try {
        const result = await response.json();
        if (result && result.businessId) {
          localStorage.setItem("onboarding_business_id", result.businessId);
        }
      } catch {
        // ignore non-JSON or missing businessId
      }

      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      console.log("Card studio data saved successfully");
    } catch (error) {
      console.error("Error saving card studio data:", error);
      alert("Failed to save card studio data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [cards, employeeCardMode]);

  // Navigation protection
  const handleBackClick = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave this page? Your changes will not be saved."
      );
      if (!confirmed) return;
    }
    setIsRoutingPrevious(true);
    router.push(goPrevious(cardStudioPage)?.pageRef ?? "");
  }, [hasUnsavedChanges, router]);

  const handleContinue = async () => {
    await saveCardStudioData();
    router.push(goNext(cardStudioPage)?.pageRef ?? "");
  };

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && !isLoading) {
      const timer = setTimeout(() => {
        saveCardStudioData();
      }, 5000); // Auto-save after 5 seconds of inactivity
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, isLoading, saveCardStudioData]);

  // Browser navigation protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // renderCardPreview removed - unused function

  const renderCardEditor = (card: CardData) => {
    // Convert CardData to CardDesign for CardPreview component (unused in this function)
    // const cardDesign: CardDesign = {
    //   id: card.id,
    //   name: card.name,
    //   mediaType: card.mediaType,
    //   mediaUrl: card.mediaUrl,
    //   mediaSettings: card.mediaSettings,
    //   profileImage: card.profileImage,
    //   showProfileImage: card.showProfileImage,
    //   backgroundColor: card.backgroundColor,
    //   headline: card.headline,
    //   tagline: card.tagline,
    //   bulletPoints: card.bulletPoints,
    //   ctaText: card.ctaText,
    //   badges: card.badges,
    //   serviceIds: card.serviceIds,
    // };

    return (
      <div className="space-y-6 p-4 border-t">
        <div className="space-y-6">
          {/* Copy From Dropdown */}
          {cards.length > 1 && (
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Label className="text-sm font-medium text-gray-700">Copy design from:</Label>
                  <Select onValueChange={(sourceCardId) => copyFromCard(card.id, sourceCardId)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose a card to copy" />
                    </SelectTrigger>
                    <SelectContent>
                      {cards
                        .filter((c) => c.id !== card.id)
                        .map((c) => {
                          const locationSuffix = c.locationName ? ` — ${c.locationName}` : "";
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.type}){locationSuffix}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card Background */}
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Background</h3>
              <Tabs
                value={card.mediaType}
                onValueChange={(value) => updateCard(card.id, { mediaType: value as MediaType })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image" className="flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>Image</span>
                  </TabsTrigger>
                  <TabsTrigger value="video" className="flex items-center space-x-2">
                    <Video className="w-4 h-4" />
                    <span>Video</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="image" className="space-y-4 mt-6">
                  <div className="space-y-4">
                    <Button
                      onClick={() => imageInputRef.current?.click()}
                      variant="outline"
                      disabled={isUploadingMedia}
                      className={`w-full h-20 border-2 border-dashed disabled:opacity-50 ${
                        isDragOver(`image-${card.id}`)
                          ? "border-orange-400 bg-orange-50"
                          : "border-gray-300 hover:border-orange-300 hover:bg-orange-50"
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverState(`image-${card.id}`, true);
                      }}
                      onDragEnter={() => setDragOverState(`image-${card.id}`, true)}
                      onDragLeave={() => setDragOverState(`image-${card.id}`, false)}
                      onDrop={(e) => handleDropUpload(card.id, "image", e)}
                    >
                      <div className="text-center">
                        {isUploadingMedia && uploadProgress.image !== undefined ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="text-sm text-gray-600">
                              Uploading... {Math.round(uploadProgress.image || 0)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Upload Image (JPG, PNG, WEBP, up to 10MB, 16:9 ratio recommended)
                            </span>
                          </>
                        )}
                      </div>
                    </Button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.svg,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMediaUpload(card.id, "image", file);
                      }}
                      className="hidden"
                    />

                    {uploadErrors.image && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          {uploadErrors.image}
                        </p>
                      </div>
                    )}

                    {card.mediaUrl && card.mediaType === "image" && (
                      <div className="mt-4">
                        <div className="w-full h-32 border border-gray-200 rounded-lg overflow-hidden">
                          <Image
                            src={card.mediaUrl}
                            alt="Current background"
                            className="w-full h-full object-cover"
                            width={320}
                            height={128}
                          />
                        </div>
                        <Button
                          onClick={() =>
                            updateCard(card.id, { mediaUrl: "", mediaStoragePath: undefined })
                          }
                          variant="outline"
                          size="sm"
                          className="mt-2 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Remove Image
                        </Button>
                      </div>
                    )}

                    {card.mediaUrl && (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Zoom</Label>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={card.mediaSettings.zoom}
                            onChange={(e) =>
                              handleNestedUpdate(
                                card.id,
                                "mediaSettings",
                                "zoom",
                                Number.parseFloat(e.target.value)
                              )
                            }
                            className="w-full mt-2"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">
                            Text Overlay Opacity
                          </Label>
                          <div className="relative mt-2">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={card.mediaSettings.overlayOpacity}
                              onChange={(e) =>
                                handleNestedUpdate(
                                  card.id,
                                  "mediaSettings",
                                  "overlayOpacity",
                                  Number.parseFloat(e.target.value)
                                )
                              }
                              onMouseMove={() => {
                                // Tooltip positioning handled by CSS
                              }}
                              onMouseEnter={() => setShowOpacityTooltip(true)}
                              onMouseLeave={() => setShowOpacityTooltip(false)}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${card.mediaSettings.overlayOpacity * 100}%, #e5e7eb ${card.mediaSettings.overlayOpacity * 100}%, #e5e7eb 100%)`,
                              }}
                            />
                            {showOpacityTooltip && (
                              <div
                                className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none"
                                style={{
                                  left: `${Math.max(0, Math.min(100, card.mediaSettings.overlayOpacity * 100))}%`,
                                  transform: "translateX(-50%)",
                                  top: "-35px",
                                }}
                              >
                                {Math.round(card.mediaSettings.overlayOpacity * 100)}%
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>No overlay</span>
                            <span>Light</span>
                            <span>Medium</span>
                            <span>Dark</span>
                            <span>Very dark</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="video" className="space-y-4 mt-6">
                  <Button
                    onClick={() => videoInputRef.current?.click()}
                    variant="outline"
                    disabled={isUploadingMedia}
                    className={`w-full h-20 border-2 border-dashed disabled:opacity-50 ${
                      isDragOver(`video-${card.id}`)
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-300 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverState(`video-${card.id}`, true);
                    }}
                    onDragEnter={() => setDragOverState(`video-${card.id}`, true)}
                    onDragLeave={() => setDragOverState(`video-${card.id}`, false)}
                    onDrop={(e) => handleDropUpload(card.id, "video", e)}
                  >
                    <div className="text-center">
                      {isUploadingMedia && uploadProgress.video !== undefined ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="text-sm text-gray-600">
                            Uploading... {Math.round(uploadProgress.video || 0)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Upload Video (MP4, WEBM, MOV - up to 50MB and up to 30 seconds)
                          </span>
                        </>
                      )}
                    </div>
                  </Button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept=".mp4,.webm,.mov"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMediaUpload(card.id, "video", file);
                    }}
                    className="hidden"
                  />

                  {uploadErrors.video && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {uploadErrors.video}
                      </p>
                    </div>
                  )}

                  {card.mediaUrl && card.mediaType === "video" && (
                    <div className="mt-4">
                      <div className="w-full h-32 border border-gray-200 rounded-lg overflow-hidden">
                        <video
                          src={card.mediaUrl}
                          className="w-full h-full object-cover"
                          controls
                          muted
                          crossOrigin="anonymous"
                        />
                      </div>
                      <Button
                        onClick={() =>
                          updateCard(card.id, { mediaUrl: "", mediaStoragePath: undefined })
                        }
                        variant="outline"
                        size="sm"
                        className="mt-2 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Remove Video
                      </Button>
                    </div>
                  )}

                  {card.mediaUrl && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="muted"
                            checked={card.mediaSettings.muted}
                            onCheckedChange={(checked) =>
                              handleNestedUpdate(card.id, "mediaSettings", "muted", checked)
                            }
                          />
                          <Label htmlFor="muted" className="text-sm">
                            Muted
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Card Information */}
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Information</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Card Headline
                  </Label>
                  <Input
                    value={card.headline}
                    onChange={(e) => updateCard(card.id, { headline: e.target.value })}
                    placeholder="Business name or service"
                    className="h-12"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Description
                  </Label>
                  <Textarea
                    value={card.tagline}
                    onChange={(e) => updateCard(card.id, { tagline: e.target.value })}
                    placeholder="Brief description of your services"
                    className="min-h-[80px]"
                    maxLength={200}
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {card.tagline.length}/200
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Profile Picture <span className="text-gray-400">(optional)</span>
                  </Label>
                  <div className="flex items-center justify-start mb-4 px-2 space-x-2">
                    <Switch
                      id="showProfile"
                      checked={card.showProfileImage || false}
                      onCheckedChange={(checked) => {
                        updateCard(card.id, { showProfileImage: checked });
                      }}
                      disabled={!card.profileImage}
                    />
                    <Label htmlFor="showProfile" className="text-sm font-medium text-gray-700">
                      Show Profile Picture
                      {!card.profileImage && (
                        <span className="text-gray-400 ml-1">(Upload image first)</span>
                      )}
                    </Label>
                  </div>
                  <Button
                    onClick={() => profileInputRef.current?.click()}
                    variant="outline"
                    disabled={isUploadingMedia}
                    className={`w-full h-20 border-2 border-dashed disabled:opacity-50 ${
                      isDragOver(`profile-${card.id}`)
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-300 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverState(`profile-${card.id}`, true);
                    }}
                    onDragEnter={() => setDragOverState(`profile-${card.id}`, true)}
                    onDragLeave={() => setDragOverState(`profile-${card.id}`, false)}
                    onDrop={(e) => handleDropUpload(card.id, "profile", e)}
                  >
                    <div className="text-center">
                      {isUploadingMedia && uploadProgress.profile !== undefined ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="text-sm text-gray-600">
                            Uploading... {Math.round(uploadProgress.profile || 0)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Upload Profile Picture (square image recommended)
                          </span>
                        </>
                      )}
                    </div>
                  </Button>
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMediaUpload(card.id, "profile", file);
                    }}
                    className="hidden"
                  />

                  {uploadErrors.profile && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {uploadErrors.profile}
                      </p>
                    </div>
                  )}

                  {card.profileImage && (
                    <div className="mt-4">
                      <div className="w-24 h-24 border border-gray-200 rounded-full overflow-hidden mx-auto">
                        <Image
                          src={card.profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          width={96}
                          height={96}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          updateCard(card.id, {
                            profileImage: "",
                            showProfileImage: false,
                            profileStoragePath: undefined,
                          });
                        }}
                        variant="outline"
                        size="sm"
                        className="mt-2 text-red-600 border-red-200 hover:bg-red-50 mx-auto block"
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trust Badges</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="licensed"
                    checked={card.badges.licensed}
                    onCheckedChange={(checked) =>
                      handleNestedUpdate(card.id, "badges", "licensed", checked)
                    }
                  />
                  <Label htmlFor="licensed" className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span>Licensed & Insured</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="experience"
                    checked={card.badges.experience}
                    onCheckedChange={(checked) =>
                      handleNestedUpdate(card.id, "badges", "experience", checked)
                    }
                  />
                  <Label htmlFor="experience" className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span>Years Experience</span>
                  </Label>
                  {card.badges.experience && (
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={card.badges.experienceYears}
                      onChange={(e) =>
                        handleNestedUpdate(
                          card.id,
                          "badges",
                          "experienceYears",
                          Number.parseInt(e.target.value) || 1
                        )
                      }
                      className="w-20 h-8"
                    />
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="locallyOwned"
                    checked={card.badges.locallyOwned}
                    onCheckedChange={(checked) =>
                      handleNestedUpdate(card.id, "badges", "locallyOwned", checked)
                    }
                  />
                  <Label htmlFor="locallyOwned" className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span>Locally Owned</span>
                  </Label>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Custom Badge <span className="text-gray-400">(optional)</span>
                  </Label>
                  <Input
                    value={card.badges.custom}
                    onChange={(e) =>
                      handleNestedUpdate(card.id, "badges", "custom", e.target.value)
                    }
                    placeholder="e.g., Award Winner, Certified Professional"
                    maxLength={30}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Bulk apply modal removed

  const completedCards = cards.filter((card) => card.isComplete).length;
  const totalCards = cards.length;
  const incompleteCards = cards.filter((card) => !card.mediaUrl && !card.profileImage).length;

  console.log("cards: ", cards);
  console.log("cardGroups: ", cardGroups);
  console.log("servicesByLocation: ", servicesByLocation);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="max-w-md mx-auto mb-8">
          <OnboardingProgressBar
            currentStep={getStepInfo("card-studio").currentStep}
            totalSteps={getStepInfo("card-studio").totalSteps}
            stepName={getStepInfo("card-studio").stepName}
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Design your business cards</h1>
          <p className="text-gray-600">Create compelling cards that attract customers</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-gray-600">Loading your cards...</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Card List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Card List</span>
                    <Badge variant="outline">
                      {completedCards}/{totalCards} Complete
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2">
                    {Object.entries(cardGroups).map(([groupKey, groupCards]) => {
                      if (groupCards.length === 0) return null;

                      const Icon = groupIcons[groupKey as keyof typeof groupIcons];
                      const isExpanded = expandedAccordion === groupKey;

                      return (
                        <div key={groupKey} className="border-b last:border-b-0">
                          <button
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => {
                              const next = isExpanded ? "" : groupKey;
                              setExpandedAccordion(next);
                              // close sub-accordions when switching main groups
                              setExpandedServiceLocation(null);
                              setExpandedEmployee(null);
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className="w-5 h-5 text-gray-600" />
                              <span className="font-medium">
                                {groupLabels[groupKey as keyof typeof groupLabels]}
                              </span>
                              <Badge variant="secondary">{groupCards.length}</Badge>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="space-y-2 pb-2">
                              {/* Nested grouping for Services by Location */}
                              {groupKey === "service"
                                ? Object.entries(servicesByLocation).map(([locName, locCards]) => (
                                    <div
                                      key={locName}
                                      className="mx-4 border rounded-lg border-gray-200"
                                    >
                                      <button
                                        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                        onClick={() =>
                                          setExpandedServiceLocation((prev) =>
                                            prev === locName ? null : locName
                                          )
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <MapPin className="w-4 h-4 text-gray-600" />
                                          <span className="font-medium">{locName}</span>
                                          <Badge variant="secondary">{locCards.length}</Badge>
                                        </div>
                                        {expandedServiceLocation === locName ? (
                                          <ChevronDown className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                      </button>
                                      {expandedServiceLocation === locName && (
                                        <div className="space-y-2 pb-2">
                                          {locCards.map((card) => (
                                            <div
                                              key={card.id}
                                              id={`card-${card.id}`}
                                              className={`mx-4 border rounded-lg scroll-mt-24 ${activeCard === card.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                                            >
                                              <div className="p-3 flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                  {manualSelection && (
                                                    <Checkbox
                                                      checked={selectedCards.includes(card.id)}
                                                      onCheckedChange={(checked) => {
                                                        if (checked) {
                                                          setSelectedCards([
                                                            ...selectedCards,
                                                            card.id,
                                                          ]);
                                                        } else {
                                                          setSelectedCards(
                                                            selectedCards.filter(
                                                              (id) => id !== card.id
                                                            )
                                                          );
                                                        }
                                                      }}
                                                    />
                                                  )}
                                                  <div>
                                                    <h4 className="font-medium">{card.name}</h4>
                                                    <p className="text-xs text-gray-500">
                                                      {card.locationName}
                                                    </p>
                                                    {card.price && (
                                                      <p className="text-sm text-gray-600">
                                                        {card.price}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  {card.isComplete && (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                  )}
                                                  {!card.mediaUrl && !card.profileImage && (
                                                    <Badge
                                                      variant="destructive"
                                                      className="text-xs"
                                                    >
                                                      Not Configured
                                                    </Badge>
                                                  )}
                                                  <Button
                                                    asChild
                                                    size="sm"
                                                    variant={
                                                      activeCard === card.id ? "default" : "outline"
                                                    }
                                                  >
                                                    <a
                                                      href={`#card-${card.id}`}
                                                      onClick={() => {
                                                        // Let anchor handle scroll, just toggle state
                                                        const next =
                                                          activeCard === card.id ? "" : card.id;
                                                        setActiveCard(next);
                                                      }}
                                                    >
                                                      {activeCard === card.id ? "Close" : "Edit"}
                                                    </a>
                                                  </Button>
                                                </div>
                                              </div>
                                              {activeCard === card.id && renderCardEditor(card)}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                : groupKey === "employee" && employeeCardMode === "per-service"
                                  ? Object.entries(employeeServiceCardsByEmployee).map(
                                      ([empName, empCards]) => (
                                        <div
                                          key={empName}
                                          className="mx-4 border rounded-lg border-gray-200"
                                        >
                                          <button
                                            className="w-full p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                            onClick={() =>
                                              setExpandedEmployee((prev) =>
                                                prev === empName ? null : empName
                                              )
                                            }
                                          >
                                            <div className="flex items-center gap-2">
                                              <Users className="w-4 h-4 text-gray-600" />
                                              <span className="font-medium">{empName}</span>
                                              <Badge variant="secondary">{empCards.length}</Badge>
                                            </div>
                                            {expandedEmployee === empName ? (
                                              <ChevronDown className="w-4 h-4" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4" />
                                            )}
                                          </button>
                                          {expandedEmployee === empName && (
                                            <div className="space-y-2 pb-2">
                                              {empCards.map((card) => (
                                                <div
                                                  key={card.id}
                                                  id={`card-${card.id}`}
                                                  className={`mx-4 border rounded-lg scroll-mt-24 ${activeCard === card.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                                                >
                                                  <div className="p-3 flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                      {manualSelection && (
                                                        <Checkbox
                                                          checked={selectedCards.includes(card.id)}
                                                          onCheckedChange={(checked) => {
                                                            if (checked) {
                                                              setSelectedCards([
                                                                ...selectedCards,
                                                                card.id,
                                                              ]);
                                                            } else {
                                                              setSelectedCards(
                                                                selectedCards.filter(
                                                                  (id) => id !== card.id
                                                                )
                                                              );
                                                            }
                                                          }}
                                                        />
                                                      )}
                                                      <div>
                                                        <h4 className="font-medium">
                                                          {card.serviceName}
                                                        </h4>
                                                        <p className="text-xs text-gray-500">
                                                          {card.locationName}
                                                        </p>
                                                        {card.price && (
                                                          <p className="text-sm text-gray-600">
                                                            {card.price}
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                      {card.isComplete && (
                                                        <Check className="w-4 h-4 text-green-600" />
                                                      )}
                                                      {!card.mediaUrl && !card.profileImage && (
                                                        <Badge
                                                          variant="destructive"
                                                          className="text-xs"
                                                        >
                                                          Not Configured
                                                        </Badge>
                                                      )}
                                                      <Button
                                                        asChild
                                                        size="sm"
                                                        variant={
                                                          activeCard === card.id
                                                            ? "default"
                                                            : "outline"
                                                        }
                                                      >
                                                        <a
                                                          href={`#card-${card.id}`}
                                                          onClick={() => {
                                                            const next =
                                                              activeCard === card.id ? "" : card.id;
                                                            setActiveCard(next);
                                                          }}
                                                        >
                                                          {activeCard === card.id
                                                            ? "Close"
                                                            : "Edit"}
                                                        </a>
                                                      </Button>
                                                    </div>
                                                  </div>
                                                  {activeCard === card.id && renderCardEditor(card)}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    )
                                  : groupCards.map((card) => (
                                      <div
                                        key={card.id}
                                        id={`card-${card.id}`}
                                        className={`mx-4 border rounded-lg scroll-mt-24 ${activeCard === card.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                                      >
                                        <div className="p-3 flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            {manualSelection && (
                                              <Checkbox
                                                checked={selectedCards.includes(card.id)}
                                                onCheckedChange={(checked) => {
                                                  if (checked) {
                                                    setSelectedCards([...selectedCards, card.id]);
                                                  } else {
                                                    setSelectedCards(
                                                      selectedCards.filter((id) => id !== card.id)
                                                    );
                                                  }
                                                }}
                                              />
                                            )}
                                            <div>
                                              <h4 className="font-medium">{card.name}</h4>
                                              {card.price && (
                                                <p className="text-sm text-gray-600">
                                                  {card.price}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            {card.isComplete && (
                                              <Check className="w-4 h-4 text-green-600" />
                                            )}
                                            {!card.mediaUrl && !card.profileImage && (
                                              <Badge variant="destructive" className="text-xs">
                                                Not Configured
                                              </Badge>
                                            )}
                                            <Button
                                              asChild
                                              size="sm"
                                              variant={
                                                activeCard === card.id ? "default" : "outline"
                                              }
                                            >
                                              <a
                                                href={`#card-${card.id}`}
                                                onClick={() => {
                                                  const next =
                                                    activeCard === card.id ? "" : card.id;
                                                  setActiveCard(next);
                                                }}
                                              >
                                                {activeCard === card.id ? "Close" : "Edit"}
                                              </a>
                                            </Button>
                                          </div>
                                        </div>
                                        {activeCard === card.id && renderCardEditor(card)}
                                      </div>
                                    ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Live Preview */}
            <div className="lg:col-span-1">
              <Card className="sticky top-[-2px]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Live Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeCard && getActiveCard() ? (
                      <>
                        {/* Card Preview Container - matching card assignment strategy sizing */}
                        <div className="mx-auto w-80 flex items-center justify-center">
                          <div className="w-full max-w-[320px]">
                            {getActiveCard()!.mediaUrl ? (
                              <CardPreview
                                card={{
                                  id: getActiveCard()!.id,
                                  name: getActiveCard()!.name,
                                  mediaType: getActiveCard()!.mediaType,
                                  mediaUrl: getActiveCard()!.mediaUrl,
                                  mediaSettings: getActiveCard()!.mediaSettings,
                                  profileImage: getActiveCard()!.profileImage,
                                  showProfileImage: getActiveCard()!.showProfileImage,
                                  backgroundColor: getActiveCard()!.backgroundColor,
                                  headline: getActiveCard()!.headline,
                                  tagline: getActiveCard()!.tagline,
                                  bulletPoints: getActiveCard()!.bulletPoints,
                                  ctaText: getActiveCard()!.ctaText,
                                  badges: getActiveCard()!.badges,
                                  serviceId: getActiveCard()!.serviceId,
                                }}
                                onExpandDescription={setExpandedDescription}
                                expandedDescription={expandedDescription}
                                className="w-full max-w-none"
                              />
                            ) : (
                              <div className="w-full h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500">
                                <Upload className="w-8 h-8 mb-2" />
                                <p className="text-sm font-medium">No media uploaded</p>
                                <p className="text-xs">
                                  Click &quot;Edit&quot; to upload an image or video
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center py-12 text-gray-400">
                        <div className="text-center">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">Select a card to preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex justify-between items-center mt-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackClick}
              className="flex items-center space-x-2"
              disabled={isSaving}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={saveCardStudioData}
              disabled={isSaving || isRoutingPrevious}
              loading={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              variant="primary"
              onClick={handleContinue}
              // disabled={isSaving || isRoutingPrevious || incompleteCards > 0}
              className="px-8"
              loading={isSaving}
            >
              {incompleteCards > 0 ? (
                `Complete ${incompleteCards} card${incompleteCards > 1 ? "s" : ""} to continue`
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
