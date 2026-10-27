import { supabase } from "../../auth/supabase";
import { Card } from "../../shared/protocol";

export type SearchParams = {
  search_query?: string | null;
  user_lat?: number | null;
  user_lng?: number | null;
  service_category?: string | null;
  employee_name_filter?: string | null;
  min_price_cents?: number | null;
  max_price_cents?: number | null;
  min_duration_minutes?: number | null;
  max_duration_minutes?: number | null;
  card_type_filter?: "business" | "service" | "employee" | null;
  max_distance_meters?: number | null;
  limit_results?: number | null;
  offset_results?: number | null;
};

export async function postSearchServiceCards(actor: any, params: SearchParams): Promise<any> {
  console.log("[MCP] Searching for service cards:", params);

  // Call my database with that query.

  const { data, error } = await supabase.rpc("search_service_cards", params);

  if (error) {
    console.error("[MCP] Error searching for service cards:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  console.log("[MCP] Successfully searched for service cards:", data);
  // Do we send this to the state machine now?...

  actor.send({
    type: "CARDS_RETURNED",
    output: {
      cards: data as Card[],
    },
  });

  return {
    success: true,
    cards: data as Card[],
  };
}
