import {
  BookOpen,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  MessageSquare,
  PlayCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StructuredData } from "@/components/structured-data";
import {
  absoluteUrl,
  formatPrice,
  getPublicCourse,
  getPublicCourseList,
  GRADE_BAND_LABELS,
  type PublicCourseItem,
} from "@/lib/public-catalog";

import Footer from "../../../landing/components/footer";
import Navbar from "../../../landing/components/navbar";

// Literal, not an imported constant: Next statically analyses route segment
// config exports and rejects anything it cannot evaluate at build time.
export const revalidate = 3600;

export async function generateStaticParams() {
  const list = await getPublicCourseList();
  return (list ?? []).map((c) => ({ slug: c.slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublicCourse(slug);
  if (!course) return { title: "Course not found" };

  const description =
    course.description ?? `Learn ${course.title} on Eudora.`;

  return {
    title: course.title,
    description,
    alternates: { canonical: `/explore/courses/${course.slug}` },
    openGraph: {
      title: course.title,
      description,
      url: absoluteUrl(`/explore/courses/${course.slug}`),
      type: "website",
      ...(course.thumbnailUrl ? { images: [course.thumbnailUrl] } : {}),
    },
  };
}

const kindIcon = {
  VIDEO: PlayCircle,
  READING: FileText,
  DISCUSSION: MessageSquare,
  ASSESSMENT: ClipboardList,
} as const;

function itemMeta(item: PublicCourseItem): string {
  if (item.kind === "VIDEO" && item.videoDurationSeconds) {
    return `${Math.max(1, Math.round(item.videoDurationSeconds / 60))} min`;
  }
  return item.kind.charAt(0) + item.kind.slice(1).toLowerCase();
}

export default async function CoursePage({ params }: PageProps) {
  const { slug } = await params;
  const course = await getPublicCourse(slug);
  if (!course) notFound();

  const items = course.concepts.flatMap((c) => c.items);
  const previewCount = items.filter((i) => i.isFreePreview).length;

  // The cheapest programme containing this course is the upsell target: the
  // course page earns the organic traffic, the programme captures the revenue.
  const bundle = course.programs
    .filter((p) => p.priceOneTimeCents)
    .sort((a, b) => (a.priceOneTimeCents ?? 0) - (b.priceOneTimeCents ?? 0))[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description ?? undefined,
    url: absoluteUrl(`/explore/courses/${course.slug}`),
    provider: { "@type": "Organization", name: "Eudora" },
    ...(course.gradeBand
      ? { educationalLevel: GRADE_BAND_LABELS[course.gradeBand] }
      : {}),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: course.deliveryMode === "LIVE" ? "Blended" : "Online",
      ...(course.estimatedHours
        ? { courseWorkload: `PT${course.estimatedHours}H` }
        : {}),
    },
    ...(course.priceOneTimeCents
      ? {
          offers: {
            "@type": "Offer",
            price: (course.priceOneTimeCents / 100).toFixed(2),
            priceCurrency: course.currency,
            availability: "https://schema.org/InStock",
            url: absoluteUrl(`/explore/courses/${course.slug}`),
          },
        }
      : {}),
  };

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-28">
        <StructuredData id="course-jsonld" data={jsonLd} />
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
            {course.learningSubject && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-1">
                {course.learningSubject.name}
              </span>
            )}
            {course.gradeBand && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-1">
                {GRADE_BAND_LABELS[course.gradeBand]}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {course.title}
          </h1>

          {course.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {course.concepts.length} chapters
            </span>
            {course.estimatedHours && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />~{course.estimatedHours} hours
              </span>
            )}
            {previewCount > 0 && (
              <span className="font-semibold text-success">
                {previewCount} free preview{previewCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </header>

        {/* Programme upsell is the PRIMARY call to action; buying this course
            alone is deliberately the secondary, visually quieter option. */}
        <section className="mt-8 rounded-3xl border border-border bg-card p-6">
          {bundle ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Best value
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-foreground">
                  Get this inside {bundle.name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Everything in this course plus the rest of the programme, for{" "}
                  {formatPrice(bundle.priceOneTimeCents, bundle.currency)}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/explore/programs/${bundle.slug}`}
                  className="rounded-xl bg-foreground px-5 py-3 text-xs font-bold text-background hover:bg-foreground/90"
                >
                  View the programme:{" "}
                  {formatPrice(bundle.priceOneTimeCents, bundle.currency)}
                </Link>
                {course.priceOneTimeCents && (
                  <Link
                    href={`/checkout?type=course&slug=${course.slug}`}
                    className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    or buy just this course:{" "}
                    {formatPrice(course.priceOneTimeCents, course.currency)}
                  </Link>
                )}
              </div>
            </div>
          ) : course.priceOneTimeCents ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="font-display text-2xl font-bold text-foreground">
                {formatPrice(course.priceOneTimeCents, course.currency)}
              </p>
              <Link
                href={`/checkout?type=course&slug=${course.slug}`}
                className="rounded-xl bg-foreground px-5 py-3 text-xs font-bold text-background hover:bg-foreground/90"
              >
                Enrol now
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This course is available as part of a programme.
            </p>
          )}
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">
            What&apos;s inside
          </h2>

          <div className="space-y-3">
            {course.concepts.map((concept, index) => (
              <article
                key={concept.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-sm font-bold text-foreground">
                    {concept.name}
                  </h3>
                </div>
                {concept.description && (
                  <p className="mt-1 pl-6 text-xs text-muted-foreground">
                    {concept.description}
                  </p>
                )}

                <ul className="mt-3 space-y-1 pl-6">
                  {concept.items.map((item) => {
                    const Icon = kindIcon[item.kind];
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {item.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {itemMeta(item)}
                        </span>
                        {item.isFreePreview ? (
                          <span className="shrink-0 rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">
                            FREE
                          </span>
                        ) : (
                          <Lock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                        )}
                      </li>
                    );
                  })}
                  {concept.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {lesson.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        Practice
                      </span>
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
