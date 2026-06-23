import { authApi } from "../auth/authApi";

export interface Message {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string;
  readAt: string | null;
  attachmentUrls: string[];
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export interface MessageThread {
  id: string;
  subject: string;
  studentProfileId: string | null;
  guardianUserId: string;
  teacherUserId: string;
  status: "OPEN" | "ARCHIVED";
  lastMessageAt: string;
  createdAt: string;
  studentProfile?: {
    id: string;
    fullName: string;
  };
  guardian?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  messages?: Message[];
  unreadCount?: number;
}

export const messagingApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getThreads: builder.query<MessageThread[], void>({
      query: () => "/messages/threads",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Messages" as const, id })),
              { type: "Messages" as const, id: "LIST" },
            ]
          : [{ type: "Messages" as const, id: "LIST" }],
    }),
    getThreadById: builder.query<MessageThread, string>({
      query: (id) => `/messages/threads/${id}`,
      providesTags: (result, error, id) => [{ type: "Messages", id }],
    }),
    createThread: builder.mutation<MessageThread, { subject: string; teacherUserId: string; firstMessageBody: string; studentProfileId?: string }>({
      query: (body) => ({
        url: "/messages/threads",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Messages", id: "LIST" }],
    }),
    postMessage: builder.mutation<Message, { threadId: string; body: string; attachmentUrls?: string[] }>({
      query: ({ threadId, ...body }) => ({
        url: `/messages/threads/${threadId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { threadId }) => [
        { type: "Messages", id: threadId },
        { type: "Messages", id: "LIST" },
      ],
    }),
    markThreadRead: builder.mutation<{ success: boolean }, string>({
      query: (threadId) => ({
        url: `/messages/threads/${threadId}/read`,
        method: "POST",
      }),
      invalidatesTags: (result, error, threadId) => [
        { type: "Messages", id: threadId },
        { type: "Messages", id: "LIST" },
      ],
    }),
    getUnreadCount: builder.query<{ count: number }, void>({
      query: () => "/messages/unread-count",
      providesTags: [{ type: "Messages", id: "UNREAD" }],
    }),
  }),
});

export const {
  useGetThreadsQuery,
  useGetThreadByIdQuery,
  useCreateThreadMutation,
  usePostMessageMutation,
  useMarkThreadReadMutation,
  useGetUnreadCountQuery,
} = messagingApi;
