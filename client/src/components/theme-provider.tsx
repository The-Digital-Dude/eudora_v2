"use client";

import * as React from "react";

import { ThemeProviderContext } from "@/contexts/theme-context";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  // Persistence intentionally off: every load starts from `defaultTheme`
  // (currently "light", set at the call site) regardless of what a prior
  // session left behind. Swap the initializer back to read `storageKey`
  // here to re-enable.
  const [theme, setTheme] = React.useState<Theme>(defaultTheme);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    // Persistence intentionally off — see the initializer above. `storageKey`
    // is kept as a prop (unused for now) so re-enabling is a one-line diff.
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
