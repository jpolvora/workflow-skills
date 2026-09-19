---
step: 6
slug: ws-shared-resolution-cleanup
workflowId: ws-shared-resolution-cleanup-20260919T210648Z
status: completed
startedAt: "2026-09-19T21:06:48Z"
endedAt: "2026-09-19T21:30:32.447Z"
acRefs: []
---
# Step 6 review draft — ws-shared-resolution-cleanup (round 1)

Scope: G2 commit 84559abbf0b7633977ab8173e7198bba2ba77f23 (Step 4 files_touched, 7 files) vs spec step-00. Base main...HEAD contains unrelated develop history; review pins the G2 commit only. Rule pack: typescript-node (node-skills-package). localReviewCommand: none configured (dry-run gate n/a). Fable: not enabled (no audit).

## Phase 1 triage

In-scope: config-resolution.md (2 token lines), resolve_consumer_root.cjs (+23), resolve_consumer_root.py (+27), ws-show-harness/SKILL.md (1 token line), package.json (test wiring), bin/skill-integrity.json (regenerated), test/test-global-config-missing.js (new, 153 lines).

## Phase 2 adversarial investigation

No retained findings. Hypotheses H1 (relative configPath cwd resolution), H2 (Error vs ValueError parity), H3 (snake vs camel key mismatch — refuted: each matches its own resolve_consumer_context return shape), H4 (test fixture cleanup — refuted: try/finally env restore, non-throwing checks, sync fs only) were dropped for lack of a complete 4-part proof.

Generalization sweep: verify.sh:9 literal `$repo_root/.ws/config.json` is pre-existing, out of diff — named exemption (shell runtime default anchored at derived repo_root, not a token-applicable consumer instruction).

## Memory sweep

HIGH trap "Avoid redundant dual Node/Python scripts" assessed: resolve_consumer_root.py is pre-existing; adding require_project_config evolves it in place (explicitly allowed), and the gate must exist in both runtimes or Python callers stay fail-open. No parity test pair added. No violation. Doctor-hybrid entry unrelated (no doctor files touched).

## Checks (observed this session)

- test-harness-clean.js: 0 findings; check_harness_links.cjs: clean.
- test-global-config-missing.js: ok (fail-closed without hub, pass-through with hub, local-without-hub).
- verify-integrity: manifest matches tree. scan_stack_invariants.cjs over 3 code files: 0 issues.
- Grep: 4 remaining `.ws/config.json` hits in SKILL.md, all allowlisted entry-gate prose; violation-context count 0.

No feedback.
