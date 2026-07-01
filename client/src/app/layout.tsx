import "./globals.css";

import {
  Inter,
  Nunito_Sans,
  Outfit,
  Plus_Jakarta_Sans,
  Source_Serif_4,
} from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { ThemeSettingsProvider } from "@/contexts/theme-settings-context";

import Providers from "./providers";

// Curated font set — each exposes its own CSS variable so the customizer can
// swap --font-sans / --font-display between them at runtime.
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });

const fontVariables = [
  plusJakartaSans.variable,
  outfit.variable,
  inter.variable,
  nunitoSans.variable,
  sourceSerif.variable,
].join(" ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
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
