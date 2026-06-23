import { Activity, ArrowRight, Cpu, Globe,Layers, Play, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="dot-grid relative overflow-hidden bg-neutral-50 pt-20 pb-24 md:pt-28 md:pb-36">
      {/* Background Soft Ambient Lights */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[350px] w-full max-w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-neutral-200/20 to-transparent blur-[100px] filter" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 text-center">
        {/* Top Product Badge */}
        <div className="animate-fade-in-up mb-6 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1 text-[10px] font-bold tracking-widest text-neutral-600 uppercase shadow-sm select-none">
          <Sparkles className="h-3.5 w-3.5 text-neutral-900" />
          Introducing Eudora OS v2.0
        </div>

        {/* Hero Headings */}
        <h1 className="font-display animate-fade-in-up mb-6 max-w-3xl text-4xl leading-[1.1] font-extrabold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
          Learn intelligently. <br className="hidden sm:inline" />
          Teach effortlessly.
        </h1>

        {/* Subheader */}
        <p
          className="animate-fade-in-up mb-8 max-w-2xl text-sm leading-relaxed text-neutral-400 sm:text-base md:text-lg"
          style={{ animationDelay: "0.1s" }}
        >
          Eudora is the next-generation learning platform. Personalize student curriculums, automate
          grading, and coordinate school districts in one unified system.
        </p>

        {/* CTA Actions */}
        <div
          className="animate-fade-in-up mb-16 flex flex-col items-center gap-4.5 sm:flex-row"
          style={{ animationDelay: "0.2s" }}
        >
          <Link href="/login">
            <button className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 text-sm font-semibold text-white shadow-md shadow-neutral-900/10 transition-all hover:bg-neutral-800 active:scale-97">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <a href="#features">
            <button className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 text-sm font-semibold text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 active:scale-97">
              <Play className="h-3.5 w-3.5 fill-current text-neutral-600" />
              Watch Demo
            </button>
          </a>
        </div>

        {/* Mockup Dashboard Container */}
        <div
          className="animate-fade-in-up w-full max-w-[840px] px-2"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="relative overflow-hidden rounded-[24px] border border-neutral-200/80 bg-white shadow-[0_30px_70px_rgba(0,0,0,0.06),0_10px_20px_rgba(0,0,0,0.015)] select-none">
            {/* Window Title Bar */}
            <div className="flex h-11 items-center border-b border-neutral-100 bg-neutral-50/50 px-5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-200"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-200"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-200"></div>
              </div>
              <div className="mx-auto text-[10px] font-semibold tracking-wider text-neutral-400">
                workspace.eudora.edu
              </div>
            </div>

            {/* Window Content */}
            <div className="grid h-[340px] grid-cols-12 text-left md:h-[400px]">
              {/* Sidebar navigation */}
              <div className="col-span-3 hidden border-r border-neutral-100 bg-neutral-50/30 p-4 md:block">
                <div className="space-y-4">
                  <div className="text-neutral-450 px-2.5 text-[10px] font-bold tracking-widest uppercase">
                    Workspace
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex h-7 items-center gap-2 rounded-lg bg-neutral-100 px-2.5 text-xs font-semibold text-neutral-900">
                      <Layers className="text-neutral-650 h-3.5 w-3.5" />
                      <span>Student Paths</span>
                    </div>
                    <div className="flex h-7 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-50">
                      <Cpu className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Curriculum AI</span>
                    </div>
                    <div className="flex h-7 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-50">
                      <Globe className="h-3.5 w-3.5 text-neutral-400" />
                      <span>District Admin</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-12 flex flex-col justify-between space-y-6 p-6 md:col-span-9">
                {/* Dashboard Metrics Header */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50/20 p-4">
                    <div className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">
                      Active Students
                    </div>
                    <div className="mt-1 text-xl font-bold text-neutral-900">1,248</div>
                  </div>
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50/20 p-4">
                    <div className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">
                      Graded Tasks
                    </div>
                    <div className="mt-1 text-xl font-bold text-neutral-900">12.5k</div>
                  </div>
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50/20 p-4">
                    <div className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">
                      Avg Grade
                    </div>
                    <div className="mt-1 flex items-baseline gap-1 text-xl font-bold text-neutral-900">
                      A-
                      <span className="text-[9px] font-semibold text-emerald-500">+2.4%</span>
                    </div>
                  </div>
                </div>

                {/* Graph Representation */}
                <div className="relative flex min-h-[120px] flex-1 flex-col justify-between overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400">
                      <Activity className="h-3.5 w-3.5 animate-pulse text-neutral-600" />
                      Live Student Engagement Tracker
                    </div>
                    <div className="flex gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-200"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-200"></span>
                    </div>
                  </div>

                  {/* SVG Wave */}
                  <div className="flex h-[80px] w-full items-end">
                    <svg
                      className="h-full w-full overflow-visible text-neutral-900"
                      viewBox="0 0 100 40"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="glow-hero" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#171717" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#171717" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 40 L0 30 Q10 12 25 25 T50 15 T75 22 T100 8 L100 40 Z"
                        fill="url(#glow-hero)"
                      />
                      <path
                        d="M0 30 Q10 12 25 25 T50 15 T75 22 T100 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-4 text-[10px] text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500"></span>
                    AI grading engine operational
                  </div>
                  <div>Last update: Just now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
