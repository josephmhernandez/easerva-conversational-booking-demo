// backend/src/locks/turn.ts (or similar)
import { supabase } from "../auth/supabase";

export type BeginTurnResult =
  | { status: "ok"; leaseId: string; expiresAt: string }
  | { status: "busy" }
  | { status: "missing" };

export async function beginTurn(sessionId: string, ttlSeconds = 180): Promise<BeginTurnResult> {
  const { data, error } = await supabase.rpc("turn_begin", {
    _session_id: sessionId,
    _ttl_seconds: ttlSeconds,
  });
  if (error) throw error;

  // data is like {status, lease_id, expires_at}
  const status = data?.status as "ok" | "busy" | "missing";
  if (status === "ok") {
    return {
      status,
      leaseId: data.lease_id as string,
      expiresAt: data.expires_at as string,
    };
  }
  return { status };
}

export async function heartbeatTurn(sessionId: string, leaseId: string, extendSeconds = 120) {
  const { data, error } = await supabase.rpc("turn_heartbeat", {
    _session_id: sessionId,
    _lease_id: leaseId,
    _extend_seconds: extendSeconds,
  });
  if (error) throw error;
  return data === true;
}

export async function endTurn(sessionId: string, leaseId: string) {
  const { data, error } = await supabase.rpc("turn_end", {
    _session_id: sessionId,
    _lease_id: leaseId,
  });
  if (error) throw error;
  return data === true;
}
