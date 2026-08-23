import { clearActingChild } from '@/core/api/actingChildStore';
import { api } from '@/core/api/api';
import { clearTokens, setTokens } from '@/core/api/tokenStore';
import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  UpdateMyStudentProfilePayload,
} from '@/core/contracts';
import { unregisterCurrentPushToken } from '@/features/notifications/pushRegistration';

export const authApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    /** Native token login — returns tokens in the body, sets no cookies. */
    login: builder.mutation<TokenResponse, LoginPayload>({
      query: (body) => ({ url: '/auth/token', method: 'POST', body }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        const { data } = await queryFulfilled;
        await setTokens(data.accessToken, data.refreshToken);
      },
      invalidatesTags: ['Me'],
    }),

    /**
     * Native signup. Same response shape as login — a fresh token pair — and
     * the same `onQueryStarted` to store it, since a successful registration
     * is a signed-in session, not a step before one.
     *
     * The account this creates already has its `GuardianProfile` (server-side,
     * same write as the role grant), so there is no separate "create profile"
     * step to chain afterward the way `GuardianOnboardingScreen` still needs
     * to for accounts that predate that.
     */
    register: builder.mutation<TokenResponse, RegisterPayload>({
      query: (body) => ({ url: '/auth/token/register', method: 'POST', body }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        const { data } = await queryFulfilled;
        await setTokens(data.accessToken, data.refreshToken);
      },
      invalidatesTags: ['Me'],
    }),

    logout: builder.mutation<{ revoked: boolean }, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/token/revoke', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        // Clear locally regardless: a failed revoke must not strand the user
        // in a signed-in state they cannot leave.
        try {
          await queryFulfilled;
        } finally {
          await unregisterCurrentPushToken(dispatch);
          await clearTokens();
          // A family tablet is the normal case here, so a left-behind child id
          // would mean the next guardian's very first requests carry a student
          // they have no link to — a 403 on an otherwise healthy sign-in.
          clearActingChild();
        }
      },
    }),

    getMe: builder.query<AuthUser, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),

    updateMyStudentProfile: builder.mutation<unknown, UpdateMyStudentProfilePayload>({
      query: (body) => ({ url: '/student-profiles/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateMyStudentProfileMutation,
} = authApi;
