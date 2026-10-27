jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { POST } from "@/app/api/admin/kyc/[businessId]/approve/route";

const mockGetUser = jest.fn();
const mockEq = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/app/utils/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

describe("POST /api/admin/kyc/[businessId]/approve", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
      error: null,
    });

    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it("returns 200 for valid admin approve", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ action: "approve", notes: "ok" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req as any, { params: Promise.resolve({ businessId: "biz-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.businessId).toBe("biz-1");
  });

  it("returns 403 for non-admin", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "not-admin" } }, error: null });
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ action: "approve" }),
    });

    const res = await POST(req as any, { params: Promise.resolve({ businessId: "biz-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when businessId missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ action: "approve" }),
    });

    const res = await POST(req as any, { params: Promise.resolve({ businessId: "" }) });
    expect(res.status).toBe(400);
  });

  it("returns 500 when supabase update fails", async () => {
    mockEq.mockResolvedValueOnce({ error: { message: "db is down" } });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ action: "approve" }),
    });

    const res = await POST(req as any, { params: Promise.resolve({ businessId: "biz-1" }) });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("db is down");
  });
});
