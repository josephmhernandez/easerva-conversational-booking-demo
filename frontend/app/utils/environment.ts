export function getOrigin(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    if (process.env.RAILWAY_PUBLIC_DOMAIN.includes("localhost")) {
      console.warn("getOrigin is using localhost domain: ", process.env.RAILWAY_PUBLIC_DOMAIN);
      return `http://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    }
    console.warn("getOrigin is using non-localhost domain: ", process.env.RAILWAY_PUBLIC_DOMAIN);
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  if (process.env.NEXT_PUBLIC_RAILWAY_PUBLIC_DOMAIN) {
    if (process.env.NEXT_PUBLIC_RAILWAY_PUBLIC_DOMAIN.includes("localhost")) {
      console.warn(
        "getOrigin is using localhost domain: ",
        process.env.NEXT_PUBLIC_RAILWAY_PUBLIC_DOMAIN
      );
      return `http://${process.env.NEXT_PUBLIC_RAILWAY_PUBLIC_DOMAIN}`;
    }
    console.warn(
      "getOrigin is using non-localhost domain: ",
      process.env.NEXT_PUBLIC_RAILWAY_PUBLIC_DOMAIN
    );
    return `https://${process.env.NEXT_PUBLIC_RAILWAY_PUBLIC_DOMAIN}`;
  }

  console.warn("missed the origin checks");
  return "https://www.easerva.com";
}
