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

- **MHF4U:** Includes custom interactive graphing tools such as sign charts, unit circle, sinusoid parameter sliders, rational functions, exponential/logarithmic graphs, and rates of change. It has 38 lessons, 15 progressive worked examples and a 165-question bank across five in-app units mapped to the official MHF4U strands. New questions add practice in every unit; the high-mark habits card now emphasizes retrieval, spaced review, full reasoning and error correction without promising a grade.
- **SCH4U:** Has 34 lessons, 15 worked examples, a 152-question bank across five units, and molar-mass/mole, pH/pOH and ideal-gas calculators. A new interactive concentration-curve model demonstrates dynamic equilibrium for a clearly labelled simplified 1:1 system; its limitations are stated alongside the model. The practice set now covers investigation design, calorimetry, Hess's law, rate laws, equilibrium, acids/bases and electrochemistry, with units and worked reasoning.
- **MPT:** Has strand-based quizzes, mock tests, explanations in practice mode, progress tracking, and test-day calculator/formula-sheet tools. The question bank now has 200 original items. A keyboard-operable fraction bar, practice strategies and additional items across math strands and pedagogy extend the Study Hub. Future visuals can add geometry and data/probability models. Keep mock tests faithful to official test-day conditions.
- **Chemistry and future courses:** Select interactions for the discipline. SCH4U now has an animated reversible-particle flow cue and interactive concentration graph that clarifies dynamic equilibrium; candidate additions include equation-balancing visualizations and further molecular models where they help explain an expectation.
- **LMCA (Lakehead Math Competency):** A separate course from MPT, added for Lakehead University's own internal Mathematics Competency Assessment (Primary/Junior division, EDUC 0450) — distinct from EQAO's province-wide MPT that `/MPT/` already covers correctly. Scoped to Grade 6/7-level content across the five strands named in Lakehead's own prep materials: Number Sense & Numeration, Measurement, Patterning & Algebra, Data Management & Probability, and Commercial & Financial Math (no pedagogy component, since that isn't part of what this assessment tests). Built on the same shared engine as MPT/MHF4U. The real assessment's format is confirmed from Lakehead's own "Making Sense of the MCA" materials: 15 open-response questions worth 3 marks each (45 total), a 2-hour limit, no calculator or formula sheet (manipulatives are provided), and a 75% pass line, with students encouraged to show at least two solution strategies per question. The course's own question bank stays original and multiple-choice for quick self-checking — it does not reproduce any official Lakehead question — and the UI states clearly, wherever the format is discussed, that this is an independent study aid, not affiliated with or endorsed by Lakehead University. The practice-set lengths (15 full / 10 mini) and the Study Hub/Cheatsheet copy were updated to this confirmed format; the on-screen calculator and formula-sheet overlay are labelled as practice-only conveniences since the real exam permits neither.
  Its original practice bank now has 90 questions (18 per strand), with an interactive fraction bar and written-response strategies; these self-check questions remain clearly distinguished from the real assessment's open-response format.

### Course stress-check and rollback

- Added `scripts/audit-course-content.mjs` to check all four embedded banks for unique IDs, valid answer schemas, distinct multiple-choice options, valid course strands, solution feedback, and inline JavaScript syntax; it also exercises the new fraction and equilibrium sliders.
- Current bank sizes: MHF4U 165; SCH4U 152; MPT 200; LMCA 90. MHF4U/SCH4U counts are across the in-app units; those units map to the official curriculum content strands.
- The baseline commit is preserved on GitHub as `backup/pre-study-upgrade-20261014` and locally as a branch with the same name. Restore it if a published update needs to be rolled back.

These are design opportunities; a recommendation in this note does not mean the feature is already implemented. No feature should be presented as guaranteeing a pass or higher grade.

## Services and privacy direction

- Existing preferred stack: GitHub for source/deployment workflow and Firebase for authentication and course data. Follow the repository's established architecture before proposing another provider.
- Use the LogicManse MathTest GA4 web stream for `mathtest.logicmanse.ca`. The site currently has measurement ID `G-287BL8NXV3` in `analytics.js`; course Firebase config uses project ID `mathtest-logicmanse`. These are distinct identifiers: verify the web stream's site URL and that its Measurement ID belongs to the intended GA4 property. If the owner wants Analytics surfaced in Firebase, verify/link that same GA4 property under Firebase project settings → Integrations. Do not describe the link as confirmed based on code alone.
- Google Analytics is for basic product improvement only. Keep advertising and cross-site advertising features off; use fixed, privacy-conscious event data; never send student names, emails, answers, or scores. Avoid “anonymous” claims because Analytics may collect browser/device details and approximate location. Keep URLs and event parameters free of student information.
- Desmos is optional; disclose that opening a calculator sends the browser to Desmos, and preserve a non-Desmos route through lessons/practice.
- If an AI tutor or teacher-facing AI marking/drafting feature is added, make it opt-in, disclose what content is sent at the point of use, omit student identity, and use a server-side integration. Avoid claims that prompts are never retained.
- Keep student account and work data protected by Firebase rules and never commit secrets or private student data.
