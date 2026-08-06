import { api } from '@/core/api/api';
import type { TimetableSlot } from '@/core/contracts';

export const timetableApi = api.injectEndpoints({
  // Metro Fast Refresh re-runs this module without tearing down the api
  // singleton, so a plain injectEndpoints would warn (and eventually diverge)
  // on every hot reload. Matches the same convention already used in
  // client/src/features/*/*Api.ts on the web app.
  overrideExisting: true,
  endpoints: (builder) => ({
    getStudentSchedule: builder.query<TimetableSlot[], string>({
      query: (studentProfileId) => `/timetables/schedule/student/${studentProfileId}`,
      providesTags: ['Timetable'],
    }),
  }),
});

export const { useGetStudentScheduleQuery } = timetableApi;
