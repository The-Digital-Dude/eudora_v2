import { z } from "zod";

export const SliderConfigSchema = z.object({
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().default(1),
  unit: z.string().optional(),
  correctValue: z.number().optional(),
});

export const DragDropTargetSchema = z.object({
  id: z.string(),
  placeholder: z.string(),
  correctLabel: z.string(),
});

export const DragDropConfigSchema = z.object({
  labels: z.array(z.string()),
  targets: z.array(DragDropTargetSchema),
});

export const CoordinatePlotterPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const CoordinatePlotterConfigSchema = z.object({
  xRange: z.tuple([z.number(), z.number()]).default([-10, 10]),
  yRange: z.tuple([z.number(), z.number()]).default([-10, 10]),
  gridStep: z.number().default(1),
  correctPoints: z.array(CoordinatePlotterPointSchema).default([]),
  tolerance: z.number().default(0.1),
});

export const GridMatchingItemSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const GridMatchingConfigSchema = z.object({
  left: z.array(GridMatchingItemSchema),
  right: z.array(GridMatchingItemSchema),
  correctPairs: z.array(z.tuple([z.string(), z.string()])), // Array of [leftId, rightId]
});

export const CodePlaygroundTestSchema = z.object({
  input: z.string(),
  expected: z.string(),
});

export const CodePlaygroundConfigSchema = z.object({
  language: z.enum(["javascript", "typescript", "python", "html"]).default("javascript"),
  starterCode: z.string().default(""),
  tests: z.array(CodePlaygroundTestSchema).default([]),
});

export const WidgetConfigSchemaMap = {
  STANDARD_MCQ: z.null().or(z.object({})),
  SLIDER_MANIPULATIVE: SliderConfigSchema,
  DRAG_AND_DROP_LABELS: DragDropConfigSchema,
  COORDINATE_PLOTTER: CoordinatePlotterConfigSchema,
  GRID_MATCHING: GridMatchingConfigSchema,
  CODE_PLAYGROUND: CodePlaygroundConfigSchema,
};

export type SliderConfig = z.infer<typeof SliderConfigSchema>;
export type DragDropConfig = z.infer<typeof DragDropConfigSchema>;
export type CoordinatePlotterConfig = z.infer<typeof CoordinatePlotterConfigSchema>;
export type GridMatchingConfig = z.infer<typeof GridMatchingConfigSchema>;
export type CodePlaygroundConfig = z.infer<typeof CodePlaygroundConfigSchema>;
