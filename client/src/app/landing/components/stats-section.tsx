import { LandingLottie } from "./landing-lottie";

export default function StatsSection() {
  const stats = [
    { value: "+15%", label: "Grade Boost", desc: "Average student improvement" },
    { value: "200k+", label: "Graded Tasks", desc: "Evaluated by AI engine" },
    { value: "15+", label: "Districts", desc: "Streamlined administration" },
    { value: "10k+", label: "Educators", desc: "Teaching with Eudora daily" },
  ];

  return (
    <section id="stats" className="border-y border-border/40 bg-background py-16 select-none">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-6 md:flex-row md:gap-14">
        {/* Who the numbers are actually about. Shrinks out of the way on
            narrow screens rather than pushing the figures below the fold. */}
        <LandingLottie
          src="/lottie/parents-with-kids.lottie"
          className="h-40 w-40 shrink-0 md:h-52 md:w-52"
        />
        <div className="grid w-full grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
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
