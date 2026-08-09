import type { Metadata } from "next";

import { StructuredData } from "@/components/structured-data";

import { faqItems } from "./landing/content/faq";
import { LandingPageContent } from "./landing/landing-page-content";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function Page() {
  return (
    <>
      <StructuredData data={faqJsonLd} />
      <LandingPageContent />
    </>
  );
}
