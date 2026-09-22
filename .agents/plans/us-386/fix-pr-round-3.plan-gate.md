# Fix-PR round 3 gate — PR #394 (Step 9)

Date: 2026-09-22. Active threads at entry: 4 (2 findings).
Resolved so far: 3 (rounds 1–2). Commits: 6d48db8, 836c7ca.

## Finding A — cancelled gate must HS-1, not gate-declined (3 occurrences: dispatch:177, gates:260, helper:100)

Reviewer claim: runbook forwards only start|skip; helper maps every non-start to gate-declined, so a dismissed gate ends the workflow instead of HS-1 STOP + re-present. VERDICT: valid — gates.md rule 5 (cancel → HS-1) must hold for this gate too.

Fix: `--gate-decision start|skip|cancel`; helper returns `{action:'cancel', reason:'gate-cancelled'}` on cancel, exit 2 on any other invalid decision value; runbook step 4 gains a cancel branch (HS-1 STOP, re-present, no completed-skip telemetry); gates.md wording split Skip vs Cancel.

## Finding B — slug traversal in resolveFolder (helper:74)

Reviewer claim: `{slug}` interpolated raw; a `../../outside` slug escapes the project-root subtree. VERDICT: valid hardening.

Fix: `sanitizeSlug` (basename on `/`+`\`; empty/`.`/`..` → usage error exit 2, fail closed). Export for tests.

### Plan

1. Helper: `sanitizeSlug` + cancel action + strict `--gate-decision` validation.
2. gates.md: Skip vs Cancel wording; cancel → HS-1, no completed skip; keep helper pointer.
3. STEP-DISPATCH runbook: `--gate-decision start|skip|cancel`; step 4 cancel branch.
4. Tests: cancel matrix, invalid-decision exit 2, traversal-slug exit 2, sanitized nested slug.
5. Verify: test, editor test, scan, full suite, integrity.
6. Commit `fix(#386): gate-cancel HS-1 and slug sanitization [review-round-3]`, push, reply ×4, resolve ×4, re-check.
