import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { ColorName } from '../theme/tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: ColorName;
}

export function Text({
  variant = 'body',
  color = 'foreground',
  style,
  ...rest
}: TextProps) {
  const t = useTheme();

  const variantStyle = {
    display: { fontSize: t.fontSize.display, fontWeight: t.fontWeight.heavy },
    title: { fontSize: t.fontSize.xxl, fontWeight: t.fontWeight.bold },
    heading: { fontSize: t.fontSize.lg, fontWeight: t.fontWeight.bold },
    body: { fontSize: t.fontSize.md, fontWeight: t.fontWeight.regular },
    label: { fontSize: t.fontSize.sm, fontWeight: t.fontWeight.semibold },
    caption: { fontSize: t.fontSize.xs, fontWeight: t.fontWeight.medium },
  }[variant];

  return (
    <RNText
      style={[
        { color: t.colors[color] },
        variantStyle as any,
        style,
      ]}
      {...rest}
    />
  );
}
