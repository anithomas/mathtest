# Admin analytics

Course administrators get an **📊 Analytics** card at the bottom of each course's **Admin** tab. It shows how a class
is doing and which parts of the course students use. It works the same in all five courses (MPT, MHF4U, MCR3U,
SCH4U, LMCA). Design: `docs/superpowers/specs/2026-11-06-admin-analytics-design.md`.

## One-time setup (owner)

The Analytics card reads students' saved progress, which `firestore.rules` now lets administrators read (read-only).
The rules file is not deployed automatically:

```bash
firebase deploy --only firestore:rules
```

Until it is deployed the card shows "Rules not deployed yet" and nothing else is affected. After deploying, every
administrator in `allowedUsers` can read every course's progress, not only their own course's.

## What you see

Use the **Course** menu to switch courses and **Refresh** to reload.

- **Class overview**: students with saved progress, how many were active in the last 7 and 30 days, the class
  average (each student's last 5 sessions), sessions per week for the last 12 weeks, a score distribution in
  Ontario achievement bands, accuracy by unit, the most-missed questions and the students who have not been active
  for 7 days.
- **Feature use**: how often students opened each section (Home, Quiz, Exam simulation, Progress, Study Hub,
  Cheatsheet, Review, Notes, Guided problems, Interactive models, Challenge) over the last 12 weeks, as totals and
  weekly stacked bars. Counts show visits, not time spent.
- **Students**: a sortable, filterable table (sessions, recent average, trend, weakest unit, lessons done,
  flashcard reviews, last active). Select a row for that student's score trend, accuracy by unit and most-missed
  questions.

Reading the numbers: *recent average* is the mean of the last 5 sessions; *trend* is the least-squares slope over
the last 10 sessions in percentage points per session (needs 3 or more sessions); *weakest unit* needs at least 6
answered questions in that unit. These are study aids, not grades.

## Where the data comes from

- **Progress** (`attempts`, `lessons`, `reviews`, `missed`, `mlog`): already saved to each student's own record in
  the course's collection (`mpt`, `mhf4u`, `mcr3u`, `sch4u`, `lmca`).
- **Section visits**: `usage.js` adds `usage = { "<ISO week>": { quiz: n, study: n, ... } }` to the student's own
  record. Counts only, newest 16 weeks, no timestamps or content, admins' own visits are never counted.
- **Names**: from the `profiles` collection (administrators can already list it); a student with no profile is
  shown by email, else "Unknown student".

All aggregation runs in the administrator's browser (`admin-analytics.js`, loaded only when an administrator opens
Admin). Nothing is written back.

## Google Analytics (aggregate only)

Separate from the cards above. When a visitor allows analytics, the course sends only these fixed events, with
fixed parameters (`course_code`, `page_location`, `page_referrer`, `page_title` and, for `section_opened` only, a
`section_name` from a fixed list): `section_opened`, `challenge_started`, `review_started`, `guided_completed`, plus
the existing `study_hub_opened`, `desmos_opened` and `practice_started`. Admin visits are excluded. No names, emails,
answers or scores are ever sent. View these in your GA4 property; they are not shown in the Admin tab.

## Extending

- A new section to count: add its view id to `SECTIONS` in `usage.js`, to `SECTION_LABELS` in `admin-analytics.js`
  and to the `sections` list in `analytics.js`. A test fails if the labels fall out of step.
- Run `node scripts/test-admin-analytics.mjs` (unit and wiring tests) and open
  `scripts/admin-analytics-preview.html` from a local web server to see the panel with 25 synthetic students and
  forced error, empty and permission-denied states.

## Limits

- The panel makes one read per course collection (no paging), so a very large course loads all of its student
  records at once.
- Section counts are visits, so they say what students open, not how long they stay or whether it helped.
- Real Firestore rules and live Google Analytics reports could not be tested from the development environment:
  after deploying the rules, open Admin > Analytics as an administrator and confirm the numbers look right.
