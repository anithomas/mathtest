# MathTest Trail

A private, single-file study web app for the **Ontario Mathematics Proficiency Test (MPT)**,
live at **https://mathtest.logicmanse.ca**.

## Features

- **Quick Quiz** — freshly randomized every start, non-repeating until the full bank is seen; instant feedback with explanations. Filter by strand or pedagogy.
- **Mock Test** — 35 questions (25 content + 10 pedagogy) mirroring the real MPT's two-section, 70%-each format; feedback at the end with full review.
- **Score tracking** — every session saved, strand-mastery bars, history, synced across devices via Firestore.
- **Study Hub** — key concepts and formulas per strand, pedagogy essentials, and curated official resources (mathproficiencytest.ca, EQAO, Ontario curriculum).
- **Private** — Google sign-in restricted to two accounts, enforced by Firestore security rules.

## Stack

One deployable `index.html` (no build step) · GitHub Pages · Firebase Auth + Firestore (free tier) · GoDaddy DNS.

Fonts: Fraunces / Inter / IBM Plex Mono · Palette: teal, coral, sage, gold on warm parchment.

## Setup

See [SETUP.md](SETUP.md). No secrets live in this repo.

## Question bank

150 questions in the `BANK` array in `index.html`:
Number 40 · Algebra 25 · Data & Probability 18 · Spatial Sense 25 · Financial Literacy 12 · Pedagogy 30.
