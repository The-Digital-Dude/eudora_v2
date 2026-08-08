import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { faqItems } from "../content/faq";

export default function FaqSection() {
  return (
    <section id="faq" className="border-t border-border/40 bg-background py-20 select-none">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
          <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm">
            FAQ
          </span>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Questions, answered.
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, idx) => (
            <AccordionItem
              key={idx}
              value={`item-${idx}`}
              className="rounded-none border-border/50 first:rounded-t-2xl last:rounded-b-2xl"
            >
              <AccordionTrigger className="font-display text-left text-sm font-bold text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
