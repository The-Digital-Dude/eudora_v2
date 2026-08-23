import { api } from '@/core/api/api';
import type {
  HomeworkAttachmentUpload,
  HomeworkSubmissionRecord,
  PendingHomeworkItem,
  SubmitHomeworkPayload,
} from '@/core/contracts';

/** A file picked on-device, before it has been uploaded. */
export interface PickedFile {
  uri: string;
  name: string;
  mimetype: string;
}

export const homeworkApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Addressed by student id rather than `/homework/me/pending`, which
     * resolves the caller's own profile and so throws for a guardian — who has
     * none. The student-addressed route serves both: `assertCanAccessStudentRecord`
     * short-circuits when the caller *is* that student, and otherwise verifies
     * the guardian-child link.
     *
     * One endpoint instead of branching on role, so there is no second path to
     * keep in step.
     */
    getPendingHomework: builder.query<PendingHomeworkItem[], string>({
      query: (studentProfileId) =>
        `/homework/student/${studentProfileId}/pending`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Homework', id: studentProfileId },
      ],
    }),

    getMySubmissions: builder.query<HomeworkSubmissionRecord[], string>({
      query: (studentProfileId) => `/homework/student/${studentProfileId}`,
      providesTags: (_r, _e, studentProfileId) => [
        { type: 'Homework', id: studentProfileId },
      ],
    }),

    submitHomework: builder.mutation<HomeworkSubmissionRecord, SubmitHomeworkPayload>({
      query: (body) => ({ url: '/homework/submit', method: 'POST', body }),
      // 'ItemHomework' is untargeted like submitCard/updateModuleItemProgress
      // above: this payload carries a homeworkId, not the moduleItemId the tag
      // is scoped by, so there is no id to target with. Invalidating every
      // entry costs an occasional extra refetch in exchange for not threading
      // moduleItemId through every submit call site.
      invalidatesTags: ['Homework', 'ItemHomework'],
    }),

    /**
     * One file per call — the server's `FileInterceptor('file', …)` only
     * accepts a single part. A multi-file submission uploads sequentially and
     * collects the resulting ids before calling `submitHomework`.
     *
     * Not tagged/invalidated: this returns a bare file record, not anything a
     * screen reads back through the cache.
     */
    uploadHomeworkAttachment: builder.mutation<HomeworkAttachmentUpload, PickedFile>({
      query: ({ uri, name, mimetype }) => {
        const formData = new FormData();
        // React Native's FormData accepts this uri/name/type shape directly;
        // it is not a real Blob; the RN bridge streams it from the file
        // itself.
        formData.append('file', {
          uri,
          name,
          type: mimetype,
        } as unknown as Blob);
        return { url: '/homework/attachments', method: 'POST', body: formData };
      },
    }),
  }),
});

export const {
  useGetPendingHomeworkQuery,
  useGetMySubmissionsQuery,
  useSubmitHomeworkMutation,
  useUploadHomeworkAttachmentMutation,
} = homeworkApi;
