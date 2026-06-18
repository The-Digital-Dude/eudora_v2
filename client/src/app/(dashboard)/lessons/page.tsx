"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  PenTool,
  Award,
  Layers,
  ArrowRight,
  Loader2,
  AlertCircle,
  Hash,
  Bookmark
} from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useGetLessonsQuery,
  useGetConceptsQuery,
  useCreateLessonMutation,
  useCreateCardMutation,
  useGetLessonFlowQuery
} from "@/features/clio/clioApi";

export default function LessonAuthoringPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [conceptFilter, setConceptFilter] = useState("all");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Queries & Mutations
  const { data: lessons, isLoading: lessonsLoading, refetch: refetchLessons } = useGetLessonsQuery();
  const { data: concepts, isLoading: conceptsLoading } = useGetConceptsQuery();
  const { data: lessonFlow, isLoading: flowLoading } = useGetLessonFlowQuery(selectedLessonId ?? "", {
    skip: !selectedLessonId,
  });

  const [createLesson, { isLoading: creatingLesson }] = useCreateLessonMutation();
  const [createCard, { isLoading: creatingCard }] = useCreateCardMutation();

  // Modals state
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");

  // Lesson Form FormState
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonConceptId, setLessonConceptId] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonSortOrder, setLessonSortOrder] = useState(1);
  const [lessonXpReward, setLessonXpReward] = useState(50);

  // Card Form FormState
  const [cardTitle, setCardTitle] = useState("");
  const [cardType, setCardType] = useState<"CONCEPTUAL" | "INTERACTIVE" | "CHECKPOINT">("CONCEPTUAL");
  const [cardContent, setCardContent] = useState("");
  const [cardSortOrder, setCardSortOrder] = useState(1);

  // Open Lesson Modal
  const handleOpenLessonDialog = () => {
    setFormError("");
    setLessonTitle("");
    setLessonConceptId(concepts?.[0]?.id || "");
    setLessonDescription("");
    setLessonSortOrder((lessons?.length ?? 0) + 1);
    setLessonXpReward(50);
    setIsLessonDialogOpen(true);
  };

  // Open Card Modal
  const handleOpenCardDialog = () => {
    if (!selectedLessonId) return;
    setFormError("");
    setCardTitle("");
    setCardType("CONCEPTUAL");
    setCardContent("");
    setCardSortOrder((lessonFlow?.lesson?.cards?.length ?? 0) + 1);
    setIsCardDialogOpen(true);
  };

  // Submit Lesson
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle || !lessonConceptId) {
      setFormError("Lesson Title and Curriculum Concept are required.");
      return;
    }
    setFormError("");

    try {
      await createLesson({
        title: lessonTitle,
        conceptId: lessonConceptId,
        description: lessonDescription || undefined,
        sortOrder: Number(lessonSortOrder),
        xpReward: Number(lessonXpReward),
      }).unwrap();
      setIsLessonDialogOpen(false);
      refetchLessons();
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to create lesson unit.");
    }
  };

  // Submit Card
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId) return;
    if (!cardTitle || !cardContent) {
      setFormError("Card Title and Content text body are required.");
      return;
    }
    setFormError("");

    try {
      await createCard({
        lessonId: selectedLessonId,
        title: cardTitle,
        cardType,
        content: cardContent,
        sortOrder: Number(cardSortOrder),
      }).unwrap();
      setIsCardDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to create card content.");
    }
  };

  // Filters & lists
  const filteredLessons = (lessons ?? []).filter((l) => {
    const title = l.title.toLowerCase();
    const desc = (l.description ?? "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = title.includes(query) || desc.includes(query);
    const matchesConcept = conceptFilter === "all" || l.conceptId === conceptFilter;
    return matchesQuery && matchesConcept;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
            Curriculum & Lesson Authoring
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Design dynamic journey units, configure XP checkpoints, and build card-stepper workflows for students.
          </p>
        </div>
        <Button
          onClick={handleOpenLessonDialog}
          className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1.5 cursor-pointer shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" /> Create Lesson
        </Button>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Lessons Directory */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-sm font-bold text-neutral-900 font-display">Journey Units</h2>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <select
                  value={conceptFilter}
                  onChange={(e) => setConceptFilter(e.target.value)}
                  className="h-9 px-3 border border-neutral-200 rounded-xl bg-white text-xs text-neutral-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Concepts</option>
                  {(concepts ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                    placeholder="Search lessons by title..."
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Lesson / Concept</th>
                    <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Sort Order</th>
                    <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">XP Reward</th>
                    <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessonsLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="border-b border-neutral-50">
                        <td className="py-4"><div className="h-4 w-48 bg-neutral-100 animate-pulse rounded" /></td>
                        <td className="py-4"><div className="h-4 w-8 bg-neutral-100 animate-pulse rounded" /></td>
                        <td className="py-4"><div className="h-4 w-12 bg-neutral-100 animate-pulse rounded" /></td>
                        <td className="py-4"><div className="h-4 w-16 bg-neutral-100 animate-pulse rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredLessons.length > 0 ? (
                    filteredLessons.map((lesson) => (
                      <tr
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors cursor-pointer ${
                          selectedLessonId === lesson.id ? "bg-neutral-50" : ""
                        }`}
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white text-xs font-bold font-display flex items-center justify-center shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-neutral-900">{lesson.title}</p>
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                Concept: <span className="text-neutral-500 font-semibold">{lesson.concept?.name || "Uncategorized"}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-xs text-neutral-500 font-medium">
                          {lesson.sortOrder}
                        </td>
                        <td className="py-4 text-xs">
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                            <Award className="w-3 h-3 text-amber-500" />
                            +{lesson.xpReward} XP
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <Button
                            variant="outline"
                            className="h-8 px-2.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 text-xs font-semibold flex items-center gap-1.5 ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLessonId(lesson.id);
                            }}
                          >
                            Edit Flow <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-neutral-400 font-medium">
                        No lessons available. Click "Create Lesson" to build your first curriculum unit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: Lesson Detail Panel (Cards composition) */}
        <div className="space-y-4">
          {selectedLessonId ? (
            <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
              {flowLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-900" />
                  <p className="text-xs font-semibold text-neutral-400">Loading card composition...</p>
                </div>
              ) : lessonFlow?.lesson ? (
                <>
                  {/* Lesson Meta Summary */}
                  <div className="space-y-1 pb-4 border-b border-neutral-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-display">Selected Journey</span>
                    <h3 className="text-sm font-bold text-neutral-900 font-display">
                      {lessonFlow.lesson.title}
                    </h3>
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                      {lessonFlow.lesson.description || "No description provided for this lesson."}
                    </p>
                  </div>

                  {/* Cards Timeline List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-display">Card Deck Timeline</span>
                      <Button
                        onClick={handleOpenCardDialog}
                        variant="outline"
                        className="h-8 px-2.5 rounded-lg border-neutral-200 text-neutral-700 hover:text-neutral-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Card
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {lessonFlow.lesson.cards && lessonFlow.lesson.cards.length > 0 ? (
                        lessonFlow.lesson.cards.map((card, idx) => (
                          <div
                            key={card.id}
                            className="relative flex items-start gap-3 p-3 bg-neutral-50/50 rounded-xl border border-neutral-200"
                          >
                            <div className="w-6 h-6 rounded-lg bg-neutral-900 text-white text-[10px] font-bold font-display flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <p className="text-xs font-semibold text-neutral-900 truncate">
                                {card.title}
                              </p>
                              <p className="text-[9px] font-medium text-neutral-400 uppercase">
                                Type: <span className="text-violet-600 font-bold">{card.cardType}</span>
                              </p>
                              <p className="text-[10px] text-neutral-400 truncate mt-1">
                                {card.content}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-neutral-400 font-medium py-6 text-center">
                          This lesson is empty. Add a card to create the curriculum deck.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-rose-400 font-semibold py-6 text-center">Failed to load lesson flow.</p>
              )}
            </Card>
          ) : (
            <Card className="border border-dashed border-neutral-200 rounded-3xl p-8 bg-neutral-50/30 text-center flex flex-col justify-center items-center h-full min-h-[300px]">
              <Layers className="w-8 h-8 text-neutral-300 mb-2.5" />
              <h3 className="text-xs font-bold text-neutral-700 font-display">No Lesson Selected</h3>
              <p className="text-[10px] text-neutral-400 max-w-[200px] mt-1 leading-normal">
                Choose a lesson unit from the list to view cards sequence and compose elements.
              </p>
            </Card>
          )}
        </div>

      </div>

      {/* Create Lesson Modal */}
      <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-neutral-700" />
              Create Lesson Unit
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Create a new interactive learning unit associated with a curriculum concept.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveLesson} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Curriculum Concept</Label>
              {conceptsLoading ? (
                <div className="h-10 flex items-center px-3 border border-neutral-200 rounded-xl bg-neutral-50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500 mr-2" />
                  <span className="text-xs text-neutral-400">Loading concepts...</span>
                </div>
              ) : (
                <select
                  value={lessonConceptId}
                  onChange={(e) => setLessonConceptId(e.target.value)}
                  className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
                  required
                >
                  <option value="" disabled>Select Curriculum Concept</option>
                  {(concepts ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Lesson Title</Label>
              <Input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Fractions 101: Introduction"
                className="h-10 text-xs border-neutral-200"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Description</Label>
              <Textarea
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
                placeholder="Introduce students to fraction denominators and shading parts of a whole."
                className="text-xs border-neutral-200 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sort Order</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
                    <Hash className="w-3.5 h-3.5" />
                  </span>
                  <Input
                    type="number"
                    value={lessonSortOrder}
                    onChange={(e) => setLessonSortOrder(Number(e.target.value))}
                    className="pl-9 h-10 text-xs border-neutral-200"
                    required
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">XP Reward</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
                    <Award className="w-3.5 h-3.5" />
                  </span>
                  <Input
                    type="number"
                    value={lessonXpReward}
                    onChange={(e) => setLessonXpReward(Number(e.target.value))}
                    className="pl-9 h-10 text-xs border-neutral-200"
                    required
                    min={10}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLessonDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingLesson}
                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
              >
                {creatingLesson ? "Creating..." : "Create Unit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Card Modal */}
      <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-neutral-700" />
              Add Card to Deck
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Create a conceptual, interactive, or checkpoint step in the active learning deck.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveCard} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Card Title</Label>
              <Input
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                placeholder="Visualizing denominator value"
                className="h-10 text-xs border-neutral-200"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Card Type</Label>
                <select
                  value={cardType}
                  onChange={(e: any) => setCardType(e.target.value)}
                  className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none"
                >
                  <option value="CONCEPTUAL">CONCEPTUAL</option>
                  <option value="INTERACTIVE">INTERACTIVE</option>
                  <option value="CHECKPOINT">CHECKPOINT</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sort Order</Label>
                <Input
                  type="number"
                  value={cardSortOrder}
                  onChange={(e) => setCardSortOrder(Number(e.target.value))}
                  className="h-10 text-xs border-neutral-200"
                  required
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Markdown Content</Label>
              <Textarea
                value={cardContent}
                onChange={(e) => setCardContent(e.target.value)}
                placeholder="Write lesson text or markdown instructions here. Supports formulas (e.g. $$\frac{x}{y}$$)."
                className="text-xs border-neutral-200 min-h-[140px]"
                required
              />
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCardDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingCard}
                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
              >
                {creatingCard ? "Saving..." : "Add Card"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
