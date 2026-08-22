import Image from "next/image";
import Link from "next/link";

// "Metrics" used to sit here, pointing at a band of invented figures.
const footerLinks = [
  { label: "How it works", href: "/about-eudora" },
  { label: "Courses", href: "/explore" },
  { label: "Pricing", href: "/#pricing" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background py-16 text-xs text-muted-foreground select-none">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          {/* Logo */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/landing/eudora_logo.png"
                alt="Eudora"
                width={218}
                height={72}
                className="h-7 w-auto"
              />
            </Link>
            <p className="max-w-[240px] leading-relaxed">
              Interactive lessons and live cohorts for children from Pre-K to Grade 6.
            </p>
          </div>

          {/* Links */}
          <ul className="flex gap-6">
            {footerLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex flex-col items-center justify-center gap-4 border-t border-border/50 pt-8 text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Eudora Technologies. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
