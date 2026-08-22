"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import * as React from "react";

/**
 * A decorative Lottie for the landing page.
 *
 * Exists as its own client component because the sections that need it —
 * stats and pricing — are server components, and DotLottieReact cannot render
 * there. Sections that are already client-side import DotLottieReact directly.
 *
 * Autoplay is dropped for visitors who ask for reduced motion. These animations
 * are ornament, never information, so freezing them on the first frame costs
 * the page nothing and spares people who get motion sick from looping
 * animation they did not ask for.
 */
export function LandingLottie({
  src,
  className = "",
  ariaLabel,
}: {
  src: string;
  /** Sizing lives on the wrapper; the player always fills it. */
  className?: string;
  /**
   * Only pass this if the animation carries meaning. Left unset the element is
   * hidden from screen readers, which is right for decoration.
   */
  ariaLabel?: string;
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  // Read after mount: the server has no matchMedia, and rendering a different
  // tree on first paint would be a hydration mismatch.
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      className={className}
      {...(ariaLabel ? { role: "img", "aria-label": ariaLabel } : { "aria-hidden": true })}
    >
      <DotLottieReact
        src={src}
        loop={!prefersReducedMotion}
        autoplay={!prefersReducedMotion}
        className="h-full w-full"
      />
    </div>
  );
}
