import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { hasMath, splitMath } from '@/core/widgets/mathSplit';
import { useTheme } from '../theme/ThemeProvider';
import { KATEX_CSS, KATEX_JS } from '../theme/katexAssets';
import { Text, type TextProps } from './Text';

interface MathTextProps extends Pick<TextProps, 'variant' | 'color'> {
  children: string;
}

/**
 * Renders mixed prose and LaTeX.
 *
 * Math goes through a WebView running KaTeX, because there is no native
 * typesetter with comparable output and the web app's rendering is the
 * reference. That is expensive, so text with no `$…$` in it takes a plain
 * <Text> path and never mounts a WebView — which is most card copy.
 *
 * One WebView per *block*, not per formula: mounting one per inline fragment
 * would be far worse, and a block is the smallest unit that still lays out
 * correctly.
 *
 * KaTeX is inlined from `ui/theme/katexAssets.ts` (generated once from
 * node_modules/katex/dist) rather than fetched from a CDN, so lessons work
 * offline and no third party sees the content. See that file's comment for
 * the one known gap: KaTeX's own webfonts are not bundled, so glyphs render
 * via system-font fallback rather than pixel-identical to web.
 */
export function MathText({ children, variant, color }: MathTextProps) {
  const t = useTheme();
  const [height, setHeight] = useState(40);

  const needsMath = useMemo(() => hasMath(children), [children]);

  // Built unconditionally: hooks cannot sit behind the early return below.
  const html = useMemo(
    () =>
      needsMath ? buildHtml(children, t.colors.foreground, t.fontSize.md) : '',
    [needsMath, children, t.colors.foreground, t.fontSize.md],
  );

  if (!needsMath) {
    return (
      <Text variant={variant} color={color}>
        {children}
      </Text>
    );
  }

  return (
    <View style={{ height }}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ backgroundColor: 'transparent', height }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        // The WebView cannot size itself to content, so the document measures
        // itself and posts its height back.
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data);
          if (Number.isFinite(next) && next > 0) setHeight(Math.ceil(next));
        }}
      />
    </View>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(text: string, color: string, size: number): string {
  const body = splitMath(text)
    .map((segment) => {
      if (segment.type === 'text') {
        return `<span>${escapeHtml(segment.value)}</span>`;
      }
      const cls = segment.display ? 'math-display' : 'math-inline';
      return `<span class="${cls}" data-tex="${escapeHtml(segment.value)}"></span>`;
    })
    .join('');

  // KaTeX's JS and CSS are embedded inline rather than referenced by path.
  // A WebView given raw HTML via `source={{html}}` has no base URL to resolve
  // relative files against on either platform, so an external <script src>/
  // <link href> would silently fail to load — inlining is what makes this
  // work without also standing up an asset-serving path.
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>${KATEX_CSS}</style>
<style>
  body { margin:0; padding:0; background:transparent; color:${color};
         font-size:${size}px; font-family:-apple-system,Roboto,sans-serif;
         line-height:1.5; }
  .math-display { display:block; text-align:center; margin:8px 0; }
</style>
</head>
<body>
<div id="root">${body}</div>
<script>${KATEX_JS}</script>
<script>
  document.querySelectorAll('[data-tex]').forEach(function (el) {
    try {
      katex.render(el.getAttribute('data-tex'), el, {
        displayMode: el.classList.contains('math-display'),
        throwOnError: false
      });
    } catch (e) {
      el.textContent = el.getAttribute('data-tex');
    }
  });
  function post() {
    window.ReactNativeWebView.postMessage(
      String(document.getElementById('root').scrollHeight)
    );
  }
  post();
  window.addEventListener('load', post);
  // Fonts loading after first paint can change layout height; re-measure once
  // they settle rather than only at 'load'.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(post);
  }
</script>
</body>
</html>`;
}
