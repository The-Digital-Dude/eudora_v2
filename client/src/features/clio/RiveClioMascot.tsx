"use client";

import React, { useEffect } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";

interface ClioMascotProps {
  state: "idle" | "thinking" | "celebrate" | "encourage" | "wrong";
  size?: number;
}

export function RiveClioMascot({ state, size = 120 }: ClioMascotProps) {
  const { rive, RiveComponent } = useRive({
    src: "/rive/clio-mascot.riv",
    stateMachines: "State Machine 1",
    autoplay: true,
  });

  // Try to bind to state machine input named after the requested state state
  const stateInput = useStateMachineInput(rive, "State Machine 1", state);

  useEffect(() => {
    if (!rive) return;

    if (stateInput) {
      // If state machine input is a trigger
      stateInput.fire();
    } else {
      // Fallback: try to play the animation by name if state machine is not fully configured
      try {
        const animations = rive.animationNames;
        if (animations && animations.includes(state)) {
          rive.stop();
          rive.play(state);
        } else {
          // Play the first animation available as a fallback
          if (animations && animations.length > 0 && !rive.isPlaying) {
            rive.play(animations[0]);
          }
        }
      } catch (err) {
        console.warn("Rive mascot animation playback fallback error:", err);
      }
    }
  }, [state, stateInput, rive]);

  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center overflow-hidden"
    >
      <RiveComponent className="w-full h-full object-contain" />
    </div>
  );
}
