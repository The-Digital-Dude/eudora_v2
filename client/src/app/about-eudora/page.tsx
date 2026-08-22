import type { Metadata } from "next";

import { StructuredData } from "@/components/structured-data";
import { SITE_NAME } from "@/config/site";
import { absoluteUrl } from "@/lib/public-catalog";

import { AboutEudoraContent } from "./about-content";

const TITLE = "How Eudora works";
const DESCRIPTION =
  "Try Eudora before you sign up: answer a real lesson card with Clio, our AI tutor, play with the interactive widgets kids learn on, and see exactly what a parent gets to check.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about-eudora" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/about-eudora"),
    type: "website",
  },
};

/**
 * Fully static — the demo is scripted client-side rather than calling the
 * lesson API, so this page prerenders, costs nothing to serve, and keeps
 * working when the API is down. See `components/demo-lesson.ts` for why.
 */
export default function AboutEudoraPage() {
  return (
    <>
      <StructuredData
        id="about-eudora-faq"
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is Clio?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Clio is Eudora's AI tutor. She works from lesson cards a teacher wrote, with the hints and explanations written alongside them, so she stays inside the curriculum rather than free-typing at a child.",
              },
            },
            {
              "@type": "Question",
              name: "Are there real teachers?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Live courses are sold as a seat in a small cohort with a named lead teacher, a fixed weekly slot, and attendance marked per session by the teacher who ran it.",
              },
            },
            {
              "@type": "Question",
              name: "What can a parent see?",
              acceptedAnswer: {
                "@type": "Answer",
                text: `In the ${SITE_NAME} family portal a guardian sees their child's report card, attendance calendar, homework status, and every course the family has bought along with when access ends.`,
              },
            },
          ],
        }}
      />
      <AboutEudoraContent />
    </>
  );
}
