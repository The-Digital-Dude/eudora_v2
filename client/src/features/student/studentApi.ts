import { authApi } from "../auth/authApi";

export interface StudentExperience {
  totalXp: number;
  level: number;
  nextLevelXp: number;
}

export interface StudentStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface GamificationMe {
  experience: StudentExperience;
  streak: StudentStreak;
  lessonsCompleted: number;
}

export interface LeaderboardRow {
  studentProfileId: string;
  fullName: string;
  totalXp: number;
  level: number;
  rank: number;
}

export interface LeaderboardData {
  data: LeaderboardRow[];
  me: LeaderboardRow | null;
}

export interface VirtualBadge {
  code: string;
  name: string;
  description: string;
  earned: boolean;
  progress: number;
  maxProgress: number;
}

export const studentApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getGamificationMe: builder.query<GamificationMe, void>({
      query: () => "/gamification/me",
      providesTags: ["Gamification"],
    }),
    getLeaderboard: builder.query<LeaderboardData, { scope?: "class" | "year" }>({
      query: ({ scope = "class" } = {}) => `/gamification/leaderboard?scope=${scope}`,
      providesTags: ["Leaderboard"],
    }),
    getBadges: builder.query<VirtualBadge[], void>({
      query: () => "/gamification/me/badges",
      providesTags: ["Gamification"],
    }),
  }),
});

export const {
  useGetGamificationMeQuery,
  useGetLeaderboardQuery,
  useGetBadgesQuery,
} = studentApi;
