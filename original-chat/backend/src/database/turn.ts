// backend/src/locks/turn.ts (or similar)
import { supabase } from "../auth/supabase";
import { randomUUID } from "crypto";

export type BeginTurnResult =
  | { status: "ok"; leaseId: string; expiresAt: string }
  | { status: "busy" }
  | { status: "missing" };

type LocalLease = { leaseId: string; expiresAt: number };
const localLeases = new Map<string, LocalLease>();

function beginLocalTurn(sessionId: string, ttlSeconds: number): BeginTurnResult {
  const now = Date.now();
  const existing = localLeases.get(sessionId);
  if (existing && existing.expiresAt > now) return { status: "busy" };
  const leaseId = randomUUID();
  const expiresAt = now + ttlSeconds * 1000;
  localLeases.set(sessionId, { leaseId, expiresAt });
  return { status: "ok", leaseId, expiresAt: new Date(expiresAt).toISOString() };
}

export async function beginTurn(sessionId: string, ttlSeconds = 180): Promise<BeginTurnResult> {
  const { data, error } = await supabase.rpc("turn_begin", {
    _session_id: sessionId,
    _ttl_seconds: ttlSeconds,
  });
  if (error) {
    console.warn("[turn] Supabase lease RPC unavailable; using single-task in-memory lease");
    return beginLocalTurn(sessionId, ttlSeconds);
  }

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
  if (error) {
    const lease = localLeases.get(sessionId);
    if (!lease || lease.leaseId !== leaseId || lease.expiresAt <= Date.now()) return false;
    lease.expiresAt = Date.now() + extendSeconds * 1000;
    return true;
  }
  return data === true;
}

export async function endTurn(sessionId: string, leaseId: string) {
  const { data, error } = await supabase.rpc("turn_end", {
    _session_id: sessionId,
    _lease_id: leaseId,
  });
  if (error) {
    const lease = localLeases.get(sessionId);
    if (!lease || lease.leaseId !== leaseId) return false;
    localLeases.delete(sessionId);
    return true;
  }
  return data === true;
}
