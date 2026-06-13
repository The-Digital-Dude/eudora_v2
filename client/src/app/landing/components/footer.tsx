import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Footer() {
  const footerLinks = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Metrics", href: "#stats" },
        { label: "Pricing", href: "/pricing" }
      ]
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "Status Page", href: "/status" },
        { label: "Changelog", href: "/changelog" }
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Blog", href: "/blog" },
        { label: "Security", href: "/security" }
      ]
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
        { label: "SLA Policy", href: "/sla" }
      ]
    }
  ];

  return (
    <footer className="py-16 bg-white border-t border-neutral-200/40 select-none text-xs text-neutral-400">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          
          {/* Logo Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-neutral-900 text-white rounded-lg shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold tracking-tight text-neutral-900 font-display">
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
              <h4 className="font-bold text-neutral-900 uppercase tracking-widest text-[10px]">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link href={link.href} className="hover:text-neutral-900 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom row */}
        <div className="border-t border-neutral-100 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-400">
          <p>© {new Date().getFullYear()} Eudora Technologies. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-neutral-900 cursor-pointer">Twitter</span>
            <span className="hover:text-neutral-900 cursor-pointer">GitHub</span>
            <span className="hover:text-neutral-900 cursor-pointer">Discord</span>
          </div>
        </div>

      </div>
    </footer>
  );
}