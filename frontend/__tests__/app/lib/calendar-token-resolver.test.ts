import {
  getAccessTokenForCalendar,
  getAccessTokensForCalendars,
} from "@/app/lib/calendar-token-resolver";

const createAdminClientMock = jest.fn();
const cronofyConstructorMock = jest.fn();

jest.mock("@/app/utils/supabase/server", () => ({
  createAdminClient: jest.fn(() => createAdminClientMock()),
}));

jest.mock("cronofy", () =>
  jest.fn().mockImplementation((config) => cronofyConstructorMock(config))
);

function mockCalendarConnectionsList(result: { data: any; error: any }) {
  return {
    select: jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue(result),
    }),
  };
}

function mockIntegrationList(result: { data: any; error: any }) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue(result),
    }),
  };
}

function mockIntegrationMaybeSingle(result: { data: any; error: any }) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue(result),
        }),
      }),
    }),
  };
}

function mockIntegrationUpdate(eqMock?: jest.Mock) {
  const mockEq = eqMock || jest.fn().mockResolvedValue({ data: null, error: null });
  return {
    update: jest.fn().mockReturnValue({
      eq: mockEq,
    }),
    eq: mockEq,
  };
}

describe("calendar-token-resolver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-03-13T12:00:00.000Z"));
    process.env.CRONOFY_CLIENT_ID = "client-id";
    process.env.CRONOFY_CLIENT_SECRET = "client-secret";
    process.env.CRONOFY_DATA_CENTER = "us";
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses active calendar_connections when present", async () => {
    const adminClient = {
      from: jest
        .fn()
        .mockImplementationOnce(() =>
          mockCalendarConnectionsList({
            data: [
              {
                calendar_id: "cal-1",
                integration_id: "integration-1",
                owner_user_id: "user-1",
                is_active: true,
              },
            ],
            error: null,
          })
        )
        .mockImplementationOnce(() =>
          mockIntegrationMaybeSingle({
            data: {
              id: "integration-1",
              user_id: "user-1",
              access_token: "token-1",
              refresh_token: "refresh-1",
              expires_at: "2026-03-13T14:00:00.000Z",
              profile_id: "profile-1",
            },
            error: null,
          })
        ),
    };

    createAdminClientMock.mockResolvedValue(adminClient);

    const result = await getAccessTokensForCalendars(["cal-1"]);

    expect(result.get("integration-1")).toEqual({
      access_token: "token-1",
      user_id: "user-1",
      calendar_ids: ["cal-1"],
    });
    expect(cronofyConstructorMock).not.toHaveBeenCalled();
  });

  it("falls back to Cronofy calendar listing when calendar_connections is empty", async () => {
    const adminClient = {
      from: jest
        .fn()
        .mockImplementationOnce(() =>
          mockCalendarConnectionsList({
            data: [],
            error: null,
          })
        )
        .mockImplementationOnce(() =>
          mockIntegrationList({
            data: [
              {
                id: "integration-1",
                user_id: "user-1",
                access_token: "token-1",
                refresh_token: "refresh-1",
                expires_at: "2026-03-13T14:00:00.000Z",
                profile_id: "profile-1",
              },
            ],
            error: null,
          })
        )
        .mockImplementationOnce(() =>
          mockIntegrationMaybeSingle({
            data: {
              id: "integration-1",
              user_id: "user-1",
              access_token: "token-1",
              refresh_token: "refresh-1",
              expires_at: "2026-03-13T14:00:00.000Z",
              profile_id: "profile-1",
            },
            error: null,
          })
        ),
    };

    createAdminClientMock.mockResolvedValue(adminClient);
    cronofyConstructorMock.mockImplementation(() => ({
      listCalendars: jest.fn().mockResolvedValue({
        calendars: [
          {
            calendar_id: "cal-1",
            profile_id: "profile-1",
            calendar_deleted: false,
          },
        ],
      }),
    }));

    const result = await getAccessTokensForCalendars(["cal-1"]);

    expect(result.get("integration-1")).toEqual({
      access_token: "token-1",
      user_id: "user-1",
      calendar_ids: ["cal-1"],
    });
    expect(cronofyConstructorMock).toHaveBeenCalledWith({
      access_token: "token-1",
      data_center: "us",
    });
  });

  it("refreshes an expired integration during fallback lookup before listing calendars", async () => {
    const updateEqMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const adminClient = {
      from: jest
        .fn()
        .mockImplementationOnce(() =>
          mockCalendarConnectionsList({
            data: [],
            error: null,
          })
        )
        .mockImplementationOnce(() =>
          mockIntegrationList({
            data: [
              {
                id: "integration-1",
                user_id: "user-1",
                access_token: "stale-token",
                refresh_token: "refresh-1",
                expires_at: "2026-03-13T12:01:00.000Z",
                profile_id: "profile-1",
              },
            ],
            error: null,
          })
        )
        .mockImplementationOnce(() => mockIntegrationUpdate(updateEqMock))
        .mockImplementationOnce(() =>
          mockIntegrationMaybeSingle({
            data: {
              id: "integration-1",
              user_id: "user-1",
              access_token: "fresh-token",
              refresh_token: "refresh-2",
              expires_at: "2026-03-13T13:00:00.000Z",
              profile_id: "profile-1",
            },
            error: null,
          })
        ),
    };

    createAdminClientMock.mockResolvedValue(adminClient);
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
              profile_id: "profile-1",
              calendar_deleted: false,
            },
          ],
        }),
      }));

    const result = await getAccessTokenForCalendar("cal-1");

    expect(updateEqMock).toHaveBeenCalledWith("id", "integration-1");
    expect(result).toEqual({
      access_token: "fresh-token",
      integration_id: "integration-1",
      user_id: "user-1",
      calendar_id: "cal-1",
    });
  });

  it("throws a descriptive error when neither calendar_connections nor Cronofy can resolve the calendar", async () => {
    const adminClient = {
      from: jest
        .fn()
        .mockImplementationOnce(() =>
          mockCalendarConnectionsList({
            data: [],
            error: null,
          })
        )
        .mockImplementationOnce(() =>
          mockIntegrationList({
            data: [
              {
                id: "integration-1",
                user_id: "user-1",
                access_token: "token-1",
                refresh_token: "refresh-1",
                expires_at: "2026-03-13T14:00:00.000Z",
                profile_id: "profile-1",
              },
            ],
            error: null,
          })
        ),
    };

    createAdminClientMock.mockResolvedValue(adminClient);
    cronofyConstructorMock.mockImplementation(() => ({
      listCalendars: jest.fn().mockResolvedValue({
        calendars: [],
      }),
    }));

    await expect(getAccessTokensForCalendars(["missing-cal"])).rejects.toThrow(
      "No calendar connections found for calendar_ids: missing-cal. Missing IDs: missing-cal"
    );
  });
});
