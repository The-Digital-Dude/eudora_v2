import Slider from '@react-native-community/slider';
import React from 'react';
import { View } from 'react-native';

import { MathText } from '@/ui/primitives/MathText';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  unit?: string;
}

interface SliderWidgetProps {
  config: SliderConfig;
  value: number | null;
  onChange: (value: number) => void;
  locked: boolean;
  isCorrect?: boolean;
  /** Only present after an incorrect submission — mirrors web's reveal rule. */
  correctValue?: number;
}

/**
 * Config shape and grading contract mirror the web SliderWidget exactly
 * (`client/src/features/clio/widgets/SliderWidget.tsx`): `{min,max,step,unit?}`
 * in, a raw number out. The backend grader
 * (`services/api-service/src/common/widgets/widget-grader.ts`) reads the
 * answer from `interactionState.finalValue`, so the lesson player must submit
 * exactly that key — not `selectedOptionId`, which is MCQ-only.
 */
export function SliderWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
  correctValue,
}: SliderWidgetProps) {
  const t = useTheme();
  const { min, max, step, unit = '' } = config;
  const current = value ?? min;

  const showReveal = locked && isCorrect === false && correctValue !== undefined;

  return (
    <View
      style={{
        padding: t.spacing.xl,
        borderRadius: t.radius.xl,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.card,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          paddingHorizontal: t.spacing.md,
          paddingVertical: t.spacing.xs,
          borderRadius: t.radius.pill,
          backgroundColor: showReveal ? t.colors.destructive : t.colors.primary,
        }}
      >
        <Text
          variant="label"
          style={{
            color: showReveal
              ? t.colors.destructiveForeground
              : t.colors.primaryForeground,
          }}
        >
          {current}
          {unit}
        </Text>
      </View>

      <View style={{ height: t.spacing.sm }} />

      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={current}
        onValueChange={onChange}
        disabled={locked}
        minimumTrackTintColor={t.colors.primary}
        maximumTrackTintColor={t.colors.muted}
        thumbTintColor={t.colors.primary}
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
          marginTop: t.spacing.sm,
        }}
      >
        <Text variant="caption" color="mutedForeground">
          {min}
          {unit}
        </Text>
        <Text variant="caption" color="mutedForeground">
          {max}
          {unit}
        </Text>
      </View>

      {showReveal ? (
        <View style={{ marginTop: t.spacing.md }}>
          <MathText variant="caption" color="success">
            {`Correct answer: ${correctValue}${unit}`}
          </MathText>
        </View>
      ) : null}
    </View>
  );
}
