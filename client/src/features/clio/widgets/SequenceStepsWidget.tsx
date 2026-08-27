"use client";

import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import React from "react";

/**
 * Put sentence-length steps into the right order.
 *
 * Deliberately not `DragDropWidget`: that one drops short pills into fixed
 * slots, which falls apart the moment a "label" is a whole sentence of
 * reasoning. This reorders full-width rows in place.
 *
 * Three ways to move a row, because one is never enough for this age group:
 * native drag (mouse), tap-to-select then tap-a-target (touch, where dragging
 * is genuinely unreliable for a six-year-old), and up/down buttons (keyboard
 * and anyone who finds both fiddly). No dnd-kit — the codebase already does
 * HTML5 drag plus click-to-place in `DragDropWidget`, and matching it keeps one
 * pattern instead of two.
 *
 * Demo-only by decision (2026-08-27, widget-matrix repair plan). No
 * `SEQUENCE_STEPS` `WidgetType` exists in the Prisma enum, and none of the
 * config schema / generator / grader stack that a real question type needs
 * has been built for it — that's a full new type, not a small addition, and
 * nothing has asked for step-ordering as a graded question yet. Add the full
 * stack when a lesson actually needs it; until then this stays a component
 * used only by the marketing-page widget playground.
 */
export interface SequenceStepsConfig {
  /** In the order they should be shown, which is not the answer order. */
  steps: { id: string; text: string }[];
}

interface SequenceStepsWidgetProps {
  config: SequenceStepsConfig;
  /** Current ordering of step ids. Null means "as given in config". */
  value: string[] | null;
  onChange: (order: string[]) => void;
  locked: boolean;
  isCorrect?: boolean | null;
  /**
   * Only pass this after an incorrect submission — same rule as SliderWidget's
   * `correctValue`. It drives the per-row marking and the reveal.
   */
  correctOrder?: string[];
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function SequenceStepsWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
  correctOrder,
}: SequenceStepsWidgetProps) {
  const order = value ?? config.steps.map((s) => s.id);
  const textById = React.useMemo(
    () => new Map(config.steps.map((s) => [s.id, s.text])),
    [config.steps],
  );

  const [selected, setSelected] = React.useState<string | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  const reorder = (from: number, to: number) => {
    if (locked || from === to) return;
    onChange(move(order, from, to));
  };

  // Tap one row, then tap where it should go.
  const handleRowClick = (id: string) => {
    if (locked) return;
    if (selected === null) {
      setSelected(id);
      return;
    }
    if (selected === id) {
      setSelected(null);
      return;
    }
    reorder(order.indexOf(selected), order.indexOf(id));
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-2 select-none">
      {order.map((id, index) => {
        const isSelected = selected === id;
        const isOver = overId === id && draggingId !== id;
        // Per-row marking only exists once the answer has been revealed.
        const rowCorrect = locked && correctOrder ? correctOrder[index] === id : null;

        return (
          <div
            key={id}
            draggable={!locked}
            onDragStart={() => setDraggingId(id)}
            onDragEnd={() => {
              setDraggingId(null);
              setOverId(null);
            }}
            onDragOver={(e) => {
              if (locked || !draggingId) return;
              e.preventDefault();
              if (overId !== id) setOverId(id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (locked || !draggingId) return;
              reorder(order.indexOf(draggingId), index);
              setDraggingId(null);
              setOverId(null);
            }}
            onClick={() => handleRowClick(id)}
            className={[
              "flex items-center gap-3 rounded-2xl border-2 p-3 transition-all duration-150",
              locked ? "cursor-not-allowed" : "cursor-pointer",
              draggingId === id ? "opacity-40" : "",
              isOver ? "border-primary bg-primary/10" : "",
              isSelected && !isOver ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "",
              !isOver && !isSelected && rowCorrect === null ? "border-border bg-card" : "",
              rowCorrect === true ? "border-success bg-success/10" : "",
              rowCorrect === false ? "border-destructive bg-destructive/10" : "",
              !locked && !isSelected && !isOver ? "hover:border-primary/50 hover:bg-muted/40" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {!locked && (
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}

            <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold">
              {index + 1}
            </span>

            <span className="min-w-0 flex-1 text-left text-xs leading-relaxed font-medium text-foreground">
              {textById.get(id)}
            </span>

            {!locked && (
              <span className="flex shrink-0 flex-col">
                <button
                  type="button"
                  aria-label={`Move step ${index + 1} up`}
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorder(index, index - 1);
                  }}
                  className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Move step ${index + 1} down`}
                  disabled={index === order.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorder(index, index + 1);
                  }}
                  className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>
        );
      })}

      {!locked && (
        <p className="mt-1 text-center text-[10px] font-medium text-muted-foreground">
          Drag a step, or tap one and then tap where it should go.
        </p>
      )}

      {locked && isCorrect === false && correctOrder && (
        <div className="mt-2 rounded-2xl border border-success/25 bg-success/[0.07] p-3">
          <p className="text-[10px] font-bold tracking-widest text-success uppercase">
            The right order
          </p>
          <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-xs text-foreground">
            {correctOrder.map((id) => (
              <li key={id}>{textById.get(id)}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
