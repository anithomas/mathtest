# SCH4U course — setup

The SCH4U Chemistry course lives at **https://mathtest.logicmanse.ca/SCH4U/** (the file `SCH4U/index.html`).
It uses the same Firebase project, Google sign-in and `allowedUsers` allowlist as the MPT and MHF4U apps.

## Where progress is saved (cloud, available on any device)

Progress is saved in Firestore under the student's own account and loads on any device they sign in with.
The small chip under the header shows the status: **☁️ Synced**, **Saving…**, or **⚠️ This device only**.

- **Preferred:** a dedicated record, `sch4u/{uid}`.
- **Automatic fallback:** until the rule below is added, progress goes into a `sch4u` field inside the student's
  existing `users/{uid}` record. Every allowlisted user can already write there. The MPT app saves that record with
  `mergeFields`, so it never erases the SCH4U field.
- Once the dedicated rule is published, the next sign-in merges any fallback progress into `sch4u/{uid}`
  automatically. Nothing is lost.

The Admin tab in SCH4U shows which mode your own account is using.

## Firebase rules

The repo's [`firestore.rules`](firestore.rules) now includes a `match /sch4u/{uid}` block alongside the existing
`mpt` and `mhf4u` ones, gated the same way through `hasCourseAccess('SCH4U')`. This file has **not** been deployed
automatically — deploy it yourself with `firebase deploy --only firestore:rules` after reviewing it (or paste it into
the Firebase console's Rules tab) so the dedicated `sch4u/{uid}` record actually works. Until then, SCH4U progress
for allowlisted students still saves correctly through the automatic fallback above.

Public self-enrollment remains disabled in the app until the candidate rules are deployed and course settings are
intentionally opened. A course can be opened for free self-enrollment by an admin-created
`courseSettings/{courseId}` document with `selfEnrollmentOpen: true` and `priceCents: 0`; no course settings means
enrollment stays closed.

The root page is a public course catalogue. Course sign-in and content access continue to use the existing Firebase
setup.

## Assigning a Grade 12 student

1. Sign in (MPT, MHF4U or SCH4U) and open **Admin**.
2. Enter the student's Google sign-in email and name, choose **Grade 12 · SCH4U Chemistry**, and click **Add**.
   For someone already on the list, use the course dropdown next to their email to reassign them to SCH4U.
3. Share the course URL directly: `https://mathtest.logicmanse.ca/SCH4U/`. The root URL is now a course catalogue;
   MHF4U lives at `https://mathtest.logicmanse.ca/MHF4U/` and MPT prep at `https://mathtest.logicmanse.ca/MPT/`.

Student names and emails live only in the private Firestore allowlist, never in this public repo.

## Content and accuracy

All SCH4U content is in the `SCH4U` object inside `SCH4U/index.html`:

- 5 units and 34 lessons, covering the Ontario SCH4U (Grade 12 University Chemistry) curriculum's five strands:
  organic chemistry; structure and properties of matter; energy changes and rates of reaction; chemical systems
  and equilibrium; and electrochemistry.
- 137 practice questions: multiple choice, typed numeric answers checked with a tolerance, and written
  Communication items that students self-mark against a model answer.
- 15 worked examples, a 46-entry formula sheet, a 27-term glossary and an 8-week plan.
- Three built-in interactive tools (Tools tab): a molar mass/mole calculator with a small chemical-formula parser,
  a pH/pOH/[H⁺]/[OH⁻] converter, and an ideal gas law (PV = nRT) solver. Molecular/particle models and an
  equation-balancing visualizer are planned but not yet built.
- Faraday's law and electrolysis calculations (Unit 5) are treated as enrichment material, consistent with the
  Ontario SCH4U curriculum.

Every numeric answer was derived and checked by hand; multi-step calculations (Hess's law, ICE tables, redox
half-reaction balancing, titrations) were re-verified step by step. A handful of answers — concentrations, K_sp and
K_a/K_b values — are small enough that students enter them in scientific-notation form (for example `1.8*10^-5`);
each such question's hint spells out the expected entry format.

## Adding courses

Each course has its own URL and app folder (for example, `/MPT/`, `/MHF4U/` and `/SCH4U/`). To add a course, create a
new folder with its own `index.html`, course content and progress collection, then add an available course card to
the root `index.html`. Before inviting students into multiple courses, update the allowlist from the current single
`course` field to a `courses` array and enforce each course's entitlement in Firestore rules. A URL by itself is
navigation, not access control.

## URLs

GitHub Pages paths are case-sensitive. `404.html` sends `/sch4u`, `/Sch4u` and similar variants to `/SCH4U/`.
