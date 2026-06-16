export default function StatsSection() {
  const stats = [
    { value: "+15%", label: "Grade Boost", desc: "Average student improvement" },
    { value: "200k+", label: "Graded Tasks", desc: "Evaluated by AI engine" },
    { value: "15+", label: "Districts", desc: "Streamlined administration" },
    { value: "10k+", label: "Educators", desc: "Teaching with Eudora daily" }
  ];

  return (
    <section id="stats" className="py-16 bg-white border-y border-neutral-200/40 select-none">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 font-display">
                {stat.value}
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-2">
                {stat.label}
              </span>
              <span className="text-xs text-neutral-400 mt-1">
                {stat.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}