---
slug: us-508
title: "check_workflows.cjs: resolver returns the parent of the global install (home directory) and silently skips the dependency parity check"
status: completed
step: 2
workflowId: us-508-20261013T005850Z
startedAt: "2026-10-13T01:01:55.175Z"
endedAt: "2026-10-13T01:01:55.175Z"
acRefs: []
---
## 0. Summary & Business Rules

Refined plan of record (see `step-02-us-508.plan-interview.md`). Finish the
residual repo-root resolution defect in
`.agents/skills/ws-check-workflows/scripts/check_workflows.cjs` and make the
shared-vs-bin dependency parity check report itself when its target cannot be
resolved.

Business rules (unchanged): explicit `--repo-root` first; consumer checkout at
cwd next; else the global install root (`<home>/.agents` for
`<home>/.agents/skills/ws-*`), never the install parent; a degraded root emits a
WARNING; an unevaluable parity check emits a skip record naming the missing
manifest, and fails closed (CRITICAL) only on a real package root; Node 22
CommonJS only.

## 1. Definition of Ready & Scope

Measurable ACs AC1–AC13 (see `step-00-us-508.spec.md`). In-scope files bounded to
`check_workflows.cjs`, `test/test-check-workflows-global-root.js`, generated
integrity artifacts, version mirrors, and doc/site sync. Out of scope: the #504
delivery, installer payload, redefining sibling resolvers, non-resolution checks,
non-Node helpers.

## 2. Technical Design & Architecture

Behavior owner `.agents/skills/ws-check-workflows/scripts/check_workflows.cjs`:

- `resolveRepoRootInfo({ explicitRoot })` → `{ root, source }`,
  `source ∈ { explicit-flag, consumer-checkout, install-root, cwd-fallback }`:
  1. `explicitRoot` → `explicit-flag`.
  2. `isConsumerCheckout(cwd)` (markers `.git`, `.ws/config.json`,
     `package.json`, **cwd only**) → `consumer-checkout`.
  3. `installRoot = path.dirname(SCRIPT_SKILLS_DIR)`;
     `installParent = path.dirname(installRoot)`; discard any candidate equal to
     `installParent` (AC4); return `installRoot` → `install-root`.
  4. else `cwd` → `cwd-fallback` (AC8 WARNING).
- Shared-contract reuse (refinement F1/F2): best-effort
  `require('{SCRIPT_SKILLS_DIR}/ws-shared/runtime/scripts/resolve_consumer_root.cjs')`
  for `inside()`; local fallback when unreachable. The AC2 marker set stays local
  (context D4); the shared module is not redefined (out of scope).
- `loadDependencies()` parity (refinement F3):
  - both manifests present → compare; `checked`.
  - otherwise, if the resolved root carries `bin/skill-dependencies.json` or
    `bin/cli.js` and a manifest is missing → CRITICAL (AC7).
  - otherwise → `skipped` record naming the missing manifest path (AC5).
- `generateReport()` gains a "Repo-level checks" section (resolved root,
  provenance, parity `checked`/`skipped` + reason) (AC6).
- `main()` `--json` adds `resolvedRoot`, `resolutionSource`, `checks` while
  keeping `{ status, issues, simulations }` (AC1, AC6).
- `--report` writes inside the resolved root (AC9).

Regression owner `test/test-check-workflows-global-root.js`: keep the #504
assertions; add the `<home>/.agents/skills` (no `.git`) checkout fixture,
install-root fixture, skip record, `--report` scope, and degraded WARNING
(AC10–AC13, NS1–NS10).

Invariants: Node-only `.cjs`; explicit `node` launcher; loud unknown-flag exit 2;
`=`-form slice counts `=`; integrity regenerated in the same change.

## 3. Step-by-Step Plan

- T01 — Resolver rewrite (`resolveRepoRootInfo`, `isConsumerCheckout`,
  install-root/install-parent handling, provenance). AC1–AC4, AC8, AC9.
- T02 — Parity reporting (`skipped` record, CRITICAL-on-package-root, md/json
  surface). AC5–AC7.
- T03 — Diagnostics (`resolvedRoot`, `resolutionSource`, `checks`). AC1, AC6.
- T04 — Strengthen the regression suite. AC10–AC13, NS1–NS10.
- T05 — Sibling sweep + `scan_stack_invariants.cjs` + `test-harness-clean.js` +
  `npm run test`.
- T06 — `generate-integrity` + `verify-integrity` + `build-site:bump` (0.5.42 →
  0.5.43) + doc/site sync.

## 4. Permissions, Tenancy & i18n

RBAC / tenancy / i18n: N/A (local CLI gate; single-repo package; English-only).

## 5. Test Coverage

AC1 → payload provenance on every fixture.
AC2 → consumer-checkout fixture resolves to the checkout.
AC3 → no-marker fixture resolves to `<home>/.agents`.
AC4 → install-root fixture asserts the root is never `<home>`.
AC5 → global-only fixture skip record names `<root>/bin/skill-dependencies.json`.
AC6 → skip visible in `--json` and the markdown report.
AC7 → package-root fixture (bin manifest present, shared absent) → CRITICAL exit 1.
AC8 → lone-script fixture emits the degraded-resolution WARNING.
AC9 → `--report` inside the resolved root, absent from the install parent.
AC10 → regression asserts the reported root + provenance.
AC11 → regression fixture has no `.git` in the global tree, still asserts the root.
AC12 → global-only fixture asserts the skip record naming the missing manifest.
AC13 → consumer-cwd fixture asserts root == checkout and no install-parent write.
NS1–NS10 → red-first scenarios per spec.

## 6. Stack & Security Invariants Verification Plan

Touched boundary `node-skills-package` (Node 22 CommonJS CLI, no network/auth).
- Authorization: N/A (no routes); verify no new auth path.
- Async: no new async; `spawnSync` unchanged; `node --check`.
- Input validation: `--repo-root` via `path.resolve`; unknown flags exit 2.
- Path containment: resolved root is a real directory; `--report` joined to it.
- Stack rule pack: `scan_stack_invariants.cjs`; `test-harness-clean.js` (0);
  `npm run test`.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected.
- [ ] Domain entities and mappings encapsulated.
- [ ] Schema migrations created.
- [ ] Authorization checks applied.
- [ ] Stack & security invariants verified (auth, async, validation, cleanup).
- [ ] i18n keys declared.
- [ ] Test cases cover all ACs.

## 8. Open Questions

- None blocking. Refinements F1–F3 folded into §2.
