"use client";

import * as React from "react";

import { useTheme } from "@/hooks/use-theme";
import {
  applyThemeSettings,
  DEFAULT_THEME_SETTINGS,
  loadThemeSettings,
  saveThemeSettings,
} from "@/lib/theme-settings";
import type { ThemeSettings } from "@/types/theme-customizer";

interface ThemeSettingsContextValue {
  settings: ThemeSettings;
  isDarkMode: boolean;
  /** Merge a partial update, persist it, and apply it live. */
  update: (partial: Partial<ThemeSettings>) => void;
  /** Restore application defaults. */
  reset: () => void;
}

const ThemeSettingsContext = React.createContext<ThemeSettingsContextValue | null>(null);

export function ThemeSettingsProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const isDarkMode = React.useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }, [theme]);

  const [settings, setSettings] = React.useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage once on mount.
  React.useEffect(() => {
    setSettings(loadThemeSettings());
    setHydrated(true);
  }, []);

  // Apply on every settings/mode change once hydrated.
  React.useEffect(() => {
    if (!hydrated) return;
    applyThemeSettings(settings, isDarkMode);
  }, [settings, isDarkMode, hydrated]);

  const update = React.useCallback((partial: Partial<ThemeSettings>) => {
    setSettings((prev) => {
      const next: ThemeSettings = {
        ...prev,
        ...partial,
        sidebar: { ...prev.sidebar, ...(partial.sidebar ?? {}) },
        brandColors:
          partial.brandColors !== undefined ? partial.brandColors : prev.brandColors,
      };
      saveThemeSettings(next);
      return next;
    });
  }, []);

  const reset = React.useCallback(() => {
    saveThemeSettings(DEFAULT_THEME_SETTINGS);
    setSettings(DEFAULT_THEME_SETTINGS);
  }, []);

  return (
    <ThemeSettingsContext.Provider value={{ settings, isDarkMode, update, reset }}>
      {children}
    </ThemeSettingsContext.Provider>
  );
}

export function useThemeSettings() {
  const ctx = React.useContext(ThemeSettingsContext);
  if (!ctx) {
    throw new Error("useThemeSettings must be used within a ThemeSettingsProvider");
  }
  return ctx;
}
