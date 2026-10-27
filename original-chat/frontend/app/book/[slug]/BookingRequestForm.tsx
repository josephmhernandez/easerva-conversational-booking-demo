"use client";
import { useState } from "react";

export default function BookingRequestForm({
  slug,
  date,
  slot,
  slots,
}: {
  slug: string;
  date?: string;
  slot?: string;
  slots: Array<{ start: string; end: string }>;
}) {
  const [form, setForm] = useState({
    date: date || "",
    slot: slot || "",
    name: "",
    email: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/book/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setMessage(res.ok ? "Booking request sent." : "Failed to submit request.");
  };

  return (
    <form onSubmit={submit} className="space-y-3 border rounded-lg p-4 bg-white">
      <h3 className="font-semibold">Request Booking</h3>
      <input
        className="w-full border rounded px-3 py-2"
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
        required
      />
      <select
        className="w-full border rounded px-3 py-2"
        value={form.slot}
        onChange={(e) => setForm({ ...form, slot: e.target.value })}
        required
      >
        <option value="">Select a time slot</option>
        {slots.map((s) => (
          <option key={s.start} value={s.start}>
            {new Date(s.start).toLocaleString()}
          </option>
        ))}
      </select>
      {slots.length === 0 && <p className="text-sm text-gray-600">Contact for availability</p>}
      <input
        className="w-full border rounded px-3 py-2"
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <input
        className="w-full border rounded px-3 py-2"
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />
      <input
        className="w-full border rounded px-3 py-2"
        placeholder="Phone"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        required
      />
      <button disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">
        {saving ? "Submitting..." : "Request Booking"}
      </button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form>
  );
}
