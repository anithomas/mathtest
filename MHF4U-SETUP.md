# MHF4U course — setup

The MHF4U Advanced Functions course lives at **https://mathtest.logicmanse.ca/MHF4U/** (the file `MHF4U/index.html`).
It uses the same Firebase project, Google sign-in and `allowedUsers` allowlist as the MPT app.

## Where progress is saved (cloud, available on any device)

Progress is saved in Firestore under the student's own account and loads on any device they sign in with.
The small chip under the header shows the status: **☁️ Synced**, **Saving…**, or **⚠️ This device only**.

- **Preferred:** a dedicated record, `mhf4u/{uid}` — the rule for this is live, so this is what active students use.
- **Automatic fallback:** if the dedicated write is ever rejected (e.g. a legacy invited account with no enrollment
  document), progress goes into a `mhf4u` field inside the student's existing `users/{uid}` record instead. Every
  course's app (MPT, MHF4U, SCH4U) nests its own fallback progress under its own field name and writes with
  `mergeFields`, so no course's fallback write can ever erase another course's field on the same shared document.
- Once the dedicated collection is reachable again, the next sign-in merges any fallback progress into `mhf4u/{uid}`
  automatically. Nothing is lost.

The Admin tab in MHF4U shows which mode your own account is using.

## Firebase rules

The repo now contains a candidate full rules file at [`firestore.rules`](firestore.rules). It incorporates the current rules supplied by the owner, preserves legacy access during transition, and adds per-course enrollments and isolated progress paths. Review and test it in the Firebase Emulator before replacing the active rules. Do not paste the old one-rule snippet into the console; it does not enforce course-specific enrollment.

Public self-enrollment remains disabled in the app until the candidate rules are deployed and course settings are intentionally opened. A course can be opened for free self-enrollment by an admin-created `courseSettings/{courseId}` document with `selfEnrollmentOpen: true` and `priceCents: 0`; no course settings means enrollment stays closed.

The root page is a public course catalogue. Course sign-in and content access continue to use the existing Firebase setup.

## Assigning a Grade 12 student

1. Sign in (MPT or MHF4U) and open **Admin**.
2. Enter the student's Google sign-in email and name, choose **Grade 12 · MHF4U**, and click **Add**.
   For someone already on the list, click **Assign Grade 12 · MHF4U** next to their email.
3. Share the course URL directly: `https://mathtest.logicmanse.ca/MHF4U/`. The root URL is now a course catalogue;
   the MPT course lives at `https://mathtest.logicmanse.ca/MPT/`.

Student names and emails live only in the private Firestore allowlist, never in this public repo.

## Content and accuracy

All MHF4U content is in the `MHF4U` object inside `MHF4U/index.html`:

- 5 units and 38 lessons, mapped to every specific expectation (A1.1–D3.3) of the Ontario MHF4U curriculum (2007).
- 235 practice questions: multiple choice, typed numeric answers checked with a tolerance, and written
  Communication items that students self-mark against a model answer. 60 of them (ids `m101`+, 12 per unit) form the
  **🔥 Challenge tier** (`h2:1`): multi-step, A+ (90%+) level Thinking/Application items with a Challenge level in
  Quick Quiz and the profile and a separate Challenge simulation in Exam Sim. They are excluded from "Any" quizzes and the
  standard Full/Mini simulations. Every numeric answer was recomputed with an independent sympy answer key.
- **Learning loop** (shared with SCH4U): a Review tab with spaced flashcards (formulas, glossary, missed questions),
  a score-trend chart on Progress, 6 step-checked guided problems in the Study Hub (`MHF4U.GUIDED`), a clickable
  concept map at the top of each unit (`MHF4U/models.js`), and correct-answer / results animations that respect
  reduced-motion settings.
- 15 worked examples, a formula sheet, a glossary and an 8-week plan.

## Adding courses

Each course has its own URL and app folder (for example, `/MPT/` and `/MHF4U/`). To add a course, create a new
folder with its own `index.html`, course content and progress collection, then add an available course card to the
root `index.html`. Before inviting students into multiple courses, update the allowlist from the current single
`course` field to a `courses` array and enforce each course's entitlement in Firestore rules. A URL by itself is
navigation, not access control.

Every numeric answer is recomputed by script. The whole bank was also reviewed independently for correctness,
ambiguous options and curriculum scope. There is no calculus: rates of change use secant estimates only, as the
course requires.

## URLs

GitHub Pages paths are case-sensitive. `404.html` sends `/mhf4u`, `/Mhf4u` and similar variants to `/MHF4U/`.
