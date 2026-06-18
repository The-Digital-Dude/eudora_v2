"use client";

import React from "react";
import { useRive } from "@rive-app/react-canvas";
import { RiveClioMascot } from "./RiveClioMascot";

interface LessonCompleteModalProps {
  isOpen: boolean;
  totalXp: number;
  streakCount: number;
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
  // Rive confetti animation background
  const { RiveComponent: ConfettiComponent } = useRive({
    src: "/rive/confetti.riv",
    autoplay: true,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md transition-opacity duration-300">
      {/* Rive Confetti Overlay in background */}
      {ConfettiComponent && (
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <ConfettiComponent className="h-full w-full object-cover" />
        </div>
      )}

      {/* Modal Card */}
      <div className="relative flex w-full max-w-md flex-col items-center rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl shadow-violet-500/10 backdrop-blur-xl animate-fade-in-up">
        {/* Glowing aura */}
        <div className="absolute -top-10 left-1/2 -z-10 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-600/30 blur-3xl" />

        {/* Mascot companion celebrating */}
        <div className="mb-4 relative">
          <RiveClioMascot state="celebrate" size={140} />
          {/* Animated sparkles */}
          <div className="absolute -top-2 -left-2 h-4 w-4 bg-amber-400 rounded-full animate-ping" />
          <div className="absolute -bottom-2 -right-2 h-3 w-3 bg-fuchsia-400 rounded-full animate-ping" />
        </div>

        <span className="mb-1 text-xs font-bold text-violet-400 uppercase tracking-widest">
          Lesson Complete!
        </span>
        <h2 className="mb-6 text-xl md:text-2xl font-black text-white leading-tight">
          {lessonTitle}
        </h2>

        {/* XP and Streak rewards summary */}
        <div className="mb-8 grid w-full grid-cols-2 gap-4">
          {/* XP Box */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 transition-transform hover:scale-105 duration-200">
            <span className="text-[10px] font-bold text-white/45 uppercase tracking-wide">
              XP Earned
            </span>
            <span className="mt-1 text-2xl font-black text-amber-400 flex items-center gap-1">
              +{totalXp}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 text-amber-400"
              >
                <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.6 3.102-1.196 4.622c-.21.81.67 1.45 1.366 1.012L10 15.6l4.187 2.455c.696.438 1.577-.202 1.366-1.012l-1.196-4.622 3.6-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.83-4.401Z" clipRule="evenodd" />
              </svg>
            </span>
          </div>

          {/* Streak Box */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 transition-transform hover:scale-105 duration-200">
            <span className="text-[10px] font-bold text-white/45 uppercase tracking-wide">
              New Streak
            </span>
            <span className="mt-1 text-2xl font-black text-orange-400 flex items-center gap-1">
              {streakCount}
              <span className="text-sm font-semibold text-orange-300">Days</span>
            </span>
          </div>
        </div>

        {/* Level up encouragement */}
        <p className="mb-8 max-w-xs text-xs text-white/60 leading-relaxed font-medium">
          You're doing amazing! Continue learning to level up your mathematical skills with Clio.
        </p>

        {/* Action Buttons */}
        <div className="flex w-full flex-col gap-3">
          {onNextLesson && (
            <button
              onClick={onNextLesson}
              className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-violet-950/40 hover:opacity-90 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              Continue to Next Lesson
            </button>
          )}
          <button
            onClick={onBackToLessons}
            className="w-full rounded-2xl bg-white/10 border border-white/10 py-3.5 text-xs font-bold text-white hover:bg-white/15 active:scale-95 transition-all duration-150 cursor-pointer"
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
