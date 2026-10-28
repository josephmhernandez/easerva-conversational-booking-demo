import { supabase } from "../../auth/supabase";
import { Card } from "../../shared/protocol";
import { searchDemoServiceCards } from "../resources/demo-service-cards";

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
    console.warn("[MCP] Database card search unavailable; using demo catalog:", error.message);
  }

  const demoCards = searchDemoServiceCards(params);
  const databaseCards = !error && Array.isArray(data) ? (data as Card[]) : [];
  const uniqueCards = [...demoCards, ...databaseCards].filter(
    (card, index, cards) => cards.findIndex((item) => item.card_id === card.card_id) === index
  );
  const limit = Math.min(Math.max(params.limit_results ?? 8, 1), 20);
  const cards = uniqueCards.slice(0, limit);

  console.log("[MCP] Service card search complete:", {
    demoCards: demoCards.length,
    databaseCards: databaseCards.length,
    returnedCards: cards.length,
  });

  actor.send({
    type: "CARDS_RETURNED",
    output: {
      cards,
    },
  });

  return {
    success: true,
    cards,
    source: databaseCards.length > 0 ? "demo-and-database" : "demo-catalog",
  };
}
