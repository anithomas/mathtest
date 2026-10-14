# Project instructions

## Product purpose

Build MathTest Trail as a LogicManse-branded study product that helps students understand course concepts, practise deliberately, identify weak areas, and prepare confidently for assessments. Design for learning and confidence; never promise a particular grade or pass result.

## Course catalogue and access

- Keep the root page as the course catalogue. Group courses by grade and level, with special preparation courses (such as MPT) in their own clearly labelled group. Make it straightforward to add Chemistry and future subjects.
- Each course has a stable course route (for example, `/MHF4U/` or `/MPT/`) and its own course-specific learning content.
- Explain how students join/enrol and then enter the course they have access to. A URL is navigation, not authorization: enforce access through Firebase Auth, course entitlements, and Firestore rules.
- Keep pricing flexible until the owner finalizes the catalogue and pricing model.

## Shared design standard

- Use LogicManse / MathTest Trail branding consistently across the catalogue and every course unless the owner explicitly requests an exception.
- Carry the shared logo, typography, colour palette, spacing, card patterns, navigation, accessibility, and responsive behaviour across courses. Course-specific content and appropriately contextual interactions may vary.
- Ontario Maths is a visual-style reference only. Do not copy its branding, text, or assets; preserve the LogicManse identity.
- Prefer shared design tokens/components or a clearly documented common pattern so future courses do not drift visually.

## Learning experience

- Use a learning loop where appropriate: clear explanation → visual or worked example → low-stakes check with useful feedback → targeted practice → review of weak areas → exam-style application.
- Choose interactions that teach the subject, not decorative gimmicks. For MHF4U, retain and extend parameter-based graphs and visual tools for functions. For MPT, prioritize age-appropriate number lines/fraction models, geometry diagrams, and data/probability visualizations or simulations where they clarify the concept; preserve realistic test-mode tools and conditions in mock tests.
- For future Chemistry courses, consider interactive particle/molecular models, equation balancing visualizations, and subject-appropriate simulations when they improve understanding.
- Make controls keyboard-accessible, mobile-friendly, labelled, and usable without relying on colour alone. Provide non-interactive explanations or alternatives where practical.
- Distinguish formative practice (hints and feedback) from realistic exam simulations (timing, tools, and feedback rules matching the target assessment).
- Give students actionable next steps based on missed skills, and encourage spaced revisiting and manageable practice sessions.

## Technology and privacy

- Follow the existing architecture and project stack: static course pages, GitHub-based source/deployment, Firebase Authentication and Firestore. Do not introduce services or dependencies without a product need and owner approval.
- Use Google Analytics only for basic product improvement with ads and cross-site advertising features disabled. Do not send names, emails, answer content, or scores; use fixed event names/parameters and canonical URLs that cannot leak student information. Disclose that Analytics may collect browser/device information and approximate location; do not describe it as fully anonymous.
- Make Desmos optional and disclose that opening it contacts Desmos. Keep a usable course path for students who do not open the external calculator.
- Treat any AI tutor/marking integration as optional and disclose exactly which question/answer content is sent before activation. Route requests through the server; never expose provider secrets in client code. Do not claim prompts are never retained.
- Keep student identity and work in Firebase/Firestore under the configured access rules. Do not place secrets or student records in the public repository.

## When adding or changing a course

1. Review this file and `docs/PRODUCT-DESIGN-NOTES.md`.
2. Reuse the shared brand and course navigation patterns.
3. Map content and interactions to the target curriculum and assessment.
4. Update the root catalogue, course access/enrolment flow, and privacy disclosures as needed.
5. Describe clearly what is implemented versus planned; do not claim a learning feature exists until it is present in the course.
