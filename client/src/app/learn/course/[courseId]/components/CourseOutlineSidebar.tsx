"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  FileText,
  Lock,
  MessageSquare,
  PencilLine,
  PlayCircle,
  Radio,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

import type { CourseDetail, ModuleItem, ModuleItemKind } from "@/features/catalog/catalogApi";
import { TodaysGoals } from "@/features/gamification/TodaysGoals";

const kindIcon: Record<ModuleItemKind, React.ElementType> = {
  VIDEO: PlayCircle,
  READING: FileText,
  DISCUSSION: MessageSquare,
  ASSESSMENT: ClipboardList,
  LIVE_CLASS: Radio,
  HOMEWORK: PencilLine,
};

interface CourseOutlineSidebarProps {
  course: CourseDetail;
  selectedItemId: string | null;
  onSelectItem: (item: ModuleItem) => void;
  onClose?: () => void;
}

export function CourseOutlineSidebar({
  course,
  selectedItemId,
  onSelectItem,
  onClose,
}: CourseOutlineSidebarProps) {
  const [expandedConceptId, setExpandedConceptId] = useState<string | null>(
    course.concepts[0]?.id ?? null,
  );

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h1 className="text-sm font-bold text-foreground">{course.title}</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <TodaysGoals />
      </div>

      <div className="flex-1 space-y-1 px-2 pb-4">
        {course.concepts.map((concept, idx) => {
          const isExpanded = expandedConceptId === concept.id;
          return (
            <div key={concept.id} className="rounded-xl">
              <button
                onClick={() =>
                  setExpandedConceptId(isExpanded ? null : concept.id)
                }
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Module {idx + 1}
                  </p>
                  <p className="truncate text-xs font-bold text-foreground">
                    {concept.name}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-2 space-y-0.5 border-l border-border pl-2">
                  {concept.items.map((item) => {
                    const Icon = kindIcon[item.kind];
                    const isSelected = item.id === selectedItemId;
                    // Two unrelated reasons an item can be unavailable, and
                    // they need different affordances: a progression lock
                    // clears by finishing earlier work, an entitlement lock
                    // only clears by enrolling.
                    const progressionLocked = concept.isLocked;
                    const locked = progressionLocked || item.isContentLocked;

                    return (
                      <button
                        key={item.id}
                        onClick={() => !locked && onSelectItem(item)}
                        disabled={locked}
                        title={
                          item.isContentLocked && !progressionLocked
                            ? "Enrol to unlock this content"
                            : undefined
                        }
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : locked
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-muted/50"
                        }`}
                      >
                        {item.isDone ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        ) : locked ? (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                        )}
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                          {item.title}
                        </span>
                        {item.isFreePreview && !course.isEntitled && (
                          <span className="shrink-0 rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">
                            FREE
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {concept.lessons.map((lesson) =>
                    course.isEntitled ? (
                    <Link
                      key={lesson.id}
                      href={`/learn/${lesson.id}`}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/50"
                    >
                      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                        {lesson.title}
                      </span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        Practice
                      </span>
                    </Link>
                    ) : (
                      // Rendered as a disabled row rather than hidden: the
                      // learner should see what enrolling would buy them.
                      <div
                        key={lesson.id}
                        title="Enrol to unlock this content"
                        className="flex w-full cursor-not-allowed items-center gap-2 rounded-lg px-2 py-2 text-left opacity-50"
                      >
                        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                          {lesson.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                          Practice
                        </span>
                      </div>
                    ),
                  )}

                  {concept.items.length === 0 && concept.lessons.length === 0 && (
                    <p className="px-2 py-2 text-[10px] text-muted-foreground">
                      No items yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
