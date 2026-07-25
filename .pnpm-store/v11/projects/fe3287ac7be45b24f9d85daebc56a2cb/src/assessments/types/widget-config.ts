export interface SliderManipulativeConfig {
  min: number;
  max: number;
  step: number;
}

export interface CoordinatePlotterConfig {
  correctPoints: Array<{ x: number; y: number }>;
  tolerance: number;
}

export interface GridMatchingConfig {
  correctPairs: Array<[string, string]>;
}

export interface DragDropConfig {
  items: Array<{ id: string; text: string; correctPlacement: string }>;
}

export type WidgetConfig =
  | SliderManipulativeConfig
  | CoordinatePlotterConfig
  | GridMatchingConfig
  | DragDropConfig
  | null;

export interface InteractionState {
  finalValue?: number;
  points?: Array<{ x: number; y: number }>;
  pairs?: Array<[string, string]>;
  dragState?: Record<string, string>;
  [key: string]: unknown;
}
