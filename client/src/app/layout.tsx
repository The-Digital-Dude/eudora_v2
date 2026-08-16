import "./globals.css";

import type { Metadata } from "next";
import {
  Fredoka,
  Inter,
  Nunito_Sans,
  Outfit,
  Plus_Jakarta_Sans,
  Source_Serif_4,
} from "next/font/google";

import { StructuredData } from "@/components/structured-data";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_NAME, SITE_URL } from "@/config/site";
import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { ThemeSettingsProvider } from "@/contexts/theme-settings-context";

import Providers from "./providers";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description:
    "AI-powered education operating system: personalized learning paths, automated grading, and school administration in one place.",
};

// Curated font set — each exposes its own CSS variable so the customizer can
// swap --font-sans / --font-display between them at runtime.
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });
// Landing-page-only font, scoped in globals.css via .font-landing — not part
// of the customizer's swappable set.
const fredoka = Fredoka({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-fredoka" });

const fontVariables = [
  plusJakartaSans.variable,
  outfit.variable,
  inter.variable,
  nunitoSans.variable,
  sourceSerif.variable,
  fredoka.variable,
].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Eudora",
    template: "%s | Eudora",
  },
  description:
    "AI-powered education operating system: personalized learning paths, automated grading, and school administration in one place.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Eudora",
    description:
      "AI-powered education operating system: personalized learning paths, automated grading, and school administration in one place.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Eudora",
    description:
      "AI-powered education operating system: personalized learning paths, automated grading, and school administration in one place.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <StructuredData data={organizationJsonLd} />
        <ThemeProvider defaultTheme="system" storageKey="eudora-admin-theme">
          <ThemeSettingsProvider>
            <SidebarConfigProvider>
              <Providers>{children}</Providers>
            </SidebarConfigProvider>
          </ThemeSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
