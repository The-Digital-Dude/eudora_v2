"use client";

import * as React from "react";

import Footer from "../landing/components/footer";
import Navbar from "../landing/components/navbar";
import { ClioDemoSection } from "./components/clio-demo-section";
import { ClosingCta } from "./components/closing-cta";
import { HeroCover } from "./components/hero-cover";
import { LiveTeachersSection } from "./components/live-teachers-section";
import { ProgressSection } from "./components/progress-section";
import { WidgetPlaygroundSection } from "./components/widget-playground-section";

/**
 * The demo's XP lives here rather than inside the Clio section so the
 * "what parents see" section further down can react to what the visitor
 * actually answered. That continuity is the point of the page: the same event
 * shows up in the child's view and the parent's view, which is exactly the
 * claim the section makes.
 */
export function AboutEudoraContent() {
  const [earnedXp, setEarnedXp] = React.useState(0);
  const [demoComplete, setDemoComplete] = React.useState(false);

  // Stable identities: both are read inside effects in the demo section, and a
  // fresh closure each render would re-fire them on every keystroke of state.
  const handleXpChange = React.useCallback((xp: number) => setEarnedXp(xp), []);
  const handleComplete = React.useCallback((done: boolean) => setDemoComplete(done), []);

  return (
    <div className="font-landing flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar />

      <main id="main-content" className="flex-1">
        <HeroCover />
        <ClioDemoSection onXpChange={handleXpChange} onComplete={handleComplete} />
        <WidgetPlaygroundSection />
        <ProgressSection earnedXp={earnedXp} demoComplete={demoComplete} />
        <LiveTeachersSection />
        <ClosingCta />
      </main>

      <Footer />
    </div>
  );
}
