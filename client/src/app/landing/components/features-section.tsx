import { BarChart3,Cpu, GitBranch, RefreshCw, ShieldAlert, Zap } from "lucide-react";

export default function FeaturesSection() {
  const items = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "AI Learning Paths",
      desc: "Generate personalized curriculums and learning pace recommendations tailored to each student's strengths.",
    },
    {
      icon: <ShieldAlert className="h-5 w-5" />,
      title: "Automated AI Grading",
      desc: "Evaluate essay assignments, math tests, and lab reports instantly with rich pedagogical feedback.",
    },
    {
      icon: <Cpu className="h-5 w-5" />,
      title: "District Orchestration",
      desc: "Manage school scheduling, teacher assignments, student rosters, and district compliance in one unified place.",
    },
    {
      icon: <GitBranch className="h-5 w-5" />,
      title: "Live Classrooms",
      desc: "Host real-time quizzes, collaborative whiteboards, and interactive exercises during lectures.",
    },
    {
      icon: <RefreshCw className="h-5 w-5" />,
      title: "Progress Analytics",
      desc: "Track individual student metrics, identify class-wide learning gaps, and receive early warning reports.",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Lesson AI Designer",
      desc: "Generate comprehensive lesson plans, lecture slides, and exam papers matching national curriculum standards.",
    },
  ];

  return (
    <section
      id="features"
      className="border-t border-border/40 bg-background py-20 select-none"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl space-y-3 text-center">
          <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm">
            Features
          </span>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Built for learning. Engineered for classrooms.
          </h2>
          <p className="text-xs leading-normal text-muted-foreground sm:text-sm">
            Everything you need to design personalized curriculums, automate grading, and run live
            interactive lectures.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-start rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-shadow hover:shadow-md md:p-8"
            >
              <div className="mb-6 rounded-xl border border-border/50 bg-background p-2.5 text-foreground">
                {item.icon}
              </div>
              <h3 className="font-display mb-2 text-sm font-bold text-foreground">{item.title}</h3>
              <p className="text-xs leading-normal text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
