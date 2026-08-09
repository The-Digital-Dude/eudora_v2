import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

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

      {Platform.isTV ? (
        <TvStepper min={min} max={max} step={step} value={current} onChange={onChange} locked={locked} />
      ) : (
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
      )}

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

/**
 * `@react-native-community/slider` is a native control with no D-pad
 * affordance at all — you can't focus-and-drag a physical thumb with a
 * remote. This replaces it on the TV target only (`Platform.isTV`) with two
 * focusable step buttons, which D-pad left/right can move between and OK can
 * press, using nothing beyond standard Pressable focus handling.
 */
function TvStepper({
  min,
  max,
  step,
  value,
  onChange,
  locked,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  locked: boolean;
}) {
  const t = useTheme();
  const [focused, setFocused] = useState<'decrement' | 'increment' | null>(null);
  const pct = max > min ? (value - min) / (max - min) : 0;

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <View style={{ width: '100%', gap: t.spacing.md }}>
      <View
        style={{
          height: 8,
          borderRadius: t.radius.pill,
          backgroundColor: t.colors.muted,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            backgroundColor: t.colors.primary,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: t.spacing.xl }}>
        <StepperButton
          label="−"
          disabled={locked || value <= min}
          focused={focused === 'decrement'}
          onFocus={() => setFocused('decrement')}
          onBlur={() => setFocused((c) => (c === 'decrement' ? null : c))}
          onPress={() => onChange(clamp(value - step))}
        />
        <StepperButton
          label="+"
          disabled={locked || value >= max}
          focused={focused === 'increment'}
          onFocus={() => setFocused('increment')}
          onBlur={() => setFocused((c) => (c === 'increment' ? null : c))}
          onPress={() => onChange(clamp(value + step))}
        />
      </View>
    </View>
  );
}

function StepperButton({
  label,
  disabled,
  focused,
  onFocus,
  onBlur,
  onPress,
}: {
  label: string;
  disabled: boolean;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      disabled={disabled}
      focusable={!disabled}
      onFocus={onFocus}
      onBlur={onBlur}
      onPress={onPress}
      accessibilityRole="adjustable"
      style={{
        width: 56,
        height: 56,
        borderRadius: t.radius.pill,
        borderWidth: 2,
        borderColor: focused ? t.colors.primary : t.colors.border,
        backgroundColor: t.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text variant="title" color={focused ? 'primary' : 'foreground'}>
        {label}
      </Text>
    </Pressable>
  );
}
