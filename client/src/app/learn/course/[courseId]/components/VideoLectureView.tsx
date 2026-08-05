"use client";

import { NotebookPen } from "lucide-react";
import React, { useRef, useState } from "react";
import ReactPlayer from "react-player";

import { useUpdateModuleItemProgressMutation } from "@/features/catalog/catalogApi";
import type { ModuleItem } from "@/features/catalog/catalogApi";

interface VideoLectureViewProps {
  item: ModuleItem;
  onCompleted: () => void;
}

export function VideoLectureView({ item, onCompleted }: VideoLectureViewProps) {
  const [updateProgress] = useUpdateModuleItemProgressMutation();
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const hasMarkedComplete = useRef(false);
  const lastSavedPosition = useRef(0);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const seconds = Math.floor(e.currentTarget.currentTime);
    if (Math.abs(seconds - lastSavedPosition.current) >= 5) {
      lastSavedPosition.current = seconds;
      updateProgress({ id: item.id, lastPositionSeconds: seconds });
    }
  };

  const handleEnded = () => {
    if (!hasMarkedComplete.current) {
      hasMarkedComplete.current = true;
      updateProgress({ id: item.id, completed: true });
      onCompleted();
    }
  };

  const handleSaveNote = () => {
    updateProgress({ id: item.id, notes });
  };

  if (!item.videoUrl) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        No video URL configured for this lecture yet.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-sm font-bold text-foreground">{item.title}</h2>
        <button
          onClick={() => setShowNotes((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
        >
          <NotebookPen className="h-3.5 w-3.5" /> Notes
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 items-center justify-center bg-black p-4">
          <ReactPlayer
            src={item.videoUrl}
            controls
            playsInline
            width="100%"
            height="auto"
            style={{ aspectRatio: "16/9", maxHeight: "100%" }}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
        </div>

        {showNotes && (
          <div className="w-72 shrink-0 border-l border-border p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNote}
              placeholder="Write a note about this lecture..."
              className="h-40 w-full resize-none rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
