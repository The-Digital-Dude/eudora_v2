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

/** Wedge geometry, shared by the drawn path and the button that sits over it. */
const RADIUS = 46;
const wedgeAngles = (index: number, regions: number) => ({
  start: ((index * 360) / regions - 90) * (Math.PI / 180),
  end: (((index + 1) * 360) / regions - 90) * (Math.PI / 180),
});

function wedgePath(index: number, regions: number): string {
  const { start, end } = wedgeAngles(index, regions);
  const p = (a: number) => `${50 + RADIUS * Math.cos(a)},${50 + RADIUS * Math.sin(a)}`;
  // regions >= 3 is enforced by the config schema, so a wedge is never a
  // reflex angle and the large-arc flag is always 0.
  return `M50,50 L${p(start)} A${RADIUS},${RADIUS} 0 0,1 ${p(end)} Z`;
}

/**
 * The same wedge as a `clip-path`, which has no arc primitive, so the curved
 * edge is sampled into short straight segments. Eight is past the point where
 * the difference from the drawn arc is visible at this size.
 */
function wedgeClipPath(index: number, regions: number): string {
  const { start, end } = wedgeAngles(index, regions);
  const steps = 8;
  const points = ["50% 50%"];
  for (let s = 0; s <= steps; s++) {
    const a = start + ((end - start) * s) / steps;
    points.push(`${50 + RADIUS * Math.cos(a)}% ${50 + RADIUS * Math.sin(a)}%`);
  }
  return `polygon(${points.join(", ")})`;
}

export function ShapeShadingWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
}: ShapeShadingWidgetProps) {
  const regions = config.shape.regions;
  const shaded = React.useMemo(() => new Set(value?.shadedRegionIds ?? []), [value]);
  /** Which wedge holds keyboard focus, so its own outline can thicken. */
  const [focusedRegion, setFocusedRegion] = React.useState<number | null>(null);

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
        /*
         * The wedges are drawn in SVG but operated by real HTML buttons laid
         * over them, each clipped to its own wedge.
         *
         * A `<path>` with `tabIndex` looks focusable and is not: Chrome will
         * set it as `document.activeElement`, but the element never matches
         * `:focus` and never fires a focus event, so no CSS focus style can
         * apply and no key handler on it can run. Written that way the circle
         * was unusable by keyboard. A button is genuinely focusable, and it
         * lets the focus ring be replaced by thickening the wedge's own
         * outline, so the highlight traces the shape being selected instead of
         * boxing it.
         */
        <div
          className="relative h-56 w-56"
          role="group"
          aria-label={`Circle divided into ${regions} equal parts`}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
            {Array.from({ length: regions }).map((_, i) => (
              <path
                key={i}
                d={wedgePath(i, regions)}
                strokeWidth={focusedRegion === i ? 4 : 1.5}
                className={`${fillFor(i)} transition-colors`}
              />
            ))}
          </svg>

          {Array.from({ length: regions }).map((_, i) => (
            <button
              key={i}
              type="button"
              disabled={locked}
              aria-pressed={shaded.has(regionId(i))}
              aria-label={`Part ${i + 1} of ${regions}`}
              onClick={() => toggle(i)}
              onFocus={() => setFocusedRegion(i)}
              onBlur={() => setFocusedRegion((cur) => (cur === i ? null : cur))}
              style={{ clipPath: wedgeClipPath(i, regions) }}
              className={`absolute inset-0 outline-none ${
                locked ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            />
          ))}
        </div>
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
