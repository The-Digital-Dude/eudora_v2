import type {
  BrandColor,
  DensityOption,
  FontOption,
  RadiusOption,
  SidebarCollapsibleOption,
  SidebarSideOption,
  SidebarVariant,
} from "@/types/theme-customizer";

// Radius options
export const radiusOptions: RadiusOption[] = [
  { name: "0", value: "0rem" },
  { name: "0.3", value: "0.3rem" },
  { name: "0.5", value: "0.5rem" },
  { name: "0.75", value: "0.75rem" },
  { name: "1.0", value: "1rem" },
];

// Radius slider bounds (in rem)
export const radiusSlider = {
  min: 0,
  max: 1.5,
  step: 0.025,
};

// Shadow/elevation intensity slider bounds — multiplies every shadow-* token's opacity.
export const shadowSlider = {
  min: 0,
  max: 2,
  step: 0.1,
};

// Font family options. Each cssVar is loaded in the root layout via next/font.
export const fontOptions: FontOption[] = [
  { name: "Plus Jakarta Sans", cssVar: "--font-jakarta" },
  { name: "Inter", cssVar: "--font-inter" },
  { name: "Outfit", cssVar: "--font-outfit" },
  { name: "Nunito Sans", cssVar: "--font-nunito" },
  { name: "Source Serif 4", cssVar: "--font-source-serif" },
];

// Content density options. `spacing` overrides Tailwind v4 --spacing base.
export const densityOptions: DensityOption[] = [
  {
    name: "Compact",
    value: "compact",
    spacing: "0.22rem",
    description: "Tighter spacing, more on screen",
  },
  {
    name: "Comfortable",
    value: "comfortable",
    spacing: "0.25rem",
    description: "Default balanced spacing",
  },
  {
    name: "Spacious",
    value: "spacious",
    spacing: "0.28rem",
    description: "Roomier spacing, less dense",
  },
];

// Sidebar width slider bounds (in rem)
export const sidebarWidthSlider = {
  min: 12,
  max: 22,
  step: 0.5,
};

// UI scale slider bounds (in percent)
export const uiScaleSlider = {
  min: 85,
  max: 115,
  step: 1,
};

// Sidebar variant options
export const sidebarVariants: SidebarVariant[] = [
  { name: "Default", value: "sidebar", description: "Standard sidebar layout" },
  { name: "Floating", value: "floating", description: "Floating sidebar with border" },
  { name: "Inset", value: "inset", description: "Inset sidebar with rounded corners" },
];

// Sidebar collapsible options
export const sidebarCollapsibleOptions: SidebarCollapsibleOption[] = [
  { name: "Off Canvas", value: "offcanvas", description: "Slides out of view" },
  { name: "Icon", value: "icon", description: "Collapses to icon only" },
  { name: "None", value: "none", description: "Always visible" },
];

// Sidebar side options
export const sidebarSideOptions: SidebarSideOption[] = [
  { name: "Left", value: "left" },
  { name: "Right", value: "right" },
];

// Define brand colors for custom color inputs
export const baseColors: BrandColor[] = [
  { name: "Primary", cssVar: "--primary" },
  { name: "Primary Foreground", cssVar: "--primary-foreground" },
  { name: "Secondary", cssVar: "--secondary" },
  { name: "Secondary Foreground", cssVar: "--secondary-foreground" },
  { name: "Accent", cssVar: "--accent" },
  { name: "Accent Foreground", cssVar: "--accent-foreground" },
  { name: "Muted", cssVar: "--muted" },
  { name: "Muted Foreground", cssVar: "--muted-foreground" },
];
