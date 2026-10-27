export interface ChatSession {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  xstate_context: string;
  is_active: boolean;
  is_authenticated?: boolean;
}

export interface ChatMessage {
  id: string;
  chat_session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  message_data_type?: "COMPANY" | "TIME_SLOT" | "USER_AUTH" | "CARD";
  data?: string; // JSONB field for serialized message data
}
