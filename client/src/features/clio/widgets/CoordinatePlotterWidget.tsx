"use client";

import React, { useRef } from "react";

import type { CoordinatePlotterConfig } from "../../assessments/widgetConfigSchemas";

interface CoordinatePlotterWidgetProps {
  config: CoordinatePlotterConfig;
  value: { points: { x: number; y: number }[] } | null;
  onChange: (newValue: { points: { x: number; y: number }[] }) => void;
  locked: boolean;
  isCorrect?: boolean | null;
}

export function CoordinatePlotterWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
}: CoordinatePlotterWidgetProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const xMin = config.xRange?.[0] ?? -10;
  const xMax = config.xRange?.[1] ?? 10;
  const yMin = config.yRange?.[0] ?? -10;
  const yMax = config.yRange?.[1] ?? 10;
  const gridStep = config.gridStep ?? 1;
  const tolerance = config.tolerance ?? 0.1;
  const correctPoints = config.correctPoints ?? [];

  const points = value?.points ?? [];

  const width = 400;
  const height = 400;

  // Coordinate conversion
  const toSvgX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
  const toSvgY = (y: number) => ((yMax - y) / (yMax - yMin)) * height;

  const fromSvgX = (svgX: number) => xMin + (svgX / width) * (xMax - xMin);
  const fromSvgY = (svgY: number) => yMax - (svgY / height) * (yMax - yMin);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (locked || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click to Cartesian
    const cartX = fromSvgX((clickX / rect.width) * width);
    const cartY = fromSvgY((clickY / rect.height) * height);

    // Snap to grid
    const snapX = Math.round(cartX / gridStep) * gridStep;
    const snapY = Math.round(cartY / gridStep) * gridStep;

    // Ensure within bounds
    if (snapX < xMin || snapX > xMax || snapY < yMin || snapY > yMax) return;

    // Check if point already exists (within margin)
    const existingIndex = points.findIndex(
      (p) => Math.abs(p.x - snapX) < 0.01 && Math.abs(p.y - snapY) < 0.01
    );

    const newPoints = [...points];
    if (existingIndex > -1) {
      newPoints.splice(existingIndex, 1);
    } else {
      newPoints.push({ x: snapX, y: snapY });
    }

    onChange({ points: newPoints });
  };

  // Generate grid lines
  const gridLines: React.ReactNode[] = [];
  
  // Vertical grid lines
  for (let x = xMin; x <= xMax; x += gridStep) {
    if (Math.abs(x) < 0.001) continue; // Skip axis line
    const svgX = toSvgX(x);
    gridLines.push(
      <line
        key={`v-${x}`}
        x1={svgX}
        y1={0}
        x2={svgX}
        y2={height}
        className="stroke-neutral-200 dark:stroke-zinc-800"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
    );
  }

  // Horizontal grid lines
  for (let y = yMin; y <= yMax; y += gridStep) {
    if (Math.abs(y) < 0.001) continue; // Skip axis line
    const svgY = toSvgY(y);
    gridLines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={svgY}
        x2={width}
        y2={svgY}
        className="stroke-neutral-200 dark:stroke-zinc-800"
        strokeWidth="1"
        strokeDasharray="2,2"
      />
    );
  }

  // Axes coordinates
  const axisX = toSvgX(0);
  const axisY = toSvgY(0);

  return (
    <div className="border-border bg-card flex flex-col items-center justify-center rounded-3xl border p-6 shadow-sm select-none">
      <div className="mb-4 text-center">
        <span className="text-xs text-muted-foreground font-medium">
          {locked ? "Locked" : "Click intersections to plot or remove coordinates"}
        </span>
        <div className="mt-1 flex items-center justify-center gap-4 text-xs font-semibold text-foreground">
          <span>Points plotted: {points.length}</span>
          {locked && isCorrect !== undefined && (
            <span className={isCorrect ? "text-success" : "text-destructive"}>
              {isCorrect ? "Correct!" : "Incorrect"}
            </span>
          )}
        </div>
      </div>

      <div className="relative aspect-square w-full max-w-[360px] rounded-xl overflow-hidden border border-border bg-card shadow-inner">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          onClick={handleSvgClick}
          className={`h-full w-full ${locked ? "cursor-not-allowed" : "cursor-crosshair"}`}
        >
          {/* Grid Lines */}
          {gridLines}

          {/* Axes */}
          {xMin <= 0 && xMax >= 0 && (
            <line
              x1={axisX}
              y1={0}
              x2={axisX}
              y2={height}
              className="stroke-neutral-400 dark:stroke-zinc-600"
              strokeWidth="2"
            />
          )}
          {yMin <= 0 && yMax >= 0 && (
            <line
              x1={0}
              y1={axisY}
              x2={width}
              y2={axisY}
              className="stroke-neutral-400 dark:stroke-zinc-600"
              strokeWidth="2"
            />
          )}

          {/* Axis ticks and labels (simplified, labels every 2 steps or gridStep) */}
          {Array.from({ length: Math.floor((xMax - xMin) / gridStep) + 1 }).map((_, i) => {
            const val = xMin + i * gridStep;
            if (val === 0 || val % 2 !== 0) return null; // Show even numbers to avoid crowding
            const sx = toSvgX(val);
            return (
              <g key={`xtick-${val}`}>
                <line x1={sx} y1={axisY - 4} x2={sx} y2={axisY + 4} className="stroke-neutral-500" strokeWidth="1.5" />
                <text
                  x={sx}
                  y={axisY + 16}
                  fontSize="9"
                  textAnchor="middle"
                  className="fill-neutral-500 dark:fill-zinc-400 font-bold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {Array.from({ length: Math.floor((yMax - yMin) / gridStep) + 1 }).map((_, i) => {
            const val = yMin + i * gridStep;
            if (val === 0 || val % 2 !== 0) return null;
            const sy = toSvgY(val);
            return (
              <g key={`ytick-${val}`}>
                <line x1={axisX - 4} y1={sy} x2={axisX + 4} y2={sy} className="stroke-neutral-500" strokeWidth="1.5" />
                <text
                  x={axisX - 8}
                  y={sy + 3}
                  fontSize="9"
                  textAnchor="end"
                  className="fill-neutral-500 dark:fill-zinc-400 font-bold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Expected/Correct Points overlay (if locked and incorrect) */}
          {locked && isCorrect === false && correctPoints.map((pt, idx) => (
            <g key={`correct-pt-${idx}`}>
              <circle
                cx={toSvgX(pt.x)}
                cy={toSvgY(pt.y)}
                r="10"
                className="fill-none stroke-emerald-500/80"
                strokeWidth="2"
                strokeDasharray="3,3"
              />
              <circle
                cx={toSvgX(pt.x)}
                cy={toSvgY(pt.y)}
                r="3"
                className="fill-emerald-500/80"
              />
            </g>
          ))}

          {/* Student Plotted Points */}
          {points.map((pt, idx) => {
            const sx = toSvgX(pt.x);
            const sy = toSvgY(pt.y);
            
            // If locked, show correctness styling
            let pointClass = "fill-violet-600 stroke-white dark:fill-violet-500";
            if (locked) {
              const matchedCorrect = correctPoints.some(
                (cp) => Math.sqrt(Math.pow(cp.x - pt.x, 2) + Math.pow(cp.y - pt.y, 2)) <= tolerance
              );
              pointClass = matchedCorrect
                ? "fill-emerald-500 stroke-white dark:fill-emerald-600"
                : "fill-rose-500 stroke-white dark:fill-rose-600";
            }

            return (
              <g key={`point-${idx}`}>
                <circle
                  cx={sx}
                  cy={sy}
                  r="7"
                  className={`${pointClass} shadow-md transition-all duration-300`}
                  strokeWidth="2"
                />
                {!locked && (
                  <circle
                    cx={sx}
                    cy={sy}
                    r="12"
                    className="fill-transparent hover:fill-violet-500/10 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ points: points.filter((_, pIdx) => pIdx !== idx) });
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {points.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-[360px]">
          {points.map((pt, idx) => (
            <span
              key={`badge-${idx}`}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground"
            >
              ({pt.x}, {pt.y})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
