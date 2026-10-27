"use server";
import KycDetailClient from "./KycDetailClient";
import { createClient } from "@/app/utils/supabase/server";

export default async function KycDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();

  const { data: locations } = await supabase
    .from("business_locations")
    .select("*")
    .eq("business_id", businessId);

  return <KycDetailClient businessId={businessId} hasLocationData={(locations?.length ?? 0) > 0} />;
}
