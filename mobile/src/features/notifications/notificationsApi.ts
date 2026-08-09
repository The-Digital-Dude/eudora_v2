import { api } from '@/core/api/api';
import type { RegisterDeviceTokenPayload } from '@/core/contracts';

export const notificationsApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    registerDeviceToken: builder.mutation<unknown, RegisterDeviceTokenPayload>({
      query: (body) => ({ url: '/device-tokens', method: 'POST', body }),
    }),

    unregisterDeviceToken: builder.mutation<unknown, string>({
      query: (token) => ({
        url: `/device-tokens/${encodeURIComponent(token)}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const { useRegisterDeviceTokenMutation, useUnregisterDeviceTokenMutation } =
  notificationsApi;
