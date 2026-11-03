# Mistake Clinic

One shared module, `/clinic.js`, gives every course the same mistake-recovery loop. Each course supplies only its content (cards and tagged questions) and a small adapter.

## What students see (identical in all five courses)
- **Study Hub > Mistake Clinic:** cards for the slips that cost the most marks. Each card shows a common wrong answer, why it fails, the fix and a one-question redo.
- **Your focus right now:** up to three items chosen from the student's own answers, with a one-tap *Smart review*.
- **My mistake log:** the last questions missed, the option chosen, the correct answer and the explanation, until they are answered correctly.
- **In a quiz:** a wrong answer shows why the chosen option is tempting (when authored) and the matching card.
- **Home page card, quiz modes** *Smart review* and *Mistake Clinic quiz*, per-card practice, and (math/science courses) a *Common mistakes in this lesson* block inside lessons.

## How it learns (no AI; deterministic, from the student's own data)
1. Every miss is logged by question id, with the option chosen. Tagged or not.
2. A miss on a question tagged `mx` reopens that card and counts toward its priority.
3. Priority = recent misses (half-life one week) + open + due for review.
4. Untagged misses are grouped by unit. Two or more recent misses in a unit become a focus item.
5. A fixed card returns for review after 1, 3, 7 and 21 days (spaced repetition).
6. *Smart review* builds a quiz from the focus cards' questions plus the questions still unresolved in the log.

## Data stored (student's own progress document, same Firestore doc as before)
- `clinic`: `{ [cardId]: { f: lastFixed, m: lastMissed, b: box 0-3, h: [recent miss times] } }`
- `mlog`: `{ [questionId]: { n: misses, t: lastMiss, c: chosen option or typed value, r: resolvedAt } }` (capped at 120 entries)

No new collections and no rule changes: the rules are per-document. Nothing is sent to Analytics. Cards contain only generic misconception patterns, never a student's name or work.

## Per course (2026-11-03)
| Course | Cards | Tagged questions | Lesson blocks | Notes |
|---|---|---|---|---|
| SCH4U | 24 | 51 | yes | also 3 new lessons and the quantum-number explorer |
| MHF4U | 16 | 32 | yes | |
| MCR3U | 17 | 34 | yes | |
| MPT | 14 | 28 | no | bank-style course: cards sit at the top of the Study Hub |
| LMCA | 12 | 24 | no | same as MPT |

MPT and LMCA have no lesson pages, so cards are linked to strands instead of lessons.

## Adding to a course
1. Write cards: `{id, u, l, t, wrong, why, fix, redo: {p, o, a, why}}` (`u` = unit or strand id, `l` = lesson id or null).
2. Tag at least two practice questions per card with `mx: '<card id>'`. For multiple choice add `dx: {optionIndex: "why this is tempting"}`.
3. Wire the adapter (`LMClinic.create({...})`): see the `CL` block in any course page. Extend `store`, the cloud payload and the cloud merge with `clinic` and `mlog`.
4. Verify: a wrong answer logs to the mistake log, reopens its card, shows in *Your focus*, and survives a reload.
