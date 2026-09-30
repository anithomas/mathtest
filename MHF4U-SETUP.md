# MHF4U course — setup

The MHF4U Advanced Functions course lives at **https://mathtest.logicmanse.ca/MHF4U/** (the file `MHF4U/index.html`).
It uses the same Firebase project, Google sign-in and `allowedUsers` allowlist as the MPT app, so anyone you add in the
Admin tab can open both courses.

## One-time step: allow the `mhf4u` progress record

MHF4U progress is saved in its own Firestore collection, `mhf4u/{uid}`, so it can never overwrite MPT progress in
`users/{uid}`. Your security rules live in the Firebase console, not in this repo, so this step is done there:

1. Open the [Firebase console](https://console.firebase.google.com/) → project **mathtest-logicmanse** → **Firestore Database** → **Rules**.
2. Find your existing `match /users/{uid} { … }` block.
3. Copy that whole block, paste the copy directly below it, and change `users` to `mhf4u` in the copy:

   ```
   match /mhf4u/{uid} {
     // exactly the same conditions as your users/{uid} block, e.g.
     allow read, write: if <the same condition your users/{uid} rule uses>;
   }
   ```

   Keep the condition identical, so the same allowlist and "only your own record" checks apply.
4. Click **Publish**.

Until this rule is published, the MHF4U page still works, but it saves progress on the device only. It shows a yellow
notice, and admins see a pointer back to this file.

## Adding a student

Sign in, open **Admin**, and add the Google account email the student will sign in with. The list is shared with
the MPT course.

## Content

All MHF4U content is in the `MHF4U` object inside `MHF4U/index.html`:

- 5 units, 38 lessons (each with a quick check)
- 104 practice questions: multiple choice, typed numeric answers (checked with a tolerance) and written Communication
  items that students self-mark against a model answer
- 15 worked examples, the formula sheet, a glossary and an 8-week plan

Every numeric answer was recomputed by script before release. The course follows the Ontario MHF4U curriculum
(strands A–D) and has no calculus in it.

## URLs

GitHub Pages paths are case-sensitive. `404.html` sends `/mhf4u`, `/Mhf4u` and similar variants to `/MHF4U/`.
Other missing pages show a short "not found" page with links to both courses.
