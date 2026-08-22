"use client";

import { ArrowRight, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";

const POPULAR_SEARCHES = ["Math", "Science", "English", "Coding"];

export default function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query ? `/explore?q=${encodeURIComponent(query)}` : "/explore");
  };

  return (
    <section className="relative overflow-hidden bg-background pt-6 pb-20 md:pt-10 md:pb-28">
      {/* Background Soft Ambient Light */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[350px] w-full max-w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-neutral-200/20 to-transparent blur-[100px] filter" />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:items-start md:gap-10">
        {/* Left: Photo */}
        <div className="animate-fade-in-up order-2 flex justify-center md:order-1">
          <div className="relative w-full max-w-md">
            <Image
              src="/landing/hero_side_image.png"
              alt="Students exploring their personalized Eudora course dashboard"
              width={874}
              height={1138}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>

        {/* Right: Content */}
        <div className="order-1 text-center md:order-2 md:text-left">
          <div className="animate-fade-in-up mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm select-none">
            For Kids, Pre-K to Grade 6
          </div>

          <h1 className="font-display animate-fade-in-up mb-5 text-4xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Screens your kids <br className="hidden sm:inline" />
            actually learn from.
          </h1>

          <p
            className="animate-fade-in-up mx-auto mb-8 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base md:mx-0"
            style={{ animationDelay: "0.1s" }}
          >
            An AI tutor that stops and asks a question every few minutes, real teachers running
            live cohorts, and a parent view that shows you what your child actually did.
          </p>

          {/* Course search */}
          <form
            onSubmit={handleSubmit}
            className="animate-fade-in-up mx-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm md:mx-0"
            style={{ animationDelay: "0.2s" }}
          >
            <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a course..."
              aria-label="Search for a course"
              className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0"
            />
            <button
              type="submit"
              className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-primary-foreground transition-all hover:bg-foreground/90 active:scale-97"
            >
              Search
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Popular searches */}
          <div
            className="animate-fade-in-up mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs md:justify-start"
            style={{ animationDelay: "0.3s" }}
          >
            <span className="font-semibold text-muted-foreground">Most popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <Link
                key={term}
                href={`/explore?q=${encodeURIComponent(term)}`}
                className="font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
