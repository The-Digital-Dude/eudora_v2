import Image from "next/image";
import * as React from "react";

/**
 * Shared rhythm for every section below the cover: same max width, same
 * vertical beat, same eyebrow/heading/lede stack. Sections differ in what they
 * demonstrate, never in how they are framed.
 */
export function SectionShell({
  eyebrow,
  title,
  lede,
  children,
  tinted = false,
  backdrop,
  id,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children: React.ReactNode;
  /** Alternating background, so adjacent sections read as separate slabs. */
  tinted?: boolean;
  /**
   * A photograph behind the section, held well back. Kept faint and washed
   * toward the middle on purpose: the page has to stay legible in both themes,
   * and a full-strength photo behind body copy fails contrast in one of them
   * whichever way you tune it.
   */
  backdrop?: { src: string; alt: string };
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`relative isolate overflow-hidden border-t border-border/60 px-6 py-16 md:py-24 ${
        tinted ? "bg-muted/30" : "bg-background"
      }`}
    >
      {backdrop && (
        <>
          <Image
            src={backdrop.src}
            alt={backdrop.alt}
            fill
            sizes="100vw"
            className="-z-10 object-cover"
          />
          {/* One scrim, not two. The photo used to be dimmed here *and* by an
              `opacity` on the image itself, and the gradient's end stops were
              fully opaque, which multiplied out to 0% visible at the top and
              bottom of the section and 3% in the middle. The photo is left at
              full strength now and only this layer veils it: heaviest across
              the heading, opening up over the empty band below it where there
              is no text to protect. */}
          <div className="-z-10 absolute inset-0 bg-gradient-to-b from-background/90 via-background/50 to-background/75" />
        </>
      )}

      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm select-none">
            {eyebrow}
          </span>
          <h2 className="font-display mt-4 text-2xl font-extrabold tracking-tight text-balance text-foreground sm:text-3xl md:text-4xl">
            {title}
          </h2>
          {lede && (
            <p className="mt-4 text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
              {lede}
            </p>
          )}
        </div>

        <div className="mt-10 md:mt-14">{children}</div>
      </div>
    </section>
  );
}
