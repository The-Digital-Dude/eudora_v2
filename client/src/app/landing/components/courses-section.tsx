import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";

import { getPublicCourseList } from "@/lib/public-catalog";

import { CoursesCarousel } from "./courses-carousel";
import { LandingLottie } from "./landing-lottie";

/**
 * Real published courses, read from the public catalog at build time.
 *
 * This section used to render six hardcoded titles and a row of category pills
 * with invented counts, while the catalog API it now calls was already powering
 * /explore and the pricing section. A visitor could be shown a course that did
 * not exist and click through to nothing.
 *
 * A server component, like PricingSection and for the same reason: it has to
 * render into the static HTML to be indexable, so it cannot use the
 * cookie-bound RTK Query client.
 */
export default async function CoursesSection() {
  const courses = await getPublicCourseList();
  const published = (courses ?? []).slice(0, 8);

  // Nothing published yet — render nothing rather than an empty band that
  // reads as a broken page.
  if (published.length === 0) return null;

  // Real counts, grouped from the same rows the cards below are built from.
  const bySubject = new Map<string, number>();
  for (const course of published) {
    const name = course.learningSubject?.name;
    if (name) bySubject.set(name, (bySubject.get(name) ?? 0) + 1);
  }
  const subjects = [...bySubject.entries()].sort((a, b) => b[1] - a[1]);

  return (
    /* Pulled up into the hero's tail. The dark card used to start 168px below
       the hero content behind a band of plain white; overlapping it makes the
       two read as layers instead of two things that failed to meet. `relative`
       so it paints above the hero's ambient blur rather than under it. */
    <section className="relative z-10 -mt-6 bg-background px-4 py-10 select-none sm:px-6 md:-mt-12 md:py-14">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#241546] py-20 md:py-28">
        {/* Decorative ambient glows — colors pulled from the Eudora mark */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[110px]" />
        <div className="pointer-events-none absolute top-1/4 -right-24 h-80 w-80 rounded-full bg-teal-400/20 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-[110px]" />

        <div className="pointer-events-none absolute right-6 bottom-6 hidden lg:block">
          <LandingLottie
            src="/lottie/mascot-clio-cheering-with-winner-cup-standing.lottie"
            className="h-28 w-28"
          />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 shadow-lg">
              <GraduationCap className="h-7 w-7 text-[#241546]" />
            </div>
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl md:text-5xl">
              What your child can <span className="text-amber-300">learn</span>
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/70 sm:text-base">
              Every course below is published and open for enrolment right now.
            </p>
          </div>

          {subjects.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
              {subjects.map(([name, count]) => (
                <Link
                  key={name}
                  href={`/explore?q=${encodeURIComponent(name)}`}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/85 transition-colors hover:bg-white/20"
                >
                  {name}
                  <span className="text-white/50">
                    {count} course{count === 1 ? "" : "s"}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <CoursesCarousel courses={published} />

          <div className="mt-12 flex justify-center">
            <Link
              href="/explore"
              className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-bold text-[#241546] shadow-lg transition-all hover:bg-amber-200 active:scale-97"
            >
              Browse the full catalogue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
