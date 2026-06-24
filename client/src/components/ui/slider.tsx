"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SliderProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
};

/**
 * Minimal themed range slider built on a native input — no extra dependency.
 * Uses `accent-primary` so the filled track follows the active theme color.
 */
export function Slider({ value, onValueChange, className, ...props }: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn(
        "accent-primary bg-muted h-1.5 w-full cursor-pointer appearance-none rounded-full",
        className,
      )}
      {...props}
    />
  );
}
