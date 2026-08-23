# Mobile rewire — scope

**Written:** 2026-08-23 · **Decisions locked:** 2026-08-23
**Supersedes:** `MOBILE-BATCH-RENAME-TODO.md` (that file is one item inside Tier 2 below)

Mobile's last commit is `2ce2b73` (Aug 13). Thirty-five commits have landed since, including four that changed the product's shape, not just its code. This scopes what it takes to make the app true again.

---

## 0. Decisions (locked)

| # | Decision | Consequence |
|---|---|---|
| 1 | **Guardian-first.** The guardian is the account; children are learners inside it. | Acting-child stops being a feature and becomes the app's spine. See W2. |
| 2 | **Mobile sells,** with locked/gated features. | Built as link-out to the existing Stripe hosted checkout, not an embedded payment sheet. See §1. |
| 3 | **Guardians create accounts in the app.** | Needs a new API endpoint. Mobile is no longer a mobile-only project. See §4. |
| 4 | **Ship later** — internal/TestFlight while web carries the business. | W7 shrinks to bundle ids + internal distribution. Store listings deferred. |

**Assumption I'm carrying on #1**, flag it if wrong: children do not need their own logins. Direct student sign-in keeps working — the API resolves a real student to themselves and ignores the acting header, so it costs nothing to leave in — but nothing gets *designed* for it. `core/viewPreference.ts`'s student/guardian toggle is replaced by the acting-child store, not kept alongside it.

---

## 1. The one constraint on "mobile sells"

Selling is in scope. **Taking the payment inside the app is not** — that's the variant that fails review, and it's the only part I'm building differently from how it might read.

- Embedding Stripe's payment sheet for digital content consumed in-app violates App Store guideline 3.1.1 in every market, and Google Play's equivalent. There is no version of this that survives review.
- Since the May 2025 *Epic v. Apple* ruling, **US-storefront apps may link out to external web checkout with no commission and no warning interstitial.** That is the path this plan takes.
- Outside the US the default is still IAP, with narrower link-out entitlements (EU DMA and others) that carry fees. Re-check against current guidelines at submission — these rules have moved twice in eighteen months.
- **Gating and locked features are entirely fine.** Nothing about showing a locked course, a free-preview item, or an "unlock" button is restricted. Only where the money changes hands is.

**Good news: the API already supports this cleanly.** `POST /billing/checkout-session` returns `{ orderId, checkoutUrl }` — a Stripe Hosted Checkout URL. Mobile opens it in the system browser, the guardian pays on web, the app resumes and polls `GET /billing/orders/:id` until the webhook lands. Same Stripe account, same live flow, zero commission, no review risk.

One detail that shapes the implementation: `safeUrl` in `checkout.controller.ts:25` hard-locks redirect targets to `APP_URL` and rejects anything not starting with `/`. So mobile **cannot** deep-link back from Stripe. Poll the order instead — the API already documents that endpoint as "polled by the success page, the webhook may not have landed yet." No API change needed here.

---

## 2. What changed underneath the app

| Landed | Change | Migration / commit |
|---|---|---|
| Aug 14 | Multi-campus and per-campus billing removed | `20260814135755_remove_multi_campus_and_billing` |
| Aug 15 | Class→Program→Course taxonomy, entitlements + free preview, orders + installment plans, guardian checkout | `2026081514…` → `…20000` |
| Aug 16 | **Message centre deleted outright** | `20260816070000_remove_message_center` |
| Aug 17 | `CourseClass` → `Batch`, including the wire contract | `20260817090000_rename_course_class_to_batch` |
| Aug 17 | Live class became a `ModuleItem` kind | `20260817140000_live_class_as_module_item` |
| Aug 19 | Guardian is the default signup role; teaching is an application | `20260819120000_teacher_applications` |
| Aug 20–21 | Homework became a course checkpoint; guardians can submit; attachments went private | `2026082012…` → `…100000` |
| Aug 21 | **Timetable retired outright** | `20260821120000_retire_timetable` |

The single most important change is not in that table: the API now resolves *which student a request is about* through the `x-acting-student-id` header (`services/api-service/src/entitlements/acting-student.service.ts:5`). Decision 1 makes this the app's foundation.

---

## 3. Breakage inventory

`pnpm typecheck` on mobile passes clean today. I ran it. Every defect below is invisible to the compiler, because `src/core/contracts/index.ts` is hand-written and describes an API that no longer exists. The app builds, installs, and renders blank rows.

### Tier 1 — endpoints that no longer exist (feature deleted, not renamed)

| Mobile | Calls | Reality |
|---|---|---|
| `app/messages/index.tsx`, `[threadId].tsx`, `new.tsx`, `src/features/messaging/messagingApi.ts` | `/messages/threads`, `/messages/unread-count`, … | No messaging module in the API. Nothing to repoint at. |
| `app/timetable.tsx`, `src/features/timetable/timetableApi.ts:12` | `/timetables/schedule/student/:id` | Retired. Nearest equivalent is `GET /api/schedule/student/:studentProfileId` (batch sessions), a different shape — real meetings, not a weekly recurrence rule. |

`GuardianHomeScreen.tsx:30` renders an unread-message badge off a dead endpoint.

### Tier 2 — renamed wire fields, silently `undefined`

The `courseClass` → `batch` rename, 9 hand-written sites. Full list is in `MOBILE-BATCH-RENAME-TODO.md`; it is still accurate. Fix `src/core/contracts/index.ts` first and the compiler finds the rest.

### Tier 3 — request context mobile never sends ← **the spine, under decision 1**

`x-acting-student-id` is read by course detail, every module-item route (`progress`, `my-session`, `my-assignment`, `my-homework`), lesson flow, homework submit, and `entitlements/me`. A guardian owns no `StudentProfile`, so without the header the server resolves them to *nobody* and they get 403 or empty on their own children's purchased content. `POST /homework/submit` returns an explicit "Select which child you are submitting for" — mobile has no way to answer that.

Web solved this in `client/src/features/parent/useActingChild.ts` + `client/src/lib/acting-child.ts`, with the header set in `client/src/features/auth/authApi.ts:29`. Mobile needs the same idea, persisted through MMKV rather than localStorage.

### Tier 4 — content kinds mobile renders wrong

`ModuleItemKind` gained `HOMEWORK` and `LIVE_CLASS`. `mobile/src/core/contracts/index.ts:120` lists four of the six, and `app/item/[courseId]/[itemId].tsx:87` ends in a bare `else` that routes *everything unmatched* into `AssessmentItemView`. Both new kinds land there and render as a broken assessment.

`ModuleItem.isFreePreview` and the entitlement gate are unrepresented — which under decision 2 is now a revenue surface, not a cosmetic gap. Mobile currently cannot tell "locked, unlock this" from "empty".

### Tier 5 — changed contracts on endpoints that still exist

- **Homework submit.** `SubmitHomeworkPayload.attachmentUrls` (`contracts/index.ts:626`) is now `attachmentFileIds`, and files go through a two-step private upload (`POST /homework/attachments` → `GET /homework/attachments/:fileId`). The old field is silently ignored — a learner's attachments vanish with a 201.
- **`dueDate` is now nullable** (self-paced checkpoints have none). `PendingHomeworkItem.dueDate` is typed `string`; `app/homework/index.tsx` will render `Invalid Date`.
- **Onboarding hits the wrong endpoint.** `guardianApi.ts:84` posts to `/guardian-profiles`, which 409s because registration already created the row. The API added `POST /guardian-profiles/me` for exactly this — "can neither be pointed at someone else nor 409 on the row registration already created for them." One-line fix, now on the critical path because of decision 3.
- **Onboarding step 2 is the wrong flow.** It links an existing student by email (`guardian-relationships/self-link`). Under decision 1 the primary path is `POST /parent/children` — create the child, no account needed. The API comment says it plainly: "this is the path that makes self-service purchase possible." Self-link becomes the edge case.
- **`/parent/children` grew** `attendanceRate`, `pendingHomeworkCount`, `latestGrade`; `ChildDetailPanel` doesn't use them and recomputes worse versions from other calls.

### Tier 6 — missing surfaces

- **No signup at all.** `app/login.tsx` is the only auth screen. Decision 3 makes this blocking — see §4.
- **No entitlement awareness** (`GET /entitlements/me`, `/entitlements/course/:courseId/access`, `GET /billing/my-entitlements`).
- Deliberately out of scope: teacher applications, family/orders admin, staff attendance, gradebook authoring. Named here so nobody re-litigates them later.

---

## 4. API work this now requires

Decisions 2 and 3 push work across the boundary. This is no longer a mobile-only project, and that's worth seeing before you start.

1. **`POST /auth/token/register`** — ✅ **Done 2026-08-23.** Reuses `authService.register` and returns `toTokenResponse(...)`; `resolveSelfSignupRole` already defaults to GUARDIAN and `buildGuardianProfileSeed` already creates the profile in the same write, so no role picker and no second call are needed on the client. Carries the same `@Throttle({ ttl: 3_600_000, limit: 5 })` as the cookie route — it creates the same rows, so an unthrottled twin would just be a wider door. Device info (`userAgent`/`ip`) is now threaded through `register` on **both** routes; previously the account's first session landed in `AuthSession` unattributable. Covered by `test/native-auth.e2e-spec.ts` (9 cases, green), including the rate limit itself.
2. **`POST /auth/token/apple`** — conditional. If mobile ships Google sign-in (`/auth/token/google` already exists), App Store guideline 4.8 requires Sign in with Apple alongside it. The web Apple flow is redirect-based (`/auth/apple/start` + `/auth/apple/callback`) and has no native sibling. **Cheapest answer: email/password only in v1**, which sidesteps 4.8 entirely. Decide before W5.
3. **The two bugs in §5** — both now hit the primary customer rather than an edge case.
4. **No change needed** to `safeUrl` or the checkout flow. Poll, don't deep-link.
5. **Gamification + `GET /catalog/courses` acting-awareness** — ✅ **Done 2026-08-23** as part of W2; see that entry. Discovered mid-stage: both resolved the caller's own student profile, so a guardian-first app could show a child no XP and an unpersonalised course list.

---

## 5. Two API bugs mobile will get blamed for

Both present as mobile defects. Decision 1 makes guardians the primary audience and decision 2 makes self-paced buyers the primary customer, so these moved from "known gap" to "hits the people who pay":

1. **`/parent/children/:id/teachers` resolves through `StudentClassPlacement`** (`parent.service.ts:159`). The retire-timetable migration says it outright: a child who arrives via guardian checkout never gets a placement. Returns `[]` for exactly the customers who paid.
2. **`/homework/me/pending` filters on `batchId in enrolledBatchIds`** (`homework.service.ts:503`). Self-paced homework has `batchId = null` and can never appear. Self-paced buyers see an empty homework list forever.

---

## 6. The scope

Ordered so each stage is shippable and the next one gets easier.

**W1 — Contract resync. ✅ Done 2026-08-23.**

Hand-fixed `src/core/contracts/index.ts` and the five screens the compiler then surfaced. Typecheck green.

- `ModuleItemKind` gained `HOMEWORK` and `LIVE_CLASS`; `ModuleItem` gained `isFreePreview` and `isContentLocked`.
- `courseClass` → `batch` on every *live* type. Deliberately **not** renamed on `TimetableSlot` — renaming a field on a deleted endpoint only makes the type look maintained. Both dead blocks (messaging, timetable) are now marked `— DEAD` with the migration that killed them, so W3 has an unambiguous target.
- Homework: `batch` and `dueDate` are nullable (self-paced learners have neither); `SubmitHomeworkPayload.attachmentUrls` → `attachmentFileIds`; the phantom `attachmentUrls` came off `HomeworkSubmissionRecord` — the list read doesn't return attachments at all, only the submit response does.
- New `src/features/homework/format.ts` — `batchLabel` / `dueLabel` / `isOverdue`, so the two homework screens can't disagree about what a missing deadline looks like. Undated work is no longer rendered as `Invalid Date`, and is never painted overdue.
- `kindIcon` in `app/course/[courseId].tsx` is keyed by `ModuleItemKind`, so the next new kind is a compile error rather than a blank icon.

**Two corrections to this plan, found while doing it:**

1. **Don't regenerate `generated/openapi.d.ts` yet.** The original plan said to. But the API carries exactly one `@nestjs/swagger` decorator, so `/api/docs-json` describes routes and says nothing about response bodies — and the file is imported by nothing. Regenerating buys route names we already have. It becomes worthwhile only once the API's DTOs are annotated; until then `contracts/index.ts` is the source of truth and the generated file is noise. *(It would also have needed the API up, and Docker wasn't running.)*
2. **`isContentLocked` existed and mobile was ignoring it.** Server-computed as `!(entitled || isFreePreview)`; when true the API nulls `videoUrl`, `readingContent` and `assessmentId` but still returns the row, so the learner sees the item exists and is told to unlock it. Mobile discarded it — which is *why* paywalled items currently render as blank ones. It's in the contract now; wiring it up is W6.

**W2 — Acting-child spine. ✅ Done 2026-08-23.** Mobile typecheck green; API 203 unit + 125 e2e green.

- `core/api/actingChildStore.ts` — MMKV-backed, in-memory-mirrored (read on every request, same reasoning as `tokenStore`), with subscribers so separate trees cannot drift. Cleared on sign-out: a family tablet is the normal case, and a left-behind child id means the next guardian 403s on their first request.
- Header set in `baseQuery.ts`'s `prepareHeaders`, unconditionally — the server ignores it for student callers.
- `features/guardian/useActingChild.ts` — one source of truth, `useSyncExternalStore` so every consumer re-renders from one subscription. Falls back to the first child when the stored id is stale, and writes that fallback back so the header matches the screen. Exposes both `actingChildId` (cache key; null for students) and `learnerId` (the profile to address by id; a student's own).
- **Cache keys**: 12 call sites now carry the child id in the query *argument*, not just the header. Tag ids are scoped too.
- `app/index.tsx` rewritten — guardian is the root, child is a context. `core/viewPreference.ts` deleted.
- `StudentHomeScreen` is now the learner surface for both audiences; `GuardianHomeScreen` gained an "Open learning" entry per child that sets the acting child and opens it in one action.
- Homework unified on `/homework/student/:id[/pending]`, which serves both — `assertCanAccessStudentRecord` short-circuits for the student themselves. No role branch to keep in step.

**This stage could not be done in mobile alone.** Two API surfaces still resolved the caller's own student profile and so were unreachable for guardians:

1. **Gamification (all four routes) 404'd for every guardian.** XP, streaks, goals, badges and the leaderboard had *no reader at all* — a guardian has no student profile, and a child created through the family portal has no password to sign in with. Now acting-aware. A guardian who has not picked a child gets 403 with "select which child", not a 404, so the client can prompt rather than show a broken empty state.
2. **`GET /catalog/courses` returned every personalised field blank for guardians** while `courses/:id` next door answered for the child correctly — so a guardian could open a course and see progress the list had just told them did not exist. Now resolved through the same rules; it degrades to unscoped rather than refusing, since browsing without a child selected is legitimate.

Covered by `test/acting-student.e2e-spec.ts` (8 cases), which asserts the two failure modes rather than just the happy path: a guardian acting for an unlinked child gets 403, and **a student sending a sibling's id still resolves to themselves** — the cross-child read this stage exists to prevent.

*One deliberate overlap into W3:* the dead Messages card was removed from `GuardianHomeScreen`, which is now the app's root. Shipping the spine with a card that 404s as its most prominent element was not a defensible intermediate state. `src/features/messaging/` and `app/messages/*` still await W3.

**W3 — Delete the dead.** Remove `app/messages/*`, `app/timetable.tsx`, `src/features/messaging/`, `src/features/timetable/`, their `Messages`/`Timetable` tags in `core/api/api.ts`, and the badges and links pointing at them. Whether "today's sessions" returns off `GET /api/schedule/student/:id` is a *new feature* decision, not a repair — defer it.

**W4 — New item kinds.** `HomeworkItemView` (brief from `GET /catalog/module-items/:id/my-homework`, submit via the two-step upload) and `LiveClassItemView` (join details from `…/my-session`). Replace the bare `else` in the item screen with an exhaustive switch so the next new kind fails loudly instead of rendering as a broken assessment.

**W5 — Signup and onboarding** *(API side ✅ done — §4.1)*. Register screen against `POST /auth/token/register`; profile step repointed to `POST /guardian-profiles/me`; add-a-child step on `POST /parent/children` (fullName, birthDate, optional classId). Mirror the password rules client-side — min 10, max 72, lowercase + uppercase + digit — or users get a bare 400 they cannot act on; map 409 to "email already registered" with a route into sign-in. The role hint can be omitted: the server already defaults to GUARDIAN. Decide social login here — email/password only is the cheap answer and sidesteps App Store 4.8 entirely.

*Screen work waits for W2:* a newly registered guardian has zero children, so the success path hands off into "add your first child" — guardian-first UI that W2 builds. Building it before then means building against a shell W2 rewrites.

**W6 — Sell.** Entitlement-aware catalog (locked / free-preview / owned) off `GET /entitlements/course/:courseId/access`; family ownership view off `GET /billing/my-entitlements`; unlock flow = `POST /billing/resolve-sku` for the price summary → `GET /billing/courses/:courseId/batches` for the LIVE batch picker → `POST /billing/checkout-session` → open `checkoutUrl` in the system browser → poll `GET /billing/orders/:id` on resume. Read-only billing history (`app/billing.tsx`) already works and stays.

**W7 — Ship prerequisites.** Real bundle identifiers (`com.eudora.*`, both platforms — the current `com.anonymous.eudorastudent` is a placeholder and there is no `ios.bundleIdentifier` at all), EAS internal distribution, push credentials. Store listings, privacy manifests and the external-purchase entitlement wait for the launch decision.

**Not now:** in-app purchase, teacher surfaces, TV pairing revalidation, offline mode.

---

## 7. How this gets verified

The compiler stays green throughout and will tell you nothing. Verify against a seeded API with a runtime smoke matrix, minimum:

- **guardian with two children** — switch child; confirm course detail, homework and progress all change, and none of it bleeds across siblings
- **guardian with one self-paced child** — confirm homework checkpoints appear (blocked on §5.2)
- **student signing in directly** — confirm the header is ignored and they still resolve to themselves
- **guardian attempting a child they are not linked to** — confirm 403, not blank
- **a course with a free-preview item, not owned** — confirm the lock reads as a lock, and the unlock button reaches Stripe
- **full purchase round-trip** — checkout in the browser, background the app, resume, confirm the poll flips the course to owned
- **new guardian, cold install** — register → profile → add child → browse → unlock, with no web visit at any step
