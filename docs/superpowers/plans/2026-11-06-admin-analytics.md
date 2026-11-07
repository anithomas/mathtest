# Admin Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only Analytics tab in all five courses showing class and per-student progress and section usage as charts and tables, plus aggregate-only Google Analytics events.

**Architecture:** A tiny always-loaded `/usage.js` records per-week section visit counters on each student's own progress record. A shared admin-only `/admin-analytics.js` (pure `aggregate()` plus an SVG/DOM `render()`) reads each course's collection from Firestore, which `firestore.rules` opens read-only to admins. Each course's `renderAdmin()` mounts it.

**Tech Stack:** Static HTML/vanilla JS, inline SVG, Firebase Firestore (already loaded by each page), Node `assert` for tests (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-11-06-admin-analytics-design.md`

## Global Constraints

- No new dependencies or services; plain SVG charts using existing CSS tokens `--teal --coral --gold --sage --line --card --ink-soft`.
- Student names, emails, answers and scores are never sent to Google Analytics; GA events use only the fixed allow-list in Task 7.
- Admin access is read-only: no `write` rule for admins on progress collections.
- Counters store counts only, keyed by ISO week; keep the latest 16 weeks; no timestamps or content.
- Collections: MPT `mpt`, MHF4U `mhf4u`, MCR3U `mcr3u`, SCH4U `sch4u`, LMCA `lmca`.
- Shared files are plain browser scripts that also export for Node (`module.exports` guard) so tests can load them.
- All user-supplied text (names, emails, question text) is HTML-escaped before rendering.
- Do not claim data is anonymous. Do not change student-visible behaviour except the saved `usage` field.

## Review Focus

- A progress document missing newer fields (`usage`, `attempts`, `strands`, `mlog`): zeros and empty states, never an exception.
- A student with no `profiles` entry: shown by email or `"Unknown student"`, never `undefined`.
- Names/emails/question text containing `<script>` or `&`: rendered as text.
- Firestore `permission-denied` (rules not deployed) versus any other error: separate, clear messages; non-admins never see the tab.
- Large classes (over 500 documents) and future or zero timestamps: counts stay correct and nothing renders as `NaN` or `Invalid Date`.

---

### Task 1: Usage counter module

**Files:**
- Create: `usage.js`
- Create: `scripts/test-admin-analytics.mjs` (test harness, extended by later tasks)

**Interfaces:**
- Produces (global `LMUsage`, also `module.exports`):
  - `SECTIONS: string[]` = `["home","quiz","mock","progress","study","cheat","cards","notes","clinic","guided","model","challenge"]`
  - `weekKey(when?: number | Date): string` returns ISO week like `"2026-W45"`
  - `bump(store: object, section: string, now?: number): void` increments `store.usage[week][section]`, ignores unknown sections, keeps newest 16 weeks
  - `merge(a?: object, b?: object): object` per week and section takes the larger count

- [ ] **Step 1: Write failing tests** in `scripts/test-admin-analytics.mjs` using `node:assert/strict` and `createRequire` to load `../usage.js`. Tests: `weekKey(Date.UTC(2026,10,6)) === "2026-W45"`; `weekKey(Date.UTC(2026,0,1)) === "2026-W01"` (and one year-boundary date where ISO week belongs to the previous year); `bump` twice gives count 2; unknown section ignored; 20 distinct weeks prune to 16 keeping newest; `merge({w:{quiz:3}},{w:{quiz:5,home:1}})` equals `{w:{quiz:5,home:1}}`; `merge(undefined, undefined)` equals `{}`.
- [ ] **Step 2: Run** `node scripts/test-admin-analytics.mjs` and confirm it fails (module missing).
- [ ] **Step 3: Implement** `usage.js` as an IIFE attaching `LMUsage` to `globalThis`/`window` with the `module.exports` guard; ISO week via the Thursday rule in UTC.
- [ ] **Step 4: Run** the test file and confirm all pass.
- [ ] **Step 5: Commit** `usage.js` and the test file with message `Usage counters: weekly section visit counts`.

### Task 2: Student-side wiring in MHF4U, MCR3U and SCH4U

**Files:**
- Modify: `MHF4U/index.html`, `MCR3U/index.html`, `SCH4U/index.html`
- Create: `scripts/wire-usage.py` (one-off patch script run for the three files, asserting each anchor count)

**Interfaces:**
- Consumes: `LMUsage.bump`, `LMUsage.merge` from Task 1.
- Produces: `store.usage` persisted by `payload()` and merged by `mergeInto(d)`.

- [ ] **Step 1: Add** `<script src="/usage.js"></script>` next to the existing `<script src="/clinic.js"></script>` line in each file.
- [ ] **Step 2: In `normalizeStore()`** add `store.usage = store.usage || {};`; in `payload()` add `usage: store.usage || {}`; in `mergeInto(d)` add `store.usage = LMUsage.merge(d.usage, store.usage);` after the existing merge lines (capture the local value before `store` is reassigned, as done for `cards`).
- [ ] **Step 3: In `go(view, opt)`** call `LMUsage.bump(store, view)` when `!adminMode` and `view` is in `LMUsage.SECTIONS`, then `persist()`; map the Review tab view id `cards` and Mistake Clinic view id `clinic` as they are named in each file. Also bump `challenge` where a quiz starts with level 5 or a Challenge simulation starts, `guided` when a guided problem is solved, and `model` when a model is mounted (`mountModels`), each guarded by `!adminMode`.
- [ ] **Step 4: Verify** with `node scripts/audit-course-content.mjs` (must print `Audit passed`) and a Node vm load of each page's inline scripts (same pattern as earlier audits) confirming no syntax error.
- [ ] **Step 5: Browser check** in a local preview of one course: navigate Quiz, Study, Review, then read `localStorage` key `sch4u-local-preview` and confirm `usage["<week>"]` has `quiz`, `study`, `cards` equal to 1. Commit with message `Record weekly section usage in student progress (MHF4U, MCR3U, SCH4U)`.

### Task 3: Student-side wiring in MPT and LMCA

**Files:**
- Modify: `MPT/index.html`, `LMCA/index.html`

**Interfaces:**
- Consumes: `LMUsage` (Task 1).
- Produces: `usage` written in the `data` object of `persist()`, merged in `loadCloud()`.

- [ ] **Step 1: Add** the `/usage.js` script tag; add `store.usage = store.usage || {};` to `normalizeStore()`.
- [ ] **Step 2: In `persist()`** add `usage: store.usage || {}` to the `data` object; in `loadCloud()` capture `const lu = store.usage;` beside `lc`/`lm` and after the existing `if (data){ store.clinic = ... }` line add `store.usage = LMUsage.merge(data && data.usage, lu);`.
- [ ] **Step 3: In `go(view)`** bump the visited view when `!adminMode`, then `persist()`; map the views these two courses actually have onto `LMUsage.SECTIONS` (unmatched views are ignored by `bump`).
- [ ] **Step 4: Verify** with `node scripts/audit-course-content.mjs`, then a local-preview check of `mpt-local-preview` and `lmca-local-preview` storage keys showing a `usage` entry. Commit `Record weekly section usage in MPT and LMCA`.

### Task 4: Aggregation functions

**Files:**
- Create: `admin-analytics.js` (aggregate section only in this task)
- Modify: `scripts/test-admin-analytics.mjs`

**Interfaces:**
- Consumes: `LMUsage.weekKey`.
- Produces (global `LMAdminAnalytics`, also `module.exports`): `aggregate(docs, profiles, opts)` where `docs: Array<{uid: string, data: object}>`, `profiles: Record<string, {email?: string, displayName?: string}>`, `opts: {now: number, order?: string[]}`; returns:
  - `students: Array<{uid, name, email, sessions, recentAvg: number|null, trend: number|null, weakest: string|null, lessonsDone, cardsReviewed, lastActive: number, unitAcc: Record<string,{c,t,p}>, series: Array<{t,pct,kind}>, topMissed: Array<{id,n}>}>`
  - `overview: {total, active7, active30, classAvg: number|null, sessionsPerWeek: Array<{week,count}>` (last 12 weeks, oldest first)`, histogram: Array<{label,count}>` (bands `<50`, `50-59`, `60-69`, `70-79`, `80-89`, `90-100` of each student's `recentAvg`)`, unitAcc: Array<{unit,p,t}>, mostMissed: Array<{id,n}>` (top 10)`, inactive: string[]` (uids with `lastActive` older than 7 days or 0)`}`
  - `features: {totals: Record<string,number>, weekly: Array<{week, counts: Record<string,number>}>}` (last 12 weeks, summed over students)

- [ ] **Step 1: Write failing tests** with a small fixture of 3 students: one full, one with `data = {}`, one with `attempts` lacking `strands`. Assert: `recentAvg` is the mean of the last 5 attempts' `pct` (e.g. pcts 50,60,70,80,90,100 gives 80); `trend` equals the least-squares slope in percentage points per session over the last 10 (null when fewer than 3 attempts); `weakest` is the unit with the lowest accuracy among units with at least 6 answered questions, else null; `active7` counts students whose latest attempt `t` is within 7 days of `opts.now`; histogram counts sum to the number of students with a `recentAvg`; `mostMissed` sums `mlog[id].n` (or 1 per `missed[id]` truthy when no `mlog`) across students and sorts descending then by id; `features.totals` sums `usage` over the last 12 weeks; the empty-fields student yields zeros/nulls and name `"Unknown student"` with no exception; a student with a future `t` counts as active and never produces negative days.
- [ ] **Step 2: Run** and confirm failure.
- [ ] **Step 3: Implement** `aggregate` in `admin-analytics.js` as pure functions (no DOM). Student `name` is `profiles[uid].displayName`, else its email, else `data.email`, else `"Unknown student"`.
- [ ] **Step 4: Run** and confirm all pass. Commit `Admin analytics: pure aggregation with tests`.

### Task 5: Analytics UI and charts

**Files:**
- Modify: `admin-analytics.js` (add `render`)
- Create: `scripts/admin-analytics-preview.html` (local-only harness that loads the module with synthetic data, not deployed linked from the site)

**Interfaces:**
- Consumes: `aggregate` (Task 4).
- Produces: `render(container: HTMLElement, ctx): Promise<void>` where `ctx = {courses: Array<{id,label,coll}>, courseId: string, fetchCourse(coll): Promise<{docs, profiles}>, describe(qid): string, now?: number}`. It must catch `permission-denied` (message: rules not deployed, with the exact command `firebase deploy --only firestore:rules`) and any other error (message plus a Retry button) and never throw.

- [ ] **Step 1: Write failing tests** for the HTML-producing helpers that do not need a DOM: `escapeHtml("<b>&\"'")` returns escaped text; `barChartSvg(items, {max})`, `lineChartSvg(points)`, `histogramSvg(bins)`, `stackedBarsSvg(weeks, keys)` each return a string containing `<svg`, include every label via `<title>` or text, and render an empty-state string (not an empty `<svg>`) when given no data.
- [ ] **Step 2: Run** and confirm failure.
- [ ] **Step 3: Implement** the SVG helpers (return strings) and `render`: course switcher; Class overview (KPI row, sessions-per-week line, score histogram, unit accuracy bars, most-missed list with `describe`); Feature use (totals bars and weekly stacked bars, each section labelled with its count, not colour alone); Student roster (sortable by column with `aria-sort`, text filter, inactive highlight with a text badge); Student detail panel (score trend, unit bars, top missed). Wire sorting/filter/selection with event listeners inside `render`. Escape every dynamic string.
- [ ] **Step 4: Run** unit tests; then open `scripts/admin-analytics-preview.html` in a local preview with a generator of 25 synthetic students and check: every section renders, sorting by each column reorders rows, selecting a student shows detail, the empty class state, a forced `permission-denied`, and a forced network error with Retry. Check desktop and 375 px width (no horizontal scroll). Capture one screenshot per view for review.
- [ ] **Step 5: Commit** `Admin analytics: charts, roster and student detail`.

### Task 6: Mount in each course's Admin page

**Files:**
- Modify: `MPT/index.html`, `MHF4U/index.html`, `MCR3U/index.html`, `SCH4U/index.html`, `LMCA/index.html`

**Interfaces:**
- Consumes: `LMAdminAnalytics.render` (Task 5), existing `cloud.fns.getDocs`, `cloud.fns.collection`, `cloud.db`, `adminMode`, `QB` (question lookup, where present).
- Produces: a card with id `ad-analytics` at the end of the Admin view.

- [ ] **Step 1: Add** `<script src="/admin-analytics.js" defer></script>` loaded only on demand: create the tag when Admin renders and `adminMode` is true.
- [ ] **Step 2: In `renderAdmin()`** after the existing panels are in the DOM append `<div class="card" id="ad-analytics"><h3>📊 Analytics</h3><div id="ad-analytics-body"></div></div>` and call `LMAdminAnalytics.render(body, ctx)` with `fetchCourse(coll)` reading `profiles` and `coll` via `getDocs`, paging with `limit(500)`/`startAfter` if those functions exist in `cloud.fns`, else a single read. Wrap in try/catch so a failure never breaks Admin. `describe(qid)` returns the question text from the course's question lookup, truncated to 90 characters, or the id.
- [ ] **Step 3: Verify** each course page still loads and the Admin tab is hidden for non-admins (`adminMode` false): inspect `#tabs [data-view=admin]` hidden state in preview; run `node scripts/audit-course-content.mjs`. Commit `Mount analytics in every course's Admin page`.

### Task 7: Google Analytics events, rules, privacy and docs

**Files:**
- Modify: `analytics.js`, `firestore.rules`, `privacy.html`, `docs/PRODUCT-DESIGN-NOTES.md`, `README.md`, the five `*-SETUP.md` files as present
- Create: `docs/ADMIN-ANALYTICS.md`
- Modify: `scripts/test-admin-analytics.mjs`

**Interfaces:**
- Produces: `analytics.js` `pages` containing `SCH4U` (`/SCH4U/`) and `MCR3U` (`/MCR3U/`); `events` allow-list containing `section_opened`, `challenge_started`, `review_started`, `guided_completed`; `lmTrackEvent(name, section?)` where `section` must be in a fixed allow-list or is dropped.

- [ ] **Step 1: Write failing tests**: (a) parse `firestore.rules` and assert each block `match /{mpt|mhf4u|lmca|sch4u|mcr3u}/{uid}` contains a read rule using `isAdmin()` and no rule that allows `write` or `update` or `delete` for `isAdmin()`; (b) load `analytics.js` in a vm with a fake `window`, consent granted and `gtag` spy, and assert `lmTrackEvent("section_opened","study")` sends `section_name: "study"`, `lmTrackEvent("section_opened","bob@x.com")` sends nothing or drops the parameter, and no event ever carries a key outside `course_code, page_location, page_referrer, page_title, section_name`.
- [ ] **Step 2: Run** and confirm failure.
- [ ] **Step 3: Implement** the `analytics.js` changes and call the events from the existing `go()`/start points in each course (skip when `adminMode`); add `allow read: if isAdmin();` to the five collection blocks in `firestore.rules`.
- [ ] **Step 4: Update** `privacy.html` (administrators can view each student's saved progress and activity counts; this is separate from Google Analytics; update the date) and write `docs/ADMIN-ANALYTICS.md` (what each chart means, how usage counters work, the deploy command, GA event list, how to extend); add short pointers in the other docs.
- [ ] **Step 5: Run** all tests and `node scripts/audit-course-content.mjs`; confirm both pass. Commit `GA events, admin read rules, privacy and docs for admin analytics`.
- [ ] **Step 6: Release:** fast-forward merge to `main` and push (per the saved preference), then confirm the live pages serve `/usage.js` and `/admin-analytics.js` with HTTP 200 and tell the owner the one remaining manual step: `firebase deploy --only firestore:rules`.

---

## Self-review

- **Spec coverage:** rules (Task 7), shared module, class/feature/roster/detail views (Tasks 4-5), usage counters in all five courses (Tasks 1-3), GA events and missing pages (Task 7), Admin wiring (Task 6), privacy and docs (Task 7), testing with synthetic data (Task 5), rollout (Task 7 step 6). No gaps.
- **Types:** `LMUsage.bump/merge/weekKey`, `aggregate(docs, profiles, opts)` and `render(container, ctx)` signatures are used consistently across tasks; `fetchCourse` returns `{docs, profiles}` in Tasks 5 and 6.
- **Proportion:** tasks give signatures, assertions and values; bodies are left to the implementer.
