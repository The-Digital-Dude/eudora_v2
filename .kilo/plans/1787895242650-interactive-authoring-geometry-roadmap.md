# Interactive Authoring UX + Geometry Widgets Roadmap

**Note:** The attached images (`image.png`, `download.png`) could not be read because this environment does not support image input. This plan is based on the text request and the existing Eudora v2 codebase.

## Current State

- Question authoring lives in `client/src/app/(dashboard)/questions/` with a split edit/preview layout.
- `WidgetConfigEditor` (`widget-config-editor.tsx`) provides per-widget config forms. Lists (MCQ options, hints, labels, targets, etc.) are plain add/remove rows with no reordering.
- Student-facing drag-and-drop already uses native HTML5 DnD + click-to-place in `DragDropWidget` and `GridMatchingWidget`. The `@dnd-kit/*` packages are installed but unused.
- Geometry-adjacent widgets exist: `COORDINATE_PLOTTER` (point plotting) and `SHAPE_SHADING` (bar/polygon region shading). No angle or polygon classification widgets exist yet.
- Backend has a mature widget matrix: Prisma `WidgetType` enum, Zod schemas (`widget-config.schema.ts`), generator (`widget-generator.ts`), and grader (`widget-grader.ts`).

## Goal

Reduce authoring friction by adding drag-and-drop reordering to the editor, then introduce two new geometry widgets focused on angles and polygons, following the same v2 config + generator + grader pattern as existing widgets.

---

## Phase 1 — Authoring UX: Drag-and-Drop Reordering (Immediate)

**Scope:** Add `@dnd-kit/sortable` reordering to all additive lists in the question editor. No new widget types.

**Affected files:**
- `client/src/app/(dashboard)/questions/components/question-editor-form.tsx` — hints list
- `client/src/app/(dashboard)/questions/components/question-type-fields.tsx` — MCQ options
- `client/src/app/(dashboard)/questions/components/widget-config-editor.tsx` — all widget config sub-lists:
  - `STANDARD_MCQ`: given variables, secret variables, derived values, distractors
  - `DRAG_AND_DROP_LABELS`: labels pool, target slots
  - `GRID_MATCHING`: left column, right column, correct pairs
  - `SLIDER_MANIPULATIVE`: no list fields to reorder
  - `COORDINATE_PLOTTER`: no list fields (visual selector handles correct points)
  - `SHAPE_SHADING`: no list fields

**Implementation notes:**
- Wrap each list in `DndContext` + `SortableContext` using `@dnd-kit/core` and `@dnd-kit/sortable` (already installed).
- Use `arrayMove` from `@dnd-kit/sortable` to reorder state arrays.
- Preserve existing `onChange` callbacks; replace array in-place.
- Add drag handles (grip icon) to each row; keep row click targets intact.
- Mobile fallback: `@dnd-kit/modifiers` `restrictToVerticalAxis` + existing click-to-edit UX remains.

**Validation:**
- `npm run lint` (client)
- Manual: reorder hints, MCQ options, and widget config lists; verify save/edit round-trip persists order via Prisma/JSON.

---

## Phase 2 — New Widget: `ANGLE_PROTRACTOR`

**Scope:** Students measure, classify, or set angles using a protractor-style SVG interaction.

**Config schema (add to `widget-config.schema.ts` v2):**
```ts
export const AngleProtractorFixedConfigSchema = z.object({
  configVersion: z.literal(2),
  mode: z.literal('fixed'),
  display: z.object({
    showMeasure: z.boolean().default(true),
    showVertexLabel: z.boolean().default(true),
    rayLength: z.number().min(40).max(120).default(80),
  }),
  correctAngle: z.number().min(0).max(360),
  tolerance: z.number().min(0).max(45).default(5),
  classification: z.enum(['acute','right','obtuse','straight','reflex','full']).optional(),
});
```

**WidgetType enum additions (Prisma):**
- `ANGLE_PROTRACTOR`

**Student interaction modes (configurable via `display.mode` or separate enum in Phase 3; for Phase 2 implement one mode):**
- Drag ray endpoints to set an angle, then submit.
- Grading: measure the final angle between the two rays, compare to `correctAngle` within `tolerance`.
- If `classification` is set, also validate angle class.

**Authoring config editor (`widget-config-editor.tsx`):**
- Number input for `correctAngle` (0–360).
- Number input for `tolerance`.
- Toggle `showMeasure`.
- Toggle `showVertexLabel`.
- Visual SVG preview where author can drag rays to preview the angle and see the measured value live.

**Student widget (`AngleProtractorWidget.tsx`):**
- SVG with center vertex, two draggable ray endpoints, optional protractor arc.
- Snap-to-common-angles (5° increments) when `tolerance >= 5`.
- Post-submission reveal: highlight correct angle range if incorrect.

**Generator (`widget-generator.ts`):**
- Passthrough fixed config; no randomization needed for Phase 2.

**Grader (`widget-grader.ts`):**
- Compute angle from submitted ray endpoints using `Math.atan2`.
- Normalize to [0, 360).
- `isCorrect = Math.abs(measured - correctAngle) <= tolerance` (handle wrap-around: e.g., 350° vs 10°).
- If `classification` present, also check class match.

**Client schema (`widgetConfigSchemas.ts`):**
- Add `AngleProtractorFixedConfig` type and include in `WidgetConfigSchemaMap`.

**Validation:**
- Backend: `npm run test` (api-service), `npm run prisma:migrate` (add enum value).
- Client: `npm run lint`, manual test authoring → preview → submit in a lesson.

---

## Phase 3 — New Widget: `POLYGON_CLASSIFIER`

**Scope:** Students classify polygons by number of sides, regularity, or convexity by dragging vertices or selecting a category.

**Config schema (add to `widget-config.schema.ts` v2):**
```ts
export const PolygonClassifierFixedConfigSchema = z.object({
  configVersion: z.literal(2),
  mode: z.literal('fixed'),
  display: z.object({
    sides: z.number().int().min(3).max(12),
    regular: z.boolean().default(true),
    showInteriorAngles: z.boolean().default(false),
    showSideLengths: z.boolean().default(false),
    vertexLabels: z.boolean().default(false),
  }),
  task: z.enum(['classify_sides','classify_regular','classify_convex']),
  correctAnswer: z.string().min(1),
  tolerance: z.number().min(0).max(20).default(2),
});
```

**WidgetType enum additions (Prisma):**
- `POLYGON_CLASSIFIER`

**Student interaction:**
- `classify_sides`: Student sees a polygon and selects its type (triangle, quadrilateral, pentagon, hexagon, heptagon, octagon, nonagon, decagon, hendecagon, dodecagon) from a dropdown or by dragging the polygon to a category chip.
- `classify_regular`: Student classifies whether the given polygon is regular or irregular.
- `classify_convex`: Student classifies as convex or concave.
- Grading: exact string match on `correctAnswer` (e.g., `"hexagon"`, `"regular"`, `"convex"`).

**Authoring config editor (`widget-config-editor.tsx`):**
- Select `sides` (3–12) and `regular` toggle.
- Select `task` type.
- Input `correctAnswer` (pre-filled dropdown based on task).
- Toggle `showInteriorAngles`, `showSideLengths`, `vertexLabels`.
- Live SVG preview of the configured polygon; author can drag vertices when `regular: false` to create an irregular shape.

**Student widget (`PolygonClassifierWidget.tsx`):**
- SVG polygon renderer using the same wedge/path math from `ShapeShadingWidget`.
- Category chips or select dropdown below the shape.
- Post-submission reveal: highlight correct category.

**Generator (`widget-generator.ts`):**
- Fixed passthrough. No randomization in Phase 3.

**Grader (`widget-grader.ts`):**
- `isCorrect = (submission.responseText ?? '').trim().toLowerCase() === correctAnswer.toLowerCase()`
- Reuse `NUMERIC_OR_TEXT` branch pattern or add explicit `POLYGON_CLASSIFIER` case.

**Client schema (`widgetConfigSchemas.ts`):**
- Add `PolygonClassifierFixedConfig` type and include in `WidgetConfigSchemaMap`.

**Validation:**
- Backend: `npm run test`, `npm run prisma:migrate`.
- Client: `npm run lint`, manual authoring → preview → submit.

---

## Phase 4 — Shared Authoring Canvas Infrastructure

**Scope:** Extract common SVG canvas utilities used by `CoordinatePlotterWidget`, `ShapeShadingWidget`, and the new geometry widget config editors so authors get a consistent pan/zoom/grid/snap experience.

**New files:**
- `client/src/lib/geometry/canvas.ts` — coordinate conversion, grid snapping, viewport math.
- `client/src/components/authoring/AuthoringCanvas.tsx` — reusable SVG wrapper with pan/zoom (mouse wheel + drag), grid overlay, and snap-to-grid.

**Refactors:**
- Update `CoordinatePlotterWidget.tsx` to use `AuthoringCanvas` (keep student mode, share math).
- Update `ShapeShadingWidget.tsx` polygon path to use shared `wedgePath` from `canvas.ts`.

**Validation:**
- Client `npm run lint`; visual regression check on existing coordinate plotter and shape shading authoring previews.

---

## Phase 5 — Parameterized Geometry (Optional, Post-Phase 3)

If demand supports randomized geometry:
- **`ANGLE_PROTRACTATOR` parameterized mode:** randomize `correctAngle` within a range, optionally randomize `rayLength`.
- **`POLYGON_CLASSIFIER` parameterized mode:** randomize `sides` (3–8), randomize `regular` boolean, derive `correctAnswer` from the randomized config.

Requires adding parameterized schemas, generator branches, and extending the authoring UI with mode toggles (same pattern as `STANDARD_MCQ` and `SLIDER_MANIPULATIVE`).

---

## Migration / Rollout Path

1. Add enum values to `prisma/schema.prisma` → `npx prisma migrate dev --name add-geometry-widgets`.
2. Backend Zod schemas and generator/grader cases.
3. Client widget components and config editors.
4. Update `QuestionEditorForm` widget type dropdown to include new widgets.
5. Feature-flag via `widgetType` enum — existing rows unaffected because Prisma adds enum values without data migration.

---

## Validation Plan

| Layer | Command | What it catches |
|-------|---------|-----------------|
| API lint | `cd services/api-service && npm run lint` | TS/ESLint errors in generator/grader/schema |
| API tests | `cd services/api-service && npm run test` | Zod schema validation, generator output, grader logic |
| Client lint | `cd client && npm run lint` | React/TS errors in new widgets and editors |
| Prisma migrate | `npx prisma migrate dev` | Enum/schema drift |
| Manual flow | Author → Preview → Save → Lesson/Assessment → Submit → Reveal | End-to-end correctness |

---

## Open Questions

1. **Angle widget interaction:** Should Phase 2 ship with ray-dragging only, or also a numeric-entry fallback? (Recommended: ray-dragging + numeric fallback for accessibility.)
2. **Polygon classification task:** Should `classify_convex` be included in Phase 3, or deferred to keep scope tight? (Recommended: include; grader is trivial and authoring UI is minimal.)
3. **Authoring canvas priority:** Is Phase 4 required before Phase 2/3, or can geometry widget config editors use inline SVG first and refactor later? (Recommended: inline SVG for Phase 2/3, extract shared canvas in Phase 4 to unblock geometry work faster.)
4. **Parameterized geometry:** Is randomized angle/polygon generation needed in the initial release, or is fixed-mode sufficient for launch? (Recommended: fixed-mode only for launch; parameterized is a follow-up once the base widgets are validated.)
