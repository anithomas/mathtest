# MathTest Trail

*v2 — July 2, 2026*

A private, single-file study web app for the **Ontario Mathematics Proficiency Test (MPT)**,
live at **https://mathtest.logicmanse.ca**.

## Features

- **Quick Quiz** — freshly randomized every start, non-repeating until the full bank is seen; instant feedback with explanations. Filter by strand or pedagogy.
- **Mock Tests** — Full 71-question mocks in the real MPT scored format (50 math content + 21 pedagogy, 70% needed on each component), plus a lighter 35-question mini. Feedback at the end with full review.
- **Cheatsheet** — the MPT Formula Sheet (2D + 3D) plus quick-reference facts for every strand and the pedagogy component.
- **Score tracking** — every session saved, strand-mastery bars, history, synced across devices via Firestore.
- **Study Hub** — key concepts per strand, official EQAO practice tests and framework, pedagogy source documents (Growing Success, Learning for All), and curated free resources.
- **Private** — Google sign-in restricted to allowlisted accounts, enforced server-side by Firestore security rules.

## Stack

One deployable `index.html` (no build step) · GitHub Pages · Firebase Auth + Firestore (free tier) · GoDaddy DNS.

Fonts: Fraunces / Inter / IBM Plex Mono · Palette: teal, coral, sage, gold on warm parchment.

## Setup

See [SETUP.md](SETUP.md). No secrets live in this repo.

## Question bank

190 original questions in the `BANK` array in `index.html`, aligned to the official MPT Framework:
Number 50 · Algebra 30 · Data & Probability 22 · Spatial Sense 30 · Financial Literacy 18 · Pedagogy 40.

Questions are written for this app — official EQAO practice questions stay on [mathproficiencytest.ca](https://mathproficiencytest.ca), where the Study Hub links to them.
