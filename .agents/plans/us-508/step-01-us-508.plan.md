---
slug: us-508
title: "check_workflows.cjs: resolver returns the parent of the global install (home directory) and silently skips the dependency parity check"
status: completed
step: 1
workflowId: us-508-20261013T005850Z
startedAt: "2026-10-13T01:01:26.802Z"
endedAt: "2026-10-13T01:01:26.802Z"
acRefs: []
---
## 0. Summary & Business Rules

Finish the residual repo-root resolution defect in
`.agents/skills/ws-check-workflows/scripts/check_workflows.cjs` that survived the
`c9b47ecf` (#504) fix, and make the shared-vs-bin dependency parity check report
itself when it cannot evaluate its target instead of disappearing.

Business rules:

- Explicit `--repo-root <dir>` / `--repo-root=<dir>` beats every heuristic.
- A consumer checkout at the process working directory (marker `.git`,
  `.ws/config.json`, or `package.json`) is the resolved root when present.
- Otherwise the resolved root is the global **install root** (the directory that
  contains the active skills tree, e.g. `<home>/.agents` for
  `<home>/.agents/skills/ws-*`) — never the install **parent** (`<home>`).
- A no-marker working directory degrades to a `cwd-fallback` root and emits a
  WARNING naming the root and its provenance.
- An unevaluable parity check is reported (skip record with the missing manifest
  path) rather than silently passing; on a real package root carrying `bin/`
  the missing manifest is a CRITICAL.
- Node 22 CommonJS `.cjs` only; no new runtime dependency; no Python.

## 1. Definition of Ready & Scope

Resolved assumptions (spec `## Assumptions & Open Questions`): explicit-skip
posture with exit 0 preserved for a global-only install; resolved root = global
install root when no consumer checkout is detectable; consumer markers checked
only at cwd (no parent walk); additive `--json` keys.

Measurable ACs: AC1 provenance in `--json`; AC2 consumer-checkout precedence;
AC3 install-root fallback; AC4 discard the install parent; AC5 parity skip record
naming the missing manifest; AC6 skip visible in `--json` + markdown; AC7
CRITICAL on a real package root with a missing manifest; AC8 degraded-resolution
WARNING; AC9 `--report` inside the resolved root; AC10–AC13 strengthened
regression test for the `<home>/.agents/skills` shape without `.git`.

In scope files (bounded): `.agents/skills/ws-check-workflows/scripts/check_workflows.cjs`,
`test/test-check-workflows-global-root.js` (registered in `test/test-suites.json`),
generated integrity artifacts, version mirrors, and doc/site sync.

Out of scope: re-delivering the #504 fix; installer payload changes; redefining
`resolve_consumer_root.cjs` / `detect_install_mode.cjs`; non-resolution checks;
`--fix` / `--yes` rework; non-Node helpers; recording the root in workflow state.

## 2. Technical Design & Architecture

Layer edits (`node-skills-package`; layers `skills-sot` / `tests` / `installer-cli`):

- Behavior owner: `.agents/skills/ws-check-workflows/scripts/check_workflows.cjs`
  - Replace `findRepoRoot(startDir, explicitRoot)` with
    `resolveRepoRootInfo({ explicitRoot })` returning `{ root, source }` where
    `source ∈ { explicit-flag, consumer-checkout, install-root, cwd-fallback }`.
  - `isConsumerCheckout(dir)`: markers `.git`, `.ws/config.json`, `package.json`
    at **cwd only** (no parent walk).
  - `installRoot = path.dirname(SCRIPT_SKILLS_DIR)`; `installParent = dirname(installRoot)`;
    discard any candidate equal to `installParent` (AC4).
  - `loadDependencies()` parity branch: run the shared-vs-bin comparison only when
    **both** manifests exist (`checked`); otherwise emit a `skipped` record naming
    the missing manifest path, unless the resolved root is a real package root
    (`bin/skill-dependencies.json` or `bin/cli.js`) where the missing manifest is
    a CRITICAL (AC5–AC7).
  - `generateReport()`: add a "Repo-level checks" section showing the resolved
    root, provenance, and each check's `checked`/`skipped` status with reason (AC6).
  - `main()` `--json`: additive keys `resolvedRoot`, `resolutionSource`, `checks`
    (AC1, AC6). Keep `{ status, issues, simulations }` unchanged for readers.
  - `--report` writes `path.join(REPO_ROOT, 'ws-check-workflows-report.md')`
    (already root-based; now the root is correct) (AC9).
- Reuse decision (spec D2/D4): consume the shared contract's `inside()` and
  global-root awareness from `{skillsRoot}/ws-shared/runtime/scripts/resolve_consumer_root.cjs`
  on a best-effort `require` with an in-process fallback, so a partial tree
  degrades instead of crashing. The AC2 marker set (`.git` / `package.json`) is
  **not** implemented by the shared `resolveRepoRoot()` (which keys on
  `.ws/config.json` only), so consumer detection stays local per D4; redefining
  the shared module is out of scope.
- Regression owner: `test/test-check-workflows-global-root.js` — extend the #504
  assertions (keep the existing `--repo-root` / loud-failure / local PASS checks)
  with the `<home>/.agents/skills` fixture (no `.git`), install-root fixture,
  skip record, `--report` scope, and degraded WARNING (AC10–AC13, NS1–NS10).

Reference patterns: `resolve_consumer_root.cjs` (`inside`, `resolveKnownGlobalSkillsRoots`),
sibling gate scripts' `--repo-root` parsing.

Invariants: Node-only `.cjs`; explicit `node` launcher; dash-flags normalize with
loud unknown-flag failure (exit 2); `=`-form slice counts `=`;
`bin/skill-integrity.json` regenerated in the same change.

## 3. Step-by-Step Plan

- T01 — Resolver rewrite in `check_workflows.cjs`: `resolveRepoRootInfo`,
  `isConsumerCheckout`, install-root/install-parent handling, provenance
  (AC1–AC4, AC8, AC9). Editing: `.agents/skills/ws-check-workflows/scripts/check_workflows.cjs`.
  Checks: `node --check`; global checkout fixture resolves to the checkout;
  no-marker fixture resolves to `<home>/.agents`.
- T02 — Parity reporting: skip record + CRITICAL-on-package-root + report/json
  surface (AC5–AC7). Editing: same script. Checks: global-only fixture skip
  record naming `<root>/bin/skill-dependencies.json`; package-root fixture with
  a missing shared manifest → CRITICAL exit 1.
- T03 — `--json` / markdown diagnostics: `resolvedRoot`, `resolutionSource`,
  `checks` (AC1, AC6). Editing: same script. Checks: parse payload on each fixture.
- T04 — Strengthen `test/test-check-workflows-global-root.js` (AC10–AC13,
  NS1–NS10) and confirm `test/test-suites.json` registration. Editing:
  `test/test-check-workflows-global-root.js`, `test/test-suites.json` (no change
  expected).
- T05 — Sibling sweep + stack invariants: sweep for other install-parent
  heuristics; run `scan_stack_invariants.cjs`, `node test/test-harness-clean.js`,
  the targeted suite, and the full `npm run test`.
- T06 — Integrity + version + docs: `npm run generate-integrity` +
  `npm run verify-integrity`; `npm run build-site:bump` (0.5.42 → 0.5.43);
  sync `README.md` / `AGENTS.md` / `.ws/AGENTS.md` / `FEATURES.md` only where the
  change is described; rebuild `docs/index.html`.

## 4. Permissions, Tenancy & i18n

RBAC: N/A because this is a local CLI gate with no user roles or endpoint
protection surface. Tenancy: N/A because a single-repo skill package has no
tenant isolation boundary. i18n: N/A because the harness is English-only.

## 5. Test Coverage

- AC1 → payload assertion: `resolvedRoot` + `resolutionSource` present with a
  vocabulary value on every fixture.
- AC2 → consumer-checkout fixture (cwd carries `package.json`) asserts the
  resolved root equals the checkout.
- AC3 → no-marker fixture asserts the resolved root equals `<home>/.agents`.
- AC4 → install-root fixture asserts the root is never `<home>` (install parent).
- AC5/AC6 → global-only fixture asserts a `skipped` dependency-parity record
  naming `<root>/bin/skill-dependencies.json` in the payload and markdown.
- AC7 → package-root fixture with `bin/skill-dependencies.json` present and
  `ws-shared/runtime/skill-dependencies.json` absent → CRITICAL exit 1.
- AC8 → lone-script fixture asserts a degraded-resolution WARNING naming the root.
- AC9 → `--report` fixture asserts the report lands inside the resolved root and
  not in the install parent.
- AC10 → regression asserts the reported resolved root + provenance for the
  `<home>/.agents/skills` fixture.
- AC11 → regression fixture carries no `.git` inside the global install tree yet
  still asserts the expected resolved root.
- AC12 → global-only fixture asserts the dependency-parity skip record naming the
  missing manifest path.
- AC13 → consumer-cwd fixture asserts the resolved root equals the checkout and
  no file is written into the install parent.
- NS1–NS10 → red-first scenarios (see spec `## Negative & Failing Test Scenarios`).

## 6. Stack & Security Invariants Verification Plan

Touched framework boundary: `node-skills-package` (Node 22 CommonJS CLI, no
network/auth surface).

- Authorization & endpoint protection: N/A because no HTTP routes or guards;
  verify `grep -n "auth\|token" check_workflows.cjs` shows no new auth path.
- Concurrency & async safety: no new async; `spawnSync` usage unchanged; verify
  with `node --check` and a manual read of the edited regions.
- Input validation: `--repo-root` value validated via `path.resolve`;
  `isConsumerCheckout` uses `fs.existsSync` only; unknown flags still exit 2.
- Path containment: the resolved root is a real directory found from cwd or the
  script tree; `--report` is joined to the resolved root only.
- Stack rule pack: `node {skillsRoot}/ws-shared/runtime/scripts/scan_stack_invariants.cjs`;
  `node test/test-harness-clean.js` (0 findings); `npm run test`.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected.
- [ ] Domain entities and mappings encapsulated.
- [ ] Schema migrations created.
- [ ] Authorization checks applied.
- [ ] Stack & security invariants verified (auth, async, validation, cleanup).
- [ ] i18n keys declared.
- [ ] Test cases cover all ACs.

## 8. Open Questions

- None blocking. Minor: reuse the shared resolver vs repair in place — resolved
  as a hybrid in §2 (consume `inside()` best-effort; keep the AC2 marker set
  local per context D4); the ACs are behavior-based so both routes are
  comparable, and redefining the shared module is out of scope.
