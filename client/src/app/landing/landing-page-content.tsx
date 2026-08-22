"use client";

import FeaturesSection from "./components/features-section";
import Footer from "./components/footer";
import FooterCta from "./components/footer-cta";
import HeroSection from "./components/hero-section";
import Navbar from "./components/navbar";

/**
 * `courses` and `pricing` are injected from the server page rather than
 * imported here: both read the live catalog, so they have to be server
 * components, and this file is a client component. Passing them as nodes is
 * what lets the two coexist.
 *
 * Two bands are deliberately gone. A stats strip advertised "+15% Grade Boost",
 * "200k+ Graded Tasks" and "15+ Districts" — none of which were measured — and
 * an app-download band offered App Store and Google Play downloads for apps
 * that have not shipped.
 */
export function LandingPageContent({
  courses,
  pricing,
}: {
  courses?: React.ReactNode;
  pricing?: React.ReactNode;
}) {
  return (
    <div className="font-landing flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        {courses}
        <FeaturesSection />
        {pricing}
        <FooterCta />
      </main>

      <Footer />
    </div>
  );
}
