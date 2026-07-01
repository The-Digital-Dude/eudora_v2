"use client";

import * as React from "react";

export interface SidebarConfig {
  variant: "sidebar" | "floating" | "inset";
  collapsible: "offcanvas" | "icon" | "none";
  side: "left" | "right";
}

export interface SidebarContextValue {
  config: SidebarConfig;
  updateConfig: (config: Partial<SidebarConfig>) => void;
}

export const SidebarContext = React.createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = "eudora-sidebar-config";

const DEFAULT_CONFIG: SidebarConfig = {
  variant: "inset",
  collapsible: "offcanvas",
  side: "left",
};

function loadConfig(): SidebarConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<SidebarConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function SidebarConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<SidebarConfig>(DEFAULT_CONFIG);

  // Hydrate persisted config on mount (avoids SSR/client markup mismatch).
  React.useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const updateConfig = React.useCallback((newConfig: Partial<SidebarConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...newConfig };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore persistence failures
        }
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ config, updateConfig }}>{children}</SidebarContext.Provider>
  );
}

export function useSidebarConfig() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarConfig must be used within a SidebarConfigProvider");
  }
  return context;
}
