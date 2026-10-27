import { POST } from "@/app/api/availability/day/route";
import { NextResponse } from "next/server";

const createAdminClientMock = jest.fn();
const getAccessTokensForCalendarsMock = jest.fn();

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

jest.mock("@/app/utils/supabase/server", () => ({
  createAdminClient: jest.fn(() => createAdminClientMock()),
}));

jest.mock("@/app/lib/calendar-token-resolver", () => ({
  getAccessTokensForCalendars: jest.fn((...args) => getAccessTokensForCalendarsMock(...args)),
}));

jest.mock("cronofy", () => jest.fn());

describe("POST /api/availability/day", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (NextResponse.json as jest.Mock).mockImplementation((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
    }));
  });

  it("allows unauthenticated public booking access for services that are not yet ready", async () => {
    const singleMock = jest.fn().mockResolvedValueOnce({
      data: {
        is_active: true,
        is_deleted: false,
        requirements_ready: false,
        pending_calendar_count: 1,
        requirements_expression: null,
      },
      error: null,
    });

    createAdminClientMock.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: singleMock,
          })),
        })),
      })),
    });

    const response = await POST(
      new Request("https://example.com/api/availability/day", {
        method: "POST",
        body: JSON.stringify({
          serviceCardId: "service-card-1",
          date: "2026-03-16",
          timezone: "America/Chicago",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      available: false,
      reason: "requirements_not_ready",
      pendingCalendars: 1,
      message: "This service requires calendar connections that are not yet configured",
    });
    expect(getAccessTokensForCalendarsMock).not.toHaveBeenCalled();
  });

  it("rejects inactive service cards even though the route is public", async () => {
    const singleMock = jest.fn().mockResolvedValue({
      data: {
        is_active: false,
        is_deleted: false,
        requirements_ready: true,
        pending_calendar_count: 0,
        requirements_expression: null,
      },
      error: null,
    });

    createAdminClientMock.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: singleMock,
          })),
        })),
      })),
    });

    const response = await POST(
      new Request("https://example.com/api/availability/day", {
        method: "POST",
        body: JSON.stringify({
          serviceCardId: "service-card-2",
          date: "2026-03-16",
        }),
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Service card not found" });
  });
});
