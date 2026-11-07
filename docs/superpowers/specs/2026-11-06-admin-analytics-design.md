# Admin analytics: student progress and section usage

Date: 2026-11-06 · Status: design approved in chat, written spec awaiting review

## Goal

Give course administrators charts and tables to see how students are doing and which parts of each course they
use, so they can follow up with students and decide what content to improve. Applies to all five courses
(MPT, MHF4U, MCR3U, SCH4U, LMCA).

## Decisions already made

- Admins see **named, per-student** detail plus class totals (chosen over class-totals-only and GA-only).
- Google Analytics stays **aggregate and non-identifying**, per `AGENTS.md` and `privacy.html`. Student progress is
  never sent to GA.
- Student progress is shown from **Firestore**, because GA cannot show per-student data and a static site cannot
  pull GA reports without a server.

## Components

### 1. Firestore rules: read-only admin access

`firestore.rules`: in each of `mpt`, `mhf4u`, `lmca`, `sch4u`, `mcr3u` add `allow read: if isAdmin();` alongside
the existing owner rule. No admin write access. Students still cannot read each other's records. Names and emails
come from `profiles`, which admins can already list.

The rules file is not deployed automatically. The owner runs `firebase deploy --only firestore:rules`. Until then
the Analytics tab shows a clear "rules not deployed yet" message when Firestore returns `permission-denied`.

Note for the owner: after deployment every admin in `allowedUsers` can read every course's progress, not only
their own course's.

### 2. Shared module `/admin-analytics.js`

One file loaded by all five courses (same pattern as `/clinic.js`). Exposes `render(container, {db, fns, courseId,
coll, units, profilesById})`. No dependencies; charts are inline SVG using the existing `--teal`, `--coral`,
`--gold`, `--sage` tokens and the same look as the Progress trend chart. Light and dark safe, keyboard-reachable
table, no colour-only meaning (labels and values printed).

Reads `getDocs(collection(db, coll))` for the selected course and `profiles` for names. Each progress document
already holds `attempts` (last 200), `lessons`, `cards`, `reviews`, `recalled`, `missed`, `clinic`, `mlog`, and
(new, below) `usage`. All aggregation happens in the browser; nothing is written.

Views (course switcher at top):

- **Class overview:** active students (7 and 30 days), average score of the latest 5 sessions, sessions per week
  (line, last 12 weeks), score distribution (histogram in the Ontario level bands), unit accuracy (bars, class
  average per unit), most-missed questions (top 10 by miss count, from `missed` and `mlog`).
- **Feature use:** share of activity across Quiz, Exam simulation, Review (flashcards), Study Hub lessons, Guided
  problems, Challenge, Mistake Clinic, from `usage` counters plus attempts and card reviews. Weekly stacked bars.
- **Student roster:** sortable table (name, sessions, recent average, trend arrow, weakest unit, lessons done,
  cards reviewed, last active) with filter and an "inactive 7+ days" highlight.
- **Student detail:** selecting a row shows that student's score trend (same chart as Progress), unit accuracy
  bars, recent sessions and their most-missed questions.

Edge cases: empty course (friendly empty state), students with no sessions, documents missing newer fields (treat
as zero), more than 500 documents (page through, show a count), and `permission-denied`.

### 3. Recording which sections students use

Each course's `go(view)` increments a small counter on the student's own record:
`store.usage = { "<ISO week>": { home:n, quiz:n, mock:n, progress:n, study:n, cheat:n, cards:n, notes:n, clinic:n } }`.
Counts only; no timestamps beyond the week key, no content. Kept to the latest 16 weeks. Included in `payload()`
and `mergeInto()` (take the larger count per key) like the other progress fields. Study sub-features (guided,
models, challenge starts) increment `usage.<week>.guided|model|challenge` where they start.

### 4. Google Analytics (aggregate only)

`analytics.js`: register `SCH4U` and `MCR3U` in `pages` (currently missing). Add to the events allow-list:
`section_opened` (parameter `section_name` from a fixed list), `challenge_started`, `review_started`,
`guided_completed`. Existing guards stay: consent required, no admin traffic (`!adminMode`), fixed course and page
labels, no student data in any parameter or URL.

### 5. Admin tab wiring

Each course's `renderAdmin()` gets a "📊 Analytics" card that dynamically imports and renders the module below the
existing user and enrollment panels, only when `adminMode`. A load failure leaves the rest of Admin working.

### 6. Privacy and docs

- `privacy.html`: state that course administrators can view each student's saved progress and activity counts, and
  that this is separate from Google Analytics. Update the "Updated" date.
- `docs/PRODUCT-DESIGN-NOTES.md` and a new `docs/ADMIN-ANALYTICS.md` (what each chart means, rule deployment steps,
  GA event list, how to extend).
- Course setup docs get a short pointer.

## Testing

- Synthetic data generator in a scratch script produces 25 students with varied sessions, units, trends and
  usage. The module is run in a local preview with that data injected through the same `getDocs` interface.
- Verify every chart and the roster sort and filter, the student detail panel, empty and permission-denied states,
  desktop and phone width (375 px, no horizontal scroll), and that aggregation numbers match a hand calculation on a
  small fixture.
- Content audit still passes. Existing course behaviour unchanged for non-admin students (usage counter is the only
  change they can observe, and only in their own saved record).
- **Not testable here:** the real Firestore rules and the live GA reports. The rules change is reviewed by reading
  and by the owner after deployment.

## Out of scope

- Server-side reports, scheduled emails, exporting to CSV, per-question time spent, anything that would put
  student identifiers into Google Analytics, and restricting each admin to a single course (all admins already
  share one access list).
- Making student progress readable by anyone other than admins.

## Rollout

Ship the code to `main` (it is inert for students). Owner deploys the rules, then opens Admin → Analytics.
