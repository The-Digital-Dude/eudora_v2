import { api } from '@/core/api/api';
import { clearTokens, setTokens } from '@/core/api/tokenStore';
import type {
  AuthUser,
  LoginPayload,
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
  useLogoutMutation,
  useGetMeQuery,
  useUpdateMyStudentProfileMutation,
} = authApi;
