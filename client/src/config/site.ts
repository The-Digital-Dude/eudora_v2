// Single source of truth for the canonical production URL — used by
// metadataBase, sitemap.ts, robots.ts, and JSON-LD absolute URLs. Override
// with NEXT_PUBLIC_SITE_URL once a custom domain is in place.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://client-production-a931.up.railway.app";

export const SITE_NAME = "Eudora";
