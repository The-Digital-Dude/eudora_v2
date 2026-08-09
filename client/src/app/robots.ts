import type { MetadataRoute } from "next";

import { flattenNavLeaves } from "@/config/nav-config";
import { SITE_URL } from "@/config/site";

// Dashboard route groups don't add a URL prefix (they're Next.js route
// groups), so the only reliable way to keep every authenticated route out of
// the index is to enumerate them — reuse the same list the sidebar is built
// from, so newly added dashboard routes are excluded automatically.
const dashboardPaths = Array.from(new Set(flattenNavLeaves().map((leaf) => leaf.url)));

const staticPrivatePaths = ["/login", "/register", "/complete-profile", "/mock-api"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...dashboardPaths, ...staticPrivatePaths],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
