"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Code } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoordinatePlotterWidget } from "@/features/clio/widgets/CoordinatePlotterWidget";

interface WidgetConfigEditorProps {
  widgetType: string;
  value: any;
  onChange: (newValue: any) => void;
}

export function WidgetConfigEditor({ widgetType, value, onChange }: WidgetConfigEditorProps) {
  const [activeTab, setActiveTab] = useState<string>("form");
  const [rawJsonText, setRawJsonText] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Sync value changes to raw JSON input
  useEffect(() => {
    if (value) {
      setRawJsonText(JSON.stringify(value, null, 2));
      setJsonError(null);
    } else {
      setRawJsonText("{}");
    }
  }, [value]);

  const handleJsonChange = (text: string) => {
    setRawJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setJsonError(null);
      onChange(parsed);
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax");
    }
  };

  const updateField = (key: string, val: any) => {
    const updated = { ...value, [key]: val };
    onChange(updated);
  };

  // Render different sub-forms based on widgetType
  const renderFormEditor = () => {
    switch (widgetType) {
      case "SLIDER_MANIPULATIVE": {
        const min = value?.min ?? 0;
        const max = value?.max ?? 100;
        const step = value?.step ?? 1;
        const unit = value?.unit ?? "";
        const correctValue = value?.correctValue ?? min;

        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Min Value</Label>
              <Input
                type="number"
                value={min}
                onChange={(e) => updateField("min", Number(e.target.value))}
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Max Value</Label>
              <Input
                type="number"
                value={max}
                onChange={(e) => updateField("max", Number(e.target.value))}
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Step Interval</Label>
              <Input
                type="number"
                value={step}
                onChange={(e) => updateField("step", Number(e.target.value))}
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Unit (e.g. %, cm)</Label>
              <Input
                type="text"
                placeholder="unit label..."
                value={unit}
                onChange={(e) => updateField("unit", e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div className="col-span-2 space-y-1.5 border-t border-border pt-3">
              <Label className="text-xs font-semibold text-muted-foreground">Target Value (correctAnswer)</Label>
              <Input
                type="number"
                value={correctValue}
                onChange={(e) => updateField("correctValue", Number(e.target.value))}
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>
        );
      }

      case "DRAG_AND_DROP_LABELS": {
        const labels: string[] = value?.labels ?? [];
        const targets: any[] = value?.targets ?? [];

        const handleAddLabel = () => {
          updateField("labels", [...labels, ""]);
        };

        const handleUpdateLabel = (idx: number, text: string) => {
          const newLabels = [...labels];
          newLabels[idx] = text;
          updateField("labels", newLabels);
        };

        const handleRemoveLabel = (idx: number) => {
          const newLabels = labels.filter((_, i) => i !== idx);
          updateField("labels", newLabels);
        };

        const handleAddTarget = () => {
          updateField("targets", [
            ...targets,
            { id: `target-${Date.now()}`, placeholder: "", correctLabel: "" },
          ]);
        };

        const handleUpdateTarget = (idx: number, field: string, val: string) => {
          const newTargets = targets.map((t, i) => (i === idx ? { ...t, [field]: val } : t));
          updateField("targets", newTargets);
        };

        const handleRemoveTarget = (idx: number) => {
          const newTargets = targets.filter((_, i) => i !== idx);
          updateField("targets", newTargets);
        };

        return (
          <div className="space-y-4">
            {/* Labels Bank */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Labels Pool (Draggables)</Label>
                <button
                  type="button"
                  onClick={handleAddLabel}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary"
                >
                  <Plus className="h-3 w-3" /> Add Label
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {labels.map((lbl, idx) => (
                  <div key={idx} className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 pl-2">
                    <input
                      type="text"
                      value={lbl}
                      placeholder={`Label ${idx + 1}...`}
                      onChange={(e) => handleUpdateLabel(idx, e.target.value)}
                      className="border-none bg-transparent font-sans text-xs font-semibold text-foreground focus:outline-none w-20"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(idx)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Slots */}
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Drop Targets (Slots)</Label>
                <button
                  type="button"
                  onClick={handleAddTarget}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary"
                >
                  <Plus className="h-3 w-3" /> Add Slot
                </button>
              </div>
              <div className="space-y-2">
                {targets.map((t, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      type="text"
                      placeholder="Placeholder text (e.g. 'Solve 3 + ___')"
                      value={t.placeholder ?? ""}
                      onChange={(e) => handleUpdateTarget(idx, "placeholder", e.target.value)}
                      className="h-9 rounded-xl text-xs flex-1"
                    />
                    <Select
                      value={t.correctLabel || ""}
                      onValueChange={(val) => handleUpdateTarget(idx, "correctLabel", val)}
                    >
                      <SelectTrigger className="h-9 w-40 rounded-xl text-xs border-border bg-muted/50">
                        <SelectValue placeholder="Correct label..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {labels.filter(Boolean).map((lbl, lIdx) => (
                          <SelectItem key={lIdx} value={lbl}>
                            {lbl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => handleRemoveTarget(idx)}
                      className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case "COORDINATE_PLOTTER": {
        const xMin = value?.xRange?.[0] ?? -10;
        const xMax = value?.xRange?.[1] ?? 10;
        const yMin = value?.yRange?.[0] ?? -10;
        const yMax = value?.yRange?.[1] ?? 10;
        const gridStep = value?.gridStep ?? 1;
        const tolerance = value?.tolerance ?? 0.1;
        const correctPoints: { x: number; y: number }[] = value?.correctPoints ?? [];

        const handlePointsChange = (newValue: { points: { x: number; y: number }[] }) => {
          updateField("correctPoints", newValue.points);
        };

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">X-Range Min</Label>
                <Input
                  type="number"
                  value={xMin}
                  onChange={(e) => updateField("xRange", [Number(e.target.value), xMax])}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">X-Range Max</Label>
                <Input
                  type="number"
                  value={xMax}
                  onChange={(e) => updateField("xRange", [xMin, Number(e.target.value)])}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Y-Range Min</Label>
                <Input
                  type="number"
                  value={yMin}
                  onChange={(e) => updateField("yRange", [Number(e.target.value), yMax])}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Y-Range Max</Label>
                <Input
                  type="number"
                  value={yMax}
                  onChange={(e) => updateField("yRange", [yMin, Number(e.target.value)])}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Grid Step</Label>
                <Input
                  type="number"
                  value={gridStep}
                  onChange={(e) => updateField("gridStep", Number(e.target.value))}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Tolerance Margin</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={tolerance}
                  onChange={(e) => updateField("tolerance", Number(e.target.value))}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Visual Point Selector for correctPoints */}
            <div className="border-t border-border pt-4 space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground block">
                Visual Coordinates Target Selector
              </Label>
              <p className="text-[10px] text-muted-foreground mb-2">
                Click intersections on the grid below to plot coordinates expected as the correct answer.
              </p>
              <div className="flex justify-center bg-muted/50 p-4 rounded-2xl">
                <CoordinatePlotterWidget
                  config={{
                    xRange: [xMin, xMax],
                    yRange: [yMin, yMax],
                    gridStep,
                    correctPoints: [],
                    tolerance,
                  }}
                  value={{ points: correctPoints }}
                  onChange={handlePointsChange}
                  locked={false}
                />
              </div>
            </div>
          </div>
        );
      }

      case "GRID_MATCHING": {
        const left: any[] = value?.left ?? [];
        const right: any[] = value?.right ?? [];
        const correctPairs: [string, string][] = value?.correctPairs ?? [];

        const handleAddLeft = () => {
          updateField("left", [...left, { id: `l-${Date.now()}`, text: "" }]);
        };

        const handleAddRight = () => {
          updateField("right", [...right, { id: `r-${Date.now()}`, text: "" }]);
        };

        const handleUpdateItem = (field: "left" | "right", idx: number, text: string) => {
          const list = field === "left" ? left : right;
          const newList = list.map((item, i) => (i === idx ? { ...item, text } : item));
          updateField(field, newList);
        };

        const handleRemoveItem = (field: "left" | "right", idx: number) => {
          const list = field === "left" ? left : right;
          const itemId = list[idx].id;
          const newList = list.filter((_, i) => i !== idx);
          updateField(field, newList);

          // Clean up correctPairs
          const newPairs = correctPairs.filter(([lId, rId]) =>
            field === "left" ? lId !== itemId : rId !== itemId
          );
          updateField("correctPairs", newPairs);
        };

        const handleAddPair = () => {
          updateField("correctPairs", [...correctPairs, ["", ""]]);
        };

        const handleUpdatePair = (pIdx: number, slotIdx: number, val: string) => {
          const newPairs = correctPairs.map((p, idx) => {
            if (idx === pIdx) {
              const newPair = [...p] as [string, string];
              newPair[slotIdx] = val;
              return newPair;
            }
            return p;
          });
          updateField("correctPairs", newPairs);
        };

        const handleRemovePair = (pIdx: number) => {
          const newPairs = correctPairs.filter((_, idx) => idx !== pIdx);
          updateField("correctPairs", newPairs);
        };

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Left Column</Label>
                  <button
                    type="button"
                    onClick={handleAddLeft}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-1.5">
                  {left.map((item, idx) => (
                    <div key={idx} className="flex gap-1.5 items-center">
                      <Input
                        type="text"
                        placeholder="Item text..."
                        value={item.text}
                        onChange={(e) => handleUpdateItem("left", idx, e.target.value)}
                        className="h-9 rounded-xl text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("left", idx)}
                        className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Right Column</Label>
                  <button
                    type="button"
                    onClick={handleAddRight}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-1.5">
                  {right.map((item, idx) => (
                    <div key={idx} className="flex gap-1.5 items-center">
                      <Input
                        type="text"
                        placeholder="Item text..."
                        value={item.text}
                        onChange={(e) => handleUpdateItem("right", idx, e.target.value)}
                        className="h-9 rounded-xl text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("right", idx)}
                        className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Correct Pairs Linker */}
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Correct Pairings Map</Label>
                <button
                  type="button"
                  onClick={handleAddPair}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary"
                >
                  <Plus className="h-3 w-3" /> Link Pair
                  </button>
              </div>
              <div className="space-y-2">
                {correctPairs.map((pair, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select
                      value={pair[0] || ""}
                      onValueChange={(val) => handleUpdatePair(idx, 0, val)}
                    >
                      <SelectTrigger className="h-9 flex-1 rounded-xl text-xs bg-muted/50">
                        <SelectValue placeholder="Select Left..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {left.filter((l) => l.text).map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.text}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <span className="text-muted-foreground text-xs font-bold">⇔</span>

                    <Select
                      value={pair[1] || ""}
                      onValueChange={(val) => handleUpdatePair(idx, 1, val)}
                    >
                      <SelectTrigger className="h-9 flex-1 rounded-xl text-xs bg-muted/50">
                        <SelectValue placeholder="Select Right..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {right.filter((r) => r.text).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.text}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <button
                      type="button"
                      onClick={() => handleRemovePair(idx)}
                      className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case "CODE_PLAYGROUND": {
        const language = value?.language ?? "javascript";
        const starterCode = value?.starterCode ?? "";
        const tests: any[] = value?.tests ?? [];

        const handleAddTest = () => {
          updateField("tests", [...tests, { input: "", expected: "" }]);
        };

        const handleUpdateTest = (idx: number, key: string, val: string) => {
          const newTests = tests.map((t, i) => (i === idx ? { ...t, [key]: val } : t));
          updateField("tests", newTests);
        };

        const handleRemoveTest = (idx: number) => {
          const newTests = tests.filter((_, i) => i !== idx);
          updateField("tests", newTests);
        };

        return (
          <div className="space-y-4">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground">Sandbox Language</Label>
              <Select value={language} onValueChange={(val) => updateField("language", val)}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/50">
                  <SelectValue placeholder="Select language..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="javascript">Javascript (Client sandbox)</SelectItem>
                  <SelectItem value="typescript">Typescript (Transpiled client)</SelectItem>
                  <SelectItem value="python">Python (Syntax highlighting)</SelectItem>
                  <SelectItem value="html">HTML (Isolated sandbox)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Starter Code</Label>
              <textarea
                value={starterCode}
                onChange={(e) => updateField("starterCode", e.target.value)}
                placeholder="// Code template for students..."
                className="h-28 w-full resize-none rounded-xl border border-border bg-muted/20 p-3 font-mono text-xs focus:outline-none/50"
              />
            </div>

            {/* Test cases list */}
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Test Assertions ({tests.length})</Label>
                <button
                  type="button"
                  onClick={handleAddTest}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary"
                >
                  <Plus className="h-3 w-3" /> Add Test Case
                </button>
              </div>
              <div className="space-y-2">
                {tests.map((test, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] font-bold text-muted-foreground">Execution Call Expression</Label>
                      <Input
                        type="text"
                        placeholder="e.g. add(2, 3)"
                        value={test.input}
                        onChange={(e) => handleUpdateTest(idx, "input", e.target.value)}
                        className="h-9 rounded-xl text-xs"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] font-bold text-muted-foreground">Expected Result Expression</Label>
                      <Input
                        type="text"
                        placeholder="e.g. 5"
                        value={test.expected}
                        onChange={(e) => handleUpdateTest(idx, "expected", e.target.value)}
                        className="h-9 rounded-xl text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTest(idx)}
                      className="mt-5 rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="text-center py-6 text-xs text-muted-foreground font-medium">
            This question type does not require a widget configuration.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Interactive Configuration
          </Label>
          <TabsList className="h-8 rounded-xl bg-muted p-0.5">
            <TabsTrigger value="form" className="h-7 cursor-pointer rounded-lg px-3 text-xs font-semibold">
              Form Builder
            </TabsTrigger>
            <TabsTrigger value="json" className="h-7 cursor-pointer rounded-lg px-3 text-xs font-semibold">
              <Code className="h-3.5 w-3.5 mr-1" /> Raw JSON
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="form" className="mt-0 focus-visible:outline-none">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm/40">
            {renderFormEditor()}
          </div>
        </TabsContent>

        <TabsContent value="json" className="mt-0 focus-visible:outline-none">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm/40 space-y-2">
            <textarea
              value={rawJsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="h-60 w-full resize-none rounded-xl border border-border bg-muted/50 p-3 font-mono text-xs focus:outline-none/60"
            />
            {jsonError && (
              <span className="text-[10px] font-bold text-destructive block">
                {jsonError}
              </span>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
