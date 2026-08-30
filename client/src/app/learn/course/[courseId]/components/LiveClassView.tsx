"use client";

import { CalendarClock, Radio, User, Video } from "lucide-react";
import React from "react";

import type { ModuleItem } from "@/features/catalog/catalogApi";
import { useGetMySessionForItemQuery } from "@/features/catalog/catalogApi";

interface LiveClassViewProps {
  item: ModuleItem;
}

// The item is one curriculum slot shared by every cohort that bought the
// course, so there is nothing to render from the item alone — the meeting is
// resolved per-student from their batch. Each "no session" case gets its own
// message because they need different actions from the learner: wait, contact
// support, or nothing at all.
export function LiveClassView({ item }: LiveClassViewProps) {
  const { data, isLoading } = useGetMySessionForItemQuery(item.id);

  if (isLoading) {
    return <p className="p-8 text-sm text-muted-foreground">Loading session...</p>;
  }

  const session = data?.session ?? null;

  if (!session) {
    const message =
      data?.reason === "NOT_IN_A_BATCH"
        ? "You're not enrolled in a batch for this course yet, so there's no session to join. If you've already paid, contact support."
        : data?.reason === "NOT_A_STUDENT"
          ? "Live sessions are shown on a student's account. Switch to a child profile to see their session."
          : "Your batch hasn't scheduled this session yet. It'll appear here once your teacher sets a time.";

    return (
      <div className="mx-auto max-w-xl p-8">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          Live Class
        </p>
        <h2 className="mb-2 text-xl font-bold text-foreground">{item.title}</h2>
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5">
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }

  const isCancelled = session.status === "CANCELLED";
  const isLive = session.status === "LIVE";
  const isOver = session.status === "ENDED";
  /**
   * A pasted link works from the moment it is saved, so it opens as soon as
   * the session is scheduled. Gating it behind the teacher pressing "start"
   * would mean a child cannot get into a class their family paid for because
   * an adult forgot a button — and joining early just means waiting in an
   * empty room, which is what happens with a real class too.
   *
   * A meeting this system creates is different: it does not exist until the
   * session starts, so ZOOM stays gated on LIVE.
   */
  const isExternal = session.provider === "EXTERNAL";
  const canJoin =
    !!session.joinUrl && !isCancelled && !isOver && (isLive || isExternal);

  const when = session.startTime
    ? new Date(session.startTime).toLocaleString([], {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(session.date).toLocaleDateString();

  return (
    <div className="mx-auto max-w-xl p-8">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
        <Radio className="h-3 w-3" />
        Live Class
        {isLive && (
          <span className="ml-1 animate-pulse rounded-full bg-destructive px-2 py-0.5 text-[9px] text-white">
            LIVE NOW
          </span>
        )}
      </p>
      <h2 className="mb-2 text-xl font-bold text-foreground">
        {session.topic ?? item.title}
      </h2>

      <div className="mb-6 space-y-2.5 rounded-2xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {when}
          {session.endTime && (
            <>
              {" – "}
              {new Date(session.endTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
        </div>
        {session.teacher && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {session.teacher.firstName} {session.teacher.lastName}
          </div>
        )}
        {session.batch && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5" />
            {session.batch.name} ({session.batch.code})
          </div>
        )}
      </div>

      {isCancelled ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
          This session was cancelled. Your teacher will schedule a replacement.
        </p>
      ) : isOver ? (
        <p className="text-xs text-muted-foreground">
          This session has ended.
        </p>
      ) : canJoin ? (
        <a
          href={session.joinUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Video className="h-4 w-4" /> Join now
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">
          {session.provider === "NONE"
            ? "No meeting link has been attached to this session yet."
            : "The join link opens when your teacher starts the session."}
        </p>
      )}
    </div>
  );
}
