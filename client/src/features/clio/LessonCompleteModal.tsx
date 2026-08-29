"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import React from "react";

import { ClioMascot } from "./ClioMascot";

interface LessonCompleteModalProps {
  isOpen: boolean;
  totalXp: number;
  /** Undefined when the learner has no streak, or it has not loaded. */
  streakCount?: number;
  lessonTitle: string;
  onBackToLessons: () => void;
  onNextLesson?: () => void;
}

export function LessonCompleteModal({
  isOpen,
  totalXp,
  streakCount,
  lessonTitle,
  onBackToLessons,
  onNextLesson,
}: LessonCompleteModalProps) {
  if (!isOpen) return null;

  const hasStreak = streakCount != null && streakCount > 0;

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-md transition-opacity duration-300">
      {/* Confetti overlay in background */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <DotLottieReact
          src="/lottie/confetti-effect-from-bottom-multiple-source-left-right.lottie"
          autoplay
          loop={false}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Modal Card */}
      <div className="border-border bg-card animate-fade-in-up relative flex w-full max-w-md flex-col items-center rounded-3xl border p-8 text-center shadow-2xl shadow-primary/5 backdrop-blur-xl">
        {/* Glowing aura */}
        <div className="absolute -top-10 left-1/2 -z-10 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />

        {/* Mascot companion celebrating */}
        <div className="relative mb-4">
          <ClioMascot state="celebrate" size={140} />
          {/* Animated sparkles */}
          <div className="absolute -top-2 -left-2 h-4 w-4 animate-ping rounded-full bg-warning" />
          <div className="absolute -right-2 -bottom-2 h-3 w-3 animate-ping rounded-full bg-primary" />
        </div>

        <span className="mb-1 text-xs font-bold tracking-widest text-primary uppercase">
          Lesson Complete!
        </span>
        <h2 className="text-foreground mb-6 text-xl leading-tight font-black md:text-2xl">
          {lessonTitle}
        </h2>

        {/* XP and Streak rewards summary. The streak tile is dropped when
            there is no streak to report, so the grid collapses to the one
            reward we can actually stand behind. */}
        <div
          className={`mb-8 grid w-full gap-4 ${
            hasStreak ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {/* XP Box */}
          <div className="border-border bg-muted/40 flex flex-col items-center justify-center rounded-2xl border p-4 transition-transform duration-200 hover:scale-105">
            <span className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
              XP Earned
            </span>
            <span className="mt-1 flex items-center gap-1 text-2xl font-black text-warning">
              +{totalXp}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 text-warning"
              >
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.6 3.102-1.196 4.622c-.21.81.67 1.45 1.366 1.012L10 15.6l4.187 2.455c.696.438 1.577-.202 1.366-1.012l-1.196-4.622 3.6-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.83-4.401Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>

          {/* Streak Box */}
          {hasStreak && (
            <div className="border-border bg-muted/40 flex flex-col items-center justify-center rounded-2xl border p-4 transition-transform duration-200 hover:scale-105">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
                Streak
              </span>
              <span className="mt-1 flex items-center gap-1 text-2xl font-black text-orange-500 dark:text-orange-400">
                {streakCount}
                <span className="text-sm font-semibold text-orange-400">
                  {streakCount === 1 ? "Day" : "Days"}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Level up encouragement */}
        <p className="text-muted-foreground mb-8 max-w-xs text-xs leading-relaxed font-medium">
          You&apos;re doing amazing! Continue learning to level up your mathematical skills with Clio.
        </p>

        {/* Action Buttons */}
        <div className="flex w-full flex-col gap-3">
          {onNextLesson && (
            <button
              onClick={onNextLesson}
              className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all duration-150 hover:opacity-90 active:scale-95"
            >
              Continue to Next Lesson
            </button>
          )}
          <button
            onClick={onBackToLessons}
            className="bg-muted border-border text-foreground hover:bg-muted/80 w-full cursor-pointer rounded-2xl border py-3.5 text-xs font-bold transition-all duration-150 active:scale-95"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
