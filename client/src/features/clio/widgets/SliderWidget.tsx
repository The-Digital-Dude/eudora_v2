"use client";

import React from "react";

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  unit?: string;
}

interface SliderWidgetProps {
  config: SliderConfig;
  value: number;
  onChange: (val: number) => void;
  locked: boolean;
  isCorrect?: boolean | null;
  // Only present after an incorrect submission — never available beforehand.
  correctValue?: number;
}

export function SliderWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
  correctValue,
}: SliderWidgetProps) {
  const { min = 0, max = 100, step = 1, unit = "" } = config;

  // Calculate percentage for progress fill
  const percentage = ((value - min) / (max - min)) * 100;
  const showReveal = locked && isCorrect === false && correctValue !== undefined;
  const revealPercentage = showReveal
    ? Math.min(100, Math.max(0, ((correctValue! - min) / (max - min)) * 100))
    : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!locked) {
      onChange(Number(e.target.value));
    }
  };

  return (
    <div className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border p-8 transition-all duration-300 select-none">
      <div className="relative w-full max-w-md py-6">
        {/* Floating tooltip/value indicator — the student's own answer */}
        <div
          className="absolute -top-4 flex flex-col items-center justify-center transition-all duration-150 ease-out"
          style={{
            left: `calc(${percentage}% - 24px)`,
          }}
        >
          <div
            className={[
              "rounded-lg px-2.5 py-1 text-xs font-bold shadow-lg",
              showReveal
                ? "bg-destructive text-destructive-foreground shadow-destructive/20"
                : "bg-primary text-primary-foreground shadow-primary/20",
            ].join(" ")}
          >
            {value}
            {unit}
          </div>
          <div
            className={`-mt-1 h-1.5 w-1.5 rotate-45 ${showReveal ? "bg-destructive" : "bg-primary"}`}
          />
        </div>

        {/* Correct-answer reveal tooltip, shown only after a wrong answer */}
        {showReveal && revealPercentage !== null && (
          <div
            className="animate-fade-in absolute -top-4 flex flex-col items-center justify-center"
            style={{ left: `calc(${revealPercentage}% - 24px)` }}
          >
            <div className="rounded-lg bg-success px-2.5 py-1 text-xs font-bold text-success-foreground shadow-lg shadow-success/20">
              {correctValue}
              {unit}
            </div>
            <div className="-mt-1 h-1.5 w-1.5 rotate-45 bg-success" />
          </div>
        )}

        {/* Custom Range Track Container */}
        <div className="bg-muted relative flex h-2 w-full items-center rounded-full">
          {/* Progress fill — the student's own answer */}
          <div
            className={[
              "absolute h-full rounded-full",
              showReveal
                ? "bg-destructive/50"
                : "bg-gradient-to-r from-violet-500 to-fuchsia-500",
            ].join(" ")}
            style={{ width: `${percentage}%` }}
          />

          {/* Correct-answer reveal marker on the track */}
          {showReveal && revealPercentage !== null && (
            <div
              className="absolute top-1/2 z-10 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success"
              style={{ left: `${revealPercentage}%` }}
            />
          )}

          {/* Actual range input */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            disabled={locked}
            className={[
              "absolute h-full w-full cursor-pointer appearance-none bg-transparent outline-none focus:outline-none",
              locked ? "cursor-not-allowed opacity-50" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              // Custom styles to style the range thumb in different browsers
              WebkitAppearance: "none",
            }}
          />
        </div>

        {/* Custom Min/Max labels */}
        <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs font-semibold">
          <span>
            {min}
            {unit}
          </span>
          <span className="text-muted-foreground/60 font-medium">Drag to explore</span>
          <span>
            {max}
            {unit}
          </span>
        </div>
      </div>

      {/* Styled inline style block to handle CSS range thumb styling directly */}
      <style jsx global>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #8b5cf6;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
          cursor: pointer;
          transition:
            transform 0.15s ease-in-out,
            background-color 0.15s ease-in-out;
        }
        input[type="range"]:not(:disabled)::-webkit-slider-thumb:hover {
          transform: scale(1.25);
          background: #f5f3ff;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #8b5cf6;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
          cursor: pointer;
          transition:
            transform 0.15s ease-in-out,
            background-color 0.15s ease-in-out;
        }
        input[type="range"]:not(:disabled)::-moz-range-thumb:hover {
          transform: scale(1.25);
          background: #f5f3ff;
        }
      `}</style>
    </div>
  );
}
