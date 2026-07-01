export interface ThemePreset {
  label?: string;
  styles: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export interface ColorTheme {
  name: string;
  value: string;
  preset: ThemePreset;
}

export interface SidebarVariant {
  name: string;
  value: "sidebar" | "floating" | "inset";
  description: string;
}

export interface SidebarCollapsibleOption {
  name: string;
  value: "offcanvas" | "icon" | "none";
  description: string;
}

export interface SidebarSideOption {
  name: string;
  value: "left" | "right";
}

export interface RadiusOption {
  name: string;
  value: string;
}

export interface BrandColor {
  name: string;
  cssVar: string;
}

export interface ImportedTheme {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface FontOption {
  name: string;
  /** CSS variable that resolves to the loaded font family, e.g. "--font-jakarta" */
  cssVar: string;
}

export type DensityValue = "compact" | "comfortable" | "spacious";

export interface DensityOption {
  name: string;
  value: DensityValue;
  /** Tailwind --spacing base used to scale all spacing utilities */
  spacing: string;
  description: string;
}

export type ThemeKind = "shadcn" | "tweakcn" | "imported" | "glass";

/**
 * The full, persisted customization state. Stored as a single JSON blob in
 * localStorage and re-applied on load so styling survives reloads.
 */
export interface ThemeSettings {
  kind: ThemeKind;
  shadcnTheme: string;
  tweakcnTheme: string;
  importedTheme: ImportedTheme | null;
  /** Per-variable brand color overrides, keyed by cssVar (e.g. "--primary") */
  brandColors: Record<string, string>;
  radius: string;
  fontSans: string;
  fontDisplay: string;
  density: DensityValue;
  sidebarWidth: string;
  uiScale: number;
  sidebar: {
    variant: "sidebar" | "floating" | "inset";
    collapsible: "offcanvas" | "icon" | "none";
    side: "left" | "right";
  };
}
