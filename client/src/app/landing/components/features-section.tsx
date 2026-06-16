import { Zap, ShieldAlert, Cpu, GitBranch, RefreshCw, BarChart3 } from "lucide-react";

export default function FeaturesSection() {
  const items = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "AI Learning Paths",
      desc: "Generate personalized curriculums and learning pace recommendations tailored to each student's strengths."
    },
    {
      icon: <ShieldAlert className="w-5 h-5" />,
      title: "Automated AI Grading",
      desc: "Evaluate essay assignments, math tests, and lab reports instantly with rich pedagogical feedback."
    },
    {
      icon: <Cpu className="w-5 h-5" />,
      title: "District Orchestration",
      desc: "Manage school scheduling, teacher assignments, student rosters, and district compliance in one unified place."
    },
    {
      icon: <GitBranch className="w-5 h-5" />,
      title: "Live Classrooms",
      desc: "Host real-time quizzes, collaborative whiteboards, and interactive exercises during lectures."
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Progress Analytics",
      desc: "Track individual student metrics, identify class-wide learning gaps, and receive early warning reports."
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Lesson AI Designer",
      desc: "Generate comprehensive lesson plans, lecture slides, and exam papers matching national curriculum standards."
    }
  ];

  return (
    <section id="features" className="py-20 bg-neutral-50 select-none border-t border-neutral-200/40">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-neutral-200 shadow-sm">
            Features
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-display">
            Built for learning. Engineered for classrooms.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-normal">
            Everything you need to design personalized curriculums, automate grading, and run live interactive lectures.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {items.map((item, idx) => (
            <div key={idx} className="bg-white border border-neutral-200/80 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-start">
              <div className="p-2.5 bg-neutral-50 text-neutral-900 rounded-xl mb-6 border border-neutral-100">
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-neutral-900 mb-2 font-display">
                {item.title}
              </h3>
              <p className="text-xs text-neutral-400 leading-normal">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}