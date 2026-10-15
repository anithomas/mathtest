# MathTest Trail

*v4 — July 2026 · “Every trail leads to the summit.”*

A private study platform with a course catalogue at **https://mathtest.logicmanse.ca**. A [LogicManse](https://logicmanse.ca) product.

**MPT prep:** https://mathtest.logicmanse.ca/MPT/.

**Grade 12 Advanced Functions (MHF4U):** https://mathtest.logicmanse.ca/MHF4U/. It has the same
engine, sign-in and allowlist, with lessons, graphing tools and an 8-week plan. See [MHF4U-SETUP.md](MHF4U-SETUP.md).

**Lakehead Math Competency (LMCA):** https://mathtest.logicmanse.ca/LMCA/. An independent study aid for
Lakehead University's Mathematics Competency Assessment (Primary/Junior division, EDUC 0450) — Grade 6/7-level
math practice across the five strands named in Lakehead's own prep materials (Number Sense & Numeration,
Measurement, Patterning & Algebra, Data Management & Probability, Commercial & Financial Math), built on the
same engine. Not affiliated with or endorsed by Lakehead University. The real assessment is confirmed (per
Lakehead's own "Making Sense of the MCA" materials) to be 15 open-response questions worth 3 marks each
(45 marks total), 2 hours, no calculator or formula sheet, with manipulatives provided and a 75% pass line —
this app's practice sets are original multiple-choice questions for quick self-checking, not a copy of any
official question or a claimed simulation of the written format.

The root URL is a course catalogue. Each course lives in its own folder so it can grow independently; new courses
can be added by creating a course folder and adding a card to the catalogue. Chemistry is listed as coming soon.

## Features

- **Quick Quiz** — freshly randomized every start, non-repeating until the full bank is seen; instant feedback with explanations. Filter by strand or pedagogy.
- **Mock Tests** — Full 71-question mocks in the real MPT scored format (50 math content + 21 pedagogy, 70% needed on each component), plus a lighter 35-question mini. Feedback at the end with full review.
- **Cheatsheet** — the MPT Formula Sheet (2D + 3D) plus quick-reference facts for every strand and the pedagogy component.
- **Score tracking** — every session saved, strand-mastery bars, history, synced across devices via Firestore.
- **Study Hub** — key concepts per strand, official EQAO practice tests and framework, pedagogy source documents (Growing Success, Learning for All), and curated free resources.
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

190 original questions in the `BANK` array in `MPT/index.html`, aligned to the official MPT Framework:
Number 50 · Algebra 30 · Data & Probability 22 · Spatial Sense 30 · Financial Literacy 18 · Pedagogy 40.

Questions are written for this app — official EQAO practice questions stay on [mathproficiencytest.ca](https://mathproficiencytest.ca), where the Study Hub links to them.

80 original questions in the `BANK` array in `LMCA/index.html`, covering Grade 6/7-level Ontario elementary
math across Lakehead's five named strands: Number Sense & Numeration 16 · Measurement 16 ·
Patterning & Algebra 16 · Data Management & Probability 16 · Commercial & Financial Math 16.
