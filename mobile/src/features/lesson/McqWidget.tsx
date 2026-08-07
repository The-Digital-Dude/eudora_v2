import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { CardQuestion } from '@/core/contracts';
import { MathText } from '@/ui/primitives/MathText';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface McqWidgetProps {
  question: CardQuestion;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  /** Frozen once answered, so the reveal cannot be edited. */
  locked: boolean;
  isCorrect?: boolean;
}

/**
 * Prop contract intentionally mirrors the web WidgetSelector
 * (`question`, current state, `onStateChange`, `locked`, `isCorrect`) — answer
 * shapes are shared with the server-side grader, only rendering differs.
 */
export function McqWidget({
  question,
  selectedOptionId,
  onSelect,
  locked,
  isCorrect,
}: McqWidgetProps) {
  const t = useTheme();
  // Focus (not selection) — tracked separately so a D-pad remote gets visible
  // feedback while moving between options, before a selection is ever made.
  const [focusedOptionId, setFocusedOptionId] = useState<string | null>(null);

  return (
    <View style={{ gap: t.spacing.md }}>
      {question.options.map((option, index) => {
        const selected = option.id === selectedOptionId;
        const focused = option.id === focusedOptionId;

        // Correctness is only revealed after submitting; before that the
        // isCorrect flag on the option is never consulted.
        let borderColor = t.colors.border;
        let backgroundColor = t.colors.card;
        if (locked && selected) {
          borderColor = isCorrect ? t.colors.success : t.colors.destructive;
          backgroundColor = (isCorrect ? t.colors.success : t.colors.destructive) + '14';
        } else if (locked && option.isCorrect) {
          borderColor = t.colors.success;
          backgroundColor = t.colors.success + '14';
        } else if (selected) {
          borderColor = t.colors.primary;
          backgroundColor = t.colors.accent;
        } else if (focused) {
          borderColor = t.colors.primary;
        }

        return (
          <Pressable
            key={option.id}
            disabled={locked}
            onPress={() => onSelect(option.id)}
            // TV/D-pad: focusable is a no-op on phone/tablet (Pressable already
            // supports it there), hasTVPreferredFocus seeds the first option as
            // the initial focus target so a fresh screen never has orphaned focus.
            focusable={!locked}
            hasTVPreferredFocus={index === 0}
            onFocus={() => setFocusedOptionId(option.id)}
            onBlur={() => setFocusedOptionId((current) => (current === option.id ? null : current))}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: locked }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.md,
              padding: t.spacing.lg,
              borderRadius: t.radius.lg,
              borderWidth: 2,
              borderColor,
              backgroundColor,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: t.radius.pill,
                borderWidth: 2,
                borderColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="caption" color="mutedForeground">
                {option.optionLabel}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <MathText variant="body">{option.optionText}</MathText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
