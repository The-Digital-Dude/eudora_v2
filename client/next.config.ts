import type { NextConfig } from "next";

/**
 * Uploaded images are served from the object store's own host, which
 * next/image refuses to optimise unless it is allowlisted here. Derived from
 * the same S3_PUBLIC_URL the API uses to build stored URLs, so the two cannot
 * drift apart. Read at build time — a change needs a rebuild, not a restart.
 */
function uploadHostPatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!publicUrl) return [];

  try {
    const { protocol, hostname } = new URL(publicUrl);
    return [{ protocol: protocol.replace(":", "") as "http" | "https", hostname }];
  } catch {
    // A malformed value should not take the whole build down; uploaded images
    // simply will not optimise until it is corrected.
    console.warn(`[next.config] S3_PUBLIC_URL is not a valid URL: ${publicUrl}`);
    return [];
  }
}

const nextConfig: NextConfig = {
  // `standalone` exists for the Dockerfile, which runs `.next/standalone/
  // server.js`. Netlify's Next runtime cannot serve that layout: the build
  // still succeeds, but every route then returns Netlify's own 404 — a silent
  // failure rather than a build error. Netlify sets NETLIFY=true during its
  // builds, so each target gets the output it can actually serve.
  output: process.env.NETLIFY ? undefined : "standalone",
  allowedDevOrigins: ["192.168.0.101", "localhost", "127.0.0.1"],
  images: {
    remotePatterns: uploadHostPatterns(),
  },
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
