"use client";

import { Check, RotateCcw } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { CoordinatePlotterWidget } from "@/features/clio/widgets/CoordinatePlotterWidget";
import { DragDropWidget } from "@/features/clio/widgets/DragDropWidget";
import { GridMatchingWidget } from "@/features/clio/widgets/GridMatchingWidget";
import { SequenceStepsWidget } from "@/features/clio/widgets/SequenceStepsWidget";
import { ShapeShadingWidget } from "@/features/clio/widgets/ShapeShadingWidget";

import { SectionShell } from "./section-shell";

/**
 * Five of the real interaction types, side by side.
 *
 * Grading is held here rather than inside the widgets because the widgets are
 * controlled and deliberately unopinionated about correctness — the same
 * property that lets the lesson player grade server-side lets this page grade
 * against a local key without forking them.
 */
type PlaygroundId = "order" | "blanks" | "match" | "plot" | "shade";

const TABS: { id: PlaygroundId; label: string; question: string; teaches: string }[] = [
  {
    id: "shade",
    label: "Shade the shape",
    question: "Shade two of the six slices, so two sixths of the circle is coloured in.",
    teaches: "seeing a fraction as part of a whole",
  },
  {
    id: "match",
    label: "Match the pairs",
    question: "Match each sum on the left to its answer on the right.",
    teaches: "number bonds, and recall under a little pressure",
  },
  {
    id: "plot",
    label: "Plot the point",
    question: "Plot the point that is 3 across and 2 up.",
    teaches: "reading two numbers at once",
  },
  {
    id: "order",
    label: "Order the steps",
    question:
      "Maya has 12 stickers. She gives 4 to her brother, then buys 6 more. Put the steps in the right order.",
    teaches: "working through a word problem one step at a time",
  },
  {
    id: "blanks",
    label: "Fill the blanks",
    question: "Drag each word into the sentence where it belongs.",
    teaches: "using what you know to complete a sentence",
  },
];

// Shown deliberately out of order; the answer key is separate.
const STEP_CONFIG = {
  steps: [
    { id: "buy", text: "Buy 6 more: 8 + 6 = 14." },
    { id: "start", text: "Start with the 12 stickers Maya has." },
    { id: "answer", text: "Maya has 14 stickers." },
    { id: "give", text: "Give 4 away: 12 − 4 = 8." },
  ],
};
const STEP_KEY = ["start", "give", "buy", "answer"];

const BLANKS_CONFIG = {
  labels: ["East", "West"],
  targets: [
    { id: "sunrise", placeholder: "The sun rises in the ___" },
    { id: "sunset", placeholder: "and sets in the ___" },
  ],
};
const BLANKS_KEY: Record<string, string> = { sunrise: "East", sunset: "West" };

const MATCH_CONFIG = {
  left: [
    { id: "l1", text: "2 + 3" },
    { id: "l2", text: "4 + 4" },
    { id: "l3", text: "5 + 5" },
  ],
  right: [
    { id: "r1", text: "8" },
    { id: "r2", text: "10" },
    { id: "r3", text: "5" },
  ],
  correctPairs: [
    ["l1", "r3"],
    ["l2", "r1"],
    ["l3", "r2"],
  ] as [string, string][],
};

const PLOT_CONFIG = {
  xRange: [0, 5] as [number, number],
  yRange: [0, 5] as [number, number],
  gridStep: 1,
  correctPoints: [{ x: 3, y: 2 }],
  tolerance: 0.4,
};

const SHADE_CONFIG = {
  shape: { kind: "polygon" as const, regions: 6 },
  targetNumerator: 2,
  requireContiguous: false,
};

export function WidgetPlaygroundSection() {
  const [tab, setTab] = React.useState<PlaygroundId>("shade");
  const [checked, setChecked] = React.useState(false);

  const [stepOrder, setStepOrder] = React.useState<string[] | null>(null);
  const [placements, setPlacements] = React.useState<Record<string, string>>({});
  const [pairs, setPairs] = React.useState<{ pairs: [string, string][] } | null>(null);
  const [points, setPoints] = React.useState<{ points: { x: number; y: number }[] } | null>(null);
  const [shaded, setShaded] = React.useState<{ shadedRegionIds: string[] } | null>(null);

  const switchTab = (id: PlaygroundId) => {
    setTab(id);
    setChecked(false);
  };

  const reset = () => {
    setChecked(false);
    setStepOrder(null);
    setPlacements({});
    setPairs(null);
    setPoints(null);
    setShaded(null);
  };

  const isCorrect = React.useMemo(() => {
    if (!checked) return null;
    switch (tab) {
      case "order": {
        const current = stepOrder ?? STEP_CONFIG.steps.map((s) => s.id);
        return STEP_KEY.every((id, i) => current[i] === id);
      }
      case "blanks":
        return Object.entries(BLANKS_KEY).every(([id, label]) => placements[id] === label);
      case "match": {
        const chosen = pairs?.pairs ?? [];
        return (
          chosen.length === MATCH_CONFIG.correctPairs.length &&
          MATCH_CONFIG.correctPairs.every(([l, r]) =>
            chosen.some(([cl, cr]) => cl === l && cr === r),
          )
        );
      }
      case "plot": {
        const point = points?.points?.[0];
        if (!point || points?.points.length !== 1) return false;
        const target = PLOT_CONFIG.correctPoints[0];
        return (
          Math.abs(point.x - target.x) <= PLOT_CONFIG.tolerance &&
          Math.abs(point.y - target.y) <= PLOT_CONFIG.tolerance
        );
      }
      case "shade":
        // Mirrors the server's SHAPE_SHADING grader: count must match, and
        // contiguity is only checked when the config asks for it.
        return (shaded?.shadedRegionIds.length ?? 0) === SHADE_CONFIG.targetNumerator;
    }
  }, [checked, tab, stepOrder, placements, pairs, points, shaded]);

  const hasInput = (() => {
    switch (tab) {
      case "order":
        return stepOrder !== null;
      case "blanks":
        return Object.keys(placements).length > 0;
      case "match":
        return (pairs?.pairs.length ?? 0) > 0;
      case "plot":
        return (points?.points.length ?? 0) > 0;
      case "shade":
        return (shaded?.shadedRegionIds.length ?? 0) > 0;
    }
  })();

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <SectionShell
      id="learning-is-doing"
      eyebrow="Built for attention"
      title="Problems built to hold their attention."
      lede={
        <>
          Each one asks your child to notice something, make a decision, and act on it: drag a step
          into place, shade a shape, plot a point. There is no Next button to press, so the only way
          forward is to work it out. All five below are real interaction types, running the same
          components the lesson player uses.
        </>
      }
    >
      <figure className="mx-auto mb-10 max-w-lg">
        <Image
          src="/landing/kid_learning_with_parents.jpg"
          alt="A parent leaning in to point at a laptop screen while their child works through a problem"
          width={740}
          height={415}
          sizes="(min-width: 640px) 32rem, 100vw"
          className="h-auto w-full rounded-3xl border border-border object-cover shadow-sm"
        />
        <figcaption className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
          Most children start these sitting next to someone. That is the point: short enough to do
          together, and hard enough to be worth talking about.
        </figcaption>
      </figure>

      <div className="mx-auto max-w-3xl">
        <div
          role="tablist"
          aria-label="Interaction types"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              className={`h-9 cursor-pointer rounded-full border px-4 text-xs font-bold transition-colors ${
                tab === t.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Teaches: {active.teaches}
          </p>
          <p className="mt-3 text-sm leading-relaxed font-semibold text-foreground">
            {active.question}
          </p>

          <div className="mt-5">
            {tab === "order" && (
              <SequenceStepsWidget
                config={STEP_CONFIG}
                value={stepOrder}
                onChange={setStepOrder}
                locked={checked}
                isCorrect={isCorrect}
                correctOrder={checked && isCorrect === false ? STEP_KEY : undefined}
              />
            )}
            {tab === "blanks" && (
              <DragDropWidget
                config={BLANKS_CONFIG}
                placements={placements}
                onChange={setPlacements}
                locked={checked}
              />
            )}
            {tab === "match" && (
              <GridMatchingWidget
                config={MATCH_CONFIG}
                value={pairs}
                onChange={setPairs}
                locked={checked}
                isCorrect={isCorrect}
              />
            )}
            {tab === "plot" && (
              <CoordinatePlotterWidget
                config={PLOT_CONFIG}
                value={points}
                onChange={setPoints}
                locked={checked}
                isCorrect={isCorrect}
              />
            )}
            {tab === "shade" && (
              <ShapeShadingWidget
                config={SHADE_CONFIG}
                value={shaded}
                onChange={setShaded}
                locked={checked}
                isCorrect={isCorrect}
              />
            )}
          </div>

          {checked && (
            <p
              className={`mt-5 rounded-2xl border p-3.5 text-xs leading-relaxed font-semibold ${
                isCorrect
                  ? "border-success/25 bg-success/[0.07] text-foreground"
                  : "border-warning/25 bg-warning/[0.07] text-foreground"
              }`}
            >
              {isCorrect
                ? "Correct. In a real lesson that's XP, and Clio moves on."
                : "Not yet. In a real lesson Clio would hint here, then let them try again."}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setChecked(true)}
              disabled={checked || !hasInput}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-foreground px-5 text-xs font-bold text-background transition-all hover:bg-foreground/90 active:scale-97 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" /> Check
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-5 text-xs font-bold text-foreground transition-colors hover:bg-muted active:scale-97"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
