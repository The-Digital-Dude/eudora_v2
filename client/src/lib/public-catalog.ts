import { SITE_URL } from "@/config/site";

/**
 * Server-side reads of the anonymous catalog API.
 *
 * Deliberately plain `fetch` rather than the RTK Query layer in
 * `features/catalog`: that client is browser-only — it attaches cookies and a
 * CSRF header — so it cannot run during prerendering. These pages must be
 * static and indexable, so they talk to the API host directly with no
 * credentials.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

/** Catalog changes rarely; an hour keeps pages fresh without hammering the API. */
export const CATALOG_REVALIDATE_SECONDS = 3600;

export type DeliveryMode = "SELF_PACED" | "LIVE" | "HYBRID";
export type GradeBand = "PRE_K_K" | "G1_2" | "G3_4" | "G5_6";

export interface PublicClassRef {
  id: string;
  name: string;
  slug: string;
  code: string;
}

export interface PublicProgramSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  outcomes: string[];
  deliveryMode: DeliveryMode;
  durationMonths: number | null;
  priceOneTimeCents: number | null;
  priceMonthlyCents: number | null;
  installmentCount: number | null;
  currency: string;
  class: PublicClassRef | null;
  _count: { programCourses: number };
}

export interface PublicConceptSummary {
  id: string;
  name: string;
  kind: "CHAPTER" | "CHECKPOINT";
  sortOrder: number;
  _count: { lessons: number; items: number };
}

export interface PublicProgramCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  estimatedHours: number | null;
  durationWeeks: number | null;
  gradeBand: GradeBand | null;
  isRequired: boolean;
  sortOrder: number;
  learningSubject: { name: string; code: string } | null;
  concepts: PublicConceptSummary[];
}

export interface PublicProgramDetail
  extends Omit<PublicProgramSummary, "_count"> {
  syllabusFile: { url: string; originalName: string } | null;
  courses: PublicProgramCourse[];
  totalChapters: number;
  totalEstimatedHours: number;
}

export interface PublicCourseItem {
  id: string;
  title: string;
  kind: "VIDEO" | "READING" | "DISCUSSION" | "ASSESSMENT";
  sortOrder: number;
  videoDurationSeconds: number | null;
  isFreePreview: boolean;
}

export interface PublicCourseDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  durationWeeks: number | null;
  gradeBand: GradeBand | null;
  deliveryMode: DeliveryMode;
  priceOneTimeCents: number | null;
  priceMonthlyCents: number | null;
  installmentCount: number | null;
  currency: string;
  learningSubject: { id: string; name: string; code: string } | null;
  concepts: Array<{
    id: string;
    name: string;
    description: string | null;
    kind: "CHAPTER" | "CHECKPOINT";
    sortOrder: number;
    lessons: Array<{ id: string; title: string; sortOrder: number }>;
    items: PublicCourseItem[];
  }>;
  programs: Array<{
    id: string;
    name: string;
    slug: string;
    priceOneTimeCents: number | null;
    currency: string;
  }>;
}

export interface PublicClassSummary extends PublicClassRef {
  description: string | null;
  _count: { programs: number };
}

/**
 * Returns null on any failure rather than throwing. A build must not break
 * because the API was briefly unreachable — the page renders its not-found
 * state and ISR picks the content up on the next revalidation. Failures are
 * still logged (server-side only) since a silent null here is otherwise
 * indistinguishable from "nothing published yet".
 */
async function getJson<T>(path: string): Promise<T | null> {
  const url = `${API_URL}/api${path}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: CATALOG_REVALIDATE_SECONDS },
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[public-catalog] ${url} -> HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { data?: T };
    return body.data ?? null;
  } catch (err) {
    console.error(`[public-catalog] fetch failed for ${url}:`, err);
    return null;
  }
}

export const getPublicPrograms = (classSlug?: string) =>
  getJson<PublicProgramSummary[]>(
    `/catalog/public/programs${classSlug ? `?classSlug=${encodeURIComponent(classSlug)}` : ""}`,
  );

export const getPublicProgram = (slug: string) =>
  getJson<PublicProgramDetail>(
    `/catalog/public/programs/${encodeURIComponent(slug)}`,
  );

export const getPublicCourse = (slug: string) =>
  getJson<PublicCourseDetail>(
    `/catalog/public/courses/${encodeURIComponent(slug)}`,
  );

export const getPublicClasses = () =>
  getJson<PublicClassSummary[]>(`/catalog/public/classes`);

/**
 * Returns a bare array: the API's response envelope flattens paginated
 * payloads, lifting `items` to `data` and moving the counts into `meta`.
 */
export const getPublicCourseList = () =>
  getJson<Array<{ slug: string; title: string }>>(
    `/catalog/public/courses?limit=200`,
  );

/** Money is integer minor units end to end; format only at the edge. */
export function formatPrice(cents: number | null, currency = "USD"): string {
  if (cents === null || cents === undefined) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  PRE_K_K: "Pre-K–K",
  G1_2: "Grades 1–2",
  G3_4: "Grades 3–4",
  G5_6: "Grades 5–6",
};
