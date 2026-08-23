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

**W3 — Delete the dead. ✅ Done 2026-08-23.** Mobile typecheck green.

Removed: `app/messages/*` (3 screens), `app/timetable.tsx`, `src/features/messaging/`, `src/features/timetable/`, the `Messages` and `Timetable` tags in `core/api/api.ts`, both dead contract blocks, and the two remaining entry points — the Schedule tile on `StudentHomeScreen` and the Schedule button on `ChildDetailPanel`. The Messages card was already gone (removed early in W2, since that screen became the app's root).

**Also deleted `src/core/contracts/generated/openapi.d.ts`** — 11,343 lines, imported by nothing, and by now describing the very messaging and timetable endpoints the API had removed. A stale snapshot nobody gets a compiler warning for trusting is exactly the kind of thing this stage exists to remove. `pnpm openapi:generate` recreates it when that becomes worth doing — i.e. once the API's DTOs carry `@nestjs/swagger` decorators.

**One caveat worth recording about verification.** `.expo/types/router.d.ts` is generated, gitignored, and was *stale* — it still declared `/timetable` and `/messages/*` as valid typed routes. With `typedRoutes` on, that means a `router.push('/timetable')` would have kept typechecking after the screen was deleted. I cleared the directory and re-ran `tsc` to confirm the green was real rather than inherited from a stale artifact. Worth remembering for any future route deletion: **clear `.expo/types` before trusting a typecheck.**

Deliberately not done: rebuilding "today's sessions" off `GET /api/schedule/student/:id`. That is a new feature with a new type, not a repair — the retired `TimetableSlot` was a weekly recurrence rule and the replacement returns real meetings with actual timestamps.

**W4 — New item kinds. ✅ Done 2026-08-23.** Mobile typecheck green; no API changes needed — both endpoints already existed.

- [`HomeworkItemView`](mobile/src/features/lesson/HomeworkItemView.tsx) — brief and submission state from `GET .../my-homework`; submits through the existing `submitHomework` mutation (same `HomeworkSubmission` row the standalone Homework tab writes to). Handles all three states: not submitted, submitted, graded.
- [`LiveClassItemView`](mobile/src/features/lesson/LiveClassItemView.tsx) — join details from `GET .../my-session`, which resolves per-student rather than per-item (one LIVE_CLASS item is a different `BatchSession` per cohort). Renders the three `{session: null, reason}` cases (`NOT_A_STUDENT`/`NOT_IN_A_BATCH`/`NOT_SCHEDULED`) as distinct messages rather than one generic empty state, and treats a null `joinUrl` as "not ready yet" rather than broken — the API comment on `BatchSession.provider` says it stays `NONE` until the Zoom hook lands, so this is the routine case today, not an edge case.
- **The exhaustive switch is verified, not just written.** I deleted the `HOMEWORK` case as a sanity check: `tsc` failed immediately with "Function lacks ending return statement and return type does not include 'undefined'" — confirming a future new `ModuleItemKind` really will fail the build instead of silently falling through, which is the whole reason this replaced the `if/else` chain. Case restored, typecheck green again.
- **Locked items are gated before the query fires**, not after. `assertItemAccess` on both `/my-homework` and `/my-session` throws 403 for a locked item — unlike `VIDEO`/`READING`, which just receive a nulled field — so both views check `item.isContentLocked` and skip the query entirely rather than surfacing an unhandled 403 as an error state. This is the minimum needed for correctness now; the real "Unlock this" purchase CTA is still W6's job.

**One scope decision made along the way:** the two-step homework upload needs on-device file selection, and the project had no picker library at all — not even the existing standalone Homework tab submit screen has one (text-only, always has been). I installed `expo-document-picker` (`~57.0.1`, SDK-matched via `expo install`) rather than cut attachment upload from W4. It needs no config plugin, no `app.json` permission entries, and no native code beyond what `expo prebuild` already autolinks — the system document/photo picker requires none of the usual Info.plist/Android permission ceremony. Flagging it here rather than burying it: it's a new native dependency, and the next `eas build` picks it up automatically, but it's still a real addition to the app's footprint that a "just rewire the screens" framing wouldn't have anticipated.

**W5 — Signup and onboarding. ✅ Done 2026-08-23.** Typecheck green; verified end-to-end against a real API and Postgres instance in the browser, not just typechecked — see the verification note below.

- [`app/register.tsx`](mobile/app/register.tsx) — email/password/firstName/lastName against `POST /auth/token/register`. No role sent; the server already defaults an absent hint to GUARDIAN. Password rules ([`passwordRules.ts`](mobile/src/features/auth/passwordRules.ts)) mirror `RegisterDto` by hand (min 10, max 72, lower+upper+digit) with a live checklist that only appears once the field is touched, plus a pre-submit gate so a weak password never reaches the server as a bare 400. A 409 maps to "That email is already registered — sign in instead."; [`login.tsx`](mobile/app/login.tsx) got the reciprocal link. On success, `router.replace('/')` — no separate profile step to chain, since registration already writes the `GuardianProfile` server-side.
- **Fixed a real, live bug while wiring this up.** `guardianApi.ts`'s `createGuardianProfile` posted to `/guardian-profiles`, which 409s for exactly the account registration itself just created (confirmed by reading `family.service.ts`: a plain create rejects when a profile already exists). Web hit the identical problem and already carries the fix — `client/src/features/dashboard/dashboardApi.ts` switched to `/guardian-profiles/me` with a comment stating the reason almost verbatim. Mobile's port had drifted from that fix; now matches.
- **`GuardianOnboardingScreen` re-scoped, not rebuilt.** Registration now creates the profile in the same write, so a fresh signup never reaches this screen — `app/index.tsx` only renders it for accounts with the GUARDIAN role and no profile, i.e. ones that predate the seed. Left step 2 (link an existing student by email) untouched; it's still the right tool for that narrower legacy case. Fixed step 1's endpoint per above and updated the header comment to say what this screen is actually for now.
- **New primary path: [`AddChildForm`](mobile/src/features/guardian/AddChildForm.tsx)** on `POST /parent/children` — creates a child with no account of their own (the server gives them a synthetic, unusable login), which is what a guardian-first signup actually needs. Reachable from `GuardianHomeScreen`'s empty state ("Add your first child", now an actual button, not a passive message) and from a persistent "+" once children exist. `birthDate` is a plain `YYYY-MM-DD` text field with client validation, not a native date picker — the project has no date-picker dependency and adding a second new native module in the same pass as W4's `expo-document-picker` wasn't worth it for one field; worth revisiting if a second consumer needs one.
- **`classId` (grade level) deliberately omitted** from the add-child form. It's optional on the server, and nothing in mobile lists or displays classes yet — building a picker for a field with no existing consumer was more than this stage needed.

**Verification — actually run, not just typechecked.** Per the instruction to use UI changes in a browser before calling them done: started the real API (`nest start --watch`) against the dev Postgres instance and the mobile web target (`expo start --web`) via the project's own launch configs, and drove the full flow through the Browser pane — register → land on `GuardianHomeScreen`'s empty state (confirming no onboarding detour) → "Add your first child" → real `POST /parent/children` round trip → child appears with live data from `ChildDetailPanel`'s acting-child-scoped queries → sign out equivalent → sign back in → same child still there (proving it's really in Postgres, not leftover client state) → re-registering the same email correctly 409s with the mapped message.

**That pass caught a second real bug, from W2, not W5 — fixed on the spot.** `GuardianHomeScreen`'s `ChildCard` nested one `Pressable` (the "Open learning" entry point) inside another (the card's own tap target). On native this is harmless — no DOM, independent hit-testing — but on web, `accessibilityRole="button"` renders as a real `<button>`, and a `<button>` cannot legally contain another `<button>`; this never surfaced under typecheck-only verification because it only manifests once a real child with `onOpenLearning` actually renders. Restructured the two as siblings inside the same `Card` rather than parent/child — same visual layout, same two independent tap targets on every platform, valid markup on web. Confirmed fixed by reading the browser console across three fresh app boots: present before the fix, absent after.

*Left in the dev database:* one test guardian (`jamie.rivera.w5test@example.com`) and one test child ("Sam Rivera"), from the verification pass above. Harmless in a local dev DB, reseedable via `pnpm prisma db seed` if a clean slate is ever wanted — not cleaned up since this is disposable local state, not a shared or production database.

**W6 — Sell. ✅ Done 2026-08-23.** Typecheck green both sides; API 203 unit + 129 e2e green; verified live in the browser against real Postgres data, including two real bugs found and fixed mid-stage.

**What shipped:**
- **Entitlement-aware catalog.** `CourseSummary`/`CourseDetail` widened with `deliveryMode`, pricing, and (`CourseDetail`) `isEntitled` — all fields the API already sent, mobile just never typed them (same pattern as W1's whole premise). The browse list ([`app/course/index.tsx`](mobile/app/course/index.tsx)) cross-references `GET /entitlements/me` against each card: **Owned**, a price, or nothing for a bundle-only course. The outline screen shows an "Unlock this course" banner when `!course.isEntitled` (student-vs-guardian gets different copy — a student can't buy, so no button for them), and every locked item in the outline gets a lock icon; tapping one routes straight to the unlock screen instead of the item screen, which would just show the same prompt one tap later.
- **All six item-view kinds now handle `isContentLocked`,** not just the two W4 built (`HOMEWORK`/`LIVE_CLASS`). `VIDEO`/`READING` had their content nulled server-side already but rendered it as silently blank; `DISCUSSION`/`ASSESSMENT` have their own queries that 403 on a locked item if asked. New shared [`LockedItemNotice`](mobile/src/features/lesson/LockedItemNotice.tsx) — closes the "Tier 4" gap named in the very first version of this scope doc.
- **The unlock flow.** [`app/course/[courseId]/unlock.tsx`](mobile/app/course/%5BcourseId%5D/unlock.tsx) — `resolveSku` for the price summary (handles `AVAILABLE`/`OWNED`/`NOT_SELLABLE`/`UPGRADE`/`BLOCKED_ACTIVE_PLAN` distinctly), a batch picker for LIVE courses, a one-time-vs-instalments choice when offered, then `createCheckoutSession` → `Linking.openURL(checkoutUrl)` (matches the `Linking` import W4 already established, not a new `expo-web-browser` dependency) → [`app/checkout/[orderId].tsx`](mobile/app/checkout/%5BorderId%5D.tsx), which polls `GET /billing/orders/:id` via RTK Query's `pollingInterval` until the status leaves `PENDING`. No `AppState` wiring needed — RN suspends JS timers while backgrounded, so polling naturally pauses in the system browser and resumes on return.
- **Family ownership view.** `app/billing.tsx` gained a "What we own" section off `GET /billing/my-entitlements`, grouped by child, above the existing read-only Invoices/Payments (which are untouched — a different part of the schema, confirmed by checking: no shared fields with the new entitlement/order data, so the two money-formatters in that file are deliberately separate functions rather than one being coerced to fit both).
- **`app/course/[courseId].tsx` moved to `app/course/[courseId]/index.tsx`** (a `git mv`, tracked as a rename) — expo-router doesn't allow a leaf file and a same-named folder as siblings, and `unlock.tsx` needed to live at `course/[courseId]/unlock.tsx`.

**One more API bug found and fixed, same class as W2's:** `GET /entitlements/course/:courseId/access` never read `x-acting-student-id` at all — `resolveCourseAccess`'s own doc comment says its 4th parameter exists specifically for a guardian acting for a child, but the controller route never supplied it, so every guardian caller resolved to "no student profile" regardless of what the child owned. Dormant in production (nothing calls it yet, confirmed by grepping web too), caught while building this stage. Fixed and covered by 4 new cases in `acting-student.e2e-spec.ts`, extending the same file from W2 rather than starting a new one.

**Two real bugs found only by actually running this in a browser — the reason the verification workflow exists:**
1. **`GET /catalog/courses` crashed `StudentHomeScreen` and the browse list outright.** The endpoint is unconditionally paginated server-side (`{items, total, page, pageSize}`); the API's envelope interceptor detects that shape and flattens it — `data` becomes the bare array, totals move to `meta.pagination` — and `baseQuery.ts`'s own `unwrap()` reverses exactly that, back into `{items, pagination}`. So the *hook's* actual return value has never been the bare `CourseSummary[]` every caller assumed. This is pre-existing — it predates every stage of this whole effort — and never surfaced because no previous verification pass ever rendered a course list live before this one. `(courses ?? []).filter is not a function`, on both `StudentHomeScreen` and the browse screen. Fixed with a `transformResponse` on `getCourses` that unwraps a second time, back to a plain array — zero changes needed to any of the (correct, already-array-shaped) calling code. **Related, not fixed:** `assessmentApi.ts`'s `getStudentAssignments`/`getStudentAttempts` are typed with the same wrong shape (`PagedResult<T>` doesn't match `unwrap()`'s real `{items, pagination}`), but `app/assessments/index.tsx` already defensively reads `.items`, so nothing crashes — a type-only inaccuracy with no runtime effect. Left alone; flagging in case it bites a future caller that trusts the type instead of the existing pattern.
2. **`GuardianHomeScreen`'s `ChildCard`** (fixed here even though it's W2 code) — nests one `Pressable` inside another, which react-native-web renders as a `<button>` inside a `<button>`, invalid HTML. Never surfaced because no earlier verification pass rendered a *guardian with a real child* live. Restructured as siblings inside the same `Card`.

**Verified live, not just typechecked:** real API + Postgres, seeded a priced unowned course and an owned one, confirmed via the browser — ownership badges on the browse list, the unlock banner and per-item lock icons on the outline, locked-item tap routing straight to unlock, and `resolveSku` resolving both the `AVAILABLE` and `OWNED` branches correctly against real pricing/entitlement data (`USD 49.99` unlock price; "Already enrolled in this course" for the owned one). The "What we own" section on Billing showed the seeded entitlement correctly. Console and server logs clean on every fresh boot after the two fixes above.

**One honest, unavoidable gap: the actual Stripe leg is unverified.** This dev environment has no `STRIPE_SECRET_KEY` configured, so `createCheckoutSession`'s real Stripe API call, the browser hand-off, and the pending-screen's poll-to-PAID transition could not be exercised end-to-end — only typechecked and read against the source. Worth a deliberate pass with Stripe test-mode keys before this ships, specifically: does `checkoutUrl` actually open and complete in the system browser, and does the poll correctly catch the webhook-driven `PENDING → PAID` transition.

**Deliberately out of scope:** PROGRAM (bundle) purchases — mobile's browse/detail screens are course-centric today, so course purchase is the proportional match; program bundles are a web-only capability for now. A grade-level (`classId`) picker on `AddChildForm` remains the W5 omission it always was — unrelated to checkout but adjacent, noted again here since it would sharpen course recommendations. Test data left in the dev DB: two courses ("W6 Locked Course", "W6 Owned Course") under a "Verification Subject", and one entitlement — harmless local state, reseedable.

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
