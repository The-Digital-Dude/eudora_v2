import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export interface GridMatchingConfig {
  left: { id: string; text: string }[];
  right: { id: string; text: string }[];
  correctPairs: [string, string][];
}

export type GridMatchingValue = { pairs: [string, string][] };

interface GridMatchingWidgetProps {
  config: GridMatchingConfig;
  value: GridMatchingValue | null;
  onChange: (value: GridMatchingValue) => void;
  locked: boolean;
  isCorrect?: boolean;
}

/**
 * Tap-to-pair only — the web widget also supports HTML5 drag-and-drop, which
 * has no RN equivalent and, per the mobile architecture plan, wouldn't work
 * with a TV remote anyway. Tap-to-select-then-place is the primary
 * interaction on web too (`client/src/features/clio/widgets/
 * GridMatchingWidget.tsx`'s click-to-match path), just demoted there to a
 * fallback; here it's promoted to the only path. Config/value shapes match
 * exactly, so the server-side grader
 * (`widget-grader.ts`'s `GRID_MATCHING` case, which reads
 * `interactionState.pairs`) needs no changes.
 */
export function GridMatchingWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
}: GridMatchingWidgetProps) {
  const t = useTheme();
  const { left, right, correctPairs } = config;
  const pairs = value?.pairs ?? [];

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);

  const rightToLeft = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [l, r] of pairs) map[r] = l;
    return map;
  }, [pairs]);

  const matchedLeftIds = useMemo(
    () => new Set(pairs.map(([l]) => l)),
    [pairs],
  );

  const correctRightForLeft = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [l, r] of correctPairs) map[l] = r;
    return map;
  }, [correctPairs]);

  const availableLeft = left.filter((item) => !matchedLeftIds.has(item.id));

  const handleLeftPress = (id: string) => {
    if (locked) return;
    setSelectedLeftId((prev) => (prev === id ? null : id));
  };

  const handleRightPress = (rightId: string) => {
    if (locked) return;
    const matchedLeftId = rightToLeft[rightId];

    if (matchedLeftId) {
      onChange({ pairs: pairs.filter(([, r]) => r !== rightId) });
      setSelectedLeftId(null);
      return;
    }

    if (selectedLeftId) {
      onChange({
        pairs: [
          ...pairs.filter(([l]) => l !== selectedLeftId),
          [selectedLeftId, rightId],
        ],
      });
      setSelectedLeftId(null);
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
          {isCorrect ? 'All matches correct!' : 'Some matches are incorrect'}
        </Text>
      ) : (
        <Text variant="caption" color="mutedForeground" style={{ textAlign: 'center' }}>
          {selectedLeftId ? 'Tap a slot to match it' : 'Tap an item, then tap its match'}
        </Text>
      )}

      <View>
        <Text variant="caption" color="mutedForeground" style={{ marginBottom: t.spacing.sm }}>
          AVAILABLE
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          {availableLeft.length === 0 ? (
            <Text variant="caption" color="mutedForeground">
              All items matched.
            </Text>
          ) : (
            availableLeft.map((item) => {
              const selected = selectedLeftId === item.id;
              return (
                <Pressable
                  key={item.id}
                  disabled={locked}
                  onPress={() => handleLeftPress(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: locked }}
                  style={{
                    paddingVertical: t.spacing.sm,
                    paddingHorizontal: t.spacing.md,
                    borderRadius: t.radius.md,
                    borderWidth: 2,
                    borderColor: selected ? t.colors.primary : t.colors.border,
                    backgroundColor: selected ? t.colors.primary : t.colors.card,
                    opacity: locked ? 0.5 : 1,
                  }}
                >
                  <Text
                    variant="label"
                    style={{ color: selected ? t.colors.primaryForeground : t.colors.foreground }}
                  >
                    {item.text}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      <View>
        <Text variant="caption" color="mutedForeground" style={{ marginBottom: t.spacing.sm }}>
          MATCH TO
        </Text>
        <View style={{ gap: t.spacing.sm }}>
          {right.map((rItem) => {
            const matchedLeftId = rightToLeft[rItem.id];
            const matchedLeft = left.find((l) => l.id === matchedLeftId);

            let borderColor = t.colors.border;
            if (locked && matchedLeftId) {
              const isPairCorrect = correctRightForLeft[matchedLeftId] === rItem.id;
              borderColor = isPairCorrect ? t.colors.success : t.colors.destructive;
            }

            return (
              <View key={rItem.id}>
                <Pressable
                  disabled={locked}
                  onPress={() => handleRightPress(rItem.id)}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: t.spacing.md,
                    minHeight: 52,
                    padding: t.spacing.md,
                    borderRadius: t.radius.md,
                    borderWidth: 2,
                    borderColor,
                    backgroundColor: t.colors.card,
                  }}
                >
                  <Text variant="label">{rItem.text}</Text>
                  {matchedLeft ? (
                    <View
                      style={{
                        paddingVertical: t.spacing.xs,
                        paddingHorizontal: t.spacing.sm,
                        borderRadius: t.radius.sm,
                        backgroundColor: t.colors.primary,
                      }}
                    >
                      <Text variant="caption" style={{ color: t.colors.primaryForeground }}>
                        {matchedLeft.text}
                      </Text>
                    </View>
                  ) : (
                    <Text variant="caption" color="mutedForeground">
                      {selectedLeftId ? 'Tap to match' : 'Empty'}
                    </Text>
                  )}
                </Pressable>

                {locked && isCorrect === false ? (
                  <Text
                    variant="caption"
                    color="mutedForeground"
                    style={{ marginTop: t.spacing.xs, marginLeft: t.spacing.xs }}
                  >
                    Correct match:{' '}
                    {left.find((l) => correctRightForLeft[l.id] === rItem.id)?.text ?? 'None'}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
