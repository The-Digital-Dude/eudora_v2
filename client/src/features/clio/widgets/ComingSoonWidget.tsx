"use client";

import React from "react";

interface ComingSoonWidgetProps {
  widgetType: string;
}

export function ComingSoonWidget({ widgetType }: ComingSoonWidgetProps) {
  const formattedType = widgetType
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border-2 p-8 text-center transition-all duration-300">
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 animate-ping rounded-full bg-violet-400" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 rounded-full bg-violet-500" />
      </div>
      <h3 className="text-foreground mb-1 text-base font-semibold">{formattedType}</h3>
      <p className="text-muted-foreground max-w-xs text-xs leading-relaxed font-normal">
        We are building a premium interactive experience for this question. This widget will be
        available soon!
      </p>
    </div>
  );
}
