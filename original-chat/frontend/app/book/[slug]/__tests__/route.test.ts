jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { GET, POST } from "@/app/api/book/[slug]/route";
import { NextRequest } from "next/server";

const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock("@/app/utils/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    from: mockFrom,
  })),
}));

describe("/api/book/[slug] route", () => {
  it("GET unknown slug returns 404", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });

    const res = await GET({} as NextRequest, { params: Promise.resolve({ slug: "unknown-slug" }) });

    expect(res.status).toBe(404);
  });

  it("GET inactive slug returns 404", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: "1", is_active: false, kyc_approved: true },
    });

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "inactive-slug" }),
    });

    expect(res.status).toBe(404);
  });

  it("POST valid body returns 200", async () => {
    const req = new Request("http://localhost/api/book/x", {
      method: "POST",
      body: JSON.stringify({ name: "Jane", email: "jane@example.com", phone: "1234567" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never, { params: Promise.resolve({ slug: "ok-slug" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("POST missing name returns 400", async () => {
    const req = new Request("http://localhost/api/book/x", {
      method: "POST",
      body: JSON.stringify({ email: "jane@example.com", phone: "123" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never, { params: Promise.resolve({ slug: "x" }) });
    expect(res.status).toBe(400);
  });

  it("POST invalid email returns 400", async () => {
    const req = new Request("http://localhost/api/book/x", {
      method: "POST",
      body: JSON.stringify({ name: "Jane", email: "bad", phone: "123" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never, { params: Promise.resolve({ slug: "x" }) });
    expect(res.status).toBe(400);
  });

  it("POST missing phone returns 400", async () => {
    const req = new Request("http://localhost/api/book/x", {
      method: "POST",
      body: JSON.stringify({ name: "Jane", email: "jane@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as never, { params: Promise.resolve({ slug: "x" }) });
    expect(res.status).toBe(400);
  });
});
