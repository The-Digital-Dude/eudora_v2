import { api } from '@/core/api/api';
import type {
  LessonFlow,
  SubmitCardPayload,
  SubmitCardResult,
} from '@/core/contracts';
import type { ChildScoped } from '@/features/catalog/catalogApi';

export const lessonApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Returns the cards plus the student's active attempt. Widget configs are
     * regenerated server-side per attempt from a deterministic seed, so the
     * parameters are stable across refetches within one attempt.
     */
    getLessonFlow: builder.query<LessonFlow, ChildScoped & { lessonId: string }>({
      query: ({ lessonId }) => `/lessons/${lessonId}/flow`,
      // The attempt inside this flow belongs to one learner, so the child id is
      // part of the key — otherwise a guardian switching child would resume the
      // sibling's attempt, and answers would be recorded against the wrong one.
      providesTags: (_r, _e, { lessonId, actingChildId }) => [
        { type: 'LessonFlow', id: `${lessonId}:${actingChildId ?? 'self'}` },
      ],
    }),

    submitCard: builder.mutation<
      SubmitCardResult,
      { cardId: string; lessonId: string; body: SubmitCardPayload }
    >({
      query: ({ cardId, body }) => ({
        url: `/lessons/cards/${cardId}/submit`,
        method: 'POST',
        body,
      }),
      // Grading and XP are server-side, so the streak/XP surfaces have to be
      // re-read rather than optimistically adjusted. CourseDetail is included
      // untargeted (no id) because completing a card can flip a *later*
      // chapter's isLocked — bare 'CourseDetail' invalidates every course the
      // cache currently holds rather than just the one this card belongs to,
      // which costs an occasional extra refetch but was worth it over passing
      // courseId through every submitCard call site for it.
      invalidatesTags: ['Gamification', 'GamificationToday', 'CourseDetail'],
    }),
  }),
});

export const { useGetLessonFlowQuery, useSubmitCardMutation } = lessonApi;
