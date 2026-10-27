import { supabase } from "../auth/supabase";

export const liveChatSessionDB = {
  async setActiveConn(sessionId: string, connectionId: string): Promise<void> {
    try {
      console.log(
        `[chat-session-live:setActiveConn] Setting active connection for session: ${sessionId}, connection: ${connectionId}`
      );
      const { error } = await supabase.from("chat_session_live").upsert({
        session_id: sessionId,
        connection_id: connectionId,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error("[chat-session-live:setActiveConn] Supabase error:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          sessionId,
          connectionId,
        });
        throw error;
      }
      console.log(`[chat-session-live:setActiveConn] Successfully set active connection`);
    } catch (error: any) {
      console.error("[chat-session-live:setActiveConn] Unexpected error:", {
        message: error.message,
        stack: error.stack,
        sessionId,
        connectionId,
      });
      throw error;
    }
  },

  async isActiveConn(sessionId: string, connectionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("chat_session_live")
      .select("connection_id")
      .eq("session_id", sessionId)
      .single();

    // Treat "no rows" as not active instead of throwing
    if (error && error.code !== "PGRST116") throw error;
    // Treat "no rows" as not active because of a race condition with new session creation.
    if (error && error.code === "PGRST116") return false;

    return data?.connection_id === connectionId;
  },

  async deleteLiveRow(sessionId: string): Promise<void> {
    const { error } = await supabase.from("chat_session_live").delete().eq("session_id", sessionId);
    if (error) throw error;
  },
};
