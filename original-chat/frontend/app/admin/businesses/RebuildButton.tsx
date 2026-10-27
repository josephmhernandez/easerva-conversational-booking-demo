"use client";
import { useState } from "react";
export default function RebuildButton({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(false);
  const trigger = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/internal/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerIds: [businessId] }),
      });
      if (!res.ok) throw new Error();
      alert("Rebuild triggered");
    } catch {
      alert("Rebuild failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={trigger}
      disabled={loading}
      className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
    >
      {loading ? "Rebuilding..." : "Rebuild"}
    </button>
  );
}
