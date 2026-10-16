# MCR3U course — setup

The MCR3U Functions course lives at **https://mathtest.logicmanse.ca/MCR3U/** (the file `MCR3U/index.html`).
It uses the same Firebase project, Google sign-in and `allowedUsers` allowlist as the MPT, MHF4U, SCH4U and LMCA apps.

## Where progress is saved (cloud, available on any device)

Progress is saved in Firestore under the student's own account and loads on any device they sign in with.
The small chip under the header shows the status: **☁️ Synced**, **Saving…**, or **⚠️ This device only**.

- **Preferred:** a dedicated record, `mcr3u/{uid}` — the rule for this is live, so this is what active students use.
- **Automatic fallback:** if the dedicated write is ever rejected (e.g. a legacy invited account with no enrollment
  document), progress goes into an `mcr3u` field inside the student's existing `users/{uid}` record instead. Every
  course's app (MPT, MHF4U, SCH4U, MCR3U) nests its own fallback progress under its own field name and writes with
  `mergeFields`, so no course's fallback write can ever erase another course's field on the same shared document.
- Once the dedicated collection is reachable again, the next sign-in merges any fallback progress into `mcr3u/{uid}`
  automatically. Nothing is lost.

The Admin tab in MCR3U shows which mode your own account is using.

## Firebase rules

The repo's [`firestore.rules`](firestore.rules) now includes a `match /mcr3u/{uid}` block alongside the existing
`mpt`, `mhf4u`, `lmca` and `sch4u` ones, gated the same way through `hasCourseAccess('MCR3U')`. This file has **not**
been deployed automatically — deploy it yourself with `firebase deploy --only firestore:rules` after reviewing it
(or paste it into the Firebase console's Rules tab) so the dedicated `mcr3u/{uid}` record actually works. Until then,
MCR3U progress for allowlisted students still saves correctly through the automatic fallback above.

Public self-enrollment remains disabled in the app until the candidate rules are deployed and course settings are
intentionally opened. A course can be opened for free self-enrollment by an admin-created
`courseSettings/{courseId}` document with `selfEnrollmentOpen: true` and `priceCents: 0`; no course settings means
enrollment stays closed.

The root page is a public course catalogue. Signed-in students see their own progress (lessons done, or questions
practiced) on every course card they have access to — see "Root catalogue / library feature" below.

## Assigning a Grade 11 student

1. Sign in (MPT, MHF4U, SCH4U or MCR3U) and open **Admin**.
2. Enter the student's Google sign-in email and name, choose **Grade 11 · MCR3U**, and click **Add**.
   For someone already on the list, use the course dropdown next to their email to reassign them to MCR3U.
3. Share the course URL directly: `https://mathtest.logicmanse.ca/MCR3U/`. The root URL is now a course catalogue;
   MHF4U lives at `https://mathtest.logicmanse.ca/MHF4U/`, SCH4U at `/SCH4U/`, and MPT prep at `/MPT/`.

Student names and emails live only in the private Firestore allowlist, never in this public repo.

## Content and accuracy

All MCR3U content is in the `MCR3U` object inside `MCR3U/index.html`:

- 4 units and 32 lessons, covering the Ontario MCR3U (Grade 11 Functions, University Preparation) curriculum's four
  strands: characteristics of functions (notation, transformations, inverses, quadratics, radicals and rational
  expressions); exponential functions (exponent laws, properties, equations, growth/decay and compound interest);
  discrete functions (arithmetic and geometric sequences, series, Pascal's triangle, and financial applications —
  annuities and loans); and trigonometric functions (primary and reciprocal ratios, identities, the sine law
  including the ambiguous case, the cosine law, bearings, and sinusoidal graphing and modelling).
- 120 practice questions (30 per unit — 10 Knowledge, 10 Application, 7 Thinking, 3 Communication): multiple choice,
  typed numeric answers checked with a tolerance, and written Communication items that students self-mark against a
  model answer.
- 12 worked examples, a 46-entry formula sheet, a 35-term glossary and an 8-week plan.
- One built-in interactive tool (Tools tab): a sign-chart grapher for polynomial/rational inequalities, directly
  supporting Unit 1.

**MCR3U works entirely in degrees.** Unlike MHF4U (next year's course), it does **not** cover radian measure,
compound-angle or double-angle identities, or logarithms. It **does** cover the sine law (including the ambiguous
case), the cosine law, and financial applications (annuities, compound interest) that MHF4U does not revisit in the
same depth. Because of this real scope difference, three interactive tools present in MHF4U/SCH4U — the unit circle
(radian-based), the sinusoid grapher (built on radian measure internally), the rational-function asymptote grapher,
and the exponential/logarithm grapher — were deliberately **not** carried over to MCR3U rather than shipped with
wrong units or out-of-scope content; the sinusoidal-modelling lessons and questions use fully worked degree-based
examples instead. The exam simulation draws 5 (full) or 3 (mini) questions per unit, giving 20- and 12-question
simulations respectively (scaled automatically from the 4-unit course, the same way MHF4U's 25/15 questions scale
from its 5 units).

Every numeric answer was derived and checked by computation (not estimated), including every compound-interest,
annuity, sine-law/cosine-law, and sinusoidal-modelling value. The Study Hub's external resources link to the real
Ontario curriculum PDF (the same 2007 document that covers MHF4U) and to three CEMC (University of Waterloo)
courseware strands — Introduction to Functions, Sequences/Series/Financial Literacy, and Exponential & Trigonometric
Functions — which map closely to this course's units; these are general Grade 9–11 courseware pages, not a
dedicated MCR3U-branded course, and are described that way rather than overstated.

## Root catalogue / library feature

The root `index.html` is a student-facing course catalogue. Every available course card carries a `data-coll`
attribute (and `data-lessons` for the lesson-based courses) and, once a student signs in with the same Google
account used in the course apps, a small module script reads `<coll>/{uid}` for every course and shows a progress
line directly on that course's card — lessons done (for MHF4U/SCH4U/MCR3U) or questions practiced (for MPT/LMCA).
A course the student isn't enrolled in simply shows no progress line (Firestore returns permission-denied, handled
the same as "no data yet") — nothing in the UI reveals which courses exist for other students. This page only reads
from Firestore; it never writes.

## Adding courses

Each course has its own URL and app folder (for example, `/MPT/`, `/MHF4U/`, `/SCH4U/` and `/MCR3U/`). To add a
course, create a new folder with its own `index.html`, course content and progress collection, then add an available
course card to the root `index.html` (including its `data-coll` attribute, and `data-lessons` if it has a lesson
concept, so the library feature picks it up automatically). Before inviting students into multiple courses, update
the allowlist from the current single `course` field to a `courses` array and enforce each course's entitlement in
Firestore rules. A URL by itself is navigation, not access control.

When copying an existing course file as the starting point for a new one, every persistence reference must use the
new course's own `const COLL = "<newcourseid>"` (set once, near `COURSE_ID`) — never a hardcoded collection-name
string literal anywhere in `writeCloud`/`persist`/`loadCloud`/`mergeInto`. All live courses (MPT, MHF4U, SCH4U,
MCR3U) follow this rule: the primary write/read targets `<COLL>/{uid}`, and the legacy fallback nests under
`users/{uid}.<COLL>` via `{ [COLL]: payload }` with `mergeFields: ["email", COLL]`. A copy-paste that leaves a
hardcoded literal from the source course causes real data collisions on the shared `users/{uid}` fallback document —
this already happened once (SCH4U briefly inherited MHF4U's literal) and was the reason this convention was written
down. MCR3U/index.html was checked line by line for this before being added.

## URLs

GitHub Pages paths are case-sensitive. `404.html` sends `/mcr3u`, `/Mcr3u` and similar variants to `/MCR3U/`.
