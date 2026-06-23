"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Settings,
  Plus,
  Trash2,
  FolderOpen,
  FolderPlus,
  ChevronUp,
  ChevronDown,
  BookOpen,
  HelpCircle,
  Award,
  Sparkles,
  Play,
  Save,
  Search,
  Filter,
  Check,
  Calendar,
  Layers,
  Clock
} from "lucide-react";
import {
  useGetAssessmentQuery,
  useUpdateAssessmentMutation,
  usePublishAssessmentMutation,
  useAddQuestionToAssessmentMutation,
  useRemoveQuestionFromAssessmentMutation,
  useUpdateAssessmentQuestionMutation,
  Assessment,
  AssessmentSection,
  AssessmentQuestion
} from "@/features/assessments/assessmentsApi";
import { useGetQuestionsQuery } from "@/features/assessments/questionsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssignmentWizardDialog } from "../components/assignment-wizard-dialog";
import { QuestionPreview } from "../../questions/components/question-preview";

export default function AssessmentBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  // Fetch assessment details
  const { data: assessment, isLoading: isLoadingAssessment, refetch } = useGetAssessmentQuery(assessmentId);

  // Mutations
  const [updateAssessment, { isLoading: isUpdating }] = useUpdateAssessmentMutation();
  const [publishAssessment, { isLoading: isPublishing }] = usePublishAssessmentMutation();
  const [addQuestion] = useAddQuestionToAssessmentMutation();
  const [removeQuestion] = useRemoveQuestionFromAssessmentMutation();
  const [updateAssessmentQuestion] = useUpdateAssessmentQuestionMutation();

  // Local state for sections edit
  const [localSections, setLocalSections] = useState<{ id: string; title: string; sortOrder: number }[]>([]);
  const [editingSectionsMode, setEditingSectionsMode] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Question bank drawer / search filters
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  const { data: questionsData } = useGetQuestionsQuery({
    search: searchQuery || undefined,
    subjectId: selectedSubject || undefined,
    levelId: selectedLevel || undefined,
    pageSize: 50,
  });
  const questionsBank = questionsData?.items || [];

  // Sync assessment sections to local state
  useEffect(() => {
    if (assessment?.sections) {
      const sorted = [...assessment.sections].sort((a, b) => a.sortOrder - b.sortOrder);
      setLocalSections(sorted);
    }
  }, [assessment]);

  if (isLoadingAssessment) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-neutral-400 font-medium">Loading builder workspace...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <HelpCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">Assessment Not Found</h3>
          <Button onClick={() => router.push("/assessments")} className="mt-4 bg-violet-600">
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  // Add a new section locally
  const handleAddSection = () => {
    const nextOrder = localSections.length + 1;
    const newSection = {
      id: `temp-${Date.now()}`,
      title: `Section ${String.fromCharCode(65 + localSections.length)}`,
      sortOrder: nextOrder,
    };
    setLocalSections([...localSections, newSection]);
    setEditingSectionsMode(true);
  };

  // Update section title locally
  const handleRenameSection = (id: string, newTitle: string) => {
    setLocalSections(
      localSections.map((sec) => (sec.id === id ? { ...sec, title: newTitle } : sec))
    );
    setEditingSectionsMode(true);
  };

  // Reorder sections locally
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...localSections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    // Swap elements
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Re-assign sortOrder
    const updated = newSections.map((sec, idx) => ({ ...sec, sortOrder: idx + 1 }));
    setLocalSections(updated);
    setEditingSectionsMode(true);
  };

  // Delete section locally
  const handleDeleteSection = (id: string) => {
    const filtered = localSections
      .filter((sec) => sec.id !== id)
      .map((sec, idx) => ({ ...sec, sortOrder: idx + 1 }));
    setLocalSections(filtered);
    setEditingSectionsMode(true);
  };

  // Save sections configuration to the database
  const handleSaveSections = async () => {
    try {
      // Keep copy of current questions linked by section index
      const questionsBackup = assessment.questions || [];
      const previousSections = assessment.sections || [];

      // Map questions to section titles so we can re-bind them after the cascade delete
      const questionsWithSectionTitles = questionsBackup.map((q) => {
        const sect = previousSections.find((s) => s.id === q.sectionId);
        return {
          questionId: q.questionId,
          questionNumber: q.questionNumber,
          marksAvailable: q.marksAvailable,
          sectionTitle: sect?.title || "",
        };
      });

      // Call update
      const updatedAssessment = await updateAssessment({
        id: assessmentId,
        body: {
          sections: localSections.map((s) => ({
            title: s.title,
            sortOrder: s.sortOrder,
          })) as any,
        },
      }).unwrap();

      toast.success("Sections updated successfully!");
      setEditingSectionsMode(false);

      // Re-bind questions to new section IDs matching by title
      const newSections = updatedAssessment.sections || [];
      if (questionsWithSectionTitles.length > 0 && newSections.length > 0) {
        toast.loading("Restoring question links...", { id: "linking" });

        for (const q of questionsWithSectionTitles) {
          const matchedSection = newSections.find((s) => s.title === q.sectionTitle) || newSections[0];
          if (matchedSection) {
            await addQuestion({
              assessmentId,
              body: {
                questionId: q.questionId,
                questionNumber: q.questionNumber,
                marksAvailable: q.marksAvailable,
                sectionId: matchedSection.id,
              },
            }).unwrap();
          }
        }
        toast.dismiss("linking");
        toast.success("Questions restored to sections!");
      }
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to save sections.");
    }
  };

  // Add question from drawer
  const handleAddQuestionToSection = async (questionId: string) => {
    if (!selectedSectionId) return toast.error("Please select a target section.");

    // Check if question already exists in assessment
    const exists = assessment.questions?.some((q) => q.questionId === questionId);
    if (exists) {
      return toast.error("This question is already added to this assessment.");
    }

    const sectionQuestions = assessment.questions?.filter((q) => q.sectionId === selectedSectionId) || [];
    const nextNum = sectionQuestions.length + 1;

    try {
      await addQuestion({
        assessmentId,
        body: {
          questionId,
          marksAvailable: 1,
          sectionId: selectedSectionId,
          questionNumber: nextNum,
        },
      }).unwrap();
      toast.success("Question added to section.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to add question.");
    }
  };

  // Remove question from assessment
  const handleRemoveQuestion = async (questionId: string) => {
    try {
      await removeQuestion({ assessmentId, questionId }).unwrap();
      toast.success("Question removed from assessment.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to remove question.");
    }
  };

  // Update question score
  const handleUpdateQuestionMarks = async (questionId: string, marks: number) => {
    if (marks <= 0) return;
    try {
      await updateAssessmentQuestion({
        assessmentId,
        questionId,
        body: { marksAvailable: marks },
      }).unwrap();
      toast.success("Marks updated.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to update marks.");
    }
  };

  // Update question order/number
  const handleMoveQuestionOrder = async (question: AssessmentQuestion, direction: "up" | "down") => {
    const siblings = assessment.questions
      ?.filter((q) => q.sectionId === question.sectionId)
      .sort((a, b) => a.questionNumber - b.questionNumber) || [];

    const index = siblings.findIndex((q) => q.id === question.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const swapQuestion = siblings[swapIndex];

    try {
      // Swap questionNumber in DB
      await updateAssessmentQuestion({
        assessmentId,
        questionId: question.questionId,
        body: { questionNumber: swapQuestion.questionNumber },
      }).unwrap();

      await updateAssessmentQuestion({
        assessmentId,
        questionId: swapQuestion.questionId,
        body: { questionNumber: question.questionNumber },
      }).unwrap();

      toast.success("Question order updated.");
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update ordering.");
    }
  };

  const handlePublish = async () => {
    // Basic validation
    if (localSections.length === 0) {
      return toast.error("An assessment must have at least one section before publishing.");
    }
    if (!assessment.questions || assessment.questions.length === 0) {
      return toast.error("An assessment must have at least one question before publishing.");
    }

    try {
      await publishAssessment(assessmentId).unwrap();
      toast.success("Assessment is now Published and can be assigned!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to publish assessment.");
    }
  };

  // Group questions by section
  const getSectionQuestions = (sectionId: string) => {
    return (
      assessment.questions
        ?.filter((q) => q.sectionId === sectionId)
        .sort((a, b) => a.questionNumber - b.questionNumber) || []
    );
  };

  // Calculate sum of marks
  const totalQuestionsMarks = assessment.questions?.reduce((acc, q) => acc + q.marksAvailable, 0) || 0;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-neutral-50/50 dark:bg-zinc-950/20">
      {/* Workspace Header */}
      <div className="h-16 border-b border-neutral-150 bg-white px-6 flex items-center justify-between dark:border-zinc-800 dark:bg-zinc-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/assessments">
            <button className="h-9 w-9 rounded-xl border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center dark:border-zinc-800 dark:hover:bg-zinc-800">
              <ArrowLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            </button>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              {assessment.title}
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                {assessment.status}
              </span>
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium">
              Subject: {assessment.subject?.name} • Grade: {assessment.level?.name}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {editingSectionsMode && (
            <Button
              onClick={handleSaveSections}
              disabled={isUpdating}
              className="h-9 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save Sections
            </Button>
          )}

          {assessment.status === "draft" ? (
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="h-9 rounded-xl bg-violet-600 text-xs font-bold text-white hover:bg-violet-500 shadow-md shadow-violet-500/10"
            >
              <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Publish Paper
            </Button>
          ) : (
            <Button
              onClick={() => setAssignDialogOpen(true)}
              className="h-9 rounded-xl bg-violet-600 text-xs font-bold text-white hover:bg-violet-500"
            >
              Assign Assessment
            </Button>
          )}
        </div>
      </div>

      {/* Main Workspace Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Sections Management */}
        <div className="w-80 border-r border-neutral-150 bg-white p-5 flex flex-col dark:border-zinc-800 dark:bg-zinc-900/50 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-violet-500" />
              Paper Sections
            </h2>
            <button
              onClick={handleAddSection}
              className="flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>

          {localSections.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-neutral-200 rounded-2xl dark:border-zinc-800">
              <FolderPlus className="h-8 w-8 text-neutral-300 mb-2" />
              <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                No sections created yet. Click "Add" to start grouping your questions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {localSections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className="rounded-2xl border border-neutral-150 p-3 bg-neutral-50/50 hover:bg-white dark:border-zinc-850 dark:bg-zinc-900/30 flex flex-col gap-2 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={sec.title}
                      onChange={(e) => handleRenameSection(sec.id, e.target.value)}
                      className="h-8 text-xs font-bold border-none bg-transparent hover:bg-neutral-100 focus:bg-white px-1.5 py-0.5 rounded-lg dark:hover:bg-zinc-800"
                    />
                    <div className="flex gap-0.5 shrink-0">
                      <button
                        onClick={() => handleMoveSection(idx, "up")}
                        disabled={idx === 0}
                        className="h-6 w-6 rounded hover:bg-neutral-200 flex items-center justify-center text-neutral-400 disabled:opacity-30 dark:hover:bg-zinc-800"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveSection(idx, "down")}
                        disabled={idx === localSections.length - 1}
                        className="h-6 w-6 rounded hover:bg-neutral-200 flex items-center justify-center text-neutral-400 disabled:opacity-30 dark:hover:bg-zinc-800"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="h-6 w-6 rounded hover:bg-rose-100 flex items-center justify-center text-neutral-400 hover:text-rose-500 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 font-medium mt-1">
                    <span>{getSectionQuestions(sec.id).length} Questions</span>
                    <button
                      onClick={() => {
                        setSelectedSectionId(sec.id);
                        setPickerOpen(true);
                      }}
                      className="text-violet-600 font-bold dark:text-violet-400 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> Add Question
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-zinc-800/60">
            <div className="rounded-2xl bg-neutral-100 p-3 dark:bg-zinc-805 space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-neutral-500">
                <span>Total Questions</span>
                <span className="text-neutral-900 dark:text-neutral-150 font-bold">{assessment.questions?.length || 0}</span>
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-neutral-500">
                <span>Sum of Marks</span>
                <span className="text-neutral-900 dark:text-neutral-150 font-bold">{totalQuestionsMarks} / {assessment.totalMarks}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Canvas: Question lists inside selected sections */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {localSections.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Layers className="h-16 w-16 text-neutral-300 mb-4 animate-bounce" />
              <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">Start with a Section</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                Add assessment sections in the left sidebar first. You can then populate them with items from your Question Bank.
              </p>
              <Button onClick={handleAddSection} className="mt-4 bg-violet-600">
                Create First Section
              </Button>
            </div>
          ) : (
            localSections.map((section) => {
              const sQuestions = getSectionQuestions(section.id);
              return (
                <Card key={section.id} className="rounded-3xl border border-neutral-150 dark:border-zinc-850 shadow-sm overflow-hidden bg-white dark:bg-zinc-900/20">
                  <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 dark:bg-zinc-900/40 dark:border-zinc-800/80 px-6 py-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                        {section.title}
                      </CardTitle>
                      <CardDescription className="text-[10px] text-neutral-400">
                        Contains {sQuestions.length} assessment question items
                      </CardDescription>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        setPickerOpen(true);
                      }}
                      className="h-8 rounded-xl text-[10px] font-bold border-neutral-200 dark:border-zinc-850"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Bind Question
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-zinc-850">
                    {sQuestions.length === 0 ? (
                      <div className="p-8 text-center">
                        <HelpCircle className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                        <p className="text-[11px] text-neutral-400">This section is currently empty.</p>
                      </div>
                    ) : (
                      sQuestions.map((sq, sIdx) => (
                        <div key={sq.id} className="p-5 flex items-start gap-4 hover:bg-neutral-50/30 transition-all dark:hover:bg-zinc-900/10">
                          {/* Question Index Control */}
                          <div className="flex flex-col items-center justify-center bg-neutral-100 dark:bg-zinc-800 h-9 w-9 rounded-xl shrink-0">
                            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Q{sq.questionNumber}</span>
                          </div>

                          {/* Content Preview */}
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-violet-100 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400">
                                {sq.question.questionType}
                              </span>
                              {sq.question.widgetType && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                                  {sq.question.widgetType}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-neutral-100 text-neutral-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {sq.question.difficulty}
                              </span>
                            </div>

                            {/* Question Stem Renderer */}
                            <div className="text-xs text-neutral-800 dark:text-neutral-200 line-clamp-3 bg-neutral-50/20 p-2.5 rounded-xl border border-neutral-100 dark:border-zinc-850">
                              <QuestionPreview question={sq.question} />
                            </div>
                          </div>

                          {/* Order/Marks Config Column */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleMoveQuestionOrder(sq, "up")}
                                disabled={sIdx === 0}
                                className="h-6 w-6 rounded border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center disabled:opacity-30 dark:border-zinc-800 dark:hover:bg-zinc-800"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveQuestionOrder(sq, "down")}
                                disabled={sIdx === sQuestions.length - 1}
                                className="h-6 w-6 rounded border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center disabled:opacity-30 dark:border-zinc-800 dark:hover:bg-zinc-800"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                value={sq.marksAvailable}
                                onChange={(e) => handleUpdateQuestionMarks(sq.questionId, parseInt(e.target.value) || 1)}
                                className="w-14 h-9 rounded-xl text-center text-xs font-bold"
                              />
                              <span className="text-[10px] font-bold text-neutral-400">Marks</span>
                            </div>

                            <button
                              onClick={() => handleRemoveQuestion(sq.questionId)}
                              className="h-9 w-9 rounded-xl border border-neutral-200 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center text-neutral-400 hover:text-rose-500 transition-all dark:border-zinc-800 dark:hover:bg-rose-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Slide-out Question Picker Drawer */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="right" className="w-[600px] sm:max-w-xl flex flex-col p-0 dark:border-zinc-800 dark:bg-zinc-900">
          <SheetHeader className="p-6 pb-4 border-b border-neutral-150 dark:border-zinc-800 flex flex-row items-center justify-between">
            <SheetTitle className="text-base font-extrabold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-violet-500" />
              Bind Questions from Bank
            </SheetTitle>
          </SheetHeader>

          {/* Quick Filters */}
          <div className="p-4 bg-neutral-50 border-b border-neutral-150 dark:bg-zinc-950/30 dark:border-zinc-800/80 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Search stem prompt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8.5 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Picker List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {questionsBank.length === 0 ? (
              <div className="p-12 text-center text-neutral-400">
                <HelpCircle className="h-10 w-10 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs">No questions matched the filters.</p>
              </div>
            ) : (
              questionsBank.map((q) => {
                const isAlreadyAdded = assessment.questions?.some((aq) => aq.questionId === q.id);
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-4 flex gap-3 transition-all ${
                      isAlreadyAdded
                        ? "border-neutral-200 bg-neutral-50/50 opacity-60 dark:border-zinc-800"
                        : "border-neutral-200 bg-white hover:border-violet-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {q.questionType}
                        </span>
                        {q.widgetType && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                            {q.widgetType}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-violet-50 text-violet-600 dark:bg-violet-950/10 dark:text-violet-400">
                          {q.difficulty}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-700 dark:text-neutral-300 line-clamp-2">
                        <QuestionPreview question={q} />
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAddQuestionToSection(q.id)}
                      disabled={isAlreadyAdded}
                      className={`h-8.5 rounded-xl text-[10px] font-bold px-3 ${
                        isAlreadyAdded
                          ? "bg-neutral-100 text-neutral-400"
                          : "bg-violet-600 text-white hover:bg-violet-500"
                      }`}
                    >
                      {isAlreadyAdded ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" /> Added
                        </>
                      ) : (
                        "Bind"
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Assignment fanning wizard */}
      <AssignmentWizardDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        assessment={assessment}
      />
    </div>
  );
}
