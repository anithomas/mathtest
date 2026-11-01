# SCH4U course — setup

The SCH4U Chemistry course lives at **https://mathtest.logicmanse.ca/SCH4U/** (the file `SCH4U/index.html`).
It uses the same Firebase project, Google sign-in and `allowedUsers` allowlist as the MPT and MHF4U apps.

## Where progress is saved (cloud, available on any device)

Progress is saved in Firestore under the student's own account and loads on any device they sign in with.
The small chip under the header shows the status: **☁️ Synced**, **Saving…**, or **⚠️ This device only**.

- **Preferred:** a dedicated record, `sch4u/{uid}` — the rule for this is live, so this is what active students use.
- **Automatic fallback:** if the dedicated write is ever rejected (e.g. a legacy invited account with no enrollment
  document), progress goes into a `sch4u` field inside the student's existing `users/{uid}` record instead. Every
  course's app (MPT, MHF4U, SCH4U) nests its own fallback progress under its own field name and writes with
  `mergeFields`, so no course's fallback write can ever erase another course's field on the same shared document.
- Once the dedicated collection is reachable again, the next sign-in merges any fallback progress into `sch4u/{uid}`
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
- 252 practice questions: multiple choice, typed numeric answers checked with a tolerance, and written
  Communication items that students self-mark against a model answer. 68 of them (`h2:1`, ids `c101`+ and
  `w26****c`+) form the **🔥 Challenge tier**: multi-step, A+ (90%+) level Thinking/Application items, with a
  Challenge level in Quick Quiz and the profile, and a separate 25-question Challenge simulation in Exam Sim.
  They are excluded from "Any" quizzes and the standard Full/Mini simulations, so the standard experience is
  unchanged. Every numeric answer was recomputed in a script.
- 20 worked examples, a 51-entry formula sheet, a 48-term glossary and an 8-week plan. A 2026-11-01 content pass
  (see `docs/CONTENT-LOG.md`) added 30 new questions, 5 worked examples, 6 formula-sheet entries and 21 glossary
  terms, grounded against the Nelson *Chemistry 12* reference text Ani supplied, to broaden coverage of bonding
  theory (hybridization, sigma/pi bonds, network solids), reaction kinetics (half-life, the Arrhenius equation)
  and electrochemistry (corrosion, sacrificial anodes, fuel cells) without changing the five core strands.
- Three built-in chemistry calculators (Tools tab): a molar mass/mole calculator with a chemical-formula parser,
  a pH/pOH/[H⁺]/[OH⁻] converter, and an ideal gas law (PV = nRT) solver. The Study Hub also has an interactive,
  clearly simplified reversible-reaction model with animated particle-flow cues and adjustable concentration
  curves.
- **Interactive models** (Study Hub, in `SCH4U/models.js`, loaded with a dynamic import so the rest of the page
  still works if it fails): a potential energy diagram with E_a/ΔH sliders and a catalyst toggle plus a
  Maxwell–Boltzmann temperature view; a titration curve builder (strong or weak acid, exact charge-balance pH,
  half-equivalence and indicator band); a galvanic cell with animated electron flow, anode/cathode, balanced cell
  reaction and E°cell; and a VSEPR shape explorer for all 13 SCH4U shapes with polarity. Each unit also opens with a
  clickable concept map that links to its lessons.
- **Guided problems** (Study Hub, `SCH4U.GUIDED`): 6 multi-step problems (ICE tables, weak-acid pH, Hess's law,
  calorimetry, redox balancing, redox titration) in which the student enters every intermediate value. Wrong
  steps show a hint, and "Show me" appears after two misses.
- **Daily Review** (Review tab): spaced flashcards (Leitner boxes: again, 1 day, 3 days, 1 week, 2 weeks, 1 month)
  built from the formula sheet, the glossary and the student's own missed questions, with a due count on Home.
  Card progress syncs in the progress record as `cards`, `reviews` and `recalled`.
- **Progress** opens with a score-trend chart (last 20 sessions against the Level 2–4 and 90%+ bands, with a
  5-session average and a trend line) and points to the weakest unit. The trend message is worded as a trend, not
  a promised grade. An equation-balancing visualizer remains a future opportunity.
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

When copying an existing course file as the starting point for a new one, every persistence reference must use the
new course's own `const COLL = "<newcourseid>"` (set once, near `COURSE_ID`) — never a hardcoded collection-name
string literal anywhere in `writeCloud`/`persist`/`loadCloud`/`mergeInto`. All three live courses (MPT, MHF4U, SCH4U)
follow this rule: the primary write/read targets `<COLL>/{uid}`, and the legacy fallback nests under
`users/{uid}.<COLL>` via `{ [COLL]: payload }` with `mergeFields: ["email", COLL]`. A copy-paste that leaves a
hardcoded literal from the source course causes real data collisions on the shared `users/{uid}` fallback document —
this already happened once (SCH4U briefly inherited MHF4U's literal) and was the reason this convention was written
down.

## URLs

GitHub Pages paths are case-sensitive. `404.html` sends `/sch4u`, `/Sch4u` and similar variants to `/SCH4U/`.
