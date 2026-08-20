"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import React from "react";

export interface AttentionItem {
  /** Non-zero means it needs doing. Zero items are dropped, not greyed out. */
  count: number;
  /** Reads as a sentence with the count in front: "12 students not marked today". */
  label: (count: number) => string;
  href: string;
  /** Where the count is a backlog rather than today's work. */
  severity?: "warning" | "info";
}

/**
 * The one thing an operator running this alone actually needs on opening the
 * app: what is waiting for them, and where to go to clear it.
 *
 * Everything here is a real count from a real endpoint, and every row is a
 * link to the page that resolves it. Items at zero are removed rather than
 * shown as "0" — a list of zeroes is noise that hides the row that matters.
 */
export function AttentionQueue({ items }: { items: AttentionItem[] }) {
  const waiting = items.filter((item) => item.count > 0);

  if (waiting.length === 0) {
    return (
      <div className="border-border bg-card flex items-center gap-2.5 rounded-2xl border px-5 py-4">
        <CheckCircle2 className="text-success h-4 w-4 shrink-0" />
        <p className="text-foreground text-xs font-semibold">
          Nothing waiting.{" "}
          <span className="text-muted-foreground font-normal">
            Attendance is marked, submissions are graded, and no applications are open.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-2xl border">
      {waiting.map((item) => (
        <Link
          key={item.href + item.label(item.count)}
          href={item.href}
          className="hover:bg-muted/40 group flex items-center gap-3 px-5 py-3.5 transition-colors"
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              item.severity === "info" ? "bg-primary" : "bg-warning"
            }`}
          />
          <span className="text-foreground min-w-0 flex-1 truncate text-xs font-semibold">
            {item.label(item.count)}
          </span>
          <ArrowRight className="text-muted-foreground group-hover:text-foreground h-3.5 w-3.5 shrink-0 transition-colors" />
        </Link>
      ))}
    </div>
  );
}
