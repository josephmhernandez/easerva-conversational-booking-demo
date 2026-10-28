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

  const demoCards = searchDemoServiceCards(params);
  const limit = Math.min(Math.max(params.limit_results ?? 8, 1), 20);
  const cards = demoCards.slice(0, limit);

  console.log("[MCP] Service card search complete:", {
    demoCards: demoCards.length,
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
    source: "focused-demo-catalog",
  };
}
