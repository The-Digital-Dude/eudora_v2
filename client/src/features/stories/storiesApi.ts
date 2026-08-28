import { authApi } from "../auth/authApi";
import type { AgentReply, AskPayload, Story } from "./types";

/**
 * The authenticated half of the story module. The public demo deliberately does
 * not go through here: it must work with no session at all, and routing it via
 * the authenticated base query would attach credentials a visitor does not have
 * and trip the reauth interceptor on every call.
 */
export const storiesApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Keyed by module item rather than story id because that is what the course
     * outline links to, and what the entitlement check is expressed in terms
     * of. The acting-student header is added by the shared base query, so a
     * guardian reading with their child resolves correctly without this
     * endpoint knowing anything about it.
     */
    getStoryByModuleItem: builder.query<Story, string>({
      query: (moduleItemId: string) => `/stories/by-module-item/${moduleItemId}`,
      providesTags: ["StoryContent" as any],
    } as any),

    askStory: builder.mutation<AgentReply, { storyId: string } & AskPayload>({
      query: ({ storyId, ...body }: { storyId: string } & AskPayload) => ({
        url: `/stories/${storyId}/ask`,
        method: "POST",
        body,
      }),
      // Deliberately invalidates nothing: a question does not change the story,
      // and the transcript is held in component state for the length of the
      // sitting rather than refetched.
    } as any),
  }),
});

export const { useGetStoryByModuleItemQuery, useAskStoryMutation } = storiesApi;
