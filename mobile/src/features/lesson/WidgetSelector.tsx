import React from 'react';
import { View } from 'react-native';

import type { CardQuestion } from '@/core/contracts';
import { Card } from '@/ui/primitives/Card';
import { Text } from '@/ui/primitives/Text';
import { CoordinatePlotterWidget, type CoordinatePlotterValue } from './CoordinatePlotterWidget';
import { GridMatchingWidget, type GridMatchingValue } from './GridMatchingWidget';
import { McqWidget } from './McqWidget';
import { ShapeShadingWidget, type ShapeShadingValue } from './ShapeShadingWidget';
import { SliderWidget } from './SliderWidget';

interface WidgetSelectorProps {
  question: CardQuestion;
  currentState: any;
  onStateChange: (state: any) => void;
  locked: boolean;
  isCorrect?: boolean;
  correctReveal?: { correctValue?: number };
}

/**
 * Prop contract mirrors the web WidgetSelector
 * (`client/src/features/clio/widgets/WidgetSelector.tsx`): `question`,
 * `currentState`, `onStateChange`, `locked`, `isCorrect`, `correctReveal`.
 * Only rendering differs per widget; state shapes are shared with the
 * server-side grader.
 *
 * `DRAG_AND_DROP_LABELS` and `CODE_PLAYGROUND` are deliberately unhandled —
 * both resolve to `UNSUPPORTED` server-side today
 * (`widget-generator.ts`'s `resolveLegacyInstance`), so any answer a widget
 * collected for them would always grade as incorrect regardless of what the
 * student did. Building interactive UI with no way to ever succeed would be
 * worse than the placeholder below.
 */
export function WidgetSelector({
  question,
  currentState,
  onStateChange,
  locked,
  isCorrect,
  correctReveal,
}: WidgetSelectorProps) {
  switch (question.widgetType) {
    case 'STANDARD_MCQ':
      return (
        <McqWidget
          question={question}
          selectedOptionId={currentState?.selectedOptionId ?? null}
          onSelect={(optionId) => onStateChange({ selectedOptionId: optionId })}
          locked={locked}
          isCorrect={isCorrect}
        />
      );

    case 'SLIDER_MANIPULATIVE':
      return (
        <SliderWidget
          config={question.widgetConfig as any}
          value={currentState?.finalValue ?? null}
          onChange={(finalValue) => onStateChange({ finalValue })}
          locked={locked}
          isCorrect={isCorrect}
          correctValue={correctReveal?.correctValue}
        />
      );

    case 'GRID_MATCHING':
      return (
        <GridMatchingWidget
          config={question.widgetConfig as any}
          value={(currentState as GridMatchingValue) ?? null}
          onChange={onStateChange}
          locked={locked}
          isCorrect={isCorrect}
        />
      );

    case 'COORDINATE_PLOTTER':
      return (
        <CoordinatePlotterWidget
          config={question.widgetConfig as any}
          value={(currentState as CoordinatePlotterValue) ?? null}
          onChange={onStateChange}
          locked={locked}
          isCorrect={isCorrect}
        />
      );

    case 'SHAPE_SHADING':
      return (
        <ShapeShadingWidget
          config={question.widgetConfig as any}
          value={(currentState as ShapeShadingValue) ?? null}
          onChange={onStateChange}
          locked={locked}
          isCorrect={isCorrect}
        />
      );

    default:
      return (
        <Card>
          <Text variant="label">
            {question.widgetType ?? 'This question type'} isn&apos;t supported on
            mobile yet
          </Text>
          <View style={{ height: 4 }} />
          <Text variant="caption" color="mutedForeground">
            Open this lesson on the web to answer it.
          </Text>
        </Card>
      );
  }
}
