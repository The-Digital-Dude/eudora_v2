# Mobile: `courseClass` → `batch` follow-up

The API renamed `CourseClass` → `Batch` on 2026-08-17, **including the wire
contract**. Mobile was deliberately left out of that pass, so it is currently
reading fields the API no longer sends.

## Symptom

Nothing crashes and nothing errors. The renamed fields simply arrive as
`undefined`, so affected screens render blank names — homework and gradebook
rows lose their batch label, and the timetable falls back to "Study period" for
every slot. That silence is the risk: it looks like empty data rather than a
bug.

## What changed on the API

| Was | Now |
|---|---|
| `courseClassId` (request + response field) | `batchId` |
| `courseClass` (nested object) | `batch` |
| `GET /api/course-classes` | `GET /api/batches` |
| `GET /api/gradebook/course-class/:id` | `/api/gradebook/batch/:id` |
| `GET /api/homework/course-class/:id` | `/api/homework/batch/:id` |
| `GET /api/attendance/sessions/course-class/:id` | `/api/attendance/sessions/batch/:id` |

`CourseClassStatus` is now `BatchStatus`. Tables `course_classes`,
`course_class_sessions` and `course_class_attendance` became `batches`,
`batch_sessions` and `batch_attendance` — irrelevant to mobile, listed for
completeness.

## Exact call sites (9 across 5 hand-written files)

**`src/core/contracts/index.ts`** — the type definitions; fix these first, the
rest follow from the compiler.
- L548 `courseClass: { name: string } | null;`
- L608 `courseClass: { id: string; name: string };`
- L620 `homework: { … courseClass: { name: string } };`
- L638 `courseClass: { id: string; name: string } | null;`

**Screens**
- `app/homework/index.tsx` L116, L155 — `homework.courseClass.name`
- `app/homework/[homeworkId].tsx` L90 — `homework.courseClass.name`
- `app/timetable.tsx` L103 — `slot.courseClass?.name`
- `src/features/guardian/ChildDetailPanel.tsx` L186 — `g.courseClass?.name`

**`src/core/contracts/generated/openapi.d.ts`** — 34 references, but generated.
Regenerate it from the API's OpenAPI output rather than hand-editing.

## Suggested fix

Regenerate the OpenAPI types, then rename `courseClass` → `batch` and
`courseClassId` → `batchId` in the five hand-written files. The compiler will
find every remaining site once `contracts/index.ts` is updated.
