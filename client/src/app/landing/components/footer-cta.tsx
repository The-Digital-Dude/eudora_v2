import Image from "next/image";
import Link from "next/link";

/**
 * The full-bleed closing pitch that sits directly above the footer.
 *
 * Deliberately breaks out of the page's `max-w-7xl` rhythm — every section
 * above it is a contained column, so an edge-to-edge photograph is what makes
 * this read as the end of the page rather than one more band.
 *
 * The photograph is decorative: the headline beside it carries the message, so
 * `alt` is empty and screen readers skip straight to the text. A described
 * image here would just be noise between the pitch and its button.
 *
 * No app-store badges, unlike the design this follows. The apps have not
 * shipped, and putting badges for them at the bottom of the funnel would be
 * advertising something a visitor cannot get.
 */
export default function FooterCta() {
  return (
    <section className="relative isolate w-full overflow-hidden">
      <Image
        src="/landing/Footer_Backdrop.jpg"
        alt=""
        fill
        // Full-bleed at every breakpoint, so the browser should never pick a
        // candidate narrower than the viewport.
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Darkened toward the middle: the source photograph is bright where the
          headline sits, and white type on it fails contrast without this. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/65 to-black/55" />

      <div className="relative mx-auto flex min-h-[380px] max-w-3xl flex-col items-center justify-center gap-7 px-6 py-20 text-center md:min-h-[460px] md:py-28">
        <h2 className="font-display text-3xl leading-[1.15] font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          Same half hour.
          <br className="hidden sm:block" /> Different habit.
        </h2>

        {/* Catalogue before sign-up: a visitor at the bottom of the page wants
            to know what it costs, not to make an account first. */}
        <Link
          href="/explore"
          className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-neutral-900 shadow-lg transition-all hover:bg-white/90 active:scale-98"
        >
          Browse courses
        </Link>
      </div>
    </section>
  );
}
