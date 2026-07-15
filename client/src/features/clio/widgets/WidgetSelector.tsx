"use client";

import React from "react";

import type { ClioQuestion } from "../clioApi";
import { CodePlaygroundWidget } from "./CodePlaygroundWidget";
import { ComingSoonWidget } from "./ComingSoonWidget";
import { CoordinatePlotterWidget } from "./CoordinatePlotterWidget";
import { DragDropWidget } from "./DragDropWidget";
import { GridMatchingWidget } from "./GridMatchingWidget";
import { MCQWidget } from "./MCQWidget";
import { SliderWidget } from "./SliderWidget";

export interface WidgetSelectorProps {
  question: ClioQuestion;
  currentState: any;
  onStateChange: (newState: any) => void;
  locked: boolean;
  isCorrect?: boolean | null;
}

export function WidgetSelector({
  question,
  currentState,
  onStateChange,
  locked,
  isCorrect,
}: WidgetSelectorProps) {
  const widgetType = question.widgetType ?? "STANDARD_MCQ";

  switch (widgetType) {
    case "STANDARD_MCQ":
      return (
        <MCQWidget
          options={question.options}
          selectedId={currentState?.selectedOptionId ?? null}
          onSelect={(id) => onStateChange({ selectedOptionId: id })}
          locked={locked}
          isCorrect={isCorrect}
        />
      );

    case "SLIDER_MANIPULATIVE":
      return (
        <SliderWidget
          config={(question.widgetConfig as any) ?? { min: 0, max: 100, step: 1 }}
          value={currentState?.finalValue ?? question.widgetConfig?.min ?? 0}
          onChange={(val) => onStateChange({ finalValue: val })}
          locked={locked}
        />
      );

    case "DRAG_AND_DROP_LABELS":
      return (
        <DragDropWidget
          config={(question.widgetConfig as any) ?? { labels: [], targets: [] }}
          placements={currentState?.placements ?? {}}
          onChange={(placements) => onStateChange({ placements })}
          locked={locked}
        />
      );

    case "COORDINATE_PLOTTER":
      return (
        <CoordinatePlotterWidget
          config={(question.widgetConfig as any) ?? { xRange: [-10, 10], yRange: [-10, 10], gridStep: 1, correctPoints: [] }}
          value={currentState}
          onChange={(newValue) => onStateChange(newValue)}
          locked={locked}
          isCorrect={isCorrect}
        />
      );

    case "GRID_MATCHING":
      return (
        <GridMatchingWidget
          config={(question.widgetConfig as any) ?? { left: [], right: [], correctPairs: [] }}
          value={currentState}
          onChange={(newValue) => onStateChange(newValue)}
          locked={locked}
          isCorrect={isCorrect}
        />
      );

    case "CODE_PLAYGROUND":
      return (
        <CodePlaygroundWidget
          config={(question.widgetConfig as any) ?? { language: "javascript", starterCode: "", tests: [] }}
          value={currentState}
          onChange={(newValue) => onStateChange(newValue)}
          locked={locked}
          isCorrect={isCorrect}
        />
      );

    default:
      return <ComingSoonWidget widgetType={widgetType} />;
  }
}
