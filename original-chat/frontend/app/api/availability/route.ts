import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { withCronofy } from "@/app/lib/cronofyClient";

interface AvailabilityResponse {
  businessId: string;
  days: number;
  slots: Array<{ start: string; end: string }>;
  message?: string;
}

interface CronofyEventsClient {
  readEvents: (args: { from: string; to: string }) => Promise<unknown>;
}

async function withTimeout<T>(promise: Promise<T>, ms = 10_000): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Cronofy timeout")), ms)),
  ]);
}

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId") || "";
  const days = Number(request.nextUrl.searchParams.get("days") || "14");

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const response: AvailabilityResponse = {
    businessId,
    days,
    slots: [],
  };

  const { data: connections } = await supabase
    .from("business_calendar_integrations")
    .select("id")
    .eq("business_id", businessId)
    .eq("provider", "cronofy")
    .limit(1);

  if (!connections || connections.length === 0) {
    return NextResponse.json({ ...response, message: "No calendar connected" }, { status: 200 });
  }

  try {
    await withTimeout(
      withCronofy(business.owner_id, async (client: CronofyEventsClient) => {
        await client.readEvents({
          from: new Date().toISOString(),
          to: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        });
      })
    );
  } catch (error) {
    console.warn("Availability fetch fallback:", error);
    return NextResponse.json({ ...response, message: "No calendar connected" }, { status: 200 });
  }

  return NextResponse.json(response, { status: 200 });
}
