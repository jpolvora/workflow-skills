---
slug: us-504
title: "check_workflows.cjs: findRepoRoot() mis-resolves repo root to ~/.agents when the global install dir is a git repo (19 false CRITICALs)"
status: "plan to be refined"
---

## 0. Summary & Business Rules

Fix `ws-check-workflows/scripts/check_workflows.cjs` so a global-only install whose global root contains `.git` resolves the skills tree correctly instead of reporting 19 false findings (18 CRITICAL + 1 WARNING). Business rules: explicit `--repo-root` override wins; skills-tree-aware resolution beats plain `.git` match; no behavior change for local project installs; Node 22 only with explicit `node` launcher; integrity regenerated from a clean tree.

## 1. Definition of Ready & Scope

Resolved assumptions: global skills live under `<globalRoot>/skills/ws-*` with `ws-shared/` present; `--repo-root` semantics mirror `ws-check-harness` gates (`--space` + `--equals` forms); no visual attachments; fallback prefers invoking working directory then global-dir hint over arbitrary ancestor index. All confirmed y.

Measurable ACs: AC1 global-tree PASS exit 0; AC2 skills-tree preference over install-dir self-match; AC3 `--repo-root <dir>` honored; AC4 both `--repo-root` forms take effect; AC5 no-marker fallback to cwd/global hint; AC6 regression fixture with `.git`-rooted ancestor containing the skills tree asserts zero false CRITICALs.

Out of scope: workflow simulation rewrite; install-mode/hub-relocation redesign; automatic repair of user `~/.agents` git layout.

## 2. Technical Design & Architecture

Layer edits (config `node-skills-package`, layers skills-sot/installer-cli/tests):

- Backend file: `.agents/skills/ws-check-workflows/scripts/check_workflows.cjs` — `findRepoRoot()` (lines 19-33), `resolveSkillsDir()` (35-50), `parseArgs()` (578-592), `printHelp()` (573-576), `REPO_ROOT`/`SKILLS_DIR` derivation (33/52).
- Reference pattern: `.agents/skills/ws-check-harness/scripts/check_harness_links.cjs` (`--repo-root` parse), `detect_install_mode.cjs` (`--repo-root` + install scope), `check_unique_runtime.cjs` / `check_shell_quoting.cjs` (equals-form handling).
- Design: resolve `SKILLS_DIR` first by walking up from `SCRIPT_DIR` to the directory containing `ws-shared/` + `ws-*` folders; derive `REPO_ROOT` as parent-minus-`.agents` when present; else honor explicit `--repo-root`; else prefer ancestor containing `.agents/skills` over plain `.git` match; else cwd/global hint; never `roots[2]` blind fallback. `resolveSkillsDir()` must accept the already-resolved skills dir instead of recomputing `<repoRoot>/.agents/skills` when it does not exist.
- Invariant checks: Node-only `.cjs`, explicit `node` launcher, dashed flags normalize to camelCase with loud unknown-flag failure, `=`-form slice counts `=`, EOL preserved, no `ws-*` rewrites outside target script + tests.

## 3. Step-by-Step Plan

- T01 — Resolver-first fix in `check_workflows.cjs`: implement skills-dir-first `findRepoRoot`/`resolveSkillsDir` chain; affected file `.agents/skills/ws-check-workflows/scripts/check_workflows.cjs`; engineering checks `node --check`, global-tree fixture PASS, local PASS unchanged.
- T02 — `--repo-root` CLI parity: add `--repo-root <dir>` + `--repo-root=<dir>` to `parseArgs()` with normalized option key, update `printHelp()` usage line; affected file same script; checks cover both flag forms asserting the parsed value took effect.
- T03 — Fallback hardening: replace `roots[Math.min(2, ...)]` fallback with cwd then global-dir hint; affected file same script; check no-marker fixture resolves sensibly.
- T04 — Regression fixture + suite: add fixture where script sits under a `.git`-rooted ancestor containing the skills tree; extend `test/test-check-workflows-automode.js` or dedicated suite (plus `test/test-suites.json` registration) with global-tree PASS, local PASS, both flag forms, unknown-flag loud failure; affected files `test/test-check-workflows-*.js`, `test/test-suites.json`.
- T05 — Defect-class sibling sweep + sabotage verification: repo-wide sweep for sibling `findRepoRoot`/`roots[2]` patterns; run `scan_stack_invariants.cjs` + full `npm run test`; affected sweep only (no sibling rewrites unless same defect proven).
- T06 — Integrity + version: `npm run generate-integrity` + `npm run verify-integrity` from clean tree, `npm run build-site:bump` patch bump per ship protocol; affected `bin/skill-integrity.json`, `package.json`, version mirrors, `docs/index.html`.

## 4. Permissions, Tenancy & i18n

RBAC: N/A because CLI gate script with no user roles or endpoint protection surface. Tenancy: N/A because single-repo skill package with no tenant isolation boundary. i18n: N/A because English-only harness banners and reports.

## 5. Test Coverage

- AC1 → global-tree fixture test: simulated `<globalRoot>` with `.git` + `skills/ws-*` asserts `check_workflows.cjs --json` reports PASS exit 0 (was 19 findings exit 1).
- AC2 → resolver preference test: install-dir self-match case asserts skills-tree ancestor wins; `SKILLS_DIR` resolves under `<globalRoot>/skills`.
- AC3 → `--repo-root <dir>` test: parsed value takes effect for all downstream probes.
- AC4 → `--repo-root=<dir>` test: equals-form slice offset verified; both forms covered.
- AC5 → no-marker fallback test: ancestor without markers resolves to invoking working directory, not arbitrary index.
- AC6 → regression suite test: fixture from AC1 committed and green in `npm run test`.
- NS1 → red test: pre-fix fixture reproduces 19 findings exit 1; post-fix PASS exit 0.
- NS2 → red test: missing `--repo-root` value fails loudly (exit 2 unknown argument path), never silent defaults.
- NS3 → local project install test: `.agents/skills` under real repo root unchanged PASS.
- NS4 → harness invariant scan: no new Python files, explicit launcher only.

## 6. Stack & Security Invariants Verification Plan

Touched framework boundaries for `typescript-node` (Node 22 CLI, no network/auth surface):

- Authorization & endpoint protection: N/A because no HTTP routes, policies, or guards in this script; verify no auth bypass introduced (`grep -n "token\|auth" check_workflows.cjs` shows no new auth path).
- Concurrency & async safety: zero floating promises in edited regions; `spawnSync` usage unchanged; verify with `node --check` + manual promise audit (no new async calls).
- Input validation & DTO boundary: CLI `--repo-root` value validated as directory path with containment (repo-relative, no traversal escape); unknown flags fail loudly exit 2; verify both flag forms + unknown-flag test; path joins use `path.resolve` with containment, never `userInput` concatenation into exec.
- Subscription & lifecycle cleanup: N/A because no streams, listeners, or DB connections; verify no new resource opens.
- Stack rule pack: run `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`; run `npm run test`; MEMORY traps applied (resolver precedence explicit→local→packaged→global, `=` slice counts `=`, dashed→camelCase normalize, PowerShell `key=value` payloads, EOL-preserving edits, clean-tree integrity).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected.
- [ ] Domain entities and mappings encapsulated.
- [ ] Schema migrations created.
- [ ] Authorization checks applied.
- [ ] Stack & security invariants verified (auth, async, validation, cleanup).
- [ ] i18n keys declared.
- [ ] Test cases cover all ACs.

## 8. Open Questions

- None blocking. Minor: fixture location (new `test/fixtures/` dir vs inline temp-dir construction) — chosen default: temp-dir fixture mirroring sibling harness tests; rationale: avoids committing a fake `.git` tree; confirmed y (assumed-default, autoMode model-inferred, non-blocking).
