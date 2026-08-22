import type { Metadata } from "next";

import CoursesSection from "./landing/components/courses-section";
import PricingSection from "./landing/components/pricing-section";
import { LandingPageContent } from "./landing/landing-page-content";

// Courses and prices both come from the catalog, so the homepage revalidates
// with it.
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Page() {
  return <LandingPageContent courses={<CoursesSection />} pricing={<PricingSection />} />;
}
