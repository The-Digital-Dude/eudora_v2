import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';

export interface CoordinatePlotterConfig {
  xRange?: [number, number];
  yRange?: [number, number];
  gridStep?: number;
  correctPoints?: { x: number; y: number }[];
  tolerance?: number;
}

export type CoordinatePlotterValue = { points: { x: number; y: number }[] };

interface CoordinatePlotterWidgetProps {
  config: CoordinatePlotterConfig;
  value: CoordinatePlotterValue | null;
  onChange: (value: CoordinatePlotterValue) => void;
  locked: boolean;
  isCorrect?: boolean;
}

const SIZE = 320;

/**
 * Ports `client/src/features/clio/widgets/CoordinatePlotterWidget.tsx`'s
 * exact behavior (coordinate conversion, snap-to-grid, tap-to-toggle,
 * locked/incorrect review overlay) rather than redesigning it — the config
 * shape and grading (`widget-grader.ts`'s `COORDINATE_PLOTTER` case) already
 * exist and are unchanged by this port.
 *
 * The one real RN-vs-web difference: web reads tap position from a DOM click
 * event's `clientX/clientY`; RN has no direct equivalent. The first attempt
 * used `nativeEvent.locationX/locationY` (position relative to whichever
 * element received the touch) with `pointerEvents="none"` on the `<Svg>` to
 * force every tap onto the outer `Pressable` — but `react-native-svg`'s web
 * wrapper doesn't forward `pointerEvents` to the underlying DOM node
 * (confirmed live: `getComputedStyle(svg).pointerEvents` stayed `"auto"`),
 * so a tap landing on an already-rendered `Circle`/`Line` got coordinates
 * relative to THAT shape instead — found via live testing, where re-tapping
 * a plotted point added a wrong new point instead of removing it. Fixed by
 * using `nativeEvent.pageX/pageY` (always page-absolute, regardless of which
 * nested element was hit) minus the container's own measured page position —
 * this doesn't depend on any pointer-events cascading behavior at all, so
 * it's correct cross-platform, not just a web patch.
 */
export function CoordinatePlotterWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
}: CoordinatePlotterWidgetProps) {
  const t = useTheme();
  const [xMin, xMax] = config.xRange ?? [-10, 10];
  const [yMin, yMax] = config.yRange ?? [-10, 10];
  const gridStep = config.gridStep ?? 1;
  const tolerance = config.tolerance ?? 0.1;
  const correctPoints = config.correctPoints ?? [];
  const points = value?.points ?? [];
  const containerRef = useRef<View>(null);

  const toSvgX = (x: number) => ((x - xMin) / (xMax - xMin)) * SIZE;
  const toSvgY = (y: number) => ((yMax - y) / (yMax - yMin)) * SIZE;
  const fromSvgX = (svgX: number) => xMin + (svgX / SIZE) * (xMax - xMin);
  const fromSvgY = (svgY: number) => yMax - (svgY / SIZE) * (yMax - yMin);

  const handlePress = (event: { nativeEvent: { pageX: number; pageY: number } }) => {
    if (locked) return;
    const { pageX, pageY } = event.nativeEvent;

    // measure() is async — everything that depends on the tap position has
    // to live inside this callback.
    containerRef.current?.measure((_x, _y, _width, _height, containerPageX, containerPageY) => {
      const locationX = pageX - containerPageX;
      const locationY = pageY - containerPageY;

      const cartX = fromSvgX(locationX);
      const cartY = fromSvgY(locationY);
      const snapX = Math.round(cartX / gridStep) * gridStep;
      const snapY = Math.round(cartY / gridStep) * gridStep;
      if (snapX < xMin || snapX > xMax || snapY < yMin || snapY > yMax) return;

      const existingIndex = points.findIndex(
        (p) => Math.abs(p.x - snapX) < 0.01 && Math.abs(p.y - snapY) < 0.01,
      );
      const newPoints = [...points];
      if (existingIndex > -1) {
        newPoints.splice(existingIndex, 1);
      } else {
        newPoints.push({ x: snapX, y: snapY });
      }
      onChange({ points: newPoints });
    });
  };

  const gridLines: React.ReactNode[] = [];
  for (let x = xMin; x <= xMax; x += gridStep) {
    if (Math.abs(x) < 0.001) continue;
    const svgX = toSvgX(x);
    gridLines.push(
      <Line key={`v-${x}`} x1={svgX} y1={0} x2={svgX} y2={SIZE} stroke={t.colors.border} strokeWidth={1} />,
    );
  }
  for (let y = yMin; y <= yMax; y += gridStep) {
    if (Math.abs(y) < 0.001) continue;
    const svgY = toSvgY(y);
    gridLines.push(
      <Line key={`h-${y}`} x1={0} y1={svgY} x2={SIZE} y2={svgY} stroke={t.colors.border} strokeWidth={1} />,
    );
  }

  const axisX = toSvgX(0);
  const axisY = toSvgY(0);

  return (
    <View
      style={{
        padding: t.spacing.lg,
        borderRadius: t.radius.xl,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.card,
        alignItems: 'center',
      }}
    >
      <Text variant="caption" color="mutedForeground">
        {locked ? 'Locked' : 'Tap grid intersections to plot or remove points'}
      </Text>
      <View style={{ height: t.spacing.xs }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
        <Text variant="label">Points plotted: {points.length}</Text>
        {locked && isCorrect !== undefined ? (
          <Text variant="label" color={isCorrect ? 'success' : 'destructive'}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
        ) : null}
      </View>

      <View style={{ height: t.spacing.md }} />

      <Pressable ref={containerRef} onPress={handlePress} disabled={locked}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {gridLines}
          {xMin <= 0 && xMax >= 0 ? (
            <Line x1={axisX} y1={0} x2={axisX} y2={SIZE} stroke={t.colors.mutedForeground} strokeWidth={2} />
          ) : null}
          {yMin <= 0 && yMax >= 0 ? (
            <Line x1={0} y1={axisY} x2={SIZE} y2={axisY} stroke={t.colors.mutedForeground} strokeWidth={2} />
          ) : null}

          {Array.from({ length: Math.floor((xMax - xMin) / gridStep) + 1 }).map((_, i) => {
            const val = xMin + i * gridStep;
            if (val === 0 || val % 2 !== 0) return null;
            const sx = toSvgX(val);
            return (
              <SvgText key={`xt-${val}`} x={sx} y={axisY + 16} fontSize={9} textAnchor="middle" fill={t.colors.mutedForeground}>
                {val}
              </SvgText>
            );
          })}
          {Array.from({ length: Math.floor((yMax - yMin) / gridStep) + 1 }).map((_, i) => {
            const val = yMin + i * gridStep;
            if (val === 0 || val % 2 !== 0) return null;
            const sy = toSvgY(val);
            return (
              <SvgText key={`yt-${val}`} x={axisX - 8} y={sy + 3} fontSize={9} textAnchor="end" fill={t.colors.mutedForeground}>
                {val}
              </SvgText>
            );
          })}

          {locked && isCorrect === false
            ? correctPoints.map((pt, idx) => (
                <G key={`correct-${idx}`}>
                  <Circle cx={toSvgX(pt.x)} cy={toSvgY(pt.y)} r={10} fill="none" stroke={t.colors.success} strokeWidth={2} strokeDasharray="3,3" />
                  <Circle cx={toSvgX(pt.x)} cy={toSvgY(pt.y)} r={3} fill={t.colors.success} />
                </G>
              ))
            : null}

          {points.map((pt, idx) => {
            let fill = t.colors.primary;
            if (locked) {
              const matched = correctPoints.some(
                (cp) => Math.hypot(cp.x - pt.x, cp.y - pt.y) <= tolerance,
              );
              fill = matched ? t.colors.success : t.colors.destructive;
            }
            return <Circle key={`p-${idx}`} cx={toSvgX(pt.x)} cy={toSvgY(pt.y)} r={7} fill={fill} stroke="white" strokeWidth={2} />;
          })}
        </Svg>
      </Pressable>
    </View>
  );
}
