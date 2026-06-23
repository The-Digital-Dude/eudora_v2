"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { MathRenderer } from "@/components/MathRenderer";
import { ClioCard,useGetLessonFlowQuery, useSubmitCardMutation } from "@/features/clio/clioApi";
import { GamificationHUD } from "@/features/clio/GamificationHUD";
import { LessonCompleteModal } from "@/features/clio/LessonCompleteModal";
import {
  hideExplanation,
  jumpToCard,
  markCardStart,
  nextCard,
  prevCard,
  resetLesson,
  revealNextHint,
  selectCardStartedAt,
  selectCurrentCardIndex,
  selectHintIndex,
  selectLastResult,
  selectSessionXp,
  selectShowExplanation,
  selectWidgetState as selectCardWidgetState,
  setWidgetState,
  showExplanation,
} from "@/features/clio/lessonSlice";
import { RiveClioMascot } from "@/features/clio/RiveClioMascot";
import { WidgetSelector } from "@/features/clio/widgets/WidgetSelector";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function LessonFlowPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const lessonId = params.lessonId as string;

  // Fetch lesson data and current attempts
  const { data, isLoading, error, refetch } = useGetLessonFlowQuery(lessonId, {
    skip: !lessonId,
  });

  const [submitCard, { isLoading: isSubmitting }] = useSubmitCardMutation();

  // Local state selectors
  const currentCardIndex = useAppSelector(selectCurrentCardIndex);
  const showExpPanel = useAppSelector(selectShowExplanation);
  const lastResult = useAppSelector(selectLastResult);
  const hintIndex = useAppSelector(selectHintIndex);
  const sessionXp = useAppSelector(selectSessionXp);
  const cardStartedAt = useAppSelector(selectCardStartedAt);
  const user = useAppSelector((state) => state.auth.user) as any;

  const [mascotState, setMascotState] = useState<
    | "idle"
    | "thinking"
    | "celebrate"
    | "encourage"
    | "wrong"
    | "greeting"
    | "confused"
    | "hint"
    | "milestone"
  >("idle");

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  const cards = data?.lesson?.cards ?? [];
  const currentCard: ClioCard | undefined = cards[currentCardIndex];

  // Selected state for the current widget
  const currentWidgetState = useAppSelector(selectCardWidgetState(currentCard?.id ?? ""));

  // Resume progress from previous attempt cardResponses
  useEffect(() => {
    if (cards.length > 0 && data?.attempt?.cardResponses) {
      const answeredCardIds = data.attempt.cardResponses.map((r) => r.cardId);
      // Find first card that hasn't been answered yet
      const firstUnansweredIndex = cards.findIndex((card) => !answeredCardIds.includes(card.id));

      if (firstUnansweredIndex > 0) {
        dispatch(jumpToCard(firstUnansweredIndex));
      } else if (firstUnansweredIndex === -1) {
        // If all are answered, go to the last card or show completed screen
        dispatch(jumpToCard(cards.length - 1));
      }
    }
    dispatch(markCardStart());

    return () => {
      // Clean up lesson state on unmount
      dispatch(resetLesson());
    };
  }, [data, cards.length, dispatch]);

  // Set companion mascot reaction state
  useEffect(() => {
    if (showExpPanel && lastResult) {
      if (lastResult.isCorrect) {
        setMascotState("celebrate");
      } else {
        setMascotState("wrong");
      }
    } else if (currentWidgetState) {
      setMascotState("thinking");
    } else {
      setMascotState("idle");
    }
  }, [showExpPanel, lastResult, currentWidgetState]);

  if (isLoading) {
    return (
      <div className="bg-background text-foreground flex h-screen w-full flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="text-muted-foreground mt-4 text-sm font-semibold">
          Loading your immersive math journey...
        </p>
      </div>
    );
  }

  if (error || !data || !currentCard) {
    return (
      <div className="bg-background text-foreground flex h-screen w-full flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-rose-500" />
        <h2 className="text-foreground mb-2 text-xl font-bold">Failed to load lesson flow</h2>
        <p className="text-muted-foreground mb-6 max-w-sm text-sm">
          There was an error retrieving the details for this active learning lesson. Please try
          again.
        </p>
        <button
          onClick={() => refetch()}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-violet-500"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const handleWidgetStateChange = (newState: any) => {
    dispatch(
      setWidgetState({
        cardId: currentCard.id,
        state: newState,
      }),
    );
  };

  const handleCheckAnswer = async () => {
    if (isSubmitting || !currentCard) return;

    const timeSpent = Math.max(1, Math.round((Date.now() - (cardStartedAt ?? Date.now())) / 1000));

    // Build submission body depending on widget type
    const payload: any = {
      timeSpentSeconds: timeSpent,
    };

    if (currentCard.question?.widgetType === "STANDARD_MCQ") {
      payload.selectedOptionId = currentWidgetState?.selectedOptionId;
    } else {
      payload.interactionState = currentWidgetState;
    }

    try {
      const result = await submitCard({
        cardId: currentCard.id,
        body: payload,
      }).unwrap();

      dispatch(showExplanation(result));

      if (result.isLessonComplete) {
        // Delay opening modal slightly to let user celebrate/read correct state
        setTimeout(() => {
          setIsCompleteModalOpen(true);
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to submit card response:", err);
    }
  };

  const handleContinue = () => {
    if (currentCardIndex < cards.length - 1) {
      dispatch(nextCard());
    } else {
      setIsCompleteModalOpen(true);
    }
  };

  const handleBackToDashboard = () => {
    const hasAdminRole =
      user?.role === "ADMIN" ||
      user?.role === "SUPER_ADMIN" ||
      (Array.isArray(user?.roles) &&
        user?.roles.some(
          (r: any) =>
            r === "ADMIN" ||
            r === "SUPER_ADMIN" ||
            r.name === "ADMIN" ||
            r.name === "SUPER_ADMIN" ||
            r.role?.name === "ADMIN" ||
            r.role?.name === "SUPER_ADMIN",
        ));
    router.push(hasAdminRole ? "/dashboard" : "/learn");
  };

  const hasQuestion = !!currentCard.question;
  const isAnswered = showExpPanel;
  const isCorrectAnswer = lastResult?.isCorrect;

  // Speech bubble text based on mascot states and hints
  const getMascotSpeech = () => {
    if (showExpPanel) {
      return isCorrectAnswer
        ? "Incredible! You solved it correctly! 🎉 Keep it up!"
        : "Not quite, but don't worry! Let's read the explanation together.";
    }
    if (hintIndex >= 0) {
      return "Aha! Hope this hint sheds some light on the concept! 💡";
    }
    if (currentWidgetState) {
      return "Hmm... interesting choice. Let's see if we can get this right!";
    }
    return "Hi, I'm Clio! Let's figure this out together. Ready when you are!";
  };

  return (
    <>
      {/* Immersive Gamification HUD Header */}
      <GamificationHUD
        lessonTitle={data.lesson.title}
        sessionXp={sessionXp}
        streakCount={data.attempt?.id ? 4 : 3} // Mock increment or placeholder
        lessonProgress={
          cards.length > 0 ? (currentCardIndex + (showExpPanel ? 1 : 0)) / cards.length : 0
        }
        onClose={handleBackToDashboard}
      />

      <main className="relative flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left Workspace: Content, Widget, Controls */}
        <div className="flex flex-1 flex-col space-y-6 overflow-y-auto p-4 select-text md:space-y-8 md:p-8">
          {/* Card Meta / Navigation Header */}
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold">
              <span className="tracking-widest uppercase">Card</span>
              <span className="bg-muted text-foreground rounded-md px-2 py-0.5 text-[10px]">
                {currentCardIndex + 1} of {cards.length}
              </span>
              <span className="bg-border h-1.5 w-1.5 rounded-full" />
              <span className="tracking-wider text-violet-600 uppercase dark:text-violet-400">
                {currentCard.cardType}
              </span>
            </div>
            {currentCardIndex > 0 && !showExpPanel && (
              <button
                onClick={() => dispatch(prevCard())}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-bold transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
          </div>

          {/* Card Body & Rich Content */}
          <div className="prose dark:prose-invert max-w-2xl">
            <h2 className="text-foreground mb-4 text-xl leading-tight font-black md:text-2xl">
              {currentCard.title}
            </h2>
            <div className="text-foreground/90 text-sm leading-relaxed font-normal whitespace-pre-wrap md:text-base">
              <MathRenderer text={currentCard.content} />
            </div>
          </div>

          {/* Interactive Widget Layer */}
          {hasQuestion && currentCard.question && (
            <div className="border-border max-w-2xl border-t py-4">
              <div className="mb-4">
                <span className="text-xs font-bold tracking-widest text-violet-600 uppercase dark:text-violet-400">
                  Question
                </span>
                <div className="text-foreground mt-1 text-sm font-semibold">
                  <MathRenderer text={currentCard.question.prompt} />
                </div>
              </div>

              <WidgetSelector
                question={currentCard.question}
                currentState={currentWidgetState}
                onStateChange={handleWidgetStateChange}
                locked={showExpPanel}
                isCorrect={lastResult?.isCorrect}
              />
            </div>
          )}

          {/* Hints Section */}
          {hasQuestion &&
            currentCard.question &&
            currentCard.question.hints.length > 0 &&
            !showExpPanel && (
              <div className="max-w-2xl space-y-2.5">
                {Array.from({ length: hintIndex + 1 }).map((_, idx) => {
                  const hintText = currentCard.question?.hints[idx];
                  if (!hintText) return null;
                  return (
                    <div
                      key={idx}
                      className="animate-fade-in flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs font-medium text-amber-800 dark:text-amber-300"
                    >
                      <Lightbulb className="h-4.5 w-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <span className="font-bold">Hint {idx + 1}:</span> {hintText}
                      </div>
                    </div>
                  );
                })}

                {hintIndex < currentCard.question.hints.length - 1 && (
                  <button
                    onClick={() => dispatch(revealNextHint())}
                    className="flex items-center gap-1.5 py-1 text-xs font-bold text-amber-600 transition-colors hover:text-amber-500 focus:outline-none dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    <Lightbulb className="h-4 w-4" /> Get Hint
                  </button>
                )}
              </div>
            )}

          {/* Action Footer controls */}
          <div className="border-border flex max-w-2xl items-center justify-between border-t pt-6">
            <div>{/* Reset card interaction or status message */}</div>

            {!hasQuestion || currentCard.cardType === "CONCEPTUAL" ? (
              // Conceptual card navigation
              <button
                onClick={handleContinue}
                className="flex cursor-pointer items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:opacity-90"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : !isAnswered ? (
              // Question state before submission
              <button
                onClick={handleCheckAnswer}
                disabled={isSubmitting || !currentWidgetState}
                className={[
                  "cursor-pointer rounded-2xl px-6 py-3 text-xs font-bold text-white shadow-lg transition-all",
                  currentWidgetState
                    ? "bg-violet-600 shadow-violet-500/20 hover:bg-violet-500"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...
                  </span>
                ) : (
                  "Check Answer"
                )}
              </button>
            ) : (
              // Question state after submission
              <button
                onClick={handleContinue}
                className="flex cursor-pointer items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:opacity-90"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Companion Panel: Rive Mascot with Live Chat bubble */}
        <div className="border-border bg-card z-10 flex w-full flex-row items-center justify-center gap-4 border-t p-6 select-none md:w-80 md:flex-col md:justify-start md:gap-6 md:border-t-0 md:border-l">
          {/* Mascot speech bubble */}
          <div className="border-border bg-background relative max-w-xs flex-1 rounded-2xl border p-4 shadow-md backdrop-blur-md md:max-w-none md:flex-initial">
            {/* Custom bubble tail for desktop (left tail) and mobile (bottom tail) */}
            <div className="border-border bg-background absolute bottom-6 -left-2 hidden h-4 w-4 rotate-45 border-b border-l md:block" />
            <div className="border-border bg-background absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-r border-b md:hidden" />

            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4.5 w-4.5 shrink-0 animate-pulse text-violet-600 dark:text-violet-400" />
              <p className="text-foreground/90 text-xs leading-relaxed font-medium">
                {getMascotSpeech()}
              </p>
            </div>
          </div>

          {/* Mascot canvas container */}
          <div className="border-border bg-muted/40 flex shrink-0 flex-col items-center justify-center rounded-2xl border p-2 shadow-inner backdrop-blur-sm">
            <RiveClioMascot state={mascotState} size={150} />
            <span className="text-muted-foreground/50 mt-2 text-[10px] font-bold tracking-widest uppercase">
              CLIO COMPANION
            </span>
          </div>
        </div>

        {/* Interactive result slide-up panel */}
        {showExpPanel && lastResult && (
          <div
            className={[
              "absolute right-0 bottom-0 left-0 z-30 flex flex-col items-start justify-between gap-4 border-t px-6 py-5 shadow-2xl backdrop-blur-md transition-transform duration-300 select-text md:flex-row md:items-center md:py-6",
              isCorrectAnswer
                ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-200"
                : "border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/90 dark:text-rose-200",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2">
                {isCorrectAnswer ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                )}
                <span className="text-sm font-bold tracking-wider uppercase">
                  {isCorrectAnswer ? "Correct! Well Done!" : "Not Quite, but keep trying!"}
                </span>
                {isCorrectAnswer && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                    +{lastResult.xpEarned} XP
                  </span>
                )}
              </div>
              <div className="text-foreground/80 text-xs leading-relaxed font-normal md:text-sm dark:text-white/75">
                <MathRenderer
                  text={lastResult.explanation || currentCard.question?.explanation || ""}
                />
              </div>
            </div>

            <button
              onClick={handleContinue}
              className={[
                "shrink-0 cursor-pointer rounded-2xl px-6 py-3 text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-98",
                isCorrectAnswer
                  ? "bg-emerald-600 shadow-emerald-950/40 hover:bg-emerald-500"
                  : "bg-rose-600 shadow-rose-950/40 hover:bg-rose-500",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              Continue
            </button>
          </div>
        )}
      </main>

      {/* Lesson Complete Modal */}
      <LessonCompleteModal
        isOpen={isCompleteModalOpen}
        totalXp={sessionXp}
        streakCount={data.attempt?.id ? 4 : 3} // Mock increment or placeholder
        lessonTitle={data.lesson.title}
        onBackToLessons={handleBackToDashboard}
      />
    </>
  );
}
