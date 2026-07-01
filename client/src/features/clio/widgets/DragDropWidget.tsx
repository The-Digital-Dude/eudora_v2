"use client";

import React, { useState } from "react";

export interface DragDropConfig {
  labels: string[];
  targets: Array<{ id: string; placeholder: string; label?: string } | string>;
}

interface DragDropWidgetProps {
  config: DragDropConfig;
  placements: Record<string, string>; // targetId -> label
  onChange: (placements: Record<string, string>) => void;
  locked: boolean;
}

export function DragDropWidget({ config, placements, onChange, locked }: DragDropWidgetProps) {
  const { labels = [], targets = [] } = config;

  // Normalized targets: array of { id, placeholder }
  const normalizedTargets = targets.map((t, idx) => {
    if (typeof t === "string") {
      return { id: `target-${idx}`, placeholder: t };
    }
    return {
      id: t.id ?? `target-${idx}`,
      placeholder: t.placeholder ?? t.label ?? "",
    };
  });

  // Track the currently active/selected label for click-to-place mobile UX
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [draggedLabel, setDraggedLabel] = useState<string | null>(null);
  const [activeTargetOver, setActiveTargetOver] = useState<string | null>(null);

  // Labels that are not yet placed on any target
  const placedLabels = Object.values(placements);
  const availableLabels = labels.filter((lbl) => !placedLabels.includes(lbl));

  // --- Click to Place Interaction (Mobile & Desktop) ---
  const handleLabelClick = (label: string) => {
    if (locked) return;
    if (selectedLabel === label) {
      setSelectedLabel(null);
    } else {
      setSelectedLabel(label);
    }
  };

  const handleTargetClick = (targetId: string) => {
    if (locked) return;

    // If there is an existing label in this slot, return it to the pool
    if (placements[targetId]) {
      const newPlacements = { ...placements };
      delete newPlacements[targetId];
      onChange(newPlacements);
      setSelectedLabel(null);
      return;
    }

    // If a label is selected, place it here
    if (selectedLabel) {
      const newPlacements = { ...placements, [targetId]: selectedLabel };
      onChange(newPlacements);
      setSelectedLabel(null);
    }
  };

  // --- HTML5 Drag and Drop Interaction ---
  const handleDragStart = (e: React.DragEvent, label: string) => {
    if (locked) {
      e.preventDefault();
      return;
    }
    setDraggedLabel(label);
    e.dataTransfer.setData("text/plain", label);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedLabel(null);
    setActiveTargetOver(null);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    if (locked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeTargetOver !== targetId) {
      setActiveTargetOver(targetId);
    }
  };

  const handleDragLeave = () => {
    setActiveTargetOver(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (locked) return;
    e.preventDefault();
    const label = e.dataTransfer.getData("text/plain") || draggedLabel;
    if (label) {
      // Clean up previous placements of this label if it was already placed somewhere else
      const newPlacements = { ...placements };
      Object.keys(newPlacements).forEach((key) => {
        if (newPlacements[key] === label) {
          delete newPlacements[key];
        }
      });
      newPlacements[targetId] = label;
      onChange(newPlacements);
    }
    setActiveTargetOver(null);
    setDraggedLabel(null);
  };

  return (
    <div className="border-border bg-card flex flex-col gap-6 rounded-2xl border p-6 transition-all duration-300 select-none">
      {/* Target slots grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {normalizedTargets.map((target) => {
          const placedLabel = placements[target.id];
          const isOver = activeTargetOver === target.id;

          return (
            <div
              key={target.id}
              onClick={() => handleTargetClick(target.id)}
              onDragOver={(e) => handleDragOver(e, target.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, target.id)}
              className={[
                "flex min-h-[64px] items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200",
                placedLabel
                  ? "cursor-pointer border-primary/35 bg-primary/5"
                  : "border-border bg-muted/20 hover:bg-muted/40 border-dashed hover:border-primary/40",
                isOver ? "scale-[1.01] border-primary bg-primary/10" : "",
                locked ? "cursor-not-allowed opacity-80" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="text-muted-foreground text-xs font-semibold">
                {target.placeholder}
              </span>

              {placedLabel ? (
                <div
                  className={[
                    "flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/10 transition-colors hover:bg-primary",
                    locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  draggable={!locked}
                  onDragStart={(e) => handleDragStart(e, placedLabel)}
                  onDragEnd={handleDragEnd}
                >
                  <span>{placedLabel}</span>
                  {!locked && (
                    <span className="ml-1 text-[9px] font-bold text-white/60 hover:text-white">
                      ✕
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground/30 text-[10px] font-bold tracking-wider uppercase">
                  Drop Here
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Available items bank */}
      {availableLabels.length > 0 && (
        <div className="border-border border-t pt-5">
          <p className="text-muted-foreground mb-3 text-xs font-semibold">
            {selectedLabel ? "Tap a slot above to place" : "Drag or tap items below to match"}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableLabels.map((label) => {
              const isSelected = selectedLabel === label;

              return (
                <button
                  key={label}
                  disabled={locked}
                  draggable={!locked}
                  onDragStart={(e) => handleDragStart(e, label)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleLabelClick(label)}
                  className={[
                    "rounded-lg px-3 py-2 text-xs font-bold shadow-sm transition-all duration-200",
                    isSelected
                      ? "scale-[1.05] border border-primary bg-primary text-primary-foreground ring-2 ring-primary/50"
                      : "bg-muted hover:bg-muted/80 text-foreground border-border border",
                    locked ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
