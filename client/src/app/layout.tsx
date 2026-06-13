import "./globals.css";
import Providers from "./providers";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased bg-neutral-50 text-neutral-900 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}