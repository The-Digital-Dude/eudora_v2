"use client";

import { ArrowRight, BookHeadphones, Headphones, Loader2 } from "lucide-react";
import Link from "next/link";
import React from "react";

import { useGetStoryLibraryQuery } from "@/features/stories/storiesApi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Story Library — every published story, free to any signed-in child.
 *
 * The sibling of the Lesson Library, and the only content surface that does not
 * depend on owning a course: a family with no purchase at all still has
 * something to read here. Stories bought inside a course are read in the course
 * player instead, so they are reached two ways and listed once.
 */
export default function StoryLibraryPage() {
  const { data: stories, isLoading, error } = useGetStoryLibraryQuery();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <BookHeadphones className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Story Library</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Narrated stories you can read along with — and ask questions about as you go.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-xs font-semibold">Opening the bookshelf...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-destructive">Failed to load the story library.</p>
          <p className="text-muted-foreground mt-1 text-xs">Please try again in a moment.</p>
        </div>
      ) : !stories || stories.length === 0 ? (
        <div className="border-border bg-muted/40 rounded-2xl border p-12 text-center">
          <BookHeadphones className="text-muted-foreground/30 mx-auto mb-3 h-10 w-10" />
          <p className="text-foreground/80 text-sm font-bold">No stories published yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            New stories appear here once they have been narrated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((story) => (
            <Link
              key={story.id}
              href={`/story-library/${story.id}`}
              className="group border-border bg-card hover:bg-muted/30 relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
            >
              {story.coverUrl ? (
                // Covers are API-served behind a session cookie, which the
                // next/image optimizer cannot forward.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${API_URL}${story.coverUrl}`}
                  alt=""
                  className="h-40 w-full bg-muted object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-primary/5">
                  <BookHeadphones className="h-10 w-10 text-primary/30" />
                </div>
              )}

              <div className="flex flex-1 flex-col justify-between p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {story.gradeBand ? (
                      <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                        {story.gradeBand}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                      <Headphones className="h-3 w-3" />
                      {story.pageCount} {story.pageCount === 1 ? "part" : "parts"}
                    </span>
                  </div>

                  <h3 className="text-card-foreground text-base font-bold transition-colors group-hover:text-primary">
                    {story.title}
                  </h3>
                  {story.synopsis ? (
                    <p className="text-muted-foreground text-xs leading-relaxed font-medium">
                      {story.synopsis}
                    </p>
                  ) : null}
                </div>

                <div className="border-border/60 mt-6 flex items-center justify-end border-t pt-4">
                  <span className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors group-hover:bg-primary/90">
                    Read <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
