import { authApi } from "../auth/authApi";

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface LessonSummary {
  id: string;
  conceptId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  xpReward: number;
  concept: { name: string };
}

export interface QuestionOption {
  id: string;
  optionLabel: string; // A, B, C, D
  optionText: string;
  isCorrect: boolean;
}

export interface ClioQuestion {
  id: string;
  prompt: string;
  questionType: string;
  widgetType: string | null;
  widgetConfig: Record<string, any> | null;
  explanation: string | null;
  hints: string[];
  correctAnswer: string | null;
  options: QuestionOption[];
}

export interface ClioCard {
  id: string;
  lessonId: string;
  title: string;
  sortOrder: number;
  cardType: "CONCEPTUAL" | "INTERACTIVE" | "CHECKPOINT";
  content: string; // Plain text or markdown body
  question: ClioQuestion | null;
}

export interface LessonAttempt {
  id: string;
  lessonId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  xpEarned: number;
  cardResponses: { cardId: string; isCorrect: boolean }[];
}

export interface LessonFlowResponse {
  lesson: LessonSummary & { cards: ClioCard[] };
  attempt: LessonAttempt;
}

export interface SubmitCardPayload {
  timeSpentSeconds: number;
  interactionState?: Record<string, any>;
  selectedOptionId?: string;
  responseText?: string;
}

export interface SubmitCardResult {
  isCorrect: boolean;
  explanation: string;
  xpEarned: number;
  isLessonComplete: boolean;
}

export interface ConceptSummary {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateLessonPayload {
  conceptId: string;
  title: string;
  description?: string;
  sortOrder?: number;
  xpReward?: number;
}

export interface CreateCardPayload {
  lessonId: string;
  title: string;
  sortOrder?: number;
  cardType: "CONCEPTUAL" | "INTERACTIVE" | "CHECKPOINT";
  content: string;
  questionId?: string;
}

// ─── RTK Query Endpoints ──────────────────────────────────────────────────────

export const clioApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // List all available lessons (optionally filtered by conceptId)
    getLessons: builder.query<LessonSummary[], { conceptId?: string } | void>({
      query: (params: any) => {
        const conceptQuery = params?.conceptId ? `?conceptId=${params.conceptId}` : "";
        return `/lessons${conceptQuery}`;
      },
      providesTags: ["Lessons"],
    } as any),

    // Fetch the full lesson flow (cards + active attempt) for a student
    getLessonFlow: builder.query<LessonFlowResponse, string>({
      query: (lessonId: string) => `/lessons/${lessonId}/flow`,
      providesTags: (_result: any, _err: any, lessonId: any) => [
        { type: "LessonFlow" as any, id: lessonId },
      ],
    } as any),

    // Submit a card response; backend evaluates correctness + awards XP
    submitCard: builder.mutation<SubmitCardResult, { cardId: string; body: SubmitCardPayload }>({
      query: ({ cardId, body }: any) => ({
        url: `/lessons/cards/${cardId}/submit`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["LessonFlow" as any],
    } as any),

    // Fetch curriculum concepts for dropdown selection
    getConcepts: builder.query<ConceptSummary[], void>({
      query: () => "/evaluation/concepts",
    } as any),

    // Create a new lesson unit
    createLesson: builder.mutation<LessonSummary, CreateLessonPayload>({
      query: (body: any) => ({
        url: "/lessons",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Lessons" as any],
    } as any),

    // Create a new card inside a lesson
    createCard: builder.mutation<any, CreateCardPayload>({
      query: (body: any) => ({
        url: "/lessons/cards",
        method: "POST",
        body,
      }),
      invalidatesTags: ["LessonFlow" as any],
    } as any),

    // Update lesson metadata
    updateLesson: builder.mutation<LessonSummary, { id: string; body: Partial<CreateLessonPayload> }>({
      query: ({ id, body }: any) => ({
        url: `/lessons/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Lessons" as any, "LessonFlow" as any],
    } as any),

    // Update card metadata & content
    updateCard: builder.mutation<any, { cardId: string; body: any }>({
      query: ({ cardId, body }: any) => ({
        url: `/lessons/cards/${cardId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["LessonFlow" as any],
    } as any),

    // Reorder cards in a lesson
    reorderCards: builder.mutation<any, { id: string; body: { cards: { cardId: string; sortOrder: number }[] } }>({
      query: ({ id, body }: any) => ({
        url: `/lessons/${id}/cards/reorder`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["LessonFlow" as any],
    } as any),

    // Delete card from a lesson
    deleteCard: builder.mutation<any, string>({
      query: (cardId: string) => ({
        url: `/lessons/cards/${cardId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["LessonFlow" as any],
    } as any),
  }),
});

export const {
  useGetLessonsQuery,
  useGetLessonFlowQuery,
  useSubmitCardMutation,
  useGetConceptsQuery,
  useCreateLessonMutation,
  useCreateCardMutation,
  useUpdateLessonMutation,
  useUpdateCardMutation,
  useReorderCardsMutation,
  useDeleteCardMutation,
} = clioApi;
