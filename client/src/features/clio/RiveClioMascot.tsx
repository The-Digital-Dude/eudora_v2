"use client";

import { useRive } from "@rive-app/react-canvas";
import React, { useEffect } from "react";

interface ClioMascotProps {
  state:
    | "idle"
    | "thinking"
    | "celebrate"
    | "encourage"
    | "wrong"
    | "greeting"
    | "confused"
    | "hint"
    | "milestone";
  size?: number;
}

export function RiveClioMascot({ state, size = 120 }: ClioMascotProps) {
  const { rive, RiveComponent } = useRive({
    src: "/rive/clio-mascot.riv",
    autoplay: true,
  });

  useEffect(() => {
    if (!rive) return;

    try {
      const animations = rive.animationNames;
      if (animations && animations.includes(state)) {
        rive.stop();
        rive.play(state);
      } else if (animations && animations.length > 0 && !rive.isPlaying) {
        rive.play(animations[0]);
      }
    } catch (err) {
      console.warn("Rive mascot animation playback error:", err);
    }
  }, [state, rive]);

  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center overflow-hidden"
    >
      <RiveComponent className="h-full w-full object-contain" />
    </div>
  );
}
