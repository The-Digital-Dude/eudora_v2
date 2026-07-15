import { Activity, ArrowRight, Cpu, Globe,Layers, Play, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="dot-grid relative overflow-hidden bg-background pt-20 pb-24 md:pt-28 md:pb-36">
      {/* Background Soft Ambient Lights */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[350px] w-full max-w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-neutral-200/20 to-transparent blur-[100px] filter" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 text-center">
        {/* Top Product Badge */}
        <div className="animate-fade-in-up mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm select-none">
          <Sparkles className="h-3.5 w-3.5 text-foreground" />
          Introducing Eudora OS v2.0
        </div>

        {/* Hero Headings */}
        <h1 className="font-display animate-fade-in-up mb-6 max-w-3xl text-4xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Learn intelligently. <br className="hidden sm:inline" />
          Teach effortlessly.
        </h1>

        {/* Subheader */}
        <p
          className="animate-fade-in-up mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
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
            <button className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-foreground/10 transition-all hover:bg-foreground/90 active:scale-97">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <a href="#features">
            <button className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-background active:scale-97">
              <Play className="h-3.5 w-3.5 fill-current text-muted-foreground" />
              Watch Demo
            </button>
          </a>
        </div>

        {/* Mockup Dashboard Container */}
        <div
          className="animate-fade-in-up w-full max-w-[840px] px-2"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[0_30px_70px_rgba(0,0,0,0.06),0_10px_20px_rgba(0,0,0,0.015)] select-none">
            {/* Window Title Bar */}
            <div className="flex h-11 items-center border-b border-border/50 bg-background/50 px-5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-muted"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-muted"></div>
              </div>
              <div className="mx-auto text-[10px] font-semibold tracking-wider text-muted-foreground">
                workspace.eudora.edu
              </div>
            </div>

            {/* Window Content */}
            <div className="grid h-[340px] grid-cols-12 text-left md:h-[400px]">
              {/* Sidebar navigation */}
              <div className="col-span-3 hidden border-r border-border/50 bg-background/30 p-4 md:block">
                <div className="space-y-4">
                  <div className="text-muted-foreground px-2.5 text-[10px] font-bold tracking-widest uppercase">
                    Workspace
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex h-7 items-center gap-2 rounded-lg bg-muted px-2.5 text-xs font-semibold text-foreground">
                      <Layers className="text-muted-foreground h-3.5 w-3.5" />
                      <span>Student Paths</span>
                    </div>
                    <div className="flex h-7 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background">
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Curriculum AI</span>
                    </div>
                    <div className="flex h-7 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>District Admin</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-12 flex flex-col justify-between space-y-6 p-6 md:col-span-9">
                {/* Dashboard Metrics Header */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-border/50 bg-background/20 p-4">
                    <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                      Active Students
                    </div>
                    <div className="mt-1 text-xl font-bold text-foreground">1,248</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/20 p-4">
                    <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                      Graded Tasks
                    </div>
                    <div className="mt-1 text-xl font-bold text-foreground">12.5k</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/20 p-4">
                    <div className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                      Avg Grade
                    </div>
                    <div className="mt-1 flex items-baseline gap-1 text-xl font-bold text-foreground">
                      A-
                      <span className="text-[9px] font-semibold text-success">+2.4%</span>
                    </div>
                  </div>
                </div>

                {/* Graph Representation */}
                <div className="relative flex min-h-[120px] flex-1 flex-col justify-between overflow-hidden rounded-xl border border-border/50 bg-background/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Activity className="h-3.5 w-3.5 animate-pulse text-muted-foreground" />
                      Live Student Engagement Tracker
                    </div>
                    <div className="flex gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-muted"></span>
                    </div>
                  </div>

                  {/* SVG Wave */}
                  <div className="flex h-[80px] w-full items-end">
                    <svg
                      className="h-full w-full overflow-visible text-foreground"
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
                <div className="flex items-center justify-between border-t border-border/50 pt-4 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-ping rounded-full bg-success"></span>
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
