"use client";

import React from "react";

/**
 * Shade N of a shape's equal parts.
 *
 * Built to the contract the server already grades: `SHAPE_SHADING` has a config
 * schema, a generator and a full grader in `services/api-service/src/common/
 * widgets/` — including the contiguity rules below — but no client widget ever
 * existed, so a learner reaching one of these questions got the "coming soon"
 * placeholder. Region ids are `region-<0-based index>` because that is exactly
 * what `widget-grader.ts` parses out of `interactionState.shadedRegionIds`.
 *
 * Not yet listed in `WidgetSelector` — wiring it there is a one-line change and
 * belongs with the rest of that work, not with this marketing-page preview.
 */
export interface ShapeShadingDisplayConfig {
  shape: { kind: "bar" | "polygon"; regions: number };
  targetNumerator: number;
  /** Wedges/segments must touch. Polygons wrap, bars don't. */
  requireContiguous?: boolean;
}

interface ShapeShadingWidgetProps {
  config: ShapeShadingDisplayConfig;
  value: { shadedRegionIds: string[] } | null;
  onChange: (newValue: { shadedRegionIds: string[] }) => void;
  locked: boolean;
  isCorrect?: boolean | null;
}

const regionId = (index: number) => `region-${index}`;

export function ShapeShadingWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
}: ShapeShadingWidgetProps) {
  const regions = config.shape.regions;
  const shaded = React.useMemo(() => new Set(value?.shadedRegionIds ?? []), [value]);

  const toggle = (index: number) => {
    if (locked) return;
    const id = regionId(index);
    const next = new Set(shaded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Sorted by index so the submitted array is stable and readable in logs;
    // the grader sorts anyway, but an arbitrary click order is nobody's friend.
    const ordered = Array.from({ length: regions }, (_, i) => regionId(i)).filter((r) =>
      next.has(r),
    );
    onChange({ shadedRegionIds: ordered });
  };

  const fillFor = (index: number) => {
    const isShaded = shaded.has(regionId(index));
    if (!isShaded) return "fill-muted stroke-border";
    if (!locked) return "fill-primary/80 stroke-primary";
    return isCorrect ? "fill-success/80 stroke-success" : "fill-destructive/70 stroke-destructive";
  };

  return (
    <div className="border-border bg-card flex flex-col items-center gap-4 rounded-3xl border p-6 shadow-sm select-none">
      <p className="text-xs font-medium text-muted-foreground">
        {locked ? "Locked" : "Tap the parts you want to shade"}
      </p>

      {config.shape.kind === "bar" ? (
        <div
          className="flex w-full max-w-[360px] gap-1.5"
          role="group"
          aria-label={`Bar divided into ${regions} equal parts`}
        >
          {Array.from({ length: regions }).map((_, i) => {
            const isShaded = shaded.has(regionId(i));
            return (
              <button
                key={i}
                type="button"
                disabled={locked}
                aria-pressed={isShaded}
                aria-label={`Part ${i + 1} of ${regions}`}
                onClick={() => toggle(i)}
                className={`h-16 flex-1 rounded-lg border-2 transition-all ${
                  locked ? "cursor-not-allowed" : "cursor-pointer hover:scale-[1.03]"
                } ${
                  !isShaded
                    ? "border-border bg-muted"
                    : !locked
                      ? "border-primary bg-primary/80"
                      : isCorrect
                        ? "border-success bg-success/80"
                        : "border-destructive bg-destructive/70"
                }`}
              />
            );
          })}
        </div>
      ) : (
        <svg
          viewBox="0 0 100 100"
          className="h-56 w-56"
          role="group"
          aria-label={`Circle divided into ${regions} equal parts`}
        >
          {Array.from({ length: regions }).map((_, i) => {
            const start = (i * 360) / regions - 90;
            const end = ((i + 1) * 360) / regions - 90;
            const rad = (deg: number) => (deg * Math.PI) / 180;
            const r = 46;
            const x1 = 50 + r * Math.cos(rad(start));
            const y1 = 50 + r * Math.sin(rad(start));
            const x2 = 50 + r * Math.cos(rad(end));
            const y2 = 50 + r * Math.sin(rad(end));
            // regions >= 3 is enforced by the config schema, so a wedge is
            // never a reflex angle and the large-arc flag is always 0.
            const isShaded = shaded.has(regionId(i));
            return (
              <path
                key={i}
                d={`M50,50 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
                strokeWidth={1.5}
                className={`${fillFor(i)} ${locked ? "cursor-not-allowed" : "cursor-pointer"} transition-colors`}
                role="button"
                tabIndex={locked ? -1 : 0}
                aria-pressed={isShaded}
                aria-label={`Part ${i + 1} of ${regions}`}
                onClick={() => toggle(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(i);
                  }
                }}
              />
            );
          })}
        </svg>
      )}

      <div className="flex items-center gap-3 text-xs font-semibold">
        <span className="text-foreground">
          {shaded.size} of {regions} shaded
        </span>
        {locked && isCorrect !== undefined && isCorrect !== null && (
          <span className={isCorrect ? "text-success" : "text-destructive"}>
            {isCorrect ? "Correct!" : "Not quite"}
          </span>
        )}
      </div>

      {config.requireContiguous && !locked && (
        <p className="text-[10px] font-medium text-muted-foreground">
          The parts you shade have to touch each other.
        </p>
      )}
    </div>
  );
}
