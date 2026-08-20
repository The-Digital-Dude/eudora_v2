"use client";

import { BookOpen, LineChart, UserPlus } from "lucide-react";
import React from "react";

import { AddChildForm } from "@/components/add-child-form";

/**
 * What a guardian sees the moment they finish signing up, before there is any
 * child to show.
 *
 * This is the whole panel at that moment, so it does the job onboarding used to
 * do on a separate page: say where they have landed, say what happens next, and
 * put the one action that moves them forward directly on screen rather than
 * behind a link. The three notes are there because "add a child" is a strange
 * request until you know what it buys you.
 */
export function ParentWelcome({ firstName }: { firstName?: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 space-y-1.5 text-center">
        <h1 className="font-display text-foreground text-2xl font-bold tracking-tight">
          {firstName ? `Welcome, ${firstName}` : "Welcome to your family portal"}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm">
          One place for everything your children are learning. Start by telling
          us who you are setting this up for.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_260px] md:items-start">
        <div className="border-border bg-card rounded-3xl border p-6 md:p-8">
          <div className="mb-5 flex items-center gap-2">
            <UserPlus className="text-muted-foreground h-4 w-4" />
            <h2 className="text-foreground text-sm font-bold tracking-tight">Add your first child</h2>
          </div>
          <AddChildForm submitLabel="Add child and continue" />
        </div>

        <ul className="space-y-4">
          <Note
            Icon={BookOpen}
            title="Pick their courses"
            body="Choose what they work on, or follow what we recommend for their year."
          />
          <Note
            Icon={LineChart}
            title="Follow their progress"
            body="Attendance, homework and marks, without having to ask anyone."
          />
          <Note
            Icon={UserPlus}
            title="Add the rest later"
            body="More children can be added any time, and you can switch between them."
          />
        </ul>
      </div>
    </div>
  );
}

function Note({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-foreground text-xs font-semibold">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">{body}</p>
      </div>
    </li>
  );
}
