# Issue #62: Shared footer-note decomposition

## Delivery plan

Create exactly two independent implementation tasks. Each task includes its own focused regression test; no shared code or integration task is needed. Child issues belong in `hilalfnisanci/streak-jar`, next to parent #62. Only the Compliment Mirror task sets `target_repository: compliment-mirror`.

| Priority | Task key | Work repository | Workflow | Depends on |
| --- | --- | --- | --- | --- |
| 1 | streak-jar-footer | hilalfnisanci/streak-jar (default) | feature-qa | [] |
| 2 | compliment-mirror-footer | hilalfnisanci/Compliment-Mirror | feature-qa | [] |

The installed `feature-qa` workflow was confirmed through the project pipeline listing. Its stages are plan, plan-review, implement, code-review, qa, and merge. Both changes are frontend work requiring QA; neither introduces security-sensitive behavior. Both can execute in the same dependency wave; list order expresses priority, not a dependency. The server computes scheduling.

## Task 1: Add the Made with Orchestra footer note to Streak Jar

### Scope
Implement only in hilalfnisanci/streak-jar. Add the exact plain-text line `Made with Orchestra` directly under the main page's existing footer text, using its small muted style. Keep existing copy and page behavior unchanged. No shared code, dependencies, links, or unrelated redesign.

### Planning discrepancy
At 362775ae019801b5deeb9406a8fc5ff4ebb14e86, app/page.tsx and app/layout.tsx contain no footer. Recheck the child's intended base and explicitly resolve the missing-footer placement/copy with the owner during planning before implementation; do not invent existing footer copy or silently weaken the parent's placement requirement. This is a planning clarification, not a dependency on the other repository.

### Implementation and tests
Likely scope: app/page.tsx (and a local footer only if needed), app/__tests__/page.test.tsx. Existing muted token is text-soft-ink; small text uses text-sm. Ensure the note appears in both empty and populated home-page states despite the current early return. Add one focused rendering regression test using the existing React Testing Library/Vitest conventions. Run pnpm test app/__tests__/page.test.tsx and any checks focused on other touched code; leave full-suite verification to CI. Keep tests with implementation.

### Acceptance
- The exact note renders once below the existing footer text in a small muted style; the missing-footer discrepancy is explicitly resolved before claiming this criterion.
- Existing copy and behavior are preserved in empty and populated states.
- One focused regression test verifies the note renders.
- Existing Streak Jar suite stays green; no weakened, skipped, or deleted tests.
- No shared cross-repository code or unrelated work.

### Workflow
feature-qa (plan, plan-review, implement, code-review, qa, merge). No prerequisites; independent of the Compliment Mirror task.

## Task 2: Add the Made with Orchestra footer note to Compliment Mirror

### Scope
Implement only in hilalfnisanci/Compliment-Mirror (project alias compliment-mirror). Start from main, never stack on another open PR. Add the exact plain-text line `Made with Orchestra` directly under all existing page footer text, inheriting its small muted footer style. Keep the change tiny and independent; no shared code, dependencies, links, or unrelated redesign.

### Implementation and tests
At main 8477ac09058a9d675ba89e2e6820727cd9a0820e, index.html has footer.site-footer with `Made with care · Compliment Mirror` and a second `Built with care` line. Preserve both existing lines and append the new line below them. styles.css defines .site-footer using var(--color-subtle), 0.8rem and line-height 1.5; inherit these styles rather than adding a new palette. Recheck main when starting.

Add one focused rendering/markup regression test in test/app.test.js using node:test and node:assert/strict. Existing footer test matches the closing footer immediately after Built with care; deliberately update that assertion to accommodate the appended note while retaining verification of both original lines and their order. Do not remove or weaken its existing purpose. Suggested focused check: node --test --test-name-pattern='footer' test/app.test.js. Verify light/dark muted styling in QA; the full existing suite is a CI/verifier requirement, not a decompose-stage run.

### Acceptance
- The exact note renders once immediately below all existing footer text and inherits the small muted footer style.
- Original footer lines remain present and in their original order.
- Branch and PR are based on main, not another open PR.
- One focused regression test verifies the new line; existing tests stay green with any deliberate assertion adaptation explained.
- No shared cross-repository code or unrelated work.

### Workflow
feature-qa (plan, plan-review, implement, code-review, qa, merge). No prerequisites; independent of the Streak Jar task.

## Parent acceptance coverage

- Each app renders the exact `Made with Orchestra` note below its footer: owned by the corresponding repository task.
- Each app retains green existing tests and adds one focused regression test: owned by the same task, with exhaustive verification in its child CI/verifier gates.
- Compliment Mirror starts from `main`: explicit in task 2.
- Changes remain tiny and independent: no dependencies, shared primitive, cross-repository code, or separate test-only task.

## Evidence and pending clarification

- Read the complete source issue in `.orchestra/context/issue.md` and the stage briefing.
- Streak Jar inspected at `362775ae019801b5deeb9406a8fc5ff4ebb14e86`; GitHub main matched this SHA. No existing footer is present in the current main-page or layout implementation. The owner must resolve that premise during child planning; this decomposition does not claim the acceptance criterion is already met.
- Compliment Mirror inspected read-only at `8477ac09058a9d675ba89e2e6820727cd9a0820e`. Its main branch changed during inspection, so final footer/test findings were rechecked against that pinned SHA. Its existing strict footer assertion must be deliberately adapted, preserving prior coverage.
- Decomposition proposal submitted successfully through the Orchestra tool: `04a0084c-f44a-4026-bc56-7bf51df5313c`, status `draft`. This is not reviewer approval or child-issue materialization.
- No application code changed and no app test/build commands ran in this decompose stage. Implementation, focused checks, full-suite verification, and visual QA remain child-task responsibilities.
