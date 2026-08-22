import * as React from "react";

/**
 * A shape split into equal parts, some of them shaded — the thing a percentage
 * question is actually asking about.
 *
 * Drawn rather than fetched: the demo is static by design (see demo-lesson.ts),
 * and a percentage is only legible to a child if they can count the parts, so
 * the figure has to be crisp at any size. Plain SVG rects keep it that way.
 */
export function ShapeFigure({
  total,
  shaded,
  columns,
}: {
  total: number;
  shaded: number;
  /** How many cells per row — controls whether it reads as a bar or a block. */
  columns: number;
}) {
  const rows = Math.ceil(total / columns);
  const cell = 40;
  const gap = 4;
  const width = columns * cell + (columns - 1) * gap;
  const height = rows * cell + (rows - 1) * gap;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-[320px]"
      role="img"
      aria-label={`A shape divided into ${total} equal parts, with ${shaded} of them shaded`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const row = Math.floor(i / columns);
        const column = i % columns;
        const isShaded = i < shaded;
        return (
          <rect
            key={i}
            x={column * (cell + gap)}
            y={row * (cell + gap)}
            width={cell}
            height={cell}
            rx={6}
            className={
              isShaded
                ? "fill-primary/80 stroke-primary"
                : "fill-muted stroke-border"
            }
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}
