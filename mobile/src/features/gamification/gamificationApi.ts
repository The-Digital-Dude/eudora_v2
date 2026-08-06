import { api } from '@/core/api/api';
import type {
  GamificationBadge,
  GamificationMe,
  LeaderboardResponse,
  TodaysGoals,
} from '@/core/contracts';

export const gamificationApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    getGamificationMe: builder.query<GamificationMe, void>({
      query: () => '/gamification/me',
      providesTags: ['Gamification'],
    }),

    getTodaysGoals: builder.query<TodaysGoals, void>({
      query: () => '/gamification/today',
      providesTags: ['GamificationToday'],
    }),

    getBadges: builder.query<GamificationBadge[], void>({
      query: () => '/gamification/me/badges',
      providesTags: ['Badges'],
    }),

    getLeaderboard: builder.query<LeaderboardResponse, 'class' | 'year' | void>({
      query: (scope) => (scope ? `/gamification/leaderboard?scope=${scope}` : '/gamification/leaderboard'),
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
