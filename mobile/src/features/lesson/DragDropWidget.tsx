import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export interface DragDropConfig {
  labels: string[];
  targets: Array<{ id: string; placeholder: string; label?: string } | string>;
}

export type DragDropValue = { placements: Record<string, string> };

interface DragDropWidgetProps {
  config: DragDropConfig;
  value: DragDropValue | null;
  onChange: (value: DragDropValue) => void;
  locked: boolean;
  isCorrect?: boolean;
}

/**
 * Tap-to-select-then-place only — the web widget's other interaction is
 * HTML5 drag-and-drop, which has no RN equivalent and, per the mobile
 * architecture plan, wouldn't work with a TV remote anyway. Tap-to-place is
 * already the primary interaction on web too
 * (`client/src/features/clio/widgets/DragDropWidget.tsx`'s
 * `handleLabelClick`/`handleTargetClick`), just demoted there to a fallback
 * beside drag; here, same as `GridMatchingWidget`, it's promoted to the only
 * path. Config/value shapes match the server-side grader exactly
 * (`widget-grader.ts`'s `DRAG_AND_DROP_LABELS` case reads
 * `interactionState.placements`), so nothing server-side changes.
 *
 * The grader only ever returns `{ isCorrect }` for this widget type — no
 * `correctReveal` (see widget-grader.ts: only targets carrying an authored
 * `correctLabel` are graded, and which ones those were isn't sent back) — so
 * there's no per-slot correct/incorrect color to show after submission,
 * same limitation the web widget lives with. The aggregate `isCorrect`
 * banner below is the one thing mobile has that web doesn't: every other
 * ported widget here (`GridMatchingWidget`, `ShapeShadingWidget`) shows one,
 * so this stays consistent with the rest of the mobile lesson player rather
 * than with this one web component.
 */
export function DragDropWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
}: DragDropWidgetProps) {
  const t = useTheme();
  const { labels = [], targets = [] } = config;
  const placements = value?.placements ?? {};

  const normalizedTargets = targets.map((target, idx) =>
    typeof target === 'string'
      ? { id: `target-${idx}`, placeholder: target }
      : {
          id: target.id ?? `target-${idx}`,
          placeholder: target.placeholder ?? target.label ?? '',
        },
  );

  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const placedLabels = Object.values(placements);
  const availableLabels = labels.filter((label) => !placedLabels.includes(label));

  const handleLabelPress = (label: string) => {
    if (locked) return;
    setSelectedLabel((prev) => (prev === label ? null : label));
  };

  const handleTargetPress = (targetId: string) => {
    if (locked) return;

    if (placements[targetId]) {
      const next = { ...placements };
      delete next[targetId];
      onChange({ placements: next });
      setSelectedLabel(null);
      return;
    }

    if (selectedLabel) {
      onChange({ placements: { ...placements, [targetId]: selectedLabel } });
      setSelectedLabel(null);
    }
  };

  return (
    <View style={{ gap: t.spacing.lg }}>
      {locked && isCorrect !== undefined ? (
        <Text
          variant="label"
          color={isCorrect ? 'success' : 'destructive'}
          style={{ textAlign: 'center' }}
        >
          {isCorrect ? 'All placements correct!' : 'Some placements are incorrect'}
        </Text>
      ) : (
        <Text variant="caption" color="mutedForeground" style={{ textAlign: 'center' }}>
          {selectedLabel ? 'Tap a slot to place it' : 'Tap an item, then tap a slot'}
        </Text>
      )}

      <View style={{ gap: t.spacing.sm }}>
        {normalizedTargets.map((target, index) => {
          const placedLabel = placements[target.id];
          const focused = focusedId === target.id;

          return (
            <Pressable
              key={target.id}
              disabled={locked}
              onPress={() => handleTargetPress(target.id)}
              focusable={!locked}
              hasTVPreferredFocus={index === 0}
              onFocus={() => setFocusedId(target.id)}
              onBlur={() => setFocusedId((current) => (current === target.id ? null : current))}
              accessibilityRole="button"
              accessibilityState={{ disabled: locked }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: t.spacing.md,
                minHeight: 56,
                padding: t.spacing.md,
                borderRadius: t.radius.md,
                borderWidth: 2,
                borderStyle: placedLabel ? 'solid' : 'dashed',
                borderColor: focused ? t.colors.primary : t.colors.border,
                backgroundColor: placedLabel ? t.colors.card : 'transparent',
                opacity: locked ? 0.75 : 1,
              }}
            >
              <Text variant="caption" color="mutedForeground">
                {target.placeholder}
              </Text>

              {placedLabel ? (
                <View
                  style={{
                    paddingVertical: t.spacing.xs,
                    paddingHorizontal: t.spacing.sm,
                    borderRadius: t.radius.sm,
                    backgroundColor: t.colors.primary,
                  }}
                >
                  <Text variant="caption" style={{ color: t.colors.primaryForeground }}>
                    {placedLabel}
                  </Text>
                </View>
              ) : (
                <Text variant="caption" color="mutedForeground">
                  {selectedLabel ? 'Tap to place' : 'Empty'}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {availableLabels.length > 0 ? (
        <View>
          <Text variant="caption" color="mutedForeground" style={{ marginBottom: t.spacing.sm }}>
            AVAILABLE
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
            {availableLabels.map((label) => {
              const selected = selectedLabel === label;
              const focused = focusedId === `label-${label}`;

              return (
                <Pressable
                  key={label}
                  disabled={locked}
                  onPress={() => handleLabelPress(label)}
                  focusable={!locked}
                  onFocus={() => setFocusedId(`label-${label}`)}
                  onBlur={() =>
                    setFocusedId((current) => (current === `label-${label}` ? null : current))
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: locked }}
                  style={{
                    paddingVertical: t.spacing.sm,
                    paddingHorizontal: t.spacing.md,
                    borderRadius: t.radius.md,
                    borderWidth: 2,
                    borderColor: selected ? t.colors.primary : focused ? t.colors.primary : t.colors.border,
                    backgroundColor: selected ? t.colors.primary : t.colors.card,
                    opacity: locked ? 0.5 : 1,
                  }}
                >
                  <Text
                    variant="label"
                    style={{ color: selected ? t.colors.primaryForeground : t.colors.foreground }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
