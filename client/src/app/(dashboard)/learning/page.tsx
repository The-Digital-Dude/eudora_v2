"use client";

import { ArrowRight, Award, BookOpen, GraduationCap, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import React from "react";

import { useGetLessonsQuery } from "@/features/clio/clioApi";

/**
 * Active Learning hub — lives inside the portal shell so browsing lessons
 * never feels like leaving the app. Only the lesson player (/learn/[id])
 * goes full-screen.
 */
export default function LearningHubPage() {
  const { data: lessons, isLoading, error } = useGetLessonsQuery();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Active Learning</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Interactive journeys with instant feedback from Clio. Pick a lesson to begin — it opens
          in focus mode.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-xs font-semibold">Fetching learning catalog...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-destructive">Failed to load lessons list.</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Please try again in a moment.
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="group border-border bg-card hover:bg-muted/30 relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-primary uppercase">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {lesson.concept?.name || "Concept"}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg border border-warning/20 bg-warning/10 px-2 py-0.5 text-[10px] font-extrabold text-warning">
                    <Award className="h-3 w-3" />+{lesson.xpReward} XP
                  </span>
                </div>

                <h3 className="text-card-foreground text-base font-bold transition-colors group-hover:text-primary">
                  {lesson.title}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed font-medium">
                  {lesson.description ||
                    "Learn this concept dynamically through interactive exercises."}
                </p>
              </div>

              <div className="border-border/60 mt-6 flex items-center justify-end border-t pt-4">
                <Link
                  href={`/learn/${lesson.id}`}
                  className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start Journey <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
