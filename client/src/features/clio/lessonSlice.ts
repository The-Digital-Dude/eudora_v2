import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { SubmitCardResult } from "./clioApi";
import type { RootState } from "@/store/store";

// ─── State Shape ──────────────────────────────────────────────────────────────

export interface LessonUIState {
  currentCardIndex: number;
  showExplanation: boolean;
  lastSubmitResult: SubmitCardResult | null;
  /** Per-card widget state keyed by cardId */
  widgetState: Record<string, any>;
  /** Index of the current hint being revealed (-1 = none shown) */
  hintIndex: number;
  /** Running XP accumulated this session (for HUD animation) */
  sessionXp: number;
  /** Card submit timestamp, used to calculate timeSpentSeconds */
  cardStartedAt: number | null;
}

const initialState: LessonUIState = {
  currentCardIndex: 0,
  showExplanation: false,
  lastSubmitResult: null,
  widgetState: {},
  hintIndex: -1,
  sessionXp: 0,
  cardStartedAt: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const lessonSlice = createSlice({
  name: "lesson",
  initialState,
  reducers: {
    /** Advance to the next card and reset per-card UI state */
    nextCard(state) {
      state.currentCardIndex += 1;
      state.showExplanation = false;
      state.lastSubmitResult = null;
      state.hintIndex = -1;
      state.cardStartedAt = Date.now();
    },

    /** Go back to the previous card */
    prevCard(state) {
      if (state.currentCardIndex > 0) {
        state.currentCardIndex -= 1;
        state.showExplanation = false;
        state.lastSubmitResult = null;
        state.hintIndex = -1;
        state.cardStartedAt = Date.now();
      }
    },

    /** Jump to a specific card index (e.g. when resuming from attempt) */
    jumpToCard(state, action: PayloadAction<number>) {
      state.currentCardIndex = action.payload;
      state.showExplanation = false;
      state.lastSubmitResult = null;
      state.hintIndex = -1;
      state.cardStartedAt = Date.now();
    },

    /** Show the explanation slide-up panel after submission */
    showExplanation(state, action: PayloadAction<SubmitCardResult>) {
      state.showExplanation = true;
      state.lastSubmitResult = action.payload;
      state.sessionXp += action.payload.xpEarned;
    },

    /** Hide the explanation panel */
    hideExplanation(state) {
      state.showExplanation = false;
    },

    /** Store the live widget interaction state for a given card */
    setWidgetState(
      state,
      action: PayloadAction<{ cardId: string; state: any }>
    ) {
      state.widgetState[action.payload.cardId] = action.payload.state;
    },

    /** Reveal the next available hint for the current card */
    revealNextHint(state) {
      state.hintIndex += 1;
    },

    /** Record when the student started the current card (for time tracking) */
    markCardStart(state) {
      state.cardStartedAt = Date.now();
    },

    /** Full reset when leaving a lesson */
    resetLesson() {
      return initialState;
    },
  },
});

export const {
  nextCard,
  prevCard,
  jumpToCard,
  showExplanation,
  hideExplanation,
  setWidgetState,
  revealNextHint,
  markCardStart,
  resetLesson,
} = lessonSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectCurrentCardIndex = (s: RootState) =>
  s.lesson.currentCardIndex;
export const selectShowExplanation = (s: RootState) => s.lesson.showExplanation;
export const selectLastResult = (s: RootState) => s.lesson.lastSubmitResult;
export const selectWidgetState = (cardId: string) => (s: RootState) =>
  s.lesson.widgetState[cardId] ?? null;
export const selectHintIndex = (s: RootState) => s.lesson.hintIndex;
export const selectSessionXp = (s: RootState) => s.lesson.sessionXp;
export const selectCardStartedAt = (s: RootState) => s.lesson.cardStartedAt;

export default lessonSlice.reducer;
