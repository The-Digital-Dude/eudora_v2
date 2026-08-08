import type { NextConfig } from "next";

// NEXT_PUBLIC_USE_MOCK_API=true routes all /api traffic to the in-app JSON
// mock backend (src/app/mock-api) instead of the NestJS server. Restart the
// dev server after changing it — rewrites are evaluated at startup.
const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.0.101", "localhost", "127.0.0.1"],
  async redirects() {
    return [
      // /landing used to duplicate the homepage content — collapse to a single
      // canonical URL instead of splitting SEO value across two identical pages.
      {
        source: "/landing",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: useMockApi
          ? "/mock-api/:path*"
          : `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
