import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { getActingChildId } from "@/lib/acting-child";

import { login, logout } from "./authSlice";

// The API is a separate origin from the client, so this can never be a
// relative path — there is no Next.js proxy rewriting /api/* anymore.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/api`,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    // The API and client are cross-origin, so the browser can never read the
    // csrf_token cookie via document.cookie (that's a same-origin-only
    // restriction, independent of SameSite) — the value is instead captured
    // into Redux at login/refresh/session-restore time and read back here.
    const csrfToken = (getState() as any).auth?.csrfToken;
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
    // Tells the API which child a guardian is acting for. Purely a hint — the
    // server re-checks the guardian-child link on every request, and ignores
    // this entirely for callers who are themselves students.
    const actingChildId = getActingChildId();
    if (actingChildId) {
      headers.set("x-acting-student-id", actingChildId);
    }
    return headers;
  },
});

// Wrapper to intercept 401 Unauthorized errors and perform token rotation
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const url = typeof args === "string" ? args : args.url;

    // Do not attempt refresh on registration, login, logout, or session verification itself
    const bypassPaths = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
      "/auth/me",
      "/auth/google",
    ];
    const isBypass = bypassPaths.some((p) => url.includes(p));

    if (!isBypass) {
      const refreshResult = await baseQuery(
        { url: "/auth/refresh", method: "POST" },
        api,
        extraOptions,
      );

      if (refreshResult.data) {
        // Rotated successfully, store new user session details in Redux state
        const user = (refreshResult.data as any).data ?? refreshResult.data;
        api.dispatch(login({ user, csrfToken: user.csrfToken }));

        // Retry the original request
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh session has expired completely (refresh token expired)
        api.dispatch(logout());
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
  }

  // Normalize successful responses from the NestJS envelope format
  // ({ success, code, message, data, meta }). Paginated payloads keep their
  // list metadata in a hybrid shape because consumers read it three ways:
  // transformResponse sites use `response.data` + `response.meta.total`,
  // picker endpoints are typed `{ items }`, and some read `total` directly.
  if (result.data && typeof result.data === "object" && "success" in result.data) {
    const envelope = result.data as any;
    if (Array.isArray(envelope.data) && envelope.meta?.pagination) {
      const total = envelope.meta.pagination.totalItems ?? envelope.data.length;
      result.data = {
        items: envelope.data,
        data: envelope.data,
        meta: { total },
        total,
      };
    } else {
      result.data = envelope.data;
    }
  }

  return result;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Programs",
    "Users",
    "Roles",
    "Leads",
    "Batches",
    "BatchSessions",
    "ClassSections",
    "Attempts",
    "Broadcasts",
    "Students",
    "Placements",
    "Enrollments",
    // Clio active learning
    "Lessons",
    "LessonFlow",
    // Learning catalog
    "LearningSubjects",
    "Courses",
    "CourseDetail",
    "LearningPaths",
    "LearningPathDetail",
    "Discussion",
    "GamificationToday",
    "Teachers",
    "Notifications",
    "Attendance",
    "Homework",
    "Gradebook",
    "Questions",
    "Assessments",
    "Assignments",
    "ParentPortal",
    "Gamification",
    "Leaderboard",
    "StoryContent",
    "TeacherPortal",
    "LiveClasses",
    "PlacementRecommendations",
    "Entitlements",
    "Classes",
    "TeacherApplications",
  ],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Users"],
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["Users"],
    }),
    // Always resolves the same way whether or not the address has an account —
    // the API refuses to confirm which, and the UI must not either.
    forgotPassword: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    resetPassword: builder.mutation<
      { message: string },
      { token: string; newPassword: string }
    >({
      query: (body) => ({
        url: "/auth/reset-password",
        method: "POST",
        body,
      }),
    }),
    changePassword: builder.mutation<
      unknown,
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
    }),
    getMe: builder.query<any, void>({
      query: () => "/auth/me",
      providesTags: ["Users"],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Users"],
    }),
    googleLogin: builder.mutation({
      query: (dto) => ({
        url: "/auth/google",
        method: "POST",
        body: dto,
      }),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useLogoutMutation,
  useGoogleLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
} = authApi;
