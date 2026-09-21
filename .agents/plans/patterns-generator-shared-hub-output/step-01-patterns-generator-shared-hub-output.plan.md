---
slug: patterns-generator-shared-hub-output
title: Integrate ws-self-learning with the patterns track and store the generated ws-project-patterns body under the shared hub
status: completed
workflowType: lite
step: 1
workflowId: patterns-generator-shared-hub-output-20260921T134516Z
startedAt: "2026-09-21T13:45:16Z"
endedAt: "2026-09-21T13:49:50.670Z"
acRefs: []
---
## 0. Summary & Business Rules

Move the generator-owned skill body out of the published skills tree and into the shared project hub, then complete the recorded integration analysis between `ws-self-learning` and the patterns track.

Business rules:

- The generated body is **consumer-owned** content: it lives at `{sharedDir}/ws-project-patterns/SKILL.md` (default `.ws/ws-project-patterns/SKILL.md`), is tracked in git, and is never shipped or overwritten by the installer.
- The body is **autoload-only**: it is loaded through its Always-applied row in `{sharedDir}/autoload.md`, not through skills-root discovery. The row exists only while the body exists.
- Memory ownership is unchanged: `ws-self-learning` owns `MEMORY.md`/`memory/` and vault traps; the generator writes neither.
- Security: every write stays inside the repository. Containment is decided on the **fully resolved** target path (linked root, linked generated dir, dangling leaf), failing closed when resolution is impossible (MEMORY trap "Write containment must resolve the full target path").
- Harness integrity: the generated body must not enter `bin/skill-integrity.json`, and the id must stay in `externalSkills` so the installer excludes it and Phase 5a gates do not treat it as a managed package dir.

## 1. Definition of Ready & Scope

Schedule: full — this plan covers all 16 ACs directly (lite has no interview step; unresolved items are recorded in §8).

Resolved assumptions (from the spec's Assumptions table): hub path `{sharedDir}/ws-project-patterns/SKILL.md`; tracked; no legacy migration; autoload-only loading; generator ships in the base branch (PR #383 present in `develop`, this plan's baseline `f5696827`).

Out of scope (spec table): merging the two skills, generator memory writes, spec-memo edits, migration of legacy `{skillsRoot}/ws-project-patterns`, harvest/bullet-format changes, skills-root discovery, daemons/cross-project sharing/embeddings, reviving retired `ws-patterns-*`, unrelated managed bodies, git automation.

## 2. Technical Design & Architecture

Layers touched (per `config.json.stack.backend.layers`): `skills-sot` (`.agents/skills`), `installer-cli` (`bin`), `tests` (`test`), plus consumer-hub content (`.ws`, `hub-layout.json`, templates).

### 2.1 Generator script — `skills-sot`

`.agents/skills/ws-patterns-generator/scripts/seed_generated_skill.cjs`

- Resolve the hub root: `pathTokens.sharedDir` from `{repoRoot}/.ws/config.json` when present and non-empty, else `.ws`; validate it resolves inside the repo (same refusal message semantics).
- Target becomes `{hubRoot}/ws-project-patterns/SKILL.md`; keep `GENERATED_ID` and the skeleton, keep "write only when missing", keep `--dry-run` printing `planned:`.
- Keep the round-3 containment gate unchanged in shape: `rootReal = realpathSync(root)`, `targetReal = realpathLoose(target)`, refuse when `!targetReal || !targetReal.startsWith(rootReal + sep)`. `realpathLoose` keeps the `lstat` probe + `null` on unresolvable leaves.
- `mkdirSync(dirname(target), { recursive: true })` before write stays; the lexical pre-check becomes hub-based (`target.startsWith(hubRoot + sep)`).

### 2.2 Generator body — `skills-sot`

`.agents/skills/ws-patterns-generator/SKILL.md`

- Update step 1/2 paths (`{sharedDir}/ws-project-patterns/SKILL.md`), the seed command, the autoload-table location (`{sharedDir}/autoload.md`), and the rules bullet that currently implies the skills root.
- State explicitly: autoload-only loading, hub-hosted body, installer-excluded id, no MEMORY writes.

### 2.3 Autoload resolver — `skills-sot`

`.agents/skills/ws-configure-project/scripts/configure_autoload.cjs`

- `generatorManagedTreeExists(repoRoot, skillId)` becomes hub-relative: `{sharedDir}/{skillId}/SKILL.md`; drop the global-skills fallback for generated ids (project-local by definition).
- `emitSkillPath` keeps managed-skill behavior for normal ids; generated ids emit the hub-relative path (e.g. `.ws/ws-project-patterns/SKILL.md`) so membership rows point at the real file.
- `dropExternalCompanionMembers` semantics stay: row kept only when the generated tree exists.
- `renderConsumerAutoload` must not rewrite the hub-path row into a `{skillsRoot}` token.

### 2.4 Hub classification — consumer hub + templates

- `.agents/skills/ws-shared/runtime/hub-layout.json`: classify `ws-project-patterns` as consumer-owned, tracked content (either a new category `generatedConsumerSkills` with `sourceControl: track-when-maintained`, or an added path under `consumerOwned` with a note). Whatever is chosen must be reflected in `README.md`/`AGENTS.md` hub prose and validated by `test/test-ws-shared-layout.js`.
- `.agents/skills/ws-shared/templates/hub.gitignore`: confirm the new path is **not** ignored; adjust only if a broad rule would match it.

### 2.5 Installer metadata — `installer-cli`

- `bin/skill-dependencies.json` and its runtime mirror `.agents/skills/ws-shared/runtime/skill-dependencies.json`: keep `externalSkills` `{ id: ws-project-patterns, sourcePackage: consumer, generatorManaged: true }`; update any `note` text that still describes a skills-root location. No new dependency edges.
- `bin/cli.js` needs no logic change (exclusion already exists); add/keep the installer test assertions.

### 2.6 Integration half — analysis and measured reduction

- Complete the overlap matrix + plan + performance baselines in `.agents/specs/0114-patterns-generator-shared-hub-output.context.md`.
- Candidate shared surface: harvest readers over `{plansDir}` state/telemetry/logs, changelog, MEMORY, README/AGENTS.md, `rules.*`, wiki, stack file (both skills read these). Extract only if the same read shape is duplicated in code (not prose); otherwise record "no-op path: prose-level collaboration" with evidence.
- Any behavioral feature requires a config flag + tests + docs; otherwise it stays an analysis finding.

### 2.7 Docs — hubs, human docs, site

Root `AGENTS.md`, `.ws/AGENTS.md`, `README.md`, `CATALOG.md`, `FEATURES.md`, `docs/index.html` (rebuild via `node bin/build-site.js`), plus the wiki pages that name the generated path.

## 3. Step-by-Step Plan

1. **Generator output move** — edit `seed_generated_skill.cjs` (hub root + target + lexical gate + comments) and `ws-patterns-generator/SKILL.md`. Files: `.agents/skills/ws-patterns-generator/scripts/seed_generated_skill.cjs`, `.agents/skills/ws-patterns-generator/SKILL.md`. Checks: `node --check` on the script; run `node ... --repo-root .` in a temp fixture (AC1, AC2).
2. **Batteries for the generator** — rewrite `test/test-ws-patterns-generator.js` expectations: seeded path under `.ws/`, hub-root symlink refusal, linked generated dir refusal, dangling leaf refusal, in-repo link positive controls, `--dry-run` writes nothing, rerun byte-identical, no `{skillsRoot}/ws-project-patterns` created, integrity check still 0 (AC1–AC3).
3. **Autoload resolver + fixtures** — `configure_autoload.cjs` hub-relative generated tree + hub-path row; update `test/test-autoload-configure.js` (row present when tree exists, dropped when absent, not duplicated, path is hub-relative) (AC4).
4. **Hub layout + ignore template** — `hub-layout.json` classification + `templates/hub.gitignore` verification; update `test/test-ws-shared-layout.js` (AC6).
5. **Installer metadata/tests** — `skill-dependencies.json` (+ mirror) note text, installer exclusion assertions in `test/test-ws-patterns-generator.js` / `test/test-install.js` if it asserts counts; confirm `installed-skills.json` never gains the id (AC5).
6. **Integration analysis + measured reduction** — fill the companion matrix/plan baselines; implement only code-level duplication removal that is surgical; measure `npm run test` wall time, `seed_generated_skill.cjs` runtime, and body bytes before/after (AC7–AC12).
7. **Docs + site** — hubs, README/CATALOG/FEATURES, `docs/index.html` rebuild (AC6).
8. **Version + integrity** — one `package.json` bump (strictly above merge-base), aligned `packageVersion` in `bin/skill-dependencies.json` + site footer, `npm run generate-integrity` + `npm run verify-integrity` (AC15).
9. **Full verification** — `npm run test`, `ws-check-harness`, secrets review, `scan_stack_invariants.cjs` (AC13, AC14, AC16).

Dependency order: 1 → 2 → 3 → 4 → 5 → 7 (docs after behavior is frozen) → 6 (analysis can run in parallel with 1–5 but lands last) → 8 → 9.

## 4. Permissions, Tenancy & i18n

- No RBAC/permissions surface (no server endpoints). The only privileged surface is filesystem write containment, covered in §6.
- No tenancy/multi-tenant data paths; the repo is single-project.
- i18n: bodies stay en-us; no localization keys are introduced.

## 5. Test Coverage

| AC | Test case(s) / command | File |
|----|------------------------|------|
| AC1 | `seed writes hub body`, `seed rerun byte-identical`, `seed never overwrites existing body`, `--dry-run writes nothing`, `seed uses pathTokens.sharedDir` | `test/test-ws-patterns-generator.js` |
| AC2 | `seed refuses symlinked hub root`, `seed refuses symlinked generated dir`, `seed refuses dangling leaf symlink`, `in-repo link seeds through` | `test/test-ws-patterns-generator.js` |
| AC3 | `no skills-root body created`, `integrity --check exit 0 with body present` | `test/test-ws-patterns-generator.js` |
| AC4 | `generated row present when hub tree exists`, `row dropped when tree absent`, `row never duplicated`, `row path is hub-relative`, `configure --write-autoload exit 0` | `test/test-autoload-configure.js` |
| AC5 | `disk scan excludes external ids`, `generated id stays out of manifest`, `uninstall leaves hub body byte-identical` | `test/test-ws-patterns-generator.js`, `test/test-install.js` |
| AC6 | `hub-layout classifies generated consumer skill`, `ignore template keeps body tracked`, docs drift assertions | `test/test-ws-shared-layout.js`, doc tests |
| AC7 | companion overlap matrix present with per-pair recommendation (content check) | `.agents/specs/0114-*.context.md` (+ plan review) |
| AC8 | companion plan fields present: file list, mechanism, targets, non-goals, rollback/no-op | same |
| AC9 | `npm run test` green after reduction; before/after pointers recorded | suite + companion |
| AC10 | measured wall time / script runtime / body bytes with no >10% regression | companion Performance Baselines |
| AC11 | any new feature has flag + test + doc (or none shipped) | suite + docs |
| AC12 | `read-memory`/`update-memory` contracts untouched; no MEMORY writes from the generator | `test/test-ws-patterns-generator.js` + review |
| AC13 | `scan_stack_invariants.cjs --stack typescript-node` exit 0; `node --check` on changed `.cjs` | scripts |
| AC14 | `node test/test-ws-patterns-generator.js`, `node test/test-autoload-configure.js`, `node test/test-ws-shared-layout.js`, `node test/test-external-companion-skills.js`, `npm run test`, `ws-check-harness` | suite |
| AC15 | version strictly above merge-base; `generate-integrity` + `verify-integrity` exit 0 | manifest + suite |
| AC16 | secrets review clean; anonymization check on changed prose/body | `ws-secrets-leak-review` |

Negative scenarios (spec § Negative & Failing Test Scenarios) map onto the same batteries: skills-root write, escape via link, integrity drift, stale/duplicated autoload row, installer-managed id, stale docs, missing plan fields, test-time regression, memory-contract change, invariant findings, secrets.

## 6. Stack & Security Invariants Verification Plan

Stack pack: `{skillsRoot}/ws-shared/runtime/stacks/typescript-node.md` (Node-subset rules).

Touched framework boundaries:

- **Filesystem write containment (authorization-equivalent here):** every generator write is gated by `realpathLoose(target)` containment against `rootReal`, including the hub path; refusal exits non-zero and writes nothing. Verify with the three link fixtures in `test-ws-patterns-generator.js`.
- **Input validation / DTO boundary:** `--repo-root` must exist and be a directory; `pathTokens.sharedDir` is read defensively (non-string/empty → `.ws`) and the resolved hub must stay inside the repo.
- **Concurrency & async safety:** scripts are synchronous CommonJS; no floating promises introduced; `node --check` plus `scan_stack_invariants.cjs` must report no new findings.
- **Lifecycle/cleanup:** no handles/streams opened beyond `readFileSync`/`writeFileSync`; no temp files left behind.
- **Autoload row lifecycle:** row existence is derived from the hub tree, never duplicated, and dropped when the tree is absent (prevents a dangling Always-applied entry).
- **Integrity/exclusion:** generated content never enters `bin/skill-integrity.json`; `externalSkills` keeps the installer exclusion.
- **Secrets/PII:** generated body and companion stay en-us, host-neutral, anonymized to failure classes; secrets review must be clean.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (`skills-sot`, `installer-cli`, `tests`, hub/templates).
- [ ] Generated body lives under `{sharedDir}`; no skills-root artifact.
- [ ] Autoload row hub-relative, single, existence-driven.
- [ ] Installer exclusion + `externalSkills` unchanged and asserted.
- [ ] Stack & security invariants verified (containment, validation, async, lifecycle).
- [ ] i18n keys declared (none required).
- [ ] Test cases cover all ACs and negative scenarios.
- [ ] Docs/site updated; version bumped; integrity regenerated.
- [ ] Companion analysis/plan/measurements filled.

## 8. Open Questions

1. **Integration reduction may be a no-op.** If the analysis finds no code-level duplication between `ws-self-learning` and `ws-patterns-generator` (only shared *sources*, which are read by reference), AC9/AC10 are satisfied by the documented no-op path plus measurements. Decision recorded in the companion; no forced refactor.
2. **Hub-layout shape.** New `generatedConsumerSkills` category versus adding `ws-project-patterns` to `consumerOwned.paths`. Decided in Step 4 based on `test-ws-shared-layout.js` expectations and doc prose readability.
3. **Concurrent-session interference.** Another session commits broadly on `develop` (it already committed this workflow's spec work). If it commits `{plansDir}` artifacts or product files mid-run, re-check `git log` before each G2-code commit and re-baseline if the tree moved.
4. **Ship shape.** `branchStrategy: stay` on `develop` means ship reuses the open PR #383 (develop → main) as the head; if that PR merges first, ship must open a fresh PR for the remaining commits.
