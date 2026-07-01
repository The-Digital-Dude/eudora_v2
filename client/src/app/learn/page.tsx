"use client";

import { ArrowRight, Award,BookOpen, GraduationCap, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import React from "react";

import { useGetLessonsQuery } from "@/features/clio/clioApi";

export default function LearnCatalogPage() {
  const { data: lessons, isLoading, error } = useGetLessonsQuery();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-1 flex-col overflow-y-auto p-6 md:p-12">
      {/* Header bar */}
      <header className="mx-auto mb-12 flex w-full max-w-4xl items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary p-2 text-white shadow-lg shadow-primary/40">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <span className="from-foreground to-muted-foreground bg-gradient-to-r bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
            Clio Active Learning
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground bg-muted/40 border-border hover:bg-muted flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors"
        >
          ← Dashboard
        </Link>
      </header>

      {/* Hero section */}
      <section className="mx-auto mb-16 max-w-2xl space-y-4 text-center">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold tracking-widest text-primary uppercase">
          Interactive Journeys
        </span>
        <h1 className="text-foreground text-3xl leading-tight font-black tracking-tight md:text-5xl">
          Master Math Concepts Visually
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed font-medium md:text-base">
          Step into visual classrooms where you drag, slide, and drop to solve math puzzles. Receive
          instant feedback and guidance from your companion Clio.
        </p>
      </section>

      {/* Catalog Grid */}
      <main className="mx-auto w-full max-w-4xl flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-xs font-semibold">
              Fetching learning catalog...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm font-semibold text-destructive">
              Failed to load lessons list.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Please ensure the backend api service is seeding and online.
            </p>
          </div>
        ) : !lessons || lessons.length === 0 ? (
          <div className="border-border bg-muted/40 rounded-2xl border p-12 text-center">
            <BookOpen className="text-muted-foreground/30 mx-auto mb-3 h-10 w-10" />
            <p className="text-foreground/80 text-sm font-bold">No lessons available yet</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Check back later for new interactive concepts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="group border-border bg-card hover:bg-muted/30 relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="space-y-3">
                  {/* Category and Reward */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-primary uppercase">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {lesson.concept?.name || "Concept"}
                    </span>
                    <span className="flex items-center gap-1 rounded-lg border border-warning/20 bg-warning/10 px-2 py-0.5 text-[10px] font-extrabold text-warning">
                      <Award className="h-3 w-3" />+{lesson.xpReward} XP
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-card-foreground text-base font-bold transition-colors group-hover:text-primary dark:group-hover:text-primary">
                    {lesson.title}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed font-medium">
                    {lesson.description ||
                      "Learn this concept dynamically through interactive exercises."}
                  </p>
                </div>

                {/* Bottom CTA */}
                <div className="border-border/60 mt-6 flex items-center justify-between border-t pt-4">
                  <span className="text-muted-foreground/60 text-[10px] font-bold tracking-wide uppercase">
                    Level 1 Difficulty
                  </span>
                  <Link
                    href={`/learn/${lesson.id}`}
                    className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary"
                  >
                    Start Journey <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
