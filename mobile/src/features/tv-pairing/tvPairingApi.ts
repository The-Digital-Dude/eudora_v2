import { api } from '@/core/api/api';
import type { ApproveDevicePairingResponse } from '@/core/contracts';

export const tvPairingApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    approveDevicePairing: builder.mutation<ApproveDevicePairingResponse, string>({
      query: (code) => ({
        url: '/auth/device/approve',
        method: 'POST',
        body: { code },
      }),
    }),
  }),
});

export const { useApproveDevicePairingMutation } = tvPairingApi;
