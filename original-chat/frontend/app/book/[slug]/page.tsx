import { createClient } from "@/app/utils/supabase/server";
import { notFound } from "next/navigation";
import BookingRequestForm from "./BookingRequestForm";

type BookingSlot = { start: string; end: string };

function isBookingSlot(value: unknown): value is BookingSlot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { start?: unknown; end?: unknown };
  return typeof candidate.start === "string" && typeof candidate.end === "string";
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; slot?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id,name,description,phone,email,city,state,address_line1,is_active,kyc_approved,slug")
    .eq("slug", slug)
    .single();
  if (!business || !business.is_active || !business.kyc_approved) notFound();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const availability = await fetch(`${origin}/api/availability?businessId=${business.id}&days=14`, {
    cache: "no-store",
  })
    .then((r) => r.json())
    .catch(() => ({ slots: [] }));
  const slots: BookingSlot[] = Array.isArray(availability.slots)
    ? availability.slots.filter(isBookingSlot)
    : [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-2xl font-bold">{business.name}</h1>
        <p className="text-gray-600 mt-2">{business.description || ""}</p>
        <p className="text-sm text-gray-500 mt-3">
          {[business.address_line1, business.city, business.state].filter(Boolean).join(", ")}
        </p>
      </div>
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-semibold mb-2">Available Slots</h2>
        {slots.length === 0 ? (
          <p className="text-gray-600">
            Contact for availability {business.phone ? `• ${business.phone}` : ""}{" "}
            {business.email ? `• ${business.email}` : ""}
          </p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-gray-700">
            {slots.map((s: BookingSlot) => (
              <li key={s.start}>{new Date(s.start).toLocaleString()}</li>
            ))}
          </ul>
        )}
      </div>
      <BookingRequestForm slug={slug} date={query.date} slot={query.slot} slots={slots} />
    </div>
  );
}
