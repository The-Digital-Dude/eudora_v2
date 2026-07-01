"use client";

import "./circular-transition.css";

import { Dices, Moon, Sun, Upload } from "lucide-react";
import React from "react";

import { ColorPicker } from "@/components/color-picker";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  baseColors,
  densityOptions,
  fontOptions,
  radiusSlider,
} from "@/config/theme-customizer-constants";
import { colorThemes, tweakcnThemes } from "@/config/theme-data";
import { useThemeSettings } from "@/contexts/theme-settings-context";
import { useCircularTransition } from "@/hooks/use-circular-transition";

interface ThemeTabProps {
  onImportClick: () => void;
}

export function ThemeTab({ onImportClick }: ThemeTabProps) {
  const { settings, isDarkMode, update } = useThemeSettings();
  const { toggleTheme } = useCircularTransition();

  const radiusRem = parseFloat(settings.radius) || 0;

  const handleRandomShadcn = () => {
    const randomTheme = colorThemes[Math.floor(Math.random() * colorThemes.length)];
    update({
      kind: "shadcn",
      shadcnTheme: randomTheme.value,
      tweakcnTheme: "",
      importedTheme: null,
      brandColors: {},
    });
  };

  const handleRandomTweakcn = () => {
    const randomTheme = tweakcnThemes[Math.floor(Math.random() * tweakcnThemes.length)];
    update({
      kind: "tweakcn",
      tweakcnTheme: randomTheme.value,
      shadcnTheme: "",
      importedTheme: null,
      brandColors: {},
    });
  };

  const handleColorChange = (cssVar: string, value: string) => {
    update({ brandColors: { ...settings.brandColors, [cssVar]: value } });
  };

  const handleLightMode = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDarkMode === false) return;
    toggleTheme(event);
  };

  const handleDarkMode = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDarkMode === true) return;
    toggleTheme(event);
  };

  return (
    <div className="space-y-6 p-4">
      {/* ── Glass Theme ── */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Signature Theme</Label>
        <button
          type="button"
          onClick={() =>
            update({
              kind: "glass",
              shadcnTheme: "",
              tweakcnTheme: "",
              importedTheme: null,
              brandColors: {},
            })
          }
          className={`group relative w-full cursor-pointer overflow-hidden rounded-xl border-2 p-0 text-left transition-all duration-200 ${
            settings.kind === "glass"
              ? "border-primary/70 shadow-lg shadow-primary/20"
              : "border-border hover:border-primary/40"
          }`}
        >
          {/* Gradient preview */}
          <div
            className="relative h-20 w-full"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 20% 0%, oklch(0.80 0.12 290 / 0.60) 0%, transparent 70%), radial-gradient(ellipse 70% 50% at 80% 100%, oklch(0.78 0.14 220 / 0.50) 0%, transparent 65%), linear-gradient(145deg, oklch(0.94 0.04 280), oklch(0.96 0.03 240), oklch(0.95 0.04 310))",
            }}
          >
            {/* Mini frosted card mockups */}
            <div
              className="absolute top-3 left-4 h-9 w-16 rounded-lg border border-white/40 shadow-sm"
              style={{ background: "oklch(1 0 0 / 0.55)", backdropFilter: "blur(8px)" }}
            />
            <div
              className="absolute top-5 left-16 h-7 w-20 rounded-lg border border-white/30 shadow-sm"
              style={{ background: "oklch(1 0 0 / 0.40)", backdropFilter: "blur(6px)" }}
            />
            <div
              className="absolute right-4 top-2 h-12 w-12 rounded-xl border border-white/35 shadow-sm"
              style={{ background: "oklch(0.92 0.06 265 / 0.45)", backdropFilter: "blur(8px)" }}
            />
            {/* Label */}
            <div className="absolute right-3 bottom-2 flex items-center gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-white/90 uppercase"
                style={{ background: "oklch(0.54 0.22 265 / 0.70)", backdropFilter: "blur(4px)" }}
              >
                Glass
              </span>
            </div>
          </div>
          {/* Description row */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold text-foreground">Frosted Glass</span>
            <span className="text-[10px] font-medium text-muted-foreground">
              Violet · Translucent
            </span>
          </div>
          {/* Selected ring */}
          {settings.kind === "glass" && (
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary/50" />
          )}
        </button>
      </div>

      <Separator />

      {/* Shadcn UI Theme Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Shadcn UI Theme Presets</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomShadcn}
            className="cursor-pointer"
          >
            <Dices className="mr-1.5 h-3.5 w-3.5" />
            Random
          </Button>
        </div>

        <Select
          value={settings.kind === "shadcn" ? settings.shadcnTheme : ""}
          onValueChange={(value) =>
            update({
              kind: "shadcn",
              shadcnTheme: value,
              tweakcnTheme: "",
              importedTheme: null,
              brandColors: {},
            })
          }
        >
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Choose Shadcn Theme" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <div className="p-2">
              {colorThemes.map((theme) => (
                <SelectItem key={theme.value} value={theme.value} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div
                        className="border-border/20 h-3 w-3 rounded-full border"
                        style={{ backgroundColor: theme.preset.styles.light.primary }}
                      />
                      <div
                        className="border-border/20 h-3 w-3 rounded-full border"
                        style={{ backgroundColor: theme.preset.styles.light.secondary }}
                      />
                      <div
                        className="border-border/20 h-3 w-3 rounded-full border"
                        style={{ backgroundColor: theme.preset.styles.light.accent }}
                      />
                      <div
                        className="border-border/20 h-3 w-3 rounded-full border"
                        style={{ backgroundColor: theme.preset.styles.light.muted }}
                      />
                    </div>
                    <span>{theme.name}</span>
                  </div>
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Tweakcn Theme Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Tweakcn Theme Presets</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomTweakcn}
            className="cursor-pointer"
          >
            <Dices className="mr-1.5 h-3.5 w-3.5" />
            Random
          </Button>
        </div>

        <Select
          value={settings.kind === "tweakcn" ? settings.tweakcnTheme : ""}
          onValueChange={(value) =>
            update({
              kind: "tweakcn",
              tweakcnTheme: value,
              shadcnTheme: "",
              importedTheme: null,
              brandColors: {},
            })
          }
        >
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Choose Tweakcn Theme" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <div className="p-2">
              {tweakcnThemes.map((theme) => (
                <SelectItem key={theme.value} value={theme.value} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div
                        className="border-border/20 h-3 w-3 rounded-full border"
                        style={{ backgroundColor: theme.preset.styles.light.primary }}
                      />
                      <div
                        className="border-border/20 h-3 w-3 rounded-full border"
                        style={{ backgroundColor: theme.preset.styles.light.secondary }}
                      />
                      <div
                        className="border-border/20 h-3 w-3 rounded-full border"
                        style={{ backgroundColor: theme.preset.styles.light.accent }}
                      />
                      <div
                        className="border-border/20 h-3 w-3 rounded-full border"
                        style={{ backgroundColor: theme.preset.styles.light.muted }}
                      />
                    </div>
                    <span>{theme.name}</span>
                  </div>
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Radius Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Radius</Label>
          <span className="text-muted-foreground text-xs font-semibold tabular-nums">
            {radiusRem.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}rem
          </span>
        </div>
        <Slider
          min={radiusSlider.min}
          max={radiusSlider.max}
          step={radiusSlider.step}
          value={radiusRem}
          onValueChange={(v) => update({ radius: `${v}rem` })}
        />
      </div>

      <Separator />

      {/* Font Family */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Typography</Label>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Body font</Label>
          <Select
            value={settings.fontSans}
            onValueChange={(value) => update({ fontSans: value })}
          >
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder="Choose body font" />
            </SelectTrigger>
            <SelectContent>
              {fontOptions.map((font) => (
                <SelectItem key={font.cssVar} value={font.cssVar} className="cursor-pointer">
                  <span style={{ fontFamily: `var(${font.cssVar})` }}>{font.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Display / heading font</Label>
          <Select
            value={settings.fontDisplay}
            onValueChange={(value) => update({ fontDisplay: value })}
          >
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder="Choose display font" />
            </SelectTrigger>
            <SelectContent>
              {fontOptions.map((font) => (
                <SelectItem key={font.cssVar} value={font.cssVar} className="cursor-pointer">
                  <span style={{ fontFamily: `var(${font.cssVar})` }}>{font.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Content Density */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Content Density</Label>
        <div className="grid grid-cols-3 gap-2">
          {densityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => update({ density: option.value })}
              className={`cursor-pointer rounded-md border p-3 text-center transition-colors ${
                settings.density === option.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-border/60"
              }`}
            >
              <div className="text-xs font-medium">{option.name}</div>
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {densityOptions.find((d) => d.value === settings.density)?.description}
        </p>
      </div>

      <Separator />

      {/* Mode Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={!isDarkMode ? "secondary" : "outline"}
            size="sm"
            onClick={handleLightMode}
            className="cursor-pointer"
          >
            <Sun className="mr-1 h-4 w-4" />
            Light
          </Button>
          <Button
            variant={isDarkMode ? "secondary" : "outline"}
            size="sm"
            onClick={handleDarkMode}
            className="cursor-pointer"
          >
            <Moon className="mr-1 h-4 w-4" />
            Dark
          </Button>
        </div>
      </div>

      <Separator />

      {/* Import Theme Button */}
      <div className="space-y-3">
        <Button
          variant="outline"
          size="lg"
          onClick={onImportClick}
          className="w-full cursor-pointer"
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Import Theme
        </Button>
      </div>

      {/* Brand Colors Section */}
      <Accordion type="single" collapsible className="w-full rounded-lg border-b">
        <AccordionItem
          value="brand-colors"
          className="border-border overflow-hidden rounded-lg border"
        >
          <AccordionTrigger className="hover:bg-muted/50 px-4 py-3 transition-colors hover:no-underline">
            <Label className="cursor-pointer text-sm font-medium">Brand Colors</Label>
          </AccordionTrigger>
          <AccordionContent className="border-border bg-muted/20 space-y-3 border-t px-4 pt-2 pb-4">
            {baseColors.map((color) => (
              <div key={color.cssVar} className="flex items-center justify-between">
                <ColorPicker
                  label={color.name}
                  cssVar={color.cssVar}
                  value={settings.brandColors[color.cssVar] || ""}
                  onChange={handleColorChange}
                />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
