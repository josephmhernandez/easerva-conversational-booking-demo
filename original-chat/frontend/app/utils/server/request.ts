import type { NextRequest } from "next/server";

/**
 * Returns the external URL (origin + path + search) for a request.
 * This normalizes away internal container hosts like localhost:8080 on Railway.
 *
 * NOTE: This file is intended for server-only usage. Do not import it from client components.
 */
export function getExternalRequestUrl(req: NextRequest): URL {
  const internalUrl = new URL(req.url);
  const host = req.headers.get("host") ?? internalUrl.host;
  const protocol =
    process.env.NODE_ENV === "production"
      ? "https"
      : internalUrl.protocol.replace(":", "") || "http";

  const origin = `${protocol}://${host}`;
  if (origin.includes("localhost")) {
    console.warn(
      "getExternalRequestUrl is using localhost origin: ",
      origin,
      internalUrl.pathname + internalUrl.search
    );
  }
  return new URL(internalUrl.pathname + internalUrl.search, origin);
}

/**
 * Builds a URL for the given path using the external origin from the request.
 * Path can be absolute (starting with /) or relative.
 */
export function buildExternalUrl(req: NextRequest, path: string): URL {
  const externalUrl = getExternalRequestUrl(req);
  return new URL(path, externalUrl.origin);
}

/**
 * Builds a URL for the given path with search params using the external origin from the request.
 * Path can be absolute (starting with /) or relative.
 * Search params can be provided as a URLSearchParams object, a plain object, or a string.
 */
export function buildExternalUrlWithParams(
  req: NextRequest,
  path: string,
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined> | string
): URL {
  const url = buildExternalUrl(req, path);

  if (searchParams) {
    if (searchParams instanceof URLSearchParams) {
      // If it's already a URLSearchParams, append to existing search
      searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    } else if (typeof searchParams === "string") {
      // If it's a string, parse it and append
      const params = new URLSearchParams(searchParams);
      params.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    } else {
      // If it's a plain object, iterate and set each param
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            // For arrays, set each value (URLSearchParams handles multiple values)
            value.forEach((v) => url.searchParams.append(key, v));
          } else {
            url.searchParams.set(key, value);
          }
        }
      });
    }
  }

  return url;
}
