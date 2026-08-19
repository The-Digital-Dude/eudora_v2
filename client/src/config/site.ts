// Single source of truth for the canonical production URL — used by
// metadataBase, sitemap.ts, robots.ts, and JSON-LD absolute URLs.
//
// NEXT_PUBLIC_SITE_URL must be set in every deployed environment; it is baked
// in at build time, so changing it needs a redeploy rather than a restart. The
// fallback is deliberately localhost — matching CORS_ORIGINS and APP_URL on
// the API — so a missing value breaks visibly in testing instead of quietly
// publishing a sitemap full of URLs pointing at some other host.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const SITE_NAME = "Eudora";
