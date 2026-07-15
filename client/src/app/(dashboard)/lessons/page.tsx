"use client";

import {
  AlertCircle,
  ArrowLeft,
  Award,
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  Hash,
  Layers,
  Link2,
  Link2Off,
  Loader2,
  PenTool,
  Plus,
  Save,
  Search,
  Trash2} from "lucide-react";
import React, { useEffect,useState } from "react";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { MathRenderer } from "@/components/MathRenderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetQuestionsQuery } from "@/features/assessments/questionsApi";
import {
  useCreateCardMutation,
  useCreateLessonMutation,
  useDeleteCardMutation,
  useGetConceptsQuery,
  useGetLessonFlowQuery,
  useGetLessonsQuery,
  useReorderCardsMutation,
  useUpdateCardMutation} from "@/features/clio/clioApi";
import { WidgetSelector } from "@/features/clio/widgets/WidgetSelector";

export default function LessonAuthoringPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [conceptFilter, setConceptFilter] = useState("all");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Active Card in composition studio
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Queries & Mutations
  const { data: lessons, isLoading: lessonsLoading, refetch: refetchLessons } = useGetLessonsQuery();
  const { data: concepts, isLoading: conceptsLoading } = useGetConceptsQuery();
  const { data: lessonFlow, refetch: refetchFlow } = useGetLessonFlowQuery(
    selectedLessonId ?? "",
    { skip: !selectedLessonId }
  );

  const [createLesson, { isLoading: creatingLesson }] = useCreateLessonMutation();
  const [createCard] = useCreateCardMutation();
  const [updateCard, { isLoading: isSavingCard }] = useUpdateCardMutation();
  const [reorderCards] = useReorderCardsMutation();
  const [deleteCard] = useDeleteCardMutation();

  // Modals state
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");

  // Lesson Form State
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonConceptId, setLessonConceptId] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonSortOrder, setLessonSortOrder] = useState(1);
  const [lessonXpReward, setLessonXpReward] = useState(50);

  // Card Editor Form State
  const [editCardTitle, setEditCardTitle] = useState("");
  const [editCardType, setEditCardType] = useState<"CONCEPTUAL" | "INTERACTIVE" | "CHECKPOINT">("CONCEPTUAL");
  const [editCardContent, setEditCardContent] = useState("");
  const [editCardQuestionId, setEditCardQuestionId] = useState<string | null>(null);

  // Question Binder state
  const [qSearch, setQSearch] = useState("");
  const [qBinderOpen, setQBinderOpen] = useState(false);
  const { data: questionsData } = useGetQuestionsQuery({
    search: qSearch || undefined,
    pageSize: 50,
  });
  const questionsBank = questionsData?.items || [];

  const cardsList = lessonFlow?.lesson?.cards || [];
  const selectedCard = cardsList.find((c) => c.id === selectedCardId) || cardsList[0];

  // Sync Card Editor when selected card changes
  useEffect(() => {
    if (selectedCard) {
      setEditCardTitle(selectedCard.title || "");
      setEditCardType(selectedCard.cardType || "CONCEPTUAL");
      setEditCardContent(selectedCard.content || "");
      setEditCardQuestionId(selectedCard.question?.id || null);
    } else {
      setEditCardTitle("");
      setEditCardType("CONCEPTUAL");
      setEditCardContent("");
      setEditCardQuestionId(null);
    }
  }, [selectedCardId, selectedCard]);

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
      toast.success("Lesson unit created successfully!");
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to create lesson unit.");
    }
  };

  // Action: Add default card
  const handleAddCard = async () => {
    if (!selectedLessonId) return;

    try {
      const result = await createCard({
        lessonId: selectedLessonId,
        title: `Card ${cardsList.length + 1}`,
        cardType: "CONCEPTUAL",
        content: "<p>Write new concept details...</p>",
        sortOrder: cardsList.length + 1,
      }).unwrap();

      toast.success("Card added to deck!");
      refetchFlow();
      if (result?.id) {
        setSelectedCardId(result.id);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add card.");
    }
  };

  // Action: Save edited card values
  const handleUpdateCard = async () => {
    if (!selectedCardId) return;

    try {
      await updateCard({
        cardId: selectedCardId,
        body: {
          title: editCardTitle,
          cardType: editCardType,
          content: editCardContent,
          questionId: editCardQuestionId || null,
        },
      }).unwrap();

      toast.success("Card content saved successfully!");
      refetchFlow();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save card content.");
    }
  };

  // Action: Reorder cards in timeline
  const handleMoveCard = async (index: number, direction: "up" | "down") => {
    if (!selectedLessonId) return;
    const items = [...cardsList];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    // Swap items locally
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    // Build sort payloads
    const payload = items.map((card, idx) => ({
      cardId: card.id,
      sortOrder: idx + 1,
    }));

    try {
      await reorderCards({
        id: selectedLessonId,
        body: { cards: payload },
      }).unwrap();
      toast.success("Card deck reordered.");
      refetchFlow();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reorder deck.");
    }
  };

  // Action: Delete card from timeline
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this card? You cannot undo this action.")) return;
    try {
      await deleteCard(cardId).unwrap();
      toast.success("Card removed from deck.");
      refetchFlow();
      if (selectedCardId === cardId) {
        setSelectedCardId(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete card.");
    }
  };

  // Action: Bind question to card
  const handleBindQuestion = (qId: string) => {
    setEditCardQuestionId(qId);
    setQBinderOpen(false);
    toast.success("Question bound to card. Remember to click Save!");
  };

  const handleUnbindQuestion = () => {
    setEditCardQuestionId(null);
    toast.success("Question unbound from card.");
  };

  // Filter lessons
  const filteredLessons = (lessons ?? []).filter((l) => {
    const title = l.title.toLowerCase();
    const desc = (l.description ?? "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = title.includes(query) || desc.includes(query);
    const matchesConcept = conceptFilter === "all" || l.conceptId === conceptFilter;
    return matchesQuery && matchesConcept;
  });

  // --- RENDERING WORKSPACE STUDIO ---
  if (selectedLessonId) {
    return (
      <div className="flex flex-col h-screen bg-muted/30 overflow-hidden -mx-8 -my-6">
        {/* Studio Top Navbar */}
        <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedLessonId(null);
                setSelectedCardId(null);
              }}
              className="h-9 w-9 rounded-xl border border-border hover:bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground dark:text-white flex items-center gap-1.5">
                Lesson Authoring Studio: {lessonFlow?.lesson?.title}
              </h1>
              <p className="text-[10px] text-muted-foreground font-semibold">
                Curriculum Concept: {lessonFlow?.lesson?.concept?.name}
              </p>
            </div>
          </div>

          <Button
            onClick={handleUpdateCard}
            disabled={isSavingCard || !selectedCard}
            className="h-9 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save Card Changes
          </Button>
        </div>

        {/* Studio Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Col 1: Card Deck timeline list */}
          <div className="w-72 border-r border-border bg-card p-5 flex flex-col overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                Lesson Deck
              </h2>
              <button
                onClick={handleAddCard}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Card
              </button>
            </div>

            {cardsList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-2xl">
                <Bookmark className="h-8 w-8 text-muted-foreground/50 mb-2 animate-bounce" />
                <p className="text-[10px] text-muted-foreground font-medium">No cards in this deck.</p>
                <Button onClick={handleAddCard} className="mt-3 h-8 bg-primary text-[10px]">
                  Add First Card
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1">
                {cardsList.map((card, idx) => {
                  const isActive = card.id === (selectedCardId || cardsList[0]?.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      className={`cursor-pointer rounded-2xl border p-3 flex flex-col gap-1.5 transition-all ${
                        isActive
                          ? "bg-primary/10 border-primary text-primary shadow-md shadow-primary/5"
                          : "bg-muted/30 border-border hover:bg-card text-foreground"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-bold truncate pr-1">
                          {idx + 1}. {card.title}
                        </span>
                        <div className="flex gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCard(idx, "up");
                            }}
                            disabled={idx === 0}
                            className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-30"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCard(idx, "down");
                            }}
                            disabled={idx === cardsList.length - 1}
                            className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-30"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCard(card.id);
                            }}
                            className="h-5 w-5 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                        <span>{card.cardType}</span>
                        {card.question && (
                          <span className="text-primary flex items-center gap-0.5">
                            <Link2 className="h-3 w-3" /> Bound
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Col 2: Selected Card Editor Panel */}
          {selectedCard ? (
            <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1">
                <PenTool className="h-4 w-4 text-primary" />
                Edit Card Properties
              </h2>

              {/* Title and Type Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Card Title</Label>
                  <Input
                    value={editCardTitle}
                    onChange={(e) => setEditCardTitle(e.target.value)}
                    placeholder="Enter card header title..."
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Card Type</Label>
                  <select
                    value={editCardType}
                    onChange={(e: any) => setEditCardType(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none dark:text-white"
                  >
                    <option value="CONCEPTUAL">CONCEPTUAL</option>
                    <option value="INTERACTIVE">INTERACTIVE</option>
                    <option value="CHECKPOINT">CHECKPOINT</option>
                  </select>
                </div>
              </div>

              {/* RichTextEditor Content area */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Markdown Body Content</Label>
                <RichTextEditor content={editCardContent} onChange={setEditCardContent} />
              </div>

              {/* Card Question binder (Visible if INTERACTIVE type) */}
              {editCardType === "INTERACTIVE" && (
                <div className="space-y-3 p-5 rounded-2xl bg-muted border border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Link2 className="h-4 w-4 text-primary" /> Bind Interactive Question
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Bind a reusable Question item from the question bank to evaluate student interaction</p>
                    </div>

                    {!editCardQuestionId ? (
                      <Button
                        onClick={() => setQBinderOpen(true)}
                        className="h-8 rounded-lg bg-primary text-[10px] text-primary-foreground hover:bg-primary/90"
                      >
                        Find Question
                      </Button>
                    ) : (
                      <Button
                        onClick={handleUnbindQuestion}
                        variant="outline"
                        className="h-8 rounded-lg border-border text-[10px] text-destructive hover:bg-destructive/10"
                      >
                        <Link2Off className="mr-1 h-3.5 w-3.5" /> Unbind
                      </Button>
                    )}
                  </div>

                  {editCardQuestionId && (
                    <div className="p-3 bg-card border border-border rounded-xl text-xs font-semibold text-muted-foreground flex justify-between items-center">
                      <span>Bound Question ID: <span className="font-bold text-foreground">{editCardQuestionId}</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-xs text-muted-foreground">Loading composition workspace...</p>
            </div>
          )}

          {/* Col 3: Selected Card Live Student Preview */}
          <div className="w-[380px] border-l border-border bg-muted p-5 flex flex-col overflow-y-auto shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-4">
              <Eye className="h-4 w-4 text-primary" />
              Live Student Preview
            </h2>

            {selectedCard ? (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm min-h-[400px] flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground dark:text-white">{editCardTitle || "Untitled Card"}</h3>
                  
                  {/* Markdown math rendered */}
                  <div className="text-xs text-foreground leading-relaxed select-text">
                    <MathRenderer text={editCardContent} />
                  </div>

                  {/* Render Widget selector if bound */}
                  {editCardType === "INTERACTIVE" && editCardQuestionId && (
                    <div className="pt-4 border-t border-border">
                      {questionsBank.find((q) => q.id === editCardQuestionId) ? (
                        <div className="border border-border p-3 rounded-2xl bg-muted/30">
                          <WidgetSelector
                            question={questionsBank.find((q) => q.id === editCardQuestionId) as any}
                            currentState={null}
                            onStateChange={() => {}}
                            locked={true}
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">Previewing bound interactive question...</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-4 border-t border-border flex justify-between">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                    Step {cardsList.indexOf(selectedCard) + 1} of {cardsList.length}
                  </span>
                  <Button disabled className="h-7 rounded-lg text-[9px] px-2.5 bg-primary text-primary-foreground">Next Step</Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-20">Select a card to view preview.</p>
            )}
          </div>
        </div>

        {/* Question Finder dialog */}
        <Dialog open={qBinderOpen} onOpenChange={setQBinderOpen}>
          <DialogContent className="max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Link2 className="h-5 w-5 text-primary" />
                Select Question to Bind
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search question prompt..."
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-xs"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {questionsBank.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No questions found in bank.</p>
                ) : (
                  questionsBank.map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 border border-border rounded-2xl hover:border-primary/40 hover:shadow-sm transition-all flex justify-between items-start gap-4 cursor-pointer bg-muted/30"
                      onClick={() => handleBindQuestion(q.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-muted text-muted-foreground">
                            {q.questionType}
                          </span>
                          {q.widgetType && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-warning/20 text-warning">
                              {q.widgetType}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground line-clamp-2">
                          <MathRenderer text={q.prompt} />
                        </div>
                      </div>
                      <Button className="h-7 text-[9px] font-bold rounded-lg bg-primary text-primary-foreground px-2.5 shrink-0">Bind</Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- RENDERING LESSON DIRECTORY ---
  return (
    <div className="animate-fade-in space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-white flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Curriculum & Lesson Authoring
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Design dynamic journey units, configure XP checkpoints, and build card-stepper workflows
            for students.
          </p>
        </div>
        <Button
          onClick={handleOpenLessonDialog}
          className="flex h-11 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Create Lesson
        </Button>
      </div>

      {/* Journey Directory Table */}
      <Card className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <h2 className="font-display text-sm font-bold text-foreground">Journey Units</h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <select
              value={conceptFilter}
              onChange={(e) => setConceptFilter(e.target.value)}
              className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none dark:text-white"
            >
              <option value="all">All Concepts</option>
              {(concepts ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs"
                placeholder="Search lessons by title..."
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Lesson / Concept
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Sort Order
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  XP Reward
                </th>
                <th className="pb-3 text-right text-[10px] font-bold text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {lessonsLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-4">
                      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-8 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : filteredLessons.length > 0 ? (
                filteredLessons.map((lesson) => (
                  <tr
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className="cursor-pointer border-b border-border/30 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
                          <BookOpen className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {lesson.title}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Concept:{" "}
                            <span className="font-semibold text-muted-foreground">
                              {lesson.concept?.name || "Uncategorized"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-xs font-bold text-muted-foreground">
                      {lesson.sortOrder}
                    </td>
                    <td className="py-4 text-xs">
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-0.5 text-[10px] font-bold text-warning">
                        <Award className="h-3 w-3 text-warning" />+{lesson.xpReward} XP
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <Button
                        variant="outline"
                        className="ml-auto h-8 rounded-lg px-2.5 text-xs font-bold border-border"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLessonId(lesson.id);
                        }}
                      >
                        Edit Flow
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs font-medium text-muted-foreground">
                    No lessons available. Click &quot;Create Lesson&quot; to build your first curriculum unit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Lesson Modal */}
      <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-1.5 text-base font-bold text-foreground dark:text-white">
              <PenTool className="h-4 w-4 text-primary" />
              Create Lesson Unit
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a new interactive learning unit associated with a curriculum concept.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveLesson} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Curriculum Concept
              </Label>
              {conceptsLoading ? (
                <div className="flex h-10 items-center rounded-xl border border-border bg-muted/50 px-3">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Loading concepts...</span>
                </div>
              ) : (
                <select
                  value={lessonConceptId}
                  onChange={(e) => setLessonConceptId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none dark:text-white"
                  required
                >
                  <option value="" disabled>
                    Select Curriculum Concept
                  </option>
                  {(concepts ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Lesson Title
              </Label>
              <Input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Fractions 101: Introduction"
                className="h-10 border-border text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Description
              </Label>
              <Input
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
                placeholder="Introduce students to fraction denominators..."
                className="h-10 border-border text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Sort Order
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                  </span>
                  <Input
                    type="number"
                    value={lessonSortOrder}
                    onChange={(e) => setLessonSortOrder(Number(e.target.value))}
                    className="h-10 border-border pl-9 text-xs"
                    required
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  XP Reward
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Award className="h-3.5 w-3.5" />
                  </span>
                  <Input
                    type="number"
                    value={lessonXpReward}
                    onChange={(e) => setLessonXpReward(Number(e.target.value))}
                    className="h-10 border-border pl-9 text-xs"
                    required
                    min={10}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLessonDialogOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingLesson}
                className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {creatingLesson ? "Creating..." : "Create Unit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

