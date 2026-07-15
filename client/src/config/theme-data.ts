import { eudoraProfessionalPreset } from "@/config/eudora-professional-preset";
import type { ColorTheme } from "@/types/theme-customizer";
import { shadcnThemePresets } from "@/utils/shadcn-ui-theme-presets";
import { tweakcnPresets } from "@/utils/tweakcn-theme-presets";

// Tweakcn theme presets for the dropdown - convert from tweakcnPresets
export const tweakcnThemes: ColorTheme[] = Object.entries(tweakcnPresets).map(([key, preset]) => ({
  name: preset.label || key,
  value: key,
  preset: preset,
}));

// Shadcn theme presets for the dropdown - convert from shadcnThemePresets.
// "Eudora Professional" (the platform's own signature palette) is listed first.
export const colorThemes: ColorTheme[] = [
  {
    name: eudoraProfessionalPreset.label!,
    value: "eudora-professional",
    preset: eudoraProfessionalPreset,
  },
  ...Object.entries(shadcnThemePresets).map(([key, preset]) => ({
    name: preset.label || key,
    value: key,
    preset: preset,
  })),
];
