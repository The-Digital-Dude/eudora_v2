// Single source of truth for FAQ copy — consumed by both the visual accordion
// (faq-section.tsx) and the FAQPage JSON-LD block so the two can't drift.
// Every answer here must stay a verified fact about the product, not marketing
// filler. Pricing/billing questions were removed along with the per-campus
// subscription model; re-add them only once the guardian purchase flow exists.

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "What is Eudora?",
    answer:
      "Eudora is an AI-powered education operating system. It brings school operations — attendance, scheduling, enrolment, billing — together with curriculum delivery and student learning in one product, for administrators, teachers, guardians, and students.",
  },
  {
    question: "Does the AI replace teachers?",
    answer:
      "No. Eudora frames AI as practical leverage, not a replacement — personalized learning paths, automated grading, lesson planning, and learning-gap detection are all presented to staff for review. Educators stay in control of the decisions.",
  },
  {
    question: "We have more questions before we commit — who do we talk to?",
    answer:
      "Reach out any time and we'll walk you through the platform and answer questions about your specific campus.",
  },
];
