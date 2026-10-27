import type { NextConfig } from "next";

const isQA = process.env.NEXT_PUBLIC_ENVIRONMENT === "qa" || process.env.ENVIRONMENT === "qa";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Keep React Strict Mode enabled (recommended)
  experimental: {
    useLightningcss: false, // fall back to PostCSS pipeline
  },
  async redirects() {
    return [
      {
        source: "/book/:state/:city/:category/:slug",
        destination: "/book/service/:state/:city/:category/:slug",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "blxsuipchfwtgtwwnoyf.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "pimlhjxkxmwswhntfsbh.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Block all search engine and AI crawler indexing on QA.
  // Mirrors the CloudFront X-Robots-Tag response header on the static site.
  headers: isQA
    ? async () => [
        {
          source: "/(.*)",
          headers: [
            {
              key: "X-Robots-Tag",
              value: "noindex, nofollow",
            },
          ],
        },
      ]
    : undefined,
};

export default nextConfig;
