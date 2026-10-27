import { Card } from "../../shared/protocol";
import { CardsContext } from "./cardsMachine";

export enum BookingMachineState {
  WAITING_ON_INITIAL_SERVICE = "waiting on service message",
  WAITING_ON_SERVICE_QUESTION_ANSWER = "waiting for a service question answer",
  WAITING_ON_SERVICE_ANSWER = "WAITING_ON_SERVICE_ANSWER",
  RECOMMENDING_SERVICE = "RECOMMENDING_SERVICE",
  WAITING_ON_RECOMMENDATION_ANSWER = "WAITING_ON_RECOMMENDATION_ANSWER",
  SCHEDULING_SERVICE = "SCHEDULING_SERVICE",
  DONE = "DONE",
}

export interface BookingContext {
  userId: string;
  sessionId: string;
  serviceId: string;
  appointmentInfo: Record<string, any>;
  questions: Question[];
  error?: string | null;
  socket: any;
  responses: Response[] | [];
  pushMessage: string;
  companies: Company[];
  selectedCompany: Company | null;
  availableTimes: TimeSlot[];
  selectedTimeSlot: TimeSlot | null;
  value?: string | object;
  hasAddedCompaniesToMessages: boolean;
}

// Help to restore the state from the database.
export interface BookingMachineInput {
  userId: string;
  sessionId: string;
  serviceId?: string;
  appointmentInfo?: Record<string, any>;
  questions?: Question[];
  pushMessage?: string;
  socket?: any;
  responses?: Response[];
  companies?: Company[];
  availableTimes?: TimeSlot[];
  selectedCompany?: Company;
  selectedTimeSlot?: TimeSlot;
  hasAddedCompaniesToMessages?: boolean;
}

export type Question = {
  id: string;
  text: string;
};

export type Response = {
  id: string;
  text: string;
  answer: string;
};

export type Company = {
  id: string;
  name: string;
  description: string;
  questions?: Question[];
};

export type TimeSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  available: boolean;
};

/**
 * This is the type of the context that is stored in the database so a session can be resumed.
 */
export interface StoredMachineState {
  value: string | object;
  // context: Partial<BookingContext>;
  context: Partial<CardsContext>;
}

/**
 * Event types for the CardsMachine
 */
export type UpdateSocketEvent = {
  type: "UPDATE_SOCKET";
  socket: any;
};

export type ValidSearchQueryEvent = {
  type: "VALID_SEARCH_QUERY";
  output: {
    searchQuery: CardsSearchQuery;
  };
};

export type InvalidSearchQueryEvent = {
  type: "INVALID_SEARCH_QUERY";
  output: {
    error: string;
  };
};

export type StoreMoreTimeSlotsEvent = {
  type: "STORE_MORE_TIME_SLOTS";
  output: { timeSlots: TimeSlot[] };
};

export type CardsReturnedEvent = {
  type: "CARDS_RETURNED";
  output: { cards: Card[] };
};

/**
 * Types for the CardsMachine
 */
export interface CardsSearchQuery {
  search_query?: string;
  search_category?: string;
  card_type_filter?: string;
  employee_name_filter?: string;
  min_price_cents?: number; // cents
  max_price_cents?: number; // cents
  min_duration_minutes?: number;
  max_duration_minutes?: number;
  user_lat?: number;
  user_lng?: number;
  max_distance_meters?: number; // meters.
  limit_results?: number; // pagination
  offset_results?: number; // pagination
}

//
export type RecommendTimeSlotsCardsInput = {
  selectedCard: Card;
  userId: string;
  sessionId: string;
  isMoreTimeSlots?: boolean;
};
