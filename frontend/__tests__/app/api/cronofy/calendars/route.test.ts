import { GET } from "@/app/api/cronofy/calendars/route";
import { NextResponse } from "next/server";

const createClientMock = jest.fn();
const cronofyConstructorMock = jest.fn();

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

jest.mock("@/app/utils/supabase/server", () => ({
  createClient: jest.fn(() => createClientMock()),
}));

jest.mock("cronofy", () =>
  jest.fn().mockImplementation((config) => cronofyConstructorMock(config))
);

describe("GET /api/cronofy/calendars", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-03-13T12:00:00.000Z"));
    process.env.CRONOFY_CLIENT_ID = "client-id";
    process.env.CRONOFY_CLIENT_SECRET = "client-secret";
    process.env.CRONOFY_DATA_CENTER = "us";

    (NextResponse.json as jest.Mock).mockImplementation((data, options) => ({
      json: async () => data,
      status: options?.status || 200,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 401 when there is no authenticated user", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    await GET();

    expect(NextResponse.json).toHaveBeenCalledWith({ error: "unauthorized" }, { status: 401 });
  });

  it("lists active calendars, filters by profile, and syncs calendar_connections via RPC", async () => {
    const rpcMock = jest.fn().mockResolvedValue({
      data: { success: true, upserted_count: 1 },
      error: null,
    });

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "integration-1",
                  account_id: "account-1",
                  access_token: "token-1",
                  refresh_token: "refresh-1",
                  expires_at: "2026-03-13T14:00:00.000Z",
                  provider_name: "google",
                  profile_id: "profile-1",
                },
              ],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })),
      rpc: rpcMock,
    };

    createClientMock.mockResolvedValue(supabase);
    cronofyConstructorMock.mockImplementation(() => ({
      listCalendars: jest.fn().mockResolvedValue({
        calendars: [
          {
            calendar_id: "cal-1",
            calendar_name: "Primary",
            profile_id: "profile-1",
            profile_name: "Owner",
            calendar_deleted: false,
            calendar_readonly: false,
            calendar_primary: true,
            calendar_integrated_conferencing_available: true,
            calendar_attachments_available: true,
            permission_level: "owner",
          },
          {
            calendar_id: "cal-2",
            calendar_name: "Wrong Profile",
            profile_id: "profile-2",
            profile_name: "Other",
            calendar_deleted: false,
            calendar_readonly: false,
            calendar_primary: false,
            calendar_integrated_conferencing_available: false,
            calendar_attachments_available: false,
            permission_level: "owner",
          },
          {
            calendar_id: "cal-3",
            calendar_name: "Deleted",
            profile_id: "profile-1",
            profile_name: "Owner",
            calendar_deleted: true,
            calendar_readonly: false,
            calendar_primary: false,
            calendar_integrated_conferencing_available: false,
            calendar_attachments_available: false,
            permission_level: "owner",
          },
        ],
      }),
    }));

    const response = await GET();
    const body = await response.json();

    expect(rpcMock).toHaveBeenCalledWith("upsert_calendar_connections", {
      p_owner_user_id: "user-1",
      p_integration_id: "integration-1",
      p_calendars: [
        {
          calendar_id: "cal-1",
          calendar_name: "Primary",
          profile_id: "profile-1",
          profile_name: "Owner",
        },
      ],
    });
    expect(body).toEqual({
      calendars: [
        expect.objectContaining({
          calendar_id: "cal-1",
          integration_id: "integration-1",
          account_id: "account-1",
        }),
      ],
      integrations: [
        {
          id: "integration-1",
          account_id: "account-1",
          provider_name: "google",
          profile_id: "profile-1",
          calendar_count: 1,
        },
      ],
    });
  });

  it("refreshes an expiring token before listing calendars", async () => {
    const updateEqMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "integration-1",
                  account_id: "account-1",
                  access_token: "stale-token",
                  refresh_token: "refresh-1",
                  expires_at: "2026-03-13T12:01:00.000Z",
                  provider_name: "google",
                  profile_id: "profile-1",
                },
              ],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: updateEqMock,
        }),
      })),
      rpc: jest.fn().mockResolvedValue({
        data: { success: true, upserted_count: 1 },
        error: null,
      }),
    };

    createClientMock.mockResolvedValue(supabase);
    cronofyConstructorMock
      .mockImplementationOnce(() => ({
        refreshAccessToken: jest.fn().mockResolvedValue({
          access_token: "fresh-token",
          refresh_token: "refresh-2",
          expires_in: 3600,
        }),
      }))
      .mockImplementationOnce(() => ({
        listCalendars: jest.fn().mockResolvedValue({
          calendars: [
            {
              calendar_id: "cal-1",
              calendar_name: "Primary",
              profile_id: "profile-1",
              profile_name: "Owner",
              calendar_deleted: false,
              calendar_readonly: false,
              calendar_primary: true,
              calendar_integrated_conferencing_available: true,
              calendar_attachments_available: true,
              permission_level: "owner",
            },
          ],
        }),
      }));

    await GET();

    expect(updateEqMock).toHaveBeenCalledWith("id", "integration-1");
    expect(cronofyConstructorMock).toHaveBeenNthCalledWith(1, {
      client_id: "client-id",
      client_secret: "client-secret",
      data_center: "us",
    });
    expect(cronofyConstructorMock).toHaveBeenNthCalledWith(2, {
      access_token: "fresh-token",
      data_center: "us",
    });
  });
});
