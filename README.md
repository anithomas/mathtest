# MathTest Trail

*v4 — July 2026 · “Every trail leads to the summit.”*

A private study platform with a course catalogue at **https://mathtest.logicmanse.ca**. A [LogicManse](https://logicmanse.ca) product.

**MPT prep:** https://mathtest.logicmanse.ca/MPT/.

**Grade 12 Advanced Functions (MHF4U):** https://mathtest.logicmanse.ca/MHF4U/. It has the same
engine, sign-in and allowlist, with 38 lessons, worked examples, 225 practice questions (including a 60-question Challenge tier), interactive graphing
tools, step-checked guided problems, spaced-review flashcards, unit concept maps and an 8-week plan. See [MHF4U-SETUP.md](MHF4U-SETUP.md).

**Lakehead Math Competency (LMCA):** https://mathtest.logicmanse.ca/LMCA/. An independent study aid for
Lakehead University's Mathematics Competency Assessment (Primary/Junior division, EDUC 0450) — Grade 6/7-level
math practice across the five strands named in Lakehead's own prep materials (Number Sense & Numeration,
Measurement, Patterning & Algebra, Data Management & Probability, Commercial & Financial Math), built on the
same engine. Not affiliated with or endorsed by Lakehead University. The real assessment is confirmed (per
Lakehead's own "Making Sense of the MCA" materials) to be 15 open-response questions worth 3 marks each
(45 marks total), 2 hours, no calculator or formula sheet, with manipulatives provided and a 75% pass line —
this app's practice sets are original multiple-choice questions for quick self-checking, not a copy of any
official question or a claimed simulation of the written format.

**Grade 12 University Chemistry (SCH4U):** https://mathtest.logicmanse.ca/SCH4U/. Same engine, sign-in and
allowlist, with 34 lessons, 15 worked examples, 212 practice questions, interactive chemistry calculators,
interactive models (energy diagrams, titration curves, galvanic cells, VSEPR shapes, unit concept maps),
step-checked guided problems, spaced-review flashcards, a score-trend chart and an 8-week plan. See [SCH4U-SETUP.md](SCH4U-SETUP.md).

**Grade 11 Functions (MCR3U):** https://mathtest.logicmanse.ca/MCR3U/. Same engine, sign-in and allowlist, with
32 lessons, 12 worked examples, 168 practice questions (including a 48-question Challenge tier), an interactive
sign-chart tool, interactive models, guided problems, spaced-review flashcards and an 8-week plan. Works
entirely in degrees (no radians, logarithms, or compound/double-angle identities — those arrive next year in
MHF4U) and covers the sine law, cosine law, sequences/series, and financial math that MHF4U does not revisit in
the same depth. See [MCR3U-SETUP.md](MCR3U-SETUP.md).

The root URL is a course catalogue. Each course lives in its own folder so it can grow independently; new courses
can be added by creating a course folder and adding a card to the catalogue. Signed-in students see their own
progress — lessons done, or questions practiced — directly on every course card they have access to. The catalogue
also shows a live totals strip (courses, lessons, practice questions — summed from each card's own data attributes,
so it can't drift out of sync), a stream tag on every course card (University Prep, Teacher Candidates, Admission
Assessment), named course codes in the "coming soon" placeholders, and a four-step "how studying here works"
explainer. Every course app's footer links directly to every other live course, not just back to the catalogue.

## Features

- **Quick Quiz** — freshly randomized every start, non-repeating until the full bank is seen; instant feedback with explanations. Filter by strand or pedagogy.
- **Mock Tests** — Full 71-question mocks in the real MPT scored format (50 math content + 21 pedagogy, 70% needed on each component), plus a lighter 35-question mini. Feedback at the end with full review.
- **Cheatsheet** — the MPT Formula Sheet (2D + 3D) plus quick-reference facts for every strand and the pedagogy component.
- **Score tracking** — every session saved, strand-mastery bars, history, synced across devices via Firestore.
- **Study Hub** — key concepts per strand, official EQAO practice tests and framework, pedagogy source documents (Growing Success, Learning for All), and curated free resources.
- **Concept visuals** — MHF4U interactive function graphs; SCH4U equilibrium concentration and particle-flow model; MPT and LMCA equal-part fraction bars; MCR3U sign-chart tool for polynomial/rational inequalities. The models are optional and labelled to explain their limits.
- **Course library** — the root catalogue reads each student's own Firestore progress (read-only) and shows it directly on every course card they have access to, once they sign in with the same Google account used in the course apps.
- **Test-day tools** — on-screen calculator and Formula Sheet overlay on every question, like the real test's toolbar; per-question calculator/mental-math guidance and 🌱/🌿/🌋 difficulty modes.
- **Personal** — profile with display name, optional age, preferred difficulty; flexible 8-week plan anchored to your own start date; XP, levels, badges, and streaks.
- **Private & managed** — Google sign-in and Firestore course data, currently access-managed through the admin allowlist.
- **Enrollment foundation** — a shared free course-enrollment helper and course-specific join screens are prepared behind `PUBLIC_ENROLLMENT_ENABLED` in each course. The flag remains off until the active Firestore rules are exported, migrated, and reviewed; this preserves the invite-only launch.

## Stack

Static HTML with no build step · GitHub Pages · Firebase Auth + Firestore · GoDaddy DNS.

The site uses system fonts, LogicManse branding and a teal / coral / sage / gold palette on warm parchment. MHF4U links to the optional Desmos graphing calculator; opening it contacts Desmos directly.

## Analytics and privacy

`analytics.js` contains an optional Google Analytics 4 integration using the LogicManse Study measurement ID.
It asks for opt-in consent, sends only fixed page/course and study-tool events, uses canonical URLs, and does not
send names, emails, answers, or scores. The GA property is configured with Google Signals and Enhanced Measurement
off, ad personalization disabled in all regions, and user/event retention set to two months. The browser cookie is
limited to 60 days. See [privacy.html](privacy.html).

## Setup

See [SETUP.md](SETUP.md). No secrets live in this repo.

Public-enrollment architecture and rollout notes are in [docs/PRODUCT-DESIGN-NOTES.md](docs/PRODUCT-DESIGN-NOTES.md).

## Firebase rules

`firebase.json` points the Firebase CLI at the checked-in `firestore.rules`, and `.firebaserc` selects the
`mathtest-logicmanse` project. After installing Firebase CLI and signing in with an authorized Firebase account,
review the rules and deploy them with `firebase deploy --only firestore:rules`. Do not commit Firebase tokens,
service-account keys, or other credentials.

## Question bank

200 original questions in the MPT bank: Number 52 · Algebra 32 · Data & Probability 23 · Spatial Sense 33 ·
Financial Literacy 18 · Pedagogy 42. The new fraction model and practice-habit card are in the Study Hub.

Questions are written for this app — official EQAO practice questions stay on [mathproficiencytest.ca](https://mathproficiencytest.ca), where the Study Hub links to them.

90 original questions in the LMCA bank, covering Grade 6/7-level Ontario elementary math across Lakehead's
five named strands: 18 questions in each strand. Its Study Hub includes an interactive equal-parts fraction
model and written-response strategies to support the real assessment format.

The MHF4U and SCH4U banks contain 225 and 212 questions, respectively, balanced across their five in-app
units that map to the official course strands. The MCR3U bank contains 168 questions, balanced across its four
in-app units (42 each, including 12 Challenge items). Run
`node scripts/audit-course-content.mjs` to check all five banks for unique IDs, valid answer structures, distinct
answer choices, supported quiz strands and inline JavaScript syntax, and it exercises the slider-driven learning
visuals.

## Rollback checkpoint

The pre-study-upgrade baseline is preserved on GitHub as `backup/pre-study-upgrade-20261014`.
