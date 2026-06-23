import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { login, logout } from "./authSlice";

// Helper to extract a cookie value from the browser on client-side
export function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || "";
  }
  return "";
}

const baseQuery = fetchBaseQuery({
  baseUrl: "/api",
  credentials: "include",
  prepareHeaders: (headers) => {
    // Append CSRF Token header for all unsafe methods
    const csrfToken = getCookie("csrf_token");
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
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
        api.dispatch(login({ user, token: null }));

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
  if (result.data && typeof result.data === "object" && "success" in result.data) {
    result.data = (result.data as any).data;
  }

  return result;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Campuses",
    "Programs",
    "Users",
    "Roles",
    "BillingPlans",
    "Leads",
    "CourseClasses",
    "ClassSections",
    "MakeupRequests",
    "Attempts",
    "Broadcasts",
    "Students",
    "Placements",
    "Enrollments",
    // Clio active learning
    "Lessons",
    "LessonFlow",
    "Teachers",
    "Notifications",
    "Timetables",
    "TimetableSlots",
    "Attendance",
    "Homework",
    "Gradebook",
    "Questions",
    "Assessments",
    "Assignments",
  ],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
    }),
    getMe: builder.query<any, void>({
      query: () => "/auth/me",
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    googleLogin: builder.mutation({
      query: (dto) => ({
        url: "/auth/google",
        method: "POST",
        body: dto,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useLogoutMutation,
  useGoogleLoginMutation,
} = authApi;
