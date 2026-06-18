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
}

export function SliderWidget({
  config,
  value,
  onChange,
  locked,
}: SliderWidgetProps) {
  const { min = 0, max = 100, step = 1, unit = "" } = config;

  // Calculate percentage for progress fill
  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!locked) {
      onChange(Number(e.target.value));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 select-none transition-all duration-300">
      <div className="relative w-full max-w-md py-6">
        {/* Floating tooltip/value indicator */}
        <div
          className="absolute -top-4 flex flex-col items-center justify-center transition-all duration-150 ease-out"
          style={{
            left: `calc(${percentage}% - 24px)`,
          }}
        >
          <div className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-violet-900/40">
            {value}
            {unit}
          </div>
          <div className="h-1.5 w-1.5 rotate-45 bg-violet-600 -mt-1" />
        </div>

        {/* Custom Range Track Container */}
        <div className="relative flex h-2 w-full items-center rounded-full bg-white/10">
          {/* Progress fill */}
          <div
            className="absolute h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            style={{ width: `${percentage}%` }}
          />

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
              "absolute h-full w-full appearance-none bg-transparent cursor-pointer outline-none focus:outline-none",
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
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-white/50">
          <span>
            {min}
            {unit}
          </span>
          <span className="text-white/30 font-medium">Drag to explore</span>
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
          transition: transform 0.15s ease-in-out, background-color 0.15s ease-in-out;
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
          transition: transform 0.15s ease-in-out, background-color 0.15s ease-in-out;
        }
        input[type="range"]:not(:disabled)::-moz-range-thumb:hover {
          transform: scale(1.25);
          background: #f5f3ff;
        }
      `}</style>
    </div>
  );
}
