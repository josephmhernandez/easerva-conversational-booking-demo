import { Anthropic } from "@anthropic-ai/sdk";
import { CardsSearchQuery } from "./machines/types";
import { getServices } from "./resources/get-services";

export async function validateSearchQuery(
  actor: any,
  messages: Anthropic.MessageParam[],
  anthropic: Anthropic,
  model: string
): Promise<{ waitForNextState: boolean; responseToUser?: any }> {
  const prompt = `
    You are a helpful booking assistant.

    The user is searching for a service for their specific need. 
    This can be a variety of services. 

    Decide if the search query is valid enough to search for a service. 
    In order to be valid the search query must have the following information:
    - search_query: string
    - service_category: string
    - user_location: {
      latitude: number,
      longitude: number,
      max_distance_meters: number
    }

    The information in these fields must be valid and not empty.
    The search_query can be any test referring to a service that could be offered by a business serving consumers of the general public. 
    Nothing illegal or offensive is offered in this platform. The query is not valid if it is illegal or offensive.

    The service_category must be a valid service category.
    Valid service categories are in the id field of each of the service objects:
    ${JSON.stringify(getServices())}

    The user_location must be a valid location.
    The location must have a latitude and longitude.
    The latitude and longitude must be valid and not empty.
    The max_distance_meters must be a valid number and not empty.
    The max_distance_meters must be greater than 0.
    The max_distance_meters must be less than 100000.
    The max_distance_meters must be in meters.
    The max_distance_meters must be in the range of 1 to 100000.

    Please return a JSON object with the following result of the whether the search query is valid: 
    - isValid: boolean
    - reason: string
    - confidenceScore: number (0.0 - 1.0)


    If the user has not provided some of the information, set the value to null.
    If the user provides a max distance range in a dimension that is not meters, estimate it and convert it to meters.

    example of a valid search query output:
    {
      "isValid": true,
      "reason": "",
      "confidenceScore": 1.0,
      "searchQueryInfo": {
        "search_query": "wedding photographer",
        "service_category": "Photography",
        "user_lat": 37.774929,
        "user_lng": -122.419416,
        "max_distance_meters": null,
        "card_type_filter": "service",
        "employee_name_filter": "",
        "min_price_cents": null,
        "max_price_cents": 30000,
        "min_duration_minutes": null,
        "max_duration_minutes": null,
      }
    }

    example of an invalid search query output:
    {
      "isValid": false,
      "reason": "The search query is invalid because it is illegal or offensive.",
      "confidenceScore": 0.1
    }

    The most important instruction is to only return a JSON object with the fields isValid, reason, and confidenceScore. Do not return any other text.
    Do not ask for availability times of the service. That is not part of the search query.
  `;

  const responseIsValid = await anthropic.messages.create({
    model: model,
    max_tokens: 1024,
    system: prompt,
    messages: messages,
    stream: false,
  });

  // Extract the text content
  const textContent = responseIsValid.content.find((block) => block.type === "text");
  const aiResponseText = textContent?.type === "text" ? textContent.text : "";

  const json = JSON.parse(aiResponseText);
  console.log(`[Validate Search Query] JSON: ${JSON.stringify(json)}`);
  const isValid = json.isValid ?? false;
  const reason = json.reason;
  const confidenceScore = json.confidenceScore;
  const searchQuery: CardsSearchQuery = json.searchQueryInfo;

  if (isValid) {
    actor.send({
      type: "VALID_SEARCH_QUERY",
      output: {
        searchQuery: searchQuery,
      },
    });
    return { waitForNextState: true };
  }

  actor.send({
    type: "INVALID_SEARCH_QUERY",
    output: {
      reason: reason,
      confidenceScore: confidenceScore,
    },
  });
  const promptForInvalidSearchQuery = `
  You are a helpful booking assistant. And speaking directly to a customer now.
  The costumer provided a search query that is invalid.
  Please prompt the costumer to insert the search query again with the following information:
  - search_query: string
  - service_category: string
  - user_lat: number
  - user_lng: number
  - max_distance_meters: number

  The search query can also include the following filters:
  - card_type_filter: string
  - employee_name_filter: string
  - min_price_cents: number
  - max_price_cents: number
  - min_duration_minutes: number
  - max_duration_minutes: number
  - user_lat: number
  - user_lng: number
  - max_distance_meters: number
  - limit_results: number
  - offset_results: number

  Do not communicate these filter directly with the costumer. Only guide them to help create a valid search query.
  Please prompt the costumer concisely to search for a service again. Do not return any other text.
  Reason for invalid search query: ${reason}
  `;

  const responseForInvalidSearchQuery = await anthropic.messages.create({
    model: model,
    max_tokens: 1024,
    system: promptForInvalidSearchQuery,
    messages: messages,
    stream: false,
  });

  return { waitForNextState: false, responseToUser: responseForInvalidSearchQuery.content };
}
