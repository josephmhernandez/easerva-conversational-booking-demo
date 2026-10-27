/**
 * Redirect utility for managing authentication redirect URLs
 * Handles secure redirect URL management with validation
 */

import { getOrigin } from "@/app/utils/environment";

/**
 * Validates that a redirect URL is safe (same origin, not external)
 */
export function validateRedirectUrl(url: string | null): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url, window.location.origin);
    // Only allow same-origin redirects
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a redirect URL to ensure it's safe
 * Returns the sanitized URL or null if invalid
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Remove leading slash if present for consistency
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;

  // Validate the URL
  if (validateRedirectUrl(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

/**
 * Gets the redirect URL from query parameters or sessionStorage
 * Priority: query param > sessionStorage > null
 */
export function getRedirectUrl(): string | null {
  if (typeof window === "undefined") return null;

  // First check query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const queryNext = urlParams.get("next");
  if (queryNext) {
    const sanitized = sanitizeRedirectUrl(queryNext);
    if (sanitized) {
      return sanitized;
    }
  }

  // Fall back to sessionStorage
  try {
    const stored = sessionStorage.getItem("auth_redirect_url");
    if (stored) {
      const sanitized = sanitizeRedirectUrl(stored);
      if (sanitized) {
        return sanitized;
      }
    }
  } catch (e) {
    console.warn("Failed to read from sessionStorage:", e);
  }

  return null;
}

/**
 * Sets the redirect URL in sessionStorage
 * Also updates the current URL's query parameter if needed
 */
export function setRedirectUrl(url: string | null): void {
  if (typeof window === "undefined") return;

  const sanitized = url ? sanitizeRedirectUrl(url) : null;

  try {
    if (sanitized) {
      sessionStorage.setItem("auth_redirect_url", sanitized);
    } else {
      sessionStorage.removeItem("auth_redirect_url");
    }
  } catch (e) {
    console.warn("Failed to write to sessionStorage:", e);
  }
}

/**
 * Clears the redirect URL from sessionStorage
 */
export function clearRedirectUrl(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem("auth_redirect_url");
  } catch (e) {
    console.warn("Failed to clear sessionStorage:", e);
  }
}

/**
 * Gets the redirect URL and clears it (one-time use)
 * Useful after successful authentication
 */
export function getAndClearRedirectUrl(): string | null {
  const url = getRedirectUrl();
  clearRedirectUrl();
  return url;
}

/**
 * Builds a full URL with the next parameter
 * @param basePath - The base path (e.g., "/auth/callback" or "/login")
 * @param nextUrl - The URL to redirect to after auth (optional, will use current page if not provided)
 * @returns Full URL string like: http://localhost:3000/auth/callback?next=%2Fchat
 */
export function buildAuthUrl(basePath: string, nextUrl?: string | null): string {
  // Get the origin using shared environment helper (handles window + RAILWAY_PUBLIC_DOMAIN)
  const origin = getOrigin();

  // Ensure basePath starts with /
  const normalizedBasePath = basePath.startsWith("/") ? basePath : `/${basePath}`;

  // Get the next URL to redirect to
  const next = nextUrl || (typeof window !== "undefined" ? window.location.pathname : "/");
  const sanitized = sanitizeRedirectUrl(next);

  // Build the full URL
  if (sanitized && sanitized !== "/") {
    return `${origin}${normalizedBasePath}?next=${encodeURIComponent(sanitized)}`;
  }

  if (origin.includes("localhost")) {
    console.warn("buildAuthUrl is using localhost origin: ", origin, normalizedBasePath);
  }
  return `${origin}${normalizedBasePath}`;
}

/**
 * Gets the current page path for use as redirect URL
 */
export function getCurrentPath(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname;
}
