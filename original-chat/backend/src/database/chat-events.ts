import { supabase } from "../auth/supabase";
import { SnapshotMessage } from "../shared/protocol";

export async function appendEvent(
  sessionId: string,
  type: string,
  payload: unknown,
  opts?: { messageId?: string; streamId?: string }
): Promise<{ seq: number; ts: string }> {
  try {
    console.log(
      `[chat-events:appendEvent] Appending event type: ${type} for session: ${sessionId}`
    );
    const { data, error } = await supabase
      .from("chat_events")
      .insert({
        session_id: sessionId,
        type,
        payload,
        message_id: opts?.messageId ?? null,
        stream_id: opts?.streamId ?? null,
      })
      .select("seq, ts")
      .single();

    if (error) {
      console.error("[chat-events:appendEvent] Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        sessionId,
        type,
      });
      throw error;
    }

    console.log(`[chat-events:appendEvent] Successfully appended event with seq: ${data.seq}`);
    return data;
  } catch (error: any) {
    console.error("[chat-events:appendEvent] Unexpected error:", {
      message: error.message,
      stack: error.stack,
      sessionId,
      type,
    });
    throw error;
  }
}

export async function getHeadSeq(sessionId: string): Promise<number> {
  const { data, error } = await supabase
    .from("chat_events")
    .select("seq")
    .eq("session_id", sessionId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.seq ?? 0;
}

export async function getEventsSince(sessionId: string, afterSeq: number) {
  const { data, error } = await supabase
    .from("chat_events")
    .select("*")
    .eq("session_id", sessionId)
    .gt("seq", afterSeq)
    .order("seq", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Read snapshot (messages) up to head seq.
 */
export async function readSnapshot(
  sessionId: string,
  limit = 1000
): Promise<{
  headSeq: number;
  messages: SnapshotMessage[];
}> {
  // Rehydrate from your existing chat_messages (authoritative content) and compute headSeq from chat_events
  // If you prefer to derive from chat_events only, change this.
  const { data: headRows, error: headErr } = await supabase
    .from("chat_events")
    .select("seq")
    .eq("session_id", sessionId)
    .order("seq", { ascending: false })
    .limit(1);

  if (headErr) throw headErr;

  const headSeq = headRows?.[0]?.seq ?? 0;

  const { data: msgs, error: msgErr } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_session_id", sessionId)
    .order("timestamp", { ascending: true })
    .limit(limit);

  if (msgErr) throw msgErr;

  // map to SnapshotMessage
  const messages = (msgs || []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    message_data_type: m.message_data_type,
    data: m.data,
  }));

  return { headSeq, messages };
}
