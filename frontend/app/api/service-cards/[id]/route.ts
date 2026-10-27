// /api/service-cards/[id]/route.ts
// Fetches service card data with related business, service, location, and employee information

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const serviceCardId = id;

  if (!serviceCardId) {
    return NextResponse.json({ error: "Missing service card ID" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // Fetch service card with all related data
    const { data: serviceCard, error: cardError } = await supabase
      .from("service_cards")
      .select(
        `
        id,
        business_id,
        card_type,
        display_name,
        tagline,
        description,
        media_url,
        media_type,
        profile_image_url,
        service_id,
        location_id,
        employee_id,
        services:service_id (
          id,
          name,
          description,
          duration,
          price_type,
          price_cents,
          price_min,
          price_max,
          category,
          location_id,
          employee_id
        ),
        businesses:business_id (
          id,
          name,
          logo_url
        ),
        locations:location_id (
          id,
          name,
          address,
          city,
          state,
          zip_code,
          country,
          location_type,
          timezone
        ),
        employees:employee_id (
          id,
          full_name,
          title,
          profile_image_url
        )
      `
      )
      .eq("id", serviceCardId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .single();

    if (cardError || !serviceCard) {
      return NextResponse.json({ error: "Service card not found" }, { status: 404 });
    }

    // Format the response
    const service = serviceCard.services as
      | {
          id?: string;
          name?: string;
          description?: string;
          duration?: string | number;
          price_type?: string;
          price_cents?: number;
          price_min?: number;
          category?: string;
        }
      | undefined;
    const business = serviceCard.businesses as
      | {
          id?: string;
          name?: string;
          logo_url?: string;
        }
      | undefined;
    const location = serviceCard.locations as
      | {
          id?: string;
          name?: string;
          address?: string;
          city?: string;
          state?: string;
          zip_code?: string;
          timezone?: string;
        }
      | undefined;
    const employee = serviceCard.employees as
      | {
          id?: string;
          full_name?: string;
          title?: string;
          profile_image_url?: string;
        }
      | undefined;

    // Parse duration (can be string like "45" or "60" or number)
    const durationMinutes = service?.duration
      ? typeof service.duration === "string"
        ? parseInt(service.duration, 10) || 45
        : service.duration
      : 45;

    // Calculate price
    let price = 0;
    if (service?.price_type === "fixed" && service?.price_cents) {
      price = service.price_cents / 100;
    } else if (service?.price_type === "variable") {
      price = service?.price_min ? service.price_min / 100 : 0;
    }

    // Build location address string
    const addressParts = [
      location?.address,
      location?.city,
      location?.state,
      location?.zip_code,
    ].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(", ") : undefined;

    // Get employees/providers if needed (for now, just the assigned employee if any)
    const providers = employee
      ? [
          {
            id: employee.id,
            name: employee.full_name,
            avatar: employee.profile_image_url,
          },
        ]
      : [];

    // Default cancellation policy (can be enhanced later)
    const cancellationPolicy = "Free cancellation up to 24 hours before appointment.";

    return NextResponse.json({
      serviceCard: {
        id: serviceCard.id,
        displayName: serviceCard.display_name,
        tagline: serviceCard.tagline,
        description: serviceCard.description || service?.description || "",
      },
      service: {
        id: service?.id || serviceCard.service_id,
        name: service?.name || serviceCard.display_name,
        description: service?.description || serviceCard.description || "",
        duration: durationMinutes,
        price: price,
        category: service?.category,
        cancellationPolicy,
      },
      business: {
        id: business?.id || serviceCard.business_id,
        name: business?.name || "Business",
        logoUrl: business?.logo_url,
      },
      location: {
        id: location?.id || serviceCard.location_id,
        name: location?.name,
        address: address,
        city: location?.city,
        state: location?.state,
        zipCode: location?.zip_code,
        timezone: location?.timezone || "America/Chicago",
      },
      employee: employee
        ? {
            id: employee.id,
            name: employee.full_name,
            title: employee.title,
            avatar: employee.profile_image_url,
          }
        : null,
      providers,
    });
  } catch (error) {
    console.error("Error fetching service card:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch service card",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
