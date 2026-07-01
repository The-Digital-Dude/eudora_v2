import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Target, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import ProjectCard from "@/components/ProjectCard";
import ImpactBlock from "@/components/ImpactBlock";
import { projects } from "@/data/projects";
import { cn } from "@/lib/utils";

const Index = () => {
  const services = [
    {
      icon: TrendingUp,
      title: "SEO & Organic Growth",
      description:
        "Intent-driven content architecture that turns search into a scalable acquisition channel.",
    },
    {
      icon: Target,
      title: "Distribution Strategy",
      description:
        "Multi-channel content systems that reach the right audience at the right stage.",
    },
    {
      icon: BarChart3,
      title: "Funnel & Retention",
      description:
        "Content that converts, onboards, and retains—reducing churn and increasing LTV.",
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-dot-pattern bg-dot-md opacity-30" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />

        <div className="section-container relative">
          <div className="max-w-4xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 opacity-0 animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <Sparkles size={16} className="animate-pulse-soft" />
              Content Strategy & Growth Marketing
            </div>

            {/* Headline */}
            <h1
              className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground mb-6 opacity-0 animate-fade-in leading-[1.1]"
              style={{ animationDelay: "0.2s" }}
            >
              Content is a{" "}
              <span className="relative inline-block">
                <span className="gradient-text">growth system</span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 8C50 2 150 2 198 8"
                    stroke="url(#coral-gradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="animate-fade-in"
                    style={{ animationDelay: "0.8s" }}
                  />
                  <defs>
                    <linearGradient id="coral-gradient" x1="0" y1="0" x2="200" y2="0">
                      <stop offset="0%" stopColor="hsl(12 90% 62%)" />
                      <stop offset="100%" stopColor="hsl(25 95% 55%)" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              .
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-10 max-w-2xl leading-relaxed opacity-0 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              I build strategic content that compounds—driving organic traffic,
              qualified leads, and measurable business results.{" "}
              <span className="text-foreground font-medium">
                No vanity metrics. No content for content's sake.
              </span>
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <Link
                to="/work"
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full",
                  "bg-gradient-coral text-white font-semibold text-lg",
                  "shadow-lg shadow-primary/25",
                  "transition-all duration-300 ease-out",
                  "hover:shadow-xl hover:shadow-primary/35 hover:scale-105",
                  "active:scale-95"
                )}
              >
                View Case Studies
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/contact"
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full",
                  "bg-background border-2 border-border text-foreground font-semibold text-lg",
                  "transition-all duration-300 ease-out",
                  "hover:border-primary hover:text-primary hover:bg-primary/5"
                )}
              >
                Get in Touch
              </Link>
            </div>
          </div>

          {/* Aggregate Metrics */}
          <div
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.5s" }}
          >
            <ImpactBlock metric="+120%" label="Avg. Traffic Growth" size="lg" />
            <ImpactBlock metric="+35%" label="Lead Generation" size="lg" />
            <ImpactBlock metric="−28%" label="Churn Reduction" size="lg" variant="positive" />
            <ImpactBlock metric="8+" label="Years Experience" size="lg" variant="neutral" />
          </div>
        </div>
      </section>

      {/* What I Do Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background-alt to-background" />

        <div className="section-container relative">
          <div className="text-center mb-16">
            <span
              className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 opacity-0 animate-fade-in"
            >
              Services
            </span>
            <h2
              className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 opacity-0 animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              Content Strategy That{" "}
              <span className="gradient-text">Drives Growth</span>
            </h2>
            <p
              className="text-lg text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              I work with founders and marketing teams to build content systems
              that generate predictable, measurable results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {services.map((service, index) => (
              <div
                key={service.title}
                className={cn(
                  "group relative p-8 rounded-2xl",
                  "bg-card border border-border/60",
                  "transition-all duration-500 ease-out",
                  "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5",
                  "hover:-translate-y-2",
                  "opacity-0 animate-fade-in"
                )}
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                {/* Hover gradient */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl opacity-0",
                    "bg-gradient-to-br from-primary/5 via-transparent to-accent/5",
                    "transition-opacity duration-500",
                    "group-hover:opacity-100"
                  )}
                />

                <div className="relative">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center mb-6",
                      "bg-gradient-coral text-white",
                      "shadow-lg shadow-primary/20",
                      "transition-all duration-300",
                      "group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30"
                    )}
                  >
                    <service.icon size={26} />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3 transition-colors duration-300 group-hover:text-primary">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Work Section */}
      <section className="relative py-24 md:py-32">
        <div className="section-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span
                className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 opacity-0 animate-fade-in"
              >
                Portfolio
              </span>
              <h2
                className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 opacity-0 animate-fade-in"
                style={{ animationDelay: "0.1s" }}
              >
                Featured Work
              </h2>
              <p
                className="text-lg text-muted-foreground opacity-0 animate-fade-in"
                style={{ animationDelay: "0.2s" }}
              >
                Real projects with measurable impact
              </p>
            </div>
            <Link
              to="/work"
              className={cn(
                "hidden md:inline-flex items-center gap-2 px-6 py-3 rounded-full",
                "border-2 border-border text-foreground font-medium",
                "transition-all duration-300",
                "hover:border-primary hover:text-primary hover:bg-primary/5",
                "opacity-0 animate-fade-in"
              )}
              style={{ animationDelay: "0.3s" }}
            >
              View All
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.slug}
                slug={project.slug}
                title={project.title}
                category={project.category}
                description={project.description}
                metrics={project.metrics.slice(0, 2)}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              />
            ))}
          </div>

          <div className="mt-10 text-center md:hidden">
            <Link
              to="/work"
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-full",
                "border-2 border-border text-foreground font-medium",
                "transition-all duration-300",
                "hover:border-primary hover:text-primary"
              )}
            >
              View All Case Studies
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background-alt to-background-alt" />
        <div className="absolute inset-0 bg-dot-pattern bg-dot-lg opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-coral opacity-10 blur-3xl rounded-full" />

        <div className="section-container relative">
          <div
            className={cn(
              "max-w-3xl mx-auto text-center p-10 md:p-16 rounded-3xl",
              "bg-card/80 backdrop-blur-sm border border-border/50",
              "shadow-2xl shadow-primary/5"
            )}
          >
            <span
              className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 opacity-0 animate-fade-in"
            >
              Let's Work Together
            </span>
            <h2
              className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 opacity-0 animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              Ready to build a{" "}
              <span className="gradient-text">content growth system</span>?
            </h2>
            <p
              className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto opacity-0 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              Let's discuss how strategic content can drive measurable results
              for your business.
            </p>
            <Link
              to="/contact"
              className={cn(
                "inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full",
                "bg-gradient-coral text-white font-semibold text-lg",
                "shadow-xl shadow-primary/30",
                "transition-all duration-300 ease-out",
                "hover:shadow-2xl hover:shadow-primary/40 hover:scale-105",
                "active:scale-95",
                "opacity-0 animate-fade-in"
              )}
              style={{ animationDelay: "0.3s" }}
            >
              Start a Conversation
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
