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
  id,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children: React.ReactNode;
  /** Alternating background, so adjacent sections read as separate slabs. */
  tinted?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`border-t border-border/60 px-6 py-16 md:py-24 ${tinted ? "bg-muted/30" : "bg-background"}`}
    >
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
