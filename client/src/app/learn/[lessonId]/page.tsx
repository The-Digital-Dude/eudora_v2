"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Loader2, ArrowLeft, ArrowRight, Sparkles, Lightbulb, CheckCircle2, AlertCircle } from "lucide-react";

import {
  useGetLessonFlowQuery,
  useSubmitCardMutation,
  ClioCard,
} from "@/features/clio/clioApi";

import {
  nextCard,
  prevCard,
  jumpToCard,
  showExplanation,
  hideExplanation,
  setWidgetState,
  revealNextHint,
  markCardStart,
  resetLesson,
  selectCurrentCardIndex,
  selectShowExplanation,
  selectLastResult,
  selectWidgetState as selectCardWidgetState,
  selectHintIndex,
  selectSessionXp,
  selectCardStartedAt,
} from "@/features/clio/lessonSlice";

import { GamificationHUD } from "@/features/clio/GamificationHUD";
import { RiveClioMascot } from "@/features/clio/RiveClioMascot";
import { WidgetSelector } from "@/features/clio/widgets/WidgetSelector";
import { LessonCompleteModal } from "@/features/clio/LessonCompleteModal";
import { MathRenderer } from "@/components/MathRenderer";

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
  const currentWidgetState = useAppSelector(
    selectCardWidgetState(currentCard?.id ?? "")
  );

  // Resume progress from previous attempt cardResponses
  useEffect(() => {
    if (cards.length > 0 && data?.attempt?.cardResponses) {
      const answeredCardIds = data.attempt.cardResponses.map((r) => r.cardId);
      // Find first card that hasn't been answered yet
      const firstUnansweredIndex = cards.findIndex(
        (card) => !answeredCardIds.includes(card.id)
      );

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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="mt-4 text-sm font-semibold text-muted-foreground">Loading your immersive math journey...</p>
      </div>
    );
  }

  if (error || !data || !currentCard) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-6 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Failed to load lesson flow</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          There was an error retrieving the details for this active learning lesson. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition-colors"
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
      })
    );
  };

  const handleCheckAnswer = async () => {
    if (isSubmitting || !currentCard) return;

    const timeSpent = Math.max(
      1,
      Math.round((Date.now() - (cardStartedAt ?? Date.now())) / 1000)
    );

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
    const hasAdminRole = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || 
      (Array.isArray(user?.roles) && user?.roles.some((r: any) => 
        r === "ADMIN" || r === "SUPER_ADMIN" || r.name === "ADMIN" || r.name === "SUPER_ADMIN" || r.role?.name === "ADMIN" || r.role?.name === "SUPER_ADMIN"
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
        lessonProgress={cards.length > 0 ? (currentCardIndex + (showExpPanel ? 1 : 0)) / cards.length : 0}
        onClose={handleBackToDashboard}
      />

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Workspace: Content, Widget, Controls */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 select-text">
          {/* Card Meta / Navigation Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="uppercase tracking-widest">Card</span>
              <span className="bg-muted text-foreground px-2 py-0.5 rounded-md text-[10px]">
                {currentCardIndex + 1} of {cards.length}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
              <span className="uppercase tracking-wider text-violet-600 dark:text-violet-400">
                {currentCard.cardType}
              </span>
            </div>
            {currentCardIndex > 0 && !showExpPanel && (
              <button
                onClick={() => dispatch(prevCard())}
                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
          </div>

          {/* Card Body & Rich Content */}
          <div className="prose dark:prose-invert max-w-2xl">
            <h2 className="text-xl md:text-2xl font-black text-foreground leading-tight mb-4">
              {currentCard.title}
            </h2>
            <div className="text-sm md:text-base font-normal text-foreground/90 leading-relaxed whitespace-pre-wrap">
              <MathRenderer text={currentCard.content} />
            </div>
          </div>

          {/* Interactive Widget Layer */}
          {hasQuestion && currentCard.question && (
            <div className="max-w-2xl py-4 border-t border-border">
              <div className="mb-4">
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Question</span>
                <div className="text-sm font-semibold text-foreground mt-1">
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
          {hasQuestion && currentCard.question && currentCard.question.hints.length > 0 && !showExpPanel && (
            <div className="max-w-2xl space-y-2.5">
              {Array.from({ length: hintIndex + 1 }).map((_, idx) => {
                const hintText = currentCard.question?.hints[idx];
                if (!hintText) return null;
                return (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 font-medium animate-fade-in"
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
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors py-1 focus:outline-none"
                >
                  <Lightbulb className="h-4 w-4" /> Get Hint
                </button>
              )}
            </div>
          )}

          {/* Action Footer controls */}
          <div className="max-w-2xl pt-6 border-t border-border flex items-center justify-between">
            <div>
              {/* Reset card interaction or status message */}
            </div>

            {!hasQuestion || currentCard.cardType === "CONCEPTUAL" ? (
              // Conceptual card navigation
              <button
                onClick={handleContinue}
                className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 hover:opacity-90 transition-all cursor-pointer"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : !isAnswered ? (
              // Question state before submission
              <button
                onClick={handleCheckAnswer}
                disabled={isSubmitting || !currentWidgetState}
                className={[
                  "rounded-2xl px-6 py-3 text-xs font-bold text-white shadow-lg transition-all cursor-pointer",
                  currentWidgetState
                    ? "bg-violet-600 hover:bg-violet-500 shadow-violet-500/20"
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
                className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 hover:opacity-90 transition-all cursor-pointer"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Companion Panel: Rive Mascot with Live Chat bubble */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-card p-6 flex flex-row md:flex-col items-center justify-center md:justify-start gap-4 md:gap-6 z-10 select-none">
          {/* Mascot speech bubble */}
          <div className="relative flex-1 md:flex-initial rounded-2xl border border-border bg-background p-4 shadow-md backdrop-blur-md max-w-xs md:max-w-none">
            {/* Custom bubble tail for desktop (left tail) and mobile (bottom tail) */}
            <div className="hidden md:block absolute bottom-6 -left-2 h-4 w-4 rotate-45 border-b border-l border-border bg-background" />
            <div className="md:hidden absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-b border-r border-border bg-background" />

            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4.5 w-4.5 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5 animate-pulse" />
              <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                {getMascotSpeech()}
              </p>
            </div>
          </div>

          {/* Mascot canvas container */}
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl border border-border bg-muted/40 backdrop-blur-sm shadow-inner shrink-0">
            <RiveClioMascot state={mascotState} size={150} />
            <span className="mt-2 text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase">
              CLIO COMPANION
            </span>
          </div>
        </div>

        {/* Interactive result slide-up panel */}
        {showExpPanel && lastResult && (
          <div
            className={[
              "absolute bottom-0 left-0 right-0 z-30 border-t px-6 py-5 md:py-6 shadow-2xl backdrop-blur-md transition-transform duration-300 select-text flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
              isCorrectAnswer
                ? "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200"
                : "border-rose-500/30 bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200",
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
                <span className="text-sm font-bold uppercase tracking-wider">
                  {isCorrectAnswer ? "Correct! Well Done!" : "Not Quite, but keep trying!"}
                </span>
                {isCorrectAnswer && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                    +{lastResult.xpEarned} XP
                  </span>
                )}
              </div>
              <div className="text-xs md:text-sm font-normal text-foreground/80 dark:text-white/75 leading-relaxed">
                <MathRenderer text={lastResult.explanation || currentCard.question?.explanation || ""} />
              </div>
            </div>

            <button
              onClick={handleContinue}
              className={[
                "rounded-2xl px-6 py-3 text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-98 shrink-0 cursor-pointer",
                isCorrectAnswer
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40"
                  : "bg-rose-600 hover:bg-rose-500 shadow-rose-950/40",
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
