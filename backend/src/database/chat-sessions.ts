// backend/src/database/chat-sessions.ts (Enhanced version)
import { supabase } from "../auth/supabase";
import { ChatSession } from "./types";

export const chatSessionsDB = {
  // Get active session for user
  async getActiveSession(userId: string): Promise<ChatSession | null> {
    try {
      console.log(`[chat-sessions:getActiveSession] Fetching active session for user: ${userId}`);
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          console.error("[chat-sessions:getActiveSession] Supabase error:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        // PGRST116 is "no rows returned" - this is expected when no session exists
        console.log(`[chat-sessions:getActiveSession] No active session found for user: ${userId}`);
        return null;
      }

      console.log(`[chat-sessions:getActiveSession] Found active session: ${data?.id}`);
      return data;
    } catch (error: any) {
      console.error("[chat-sessions:getActiveSession] Unexpected error:", {
        message: error.message,
        stack: error.stack,
        userId,
      });
      throw error;
    }
  },

  // Update session's user_id (used to link a guest session to an authenticated user)
  async updateSessionUserId(sessionId: string, newUserId: string): Promise<void> {
    const { error } = await supabase
      .from("chat_sessions")
      .update({ user_id: newUserId, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) throw error;
  },

  // Conditionally update user_id and is_authenticated in chat_sessions
  async upsertAuthState(
    sessionId: string,
    currentUserId: string,
    newUserId: string,
    isAuthenticated: boolean
  ): Promise<void> {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (currentUserId !== newUserId) {
      updates.user_id = newUserId;
    }
    updates.is_authenticated = isAuthenticated;

    const { error } = await supabase.from("chat_sessions").update(updates).eq("id", sessionId);

    if (error) throw error;
  },

  // Get specific session by ID
  async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .eq("is_active", true);

    console.log("🔍 getSession data.. ALL_ACTIVE_CHATS:", data);
    if (data && data.length > 0) {
      return data[0];
    }

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data?.[0] || null;
  },

  // Create new session
  async createSession(
    userId: string,
    expiresInHours: number = 48,
    isAuthenticated: boolean = false
  ): Promise<ChatSession> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        xstate_context: {},
        is_active: true,
        is_authenticated: isAuthenticated,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Extend session expiration
  async extendSession(sessionId: string, expiresInHours: number = 48): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const { error } = await supabase
      .from("chat_sessions")
      .update({
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw error;
  },

  // Update authentication status for session
  async updateAuthenticationStatus(sessionId: string, isAuthenticated: boolean): Promise<void> {
    const { error } = await supabase
      .from("chat_sessions")
      .update({
        is_authenticated: isAuthenticated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw error;
  },

  // Update XState context
  async updateContext(
    sessionId: string,
    userId: string,
    context: Record<string, any>,
    currentState: string
  ): Promise<void> {
    console.log("Updating context for session:", sessionId);
    console.log("[chat-sessions:updateContext] Context Value:", currentState);

    // Prepare context for storage (remove non-serializable data)
    const serializableContext = {
      userId: context.userId,
      sessionId: context.sessionId,
      serviceId: context.serviceId,
      appointmentInfo: context.appointmentInfo,
      questions: context.questions,
      responses: context.responses,
      companies: context.companies,
      selectedCompany: context.selectedCompany,
      availableTimes: context.availableTimes,
      selectedTimeSlot: context.selectedTimeSlot,
      pushMessage: context.pushMessage,
      hasAddedCompaniesToMessages: context.hasAddedCompaniesToMessages,
    };

    // Store in database
    const stateToStore = {
      value: currentState,
      context: serializableContext,
    };

    console.log("UPDATING ---: ", stateToStore);

    const { error } = await supabase
      .from("chat_sessions")
      .update({
        xstate_context: JSON.stringify(stateToStore),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error in updateContext: ", error);
      throw error;
    }
  },

  // Deactivate session (start over)
  async deactivateSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from("chat_sessions")
      .update({ is_active: false })
      .eq("id", sessionId);

    if (error) throw error;
  },

  // Get all sessions for user (for debugging/admin)
  async getUserSessions(userId: string, limit: number = 10): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Cleanup expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    const { error, count } = await supabase
      .from("chat_sessions")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;
    return count || 0;
  },

  // PG advisory locks for turn state in chat logic
  async setTurnState(sessionId: string, turn: "idle" | "streaming"): Promise<void> {
    const { error } = await supabase
      .from("chat_sessions")
      .update({ turn_state: turn, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw error;
  },
};
