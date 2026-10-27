import { getExternalRequestUrl, buildExternalUrl } from "@/app/utils/server/request";

// Helper to create a minimal NextRequest-like object
function makeRequest(url: string, hostHeader?: string): any {
  return {
    url,
    headers: {
      get: (name: string) => (name.toLowerCase() === "host" ? (hostHeader ?? null) : null),
    },
  };
}

describe("getExternalRequestUrl", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  it("uses https and the Host header in production", () => {
    (process.env as any).NODE_ENV = "production";
    const req = makeRequest(
      "http://localhost:8080/api/test?foo=bar",
      "chat-app-chat-app-pr-45.up.railway.app"
    );

    const externalUrl = getExternalRequestUrl(req);

    expect(externalUrl.origin).toBe("https://chat-app-chat-app-pr-45.up.railway.app");
    expect(externalUrl.pathname).toBe("/api/test");
    expect(externalUrl.search).toBe("?foo=bar");
  });

  it("falls back to the internal URL host when Host header is missing", () => {
    (process.env as any).NODE_ENV = "production";
    const req = makeRequest("https://internal-host:8080/api/test?foo=bar");

    const externalUrl = getExternalRequestUrl(req);

    expect(externalUrl.origin).toBe("https://internal-host:8080");
    expect(externalUrl.pathname).toBe("/api/test");
    expect(externalUrl.search).toBe("?foo=bar");
  });

  it("uses the internal URL protocol when not in production", () => {
    (process.env as any).NODE_ENV = "development";
    const req = makeRequest(
      "http://localhost:8080/api/test?foo=bar",
      "chat-app-chat-app-pr-45.up.railway.app"
    );

    const externalUrl = getExternalRequestUrl(req);

    expect(externalUrl.origin).toBe("http://chat-app-chat-app-pr-45.up.railway.app");
    expect(externalUrl.pathname).toBe("/api/test");
    expect(externalUrl.search).toBe("?foo=bar");
  });
});

describe("buildExternalUrl", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  it("builds an absolute path URL from the external origin", () => {
    (process.env as any).NODE_ENV = "production";
    const req = makeRequest("http://localhost:8080/api/test?foo=bar", "www.easerva.com");

    const url = buildExternalUrl(req, "/login");

    expect(url.origin).toBe("https://www.easerva.com");
    expect(url.pathname).toBe("/login");
  });

  it("accepts relative paths", () => {
    (process.env as any).NODE_ENV = "production";
    const req = makeRequest("http://localhost:8080/base/path?x=1", "www.easerva.com");

    const url = buildExternalUrl(req, "next");

    expect(url.origin).toBe("https://www.easerva.com");
    expect(url.pathname).toBe("/next");
  });
});
