import type {
  CoordinatePlotterConfig,
  SliderConfig,
} from "@/features/assessments/widgetConfigSchemas";
import type { QuestionOption } from "@/features/clio/clioApi";
import type { ShapeShadingDisplayConfig } from "@/features/clio/widgets/ShapeShadingWidget";

/**
 * The demo lesson, in full.
 *
 * This is MARKETING COPY, not seeded data. The real lesson API
 * (`/api/lessons/:id/flow`, `POST /api/lessons/cards/:id/submit`) sits behind
 * the global JwtAuthGuard and a role check, so a signed-out visitor cannot
 * reach it, and opening a public write route that mints LessonAttempt rows for
 * anyone who scrolls a marketing page is a bad trade.
 *
 * Consequence to keep in mind: this content can drift from what a real lesson
 * looks like. It is deliberately kept in one file so a single read tells you
 * everything the page claims Clio does. Keep it honest: every behaviour
 * scripted here (hint on a miss, reveal on a second miss, XP on success) is
 * behaviour the real player actually has.
 *
 * Card order matters. The first card is what a visitor sees before they touch
 * anything, so it leads with the shade-a-shape: the task is pure picture — tap
 * the parts to colour — and can be understood without reading a word.
 */

interface DemoCardBase {
  id: string;
  concept: string;
  title: string;
  /** Clio's lead-in, shown above the prompt on every card. */
  clioIntro: string;
  prompt: string;
  /** Shown after a first wrong answer, before the retry. */
  hint: string;
  explanation: string;
  xp: number;
}

export interface DemoCoordinateCard extends DemoCardBase {
  kind: "coordinate";
  config: CoordinatePlotterConfig;
}

export interface DemoShapePercentCard extends DemoCardBase {
  kind: "shape-percent";
  shape: { total: number; shaded: number; columns: number };
  config: SliderConfig;
  correctValue: number;
}

export interface DemoShapeShadingCard extends DemoCardBase {
  kind: "shape-shading";
  config: ShapeShadingDisplayConfig;
}

export interface DemoMcqCard extends DemoCardBase {
  kind: "mcq";
  options: QuestionOption[];
}

export interface DemoSliderCard extends DemoCardBase {
  kind: "slider";
  config: SliderConfig;
  correctValue: number;
}

export type DemoCard =
  | DemoCoordinateCard
  | DemoShapePercentCard
  | DemoShapeShadingCard
  | DemoMcqCard
  | DemoSliderCard;

const mcqOption = (label: string, text: string, isCorrect = false): QuestionOption => ({
  id: `opt-${label.toLowerCase()}`,
  optionLabel: label,
  optionText: text,
  isCorrect,
});

export const DEMO_LESSON: { title: string; cards: DemoCard[] } = {
  title: "Maths you can picture",
  cards: [
    {
      kind: "shape-shading",
      id: "demo-card-shape-shading",
      concept: "Fractions",
      title: "Shade the fraction",
      clioIntro: "Let's show a fraction by colouring in part of a shape.",
      prompt: "Shade two of the six slices, so two sixths of the circle is coloured in.",
      config: { shape: { kind: "polygon", regions: 6 }, targetNumerator: 2, requireContiguous: false },
      hint: "There are six equal slices in the circle. You only need to colour two of them in.",
      explanation:
        "Two of the six equal slices are shaded, so the shape shows two sixths — that's 2/6 of the circle.",
      xp: 20,
    },
    {
      kind: "shape-percent",
      id: "demo-card-shape-percent",
      concept: "Percentages",
      title: "Reading a shaded shape",
      clioIntro: "Hi, I'm Clio. Percent just means 'out of a hundred', so let's look at one.",
      prompt: "Move the slider to show what percentage of this shape is shaded.",
      shape: { total: 10, shaded: 3, columns: 5 },
      config: { min: 0, max: 100, step: 10, unit: "%" },
      correctValue: 30,
      hint: "The shape has 10 equal squares, so one square is one tenth, and one tenth is 10%.",
      explanation:
        "10 equal squares means each one is worth 10%. Three of them are shaded, so 3 × 10% = 30%.",
      xp: 20,
    },
    {
      kind: "coordinate",
      id: "demo-card-coordinates",
      concept: "Coordinates",
      title: "Finding the treasure",
      clioIntro: "Grids are just directions. Across first, then up.",
      prompt:
        "Clio buried her treasure 2 steps across and 4 steps up. Click that spot on the grid.",
      // Even-numbered target on purpose: the plotter only labels even ticks, so
      // an odd coordinate would ask a child to read a number that isn't drawn.
      config: {
        xRange: [0, 6],
        yRange: [0, 6],
        gridStep: 1,
        correctPoints: [{ x: 2, y: 4 }],
        tolerance: 0.4,
      },
      hint: "Walk along the bottom line first and stop at 2. Only then start climbing.",
      explanation:
        "Across before up, every time. 2 along the bottom and 4 up from there is the point (2, 4).",
      xp: 20,
    },
    {
      kind: "mcq",
      id: "demo-card-fractions",
      concept: "Fractions",
      title: "Sharing a pizza",
      clioIntro: "Same idea as the shaded shape, written a different way.",
      prompt:
        "Maya cuts a pizza into 4 equal slices and eats 1 slice. Which fraction shows how much she ate?",
      options: [
        mcqOption("A", "1/2"),
        mcqOption("B", "1/4", true),
        mcqOption("C", "4/1"),
        mcqOption("D", "1/3"),
      ],
      hint: "Start with the bottom number. It's how many equal slices the whole pizza was cut into.",
      explanation:
        "The bottom number counts the equal pieces in the whole (4 slices). The top counts how many were taken (1 slice). So Maya ate 1/4 of the pizza.",
      xp: 20,
    },
    {
      kind: "slider",
      id: "demo-card-multiplication",
      concept: "Multiplication",
      title: "Counting in groups",
      clioIntro: "Last one, and this time there's nothing to pick from.",
      prompt: "Slide to show how many legs 3 dogs have altogether.",
      config: { min: 0, max: 20, step: 1, unit: "legs" },
      correctValue: 12,
      hint: "One dog has 4 legs. Try counting up by 4, three times.",
      explanation: "3 groups of 4 legs is 4 + 4 + 4, which is 12. That's what 3 × 4 means.",
      xp: 25,
    },
  ],
};

export const DEMO_TOTAL_XP = DEMO_LESSON.cards.reduce((sum, card) => sum + card.xp, 0);
