"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ArrowRight, GraduationCap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";

// Presentational placeholders only — no course-category backend exists yet,
// so these pills are static and don't filter the (also placeholder) cards
// below. Swap both for real catalog data once that lands.
const CATEGORIES = [
  { label: "Popular Courses", count: 6, active: true },
  { label: "Math Skills", count: 4 },
  { label: "Science & Tech", count: 3 },
  { label: "Language Arts", count: 3 },
  { label: "Coding", count: 2 },
  { label: "Early Learning", count: 2 },
];

const COURSES = [
  { title: "Algebra Foundations", subject: "Mathematics", gradeBand: "Grades 5–6", mode: "Self-Paced", weeks: 8, chapters: 4 },
  { title: "Phonics & Early Reading", subject: "Language Arts", gradeBand: "Pre-K–K", mode: "Live Cohort", weeks: 6, chapters: 3 },
  { title: "Creative Coding Basics", subject: "Coding", gradeBand: "Grades 5–6", mode: "Self-Paced", weeks: 5, chapters: 4 },
  { title: "Science Explorers", subject: "Science", gradeBand: "Grades 3–4", mode: "Live Cohort", weeks: 6, chapters: 4 },
  { title: "Fractions & Decimals", subject: "Mathematics", gradeBand: "Grades 3–4", mode: "Self-Paced", weeks: 4, chapters: 4 },
  { title: "Intro to Algorithms", subject: "Coding", gradeBand: "Grades 5–6", mode: "Live Cohort", weeks: 6, chapters: 4 },
];

export default function CoursesSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[0] as HTMLElement | undefined;
    if (!card) return;
    const step = card.offsetWidth + 20;
    setActiveIndex(Math.min(COURSES.length - 1, Math.round(el.scrollLeft / step)));
  };

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <section className="bg-background px-4 py-10 select-none sm:px-6 md:py-14">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#241546] py-20 md:py-28">
        {/* Decorative ambient glows — colors pulled from the Eudora mark */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[110px]" />
        <div className="pointer-events-none absolute top-1/4 -right-24 h-80 w-80 rounded-full bg-teal-400/20 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-[110px]" />

        {/* Clio, cheering about the catalog */}
        <div className="pointer-events-none absolute right-6 bottom-6 hidden lg:block">
          <DotLottieReact
            src="/lottie/mascot-clio-cheering-with-winner-cup-standing.lottie"
            loop
            autoplay
            className="h-28 w-28"
          />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          {/* Heading */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 shadow-lg">
              <GraduationCap className="h-7 w-7 text-[#241546]" />
            </div>
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl md:text-5xl">
              All Courses <span className="text-amber-300">of Eudora</span>
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/70 sm:text-base">
              A growing catalog of personalized, AI-guided courses for every learner.
            </p>
          </div>

          {/* Category pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                className={
                  cat.active
                    ? "flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#241546] shadow-md"
                    : "flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/85"
                }
              >
                {cat.label}
                <span className={cat.active ? "text-[#241546]/60" : "text-white/50"}>
                  {cat.count} course{cat.count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>

          {/* Course card carousel */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {COURSES.map((course) => (
              <div
                key={course.title}
                className="w-64 shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-xl sm:w-72"
              >
                <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-8">
                  <Image
                    src="/landing/dummy-cover-1.png"
                    alt={course.title}
                    width={400}
                    height={400}
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-[#241546] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                    {course.gradeBand}
                  </span>
                  <span className="absolute top-3 right-3 rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-bold text-[#241546] shadow-sm">
                    {course.weeks} Weeks
                  </span>
                </div>

                <div className="p-5">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <span
                      className={
                        course.mode === "Live Cohort"
                          ? "h-1.5 w-1.5 rounded-full bg-destructive"
                          : "h-1.5 w-1.5 rounded-full bg-success"
                      }
                    />
                    {course.mode}
                  </div>
                  <h3 className="text-base font-bold text-foreground">{course.title}</h3>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Badge variant="secondary">{course.subject}</Badge>
                    <span className="text-xs text-muted-foreground">{course.chapters} chapters</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#241546]">
                    View details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination dots */}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {COURSES.map((course, i) => (
              <button
                key={course.title}
                type="button"
                aria-label={`Show course ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={
                  i === activeIndex
                    ? "h-2 w-5 cursor-pointer rounded-full bg-amber-300 transition-all"
                    : "h-2 w-2 cursor-pointer rounded-full bg-white/25 transition-all hover:bg-white/40"
                }
              />
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 flex justify-center">
            <Link href="/explore">
              <button className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-amber-300 px-6 text-sm font-bold text-[#241546] shadow-lg transition-all hover:bg-amber-200 active:scale-97">
                All Courses
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
