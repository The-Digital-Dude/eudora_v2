import { ShieldCheck, Sparkles, Users } from "lucide-react";

export default function AboutSection() {
  const principles = [
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Educators stay in control",
      desc: "AI recommendations and insight workflows are presented for review — staff make the call, Eudora supplies the context.",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "AI as leverage, not a gimmick",
      desc: "Personalized learning paths, automated grading, and lesson planning are built to save real classroom time, not to be a standalone chat feature.",
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "One system, every role",
      desc: "Administrators, teachers, guardians, and students each get a dedicated portal instead of a patchwork of disconnected tools.",
    },
  ];

  return (
    <section id="about" className="border-t border-border/40 bg-background py-20 select-none">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-2xl space-y-3 text-center">
          <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm">
            About Eudora
          </span>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Built to give schools one operational home.
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Eudora is a full-stack education operating system that brings school operations,
            curriculum delivery, and student learning into one product — designed around a simple
            idea: give educators a clear operational workspace while making learning more personal,
            interactive, and measurable for students.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {principles.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-start rounded-2xl border border-border/50 bg-card p-6 shadow-sm md:p-8"
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
