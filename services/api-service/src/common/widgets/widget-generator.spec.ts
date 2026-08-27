import { generateWidgetInstance, QuestionLike } from './widget-generator';

/**
 * Characterisation tests, written before the widget-matrix repair
 * (see the "Widget Matrix Repair" plan). Several assertions here pin
 * behaviour that plan deliberately changes — most importantly, the
 * `displayConfig LEAKS ...` tests below currently pass because
 * `resolveLegacyInstance` forwards the author's raw config (including the
 * answer key) straight to the client. That is a real defect, tracked
 * separately, and those specific assertions are expected to flip (not be
 * deleted) once the fix lands. Every other assertion in this file should
 * still hold afterward.
 */

function baseQuestion(overrides: Partial<QuestionLike> = {}): QuestionLike {
  return {
    questionType: 'interactive',
    correctAnswer: null,
    widgetType: null,
    widgetConfig: null,
    options: [],
    ...overrides,
  };
}

describe('generateWidgetInstance — legacy passthrough (v1 / unversioned configs)', () => {
  describe('STANDARD_MCQ', () => {
    it('resolves the correct option from the options list', () => {
      const question = baseQuestion({
        widgetType: 'STANDARD_MCQ',
        questionType: 'mcq',
        options: [
          { id: 'a', optionText: 'wrong', isCorrect: false },
          { id: 'b', optionText: 'right', isCorrect: true },
        ],
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'STANDARD_MCQ',
        correctOptionId: 'b',
      });
      expect(result.options).toEqual(question.options);
    });

    it('also resolves via questionType === "mcq" alone, with no widgetType set', () => {
      const question = baseQuestion({
        widgetType: null,
        questionType: 'mcq',
        options: [{ id: 'a', optionText: 'only', isCorrect: true }],
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'STANDARD_MCQ',
        correctOptionId: 'a',
      });
    });

    it('resolves to UNSUPPORTED when no option is marked correct', () => {
      const question = baseQuestion({
        widgetType: 'STANDARD_MCQ',
        questionType: 'mcq',
        options: [{ id: 'a', optionText: 'x', isCorrect: false }],
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({ widgetType: 'UNSUPPORTED' });
    });
  });

  describe('SLIDER_MANIPULATIVE (v1 — graded via question.correctAnswer, NOT widgetConfig.correctValue)', () => {
    it('resolves the target from correctAnswer when it parses', () => {
      const question = baseQuestion({
        widgetType: 'SLIDER_MANIPULATIVE',
        correctAnswer: '5',
        widgetConfig: { min: 0, max: 10, step: 1 },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'SLIDER_MANIPULATIVE',
        correctValue: 5,
        tolerance: 0.1,
      });
    });

    it('KNOWN BUG (see plan U3/S3): a widgetConfig.correctValue with no matching correctAnswer silently resolves to UNSUPPORTED', () => {
      const question = baseQuestion({
        widgetType: 'SLIDER_MANIPULATIVE',
        correctAnswer: null,
        // An author using the config-editor "Fixed Value" mode writes
        // correctValue here — but the v1 legacy branch never reads it.
        widgetConfig: { min: 0, max: 100, step: 1, unit: '', correctValue: 50 },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({ widgetType: 'UNSUPPORTED' });
    });

    it('resolves to UNSUPPORTED when correctAnswer does not parse as a number', () => {
      const question = baseQuestion({
        widgetType: 'SLIDER_MANIPULATIVE',
        correctAnswer: 'not-a-number',
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({ widgetType: 'UNSUPPORTED' });
    });

    it('LEAKS the answer: displayConfig is the raw config including correctValue (pre-fix behaviour)', () => {
      const question = baseQuestion({
        widgetType: 'SLIDER_MANIPULATIVE',
        correctAnswer: '5',
        widgetConfig: { min: 0, max: 10, step: 1, correctValue: 5 },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.displayConfig).toEqual({ min: 0, max: 10, step: 1, correctValue: 5 });
    });
  });

  describe('COORDINATE_PLOTTER', () => {
    it('resolves correctPoints and tolerance from widgetConfig, defaulting tolerance', () => {
      const question = baseQuestion({
        widgetType: 'COORDINATE_PLOTTER',
        widgetConfig: { correctPoints: [{ x: 1, y: 2 }] },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'COORDINATE_PLOTTER',
        correctPoints: [{ x: 1, y: 2 }],
        tolerance: 0.1,
      });
    });

    it('defaults to an empty answer key when widgetConfig is null', () => {
      const question = baseQuestion({ widgetType: 'COORDINATE_PLOTTER', widgetConfig: null });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'COORDINATE_PLOTTER',
        correctPoints: [],
        tolerance: 0.1,
      });
    });

    it('LEAKS the answer: displayConfig includes correctPoints and tolerance (pre-fix behaviour)', () => {
      const question = baseQuestion({
        widgetType: 'COORDINATE_PLOTTER',
        widgetConfig: {
          xRange: [-10, 10],
          yRange: [-10, 10],
          correctPoints: [{ x: 1, y: 2 }],
          tolerance: 0.5,
        },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.displayConfig).toEqual({
        xRange: [-10, 10],
        yRange: [-10, 10],
        correctPoints: [{ x: 1, y: 2 }],
        tolerance: 0.5,
      });
    });
  });

  describe('GRID_MATCHING', () => {
    it('resolves correctPairs from widgetConfig', () => {
      const question = baseQuestion({
        widgetType: 'GRID_MATCHING',
        widgetConfig: {
          left: [{ id: 'r1', text: '6:9' }],
          right: [{ id: 's1', text: '2:3' }],
          correctPairs: [['r1', 's1']],
        },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'GRID_MATCHING',
        correctPairs: [['r1', 's1']],
      });
    });

    it('LEAKS the answer: displayConfig includes correctPairs (pre-fix behaviour, matches live seed data)', () => {
      const question = baseQuestion({
        widgetType: 'GRID_MATCHING',
        widgetConfig: {
          left: [{ id: 'r1', text: '6:9' }],
          right: [{ id: 's1', text: '2:3' }],
          correctPairs: [['r1', 's1']],
        },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.displayConfig).toMatchObject({
        correctPairs: [['r1', 's1']],
      });
    });
  });

  describe('DRAG_AND_DROP_LABELS — graded as of the widget-matrix repair (S2)', () => {
    it('resolves correctPlacements keyed by target id', () => {
      const question = baseQuestion({
        widgetType: 'DRAG_AND_DROP_LABELS',
        widgetConfig: {
          labels: ['A', 'B'],
          targets: [
            { id: 't1', placeholder: '', correctLabel: 'A' },
            { id: 't2', placeholder: '', correctLabel: 'B' },
          ],
        },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'DRAG_AND_DROP_LABELS',
        correctPlacements: { t1: 'A', t2: 'B' },
      });
    });

    it('falls back to a target-<index> id when a target has none', () => {
      const question = baseQuestion({
        widgetType: 'DRAG_AND_DROP_LABELS',
        widgetConfig: {
          labels: ['A'],
          targets: [{ placeholder: '', correctLabel: 'A' }],
        },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'DRAG_AND_DROP_LABELS',
        correctPlacements: { 'target-0': 'A' },
      });
    });

    it('skips targets with no correctLabel — they are decorative, not part of the answer key', () => {
      const question = baseQuestion({
        widgetType: 'DRAG_AND_DROP_LABELS',
        widgetConfig: {
          labels: ['A'],
          targets: [
            { id: 't1', placeholder: '', correctLabel: 'A' },
            { id: 't2', placeholder: '' },
          ],
        },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'DRAG_AND_DROP_LABELS',
        correctPlacements: { t1: 'A' },
      });
    });

    it('resolves to UNSUPPORTED when no target carries a correctLabel at all', () => {
      const question = baseQuestion({
        widgetType: 'DRAG_AND_DROP_LABELS',
        widgetConfig: {
          labels: ['A', 'B'],
          targets: [{ id: 't1', placeholder: '' }],
        },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({ widgetType: 'UNSUPPORTED' });
    });

    it('resolves to UNSUPPORTED when there are no targets at all', () => {
      const question = baseQuestion({
        widgetType: 'DRAG_AND_DROP_LABELS',
        widgetConfig: { labels: ['A', 'B'], targets: [] },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({ widgetType: 'UNSUPPORTED' });
    });

    it('ignores legacy plain-string targets rather than throwing', () => {
      const question = baseQuestion({
        widgetType: 'DRAG_AND_DROP_LABELS',
        widgetConfig: { labels: ['A'], targets: ['Solve 3 + ___'] },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({ widgetType: 'UNSUPPORTED' });
    });

    it('still LEAKS the answer for now: displayConfig includes each target correctLabel (fixed in S3)', () => {
      const question = baseQuestion({
        widgetType: 'DRAG_AND_DROP_LABELS',
        widgetConfig: {
          labels: ['A', 'B'],
          targets: [{ id: 't1', placeholder: '', correctLabel: 'A' }],
        },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.displayConfig).toMatchObject({
        targets: [{ id: 't1', placeholder: '', correctLabel: 'A' }],
      });
    });
  });

  describe('CODE_PLAYGROUND — retired, resolves to UNSUPPORTED', () => {
    it('never grades', () => {
      const question = baseQuestion({
        widgetType: 'CODE_PLAYGROUND',
        widgetConfig: { language: 'javascript', starterCode: '', tests: [] },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({ widgetType: 'UNSUPPORTED' });
    });
  });

  describe('SHAPE_SHADING — no config, not yet listed in the picker (unrelated to the v1 path below)', () => {
    it('is unreachable through the legacy path because it always carries a v2 config (see the v2 describe block)', () => {
      // SHAPE_SHADING has no legacy data — every row is authored with
      // configVersion: 2. There is deliberately no v1 case for it in
      // resolveLegacyInstance.
      expect(true).toBe(true);
    });
  });

  describe('fallback — NUMERIC_OR_TEXT for anything else (including an unset widgetType)', () => {
    it('resolves correctAnswer and isNumeric off the base question fields', () => {
      const question = baseQuestion({
        widgetType: null,
        questionType: 'numeric',
        correctAnswer: '42',
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.resolvedAnswer).toEqual({
        widgetType: 'NUMERIC_OR_TEXT',
        correctAnswer: '42',
        isNumeric: true,
      });
    });

    it('LEAKS the answer here too: displayConfig is the raw widgetConfig, unrelated to correctAnswer', () => {
      const question = baseQuestion({
        widgetType: null,
        questionType: 'text',
        correctAnswer: 'Paris',
        widgetConfig: { hint: 'a city in France' },
      });
      const result = generateWidgetInstance(question, 1);
      expect(result.displayConfig).toEqual({ hint: 'a city in France' });
    });
  });
});

describe('generateWidgetInstance — v2 configs (already correct; the pattern S3 copies)', () => {
  it('SLIDER_MANIPULATIVE fixed mode narrows displayConfig and keeps correctValue server-side', () => {
    const question = baseQuestion({
      widgetType: 'SLIDER_MANIPULATIVE',
      widgetConfig: {
        configVersion: 2,
        mode: 'fixed',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        correctValue: 42,
        tolerance: 3,
      },
    });
    const result = generateWidgetInstance(question, 1);
    expect(result.displayConfig).toEqual({ min: 0, max: 100, step: 1, unit: '%' });
    expect(result.resolvedAnswer).toEqual({
      widgetType: 'SLIDER_MANIPULATIVE',
      correctValue: 42,
      tolerance: 3,
    });
  });

  it('SLIDER_MANIPULATIVE parameterized mode is deterministic per seed', () => {
    const question = baseQuestion({
      widgetType: 'SLIDER_MANIPULATIVE',
      widgetConfig: {
        configVersion: 2,
        mode: 'parameterized',
        params: {
          given: { min: 0, max: 10, step: 1, unit: '' },
          hidden: { correctValue: { min: 1, max: 9 } },
        },
        tolerance: 0.5,
      },
    });
    const a = generateWidgetInstance(question, 12345);
    const b = generateWidgetInstance(question, 12345);
    const c = generateWidgetInstance(question, 99999);
    expect(a.resolvedAnswer).toEqual(b.resolvedAnswer);
    expect(a.displayConfig).toEqual({ min: 0, max: 10, step: 1, unit: '' });
    // Not a strict inequality assertion on the value itself (a different
    // seed could coincidentally land on the same integer) — the contract
    // being pinned is determinism per seed, shown by the a === b check above.
    expect(c.resolvedAnswer.widgetType).toBe('SLIDER_MANIPULATIVE');
  });

  it('SHAPE_SHADING passes the config straight through with no answer-key secrecy (by design)', () => {
    const question = baseQuestion({
      widgetType: 'SHAPE_SHADING',
      widgetConfig: {
        configVersion: 2,
        mode: 'fixed',
        shape: { kind: 'bar', regions: 6 },
        targetNumerator: 2,
        requireContiguous: true,
      },
    });
    const result = generateWidgetInstance(question, 1);
    expect(result.displayConfig).toEqual({
      shape: { kind: 'bar', regions: 6 },
      targetNumerator: 2,
      requireContiguous: true,
    });
    expect(result.resolvedAnswer).toEqual({
      widgetType: 'SHAPE_SHADING',
      targetNumerator: 2,
      totalRegions: 6,
      shapeKind: 'bar',
      requireContiguous: true,
    });
  });

  it('STANDARD_MCQ parameterized generates options, resolves the correct one, and hides the secret from the prompt', () => {
    const question = baseQuestion({
      widgetType: 'STANDARD_MCQ',
      questionType: 'mcq',
      widgetConfig: {
        configVersion: 2,
        mode: 'parameterized',
        params: {
          given: { a: { min: 2, max: 2 }, b: { min: 3, max: 3 } },
          secret: { x: { min: 5, max: 5 } },
          derived: { c: 'a * x + b' },
        },
        display: { template: 'Solve: {a}x + {b} = {c}. What is x?' },
        answerKey: { correct: 'x' },
        distractors: [{ expr: 'x + 1' }],
      },
    });
    const result = generateWidgetInstance(question, 1);
    // The prompt interpolates only `given` (a, b) and `derived` (c) — the
    // secret `x` itself never reaches the template, which is the whole
    // point of the given/secret/derived split.
    expect(result.displayConfig).toEqual({ prompt: 'Solve: 2x + 3 = 13. What is x?' });
    const options = result.options!;
    expect(options).toHaveLength(2);
    const correctOption = options.find((o) => o.isCorrect);
    expect(correctOption?.optionText).toBe('5');
    expect(result.resolvedAnswer).toEqual({
      widgetType: 'STANDARD_MCQ',
      correctOptionId: correctOption!.id,
    });
  });
});
