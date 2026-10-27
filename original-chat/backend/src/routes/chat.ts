// backend/src/routes/chat.ts
import express, { Request, Response } from "express";
import { authenticateUser } from "../auth/middleware";
import { supabase } from "../auth/supabase";
import { chatMessagesDB } from "../database/chat-messages";
import { chatSessionsDB } from "../database/chat-sessions";
import { StoredMachineState } from "../mcp/machines/types";

const router = express.Router();

// Get existing active session (read-only)
router.get("/session", authenticateUser, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Loading existing session");
    const userId = req.user!.id;
    console.log(`Loading session for user: ${userId}`);

    // Try to get existing active session
    let session = await chatSessionsDB.getActiveSession(userId);

    if (!session) {
      console.log("No active session found for user");
      res.status(404).json({ error: "No active session found" });
      return;
    }

    console.log(`Found active session: ${session.id}`);

    // Update authentication status if not already set to true
    if (!session.is_authenticated) {
      console.log("Updating session authentication status to true");
      await chatSessionsDB.updateAuthenticationStatus(session.id, true);
    }

    // Extend session if it's close to expiring (less than 6 hours left)
    const expiresAt = new Date(session.expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 6) {
      console.log("Session close to expiry, extending...");
      await chatSessionsDB.extendSession(session.id, 48);
      // Refresh session data
      session = await chatSessionsDB.getSession(session.id, userId);
    }

    // Get messages for this session
    const messages = await chatMessagesDB.getMessages(session!.id);
    console.log(`Loaded ${messages.length} messages for session`);

    res.json({
      session,
      messages,
    });
  } catch (error) {
    console.error("Error loading session:", error);
    res.status(500).json({ error: "Failed to load session" });
  }
});

// Link a guest session to the authenticated user
router.post(
  "/link-session",
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { pendingSessionId, guestId } = req.body as {
        pendingSessionId?: string;
        guestId?: string;
      };
      const newUserId = req.user!.id;

      console.log("[link-session] Request body:", { pendingSessionId, guestId, newUserId });

      if (!pendingSessionId || !guestId) {
        res.status(400).json({ error: "pendingSessionId and guestId are required" });
        return;
      }

      // Verify that the pending session currently belongs to the guestId and load xstate_context
      const { data: session, error } = await supabase
        .from("chat_sessions")
        .select("id, user_id, xstate_context, is_authenticated")
        .eq("id", pendingSessionId)
        .eq("user_id", guestId)
        .single();

      if (error || !session) {
        console.error("[link-session] Could not find session for guest:", { error });
        res.status(404).json({ error: "Session not found for given guestId" });
        return;
      }

      console.log("[link-session] Loaded session before update:", {
        id: session.id,
        user_id: session.user_id,
        is_authenticated: (session as any).is_authenticated,
        xstate_context_type: typeof (session as any).xstate_context,
        xstate_context_preview:
          typeof (session as any).xstate_context === "string"
            ? String((session as any).xstate_context).slice(0, 200)
            : (session as any).xstate_context,
      });

      // Prepare updated xstate_context with new user id in context
      let updatedXstateContext: string | null = null;
      try {
        const raw = (session as any).xstate_context as unknown;
        let parsed: StoredMachineState | null = null;
        if (raw && typeof raw === "string") {
          try {
            parsed = JSON.parse(raw) as StoredMachineState;
            console.log("[link-session] Parsed xstate_context from string");
          } catch (parseErr) {
            console.warn("[link-session] Failed to parse xstate_context string:", parseErr);
          }
        } else if (raw && typeof raw === "object") {
          parsed = raw as StoredMachineState;
          console.log("[link-session] xstate_context already an object");
        }

        if (parsed && typeof parsed === "object") {
          const normalized: StoredMachineState = {
            value: parsed.value ?? "",
            context: {
              ...(parsed.context ?? {}),
              userId: newUserId,
            },
          };
          updatedXstateContext = JSON.stringify(normalized);
          console.log("[link-session] Normalized xstate_context prepared");
        } else {
          console.log("[link-session] No valid xstate_context to normalize");
        }
      } catch (e) {
        // If parsing fails, we leave xstate_context unchanged
        updatedXstateContext = null;
        console.warn("[link-session] xstate_context normalization error:", e);
      }

      // Update the session owner to the authenticated user (and xstate_context if available)
      const updatePayload: Record<string, any> = {
        user_id: newUserId,
        is_authenticated: true,
        updated_at: new Date().toISOString(),
      };
      if (updatedXstateContext) updatePayload.xstate_context = updatedXstateContext;

      console.log("[link-session] Update payload:", {
        ...updatePayload,
        xstate_context_preview:
          typeof updatePayload.xstate_context === "string"
            ? String(updatePayload.xstate_context).slice(0, 200)
            : undefined,
      });

      const { error: updateErr } = await supabase
        .from("chat_sessions")
        .update(updatePayload)
        .eq("id", pendingSessionId);

      if (updateErr) {
        console.error("Failed to update session during link:", updateErr);
        res.status(500).json({ error: "Failed to update session" });
        return;
      }

      // Get the updated session with all fields using our database helper
      const updatedSession = await chatSessionsDB.getSession(pendingSessionId, newUserId);
      if (!updatedSession) {
        console.error("[link-session] Failed to retrieve updated session");
        res.status(500).json({ error: "Failed to retrieve updated session" });
        return;
      }

      console.log("[link-session] Successfully retrieved updated session:", {
        id: updatedSession.id,
        user_id: updatedSession.user_id,
        is_authenticated: updatedSession.is_authenticated,
      });

      // Get messages for the linked session
      const messages = await chatMessagesDB.getMessages(pendingSessionId);
      console.log(`[link-session] Loaded ${messages.length} messages for linked session`);

      res.json({
        success: true,
        sessionId: pendingSessionId,
        userId: newUserId,
        session: updatedSession,
        messages: messages,
      });
    } catch (error) {
      console.error("Error linking session:", error);
      res.status(500).json({ error: "Failed to link session" });
    }
  }
);

export default router;
