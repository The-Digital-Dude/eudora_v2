"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Apple, Laptop, Play } from "lucide-react";
import Image from "next/image";

// App Store / Google Play links aren't live yet, so these render as static
// badges (not <a> tags) rather than dead links — swap in real store URLs
// once the apps are published.
export default function AppDownloadSection() {
  return (
    <section className="bg-background px-4 py-10 select-none sm:px-6 md:py-14">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#241546] py-20 md:py-28">
        {/* Decorative ambient glows — matches the courses section above */}
        <div className="pointer-events-none absolute -top-20 -right-24 h-80 w-80 rounded-full bg-teal-400/20 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[110px]" />

        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
          {/* Left: Copy */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 shadow-lg">
              <Laptop className="h-7 w-7 text-[#241546]" />
            </div>

            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl md:text-5xl">
              Take Eudora Learning <span className="text-amber-300">Anywhere</span>
            </h2>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
              Download the Eudora app and keep learning from any device, anywhere in the world.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5">
                <Apple className="h-6 w-6 text-white" />
                <div className="text-left leading-none">
                  <div className="text-[9px] text-white/60">Download on the</div>
                  <div className="text-sm font-semibold text-white">App Store</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5">
                <Play className="h-5 w-5 fill-white text-white" />
                <div className="text-left leading-none">
                  <div className="text-[9px] text-white/60">GET IT ON</div>
                  <div className="text-sm font-semibold text-white">Google Play</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Photo */}
          <div className="animate-fade-in-up flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="overflow-hidden rounded-3xl shadow-2xl">
                <Image
                  src="/landing/Online-Classes-Kids.jpg"
                  alt="A student attending an Eudora class from home"
                  width={960}
                  height={640}
                  className="h-auto w-full object-cover"
                />
              </div>
              {/* A little headphone friend, echoing the photo */}
              <div className="absolute -bottom-2 -left-2 hidden h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-card shadow-lg sm:flex sm:h-28 sm:w-28">
                <DotLottieReact
                  src="/lottie/headphone-with-blueberry-cartoon-waving-hello.lottie"
                  loop
                  autoplay
                  className="h-20 w-20 sm:h-24 sm:w-24"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
