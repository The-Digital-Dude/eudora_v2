"use client";

import React from "react";

/**
 * Label, value, then one line saying what the value means.
 *
 * The footer is not decoration: "38 / 50" and "4" tell an operator nothing
 * about whether they need to act today, and the line underneath is where that
 * lives.
 *
 * The value uses the font's default proportional figures. `tabular-nums` gives
 * every digit the width of a zero, which reads loose at this size and is only
 * worth it in a column of numbers that has to align vertically.
 */
export function StatTile({
  label,
  value,
  footer,
  className = "",
}: {
  /** Sentence case, no trailing colon. */
  label: string;
  value: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-border bg-card rounded-2xl border p-4 ${className}`}>
      <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1.5 text-2xl font-semibold">{value}</p>
      {footer && (
        <p className="text-muted-foreground mt-1 flex items-center text-[11px]">{footer}</p>
      )}
    </div>
  );
}
