// Single source of truth for FAQ copy — consumed by both the visual accordion
// (faq-section.tsx) and the FAQPage JSON-LD block so the two can't drift.
// Every answer here is a verified fact about the product/billing model, not
// marketing filler — see services/api-service/src/billing/** for the source
// of truth on trial length, checkout, and the billing portal.

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
    question: "How is Eudora priced?",
    answer:
      "Eudora is billed per campus, monthly or annually, through Stripe. Plans differ by student, campus, and programme limits and by which features are included — see the Pricing page for current plans.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Every paid plan starts with a 14-day free trial before your card is charged.",
  },
  {
    question: "Can we change or cancel our plan later?",
    answer:
      "Yes. You can upgrade, downgrade, update your payment method, or cancel at any time from your account's billing portal — no need to contact us to make changes.",
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
