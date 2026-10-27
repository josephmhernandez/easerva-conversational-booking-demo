jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { POST } from "@/app/api/internal/rebuild/route";

const mockSend = jest.fn();
const mockLambdaClient = jest.fn();
const mockInvokeCommand = jest.fn();

jest.mock(
  "@aws-sdk/client-lambda",
  () => ({
    LambdaClient: jest.fn().mockImplementation((cfg) => {
      mockLambdaClient(cfg);
      return { send: mockSend };
    }),
    InvokeCommand: jest.fn().mockImplementation((input) => {
      mockInvokeCommand(input);
      return { input };
    }),
  }),
  { virtual: true }
);

describe("POST /api/internal/rebuild", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      INTERNAL_REBUILD_SECRET: "secret",
      AWS_LAMBDA_FUNCTION_NAME: "build-fn",
      AWS_REGION: "us-east-1",
    };
    mockSend.mockResolvedValue({ StatusCode: 202 });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("valid key + body invokes lambda and returns success", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "x-internal-key": "secret", "Content-Type": "application/json" },
      body: JSON.stringify({ providerIds: ["p1"] }),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSend).toHaveBeenCalled();
  });

  it("missing/wrong key returns 401", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "x-internal-key": "wrong" },
      body: JSON.stringify({ providerIds: ["p1"] }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("missing providerIds returns 400", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "x-internal-key": "secret" },
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("missing lambda env returns graceful response", async () => {
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "x-internal-key": "secret" },
      body: JSON.stringify({ providerIds: ["p1"] }),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/not configured/i);
  });

  it("lambda invocation error returns 500", async () => {
    mockSend.mockRejectedValueOnce(new Error("lambda exploded"));

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "x-internal-key": "secret" },
      body: JSON.stringify({ providerIds: ["p1"] }),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("lambda exploded");
  });
});
