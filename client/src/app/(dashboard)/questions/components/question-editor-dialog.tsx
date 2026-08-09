"use client";

import { Edit3, Eye, HelpCircle,Plus, Trash2 } from "lucide-react";
import React, { useEffect,useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter,DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Question,
  useCreateQuestionMutation,
  useGetLevelsQuery,
  useGetSubjectsQuery,
  useUpdateQuestionMutation,
} from "@/features/assessments/questionsApi";

import { QuestionPreview } from "./question-preview";
import { QuestionTypeFields } from "./question-type-fields";
import { WidgetConfigEditor } from "./widget-config-editor";

interface QuestionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId?: string | null; // Null means create, non-null means edit
  initialQuestion?: Question | null;
}

export function QuestionEditorDialog({
  open,
  onOpenChange,
  questionId,
  initialQuestion,
}: QuestionEditorDialogProps) {
  const { data: subjectsData } = useGetSubjectsQuery();
  const { data: levelsData } = useGetLevelsQuery();

  const subjects = React.useMemo(() => subjectsData?.items ?? [], [subjectsData]);
  const levels = React.useMemo(() => levelsData?.items ?? [], [levelsData]);

  const [createQuestion, { isLoading: isCreating }] = useCreateQuestionMutation();
  const [updateQuestion, { isLoading: isUpdating }] = useUpdateQuestionMutation();

  // Local state for all fields
  const [subjectId, setSubjectId] = useState<string>("");
  const [levelId, setLevelId] = useState<string>("");
  const [questionType, setQuestionType] = useState<string>("mcq");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [status, setStatus] = useState<string>("draft");
  const [prompt, setPrompt] = useState<string>("");
  const [correctAnswer, setCorrectAnswer] = useState<string>("");
  const [options, setOptions] = useState<any[]>([]);
  const [explanation, setExplanation] = useState<string>("");
  const [hints, setHints] = useState<string[]>([]);
  const [widgetType, setWidgetType] = useState<string>("");
  const [widgetConfig, setWidgetConfig] = useState<any>(null);

  const [activePane, setActivePane] = useState<"edit" | "preview">("edit");

  // Load initial values on edit
  useEffect(() => {
    if (open) {
      if (questionId && initialQuestion) {
        setSubjectId(initialQuestion.subjectId || "");
        setLevelId(initialQuestion.levelId || "");
        setQuestionType(initialQuestion.questionType || "mcq");
        setDifficulty(initialQuestion.difficulty || "medium");
        setStatus(initialQuestion.status || "draft");
        setPrompt(initialQuestion.prompt || "");
        setCorrectAnswer(initialQuestion.correctAnswer || "");
        setOptions(initialQuestion.options || []);
        setExplanation(initialQuestion.explanation || "");
        setHints(initialQuestion.hints || []);
        setWidgetType(initialQuestion.widgetType || "");
        setWidgetConfig(initialQuestion.widgetConfig || null);
      } else {
        // Reset to default values for creation
        setSubjectId(subjects[0]?.id || "");
        setLevelId(levels[0]?.id || "");
        setQuestionType("mcq");
        setDifficulty("medium");
        setStatus("draft");
        setPrompt("");
        setCorrectAnswer("");
        setOptions([
          { optionLabel: "A", optionText: "", isCorrect: false },
          { optionLabel: "B", optionText: "", isCorrect: false },
        ]);
        setExplanation("");
        setHints([]);
        setWidgetType("");
        setWidgetConfig(null);
      }
    }
  }, [open, questionId, initialQuestion, subjects, levels]);

  // Adjust widget defaults when widgetType changes
  const handleWidgetTypeChange = (value: string) => {
    const type = value === "none" ? "" : value;
    setWidgetType(type);

    // Seed initial sensible widget configurations
    if (type === "STANDARD_MCQ") {
      setWidgetConfig({
        configVersion: 2,
        mode: "parameterized",
        params: {
          given: { a: { min: 2, max: 9 }, b: { min: 1, max: 20 } },
          secret: { x: { min: 1, max: 10 } },
          derived: { c: "a * x + b" },
        },
        display: { template: "Solve: {a}x + {b} = {c}. What is x?" },
        answerKey: { correct: "x" },
        distractors: [{ expr: "x + 1" }, { expr: "x - 1" }],
      });
    } else if (type === "SLIDER_MANIPULATIVE") {
      setWidgetConfig({ min: 0, max: 100, step: 1, unit: "", correctValue: 50 });
    } else if (type === "DRAG_AND_DROP_LABELS") {
      setWidgetConfig({ labels: ["A", "B", "C"], targets: [] });
    } else if (type === "COORDINATE_PLOTTER") {
      setWidgetConfig({ xRange: [-10, 10], yRange: [-10, 10], gridStep: 1, correctPoints: [], tolerance: 0.1 });
    } else if (type === "GRID_MATCHING") {
      setWidgetConfig({ left: [], right: [], correctPairs: [] });
    } else if (type === "CODE_PLAYGROUND") {
      setWidgetConfig({ language: "javascript", starterCode: "", tests: [] });
    } else {
      setWidgetConfig(null);
    }
  };

  const handleAddHint = () => {
    setHints([...hints, ""]);
  };

  const handleUpdateHint = (idx: number, text: string) => {
    const newHints = [...hints];
    newHints[idx] = text;
    setHints(newHints);
  };

  const handleRemoveHint = (idx: number) => {
    setHints(hints.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId) return toast.error("Please select a subject.");
    if (!levelId) return toast.error("Please select a level.");
    if (!prompt.trim()) return toast.error("Prompt cannot be empty.");

    // MCQ Validation — a parameterized MCQ widget generates its own options
    // per attempt, so the fixed Answer Options list doesn't apply to it.
    const isParameterizedMcq = questionType === "mcq" && widgetType === "STANDARD_MCQ";
    if (questionType === "mcq" && !widgetType) {
      if (options.length < 2) return toast.error("MCQ questions require at least 2 options.");
      if (!options.some((o) => o.isCorrect)) return toast.error("Please mark at least one option as correct.");
    }
    if (isParameterizedMcq) {
      if (!widgetConfig?.answerKey?.correct) return toast.error("Select which variable holds the correct answer.");
      if (!widgetConfig?.distractors?.length) return toast.error("Add at least one distractor formula.");
    }

    const payload: Partial<Question> = {
      subjectId,
      levelId,
      questionType: questionType as any,
      prompt,
      correctAnswer: questionType === "mcq" ? null : correctAnswer,
      difficulty: difficulty as any,
      status: status as any,
      widgetType: widgetType || null,
      widgetConfig,
      explanation: explanation || null,
      hints: hints.filter(Boolean),
      options: questionType === "mcq" && !widgetType ? options : [],
    };

    try {
      if (questionId) {
        await updateQuestion({ id: questionId, body: payload }).unwrap();
        toast.success("Question updated successfully!");
      } else {
        await createQuestion(payload).unwrap();
        toast.success("Question created successfully!");
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to save question.");
    }
  };

  const draftQuestion: Partial<Question> = {
    prompt,
    questionType: questionType as any,
    widgetType: widgetType || null,
    widgetConfig,
    correctAnswer,
    options,
    explanation,
    hints,
    difficulty: difficulty as any,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[88vh] rounded-3xl border border-border bg-card p-0 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {questionId ? "Edit Question" : "Create New Question"}
            </DialogTitle>
          </div>

          {/* Toggle buttons for Mobile split preview */}
          <div className="flex rounded-xl bg-muted p-0.5 md:hidden mr-8">
            <button
              onClick={() => setActivePane("edit")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activePane === "edit" ? "bg-card shadow" : "text-muted-foreground"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={() => setActivePane("preview")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activePane === "preview" ? "bg-card shadow" : "text-muted-foreground"
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          </div>
        </DialogHeader>

        {/* Content Split Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Editor Pane */}
          <form
            onSubmit={handleSave}
            className={`flex-1 overflow-y-auto p-6 space-y-6 md:block ${
              activePane === "edit" ? "block" : "hidden"
            } md:border-r border-border/50`}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Subject
                </Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/50">
                    <SelectValue placeholder="Select subject..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {subjects.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Grade Level
                </Label>
                <Select value={levelId} onValueChange={setLevelId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/50">
                    <SelectValue placeholder="Select level..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {levels.map((lvl) => (
                      <SelectItem key={lvl.id} value={lvl.id}>
                        {lvl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Question Type
                </Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/50">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                    <SelectItem value="numeric">Numeric Answer</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="written">Written / Free Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Difficulty
                </Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/50">
                    <SelectValue placeholder="Select difficulty..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="extension">Extension</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/50">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prompt Stem */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Question Prompt (Supports LaTeX via $inline$ or $$block$$)
              </Label>
              <textarea
                placeholder="Write the question prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="h-28 w-full resize-none rounded-xl border border-border bg-muted/50 p-3 text-xs text-foreground focus:outline-none/50"
                required
              />
            </div>

            {/* Conditional Type Fields — a parameterized MCQ widget owns its
                own generated options, so the fixed options editor doesn't
                apply and is hidden below (see the widget config form instead). */}
            {!(questionType === "mcq" && widgetType === "STANDARD_MCQ") && (
              <QuestionTypeFields
                questionType={questionType}
                options={options}
                onOptionsChange={setOptions}
                correctAnswer={correctAnswer}
                onCorrectAnswerChange={setCorrectAnswer}
              />
            )}

            {/* Interactive Widget Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bind Interactive Widget (Optional)
              </Label>
              <Select value={widgetType || "none"} onValueChange={handleWidgetTypeChange}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/50">
                  <SelectValue placeholder="None (Standard Question)" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">None (Standard Question)</SelectItem>
                  <SelectItem value="STANDARD_MCQ">MCQ Widget</SelectItem>
                  <SelectItem value="SLIDER_MANIPULATIVE">Slider Widget</SelectItem>
                  <SelectItem value="DRAG_AND_DROP_LABELS">Drag and Drop Labels</SelectItem>
                  <SelectItem value="COORDINATE_PLOTTER">Coordinate Plotter</SelectItem>
                  <SelectItem value="GRID_MATCHING">Grid Matching</SelectItem>
                  <SelectItem value="CODE_PLAYGROUND">Code Playground</SelectItem>
                  <SelectItem value="SHAPE_SHADING">Shape Shading</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Widget Config Form */}
            {widgetType && (
              <WidgetConfigEditor
                widgetType={widgetType}
                value={widgetConfig}
                onChange={setWidgetConfig}
              />
            )}

            {/* Explanation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Solution Explanation (Supports LaTeX)
              </Label>
              <textarea
                placeholder="Explain the solution details..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="h-24 w-full resize-none rounded-xl border border-border bg-muted/50 p-3 text-xs text-foreground focus:outline-none/50"
              />
            </div>

            {/* Hints List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Hints / Clues
                </Label>
                <button
                  type="button"
                  onClick={handleAddHint}
                  className="flex items-center gap-1 text-xs font-bold text-primary"
                >
                  <Plus className="h-4 w-4" /> Add Hint
                </button>
              </div>
              <div className="space-y-2">
                {hints.map((hint, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                    <Input
                      type="text"
                      placeholder={`Hint details...`}
                      value={hint}
                      onChange={(e) => handleUpdateHint(idx, e.target.value)}
                      className="h-9 rounded-xl text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHint(idx)}
                      className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Form submission placeholder */}
            <button type="submit" className="hidden" id="editor-submit-btn" />
          </form>

          {/* Right Live Preview Pane */}
          <div
            className={`flex-1 overflow-y-auto p-6 bg-muted/50 md:block ${
              activePane === "preview" ? "block" : "hidden"
            }/20`}
          >
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Live Editor Preview
            </h3>
            <QuestionPreview question={draftQuestion} />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 border-t border-border/50 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-10 cursor-pointer rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={() => document.getElementById("editor-submit-btn")?.click()}
            disabled={isCreating || isUpdating}
            className="h-10 cursor-pointer rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary"
          >
            {isCreating || isUpdating ? "Saving..." : "Save Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
