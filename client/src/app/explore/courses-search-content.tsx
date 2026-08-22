"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CloudShape } from "@/components/decorative/cloud-shape";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPublicCoursesQuery } from "@/features/catalog/catalogApi";

import Footer from "../landing/components/footer";
import Navbar from "../landing/components/navbar";

const POPULAR_SEARCHES = ["Math", "Science", "English", "Coding"];

const GRADE_BAND_LABELS: Record<string, string> = {
  PRE_K_K: "Pre-K–K",
  G1_2: "Grades 1–2",
  G3_4: "Grades 3–4",
  G5_6: "Grades 5–6",
};

export function CoursesSearchContent() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  // Mirrors the login page's convention: read the initial query from
  // window.location instead of useSearchParams, so this page stays
  // prerenderable without a Suspense boundary.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(q);
    setSubmittedQuery(q);
  }, []);

  const { data, isFetching } = useGetPublicCoursesQuery({
    search: submittedQuery || undefined,
    limit: 24,
  });

  const runSearch = (term: string) => {
    setQuery(term);
    setSubmittedQuery(term);
    const url = term ? `/explore?q=${encodeURIComponent(term)}` : "/explore";
    window.history.replaceState(null, "", url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const courses = data?.items ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/50 bg-background px-6 pt-16 pb-12 md:pt-20 md:pb-16">
          {/* Soft ambient gradient wash */}
          <div className="pointer-events-none absolute top-0 left-1/4 h-72 w-72 -translate-y-1/3 rounded-full bg-gradient-to-br from-[#241546]/[0.06] to-transparent blur-3xl" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 translate-y-1/4 rounded-full bg-gradient-to-tl from-amber-300/[0.10] to-transparent blur-3xl" />

          {/* Decorative clouds — brand-tinted, no image asset */}
          <CloudShape className="top-8 left-[6%] h-10 w-28 text-[#241546]/[0.07] md:top-10" />
          <CloudShape className="top-20 right-[10%] h-8 w-24 text-amber-400/[0.14] md:top-16" />
          <CloudShape className="top-1/2 right-[4%] h-9 w-24 text-fuchsia-400/[0.10] hidden lg:block" />

          {/* Clio, walking to school with her bag and a bird friend */}
          <div className="pointer-events-none absolute bottom-0 left-16 hidden sm:block md:left-28">
            <DotLottieReact
              src="/lottie/mascot-clio-going-to-school-with-bag-and-a-bird.lottie"
              loop
              autoplay
              className="h-44 w-44 md:h-56 md:w-56"
            />
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Find your next course
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Search our full course catalog. Every course is taught with personalized, AI-guided
              lessons.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm"
            >
              <Search className="ml-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses, e.g. Algebra, Physics..."
                className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0"
              />
              <button
                type="submit"
                className="h-9 shrink-0 cursor-pointer rounded-xl bg-foreground px-5 text-sm font-semibold text-primary-foreground transition-all hover:bg-foreground/90 active:scale-97"
              >
                Search
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">Popular:</span>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => runSearch(term)}
                  className="cursor-pointer rounded-full border border-border bg-card px-3 py-1 font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          {isFetching ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
              <p className="text-sm font-semibold text-foreground">No courses found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {submittedQuery
                  ? `Nothing matched "${submittedQuery}". Try a different search.`
                  : "Check back soon. New courses are added regularly."}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {data?.total ?? courses.length} course{(data?.total ?? courses.length) === 1 ? "" : "s"}
                {submittedQuery ? ` for "${submittedQuery}"` : ""}
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <Link key={course.id} href="/register" className="group block">
                    <Card className="h-full transition-shadow group-hover:shadow-md">
                      <CardHeader>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary">{course.learningSubject.name}</Badge>
                          {course.gradeBand && (
                            <Badge variant="outline">
                              {GRADE_BAND_LABELS[course.gradeBand] ?? course.gradeBand}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="mt-1 text-base">{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {course.description && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {course.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{course._count.concepts} chapters</span>
                          {course.estimatedHours != null && <span>{course.estimatedHours}h</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
