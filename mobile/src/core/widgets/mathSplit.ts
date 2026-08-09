/**
 * Splits mixed prose/LaTeX into renderable segments.
 *
 * The delimiter rules are lifted verbatim from the web client's MathRenderer
 * (`client/src/components/MathRenderer.tsx`) so both clients segment identical
 * content identically. Only the *rendering* differs between platforms — the web
 * uses KaTeX to HTML, and native has to route math through a WebView — so this
 * pure part is kept separate and shared.
 */

export type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; display: boolean };

const DELIMITERS = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g;

export function splitMath(text: string): MathSegment[] {
  if (!text) return [];

  return text
    .split(DELIMITERS)
    .filter((part) => part !== '')
    .map((part): MathSegment => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return { type: 'math', value: part.slice(2, -2).trim(), display: true };
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return { type: 'math', value: part.slice(1, -1).trim(), display: false };
      }
      return { type: 'text', value: part };
    });
}

/**
 * Whether a string contains any math at all.
 *
 * Rendering math natively means paying for a WebView, so content without a
 * formula should take a plain-text path instead. Most card copy has none.
 */
export function hasMath(text: string): boolean {
  if (!text) return false;
  return /\$[\s\S]+?\$/.test(text);
}
