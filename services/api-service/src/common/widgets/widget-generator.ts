import { Parser } from 'expr-eval';
import {
  McqParameterizedConfig,
  ShapeShadingFixedConfig,
  SliderParameterizedConfig,
  parseWidgetConfig,
} from './widget-config.schema';
import { mulberry32, randomInt, shuffleWithRng } from './seed.util';

const exprParser = new Parser();

export type ResolvedAnswer =
  | { widgetType: 'STANDARD_MCQ'; correctOptionId: string }
  | { widgetType: 'SLIDER_MANIPULATIVE'; correctValue: number; tolerance: number }
  | {
      widgetType: 'COORDINATE_PLOTTER';
      correctPoints: { x: number; y: number }[];
      tolerance: number;
    }
  | { widgetType: 'GRID_MATCHING'; correctPairs: [string, string][] }
  | { widgetType: 'DRAG_AND_DROP_LABELS'; correctPlacements: Record<string, string> }
  | {
      widgetType: 'SHAPE_SHADING';
      targetNumerator: number;
      totalRegions: number;
      shapeKind: 'polygon' | 'bar';
      requireContiguous: boolean;
    }
  | { widgetType: 'NUMERIC_OR_TEXT'; correctAnswer: string | null; isNumeric: boolean }
  | { widgetType: 'UNSUPPORTED' };

export interface GeneratedOption {
  id: string;
  optionLabel?: string;
  optionText?: string;
  isCorrect: boolean;
}

export interface GeneratedInstance {
  displayConfig: unknown;
  options?: GeneratedOption[];
  resolvedAnswer: ResolvedAnswer;
}

export interface QuestionLike {
  questionType: string;
  correctAnswer: string | null;
  widgetType?: string | null;
  widgetConfig?: unknown;
  options: {
    id: string;
    optionLabel?: string;
    optionText?: string;
    isCorrect: boolean;
  }[];
}

export function generateWidgetInstance(
  question: QuestionLike,
  seed: number,
): GeneratedInstance {
  const parsed = parseWidgetConfig(question.widgetType, question.widgetConfig);

  if (parsed.version === 2 && 'config' in parsed) {
    if (parsed.widgetType === 'STANDARD_MCQ' && parsed.mode === 'parameterized') {
      return generateMcqInstance(parsed.config, seed);
    }

    if (parsed.widgetType === 'SLIDER_MANIPULATIVE') {
      if (parsed.mode === 'parameterized') {
        return generateSliderInstance(parsed.config, seed);
      }
      if (parsed.mode === 'fixed') {
        const c = parsed.config;
        return {
          displayConfig: { min: c.min, max: c.max, step: c.step, unit: c.unit },
          resolvedAnswer: {
            widgetType: 'SLIDER_MANIPULATIVE',
            correctValue: c.correctValue,
            tolerance: c.tolerance ?? 0.1,
          },
        };
      }
    }

    if (parsed.widgetType === 'SHAPE_SHADING' && parsed.mode === 'fixed') {
      return generateShapeShadingInstance(parsed.config);
    }
  }

  // Legacy passthrough — v1, or v2 for widget types without a generator yet:
  // resolve today's fixed shape unchanged, no randomization.
  return resolveLegacyInstance(question);
}

// No RNG needed — SHAPE_SHADING has no legacy data to migrate (no
// `resolveLegacyInstance` case) and no parameterized mode yet, so the config
// the author wrote is passed straight through, same as SLIDER_MANIPULATIVE's
// `fixed` branch above. The target fraction is inherently visible to the
// student (it's the instruction text itself, e.g. "Color 1/2") — unlike
// Slider's `correctValue`, there's nothing to keep secret pre-submission.
function generateShapeShadingInstance(config: ShapeShadingFixedConfig): GeneratedInstance {
  return {
    displayConfig: {
      shape: config.shape,
      targetNumerator: config.targetNumerator,
      requireContiguous: config.requireContiguous,
    },
    resolvedAnswer: {
      widgetType: 'SHAPE_SHADING',
      targetNumerator: config.targetNumerator,
      totalRegions: config.shape.regions,
      shapeKind: config.shape.kind,
      requireContiguous: config.requireContiguous,
    },
  };
}

function generateMcqInstance(
  config: McqParameterizedConfig,
  seed: number,
): GeneratedInstance {
  const rng = mulberry32(seed);
  const scope: Record<string, number> = {};

  // Resolution order matters: secrets may reference given values, and
  // derived (display-safe) values may reference either — e.g. an equation's
  // right-hand side is *computed from* the secret answer, but must still be
  // shown to the student as part of the problem statement.
  for (const [name, range] of Object.entries(config.params.given)) {
    scope[name] = randomInt(rng, range.min, range.max);
  }
  for (const [name, entry] of Object.entries(config.params.secret)) {
    scope[name] =
      typeof entry === 'string'
        ? exprParser.parse(entry).evaluate(scope)
        : randomInt(rng, entry.min, entry.max);
  }
  for (const [name, expr] of Object.entries(config.params.derived ?? {})) {
    scope[name] = exprParser.parse(expr).evaluate(scope);
  }

  const correctValue = scope[config.answerKey.correct];
  const distractorValues = config.distractors.map((d) =>
    exprParser.parse(d.expr).evaluate(scope),
  );

  const shuffled = shuffleWithRng(
    [correctValue, ...distractorValues].map((value, i) => ({
      value,
      isCorrect: i === 0,
    })),
    rng,
  );

  const options: GeneratedOption[] = shuffled.map((entry, idx) => ({
    id: `gen-${idx}`,
    optionLabel: String.fromCharCode(65 + idx),
    optionText: String(entry.value),
    isCorrect: entry.isCorrect,
  }));

  const visibleValues: Record<string, number> = {};
  for (const name of [
    ...Object.keys(config.params.given),
    ...Object.keys(config.params.derived ?? {}),
  ]) {
    visibleValues[name] = scope[name];
  }
  const prompt = substituteTemplate(config.display.template, visibleValues);

  return {
    displayConfig: { prompt },
    options,
    resolvedAnswer: {
      widgetType: 'STANDARD_MCQ',
      correctOptionId: options.find((o) => o.isCorrect)!.id,
    },
  };
}

function generateSliderInstance(
  config: SliderParameterizedConfig,
  seed: number,
): GeneratedInstance {
  const rng = mulberry32(seed);
  const { given, hidden } = config.params;
  const correctValue = randomInt(rng, hidden.correctValue.min, hidden.correctValue.max);

  return {
    displayConfig: { min: given.min, max: given.max, step: given.step, unit: given.unit },
    resolvedAnswer: {
      widgetType: 'SLIDER_MANIPULATIVE',
      correctValue,
      tolerance: config.tolerance ?? 0.1,
    },
  };
}

function resolveLegacyInstance(question: QuestionLike): GeneratedInstance {
  const widgetType = question.widgetType ?? null;
  const rawConfig = question.widgetConfig ?? null;

  if (widgetType === 'STANDARD_MCQ' || question.questionType === 'mcq') {
    const correct = question.options.find((o) => o.isCorrect);
    return {
      displayConfig: rawConfig,
      options: question.options,
      resolvedAnswer: correct
        ? { widgetType: 'STANDARD_MCQ', correctOptionId: correct.id }
        : { widgetType: 'UNSUPPORTED' },
    };
  }

  if (widgetType === 'SLIDER_MANIPULATIVE') {
    const target =
      question.correctAnswer !== null ? parseFloat(question.correctAnswer) : NaN;
    return {
      displayConfig: rawConfig,
      resolvedAnswer: Number.isNaN(target)
        ? { widgetType: 'UNSUPPORTED' }
        : { widgetType: 'SLIDER_MANIPULATIVE', correctValue: target, tolerance: 0.1 },
    };
  }

  if (widgetType === 'COORDINATE_PLOTTER') {
    const cfg = (rawConfig ?? {}) as {
      correctPoints?: { x: number; y: number }[];
      tolerance?: number;
    };
    return {
      displayConfig: rawConfig,
      resolvedAnswer: {
        widgetType: 'COORDINATE_PLOTTER',
        correctPoints: cfg.correctPoints ?? [],
        tolerance: cfg.tolerance ?? 0.1,
      },
    };
  }

  if (widgetType === 'GRID_MATCHING') {
    const cfg = (rawConfig ?? {}) as { correctPairs?: [string, string][] };
    return {
      displayConfig: rawConfig,
      resolvedAnswer: {
        widgetType: 'GRID_MATCHING',
        correctPairs: cfg.correctPairs ?? [],
      },
    };
  }

  // DRAG_AND_DROP_LABELS: the answer key is each target's authored
  // `correctLabel` (see widget-config-editor.tsx's target editor). A target
  // with no correctLabel is ambiguous — decorative slot vs. half-authored
  // question — so if *none* of them carry one, the question resolves to
  // UNSUPPORTED rather than silently grading everything as wrong.
  if (widgetType === 'DRAG_AND_DROP_LABELS') {
    const cfg = (rawConfig ?? {}) as {
      targets?: ({ id?: string; correctLabel?: string } | string)[];
    };
    const correctPlacements: Record<string, string> = {};
    (cfg.targets ?? []).forEach((t, idx) => {
      if (typeof t === 'object' && t.correctLabel) {
        correctPlacements[t.id ?? `target-${idx}`] = t.correctLabel;
      }
    });
    return {
      displayConfig: rawConfig,
      resolvedAnswer:
        Object.keys(correctPlacements).length > 0
          ? { widgetType: 'DRAG_AND_DROP_LABELS', correctPlacements }
          : { widgetType: 'UNSUPPORTED' },
    };
  }

  // CODE_PLAYGROUND stays retired: grading it honestly needs untrusted code
  // executed server-side, which is out of proportion to the feature. Its
  // client-side test-runner result is authored-only feedback, never a mark
  // (see the isGraded wiring in S4 of the widget-matrix repair plan) — the
  // enum value is kept so existing rows stay readable.
  if (widgetType === 'CODE_PLAYGROUND') {
    return { displayConfig: rawConfig, resolvedAnswer: { widgetType: 'UNSUPPORTED' } };
  }

  return {
    displayConfig: rawConfig,
    resolvedAnswer: {
      widgetType: 'NUMERIC_OR_TEXT',
      correctAnswer: question.correctAnswer,
      isNumeric: question.questionType === 'numeric',
    },
  };
}

function substituteTemplate(
  template: string,
  values: Record<string, number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}
