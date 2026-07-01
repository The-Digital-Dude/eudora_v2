"use client";

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
  mood: any;
  celebrate: any;
  wrong: any;
  levelUp: any;
  lookX: any;
  lookY: any;
  energy: any;
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

  const [inputs, setInputs] = useState<StateMachineInputs | null>(null);

  // Dynamically load the state machine and extract inputs if it exists in the loaded file
  useEffect(() => {
    if (!rive) return;

    const exists = rive.stateMachineNames.includes(STATE_MACHINE);
    if (exists) {
      rive.play(STATE_MACHINE);
      const smInputs = rive.stateMachineInputs(STATE_MACHINE);
      if (smInputs) {
        setInputs({
          mood: smInputs.find((i) => i.name === "mood") || null,
          celebrate: smInputs.find((i) => i.name === "celebrate") || null,
          wrong: smInputs.find((i) => i.name === "wrong") || null,
          levelUp: smInputs.find((i) => i.name === "levelUp") || null,
          lookX: smInputs.find((i) => i.name === "lookX") || null,
          lookY: smInputs.find((i) => i.name === "lookY") || null,
          energy: smInputs.find((i) => i.name === "energy") || null,
        });
      }
    } else {
      setInputs(null);
    }
  }, [rive]);

  const moodInput = inputs?.mood;
  const celebrateInput = inputs?.celebrate;
  const wrongInput = inputs?.wrong;
  const levelUpInput = inputs?.levelUp;
  const lookXInput = inputs?.lookX;
  const lookYInput = inputs?.lookY;
  const energyInput = inputs?.energy;

  // Drive state: state-machine inputs when ClioBrain exists, else name-based fallback.
  useEffect(() => {
    if (!rive) return;

    if (moodInput != null) {
      // ClioBrain state machine is present
      const moodValue = MOOD_MAP[state];
      if (moodValue !== undefined) {
        moodInput.value = moodValue;
      } else if (state === "celebrate") {
        celebrateInput?.fire();
      } else if (state === "wrong") {
        wrongInput?.fire();
      } else if (state === "milestone") {
        levelUpInput?.fire();
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
  }, [state, rive, moodInput, celebrateInput, wrongInput, levelUpInput]);

  // Default energy to mid-level; callers can extend the prop later to tie to streak.
  useEffect(() => {
    if (energyInput) energyInput.value = 0.5;
  }, [energyInput]);

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
    if (!lookXInput || !lookYInput) return;
    stopIdleDrift();
    const tick = () => {
      idleAngleRef.current += 0.015;
      lookXInput.value = Math.sin(idleAngleRef.current) * 0.2;
      lookYInput.value = Math.sin(idleAngleRef.current * 0.7) * 0.15;
      idleRafRef.current = requestAnimationFrame(tick);
    };
    idleRafRef.current = requestAnimationFrame(tick);
  }, [lookXInput, lookYInput, stopIdleDrift]);

  useEffect(() => {
    if (!enableEyeTracking || !lookXInput || !lookYInput) return;

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
        lookXInput.value = Math.max(-1, Math.min(1, (e.clientX - cx) / radius));
        lookYInput.value = Math.max(-1, Math.min(1, (e.clientY - cy) / radius));

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
  }, [enableEyeTracking, lookXInput, lookYInput, size, startIdleDrift, stopIdleDrift]);

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
