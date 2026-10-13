---
step: 6
slug: us-508
workflowId: us-508-20261013T005850Z
status: completed
startedAt: "2026-10-13T01:30:54.754Z"
endedAt: "2026-10-13T01:30:54.754Z"
acRefs: []
---
# Code review — us-508

Scope: committed diff `39cf18f8` (`git diff 39cf18f8^...39cf18f8`), 10 files.
Base: `config.project.baseBranch` (`main`) for orch semantics; this spec's
product change is the single G2 commit.

## Verdict: CLEAN (1 advisory, no fix loop)

## Findings

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| F1 | Advisory (no fix) | Running the checker from a repository **subdirectory** that carries no marker (`.git`/`.ws/config.json`/`package.json`) resolves to `install-root` (`<repo>/.agents`) rather than the repo root. This is the pinned D4 posture (cwd-only markers, no parent walk) and matches AC3; the gate is documented to run from the repo root. | Accepted as specified; noted for future strict-mode work (out of scope). |

## Checks performed

- **Resolution precedence**: explicit flag → consumer checkout (cwd markers) →
  install root → cwd-fallback; the install parent is never returned (`isInstallParent`
  guard). Verified against the fixtures.
- **Parity reporting**: `checked` when both manifests exist; `skipped` naming the
  missing manifest otherwise; CRITICAL only when the resolved root is a real
  package root carrying `bin/`. Matches AC5/AC6/AC7.
- **Diagnostics**: `--json` additive keys (`resolvedRoot`, `resolutionSource`,
  `checks`) keep `{status, issues, simulations}` intact; the Markdown report
  carries the same. AC1/AC6.
- **Write scope**: `--report` joined to `REPO_ROOT`; asserted inside the resolved
  root and absent from the install parent/root. AC9/NS6.
- **Reuse discipline**: `inside()` consumed best-effort from the shared resolver
  with a local fallback; the shared module is not redefined. Spec out-of-scope
  respected.
- **Diff hygiene**: no unrelated edits; Node-only `.cjs`; no new dependency; no
  `git add -A`; version mirrors + integrity regenerated in the same commit.

## Residual risk

- Low. The behavior change is confined to root resolution and parity reporting;
  the full suite (`npm run test`, 164/164) is green and `test-harness-clean.js`
  reports 0 findings.
