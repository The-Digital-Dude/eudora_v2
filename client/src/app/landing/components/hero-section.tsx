import Link from "next/link";
import { ArrowRight, Play, Sparkles, Activity, Layers, Cpu, Globe } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative pt-20 pb-24 md:pt-28 md:pb-36 bg-neutral-50 overflow-hidden dot-grid">
      
      {/* Background Soft Ambient Lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[350px] bg-gradient-to-b from-neutral-200/20 to-transparent rounded-full filter blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        
        {/* Top Product Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-neutral-200 bg-white text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-6 animate-fade-in-up select-none shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
          Introducing Eudora OS v2.0
        </div>

        {/* Hero Headings */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6 font-display max-w-3xl animate-fade-in-up">
          Learn intelligently. <br className="hidden sm:inline" />
          Teach effortlessly.
        </h1>

        {/* Subheader */}
        <p className="text-sm sm:text-base md:text-lg text-neutral-400 max-w-2xl leading-relaxed mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Eudora is the next-generation learning platform. Personalize student curriculums, automate grading, and coordinate school districts in one unified system.
        </p>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4.5 mb-16 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <Link href="/login">
            <button className="h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-sm px-6 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-neutral-900/10 active:scale-97">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <a href="#features">
            <button className="h-11 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl text-sm px-6 border border-neutral-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-97">
              <Play className="w-3.5 h-3.5 fill-current text-neutral-600" />
              Watch Demo
            </button>
          </a>
        </div>

        {/* Mockup Dashboard Container */}
        <div className="w-full max-w-[840px] px-2 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="bg-white border border-neutral-200/80 rounded-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.06),0_10px_20px_rgba(0,0,0,0.015)] overflow-hidden relative select-none">
            
            {/* Window Title Bar */}
            <div className="h-11 border-b border-neutral-100 flex items-center px-5 bg-neutral-50/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-200"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-200"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-200"></div>
              </div>
              <div className="mx-auto text-[10px] font-semibold text-neutral-400 tracking-wider">workspace.eudora.edu</div>
            </div>

            {/* Window Content */}
            <div className="grid grid-cols-12 h-[340px] md:h-[400px] text-left">
              
              {/* Sidebar navigation */}
              <div className="col-span-3 border-r border-neutral-100 p-4 bg-neutral-50/30 hidden md:block">
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest px-2.5">Workspace</div>
                  <div className="space-y-2.5">
                    <div className="h-7 bg-neutral-100 rounded-lg flex items-center px-2.5 gap-2 text-neutral-900 font-semibold text-xs">
                      <Layers className="w-3.5 h-3.5 text-neutral-650" />
                      <span>Student Paths</span>
                    </div>
                    <div className="h-7 hover:bg-neutral-50 rounded-lg flex items-center px-2.5 gap-2 transition-colors text-neutral-400 text-xs font-medium">
                      <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Curriculum AI</span>
                    </div>
                    <div className="h-7 hover:bg-neutral-50 rounded-lg flex items-center px-2.5 gap-2 transition-colors text-neutral-400 text-xs font-medium">
                      <Globe className="w-3.5 h-3.5 text-neutral-400" />
                      <span>District Admin</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-12 md:col-span-9 p-6 space-y-6 flex flex-col justify-between">
                
                {/* Dashboard Metrics Header */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/20">
                    <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Active Students</div>
                    <div className="text-xl font-bold text-neutral-900 mt-1">1,248</div>
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/20">
                    <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Graded Tasks</div>
                    <div className="text-xl font-bold text-neutral-900 mt-1">12.5k</div>
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/20">
                    <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Avg Grade</div>
                    <div className="text-xl font-bold text-neutral-900 mt-1 flex items-baseline gap-1">
                      A-
                      <span className="text-[9px] text-emerald-500 font-semibold">+2.4%</span>
                    </div>
                  </div>
                </div>

                {/* Graph Representation */}
                <div className="flex-1 min-h-[120px] rounded-xl border border-neutral-100 p-4 flex flex-col justify-between relative overflow-hidden bg-neutral-50/10">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-neutral-600 animate-pulse" />
                      Live Student Engagement Tracker
                    </div>
                    <div className="flex gap-2">
                      <span className="w-1.5 h-1.5 bg-neutral-200 rounded-full"></span>
                      <span className="w-1.5 h-1.5 bg-neutral-200 rounded-full"></span>
                    </div>
                  </div>
                  
                  {/* SVG Wave */}
                  <div className="h-[80px] w-full flex items-end">
                    <svg className="w-full h-full text-neutral-900 overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="glow-hero" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#171717" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#171717" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0 40 L0 30 Q10 12 25 25 T50 15 T75 22 T100 8 L100 40 Z" fill="url(#glow-hero)" />
                      <path d="M0 30 Q10 12 25 25 T50 15 T75 22 T100 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex justify-between items-center text-[10px] text-neutral-400 border-t border-neutral-100 pt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
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