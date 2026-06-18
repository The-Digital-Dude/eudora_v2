"use client";

import React from "react";
import Link from "next/link";
import { useGetLessonsQuery } from "@/features/clio/clioApi";
import { Loader2, Sparkles, BookOpen, ArrowRight, GraduationCap, Award } from "lucide-react";

export default function LearnCatalogPage() {
  const { data: lessons, isLoading, error } = useGetLessonsQuery();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 overflow-y-auto">
      {/* Header bar */}
      <header className="mb-12 max-w-4xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-600 rounded-xl text-white shadow-lg shadow-violet-950/40">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Clio Active Learning
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-bold text-white/60 hover:text-white transition-colors flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl hover:bg-white/10"
        >
          ← Dashboard
        </Link>
      </header>

      {/* Hero section */}
      <section className="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3 py-1 rounded-full">
          Interactive Journeys
        </span>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
          Master Math Concepts Visually
        </h1>
        <p className="text-sm md:text-base text-white/60 leading-relaxed font-medium">
          Step into visual classrooms where you drag, slide, and drop to solve math puzzles. Receive instant feedback and guidance from your companion Clio.
        </p>
      </section>

      {/* Catalog Grid */}
      <main className="max-w-4xl mx-auto w-full flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-xs font-semibold text-white/45">Fetching learning catalog...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
            <p className="text-sm font-semibold text-rose-400">Failed to load lessons list.</p>
            <p className="text-xs text-white/40 mt-1">Please ensure the backend api service is seeding and online.</p>
          </div>
        ) : !lessons || lessons.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-white/70">No lessons available yet</p>
            <p className="text-xs text-white/40 mt-1">Check back later for new interactive concepts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-6 hover:border-violet-500/30 hover:bg-slate-900/60 hover:shadow-xl hover:shadow-violet-950/20 transition-all duration-300"
              >
                <div className="space-y-3">
                  {/* Category and Reward */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {lesson.concept?.name || "Concept"}
                    </span>
                    <span className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-400 border border-amber-500/20">
                      <Award className="w-3 h-3" />
                      +{lesson.xpReward} XP
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed font-medium">
                    {lesson.description || "Learn this concept dynamically through interactive exercises."}
                  </p>
                </div>

                {/* Bottom CTA */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wide">
                    Level 1 Difficulty
                  </span>
                  <Link
                    href={`/learn/${lesson.id}`}
                    className="flex items-center gap-1 rounded-xl bg-violet-600/80 px-4 py-2 text-xs font-bold text-white group-hover:bg-violet-600 transition-colors"
                  >
                    Start Journey <ArrowRight className="w-3.5 h-3.5" />
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
