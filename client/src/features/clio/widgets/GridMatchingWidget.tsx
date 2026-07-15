"use client";

import React, { useState } from "react";

import type { GridMatchingConfig } from "../../assessments/widgetConfigSchemas";

interface GridMatchingWidgetProps {
  config: GridMatchingConfig;
  value: { pairs: [string, string][] } | null;
  onChange: (newValue: { pairs: [string, string][] }) => void;
  locked: boolean;
  isCorrect?: boolean | null;
}

export function GridMatchingWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
}: GridMatchingWidgetProps) {
  const leftItems = config.left ?? [];
  const rightItems = config.right ?? [];
  const correctPairs = config.correctPairs ?? [];

  const pairs = React.useMemo(() => value?.pairs ?? [], [value]);

  // Currently selected left item for click-to-match UX
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [draggedLeftId, setDraggedLeftId] = useState<string | null>(null);
  const [activeTargetOver, setActiveTargetOver] = useState<string | null>(null);

  // Get matching map: leftId -> rightId and rightId -> leftId
  const rightToLeftMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    pairs.forEach(([leftId, rightId]) => {
      map[rightId] = leftId;
    });
    return map;
  }, [pairs]);

  const matchedLeftIds = React.useMemo(() => {
    return new Set(pairs.map(([leftId]) => leftId));
  }, [pairs]);

  // Left items that are still available to be matched
  const availableLeftItems = leftItems.filter((item) => !matchedLeftIds.has(item.id));

  // --- Click to Pair UX ---
  const handleLeftClick = (id: string) => {
    if (locked) return;
    setSelectedLeftId(selectedLeftId === id ? null : id);
  };

  const handleRightSlotClick = (rightId: string) => {
    if (locked) return;

    const currentMatchedLeftId = rightToLeftMap[rightId];

    // If already matched, remove it
    if (currentMatchedLeftId) {
      const newPairs = pairs.filter(([_, rId]) => rId !== rightId);
      onChange({ pairs: newPairs });
      setSelectedLeftId(null);
      return;
    }

    // If we have a selected left item, pair them
    if (selectedLeftId) {
      const newPairs = [...pairs.filter(([lId]) => lId !== selectedLeftId), [selectedLeftId, rightId] as [string, string]];
      onChange({ pairs: newPairs });
      setSelectedLeftId(null);
    }
  };

  // --- HTML5 Drag and Drop UX ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (locked) {
      e.preventDefault();
      return;
    }
    setDraggedLeftId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedLeftId(null);
    setActiveTargetOver(null);
  };

  const handleDragOver = (e: React.DragEvent, rightId: string) => {
    if (locked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeTargetOver !== rightId) {
      setActiveTargetOver(rightId);
    }
  };

  const handleDragLeave = () => {
    setActiveTargetOver(null);
  };

  const handleDrop = (e: React.DragEvent, rightId: string) => {
    if (locked) return;
    e.preventDefault();
    const leftId = e.dataTransfer.getData("text/plain") || draggedLeftId;
    if (leftId) {
      // Remove any existing pair for this leftId or rightId
      const cleanPairs = pairs.filter(([lId, rId]) => lId !== leftId && rId !== rightId);
      const newPairs = [...cleanPairs, [leftId, rightId] as [string, string]];
      onChange({ pairs: newPairs });
    }
    setActiveTargetOver(null);
    setDraggedLeftId(null);
  };

  return (
    <div className="border-border bg-card flex flex-col gap-6 rounded-3xl border p-6 transition-all duration-300 select-none">
      <div className="text-center">
        <span className="text-xs text-muted-foreground font-medium">
          {locked ? "Locked" : "Drag left items to right slots, or tap to pair"}
        </span>
        {locked && isCorrect !== undefined && (
          <div className="mt-1 text-xs font-semibold">
            Status:{" "}
            <span className={isCorrect ? "text-success" : "text-destructive"}>
              {isCorrect ? "All matches correct!" : "Some matches are incorrect"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Available Items Pool */}
        <div className="flex-1 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Available Items
          </h4>
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/50 p-3 min-h-[160px]/30">
            {availableLeftItems.length === 0 ? (
              <div className="flex h-full items-center justify-center py-8 text-center text-xs text-muted-foreground font-medium">
                All items matched!
              </div>
            ) : (
              availableLeftItems.map((item) => {
                const isSelected = selectedLeftId === item.id;
                return (
                  <div
                    key={item.id}
                    draggable={!locked}
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleLeftClick(item.id)}
                    className={[
                      "rounded-xl border p-3 text-xs font-bold shadow-sm transition-all duration-200",
                      isSelected
                        ? "scale-[1.02] border-primary bg-primary text-primary-foreground shadow-primary/20"
                        : "border-border bg-card text-foreground hover:bg-muted/50 hover:border-border",
                      locked ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {item.text}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Target Matches */}
        <div className="flex-[1.5] space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pairs Matching
          </h4>
          <div className="space-y-3">
            {rightItems.map((rItem) => {
              const matchedLeftId = rightToLeftMap[rItem.id];
              const leftItem = leftItems.find((l) => l.id === matchedLeftId);
              const isOver = activeTargetOver === rItem.id;

              // Check if correctness should be marked
              let slotClass = "border-border bg-card";
              if (locked && matchedLeftId) {
                const correctLeftForThisRight = correctPairs.find(([_, rightId]) => rightId === rItem.id)?.[0];
                const isPairCorrect = correctLeftForThisRight === matchedLeftId;
                slotClass = isPairCorrect
                  ? "border-success/20 bg-success/5"
                  : "border-destructive/20 bg-destructive/5";
              }

              return (
                <div key={rItem.id} className="space-y-1">
                  <div
                    onClick={() => handleRightSlotClick(rItem.id)}
                    onDragOver={(e) => handleDragOver(e, rItem.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, rItem.id)}
                    className={[
                      "flex items-center justify-between gap-4 rounded-xl border p-3 transition-all duration-200 min-h-[52px]",
                      slotClass,
                      isOver ? "scale-[1.01] border-primary bg-primary/10" : "",
                      locked ? "cursor-not-allowed" : "cursor-pointer hover:border-primary/20",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {/* Right Item Label */}
                    <span className="text-xs font-bold text-foreground">
                      {rItem.text}
                    </span>

                    {/* Matched Left Item or Placeholder */}
                    {leftItem ? (
                      <div
                        className={[
                          "flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm",
                          locked ? "" : "hover:bg-primary",
                        ].join(" ")}
                      >
                        <span>{leftItem.text}</span>
                        {!locked && (
                          <span
                            className="ml-1 text-[9px] font-bold text-primary-foreground/60 hover:text-primary-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRightSlotClick(rItem.id);
                            }}
                          >
                            ✕
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                        {selectedLeftId ? "Tap to Match" : "Drop Slot"}
                      </span>
                    )}
                  </div>

                  {/* Feedback Helper Badge */}
                  {locked && isCorrect === false && (
                    <div className="pl-1 text-[10px] text-muted-foreground font-medium">
                      Correct Match:{" "}
                      <span className="text-success font-semibold">
                        {leftItems.find(
                          (l) => l.id === correctPairs.find(([_, rightId]) => rightId === rItem.id)?.[0]
                        )?.text ?? "None"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
