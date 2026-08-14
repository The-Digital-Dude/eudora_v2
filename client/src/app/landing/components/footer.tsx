import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const footerLinks = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/#features" },
        { label: "Metrics", href: "/#stats" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/#about" },
        { label: "FAQ", href: "/#faq" },
        { label: "Contact", href: "/#contact" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/40 bg-background py-16 text-xs text-muted-foreground select-none">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {/* Logo Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="rounded-lg bg-foreground p-1.5 text-background shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-display text-sm font-bold tracking-tight text-foreground">
                Eudora
              </span>
            </Link>
            <p className="max-w-[200px] leading-relaxed">
              Orchestrate student paths, automate grading, and manage school districts with AI.
            </p>
          </div>

          {/* Links Columns */}
          {footerLinks.map((group, idx) => (
            <div key={idx} className="space-y-3">
              <h4 className="text-[10px] font-bold tracking-widest text-foreground uppercase">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex flex-col items-center justify-center gap-4 border-t border-border/50 pt-8 text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Eudora Technologies. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
