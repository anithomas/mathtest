# MHF4U course — setup

The MHF4U Advanced Functions course lives at **https://mathtest.logicmanse.ca/MHF4U/** (the file `MHF4U/index.html`).
It uses the same Firebase project, Google sign-in and `allowedUsers` allowlist as the MPT app.

## Where progress is saved (cloud, available on any device)

Progress is saved in Firestore under the student's own account and loads on any device they sign in with.
The small chip under the header shows the status: **☁️ Synced**, **Saving…**, or **⚠️ This device only**.

- **Preferred:** a dedicated record, `mhf4u/{uid}`.
- **Automatic fallback:** until the rule below is added, progress goes into a `mhf4u` field inside the student's
  existing `users/{uid}` record. Every allowlisted user can already write there. The MPT app saves that record with
  `mergeFields`, so it never erases the MHF4U field.
- Once the dedicated rule is published, the next sign-in merges any fallback progress into `mhf4u/{uid}`
  automatically. Nothing is lost.

The Admin tab in MHF4U shows which mode your own account is using.

## One-time Firebase step (recommended)

Firebase console → project **mathtest-logicmanse** → **Firestore Database** → **Rules**. Add this block
inside `match /databases/{database}/documents { … }`, next to your existing user record rule, then click **Publish**.

```
// 1) MHF4U progress: use EXACTLY the same condition as your existing users/{uid} block.
match /mhf4u/{uid} {
  allow read, write: if <the same condition your users/{uid} rule uses>;
}

```

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
- 119 practice questions: multiple choice, typed numeric answers checked with a tolerance, and 9 written
  Communication items that students self-mark against a model answer.
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
