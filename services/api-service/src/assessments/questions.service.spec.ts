import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  // previewWidgetInstance is stateless — it never touches Prisma — so a stub
  // is enough to construct the service under test.
  const service = new QuestionsService({} as any);

  describe('previewWidgetInstance', () => {
    it('still resolves a parameterized STANDARD_MCQ config (pre-existing behavior)', () => {
      const result = service.previewWidgetInstance({
        widgetType: 'STANDARD_MCQ' as any,
        widgetConfig: {
          configVersion: 2,
          mode: 'parameterized',
          params: { given: { a: { min: 2, max: 9 } }, secret: {}, derived: {} },
          display: { template: 'What is {a}?' },
          answerKey: { correct: 'a' },
          distractors: [{ expr: 'a + 1' }],
        },
        seed: 1,
      });

      expect(result.resolvedAnswer.widgetType).toBe('STANDARD_MCQ');
      expect(result.options?.length).toBeGreaterThan(0);
    });

    it('resolves a non-MCQ widget instead of falling into the MCQ branch and returning UNSUPPORTED', () => {
      // Before the fix, previewWidgetInstance hardcoded questionType: 'mcq',
      // which satisfied resolveLegacyInstance's
      // `widgetType === 'STANDARD_MCQ' || questionType === 'mcq'` check for
      // every widget type — so a COORDINATE_PLOTTER preview took the MCQ
      // path (with no options to find a correct one among) and always came
      // back UNSUPPORTED, regardless of the config.
      const result = service.previewWidgetInstance({
        widgetType: 'COORDINATE_PLOTTER' as any,
        widgetConfig: {
          xRange: [-5, 5],
          yRange: [-5, 5],
          gridStep: 1,
          correctPoints: [{ x: 2, y: 2 }],
          tolerance: 0.1,
        },
        seed: 1,
      });

      expect(result.resolvedAnswer.widgetType).toBe('COORDINATE_PLOTTER');
      expect(result.resolvedAnswer).toMatchObject({
        widgetType: 'COORDINATE_PLOTTER',
        correctPoints: [{ x: 2, y: 2 }],
      });
    });

    it('resolves GRID_MATCHING the same way', () => {
      const result = service.previewWidgetInstance({
        widgetType: 'GRID_MATCHING' as any,
        widgetConfig: {
          left: [{ id: 'l1', text: 'Left' }],
          right: [{ id: 'r1', text: 'Right' }],
          correctPairs: [['l1', 'r1']],
        },
        seed: 1,
      });

      expect(result.resolvedAnswer.widgetType).toBe('GRID_MATCHING');
    });
  });
});
