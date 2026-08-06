import { api } from '@/core/api/api';
import type {
  CreateMessagePayload,
  CreateThreadPayload,
  MessageItem,
  MessageThread,
} from '@/core/contracts';

export const messagingApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    getThreads: builder.query<MessageThread[], void>({
      query: () => '/messages/threads',
      providesTags: ['Messages'],
    }),

    getThread: builder.query<MessageThread, string>({
      query: (id) => `/messages/threads/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Messages', id }],
    }),

    createThread: builder.mutation<MessageThread, CreateThreadPayload>({
      query: (body) => ({ url: '/messages/threads', method: 'POST', body }),
      invalidatesTags: ['Messages'],
    }),

    postMessage: builder.mutation<
      MessageItem,
      { threadId: string } & CreateMessagePayload
    >({
      query: ({ threadId, ...body }) => ({
        url: `/messages/threads/${threadId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { threadId }) => [
        { type: 'Messages', id: threadId },
        'Messages',
      ],
    }),

    markThreadRead: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/messages/threads/${id}/read`, method: 'POST' }),
      invalidatesTags: ['Messages'],
    }),

    getUnreadMessageCount: builder.query<{ count: number }, void>({
      query: () => '/messages/unread-count',
      providesTags: ['Messages'],
    }),
  }),
});

export const {
  useGetThreadsQuery,
  useGetThreadQuery,
  useCreateThreadMutation,
  usePostMessageMutation,
  useMarkThreadReadMutation,
  useGetUnreadMessageCountQuery,
} = messagingApi;
