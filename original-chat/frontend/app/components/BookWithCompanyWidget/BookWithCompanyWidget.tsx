"use client";
import { useState } from "react";
import { buildCronofyLocalRange, getValidSystemTzid } from "../../utils/tz";

type Props = {
  hostUserId: string; // the business owner's user_id in YOUR system
  tzid?: string; // e.g. "America/Chicago"
};

export default function BookWithCompanyWidget({ hostUserId }: Props) {
  const [startLocal, setStartLocal] = useState("");
  const [dur, setDur] = useState(30); // minutes
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const currUserTzid = getValidSystemTzid();

  async function handleCheckAndBook() {
    setMsg(null);
    if (!startLocal) return setMsg("Pick a date & time first.");
    setLoading(true);
    try {
      const range = buildCronofyLocalRange(startLocal, dur);
      if (!range) return setMsg("Invalid date/time");

      // 1) Check free/busy
      const q = new URLSearchParams({
        host_user_id: hostUserId,
        start: range.from,
        end: range.to,
        tzid: currUserTzid,
      }).toString();
      const fb = await fetch(`/api/cronofy/freebusy?${q}`);
      const freeBusy = await fb.json();
      if (!fb.ok) throw new Error(freeBusy.error || "Free/busy failed");
      if (!freeBusy.free) {
        setMsg("That time is not available. Try another slot.");
        return;
      }
    } catch (e: unknown) {
      setMsg((e as Error).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const handleBook = async () => {
    // Aug. 29 2025 10:00am - 10:30am Central Time
    const range = {
      from: "2025-08-29T10:00:00",
      to: "2025-08-29T10:30:00",
    };

    setMsg(null);
    // if (!startLocal) return setMsg("Pick a date & time first.");
    setLoading(true);
    // 2) Book
    try {
      const res = await fetch(`/api/cronofy/book`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          host_user_id: hostUserId,
          start: range.from,
          end: range.to,
          tzid: currUserTzid,
        }),
      });
      const booked = await res.json();
      if (!res.ok) throw new Error(booked.error || "Booking failed");

      setMsg("Booked! Invite sent to your email.");
    } catch (e: unknown) {
      setMsg((e as Error).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-xl border bg-white shadow-sm p-4 sm:p-6 space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Start time</label>
        <input
          type="datetime-local"
          className="w-full rounded-lg border px-3 py-2"
          value={startLocal}
          onChange={(e) => setStartLocal(e.target.value)}
        />
        <p className="text-xs text-gray-500">Your time zone: {currUserTzid}</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Duration</label>
        <select
          className="w-full rounded-lg border px-3 py-2"
          value={dur}
          onChange={(e) => setDur(parseInt(e.target.value))}
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
      </div>

      <button
        onClick={handleCheckAndBook}
        disabled={loading}
        className="w-full rounded-lg bg-black text-white py-2 hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Processing…" : "Check & Book"}
      </button>

      <button
        onClick={handleBook}
        disabled={loading}
        className="w-full rounded-lg bg-black text-white py-2 hover:opacity-90 disabled:opacity-50"
      >
        Book Time
      </button>

      {msg && <div className="text-sm">{msg}</div>}
    </div>
  );
}
