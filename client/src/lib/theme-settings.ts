import { densityOptions } from "@/config/theme-customizer-constants";
import { colorThemes, tweakcnThemes } from "@/config/theme-data";
import { glassTheme } from "@/lib/glass-theme";
import type { ThemeSettings } from "@/types/theme-customizer";

const STORAGE_KEY = "eudora-theme-settings";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  kind: "shadcn",
  shadcnTheme: "default",
  tweakcnTheme: "",
  importedTheme: null,
  brandColors: {},
  // Matches the :root default in globals.css
  radius: "0.625rem",
  // Matches the :root default --shadow-intensity in globals.css
  shadowIntensity: 1,
  fontSans: "--font-jakarta",
  fontDisplay: "--font-outfit",
  density: "comfortable",
  sidebarWidth: "16rem",
  uiScale: 100,
  sidebar: {
    variant: "inset",
    collapsible: "offcanvas",
    side: "left",
  },
};

// Color-related CSS variables that any theme preset may set. Cleared before
// applying a new palette so switching themes never leaves stale overrides.
const COLOR_VARS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
];

export function loadThemeSettings(): ThemeSettings {
  if (typeof window === "undefined") return DEFAULT_THEME_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>;
    return {
      ...DEFAULT_THEME_SETTINGS,
      ...parsed,
      sidebar: { ...DEFAULT_THEME_SETTINGS.sidebar, ...(parsed.sidebar ?? {}) },
      brandColors: { ...(parsed.brandColors ?? {}) },
    };
  } catch {
    return DEFAULT_THEME_SETTINGS;
  }
}

export function saveThemeSettings(settings: ThemeSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable — ignore; in-session styling still works.
  }
}

/** Returns the resolved color palette (light or dark) for the active theme kind. */
function resolvePalette(
  settings: ThemeSettings,
  isDarkMode: boolean,
): Record<string, string> {
  if (settings.kind === "glass") {
    return isDarkMode ? glassTheme.dark : glassTheme.light;
  }
  if (settings.kind === "imported" && settings.importedTheme) {
    return isDarkMode ? settings.importedTheme.dark : settings.importedTheme.light;
  }
  if (settings.kind === "tweakcn" && settings.tweakcnTheme) {
    const preset = tweakcnThemes.find((t) => t.value === settings.tweakcnTheme)?.preset;
    if (preset) return isDarkMode ? preset.styles.dark : preset.styles.light;
  }
  const shadcn = colorThemes.find((t) => t.value === settings.shadcnTheme)?.preset;
  if (shadcn) return isDarkMode ? shadcn.styles.dark : shadcn.styles.light;
  return {};
}

/** Writes every persisted setting to the document root as CSS variables. */
export function applyThemeSettings(settings: ThemeSettings, isDarkMode: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // 1. Toggle the glass CSS class — the backdrop-filter rules live in globals.css
  //    and can't be expressed as CSS custom properties.
  if (settings.kind === "glass") {
    root.classList.add("theme-glass");
  } else {
    root.classList.remove("theme-glass");
  }

  // 2. Colors — clear known color vars, then apply the resolved palette.
  COLOR_VARS.forEach((name) => root.style.removeProperty(`--${name}`));
  const palette = resolvePalette(settings, isDarkMode);
  Object.entries(palette).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  // 3. Brand color overrides sit on top of the palette.
  Object.entries(settings.brandColors).forEach(([cssVar, value]) => {
    if (value) root.style.setProperty(cssVar, value);
  });

  // 4. Radius.
  root.style.setProperty("--radius", settings.radius);

  // 4b. Shadow/elevation intensity — scales every shadow-* token's opacity.
  root.style.setProperty("--shadow-intensity", String(settings.shadowIntensity));

  // 5. Fonts.
  root.style.setProperty("--font-sans", `var(${settings.fontSans})`);
  root.style.setProperty("--font-display", `var(${settings.fontDisplay})`);

  // 6. Density (Tailwind v4 spacing base).
  const density =
    densityOptions.find((d) => d.value === settings.density) ?? densityOptions[1];
  root.style.setProperty("--spacing", density.spacing);

  // 7. Sidebar width.
  root.style.setProperty("--app-sidebar-width", settings.sidebarWidth);

  // 8. UI scale — scales every rem-based size app-wide.
  root.style.fontSize = `${settings.uiScale}%`;
}
