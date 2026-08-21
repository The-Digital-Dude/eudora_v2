"use client";

import AppDownloadSection from "./components/app-download-section";
import CoursesSection from "./components/courses-section";
import FeaturesSection from "./components/features-section";
import Footer from "./components/footer";
import FooterCta from "./components/footer-cta";
import HeroSection from "./components/hero-section";
import Navbar from "./components/navbar";
import StatsSection from "./components/stats-section";

/**
 * `pricing` is injected from the server page rather than imported here: it
 * reads the live catalog, so it has to be a server component, and this file is
 * a client component. Passing it as a node is what lets the two coexist.
 */
export function LandingPageContent({
  pricing,
}: {
  pricing?: React.ReactNode;
}) {
  return (
    <div className="font-landing flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        <CoursesSection />
        <FeaturesSection />
        <AppDownloadSection />
        <StatsSection />
        {pricing}
        <FooterCta />
      </main>

      <Footer />
    </div>
  );
}
