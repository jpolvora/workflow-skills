---
id: null
slug: ws-check-harness-install-mode-clean-audit
title: "ws-check-harness install-mode detection and upstream clean-audit invariant"
source: local
specDate: 2026-09-16
status: completed
---

# Specification — ws-check-harness install-mode detection and upstream clean-audit invariant

## Description

`ws-check-harness` modeled installs as binary (`upstream` | `consumer`). A machine that carries a global `ws-*` install next to the upstream SoT (the common authoring layout) was tolerated but never detected or reported, consumer project-local vs global-only installs were collapsed into one label, and the upstream tree itself carried real findings (hub runtime links one directory short, a stale prefixed-spec link, bare `ws-shared/` shorthand) with no release-time proof that a clean run is even possible.

This spec delivers a deterministic front end for the audit: a Phase 0 detector that classifies **Install mode** (`upstream` | `consumer` | `none`) plus **Install scope** (`upstream` | `project` | `hybrid` | `global` | `none`) with coexistence evidence for the upstream + machine-global case; a link/path/shorthand/routing gate (`check_harness_links.cjs`); and an upstream self-audit test (`test/test-harness-clean.js`) that enforces the invariant "a run at the package root reports zero findings". The agent-driven qualitative phases (5/5b/5c) remain the judgment layer. CI runs the deterministic proof non-blocking on `main` and publishes a report artifact.

## Acceptance Criteria

- AC1: `detect_install_mode.cjs --json --repo-root {repoRoot}` exits 0 and emits `installMode`, `installScope`, `skillsScanRoots`, `primaryHub`, `integrityGate`, `evidence`, `coexistence`, `warnings`, `notes`; human output prints `Install mode:` and `Install scope:` lines.
- AC2: Upstream mode requires package markers (`bin/skill-dependencies.json` + `bin/cli.js`) **and** SoT (`≥1 .agents/skills/ws-*/SKILL.md`); markers without SoT resolve `consumer` plus a markers-without-SoT warning.
- AC3: Upstream + machine-global coexistence keeps `installMode: upstream`, scan root `.agents/skills` only, and records global count, version, drift (`same` | `ahead` | `behind`), and global ids outside the package (`externalSkills` excluded); it never flags duplicate `name:` across trees.
- AC4: Consumer scope resolves `project` (local only), `hybrid` (local + global; local first, then `{globalSkillsRoot}` fallback), or `global` (global only, project-hub config precedence).
- AC5: No ws-* `SKILL.md` in either tree resolves `installMode: none` with guidance warning; the audit stops instead of scanning an empty inventory.
- AC6: SKILL.md, PHASES.md, and REPORT-FORMAT.md document mode/scope/coexistence, Phase 0 requires running the detector, and the report header carries Install mode, Install scope, Skills scan root(s), and Coexistence.
- AC7: `check_harness_links.cjs` exits 1 on broken internal links, author-machine absolute paths, declared tokens inside Markdown link targets, bare `ws-shared/` shorthand (excluding rule text and link labels), or unrouted ws-* skills; exits 0 on the upstream tree.
- AC8: `test/test-harness-clean.js` runs the detector, `check_duplicates.cjs`, `measure_harness.cjs`, `check_shell_quoting.cjs`, `check_pipeline_handoff.cjs`, `check_harness_links.cjs`, and `generate-skill-integrity.js --check`, prints `Harness OK (upstream clean)`, exits 0 only at zero findings, and writes a Markdown report when `--report <path>` is passed.
- AC9: The previously reported upstream findings are fixed: runtime hub links resolve at four levels, `STACK.md`/`templates/STACK.md.example` point at `runtime/tools.md`, `RESEARCH.md` cites the prefixed `0050-…` spec, and bare shorthand is tokenized in skill/hub bodies.
- AC10: `deploy-site.yml` gains a non-blocking `harness-audit` job on `main` (`continue-on-error`) that runs the clean audit and uploads `harness-clean-report` via `if: always()`.
- AC11: `test/test-check-harness-install-mode.js` covers upstream+global, markers-without-SoT, project, hybrid, global-only, none, and the real repo; both new tests are registered in the `tests` and `tests:remote` chains.
- AC12: Docs stay in sync: root `AGENTS.md` states the self-audit invariant, `CATALOG.md` ship row 8 cites `test-harness-clean.js`, `FEATURES.md` records the capability at 0.4.33, evals cover mode/scope/coexistence, and `npm run verify-integrity` exits 0 at the bumped version.

## Notes

### Design Intent

The audit contract was modified, not created. Evidence for the change: (a) an upstream session on a machine with a global install produced the same detection label as a bare clone while the coexistence signal was implicit; (b) consumer docs treated `{skillsRoot}` and `{globalSkillsRoot}` installs as one case, leaving global-only trees under-specified; (c) the upstream tree failed its own audit on link depth and shorthand, so "clean run" was aspirational rather than provable; (d) the release action had no machine-checkable harness evidence.

Design constraints applied:

- Deterministic gates stay script-only; the qualitative Phases 5/5b/5c remain agent-run (a CI job cannot judge redundancy). The clean test intentionally covers the deterministic subset only.
- Coexistence is evidence, never a finding: the global tree is installer-managed, and the hub's invoke-vs-edit rule already governs body reads.
- `CATALOG.md` has a hard 24000-byte budget (`test/test-context-budget.js`); the ship-row addition was offset by tightening adjacent wording.
- Portable vocabulary only: `{skillsRoot}` / `{globalSkillsRoot}` tokens, no host-product coupling in scripts or docs.

Delivered artifacts: `detect_install_mode.cjs`, `check_harness_links.cjs`, `test-harness-clean.js`, `test-check-harness-install-mode.js`, SKILL/PHASES/REPORT-FORMAT updates, evals 3–5, deploy-site job, doc sync (root `AGENTS.md`, `CATALOG.md`, `FEATURES.md`, hub docs), version 0.4.33, and the finding fixes from AC9. Implementation and verification are complete on `develop`; commit/PR is the remaining release step.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-pruning stale global folders (`ws-karpathy-guidelines`) | Installer `update` owns pruning; the detector reports only |
| Blocking the release on audit findings | Explicit artifact-only policy for `main` deploy |
| Host-specific global roots (`.claude`, `.gemini`, `.codex`) | Contract roots are `{globalSkillsRoot}` / `WORKFLOW_SKILLS_GLOBAL_DIR` only |
| Replacing agent-driven Phases 5/5b/5c judgment with scripts | Redundancy/role/composition review is not mechanically decidable |
| Runtime monitoring or scheduled drift polling of global installs | Detector is a point-in-time, read-only evidence snapshot |
| Fixing unrelated catalog content or the site announcement badge | Separate doc hygiene; keeps this diff surgical |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Global root resolution | `WORKFLOW_SKILLS_GLOBAL_DIR` else `~/.agents/skills` | Matches the shared resolver contract used by every ws-* script | y |
| Global version sampling | Representative skill frontmatter (`ws-check-harness` → `ws-tdah` → `ws-spec-to-pr` → `ws-senior-developer`), else most frequent version | Robust when a global install is partial or stale | y |
| Coexistence severity | Informational notes in the detector and report | Global tree is consumer-managed; invoke-vs-edit rule covers body reads | y |
| Clean-test scope | Detector + five mechanical gates + integrity only | CI cannot run judgment; qualitative phases stay with the agent audit | y |
| Input validation / bounds / rate limits / data lifecycle / concurrency | N/A because this is a local read-only filesystem audit with no network, no writes, and no shared mutable state | Only file presence, link resolution, and exit codes are observable | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Detector, link gate, clean test, mode tests, docs, CI job, version 0.4.33 | Diff vs AC1–AC12 |
| Atomic criteria | Each AC maps to a named script, test, or doc line | Reviewer checklist plus `check_harness_links.cjs` |
| Failure modes | Broken links, markers-without-SoT, duplicate-id false positives, stale integrity | AC2, AC3, AC7, AC8, NS1–NS5 |
| Observation telemetry | Detector JSON, clean-test stdout, report artifact, integrity exit code | Validation & Observation Notes |
| Open blockers | None | N/A |
| Stack invariants | Node 22 `.cjs`; no new runtime deps; en-us; catalog 24 KB budget respected; hashed content regenerated | `npm run verify-integrity`, `test-context-budget.js`, `test-script-resilience.js` |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs --repo-root .` prints `Install mode: upstream`, `Install scope: upstream`, scan root, integrity gate, and coexistence notes.
- `node test/test-harness-clean.js` prints one line per gate and ends with `Harness OK (upstream clean) — 0 findings.` (exit 0); `--report <path>` writes the Markdown artifact uploaded by CI.
- `npm run verify-integrity` prints `OK: bin\skill-integrity.json matches tree (v0.4.33)`.
- GitHub Actions `deploy-site.yml` job `harness-audit` uploads artifact `harness-clean-report` on `main`; job failure never blocks deploy.

### Negative & Failing Test Scenarios

- NS1: Upstream tree with one broken hub link → clean test exits 1 and names file:line (observed pre-fix with `runtime/AGENTS.md:157`); fail AC8/AC9.
- NS2: Markers present without SoT → detector must not report `upstream`; expects consumer scope + warning; fail AC2 if regressed.
- NS3: Upstream SoT plus a global install → scan roots must stay `.agents/skills` and no duplicate-id collision may be emitted; fail AC3 if the global tree leaks into inventory.
- NS4: A declared token inside a Markdown link target (`](…{sharedDir}…)`) → `check_harness_links.cjs` exits 1; fail AC7 if it passes.
- NS5: `package.json` version diverging from `bin/skill-dependencies.json` or stale digests → clean test fails the package-hygiene and integrity checks; fail AC8/AC12.
