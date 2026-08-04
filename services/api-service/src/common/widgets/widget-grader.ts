import { ResolvedAnswer } from './widget-generator';

export interface WidgetSubmission {
  selectedOptionId?: string | null;
  responseText?: string | null;
  interactionState?: {
    finalValue?: number;
    points?: { x: number; y: number }[];
    pairs?: [string, string][];
    [key: string]: unknown;
  } | null;
}

export interface GradeResult {
  isCorrect?: boolean;
  // The correct-answer reveal data for widgets whose answer isn't already
  // visible client-side pre-submission (unlike MCQ, where every option's
  // `isCorrect` flag is already sent up front) — callers should only forward
  // this to the client after a submission, never before.
  correctReveal?: unknown;
}

// The single grading implementation shared by LessonsService.submitCardResponse
// and assessments.common.ts's autoMarkResponse — replaces the two independent,
// already-divergent branches that used to live in each.
export function gradeWidgetSubmission(
  resolvedAnswer: ResolvedAnswer,
  submission: WidgetSubmission,
): GradeResult {
  switch (resolvedAnswer.widgetType) {
    case 'STANDARD_MCQ':
      return {
        isCorrect: submission.selectedOptionId === resolvedAnswer.correctOptionId,
      };

    case 'SLIDER_MANIPULATIVE': {
      const raw = submission.interactionState?.finalValue;
      const inputVal = raw === undefined || raw === null ? NaN : Number(raw);
      if (Number.isNaN(inputVal)) {
        return { isCorrect: false };
      }
      return {
        isCorrect:
          Math.abs(inputVal - resolvedAnswer.correctValue) <= resolvedAnswer.tolerance,
        correctReveal: { correctValue: resolvedAnswer.correctValue },
      };
    }

    case 'COORDINATE_PLOTTER': {
      const studentPoints = submission.interactionState?.points ?? [];
      const { correctPoints, tolerance } = resolvedAnswer;
      if (correctPoints.length !== studentPoints.length) {
        return { isCorrect: false };
      }
      const allMatched = correctPoints.every((cp) =>
        studentPoints.some((sp) => Math.hypot(cp.x - sp.x, cp.y - sp.y) <= tolerance),
      );
      return { isCorrect: allMatched };
    }

    case 'GRID_MATCHING': {
      const studentPairs = submission.interactionState?.pairs ?? [];
      const { correctPairs } = resolvedAnswer;
      if (correctPairs.length !== studentPairs.length) {
        return { isCorrect: false };
      }
      const allMatched = correctPairs.every(([left, right]) =>
        studentPairs.some(
          ([sl, sr]) => (sl === left && sr === right) || (sl === right && sr === left),
        ),
      );
      return { isCorrect: allMatched };
    }

    case 'NUMERIC_OR_TEXT': {
      const cleanCorrect = (resolvedAnswer.correctAnswer ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
      if (!cleanCorrect) {
        return {};
      }
      const cleanResponse = (submission.responseText ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

      if (resolvedAnswer.isNumeric) {
        const numResponse = parseFloat(cleanResponse);
        const numCorrect = parseFloat(cleanCorrect);
        if (!Number.isNaN(numResponse) && !Number.isNaN(numCorrect)) {
          return { isCorrect: Math.abs(numResponse - numCorrect) <= 0.001 };
        }
      }
      return { isCorrect: cleanResponse === cleanCorrect };
    }

    case 'UNSUPPORTED':
    default:
      return {};
  }
}
