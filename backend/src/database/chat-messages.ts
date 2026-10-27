import { supabase } from "../auth/supabase";
import { Company, TimeSlot } from "../mcp/machines/types";
import { Card } from "../shared/protocol";
import { ChatMessage } from "./types";

export const chatMessagesDB = {
  // Get messages for session with pagination
  async getMessages(
    sessionId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_session_id", sessionId)
      .order("timestamp", { ascending: true })
      .order("sequence_number", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

  // Add message
  async addMessage(
    sessionId: string,
    role: "user" | "assistant" | "system",
    content: string,
    messageDataType?: "COMPANY" | "TIME_SLOT" | "USER_AUTH" | "CARD" | undefined,
    messageData?: Company[] | TimeSlot[] | Card[] | undefined
  ): Promise<ChatMessage> {
    // Prepare the insert data
    const insertData: any = {
      chat_session_id: sessionId,
      role,
      content,
    };

    if (messageDataType) {
      insertData.message_data_type = messageDataType;
    }

    if (messageData) {
      insertData.data = JSON.stringify(messageData);
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Initialize placeholder message with sequence
  async initializeMessage(sessionId: string, messageId: string, role: string, sequence: number) {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        id: messageId,
        chat_session_id: sessionId,
        role,
        content: "", // Empty placeholder
        sequence_number: sequence,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update with final content (replaces addMessage for streamed messages)
  async finalizeMessage(messageId: string, finalContent: string) {
    const { error } = await supabase
      .from("chat_messages")
      .update({ content: finalContent })
      .eq("id", messageId);
    if (error) throw error;
  },

  // Helper method to delete message
  // Used ONLY for stream cancellations based on finding a tool after constant STREAM_TOOL_CHECK_CHUNK_COUNT is reached
  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
    if (error) throw error;
  },
};
