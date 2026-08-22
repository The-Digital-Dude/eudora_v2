"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { GRADE_BAND_LABELS, type PublicCourseListItem } from "@/lib/public-catalog";

/**
 * The scrolling half of the courses band.
 *
 * Split from `courses-section.tsx` because that one has to be a server
 * component to read the catalog at build time, and this one needs scroll state.
 * Everything rendered here comes from the API — the cards used to be six
 * hardcoded titles, one of which named a course that had been deleted from the
 * catalog for not being K-6.
 */
export function CoursesCarousel({ courses }: { courses: PublicCourseListItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[0] as HTMLElement | undefined;
    if (!card) return;
    const step = card.offsetWidth + 20;
    setActiveIndex(Math.min(courses.length - 1, Math.round(el.scrollLeft / step)));
  };

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/explore/courses/${course.slug}`}
            className="group w-64 shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-transform hover:-translate-y-0.5 sm:w-72"
          >
            {/* A typographic tile rather than artwork: the list payload carries
                no thumbnail, and repeating one stock cover across every card
                looked like six of the same course. */}
            <div className="relative flex aspect-[16/9] flex-col justify-end gap-1 bg-gradient-to-br from-[#241546] to-[#3b2168] p-5">
              <span className="font-display text-lg leading-tight font-extrabold text-white">
                {course.learningSubject?.name ?? "Course"}
              </span>
              {course.gradeBand && (
                <span className="w-fit rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-[#241546]">
                  {GRADE_BAND_LABELS[course.gradeBand]}
                </span>
              )}
            </div>

            <div className="p-5">
              <h3 className="text-base font-bold text-foreground">{course.title}</h3>
              {course.description && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {course.description}
                </p>
              )}
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                {course._count.concepts} chapter{course._count.concepts === 1 ? "" : "s"}
                {course.estimatedHours ? ` · about ${course.estimatedHours}h` : ""}
              </p>
              <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#241546]">
                View details
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {courses.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {courses.map((course, i) => (
            <button
              key={course.id}
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
      )}
    </>
  );
}
