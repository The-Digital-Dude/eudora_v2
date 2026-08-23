import { api } from '@/core/api/api';
import type {
  GamificationBadge,
  GamificationMe,
  LeaderboardResponse,
  TodaysGoals,
} from '@/core/contracts';
import type { ChildScoped } from '@/features/catalog/catalogApi';

/**
 * XP, streaks, goals and badges belong to a *learner*, and until 2026-08-23 the
 * API resolved that from the caller's own student profile — so every one of
 * these 404'd for a guardian. They are acting-aware now, which makes the child
 * id part of the cache key here for the same reason it is in catalogApi:
 * without it, switching child would show the sibling's XP.
 */

export const gamificationApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    getGamificationMe: builder.query<GamificationMe, ChildScoped>({
      query: () => '/gamification/me',
      providesTags: ['Gamification'],
    }),

    getTodaysGoals: builder.query<TodaysGoals, ChildScoped>({
      query: () => '/gamification/today',
      providesTags: ['GamificationToday'],
    }),

    getBadges: builder.query<GamificationBadge[], ChildScoped>({
      query: () => '/gamification/me/badges',
      providesTags: ['Badges'],
    }),

    getLeaderboard: builder.query<
      LeaderboardResponse,
      ChildScoped & { scope?: 'class' | 'year' }
    >({
      query: ({ scope }) =>
        scope
          ? `/gamification/leaderboard?scope=${scope}`
          : '/gamification/leaderboard',
      providesTags: ['Leaderboard'],
    }),
  }),
});

export const {
  useGetGamificationMeQuery,
  useGetTodaysGoalsQuery,
  useGetBadgesQuery,
  useGetLeaderboardQuery,
} = gamificationApi;
