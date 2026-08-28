import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/site";
import {
  getPublicCourseList,
  getPublicPrograms,
} from "@/lib/public-catalog";

// Regenerated on the same cadence as the pages it lists, so a newly published
// programme becomes discoverable without a redeploy.
// Literal, not an imported constant: Next statically analyses route segment
// config exports and rejects anything it cannot evaluate at build time.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      // Static, hand-written, and the main non-catalog entry point — it changes
      // only when someone edits it, so it doesn't share /explore's cadence.
      url: `${SITE_URL}/about-eudora`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      // The one page where the product can be experienced rather than
      // described: a narrated story anyone can listen to and talk to without
      // signing up. Ranked with /about-eudora as a primary entry point.
      url: `${SITE_URL}/story-demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // The catalog helpers swallow failures and return null. Emitting just the
  // static entries beats failing the whole sitemap when the API is briefly
  // unreachable.
  const [programs, courses] = await Promise.all([
    getPublicPrograms(),
    getPublicCourseList(),
  ]);

  // Programmes outrank courses: they are the primary SKU, and courses exist
  // largely to funnel organic traffic into them.
  const programEntries: MetadataRoute.Sitemap = (programs ?? []).map((p) => ({
    url: `${SITE_URL}/explore/programs/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const courseEntries: MetadataRoute.Sitemap = (courses ?? []).map(
    (c) => ({
      url: `${SITE_URL}/explore/courses/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  return [...staticEntries, ...programEntries, ...courseEntries];
}
