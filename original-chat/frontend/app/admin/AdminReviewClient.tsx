"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Settings,
  Star,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CardPreview from "../components/cards/CardPreview";
import { ONBOARDING_DRAFT_STATUS } from "../constants/dbConstants";
import { CardDesign } from "../types/businessTypes";
// import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Flattened data interfaces (matching the API)
interface FlattenedLocation {
  id: string;
  name: string;
  type: "physical" | "mobile" | "virtual";
  address?: string;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
  }>;
}

interface FlattenedService {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  pricing: {
    type: string;
    amount?: number;
    min?: number;
    max?: number;
    displayText?: string;
  };
  locations: string[]; // Location IDs where this service is offered
  employees: string[]; // Employee IDs who can perform this service
}

interface FlattenedEmployee {
  id: string;
  fullName: string;
  role: string;
  email: string;
  locationId: string;
  takesBookings: boolean;
  services: string[]; // Service IDs this employee can perform
}

interface FlattenedCard {
  id: string;
  name: string;
  type: "business" | "location" | "service" | "employee";
  headline: string;
  tagline: string;
  description: string;
  serviceIds: string[];
  locationId?: string;
  employeeId?: string;
  mediaUrl?: string;
  mediaSettings?: {
    zoom: number;
    panX: number;
    panY: number;
    overlayOpacity: number;
    autoPlay?: boolean;
    muted?: boolean;
  };
  profileImage?: string;
  showProfileImage?: boolean;
  price?: string;
  ctaText: string;
  isComplete: boolean;
}

interface BookingRequirement {
  id: string;
  name: string;
  type: "resource" | "employee";
  locationId?: string;
  description?: string;
  displayName: string;
  logicOperator?: "AND" | "OR";
}

interface BookingCombination {
  id: string;
  locationId: string;
  locationName: string;
  locationAddress: string;
  cardType: string;
  logicType: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
    priceType?: string;
    priceMin?: number;
    priceMax?: number;
    locationId: string;
    requiredResources: string[];
  }>;
  employees: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
    calendar?: {
      provider: string;
      calendarId: string;
      calendarName: string;
      connectionStatus: string;
    };
  }>;
  requirements: BookingRequirement[];
  combiningAllowed: boolean;
  combinedFromServices: Array<{
    from: string;
    services: Array<{
      id: string;
      name: string;
      price: number;
      locationId: string;
      requiredResources: string[];
    }>;
  }>;
  associatedCardId?: string; // Added for navigation
}

interface CalendarManagement {
  employeeCalendars: Array<{
    id: string;
    name: string;
    email?: string;
    calendarId: string;
    calendarName: string;
    provider: string;
    isConfigured: boolean;
    needsConfiguration: boolean;
    usedInBookings: boolean;
  }>;
  locationCalendars: Array<{
    id: string;
    name: string;
    calendarId: string;
    calendarName: string;
    provider: string;
    isConfigured: boolean;
    needsConfiguration: boolean;
    usedInBookings: boolean;
  }>;
  resourceCalendars: Array<{
    id: string;
    name: string;
    type: string;
    calendarId: string;
    calendarName: string;
    provider: string;
    isConfigured: boolean;
    needsConfiguration: boolean;
    usedInBookings: boolean;
  }>;
  summary: {
    totalEmployeeCalendars: number;
    totalLocationCalendars: number;
    totalResourceCalendars: number;
    unconfiguredCount: number;
  };
}

interface ProcessedApplication {
  id: string;
  user_id: string;
  business_id: string;
  status: string;
  current_step: string;
  created_at: string;
  updated_at: string;
  last_saved_at: string;

  // Business info
  businessInfo: {
    name: string;
    slug: string;
    category: string;
    description: string;
    phone: string;
    email: string;
    website: string;
    logoUrl?: string;
    tags: string[];
  };

  // Flattened data
  locations: FlattenedLocation[];
  services: FlattenedService[];
  employees: FlattenedEmployee[];
  cards: FlattenedCard[];
  bookingCombinations: BookingCombination[];
  calendarManagement: CalendarManagement;

  // Summary stats
  summary: {
    totalLocations: number;
    totalServices: number;
    totalEmployees: number;
    totalCards: number;
    totalBookingCombinations: number;
    completedSteps: number;
    totalSteps: number;
  };
}

interface ApiResponse {
  applications: ProcessedApplication[];
}

export default function AdminReviewClient() {
  const router = useRouter();
  const [applications, setApplications] = useState<ProcessedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardForPreview, setSelectedCardForPreview] = useState<FlattenedCard | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedServiceDetails, setSelectedServiceDetails] = useState<{
    duration: number;
    priceRange: string;
    distance: string;
  } | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string>("");
  const [refreshingCalendar, setRefreshingCalendar] = useState(false);

  const handleRefreshCalendar = useCallback(async () => {
    if (!businessId.trim()) {
      alert("Please enter a business ID");
      return;
    }

    setRefreshingCalendar(true);
    try {
      const response = await fetch(`/api/admin/refresh-calendar/${businessId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to refresh calendar");
      }

      alert("Calendar refreshed successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to refresh calendar: ${errorMessage}`);
    } finally {
      setRefreshingCalendar(false);
    }
  }, [businessId]);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.debug("AdminReviewClient: fetching applications...");
      const response = await fetch("/api/business/onboarding/review");

      if (response.status === 401 || response.status === 403) {
        // Redirect to root page for unauthorized access
        router.push("/");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch applications: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.debug(
        "AdminReviewClient: fetch success, applications count:",
        Array.isArray(data?.applications) ? data.applications.length : "invalid"
      );
      setApplications(data.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
      console.error("AdminReviewClient: fetch error", err);
    } finally {
      setLoading(false);
      console.debug("AdminReviewClient: loading set to false");
    }
  }, [router]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Safety timeout: ensure loading state clears even if something stalls in tests
  useEffect(() => {
    if (!loading) return;
    const timeoutId = setTimeout(() => {
      console.warn("AdminReviewClient: safety timeout clearing loading state");
      setLoading(false);
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [loading]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case ONBOARDING_DRAFT_STATUS.SUBMITTED:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            Submitted
          </Badge>
        );
      case ONBOARDING_DRAFT_STATUS.APPROVED:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case ONBOARDING_DRAFT_STATUS.PENDING:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <XCircle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (pricing: FlattenedService["pricing"]) => {
    if (pricing.displayText) return pricing.displayText;
    if (pricing.type === "free") return "Free";
    if (pricing.type === "fixed" && pricing.amount) return `$${pricing.amount}`;
    if (pricing.type === "variable" && pricing.min && pricing.max)
      return `$${pricing.min}-$${pricing.max}`;
    return "Price varies";
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "physical":
        return <Building className="w-4 h-4" />;
      case "mobile":
        return <Settings className="w-4 h-4" />;
      case "virtual":
        return <Clock className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getCardIcon = (type: string) => {
    switch (type) {
      case "business":
        return <Building className="w-4 h-4" />;
      case "location":
        return <MapPin className="w-4 h-4" />;
      case "service":
        return <Wrench className="w-4 h-4" />;
      case "employee":
        return <Users className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const handlePreviewCard = useCallback((card: FlattenedCard) => {
    console.debug("AdminReviewClient: handlePreviewCard called", {
      cardId: card.id,
      name: card.name,
      type: card.type,
      mediaUrl: card.mediaUrl,
    });
    setSelectedCardForPreview(card);
    setPreviewMode(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    console.debug("AdminReviewClient: handleClosePreview called");
    setSelectedCardForPreview(null);
    setPreviewMode(false);
  }, []);

  const handlePublish = useCallback(async (applicationId: string, businessName: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to publish "${businessName}" to the live database? This will make it searchable and available for bookings.`
    );

    if (!confirmed) {
      return;
    }

    setPublishing(applicationId);

    try {
      const response = await fetch("/api/admin/publish-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applicationId: applicationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to publish");
      }

      // Update local state to show approved status
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: "approved" } : app))
      );

      alert("Business published successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to publish: ${errorMessage}`);
    } finally {
      setPublishing(null);
    }
  }, []);

  // Convert FlattenedCard to CardDesign format for the CardPreview component
  const convertToCardDesign = useCallback((card: FlattenedCard): CardDesign => {
    // Detect if mediaUrl points to a video (basic extension check)
    const isVideoUrl = (url?: string) => {
      if (!url) return false;
      try {
        const lower = url.split("?")[0].toLowerCase();
        return (
          lower.endsWith(".mp4") ||
          lower.endsWith(".webm") ||
          lower.endsWith(".ogg") ||
          lower.endsWith(".ogv") ||
          lower.endsWith(".mov") ||
          lower.endsWith(".m4v")
        );
      } catch (e) {
        console.warn("convertToCardDesign: failed to parse mediaUrl", url, e);
        return false;
      }
    };

    const detectedMediaType = card.mediaUrl
      ? isVideoUrl(card.mediaUrl)
        ? "video"
        : "image"
      : "profile";

    console.debug("convertToCardDesign: input card", {
      id: card.id,
      name: card.name,
      mediaUrl: card.mediaUrl,
      profileImage: card.profileImage,
      showProfileImage: card.showProfileImage,
      detectedMediaType,
    });

    const converted: CardDesign = {
      id: card.id,
      name: card.name,
      mediaType: detectedMediaType,
      mediaUrl: card.mediaUrl,
      mediaSettings: {
        zoom: card.mediaSettings?.zoom ?? 1,
        panX: card.mediaSettings?.panX ?? 0,
        panY: card.mediaSettings?.panY ?? 0,
        overlayOpacity: card.mediaSettings?.overlayOpacity ?? 0.3,
        autoPlay: card.mediaSettings?.autoPlay ?? false,
        muted: card.mediaSettings?.muted ?? true,
      },
      profileImage: card.profileImage,
      showProfileImage: card.showProfileImage ?? false,
      backgroundColor: "#6366f1", // Default background color
      backgroundGradient: undefined,
      pattern: undefined,
      headline: card.headline,
      tagline: card.tagline,
      bulletPoints: [], // Could be parsed from description if needed
      ctaText: card.ctaText,
      badges: {
        licensed: false,
        experience: false,
        experienceYears: 0,
        locallyOwned: false,
        custom: "",
      },
      serviceId: card.serviceIds?.[0] ?? "",
    };

    console.debug("convertToCardDesign: output CardDesign", {
      id: converted.id,
      profileImage: converted.profileImage,
      showProfileImage: converted.showProfileImage,
    });
    return converted;
  }, []);

  const renderApplicationCard = (application: ProcessedApplication) => {
    const bookingCombinations = application.bookingCombinations || [];
    const isPublishing = publishing === application.id;
    const isApproved = application.status === "approved";
    const canPublish = application.status === "submitted" && !isPublishing;

    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Building className="w-6 h-6" />
                {application.businessInfo.name}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(application.created_at)}
                </span>
                {getStatusBadge(application.status)}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Progress</div>
                <div className="text-lg font-semibold">
                  {application.summary.completedSteps}/{application.summary.totalSteps}
                </div>
              </div>
              {canPublish && (
                <Button
                  onClick={() => handlePublish(application.id, application.businessInfo.name)}
                  disabled={isPublishing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="publish-button"
                  loading={isPublishing}
                >
                  Publish to Live Database
                  <CheckCircle className="w-4 h-4 mr-2" />
                </Button>
              )}
              {isApproved && (
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-medium">
                  ✓ Published
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <MapPin className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <div className="text-lg font-semibold">{application.summary.totalLocations}</div>
              <div className="text-xs text-gray-600">Locations</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Wrench className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <div className="text-lg font-semibold">{application.summary.totalServices}</div>
              <div className="text-xs text-gray-600">Services</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 mx-auto mb-1 text-purple-600" />
              <div className="text-lg font-semibold">{application.summary.totalEmployees}</div>
              <div className="text-xs text-gray-600">Employees</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <CreditCard className="w-5 h-5 mx-auto mb-1 text-orange-600" />
              <div className="text-lg font-semibold">{application.summary.totalCards}</div>
              <div className="text-xs text-gray-600">Cards</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
              <div className="text-lg font-semibold">
                {application.summary.totalBookingCombinations}
              </div>
              <div className="text-xs text-gray-600">Booking Combos</div>
            </div>
          </div>

          <Accordion type="multiple" className="w-full">
            {/* Business Information */}
            <AccordionItem value="business-info">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Business Information
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Category</label>
                      <p>{application.businessInfo.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Slug</label>
                      <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {application.businessInfo.slug}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Website</label>
                      <p>{application.businessInfo.website || "Not provided"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{application.businessInfo.phone}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="mt-1 text-gray-800">{application.businessInfo.description}</p>
                  </div>

                  {application.businessInfo.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {application.businessInfo.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Locations */}
            {application.locations.length > 0 && (
              <AccordionItem value="locations">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Locations ({application.locations.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {application.locations.map((location) => (
                      <div key={location.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {getLocationIcon(location.type)}
                          <h4 className="font-medium">{location.name}</h4>
                          <Badge variant="outline" className="capitalize">
                            {location.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{location.address}</p>

                        {location.resources.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Resources:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {location.resources.map((resource) => (
                                <div
                                  key={resource.id}
                                  className="text-xs bg-white p-2 rounded border"
                                >
                                  <div className="font-medium">{resource.name}</div>
                                  <div className="text-gray-500 capitalize">{resource.type}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Services */}
            {application.services.length > 0 && (
              <AccordionItem value="services">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Services ({application.services.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {application.services.map((service) => (
                      <div key={service.id} className="border-l-4 border-blue-200 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{service.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{service.category}</Badge>
                            <Badge variant="secondary">{formatPrice(service.pricing)}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Duration: {service.duration} min</span>
                          <span>Locations: {service.locations.length}</span>
                          <span>Employees: {service.employees.length}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Employees */}
            {application.employees.length > 0 && (
              <AccordionItem value="employees">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Employees ({application.employees.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {application.employees.map((employee) => (
                      <div
                        key={employee.id}
                        data-testid={`employee-${employee.id}`}
                        className="bg-gray-50 p-4 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{employee.fullName}</h4>
                            <p className="text-sm text-gray-600">{employee.role}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={employee.takesBookings ? "default" : "secondary"}>
                              {employee.takesBookings ? "Takes Bookings" : "Support Role"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Mail className="w-4 h-4" />
                          <span>{employee.email}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Services: {employee.services.length} | Location: {employee.locationId}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Cards */}
            {application.cards.length > 0 && (
              <AccordionItem value="cards">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Marketing Cards ({application.cards.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {application.cards.map((card) => (
                      <div
                        key={card.id}
                        data-testid={`card-${card.id}`}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getCardIcon(card.type)}
                          <h4 className="font-medium">{card.name}</h4>
                          <Badge variant="outline" className="capitalize">
                            {card.type}
                          </Badge>
                          {card.isComplete && (
                            <CheckCircle
                              data-testid="completion-icon"
                              className="w-4 h-4 text-green-500"
                            />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{card.headline}</p>
                        <p className="text-xs text-gray-500 mb-2">{card.tagline}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {card.ctaText}
                          </span>
                          {card.price && <span className="text-xs font-medium">{card.price}</span>}
                        </div>
                        <div className="mt-3 pt-2 border-t">
                          <Button
                            onClick={() => handlePreviewCard(card)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            View Live Preview
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Booking Combinations */}
            {bookingCombinations.length > 0 && (
              <AccordionItem value="booking-combinations">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Booking Combinations ({bookingCombinations.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {bookingCombinations.map((combo) => {
                      const employeeRequirement = combo.requirements?.find(
                        (r) => r.type === "employee"
                      );
                      const employeeDetails = employeeRequirement
                        ? application.employees.find((e) => e.id === employeeRequirement.id)
                        : null;
                      return (
                        <div key={combo.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-gray-900">{combo.locationName}</h4>
                              <p className="text-sm text-gray-600">{combo.locationAddress}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="capitalize">
                                {combo.cardType}
                              </Badge>
                              <div className="text-xs text-gray-500 mt-1">
                                Logic: {combo.logicType.toUpperCase()}
                              </div>
                            </div>
                          </div>

                          {/* Employee details for employee-location cards */}
                          {combo.cardType === "employee-location" && employeeDetails && (
                            <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                              <Users className="w-4 h-4" />
                              <span className="font-medium">{employeeDetails.fullName}</span>
                              <span className="text-gray-500">({employeeDetails.email})</span>
                            </div>
                          )}

                          {/* Services in this combo */}
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">
                              Services ({combo.services.length})
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {combo.services.map((service) => {
                                // Use the API-provided associatedCardId
                                const serviceCard = combo.associatedCardId
                                  ? application.cards.find(
                                      (card) => card.id === combo.associatedCardId
                                    )
                                  : null;

                                // Format price based on type
                                let priceDisplay = `$${service.price}`;
                                if (
                                  service.priceType === "variable" &&
                                  service.priceMin !== undefined &&
                                  service.priceMax !== undefined
                                ) {
                                  priceDisplay = `$${service.priceMin}-$${service.priceMax}`;
                                } else if (service.priceType === "free") {
                                  priceDisplay = "Free";
                                } else if (
                                  service.price === 0 &&
                                  service.priceType === "variable"
                                ) {
                                  priceDisplay = `$${service.priceMin || 0}-$${service.priceMax || 0}`;
                                }

                                // Get service details for duration
                                const serviceDetails = application.services.find(
                                  (s) => s.id === service.id
                                );

                                return (
                                  <div
                                    key={service.id}
                                    className="bg-white p-2 rounded border text-xs"
                                  >
                                    <div className="font-medium">{service.name}</div>
                                    <div className="text-gray-600">{priceDisplay}</div>
                                    {serviceDetails && (
                                      <div className="text-gray-500 text-xs">
                                        Duration: {serviceDetails.duration} min
                                      </div>
                                    )}
                                    <div className="text-gray-500">
                                      Resources: {service?.requiredResources?.length}
                                    </div>
                                    <div className="mt-2">
                                      <Button
                                        onClick={() => {
                                          if (serviceCard) {
                                            // Pass service-specific data for preview
                                            setSelectedServiceDetails({
                                              duration: serviceDetails?.duration || 60,
                                              priceRange: priceDisplay,
                                              distance: "Location varies",
                                            });
                                            handlePreviewCard(serviceCard);
                                          } else {
                                            console.warn("No card found for service:", service.id);
                                          }
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        disabled={!serviceCard}
                                      >
                                        <CreditCard className="w-3 h-3 mr-1" />
                                        View Card
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Resources and calendar integrations */}
                          {combo.resources.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                Resources ({combo.resources.length})
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {combo.resources.map((resource) => (
                                  <div
                                    key={resource.id}
                                    className="bg-white p-2 rounded border text-xs"
                                  >
                                    <div className="font-medium">{resource.name}</div>
                                    <div className="text-gray-500 capitalize">{resource.type}</div>
                                    <div className="mt-1 text-gray-700">
                                      <div className="text-gray-600">
                                        Calendar:{" "}
                                        {resource.calendar?.provider
                                          ? `${resource.calendar.provider} — ${resource.calendar.calendarName || resource.calendar.calendarId || "Unnamed"}`
                                          : "Not connected"}
                                      </div>
                                      {resource.calendar?.provider && (
                                        <div className="text-gray-500">
                                          Status: {resource.calendar.connectionStatus || "unknown"}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Requirements */}
                          {combo.requirements.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                Booking Requirements ({combo.requirements.length})
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {combo.requirements.map((req) => (
                                  <div key={req.id} className="flex items-center gap-1">
                                    {req.logicOperator && (
                                      <span className="text-xs text-gray-500 font-medium">
                                        {req.logicOperator}
                                      </span>
                                    )}
                                    <Badge
                                      variant={req.type === "resource" ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {req.displayName}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Combined Services Info */}
                          {combo.combinedFromServices.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                Combined From
                              </h5>
                              <div className="text-xs text-gray-600">
                                This combination was created by merging{" "}
                                {combo.combinedFromServices.length} service groups
                              </div>
                            </div>
                          )}

                          {/* Additional Info */}
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                            <span>Combining Allowed: {combo.combiningAllowed ? "Yes" : "No"}</span>
                            <span>ID: {combo.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Calendar Management */}
            {application.calendarManagement && (
              <AccordionItem value="calendar-management">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Calendar Management
                    {application.calendarManagement.summary.unconfiguredCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {application.calendarManagement.summary.unconfiguredCount} Need
                        Configuration
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pt-2">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <Users className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                        <div className="text-lg font-semibold">
                          {application.calendarManagement.summary.totalEmployeeCalendars}
                        </div>
                        <div className="text-xs text-gray-600">Employee Calendars</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <MapPin className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                        <div className="text-lg font-semibold">
                          {application.calendarManagement.summary.totalLocationCalendars}
                        </div>
                        <div className="text-xs text-gray-600">Location Calendars</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <Wrench className="w-5 h-5 mx-auto mb-1 text-green-600" />
                        <div className="text-lg font-semibold">
                          {application.calendarManagement.summary.totalResourceCalendars}
                        </div>
                        <div className="text-xs text-gray-600">Resource Calendars</div>
                      </div>
                    </div>

                    {/* Employee Calendars */}
                    {application.calendarManagement.employeeCalendars.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3">
                          Employee Calendars
                        </h5>
                        <div className="space-y-2">
                          {application.calendarManagement.employeeCalendars.map((cal) => (
                            <div
                              key={cal.id}
                              className={`p-3 rounded-lg border ${
                                cal.needsConfiguration ? "bg-red-50 border-red-200" : "bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{cal.name}</span>
                                    {cal.needsConfiguration && (
                                      <Badge variant="destructive" className="text-xs">
                                        Will be configured by employee
                                      </Badge>
                                    )}
                                    {cal.isConfigured && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-green-50 text-green-700"
                                      >
                                        Configured
                                      </Badge>
                                    )}
                                  </div>
                                  {cal.email && (
                                    <div className="text-xs text-gray-500 mt-1">{cal.email}</div>
                                  )}
                                </div>
                                {cal.isConfigured && (
                                  <div className="text-right text-xs">
                                    <div className="font-medium">{cal.provider}</div>
                                    <div className="text-gray-500">{cal.calendarName}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Location Calendars */}
                    {application.calendarManagement.locationCalendars.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3">
                          Location Calendars
                        </h5>
                        <div className="space-y-2">
                          {application.calendarManagement.locationCalendars.map((cal) => (
                            <div
                              key={cal.id}
                              className={`p-3 rounded-lg border ${
                                cal.needsConfiguration
                                  ? "bg-yellow-50 border-yellow-200"
                                  : "bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{cal.name}</span>
                                    {cal.needsConfiguration && (
                                      <Badge variant="destructive" className="text-xs">
                                        Needs Configuration
                                      </Badge>
                                    )}
                                    {cal.isConfigured && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-green-50 text-green-700"
                                      >
                                        Configured
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {cal.isConfigured && (
                                  <div className="text-right text-xs">
                                    <div className="font-medium">{cal.provider}</div>
                                    <div className="text-gray-500">{cal.calendarName}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resource Calendars */}
                    {application.calendarManagement.resourceCalendars.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3">
                          Resource Calendars
                        </h5>
                        <div className="space-y-2">
                          {application.calendarManagement.resourceCalendars.map((cal) => (
                            <div
                              key={cal.id}
                              className={`p-3 rounded-lg border ${
                                cal.needsConfiguration ? "bg-red-50 border-red-200" : "bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{cal.name}</span>
                                    <Badge variant="secondary" className="text-xs capitalize">
                                      {cal.type}
                                    </Badge>
                                    {cal.needsConfiguration && (
                                      <Badge variant="destructive" className="text-xs">
                                        Needs Configuration
                                      </Badge>
                                    )}
                                    {cal.isConfigured && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-green-50 text-green-700"
                                      >
                                        Configured
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {cal.isConfigured && (
                                  <div className="text-right text-xs">
                                    <div className="font-medium">{cal.provider}</div>
                                    <div className="text-gray-500">{cal.calendarName}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>
    );
  };

  // Note: Instead of returning early on loading, render an overlay spinner
  // so the main layout still mounts for tests and accessibility checks

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Applications</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchApplications} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Applications Found</h2>
          <p className="text-gray-600 mb-4">
            There are currently no business applications to review.
          </p>
          <Button onClick={fetchApplications} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Refresh Calendar Section */}
        <div className="mb-6 p-4 bg-white rounded-lg border">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label
                htmlFor="business-id-input"
                className="text-sm font-medium text-gray-700 mb-1 block"
              >
                Business ID
              </label>
              <Input
                id="business-id-input"
                type="text"
                placeholder="Enter business ID"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleRefreshCalendar}
                disabled={refreshingCalendar || !businessId.trim()}
                variant="default"
                size="default"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                loading={refreshingCalendar}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {loading && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-50">
          <div className="text-center">
            {/* <LoadingSpinner size="md" /> */}
            <p className="text-gray-600">Loading business applications...</p>
          </div>
        </div>
      )}
      <div className={`${previewMode ? "flex" : "max-w-7xl mx-auto px-4 py-8"}`}>
        {/* Main Content */}
        <div
          className={`${previewMode ? "flex-1 px-4 py-8 overflow-y-auto" : ""}`}
          style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}
        >
          {/* Header */}
          <div className="mb-8">
            {/* Refresh Calendar Section */}
            <div className="mb-6 p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label
                    htmlFor="business-id-input"
                    className="text-sm font-medium text-gray-700 mb-1 block"
                  >
                    Business ID
                  </label>
                  <Input
                    id="business-id-input"
                    type="text"
                    placeholder="Enter business ID"
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleRefreshCalendar}
                    disabled={refreshingCalendar || !businessId.trim()}
                    variant="default"
                    size="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    loading={refreshingCalendar}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Calendar
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Business Applications Review</h1>
                <p className="text-gray-600 mt-1">
                  {applications.length} application{applications.length !== 1 ? "s" : ""} found
                </p>
              </div>
              <div className="flex items-center gap-2">
                {previewMode && (
                  <Button onClick={handleClosePreview} variant="outline" size="sm">
                    <XCircle className="w-4 h-4 mr-2" />
                    Close Preview
                  </Button>
                )}
                <Button onClick={fetchApplications} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Applications</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{applications.length}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Submitted</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {applications.filter((app) => app.status === "submitted").length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-600">Pending</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {applications.filter((app) => app.status === "pending").length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Total Services</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {applications.reduce((sum, app) => sum + app.summary.totalServices, 0)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-600">Booking Combos</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {applications.reduce((sum, app) => sum + app.summary.totalBookingCombinations, 0)}
                </div>
              </div>
            </div>
          </div>

          <Separator className="mb-8" />

          {/* Applications List */}
          <div className="space-y-6">
            {applications.map((application) => (
              <div key={application.id}>{renderApplicationCard(application)}</div>
            ))}
          </div>
        </div>

        {/* Preview Panel */}
        {previewMode && selectedCardForPreview && (
          <div
            className="w-96 bg-white border-l border-gray-200 p-6 overflow-y-auto"
            style={{ position: "sticky", top: 0, height: "100vh" }}
          >
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                <Button onClick={handleClosePreview} variant="ghost" size="sm">
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600">{selectedCardForPreview.name}</p>
            </div>

            <div className="flex justify-center" data-live-preview-container="true">
              <CardPreview
                card={convertToCardDesign(selectedCardForPreview)}
                duration={
                  selectedServiceDetails ? `${selectedServiceDetails.duration} min` : "60 min"
                }
                priceRange={
                  selectedServiceDetails?.priceRange ||
                  selectedCardForPreview.price ||
                  "Contact for pricing"
                }
                distance={selectedServiceDetails?.distance || "1.2 mi"}
                autoPlay={true}
                muted={true}
              />
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Card Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Type:</span>
                  <span className="ml-2 capitalize">{selectedCardForPreview.type}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Complete:</span>
                  <span className="ml-2">{selectedCardForPreview.isComplete ? "Yes" : "No"}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Services:</span>
                  <span className="ml-2">{selectedCardForPreview.serviceIds.length} linked</span>
                </div>
                {selectedCardForPreview.locationId && (
                  <div>
                    <span className="font-medium text-gray-600">Location:</span>
                    <span className="ml-2">{selectedCardForPreview.locationId}</span>
                  </div>
                )}
                {selectedCardForPreview.employeeId && (
                  <div>
                    <span className="font-medium text-gray-600">Employee:</span>
                    <span className="ml-2">{selectedCardForPreview.employeeId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Media Controls */}
            <div className="mt-4 p-4 bg-white rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-2">Preview Controls</h4>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.debug("AdminReviewClient: Preview Controls - Mute requested");
                    // Rerender CardPreview with muted true by toggling a key change or local state if needed
                    // For simplicity, we directly manipulate the video element if present
                    const container = document.querySelector(
                      '[data-live-preview-container="true"] video'
                    ) as HTMLVideoElement | null;
                    if (container) {
                      container.muted = true;
                      container
                        .play()
                        .catch((err) => console.warn("Mute play attempt failed", err));
                    }
                  }}
                >
                  Mute
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    console.debug("AdminReviewClient: Preview Controls - Unmute requested");
                    const container = document.querySelector(
                      '[data-live-preview-container="true"] video'
                    ) as HTMLVideoElement | null;
                    if (container) {
                      container.muted = false;
                      const p = container.play();
                      if (p && typeof p.then === "function") {
                        p.catch((err) => console.warn("Unmute play attempt failed", err));
                      }
                    }
                  }}
                >
                  Unmute
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Note: Some browsers require user interaction to play unmuted video.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
