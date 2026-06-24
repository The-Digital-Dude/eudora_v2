"use client";

import { useRive } from "@rive-app/react-canvas";
import React, { useEffect, useRef,useState } from "react";

interface GamificationHUDProps {
  sessionXp: number;
  streakCount?: number;
  lessonProgress: number; // 0 to 1
  onClose?: () => void;
  lessonTitle: string;
}

export function GamificationHUD({
  sessionXp,
  streakCount = 3, // Default fallback streak
  lessonProgress,
  onClose,
  lessonTitle,
}: GamificationHUDProps) {
  const [displayedXp, setDisplayedXp] = useState(sessionXp);
  const [animateXp, setAnimateXp] = useState(false);
  const prevXpRef = useRef(sessionXp);

  // Rive animation for streak flame
  const { RiveComponent: StreakFlameComponent } = useRive({
    src: "/rive/streak-flame.riv",
    autoplay: true,
  });

  // Rive animation for XP burst particle effect
  const { rive: xpRive, RiveComponent: XpBurstComponent } = useRive({
    src: "/rive/xp-burst.riv",
    autoplay: false,
  });

  useEffect(() => {
    if (sessionXp > prevXpRef.current) {
      // Trigger animations
      setAnimateXp(true);
      if (xpRive) {
        xpRive.stop();
        xpRive.play();
      }

      // Animate the XP counter counting up
      const diff = sessionXp - prevXpRef.current;
      const step = Math.max(1, Math.floor(diff / 10));
      let current = prevXpRef.current;

      const timer = setInterval(() => {
        current += step;
        if (current >= sessionXp) {
          setDisplayedXp(sessionXp);
          clearInterval(timer);
        } else {
          setDisplayedXp(current);
        }
      }, 50);

      const timeout = setTimeout(() => {
        setAnimateXp(false);
      }, 1200);

      prevXpRef.current = sessionXp;
      return () => {
        clearInterval(timer);
        clearTimeout(timeout);
      };
    } else {
      setDisplayedXp(sessionXp);
      prevXpRef.current = sessionXp;
    }
  }, [sessionXp, xpRive]);

  return (
    <header className="border-border bg-background/80 relative z-40 flex h-16 w-full items-center justify-between border-b px-4 backdrop-blur-md select-none md:px-6">
      {/* Left: Close Button & Lesson Title */}
      <div className="flex items-center gap-4">
        {onClose && (
          <button
            onClick={onClose}
            className="bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div>
          <span className="text-xs font-bold tracking-wider text-primary uppercase">
            Active Learning
          </span>
          <h1 className="text-foreground max-w-[150px] truncate text-sm font-bold sm:max-w-xs md:max-w-md md:text-base">
            {lessonTitle}
          </h1>
        </div>
      </div>

      {/* Middle: Progress Bar */}
      <div className="hidden w-1/3 max-w-xs flex-col items-center gap-1.5 sm:flex">
        <div className="text-muted-foreground flex w-full justify-between text-[10px] font-bold">
          <span>PROGRESS</span>
          <span>{Math.round(lessonProgress * 100)}%</span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
            style={{ width: `${lessonProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Right: Gamification HUD Stats */}
      <div className="flex items-center gap-3">
        {/* Streak Stats */}
        <div className="bg-muted/30 border-border flex items-center gap-1 rounded-xl border py-1 pr-3 pl-2">
          <div className="flex h-7 w-7 items-center justify-center">
            {StreakFlameComponent ? (
              <StreakFlameComponent className="h-full w-full object-contain" />
            ) : (
              <span className="text-lg text-orange-500">🔥</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[9px] leading-none font-bold">STREAK</span>
            <span className="text-xs leading-tight font-bold text-orange-500 dark:text-orange-400">
              {streakCount} days
            </span>
          </div>
        </div>

        {/* XP Stats */}
        <div
          className={[
            "relative flex items-center gap-1.5 rounded-xl border px-3 py-1 transition-all duration-300",
            animateXp
              ? "scale-105 border-warning bg-warning/10 shadow-md shadow-warning/20"
              : "border-border bg-muted/30",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* XP Burst Canvas Overlay */}
          {animateXp && XpBurstComponent && (
            <div className="pointer-events-none absolute -top-12 -left-12 h-32 w-32">
              <XpBurstComponent className="h-full w-full" />
            </div>
          )}

          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-[9px] leading-none font-bold">
              XP EARNED
            </span>
            <span className="text-xs leading-tight font-bold text-warning">
              +{displayedXp} XP
            </span>
          </div>

          {/* Sparkle Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={[
              "h-4 w-4 text-warning transition-transform duration-300",
              animateXp ? "scale-125 rotate-12" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <path
              fillRule="evenodd"
              d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.528l.228.796a1.125 1.125 0 0 0 .774.774l.796.228a.75.75 0 0 1 0 1.448l-.796.228a1.125 1.125 0 0 0-.774.774l-.228.796a.75.75 0 0 1-1.448 0l-.228-.796a1.125 1.125 0 0 0-.774-.774l-.796-.228a.75.75 0 0 1 0-1.448l.796-.228a1.125 1.125 0 0 0 .774-.774l.228-.796A.75.75 0 0 1 18 1.5ZM19.75 18a.75.75 0 0 0-.728-.528l-.228-.796a1.125 1.125 0 0 0-.774-.774l-.796-.228a.75.75 0 0 0 0 1.448l.796.228c.314.09.562.338.652.652l.228.796a.75.75 0 0 0 1.448 0l.228-.796a1.125 1.125 0 0 0 .774-.774l.796-.228a.75.75 0 0 0 0-1.448l-.796-.228a1.125 1.125 0 0 0-.774-.774l-.228-.796Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </header>
  );
}
