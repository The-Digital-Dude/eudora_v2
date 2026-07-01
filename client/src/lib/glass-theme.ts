/**
 * Glass theme color presets.
 *
 * Backgrounds use oklch with an alpha channel so the body gradient bleeds
 * through every surface. Backdrop-filter (blur/saturate) is applied via the
 * `.theme-glass` CSS class in globals.css — CSS variables can't carry
 * `backdrop-filter` values, so the two halves need to work together.
 *
 * Hue 265 ≈ violet-indigo — gives the slightly magical tint characteristic
 * of premium frosted glass without competing with content.
 */
export const glassTheme = {
  light: {
    // Page canvas — semi-transparent so the body gradient shows through
    background: "oklch(0.98 0.006 265 / 0.45)",
    foreground: "oklch(0.14 0.04 265)",

    // Cards — slightly more opaque than the canvas, giving a sense of lift
    card: "oklch(1 0 0 / 0.62)",
    "card-foreground": "oklch(0.14 0.04 265)",

    // Popover / dropdown panels — more opaque so text stays crisp
    popover: "oklch(1 0 0 / 0.82)",
    "popover-foreground": "oklch(0.14 0.04 265)",

    // Violet-indigo brand
    primary: "oklch(0.54 0.22 265)",
    "primary-foreground": "oklch(0.99 0 0)",

    secondary: "oklch(0.94 0.03 265 / 0.55)",
    "secondary-foreground": "oklch(0.24 0.07 265)",

    muted: "oklch(0.93 0.02 265 / 0.48)",
    "muted-foreground": "oklch(0.50 0.05 265)",

    accent: "oklch(0.91 0.05 290 / 0.50)",
    "accent-foreground": "oklch(0.24 0.07 265)",

    destructive: "oklch(0.577 0.245 27.325)",
    "destructive-foreground": "oklch(0.99 0 0)",

    // Borders very faint so glass edges barely register
    border: "oklch(0.78 0.04 265 / 0.35)",
    input: "oklch(0.96 0.01 265 / 0.55)",
    ring: "oklch(0.54 0.22 265 / 0.45)",

    // Charts — richer colours so data pops through the frosted canvas
    "chart-1": "oklch(0.62 0.22 265)",
    "chart-2": "oklch(0.66 0.18 320)",
    "chart-3": "oklch(0.60 0.20 165)",
    "chart-4": "oklch(0.70 0.18 80)",
    "chart-5": "oklch(0.64 0.20 200)",

    // Sidebar — more translucent than cards, letting the gradient shine
    sidebar: "oklch(0.97 0.009 265 / 0.42)",
    "sidebar-foreground": "oklch(0.14 0.04 265)",
    "sidebar-primary": "oklch(0.54 0.22 265)",
    "sidebar-primary-foreground": "oklch(0.99 0 0)",
    "sidebar-accent": "oklch(0.92 0.04 265 / 0.48)",
    "sidebar-accent-foreground": "oklch(0.24 0.07 265)",
    "sidebar-border": "oklch(0.78 0.04 265 / 0.25)",
    "sidebar-ring": "oklch(0.54 0.22 265 / 0.45)",
    success: "oklch(0.55 0.18 165)",
    "success-foreground": "oklch(0.98 0 0)",
    warning: "oklch(0.72 0.18 80)",
    "warning-foreground": "oklch(0.15 0 0)",
  },

  dark: {
    background: "oklch(0.12 0.05 265 / 0.55)",
    foreground: "oklch(0.92 0.02 265)",

    card: "oklch(0.19 0.05 265 / 0.52)",
    "card-foreground": "oklch(0.92 0.02 265)",

    popover: "oklch(0.16 0.05 265 / 0.85)",
    "popover-foreground": "oklch(0.92 0.02 265)",

    primary: "oklch(0.74 0.20 265)",
    "primary-foreground": "oklch(0.10 0.04 265)",

    secondary: "oklch(0.23 0.05 265 / 0.55)",
    "secondary-foreground": "oklch(0.86 0.03 265)",

    muted: "oklch(0.21 0.04 265 / 0.48)",
    "muted-foreground": "oklch(0.60 0.04 265)",

    accent: "oklch(0.26 0.07 290 / 0.52)",
    "accent-foreground": "oklch(0.88 0.03 265)",

    destructive: "oklch(0.704 0.191 22.216)",
    "destructive-foreground": "oklch(0.99 0 0)",

    border: "oklch(0.44 0.06 265 / 0.28)",
    input: "oklch(0.23 0.05 265 / 0.52)",
    ring: "oklch(0.74 0.20 265 / 0.45)",

    "chart-1": "oklch(0.74 0.20 265)",
    "chart-2": "oklch(0.72 0.18 320)",
    "chart-3": "oklch(0.68 0.20 165)",
    "chart-4": "oklch(0.74 0.18 80)",
    "chart-5": "oklch(0.70 0.20 200)",

    sidebar: "oklch(0.14 0.05 265 / 0.48)",
    "sidebar-foreground": "oklch(0.88 0.02 265)",
    "sidebar-primary": "oklch(0.74 0.20 265)",
    "sidebar-primary-foreground": "oklch(0.10 0.04 265)",
    "sidebar-accent": "oklch(0.22 0.05 265 / 0.48)",
    "sidebar-accent-foreground": "oklch(0.86 0.03 265)",
    "sidebar-border": "oklch(0.44 0.06 265 / 0.20)",
    "sidebar-ring": "oklch(0.74 0.20 265 / 0.45)",
    success: "oklch(0.60 0.18 165)",
    "success-foreground": "oklch(0.15 0 0)",
    warning: "oklch(0.78 0.16 80)",
    "warning-foreground": "oklch(0.15 0 0)",
  },
} as const;
