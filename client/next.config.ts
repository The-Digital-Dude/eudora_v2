import type { NextConfig } from "next";

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
};

export default nextConfig;
