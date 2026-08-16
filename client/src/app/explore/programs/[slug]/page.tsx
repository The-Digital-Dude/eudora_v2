import { BookOpen, Check, Clock, FileText, GraduationCap, Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  absoluteUrl,
  formatPrice,
  getPublicProgram,
  getPublicPrograms,
} from "@/lib/public-catalog";

import Footer from "../../../landing/components/footer";
import Navbar from "../../../landing/components/navbar";
import { ProgramHeroBackdrop } from "./program-hero-backdrop";

// Statically generated and refreshed hourly. Cache Components is not enabled
// in next.config.ts, so the route-segment `revalidate` export is the right
// mechanism here (Next 16 only removes it under Cache Components).
// Literal, not an imported constant: Next statically analyses route segment
// config exports and rejects anything it cannot evaluate at build time.
export const revalidate = 3600;

export async function generateStaticParams() {
  const programs = await getPublicPrograms();
  return (programs ?? []).map((p) => ({ slug: p.slug }));
}

// `params` is a Promise in Next 16 — it must be awaited before use.
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const program = await getPublicProgram(slug);
  if (!program) return { title: "Programme not found" };

  const description =
    program.shortDescription ??
    program.description ??
    `Enrol in ${program.name} on Eudora.`;

  return {
    title: program.name,
    description,
    alternates: { canonical: `/explore/programs/${program.slug}` },
    openGraph: {
      title: program.name,
      description,
      url: absoluteUrl(`/explore/programs/${program.slug}`),
      type: "website",
      ...(program.thumbnailUrl ? { images: [program.thumbnailUrl] } : {}),
    },
  };
}

export default async function ProgramPage({ params }: PageProps) {
  const { slug } = await params;
  const program = await getPublicProgram(slug);
  if (!program) notFound();

  const price = formatPrice(program.priceOneTimeCents, program.currency);
  const monthly = formatPrice(program.priceMonthlyCents, program.currency);

  // schema.org Course + Offer. This is what makes the page eligible for rich
  // results, and it is why price lives on the public endpoint at all.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: program.name,
    description: program.shortDescription ?? program.description ?? undefined,
    url: absoluteUrl(`/explore/programs/${program.slug}`),
    provider: { "@type": "Organization", name: "Eudora" },
    ...(program.class ? { educationalLevel: program.class.name } : {}),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode:
        program.deliveryMode === "LIVE" ? "Blended" : "Online",
      ...(program.durationMonths
        ? { courseWorkload: `P${program.durationMonths}M` }
        : {}),
    },
    ...(program.priceOneTimeCents
      ? {
          offers: {
            "@type": "Offer",
            price: (program.priceOneTimeCents / 100).toFixed(2),
            priceCurrency: program.currency,
            availability: "https://schema.org/InStock",
            url: absoluteUrl(`/explore/programs/${program.slug}`),
          },
        }
      : {}),
  };

  return (
    <>
      <Navbar />

      <div className="relative">
        <ProgramHeroBackdrop />

        <main className="relative mx-auto max-w-5xl px-4 pb-20 pt-28">
          {/* Per Next's JSON-LD guide. NOTE: on Next 16.2.9 this does not reach
              the prerendered HTML for pages under a dynamic segment — it is
              serialised into the RSC payload and inserted on hydration instead.
              Verified against the guide's exact snippet, and against a layout,
              with the same result; static routes are unaffected. JS-executing
              crawlers still see it. Revisit on the next Next.js upgrade. */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLd).replace(/</g, "\u003c"),
            }}
          />
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div className="space-y-8">
              <header className="space-y-3">
                {program.class && (
                  <Link
                    href={`/explore?class=${program.class.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    {program.class.name}
                  </Link>
                )}
                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {program.name}
                </h1>
                {program.shortDescription && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {program.shortDescription}
                  </p>
                )}

                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    {program.courses.length}{" "}
                    {program.courses.length === 1 ? "course" : "courses"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {program.totalChapters} chapters
                  </span>
                  {program.totalEstimatedHours > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      ~{program.totalEstimatedHours} hours
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    {program.deliveryMode === "LIVE"
                      ? "Live classes"
                      : program.deliveryMode === "HYBRID"
                        ? "Live + self-paced"
                        : "Self-paced"}
                  </span>
                </div>
              </header>

              {program.description && (
                <section className="space-y-2">
                  <h2 className="font-display text-lg font-bold text-foreground">
                    About this programme
                  </h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {program.description}
                  </p>
                </section>
              )}

              {program.outcomes.length > 0 && (
                <section className="space-y-3">
                  <h2 className="font-display text-lg font-bold text-foreground">
                    What your child will learn
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {program.outcomes.map((outcome) => (
                      <li
                        key={outcome}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Derived from the concept tree, never authored twice — this is
                  also the bulk of the page's indexable content. */}
              <section className="space-y-3">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Syllabus
                </h2>
                {program.courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Course details are being finalised.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {program.courses.map((course) => (
                      <article
                        key={course.id}
                        className="rounded-2xl border border-border bg-card p-4"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <Link
                            href={`/explore/courses/${course.slug}`}
                            className="font-display text-sm font-bold text-foreground hover:underline"
                          >
                            {course.title}
                          </Link>
                          <span className="text-[11px] text-muted-foreground">
                            {course.concepts.length} chapters
                            {course.estimatedHours
                              ? ` · ~${course.estimatedHours}h`
                              : ""}
                          </span>
                        </div>
                        {course.description && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {course.description}
                          </p>
                        )}
                        {course.concepts.length > 0 && (
                          <ol className="mt-3 space-y-1">
                            {course.concepts.map((concept, i) => (
                              <li
                                key={concept.id}
                                className="flex items-baseline gap-2 text-xs text-muted-foreground"
                              >
                                <span className="font-mono text-[10px] text-muted-foreground/70">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <span className="text-foreground">
                                  {concept.name}
                                </span>
                                <span className="text-[10px]">
                                  {concept._count.lessons + concept._count.items}{" "}
                                  items
                                </span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {program.syllabusFile && (
                <a
                  href={program.syllabusFile.url}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Download the full syllabus
                </a>
              )}
            </div>

            {/* Purchase panel. Sticky on desktop so the price and CTA stay in
                view through a long syllabus. */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
                {program.priceOneTimeCents ? (
                  <>
                    <div>
                      <p className="font-display text-3xl font-bold text-foreground">
                        {price}
                      </p>
                      {monthly && program.installmentCount && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          or {program.installmentCount} monthly payments of{" "}
                          {monthly}
                        </p>
                      )}
                    </div>

                    {/* Not logged in? /checkout bounces through login and comes
                        back, so the CTA is the same either way. */}
                    <Link
                      href={`/checkout?type=program&slug=${program.slug}`}
                      className="flex w-full items-center justify-center rounded-xl bg-foreground px-4 py-3 text-xs font-bold text-background hover:bg-foreground/90"
                    >
                      Enrol now
                    </Link>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-foreground">
                    Enrolment opens soon
                  </p>
                )}

                <ul className="space-y-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground">
                  <li>
                    {program.durationMonths
                      ? `${program.durationMonths} month programme`
                      : "Learn at your own pace"}
                  </li>
                  <li>{program.courses.length} full courses included</li>
                  <li>Progress tracking for guardians</li>
                </ul>
              </div>
            </aside>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
