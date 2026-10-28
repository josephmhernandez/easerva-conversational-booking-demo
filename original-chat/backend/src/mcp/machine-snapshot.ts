const RESTORABLE_STATUSES = new Set(["active", "done", "error", "stopped"]);

export function parseStoredMachineSnapshot(raw: unknown): Record<string, any> | null {
  if (!raw) return null;

  let parsed = raw;
  if (typeof raw === "string") {
    if (!raw.trim() || raw.trim() === "{}") return null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;
  const snapshot = parsed as Record<string, any>;
  if (!RESTORABLE_STATUSES.has(snapshot.status) || snapshot.value == null || !snapshot.context) {
    return null;
  }

  return snapshot;
}

export function sanitizeMachineSnapshot(snapshot: Record<string, any>): Record<string, any> {
  return {
    ...snapshot,
    context: {
      ...(snapshot.context ?? {}),
      socket: null,
    },
  };
}
