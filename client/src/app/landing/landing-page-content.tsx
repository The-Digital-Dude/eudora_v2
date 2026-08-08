"use client";

import AboutSection from "./components/about-section";
import ContactSection from "./components/contact-section";
import CtaSection from "./components/cta-section";
import FaqSection from "./components/faq-section";
import FeaturesSection from "./components/features-section";
import Footer from "./components/footer";
import HeroSection from "./components/hero-section";
import Navbar from "./components/navbar";
import StatsSection from "./components/stats-section";

export function LandingPageContent() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <AboutSection />
        <FaqSection />
        <CtaSection />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
