"use client";

import Navbar from "./components/navbar";
import HeroSection from "./components/hero-section";
import StatsSection from "./components/stats-section";
import FeaturesSection from "./components/features-section";
import CtaSection from "./components/cta-section";
import Footer from "./components/footer";

export function LandingPageContent() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}