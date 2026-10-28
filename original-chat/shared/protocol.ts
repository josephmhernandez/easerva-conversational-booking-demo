// shared/protocol.ts
export type UUID = string;

export type ServerEvent =
  | {
      type: "connection.established";
      sessionId: UUID;
      connectionId: UUID;
      headSeq: number;
      ts: string;
      turn: "idle" | "streaming";
    }
  | {
      type: "session.created"; // ← NEW
      sessionId: UUID;
      headSeq: number; // last committed seq (0 if none)
      ts: string;
      turn: "idle" | "streaming";
    }
  | {
      type: "session.create.failed";
      error: string;
      ts: string;
    }
  | {
      type: "session.snapshot";
      sessionId: UUID;
      headSeq: number;
      messages: SnapshotMessage[];
      ts: string;
      turn: "idle" | "streaming";
    }
  | { type: "message.accepted"; sessionId: UUID; messageId: UUID; seq: number; ts: string }
  | {
      type: "message.rejected";
      sessionId: UUID;
      messageId: UUID;
      seq?: number;
      reason: "busy" | "invalid" | "unauthorized";
      ts: string;
    }
  | { type: "ai.delta"; sessionId: UUID; streamId: UUID; seq: number; chunk: string; ts: string }
  | {
      type: "ai.done";
      sessionId: UUID;
      streamId: UUID;
      seq: number;
      final?: string;
      status: "ok" | "timeout" | "error" | "canceled";
      ts: string;
    }
  | { type: "session.state"; sessionId: UUID; turn: "idle" | "streaming"; ts: string; seq?: number }
  | { type: "error"; sessionId?: UUID; code: string; message: string; ts: string }
  | { type: "ai.message"; sessionId: UUID; message: string; ts?: string; seq: number }
  | { type: "company.recommendations"; sessionId: UUID; companies: Company[]; ts?: string }
  | {
      type: "time.slots.recommendations";
      sessionId: UUID;
      timeSlots: TimeSlot[];
      ts?: string;
      restored?: boolean;
    }
  | {
      type: "cards.search.results";
      sessionId: UUID;
      cards: Card[];
      ts?: string;
      restored?: boolean;
    }
  | {
      type: "company.selection.confirmed";
      sessionId: UUID;
      company: Company;
      ts: string;
      message: string;
    }
  | {
      type: "card.selection.confirmed";
      sessionId: UUID;
      card: Card;
      ts: string;
      message: string;
    }
  | {
      type: "time.selection.confirmed";
      sessionId: UUID;
      timeSlot: TimeSlot;
      ts: string;
      message: string;
    };

export type ClientEvent =
  | {
      type: "authenticate";
      token: string;
      accessToken?: string;
      sessionId?: UUID;
      lastSeqSeen?: number;
    }
  | { type: "user.message"; sessionId: UUID; messageId: UUID; text: string; ts: string }
  | { type: "client.ack"; sessionId: UUID; lastSeq: number; ts: string }
  | { type: "new.session"; ts: string }
  | { type: "load.messages"; sessionId: UUID; offset?: number; limit?: number; ts: string }
  | { type: "company.selected"; sessionId: UUID; company: Company; ts: string }
  | { type: "card.selected"; sessionId: UUID; card: Card; ts: string }
  | { type: "time.selected"; sessionId: UUID; timeSlot: TimeSlot; ts: string }

  // TODO: Maybe do this in the chat instead of a refresh....
  | { type: "check.user.authentication"; sessionId: UUID; ts: string };

export type MessageRole = "user" | "assistant" | "system";

export type MessageDataType = "COMPANY" | "TIME_SLOT" | "USER_AUTH" | "CARD";

export type SnapshotMessage = {
  id: UUID;
  role: MessageRole;
  content: string;
  timestamp: string;
  message_data_type?: MessageDataType;
  data?: any; // should be stringified json
};

export type Company = {
  id: string;
  name: string;
  description: string;
  questions?: Question[];
};

export type Question = {
  id: string;
  text: string;
};

export type TimeSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  available: boolean;
};

export type Card = {
  card_id: string;
  card_type: "service" | "employee" | string;
  business_id: string;
  business_name: string;
  business_logo_url: string | null;
  display_name: string;
  tagline: string | null;
  description: string | null;
  media_url: string | null;
  media_type: "image" | "video" | string;
  profile_image_url: string | null;
  cta_text: string | null;
  service_id: string;
  service_name: string;
  service_description: string | null;
  service_category_out: string | null;
  price_type: "fixed" | "variable" | string | null;
  price_cents: number | null;
  price_min: number | null;
  price_max: number | null;
  duration_minutes: number | null;
  location_id: string | null;
  location_name: string | null;
  location_type: "mobile" | "physical" | string | null;
  location_city: string | null;
  location_state: string | null;
  distance_meters: number | null;
  employee_id: string | null;
  employee_name: string | null;
  employee_title: string | null;
  relevance_score: number | null;
  // Media settings from database
  media_settings?: {
    zoom?: number;
    panX?: number;
    panY?: number;
    overlayOpacity?: number;
    autoPlay?: boolean;
    muted?: boolean;
  } | null;
  // Badge settings from database
  // Can be either individual fields or an array of badge strings
  badges?: string[] | null;
  badges_licensed?: boolean | null;
  badges_experience?: boolean | null;
  badges_experience_years?: number | null;
  badges_locally_owned?: boolean | null;
  badges_custom?: string | null;
};
