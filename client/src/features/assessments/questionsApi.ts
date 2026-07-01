import { authApi } from "../auth/authApi";

export interface QuestionOption {
  id?: string;
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  subjectId: string;
  levelId: string;
  questionType: "mcq" | "short_answer" | "numeric" | "written";
  prompt: string;
  correctAnswer?: string | null;
  difficulty: "easy" | "medium" | "hard" | "extension";
  status: "draft" | "active" | "archived";
  widgetType?: string | null;
  widgetConfig?: any;
  explanation?: string | null;
  hints?: string[];
  options: QuestionOption[];
  subject?: { id: string; name: string; code: string };
  level?: { id: string; name: string; code: string };
}

export interface ListQuestionsParams {
  search?: string;
  subjectId?: string;
  levelId?: string;
  questionType?: string;
  difficulty?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ListQuestionsResponse {
  items: Question[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LookupItem {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface ListLookupResponse {
  items: LookupItem[];
  total: number;
}

export const questionsApi = authApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getQuestions: builder.query<ListQuestionsResponse, ListQuestionsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== "") {
              queryParams.append(key, String(val));
            }
          });
        }
        return `/questions?${queryParams.toString()}`;
      },
      providesTags: ["Questions" as any],
    }),
    getQuestion: builder.query<Question, string>({
      query: (id) => `/questions/${id}`,
      providesTags: (_result, _err, id) => [{ type: "Questions" as any, id }],
    }),
    createQuestion: builder.mutation<Question, Partial<Question>>({
      query: (body) => ({
        url: "/questions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Questions" as any],
    }),
    updateQuestion: builder.mutation<Question, { id: string; body: Partial<Question> }>({
      query: ({ id, body }) => ({
        url: `/questions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        "Questions" as any,
        { type: "Questions" as any, id },
      ],
    }),
    archiveQuestion: builder.mutation<void, string>({
      query: (id) => ({
        url: `/questions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Questions" as any],
    }),
    getLevels: builder.query<ListLookupResponse, void>({
      query: () => "/assessments/levels?pageSize=100",
    }),
    getSubjects: builder.query<ListLookupResponse, void>({
      query: () => "/subjects?pageSize=100",
    }),
  }),
});

export const {
  useGetQuestionsQuery,
  useGetQuestionQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useArchiveQuestionMutation,
  useGetLevelsQuery,
  useGetSubjectsQuery,
} = questionsApi;
