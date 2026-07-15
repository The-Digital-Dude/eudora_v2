"use client";

import type { StateMachineInput } from "@rive-app/react-canvas";
import { useRive } from "@rive-app/react-canvas";
import React, { useCallback, useEffect, useRef, useState } from "react";

type MascotState =
  | "idle"
  | "thinking"
  | "celebrate"
  | "encourage"
  | "wrong"
  | "greeting"
  | "confused"
  | "hint"
  | "milestone";

interface ClioMascotProps {
  state: MascotState;
  size?: number;
  enableEyeTracking?: boolean;
}

// Mood-based states map to the ClioBrain `mood` number input.
// Trigger states (celebrate / wrong / milestone) are null — fired separately.
const MOOD_MAP: Partial<Record<MascotState, number>> = {
  idle: 0,
  thinking: 1,
  confused: 2,
  hint: 3,
  greeting: 4,
  encourage: 5,
};

const STATE_MACHINE = "ClioBrain";

interface StateMachineInputs {
  mood: StateMachineInput | null;
  celebrate: StateMachineInput | null;
  wrong: StateMachineInput | null;
  levelUp: StateMachineInput | null;
  lookX: StateMachineInput | null;
  lookY: StateMachineInput | null;
  energy: StateMachineInput | null;
}

export function RiveClioMascot({
  state,
  size = 120,
  enableEyeTracking = true,
}: ClioMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize useRive without stateMachines parameter to avoid throwing an error
  // if the loaded .riv file is a placeholder and does not contain "ClioBrain".
  const { rive, RiveComponent } = useRive({
    src: "/rive/clio-mascot.riv",
    autoplay: true,
  });

  // Rive inputs are live mutable handles into the animation runtime, so they
  // live in a ref; `smReady` re-runs the effects once they become available.
  const inputsRef = useRef<StateMachineInputs | null>(null);
  const [smReady, setSmReady] = useState(false);

  // Dynamically load the state machine and extract inputs if it exists in the loaded file
  useEffect(() => {
    if (!rive) return;

    const exists = rive.stateMachineNames.includes(STATE_MACHINE);
    if (exists) {
      rive.play(STATE_MACHINE);
      const smInputs = rive.stateMachineInputs(STATE_MACHINE);
      if (smInputs) {
        const next: StateMachineInputs = {
          mood: smInputs.find((i) => i.name === "mood") || null,
          celebrate: smInputs.find((i) => i.name === "celebrate") || null,
          wrong: smInputs.find((i) => i.name === "wrong") || null,
          levelUp: smInputs.find((i) => i.name === "levelUp") || null,
          lookX: smInputs.find((i) => i.name === "lookX") || null,
          lookY: smInputs.find((i) => i.name === "lookY") || null,
          energy: smInputs.find((i) => i.name === "energy") || null,
        };
        // Default energy to mid-level; callers can extend the prop later to tie to streak.
        if (next.energy) next.energy.value = 0.5;
        inputsRef.current = next;
      } else {
        inputsRef.current = null;
      }
    } else {
      inputsRef.current = null;
    }
    setSmReady(exists && inputsRef.current !== null);
  }, [rive]);

  // Drive state: state-machine inputs when ClioBrain exists, else name-based fallback.
  useEffect(() => {
    if (!rive) return;

    const inputs = inputsRef.current;
    if (smReady && inputs?.mood != null) {
      // ClioBrain state machine is present
      const moodValue = MOOD_MAP[state];
      if (moodValue !== undefined) {
        inputs.mood.value = moodValue;
      } else if (state === "celebrate") {
        inputs.celebrate?.fire();
      } else if (state === "wrong") {
        inputs.wrong?.fire();
      } else if (state === "milestone") {
        inputs.levelUp?.fire();
      }
    } else {
      // Fallback: name-based playback for existing .riv without ClioBrain
      try {
        const animations = rive.animationNames;
        if (animations?.includes(state)) {
          rive.stop();
          rive.play(state);
        } else if (animations?.length && !rive.isPlaying) {
          rive.play(animations[0]);
        }
      } catch (err) {
        console.warn("Rive mascot animation playback error:", err);
      }
    }
  }, [state, rive, smReady]);

  // ── Eye tracking ──────────────────────────────────────────────────────────
  const rafRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleAngleRef = useRef(0);
  const idleRafRef = useRef<number | null>(null);

  const stopIdleDrift = useCallback(() => {
    if (idleRafRef.current !== null) {
      cancelAnimationFrame(idleRafRef.current);
      idleRafRef.current = null;
    }
  }, []);

  const startIdleDrift = useCallback(() => {
    const inputs = inputsRef.current;
    if (!inputs?.lookX || !inputs?.lookY) return;
    const { lookX, lookY } = inputs;
    stopIdleDrift();
    const tick = () => {
      idleAngleRef.current += 0.015;
      lookX.value = Math.sin(idleAngleRef.current) * 0.2;
      lookY.value = Math.sin(idleAngleRef.current * 0.7) * 0.15;
      idleRafRef.current = requestAnimationFrame(tick);
    };
    idleRafRef.current = requestAnimationFrame(tick);
  }, [stopIdleDrift]);

  useEffect(() => {
    const inputs = inputsRef.current;
    if (!enableEyeTracking || !smReady || !inputs?.lookX || !inputs?.lookY) return;
    const { lookX, lookY } = inputs;

    const handlePointerMove = (e: PointerEvent) => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const radius = size * 2;
        lookX.value = Math.max(-1, Math.min(1, (e.clientX - cx) / radius));
        lookY.value = Math.max(-1, Math.min(1, (e.clientY - cy) / radius));

        stopIdleDrift();
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(startIdleDrift, 3000);
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    idleTimerRef.current = setTimeout(startIdleDrift, 1000);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      stopIdleDrift();
    };
  }, [enableEyeTracking, smReady, size, startIdleDrift, stopIdleDrift]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center overflow-hidden"
    >
      <RiveComponent className="h-full w-full object-contain" />
    </div>
  );
}
