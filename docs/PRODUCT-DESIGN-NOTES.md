# MathTest Trail product and learning design notes

Updated 2026-10-14 from the owner's direction.

## Product goal

Turn the site into a multi-course study product that makes learning engaging, helps students understand concepts, and supports stronger assessment performance. Build for better preparation, not guaranteed grades.

## Information architecture

- `https://mathtest.logicmanse.ca/` is the course catalogue.
- Courses use their own routes, such as `/MHF4U/`, `/MPT/`, and `/LMCA/`.
- Organize the catalogue into grade/course groups and a distinct special-preparation group for courses like MPT and LMCA. Add Chemistry and other subjects without changing the overall structure.
- Students should be able to sign up or be enrolled for a course and then enter that course. Enforce course authorization in Firebase, not just by hiding a link.
- Keep the price catalogue adaptable until pricing is decided.

## Public enrollment rollout (recommended plan)

### Current state

- Course pages use Google sign-in through Firebase Authentication. Google sign-in can create a Firebase account, but that is not the same as course enrollment.
- Access is currently invite/allowlist-managed through Firestore rules. The two apps still refer to the legacy `allowedUsers` model and a single course field in the admin UI.
- The course catalogue and course HTML are static files on GitHub Pages. Firestore rules protect account/progress data; they do not make static HTML or course assets private. Treat client-side route guards as user experience only, never as the security boundary for protected course materials.
- The current Firestore rules were supplied by the owner. A candidate replacement is now checked in as `firestore.rules`; it is not deployed. No Firebase CLI config is checked into the repository.

### Implementation started

- Added shared Firestore enrollment helpers in `enrollment.js`. The record path is `enrollments/{uid}__{courseId}`; free self-enrollment records use `uid`, `courseId`, `status: "active"`, `source: "self-service-free"`, and a server timestamp. The flat collection supports admin roster queries and future packages that grant multiple independent course entitlements. New course IDs can be configured in `courseSettings` without changing the core enrollment rule.
- Added a course-specific join screen and auth decision path to both `MPT/index.html` and `MHF4U/index.html`.
- The `PUBLIC_ENROLLMENT_ENABLED` flag is deliberately `false` in both apps. The existing invite-only sign-in/access flow remains in effect until the candidate Firestore rules are reviewed, emulator-tested, and deployed together with the app. The join button cannot safely work against the currently deployed rules.
- Added per-course progress paths: new MPT progress moves to `mpt/{uid}` and MHF4U progress uses `mhf4u/{uid}`. MPT can read its legacy fields from `users/{uid}` and migrate them on the first public-mode sign-in. The candidate rules retain legacy allowlist access during transition.
- The candidate rules keep `aniphilip@hotmail.com` and `aniphilip@gmail.com` as the super-admin accounts. The previous `2kevinthomas@gmail.com` entry has been removed from the candidate rules.
- No payment or package checkout is implemented. A future package should grant several course entitlements rather than merge courses into one inseparable record.

### First public pilot: free self-enrollment

Keep invite-only access in production until the new rules and enrollment flow are tested. The first public pilot can allow any student with a Google account to join selected free courses, with no payment integration yet. Student identity and course enrollment remain separate records.

Suggested Firestore model:

- `profiles/{uid}`: minimal student profile (`email`, `displayName`, timestamps); students can write only their own identity fields and admins can list profiles for a roster.
- `enrollments/{uid}__{courseId}`: one entitlement per UID/course, with course ID, status, enrollment source, and server timestamp. Students must not be able to grant themselves admin roles, paid status, or change another student's entitlement. Self-enrollment is possible only for a course configured by an admin.
- `courseSettings/{courseId}`: non-sensitive course settings. A course is available for free self-enrollment only when an admin sets `selfEnrollmentOpen: true` and `priceCents: 0`. Missing settings keep enrollment closed by default; adding a new course does not require changing the rule's course allowlist.
- `mpt/{uid}`, `mhf4u/{uid}`, and `lmca/{uid}`: isolated course progress, each readable/writable only by that student when they have the corresponding course entitlement (or temporary legacy allowlist access).
- Admin grants/revokes should remain an explicit trusted operation. If using a server SDK or Cloud Functions, remember server libraries bypass Firestore Security Rules; protect that service with IAM and trusted server-side checks.

Implementation sequence:

1. Review `firestore.rules` against the active Firebase rules, then test it in the Firebase Emulator before deploying. The candidate is based on the rules the owner pasted and has not been emulator-validated or deployed.
2. Enable and refine the prepared **Sign in / Join this course** flow in the course pages. After Google sign-in, ask the student to explicitly enroll in the selected free course and explain what account/work data is saved.
3. Create enrollment records with narrowly scoped rules (or a trusted backend). Enforce each course's entitlement in Firestore rules for progress and course-specific data.
4. Update both course apps to check the selected course entitlement and display a clear not-enrolled state with a **Join course** action. Keep existing invited students' access during migration.
5. Test with a new student account, enrolled and unenrolled direct links, course-to-course isolation, own-progress-only access, revoked enrollment, and admin access before opening the pilot.
6. Open only the chosen free pilot courses after the tests pass. Keep payment and fixed pricing for a later phase.

When paid enrollment is introduced, payment confirmation must be verified by a trusted server/webhook before granting or renewing an entitlement. Never let the browser mark its own course as paid. If lesson content itself must be confidential, move it behind an authenticated backend/storage layer; static GitHub Pages files are publicly retrievable regardless of a client-side sign-in screen.

## Brand and visual direction

- Maintain one LogicManse / MathTest Trail brand system across the catalogue and all courses: logo, fonts, colour palette, layout rhythm, cards, navigation, and responsive behaviour.
- The owner likes the visual style and typography of [Ontario Maths](https://ontariomaths.ca/grades.php) as inspiration, while the site must retain its own LogicManse identity and original content/assets.
- Course-specific elements can differ where they support the subject or assessment, but the shared design should remain recognizable.

## Engagement and understanding

Build toward this learning flow where appropriate:

1. Explain an idea in clear, student-friendly language.
2. Show it with a worked example, diagram, graph, model, or simulation.
3. Let the student try a low-stakes check and receive an explanation or hint.
4. Offer focused practice and connect it to the relevant lesson.
5. Track skills and recommend a useful next step for weak areas.
6. Provide exam-style practice that reflects the real assessment.

Current course-specific observations and opportunities:

- **MHF4U:** Already includes custom interactive graphing tools such as sign charts, unit circle, sinusoid parameter sliders, rational functions, exponential/logarithmic graphs, and rates of change. It also has lessons with checks, worked examples that reveal steps progressively, quiz hints/explanations, and weak-area practice. Continue extending the concept-to-practice connections where useful.
- **MPT:** Already includes strand-based quizzes, mock tests, explanations in practice mode, progress tracking, and test-day calculator/formula-sheet tools. It does not currently have the same kind of interactive concept visualizations as MHF4U. Good candidates include number lines and fraction models, geometry diagrams, and data/probability graphs or simulations. Keep mock tests faithful to test-day conditions.
- **Chemistry and future courses:** Select interactions for the discipline. Candidate Chemistry tools include particle/molecular models, equation balancing visualizations, and relevant simulations.
- **LMCA (Lakehead Math Competency):** A separate course from MPT, added for Lakehead University's own internal Mathematics Competency Assessment (Primary/Junior division, EDUC 0450) — distinct from EQAO's province-wide MPT that `/MPT/` already covers correctly. Scoped to Grade 6/7-level content per Lakehead's own description, across five strands (no pedagogy component, since that isn't part of what this assessment tests). Built on the same shared engine as MPT/MHF4U. Because Lakehead hasn't published the assessment's exact format (question count, timing, calculator policy), the course presents an honest, evenly-spread generic practice set rather than a claimed simulation, and states clearly that it is an independent study aid, not affiliated with or endorsed by Lakehead University.

These are design opportunities; a recommendation in this note does not mean the feature is already implemented. No feature should be presented as guaranteeing a pass or higher grade.

## Services and privacy direction

- Existing preferred stack: GitHub for source/deployment workflow and Firebase for authentication and course data. Follow the repository's established architecture before proposing another provider.
- Use the LogicManse MathTest GA4 web stream for `mathtest.logicmanse.ca`. The site currently has measurement ID `G-287BL8NXV3` in `analytics.js`; course Firebase config uses project ID `mathtest-logicmanse`. These are distinct identifiers: verify the web stream's site URL and that its Measurement ID belongs to the intended GA4 property. If the owner wants Analytics surfaced in Firebase, verify/link that same GA4 property under Firebase project settings → Integrations. Do not describe the link as confirmed based on code alone.
- Google Analytics is for basic product improvement only. Keep advertising and cross-site advertising features off; use fixed, privacy-conscious event data; never send student names, emails, answers, or scores. Avoid “anonymous” claims because Analytics may collect browser/device details and approximate location. Keep URLs and event parameters free of student information.
- Desmos is optional; disclose that opening a calculator sends the browser to Desmos, and preserve a non-Desmos route through lessons/practice.
- If an AI tutor or teacher-facing AI marking/drafting feature is added, make it opt-in, disclose what content is sent at the point of use, omit student identity, and use a server-side integration. Avoid claims that prompts are never retained.
- Keep student account and work data protected by Firebase rules and never commit secrets or private student data.
