"use client";

import {
  ArrowRight,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import * as React from "react";

import { ClioMascot, type MascotState } from "@/features/clio/ClioMascot";
import { ClioVoicePicker } from "@/features/clio/sound/ClioVoicePicker";
import { useClioVoice } from "@/features/clio/sound/useClioVoice";
import { CoordinatePlotterWidget } from "@/features/clio/widgets/CoordinatePlotterWidget";
import { MCQWidget } from "@/features/clio/widgets/MCQWidget";
import { ShapeShadingWidget } from "@/features/clio/widgets/ShapeShadingWidget";
import { SliderWidget } from "@/features/clio/widgets/SliderWidget";

import { DEMO_LESSON } from "./demo-lesson";
import { SectionShell } from "./section-shell";
import { ShapeFigure } from "./shape-figure";

/**
 * The tutoring loop, as a state machine.
 *
 * `wrong` is a distinct phase from `hint` on purpose: Clio reacts first and
 * explains second, with a beat in between, because that beat is the whole
 * difference between a tutor and a marking scheme. A second miss goes to
 * `reveal` rather than looping — a child who is stuck needs the answer and the
 * reason, not another turn of the same wheel.
 */
type Phase = "answering" | "wrong" | "hint" | "correct" | "reveal" | "complete";

const MASCOT_BY_PHASE: Record<Phase, { state: MascotState; variant: "standing" | "chair" }> = {
  answering: { state: "thinking", variant: "chair" },
  wrong: { state: "wrong", variant: "chair" },
  hint: { state: "hint", variant: "chair" },
  correct: { state: "celebrate", variant: "chair" },
  reveal: { state: "hint", variant: "chair" },
  complete: { state: "milestone", variant: "standing" },
};

/** How long Clio's reaction plays before she starts explaining. */
const REACTION_MS = 1300;

export function ClioDemoSection({
  onXpChange,
  onComplete,
}: {
  onXpChange: (xp: number) => void;
  onComplete: (done: boolean) => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("answering");
  const [cardIndex, setCardIndex] = React.useState(0);
  const [choice, setChoice] = React.useState<string | null>(null);
  const [sliderValue, setSliderValue] = React.useState(0);
  const [plotted, setPlotted] = React.useState<{ points: { x: number; y: number }[] } | null>(null);
  const [shaded, setShaded] = React.useState<{ shadedRegionIds: string[] } | null>(null);
  const [attempts, setAttempts] = React.useState(0);
  const [xp, setXp] = React.useState(0);

  const { isMuted, isSpeaking, toggleMute, playPhrase, speakText, stop } = useClioVoice();

  const card = DEMO_LESSON.cards[cardIndex];
  const isLastCard = cardIndex === DEMO_LESSON.cards.length - 1;
  const mascot = MASCOT_BY_PHASE[phase];

  // The reaction beat. Cleared on unmount so a visitor who scrolls away
  // mid-answer doesn't get a state update against a dead component.
  React.useEffect(() => {
    if (phase !== "wrong") return;
    const timer = window.setTimeout(() => {
      const nextPhase = attempts >= 2 ? "reveal" : "hint";
      setPhase(nextPhase);
      if (nextPhase === "reveal") {
        playPhrase("ANSWER_REVEALED");
        speakText(card.explanation, { interrupt: false });
      } else {
        playPhrase("TAKE_A_HINT");
        speakText(card.hint, { interrupt: false });
      }
    }, REACTION_MS);
    return () => window.clearTimeout(timer);
  }, [phase, attempts, playPhrase, speakText, card.explanation, card.hint]);

  React.useEffect(() => onXpChange(xp), [xp, onXpChange]);
  React.useEffect(() => onComplete(phase === "complete"), [phase, onComplete]);

  // Clean up ongoing voice only on true component unmount
  React.useEffect(() => {
    return () => {
      stop();
    };
  }, []); // Empty deps so it only executes when navigating away

  const hasAnswer =
    card.kind === "mcq"
      ? choice !== null
      : card.kind === "coordinate"
        ? (plotted?.points.length ?? 0) > 0
        : card.kind === "shape-shading"
          ? (shaded?.shadedRegionIds.length ?? 0) > 0
          : sliderValue > 0;
  const locked = phase === "wrong" || phase === "correct" || phase === "reveal";
  const isCorrect = phase === "correct" ? true : locked ? false : null;

  const check = () => {
    let correct: boolean;
    if (card.kind === "mcq") {
      correct = card.options.find((o) => o.id === choice)?.isCorrect === true;
    } else if (card.kind === "coordinate") {
      const target = card.config.correctPoints[0];
      const points = plotted?.points ?? [];
      // Exactly one point: "click that spot" has one answer, and letting a
      // scattergun of guesses count as correct would teach the wrong lesson.
      correct =
        points.length === 1 &&
        Math.abs(points[0].x - target.x) <= card.config.tolerance &&
        Math.abs(points[0].y - target.y) <= card.config.tolerance;
    } else if (card.kind === "shape-shading") {
      correct = (shaded?.shadedRegionIds.length ?? 0) === card.config.targetNumerator;
    } else {
      correct = sliderValue === card.correctValue;
    }

    if (correct) {
      setXp((prev) => prev + card.xp);
      setPhase("correct");
      playPhrase("CORRECT");
    } else {
      setAttempts((prev) => prev + 1);
      setPhase("wrong");
      playPhrase("TRY_AGAIN");
    }
  };

  const next = () => {
    if (isLastCard) {
      setPhase("complete");
      playPhrase("LESSON_COMPLETE");
      return;
    }
    setCardIndex((i) => i + 1);
    setChoice(null);
    setSliderValue(0);
    setPlotted(null);
    setShaded(null);
    setAttempts(0);
    setPhase("answering");
  };

  const restart = () => {
    setCardIndex(0);
    setChoice(null);
    setSliderValue(0);
    setPlotted(null);
    setShaded(null);
    setAttempts(0);
    setXp(0);
    setPhase("answering");
    playPhrase("GREETING");
  };

  return (
    <SectionShell
      id="meet-clio"
      tinted
      eyebrow="Meet Clio"
      title="An ever-patient tutor for your child's endless curiosity."
      lede={
        <>
          Clio is our AI tutor: pre-vetted, kept inside the curriculum, and never free-roaming into
          whatever the internet thinks a seven-year-old should hear. These are real lesson cards.
          Answer one wrong on purpose and watch what she does.
        </>
      }
    >
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        {/* Lesson chrome — mirrors the real player's header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              {card.concept}
            </p>
            <p className="truncate text-xs font-semibold text-foreground">{DEMO_LESSON.title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {/* Clio's voice mute toggle */}
            <button
              type="button"
              onClick={() => {
                const isNowMuted = toggleMute();
                if (!isNowMuted) {
                  playPhrase("GREETING");
                }
              }}
              title={isMuted ? "Unmute Clio's voice" : "Mute Clio's voice"}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-all hover:bg-muted active:scale-95 cursor-pointer shadow-2xs"
            >
              {isMuted ? (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Voice Off</span>
                </>
              ) : (
                <>
                  <Volume2
                    className={`h-3.5 w-3.5 ${
                      isSpeaking ? "text-primary animate-pulse" : "text-foreground"
                    }`}
                  />
                  <span className={isSpeaking ? "text-primary font-bold" : "text-foreground"}>
                    {isSpeaking ? "Speaking…" : "Clio's Voice"}
                  </span>
                </>
              )}
            </button>

            <span className="flex items-center gap-1 rounded-lg border border-warning/20 bg-warning/10 px-2 py-1 text-[10px] font-extrabold text-warning">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {xp} XP
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {Math.min(cardIndex + 1, DEMO_LESSON.cards.length)} / {DEMO_LESSON.cards.length}
            </span>
          </div>
        </div>

        <div className="border-b border-border/60 px-5 py-3">
          <ClioVoicePicker />
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:gap-6 sm:p-7">
          {/* Clio + what she's saying right now. She stays first in the DOM so
              a phone still stacks her above the question; `order` only moves her
              into the right-hand column once there are two columns to move
              between. */}
          <div className="flex flex-row items-center gap-4 sm:order-2 sm:flex-col sm:items-center">
            <ClioMascot
              state={isSpeaking && phase === "answering" ? "hint" : mascot.state}
              variant={mascot.variant}
              size={112}
            />
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:text-center">
              Clio · {isSpeaking ? "speaking" : phase === "answering" ? "waiting" : phase}
            </p>
          </div>

          <div className="min-w-0 sm:order-1">
            {phase === "complete" ? (
              <div className="flex h-full flex-col justify-center">
                <p className="font-display text-lg font-extrabold text-foreground">
                  That&apos;s a lesson.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {DEMO_LESSON.cards.length} cards, {xp} XP. A real session runs eight to twelve of
                  these, and every one of them needs an answer before it moves on.
                </p>
                <button
                  type="button"
                  onClick={restart}
                  className="mt-6 flex h-11 w-fit cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-5 text-xs font-bold text-foreground transition-colors hover:bg-muted active:scale-97"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Run it again
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs leading-relaxed font-medium text-muted-foreground italic">
                  {card.clioIntro}
                </p>

                <div className="mt-2 flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed font-semibold text-foreground sm:text-base">
                    {card.prompt}
                  </p>
                  <button
                    type="button"
                    onClick={() => speakText(`${card.clioIntro} ${card.prompt}`)}
                    title="Listen to Clio read this question"
                    className="mt-0.5 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary/20 active:scale-95"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Listen</span>
                  </button>
                </div>

                <div className="mt-5">
                  {card.kind === "mcq" ? (
                    <MCQWidget
                      options={card.options}
                      selectedId={choice}
                      onSelect={setChoice}
                      locked={locked}
                      isCorrect={isCorrect}
                    />
                  ) : card.kind === "coordinate" ? (
                    <CoordinatePlotterWidget
                      config={card.config}
                      value={plotted}
                      onChange={setPlotted}
                      locked={locked}
                      isCorrect={isCorrect}
                    />
                  ) : card.kind === "shape-shading" ? (
                    <ShapeShadingWidget
                      config={card.config}
                      value={shaded}
                      onChange={setShaded}
                      locked={locked}
                      isCorrect={isCorrect}
                    />
                  ) : (
                    <div className="space-y-5">
                      {card.kind === "shape-percent" && (
                        <div className="flex justify-center rounded-2xl border border-border bg-muted/30 p-5">
                          <ShapeFigure
                            total={card.shape.total}
                            shaded={card.shape.shaded}
                            columns={card.shape.columns}
                          />
                        </div>
                      )}
                      <SliderWidget
                        config={card.config}
                        value={sliderValue}
                        onChange={setSliderValue}
                        locked={locked}
                        isCorrect={isCorrect}
                        correctValue={phase === "reveal" ? card.correctValue : undefined}
                      />
                    </div>
                  )}
                </div>

                {phase === "hint" && (
                  <div className="mt-5 flex items-start justify-between gap-2.5 rounded-2xl border border-warning/25 bg-warning/[0.07] p-4">
                    <div className="flex items-start gap-2.5">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                      <p className="text-xs leading-relaxed font-medium text-foreground">
                        <span className="font-bold">Not quite. Try again. </span>
                        {card.hint}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakText(`Not quite. Try again. ${card.hint}`)}
                      title="Listen to hint"
                      className="shrink-0 cursor-pointer p-1 text-warning hover:opacity-80 transition-opacity"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {(phase === "correct" || phase === "reveal") && (
                  <div
                    className={`mt-5 rounded-2xl border p-4 ${
                      phase === "correct"
                        ? "border-success/25 bg-success/[0.07]"
                        : "border-border bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs leading-relaxed font-medium text-foreground">
                        <span className="font-bold">
                          {phase === "correct" ? "That's it. " : "Here's the answer. "}
                        </span>
                        {card.explanation}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          speakText(
                            `${phase === "correct" ? "That's it." : "Here's the answer."} ${card.explanation}`
                          )
                        }
                        title="Listen to explanation"
                        className="shrink-0 cursor-pointer p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                    {phase === "correct" && (
                      <p className="mt-2 text-[10px] font-bold tracking-widest text-success uppercase">
                        +{card.xp} XP
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex items-center gap-3">
                  {phase === "answering" || phase === "hint" ? (
                    <button
                      type="button"
                      onClick={check}
                      disabled={!hasAnswer}
                      className="h-11 cursor-pointer rounded-xl bg-foreground px-6 text-xs font-bold text-background transition-all hover:bg-foreground/90 active:scale-97 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Check answer
                    </button>
                  ) : phase === "correct" || phase === "reveal" ? (
                    <button
                      type="button"
                      onClick={next}
                      className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-foreground px-6 text-xs font-bold text-background transition-all hover:bg-foreground/90 active:scale-97"
                    >
                      {isLastCard ? "Finish" : "Next card"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Clio is thinking…
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Clio never free-types at your child. She works from lesson cards a teacher wrote, with the
        hints and explanations written alongside them.
      </p>
    </SectionShell>
  );
}
