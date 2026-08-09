import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export interface ShapeShadingConfig {
  shape: { kind: 'polygon'; regions: number } | { kind: 'bar'; regions: number };
  targetNumerator: number;
  requireContiguous?: boolean;
}

export type ShapeShadingValue = { shadedRegionIds: string[] };

interface ShapeShadingWidgetProps {
  config: ShapeShadingConfig;
  value: ShapeShadingValue | null;
  onChange: (value: ShapeShadingValue) => void;
  locked: boolean;
  isCorrect?: boolean;
}

const SIZE = 240;

/**
 * Discrete tap-to-toggle on precomputed regions — not freeform drawing, so
 * it's much closer to `GridMatchingWidget`'s simple tap-target pattern than
 * to a drawing surface. `bar` needs no geometry at all (a row of Pressables);
 * `polygon` needs real wedge trig via `react-native-svg`, but each wedge
 * is its own `<Polygon onPress>` target rather than one canvas needing
 * tap-to-coordinate conversion — so it doesn't hit the same class of bug
 * `CoordinatePlotterWidget` did (that one needs a single continuous
 * coordinate space from one tap; this one only needs "which shape was
 * tapped," which per-shape `onPress` gives directly).
 */
export function ShapeShadingWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
}: ShapeShadingWidgetProps) {
  const t = useTheme();
  const shadedRegionIds = value?.shadedRegionIds ?? [];

  const toggle = (id: string) => {
    if (locked) return;
    const next = shadedRegionIds.includes(id)
      ? shadedRegionIds.filter((r) => r !== id)
      : [...shadedRegionIds, id];
    onChange({ shadedRegionIds: next });
  };

  const regionColor = (id: string) => {
    const shaded = shadedRegionIds.includes(id);
    if (!shaded) return t.colors.card;
    if (!locked) return t.colors.primary;
    return isCorrect ? t.colors.success : t.colors.destructive;
  };

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
      <Text variant="label">
        {shadedRegionIds.length} / {config.shape.regions} shaded
        {' · target: '}
        {config.targetNumerator} / {config.shape.regions}
      </Text>
      <View style={{ height: t.spacing.lg }} />

      {config.shape.kind === 'bar' ? (
        <BarShading regions={config.shape.regions} regionColor={regionColor} onToggle={toggle} locked={locked} />
      ) : (
        <PolygonShading regions={config.shape.regions} regionColor={regionColor} onToggle={toggle} locked={locked} />
      )}

      {locked && isCorrect !== undefined ? (
        <>
          <View style={{ height: t.spacing.md }} />
          <Text variant="label" color={isCorrect ? 'success' : 'destructive'}>
            {isCorrect ? 'Correct!' : 'Not quite'}
          </Text>
        </>
      ) : null}
    </View>
  );
}

function BarShading({
  regions,
  regionColor,
  onToggle,
  locked,
}: {
  regions: number;
  regionColor: (id: string) => string;
  onToggle: (id: string) => void;
  locked: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', width: '100%', height: 72, gap: 2 }}>
      {Array.from({ length: regions }).map((_, i) => {
        const id = `region-${i}`;
        return (
          <Pressable
            key={id}
            onPress={() => onToggle(id)}
            disabled={locked}
            style={{
              flex: 1,
              backgroundColor: regionColor(id),
              borderWidth: 2,
              borderColor: t.colors.border,
              borderRadius: t.radius.sm,
            }}
          />
        );
      })}
    </View>
  );
}

function PolygonShading({
  regions,
  regionColor,
  onToggle,
  locked,
}: {
  regions: number;
  regionColor: (id: string) => string;
  onToggle: (id: string) => void;
  locked: boolean;
}) {
  const t = useTheme();
  const center = SIZE / 2;
  const radius = SIZE / 2 - 4;

  const vertex = (i: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / regions;
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
  };

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {Array.from({ length: regions }).map((_, i) => {
        const id = `region-${i}`;
        const a = vertex(i);
        const b = vertex((i + 1) % regions);
        const points = `${center},${center} ${a.x},${a.y} ${b.x},${b.y}`;
        return (
          <Polygon
            key={id}
            points={points}
            fill={regionColor(id)}
            stroke={t.colors.border}
            strokeWidth={1.5}
            onPress={locked ? undefined : () => onToggle(id)}
          />
        );
      })}
    </Svg>
  );
}
