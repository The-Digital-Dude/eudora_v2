"use client";

import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Link2,
  Link2Off,
  PenTool,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { MathRenderer } from "@/components/MathRenderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetQuestionsQuery } from "@/features/assessments/questionsApi";
import {
  useCreateCardMutation,
  useDeleteCardMutation,
  useGetLessonFlowQuery,
  useReorderCardsMutation,
  useUpdateCardMutation,
} from "@/features/clio/clioApi";
import { WidgetSelector } from "@/features/clio/widgets/WidgetSelector";

/** The lesson-authoring "Studio" — card deck editor, rich text body, and live student preview. */
export default function LessonStudioPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const lessonId = params?.id ?? "";

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const { data: lessonFlow, refetch: refetchFlow } = useGetLessonFlowQuery(lessonId, {
    skip: !lessonId,
  });

  const [createCard] = useCreateCardMutation();
  const [updateCard, { isLoading: isSavingCard }] = useUpdateCardMutation();
  const [reorderCards] = useReorderCardsMutation();
  const [deleteCard] = useDeleteCardMutation();

  // Card Editor Form State
  const [editCardTitle, setEditCardTitle] = useState("");
  const [editCardType, setEditCardType] = useState<"CONCEPTUAL" | "INTERACTIVE" | "CHECKPOINT">(
    "CONCEPTUAL",
  );
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

  const handleAddCard = async () => {
    if (!lessonId) return;
    try {
      const result = await createCard({
        lessonId,
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

  const handleMoveCard = async (index: number, direction: "up" | "down") => {
    if (!lessonId) return;
    const items = [...cardsList];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    const payload = items.map((card, idx) => ({
      cardId: card.id,
      sortOrder: idx + 1,
    }));

    try {
      await reorderCards({ id: lessonId, body: { cards: payload } }).unwrap();
      toast.success("Card deck reordered.");
      refetchFlow();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reorder deck.");
    }
  };

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

  const handleBindQuestion = (qId: string) => {
    setEditCardQuestionId(qId);
    setQBinderOpen(false);
    toast.success("Question bound to card. Remember to click Save!");
  };

  const handleUnbindQuestion = () => {
    setEditCardQuestionId(null);
    toast.success("Question unbound from card.");
  };

  return (
    <div className="-mx-8 -my-6 flex h-screen flex-col overflow-hidden bg-muted/30">
      {/* Studio Top Navbar */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/lessons")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              Lesson Builder: {lessonFlow?.lesson?.title}
            </h1>
            <p className="text-[10px] font-semibold text-muted-foreground">
              Curriculum Concept: {lessonFlow?.lesson?.concept?.name}
            </p>
          </div>
        </div>

        <Button
          onClick={handleUpdateCard}
          disabled={isSavingCard || !selectedCard}
          className="h-9 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md shadow-primary/10 hover:bg-primary/90"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" /> Save Card Changes
        </Button>
      </div>

      {/* Studio Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Col 1: Card Deck timeline list */}
        <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
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
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-4 text-center">
              <Bookmark className="mb-2 h-8 w-8 animate-bounce text-muted-foreground/50" />
              <p className="text-[10px] font-medium text-muted-foreground">No cards in this deck.</p>
              <Button onClick={handleAddCard} className="mt-3 h-8 bg-primary text-[10px]">
                Add First Card
              </Button>
            </div>
          ) : (
            <div className="flex-1 space-y-2.5">
              {cardsList.map((card, idx) => {
                const isActive = card.id === (selectedCardId || cardsList[0]?.id);
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-3 transition-all ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/5"
                        : "border-border bg-muted/30 text-foreground hover:bg-card"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="truncate pr-1 text-xs font-bold">
                        {idx + 1}. {card.title}
                      </span>
                      <div className="flex shrink-0 gap-0.5 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveCard(idx, "up");
                          }}
                          disabled={idx === 0}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
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
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(card.id);
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                      <span>{card.cardType}</span>
                      {card.question && (
                        <span className="flex items-center gap-0.5 text-primary">
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
          <div className="flex flex-1 flex-col space-y-6 overflow-y-auto p-6">
            <h2 className="flex items-center gap-1.5 border-b pb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              <PenTool className="h-4 w-4 text-primary" />
              Edit Card Properties
            </h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Card Title
                </Label>
                <Input
                  value={editCardTitle}
                  onChange={(e) => setEditCardTitle(e.target.value)}
                  placeholder="Enter card header title..."
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Card Type
                </Label>
                <select
                  value={editCardType}
                  onChange={(e: any) => setEditCardType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
                >
                  <option value="CONCEPTUAL">CONCEPTUAL</option>
                  <option value="INTERACTIVE">INTERACTIVE</option>
                  <option value="CHECKPOINT">CHECKPOINT</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Markdown Body Content
              </Label>
              <RichTextEditor content={editCardContent} onChange={setEditCardContent} />
            </div>

            {editCardType === "INTERACTIVE" && (
              <div className="space-y-3 rounded-2xl border border-border bg-muted p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Link2 className="h-4 w-4 text-primary" /> Bind Interactive Question
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Bind a reusable Question item from the question bank to evaluate student
                      interaction
                    </p>
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
                  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs font-semibold text-muted-foreground">
                    <span>
                      Bound Question ID:{" "}
                      <span className="font-bold text-foreground">{editCardQuestionId}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">Loading composition workspace...</p>
          </div>
        )}

        {/* Col 3: Selected Card Live Student Preview */}
        <div className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-l border-border bg-muted p-5">
          <h2 className="mb-4 flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            <Eye className="h-4 w-4 text-primary" />
            Live Student Preview
          </h2>

          {selectedCard ? (
            <div className="flex min-h-[400px] flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground">
                  {editCardTitle || "Untitled Card"}
                </h3>

                <div className="text-xs leading-relaxed text-foreground select-text">
                  <MathRenderer text={editCardContent} />
                </div>

                {editCardType === "INTERACTIVE" && editCardQuestionId && (
                  <div className="border-t border-border pt-4">
                    {questionsBank.find((q) => q.id === editCardQuestionId) ? (
                      <div className="rounded-2xl border border-border bg-muted/30 p-3">
                        <WidgetSelector
                          question={questionsBank.find((q) => q.id === editCardQuestionId) as any}
                          currentState={null}
                          onStateChange={() => {}}
                          locked={true}
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">
                        Previewing bound interactive question...
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between border-t border-border pt-4">
                <span className="rounded bg-muted/50 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-muted-foreground uppercase">
                  Step {cardsList.indexOf(selectedCard) + 1} of {cardsList.length}
                </span>
                <Button disabled className="h-7 rounded-lg bg-primary px-2.5 text-[9px] text-primary-foreground">
                  Next Step
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-20 text-center text-xs text-muted-foreground">
              Select a card to view preview.
            </p>
          )}
        </div>
      </div>

      {/* Question Finder dialog — a quick lookup/pick action, not a "create new resource" flow */}
      <Dialog open={qBinderOpen} onOpenChange={setQBinderOpen}>
        <DialogContent className="max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-base font-bold text-foreground">
              <Link2 className="h-5 w-5 text-primary" />
              Select Question to Bind
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 space-y-4">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search question prompt..."
                value={qSearch}
                onChange={(e) => setQSearch(e.target.value)}
                className="h-10 rounded-xl pl-9 text-xs"
              />
            </div>

            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {questionsBank.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No questions found in bank.
                </p>
              ) : (
                questionsBank.map((q) => (
                  <div
                    key={q.id}
                    className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-muted/30 p-3.5 transition-all hover:border-primary/40 hover:shadow-sm"
                    onClick={() => handleBindQuestion(q.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                          {q.questionType}
                        </span>
                        {q.widgetType && (
                          <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[9px] font-bold text-warning uppercase">
                            {q.widgetType}
                          </span>
                        )}
                      </div>
                      <div className="line-clamp-2 text-[10px] text-muted-foreground">
                        <MathRenderer text={q.prompt} />
                      </div>
                    </div>
                    <Button className="h-7 shrink-0 rounded-lg bg-primary px-2.5 text-[9px] font-bold text-primary-foreground">
                      Bind
                    </Button>
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
