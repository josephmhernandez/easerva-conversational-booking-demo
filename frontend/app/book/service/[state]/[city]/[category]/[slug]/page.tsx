"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { ArrowLeft, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import toast from "react-hot-toast";
import { useAvailabilityDay } from "@/app/hooks/useAvailabilityDay";
import { checkAvailabilityForSlot } from "@/app/lib/availability-checker";

// Mock data types
interface Service {
  name: string;
  duration: number;
  price: number;
  address?: string;
  description: string;
  cancellationPolicy: string;
}

interface Provider {
  id: string;
  name: string;
  avatar?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  providerId?: string;
  providerName?: string;
}

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract URL params
  // Route: /book/service/[state]/[city]/[category]/[slug]?service_card_id=...
  // Example: /book/service/tx/plano/professional-services/jo-dog-adoption?service_card_id=abc123
  const state = params.state as string;
  const city = params.city as string;
  const category = params.category as string;
  const businessSlug = params.slug as string;

  // These can be used for SEO/breadcrumbs in the future
  console.log("📍 Booking route params:", { state, city, category, businessSlug });

  // URL params
  const urlDate = searchParams.get("date");
  const urlTime = searchParams.get("time");
  const serviceCardIdParam = searchParams.get("service_card_id");

  // Use hardcoded service_card_id for testing, or from URL param
  const SERVICE_CARD_ID = serviceCardIdParam || "f23a6534-df24-42e0-97d0-c42e1c54f6a4";

  // State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(urlTime || undefined);
  const isInitialMount = useRef(true);
  const hasCheckedUrlTime = useRef(false);
  const previousDate = useRef<Date | undefined>(undefined);
  const [selectedProvider, setSelectedProvider] = useState<string>("any");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formTouched, setFormTouched] = useState<Record<string, boolean>>({});

  // Service data (loaded from API)
  const [service, setService] = useState<Service | null>(null);
  const [business, setBusiness] = useState<{
    id: string;
    name: string;
    logoUrl: string | null;
  } | null>(null);
  const [locationData, setLocationData] = useState<{
    id: string;
    name: string;
    address?: string;
    timezone: string;
  } | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);

  // Fetch service card data on mount
  useEffect(() => {
    const fetchServiceCard = async () => {
      try {
        setLoading(true);
        console.log("📋 Fetching service card:", SERVICE_CARD_ID);

        const response = await fetch(`/api/service-cards/${SERVICE_CARD_ID}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch service card: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("✅ Service card data loaded:", data);

        // Set service data
        setService({
          name: data.service.name,
          duration: data.service.duration,
          price: data.service.price,
          address: data.location.address,
          description: data.service.description,
          cancellationPolicy: data.service.cancellationPolicy,
        });

        // Set business data
        setBusiness({
          id: data.business.id,
          name: data.business.name,
          logoUrl: data.business.logoUrl,
        });

        // Set location data
        setLocationData({
          id: data.location.id,
          name: data.location.name,
          address: data.location.address,
          timezone: data.location.timezone,
        });

        // Set providers
        setProviders(data.providers || []);

        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching service card:", error);
        toast.error("Failed to load service information. Please try again.");
        setLoading(false);
      }
    };

    fetchServiceCard();
  }, [SERVICE_CARD_ID]);

  // Load session storage on mount
  useEffect(() => {
    console.log("🔧 Initializing booking page");
    console.log("📅 URL Date:", urlDate);
    console.log("⏰ URL Time:", urlTime);

    const savedForm = sessionStorage.getItem("booking-form");
    if (savedForm) {
      setFormData(JSON.parse(savedForm));
    }

    // Handle URL date param
    if (urlDate) {
      // Parse date as local time (YYYY-MM-DD format)
      const dateParts = urlDate.split("-");
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2]);
        const date = new Date(year, month, day);

        console.log("📆 Parsed date:", date.toDateString());

        if (!isNaN(date.getTime())) {
          // Compare dates without time
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const selectedDateOnly = new Date(date);
          selectedDateOnly.setHours(0, 0, 0, 0);

          if (selectedDateOnly < today) {
            console.log("⚠️ Date is in the past");
            toast.error("The selected date has passed. Showing today's availability.");
            setSelectedDate(new Date());
          } else {
            console.log("✅ Setting date to:", date.toDateString());
            setSelectedDate(date);
            setCurrentMonth(date);
          }
        } else {
          // Invalid date
          console.log("❌ Invalid date");
          setSelectedDate(new Date());
        }
      } else {
        // Invalid date format
        console.log("❌ Invalid date format");
        setSelectedDate(new Date());
      }
    } else {
      console.log("📅 No URL date, using today");
      setSelectedDate(new Date());
    }

    console.log("⏰ Initial selectedTime:", urlTime || undefined);
    setLoading(false);
  }, [urlDate, urlTime]);

  // Save form to session storage
  useEffect(() => {
    sessionStorage.setItem("booking-form", JSON.stringify(formData));
  }, [formData]);

  // Track selectedTime changes
  useEffect(() => {
    console.log("⏰ selectedTime changed to:", selectedTime);
  }, [selectedTime]);

  // Reset selected time when date changes (but not on initial load)
  useEffect(() => {
    console.log("🔄 Date changed, selectedDate:", selectedDate?.toDateString());
    console.log("🔄 Previous date:", previousDate.current?.toDateString());

    // Skip if no date selected yet
    if (!selectedDate) {
      return;
    }

    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousDate.current = selectedDate;
      console.log("⏭️ Initial mount - keeping URL time if provided");
      return;
    }

    // Only reset time if date actually changed
    if (previousDate.current && previousDate.current.getTime() !== selectedDate.getTime()) {
      console.log("🔄 Date changed - resetting selected time");
      setSelectedTime(undefined);
    }

    // Update previous date
    previousDate.current = selectedDate;
  }, [selectedDate]);

  // Fetch busy periods for the selected date (optimized - one API call per day)
  const dateString = selectedDate ? selectedDate.toISOString().split("T")[0] : null;
  const {
    data: dayAvailability,
    isLoading: dayLoading,
    error: dayError,
  } = useAvailabilityDay(
    dateString && service && locationData
      ? {
          serviceCardId: SERVICE_CARD_ID,
          date: dateString,
          timezone: locationData.timezone,
        }
      : null,
    { enabled: !!dateString && !!service && !!locationData }
  );

  // Generate time slots and check availability using cached busy periods
  useEffect(() => {
    if (!service || !locationData || !selectedDate || !dayAvailability) {
      if (!dayLoading && !dayError) {
        setAvailableTimeSlots([]);
      }
      return;
    }

    if (dayLoading) {
      setTimeSlotsLoading(true);
      return;
    }

    if (dayError) {
      console.error("Error loading day availability:", dayError);
      setTimeSlotsLoading(false);
      return;
    }

    setTimeSlotsLoading(true);
    console.log(
      "🔍 Generating time slots from cached busy periods for:",
      selectedDate.toDateString()
    );

    try {
      const slots: TimeSlot[] = [];
      const startHour = 9;
      const endHour = 17;
      const slotDuration = service.duration;

      // Generate all time slots
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

          // Create ISO timestamps for the time slot
          const startDate = new Date(selectedDate);
          startDate.setHours(hour, minute, 0, 0);
          const startTime = startDate.toISOString();

          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + slotDuration);
          const endTime = endDate.toISOString();

          // Validate time range
          if (endTime <= startTime) {
            continue;
          }

          // Check availability using cached busy periods
          const availability = checkAvailabilityForSlot(
            dayAvailability.busyPeriods,
            dayAvailability.calendarGroups,
            dayAvailability.requirements,
            startTime,
            endTime
          );

          if (availability.available) {
            // Assign provider if available
            const provider =
              providers.length > 0 && selectedProvider !== "any"
                ? providers.find((p) => p.id === selectedProvider)
                : providers[0];

            slots.push({
              time: timeString,
              available: true,
              providerId: provider?.id,
              providerName: provider?.name,
            });
          }
        }
      }

      // Filter by provider if not "any"
      const filteredSlots =
        selectedProvider === "any" ? slots : slots.filter((s) => s.providerId === selectedProvider);

      console.log("✅ Time slots loaded:", filteredSlots.length, "slots");
      setAvailableTimeSlots(filteredSlots);
      setTimeSlotsLoading(false);

      // Check if URL time is available (only on initial load)
      if (urlTime && !hasCheckedUrlTime.current) {
        hasCheckedUrlTime.current = true;
        console.log("🔍 Checking URL time availability:", urlTime);
        const timeExists = filteredSlots.find((s) => s.time === urlTime);
        if (!timeExists) {
          console.log("❌ URL time not available");
          toast.error("The requested time is no longer available. Please select another time.");
          setSelectedTime(undefined);
        } else {
          console.log("✅ URL time is available");
        }
      }
    } catch (error) {
      console.error("Error generating time slots:", error);
      toast.error("Failed to generate time slots. Please try again.");
      setTimeSlotsLoading(false);
    }
  }, [
    selectedDate,
    service,
    locationData,
    dayAvailability,
    dayLoading,
    dayError,
    selectedProvider,
    providers,
    urlTime,
    SERVICE_CARD_ID,
  ]);

  // Form validation
  const validateField = (name: string, value: string) => {
    switch (name) {
      case "fullName":
        return value.trim().length < 2 ? "Name must be at least 2 characters" : "";
      case "email":
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Please enter a valid email" : "";
      case "phone":
        return !/^\+?[\d\s-()]+$/.test(value) || value.replace(/\D/g, "").length < 10
          ? "Please enter a valid phone number"
          : "";
      case "notes":
        return value.length > 500 ? "Notes must be less than 500 characters" : "";
      default:
        return "";
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formTouched[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleFieldBlur = (name: string) => {
    setFormTouched((prev) => ({ ...prev, [name]: true }));
    setFormErrors((prev) => ({
      ...prev,
      [name]: validateField(name, formData[name as keyof typeof formData]),
    }));
  };

  const isFormValid = () => {
    const errors = {
      fullName: validateField("fullName", formData.fullName),
      email: validateField("email", formData.email),
      phone: validateField("phone", formData.phone),
      notes: validateField("notes", formData.notes),
    };
    return !Object.values(errors).some((e) => e !== "");
  };

  // TODO: Implement real booking creation
  //
  // The bookings table schema is ready (see db/schema.sql):
  // - id: uuid (PK)
  // - consumer_id, business_id, service_id, employee_id, location_id, room_id: uuid
  // - start_time, end_time: timestamptz (NOT NULL)
  // - timezone: text (NOT NULL)
  // - status: text (pending/confirmed/cancelled/completed/no_show)
  // - cronofy_event_id, cronofy_event_uid: text
  // - calendar_id: text (default_booking_calendar_id from satisfied calendar group)
  // - price_cents, price_currency, notes fields
  //
  // Implementation steps:
  // 1. Call /api/availability/check to verify slot is still available
  // 2. Get satisfied calendar group's default_booking_calendar_id
  // 3. Create Cronofy event via POST /v1/calendars/{calendar_id}/events
  //    - Use access_token from calendar owner's integration
  //    - Include customer as attendee
  // 4. Save booking to database with cronofy_event_id and calendar_id
  // 5. Send confirmation email
  // 6. Return real booking ID
  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !isFormValid() || !service || !locationData) {
      return;
    }

    setSubmitting(true);
    toast.loading("Creating your booking...");

    try {
      // Create ISO timestamps for the selected time slot
      const startDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":").map(Number);
      startDate.setHours(hours, minutes, 0, 0);
      const startTime = startDate.toISOString();

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + service.duration);
      const endTime = endDate.toISOString();

      // Call booking API
      let response: Response;
      let data: {
        error?: string;
        details?: string;
        booking?: unknown;
      };

      try {
        response = await fetch("/api/bookings/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceCardId: SERVICE_CARD_ID,
            startTime,
            endTime,
            timezone: locationData.timezone,
            customer: {
              fullName: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              notes: formData.notes || undefined,
            },
          }),
        });

        // Try to parse JSON response
        try {
          data = await response.json();
        } catch {
          // If JSON parsing fails, create a generic error response
          data = {
            error: "Invalid response from server",
            details: "The server returned an unexpected response format.",
          };
        }
      } catch (networkError) {
        // Network error (no internet, server down, etc.)
        console.error("Network error during booking:", networkError);
        toast.dismiss();
        toast.error(
          "Unable to connect to the server. Please check your internet connection and try again."
        );
        setSubmitting(false);
        return;
      }

      if (!response.ok) {
        toast.dismiss();

        // Handle specific error cases with user-friendly messages
        let errorMessage = "Unable to complete your booking. Please try again.";

        if (response.status === 409) {
          // Time slot no longer available
          errorMessage =
            data.details ||
            "This time slot was just booked by someone else. Please select another time.";
          setSelectedTime(undefined);
          // Refresh availability - the useAvailabilityDay hook will automatically refetch
        } else if (response.status === 404) {
          // Service card not found
          errorMessage =
            data.error ||
            "The service you're trying to book is no longer available. Please refresh the page.";
        } else if (response.status === 400) {
          // Bad request - various validation errors
          if (data.details) {
            errorMessage = data.details;
          } else if (data.error) {
            errorMessage = data.error;
          } else {
            errorMessage = "Invalid booking request. Please check your information and try again.";
          }

          // Special handling for specific error types
          if (data.error?.includes("Service not ready")) {
            errorMessage =
              "This service is not yet ready for booking. Calendar connections are still being configured.";
          } else if (data.error?.includes("No calendar")) {
            errorMessage =
              "This service is not yet configured for bookings. Please contact the business.";
          } else if (data.error?.includes("Missing required")) {
            errorMessage = "Please fill in all required fields and try again.";
          } else if (data.error?.includes("Invalid time range")) {
            errorMessage = "The selected time slot is invalid. Please select a different time.";
          }
        } else if (response.status === 500) {
          // Server error
          if (data.details) {
            // Check for specific error patterns
            if (data.details.includes("Failed to create event on calendar")) {
              errorMessage =
                "Unable to create the calendar event. The calendar may be unavailable. Please try again or contact support.";
            } else if (data.details.includes("rollback")) {
              errorMessage =
                "The booking was partially created but could not be completed. All changes have been rolled back. Please try again.";
            } else {
              errorMessage = `Booking failed: ${data.details}`;
            }
          } else if (data.error) {
            errorMessage = `Booking failed: ${data.error}`;
          } else {
            errorMessage =
              "An unexpected error occurred while creating your booking. Please try again or contact support if the problem persists.";
          }
        }

        toast.error(errorMessage);
        setSubmitting(false);
        return;
      }

      // Success - booking created
      toast.dismiss();
      toast.success("Booking created successfully!");

      // Generate a temporary booking ID for the confirmation page
      // TODO: Replace with actual booking.id from database when booking storage is implemented
      const bookingId = `temp-${Date.now()}`;

      // Store booking data in session storage for confirmation page
      sessionStorage.setItem(
        `booking-${bookingId}`,
        JSON.stringify({
          ...(data.booking || {}),
          bookingId,
        })
      );

      // Navigate to confirmation page
      router.push(`/book/confirm/${bookingId}`);
    } catch (error) {
      // Catch any unexpected errors (shouldn't happen if we handle all cases above)
      console.error("Unexpected booking error:", error);
      toast.dismiss();

      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("fetch") || error.message.includes("network")) {
          errorMessage = "Unable to connect to the server. Please check your internet connection.";
        } else if (error.message.includes("JSON")) {
          errorMessage = "Received an invalid response from the server. Please try again.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast.error(errorMessage);
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const showContactForm = selectedDate && selectedTime;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading booking page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-4 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900 truncate px-4">
            {business?.name || "Loading..."}
          </h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {/* Service Summary Card */}
        {service && (
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{service.name}</CardTitle>
              <CardDescription className="text-base">
                {service.duration} min • ${service.price.toFixed(2)}
              </CardDescription>
              {service.address && (
                <div className="flex items-start gap-2 text-sm text-gray-600 mt-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{service.address}</span>
                </div>
              )}
            </CardHeader>

            {/* Expandable Details */}
            <Collapsible open={isDetailsExpanded} onOpenChange={setIsDetailsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start px-6 text-sm text-gray-600">
                  <ChevronDown
                    className={`w-4 h-4 mr-2 transition-transform ${isDetailsExpanded ? "rotate-180" : ""}`}
                  />
                  Details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">Description</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">
                      Cancellation Policy
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {service.cancellationPolicy}
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Provider Filter */}
        {providers.length > 1 && (
          <Card className="mb-6 border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-semibold text-gray-900">Provider:</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any available</SelectItem>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="pt-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md w-full"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 w-full",
                month_caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                button_previous:
                  "h-7 w-7 bg-transparent p-0 hover:bg-gray-100 rounded-md cursor-pointer absolute left-1",
                button_next:
                  "h-7 w-7 bg-transparent p-0 hover:bg-gray-100 rounded-md cursor-pointer absolute right-1",
                month_grid: "w-full border-collapse space-y-1",
                weekdays: "flex justify-between",
                weekday: "text-muted-foreground rounded-md w-12 font-normal text-[0.8rem]",
                week: "flex w-full mt-2 justify-between",
                day: "h-12 w-12 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                day_button: "h-12 w-12 p-0 font-normal hover:bg-gray-100 rounded-md cursor-pointer",
                selected:
                  "bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:from-orange-500 hover:to-pink-600",
                today: "bg-gray-100 text-gray-900",
                outside: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                hidden: "invisible",
              }}
            />
          </CardContent>
        </Card>

        {/* Time Slots */}
        {selectedDate && (
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">{formatDate(selectedDate)}</CardTitle>
            </CardHeader>
            <CardContent>
              {timeSlotsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : availableTimeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-2">No availability on this date.</p>
                  <p className="text-sm text-gray-500">Please select another day.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableTimeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      onClick={() => {
                        setSelectedTime(slot.time);
                        // Scroll to form after short delay
                        setTimeout(() => {
                          document.getElementById("contact-form")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }, 100);
                      }}
                      className={`h-12 ${
                        selectedTime === slot.time
                          ? "bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white border-0"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{formatTime(slot.time)}</span>
                        {selectedProvider === "any" && slot.providerName && (
                          <span className="text-xs opacity-80">{slot.providerName}</span>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Form */}
        {showContactForm && (
          <Card id="contact-form" className="mb-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleFieldChange("fullName", e.target.value)}
                  onBlur={() => handleFieldBlur("fullName")}
                  className={formErrors.fullName && formTouched.fullName ? "border-red-500" : ""}
                  placeholder="John Doe"
                />
                {formErrors.fullName && formTouched.fullName && (
                  <p className="text-sm text-red-500">{formErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  onBlur={() => handleFieldBlur("email")}
                  className={formErrors.email && formTouched.email ? "border-red-500" : ""}
                  placeholder="john@example.com"
                />
                {formErrors.email && formTouched.email && (
                  <p className="text-sm text-red-500">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  onBlur={() => handleFieldBlur("phone")}
                  className={formErrors.phone && formTouched.phone ? "border-red-500" : ""}
                  placeholder="(555) 123-4567"
                />
                {formErrors.phone && formTouched.phone && (
                  <p className="text-sm text-red-500">{formErrors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                  onBlur={() => handleFieldBlur("notes")}
                  className={formErrors.notes && formTouched.notes ? "border-red-500" : ""}
                  placeholder="Any special requests or information..."
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 text-right">{formData.notes.length}/500</p>
                {formErrors.notes && formTouched.notes && (
                  <p className="text-sm text-red-500">{formErrors.notes}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky Footer Summary + CTA */}
      {showContactForm && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedDate && formatDate(selectedDate)} at{" "}
                  {selectedTime && formatTime(selectedTime)}
                </p>
                <p className="text-sm text-gray-600">
                  {service?.name || "Service"} • ${service?.price.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid() || submitting}
                  className="bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white h-12 px-8 font-semibold"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Confirming...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
                <p className="text-xs text-center text-gray-500">Pay at appointment</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
