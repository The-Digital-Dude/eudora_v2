export default function StatsSection() {
  const stats = [
    { value: "+15%", label: "Grade Boost", desc: "Average student improvement" },
    { value: "200k+", label: "Graded Tasks", desc: "Evaluated by AI engine" },
    { value: "15+", label: "Districts", desc: "Streamlined administration" },
    { value: "10k+", label: "Educators", desc: "Teaching with Eudora daily" },
  ];

  return (
    <section id="stats" className="border-y border-border/40 bg-background py-16 select-none">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-center md:items-start md:text-left"
            >
              <span className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {stat.value}
              </span>
              <span className="mt-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                {stat.label}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">{stat.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
