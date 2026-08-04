import { z } from 'zod';

// ─── Shared building blocks ──────────────────────────────────────────────────

const RangeSchema = z.object({ min: z.number(), max: z.number() });

// A "secret" (answer-key) value is either randomized within a range, or
// derived from a formula string evaluated over the other generated values
// (e.g. "a * x + b") — never interpolated into the visible prompt template.
const SecretEntrySchema = z.union([RangeSchema, z.string()]);

// ─── STANDARD_MCQ (parameterized) ────────────────────────────────────────────
//
// Three-way split, resolved in this order:
//   given   — author-set ranges, randomized, always safe to display.
//   secret  — the answer variable(s): randomized (range) or a formula over
//             given values. NEVER safe to display (this is what's graded).
//   derived — formulas over given+secret that describe the problem statement
//             itself (e.g. an equation's right-hand side, computed FROM the
//             secret answer) — safe to display, but must never re-derive or
//             leak the secret value itself.
// `display.template` may only interpolate `given`/`derived` names.

export const McqParameterizedConfigSchema = z.object({
  configVersion: z.literal(2),
  mode: z.literal('parameterized'),
  params: z.object({
    given: z.record(z.string(), RangeSchema),
    secret: z.record(z.string(), SecretEntrySchema),
    derived: z.record(z.string(), z.string()).optional(),
  }),
  display: z.object({ template: z.string().min(1) }),
  answerKey: z.object({ correct: z.string().min(1) }),
  distractors: z.array(z.object({ expr: z.string().min(1) })).min(1),
});

export type McqParameterizedConfig = z.infer<
  typeof McqParameterizedConfigSchema
>;

// ─── SLIDER_MANIPULATIVE (fixed + parameterized) ─────────────────────────────

export const SliderFixedConfigSchema = z.object({
  configVersion: z.literal(2),
  mode: z.literal('fixed'),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  unit: z.string().optional(),
  correctValue: z.number(),
  tolerance: z.number().optional(),
});

export type SliderFixedConfig = z.infer<typeof SliderFixedConfigSchema>;

export const SliderParameterizedConfigSchema = z.object({
  configVersion: z.literal(2),
  mode: z.literal('parameterized'),
  params: z.object({
    given: z.object({
      min: z.number(),
      max: z.number(),
      step: z.number(),
      unit: z.string().optional(),
    }),
    hidden: z.object({ correctValue: RangeSchema }),
  }),
  tolerance: z.number().optional(),
});

export type SliderParameterizedConfig = z.infer<
  typeof SliderParameterizedConfigSchema
>;

// ─── Discriminated parse result ──────────────────────────────────────────────
//
// No `configVersion` field, or `configVersion !== 2`, means today's exact
// per-widget-type shape — returned untouched as a "v1" passthrough forever,
// regardless of widgetType. `configVersion: 2` is Zod-validated for the
// widget types that have a schema (STANDARD_MCQ, SLIDER_MANIPULATIVE this
// phase); other widget types with configVersion: 2 are accepted as an
// opaque v2 passthrough until their own phase adds a schema.

export type ParsedWidgetConfig =
  | { version: 1; raw: unknown }
  | {
      version: 2;
      widgetType: 'STANDARD_MCQ';
      mode: 'parameterized';
      config: McqParameterizedConfig;
    }
  | {
      version: 2;
      widgetType: 'SLIDER_MANIPULATIVE';
      mode: 'fixed';
      config: SliderFixedConfig;
    }
  | {
      version: 2;
      widgetType: 'SLIDER_MANIPULATIVE';
      mode: 'parameterized';
      config: SliderParameterizedConfig;
    }
  | { version: 2; widgetType: string; mode: string; raw: unknown };

// Parameterized MCQ questions generate their options fresh per attempt —
// they never have static QuestionOption rows, so authoring-time validation
// that normally requires literal options must be skipped for them.
export function isParameterizedWidgetConfig(raw: unknown): boolean {
  return (
    !!raw &&
    typeof raw === 'object' &&
    (raw as Record<string, unknown>).configVersion === 2 &&
    (raw as Record<string, unknown>).mode === 'parameterized'
  );
}

export function parseWidgetConfig(
  widgetType: string | null | undefined,
  raw: unknown,
): ParsedWidgetConfig {
  if (
    !raw ||
    typeof raw !== 'object' ||
    (raw as Record<string, unknown>).configVersion !== 2
  ) {
    return { version: 1, raw };
  }

  const obj = raw as Record<string, unknown>;
  const mode = typeof obj.mode === 'string' ? obj.mode : 'fixed';

  if (widgetType === 'STANDARD_MCQ' && mode === 'parameterized') {
    return {
      version: 2,
      widgetType: 'STANDARD_MCQ',
      mode: 'parameterized',
      config: McqParameterizedConfigSchema.parse(obj),
    };
  }

  if (widgetType === 'SLIDER_MANIPULATIVE' && mode === 'fixed') {
    return {
      version: 2,
      widgetType: 'SLIDER_MANIPULATIVE',
      mode: 'fixed',
      config: SliderFixedConfigSchema.parse(obj),
    };
  }

  if (widgetType === 'SLIDER_MANIPULATIVE' && mode === 'parameterized') {
    return {
      version: 2,
      widgetType: 'SLIDER_MANIPULATIVE',
      mode: 'parameterized',
      config: SliderParameterizedConfigSchema.parse(obj),
    };
  }

  return { version: 2, widgetType: widgetType ?? '', mode, raw: obj };
}
