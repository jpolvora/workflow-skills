---
id: 382
slug: patterns-generator-shared-hub-output
title: "Integrate ws-self-learning with the patterns track and store the generated ws-project-patterns body under the shared hub"
source: local
specDate: 2026-09-21
issueState: closed
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/382"
status: completed
---

# Specification — Integrate ws-self-learning with the patterns track and store the generated ws-project-patterns body under the shared hub

## Description

Two related gaps in the patterns track are delivered together.

**Integration.** `ws-self-learning` (anti-regression memory: local `MEMORY.md` plus `memory/` plus compile, vault via the spec-memo bridge, `read-memory`/`update-memory`, sanitize, traps with DO NOT / INSTEAD DO) and the patterns track (`ws-patterns-generator` plus the consumer-owned generated `ws-project-patterns` with evidence pointers and an autoload row) both harvest project knowledge. Self-learning owns memory writes; the generator owns steering prose and never writes MEMORY or vault traps. This spec requires a recorded overlap analysis across those skills and at least `ws-changelog`, `ws-spec-memo`, `ws-configure-project`, `ws-secrets-leak-review`, a draft integration plan with a bounded file list, mechanism, targets, and rollback, and then the approved duplication reductions, measured performance work, and explicit collaborative features.

**Output location.** The generator currently seeds and refreshes its body at `{skillsRoot}/ws-project-patterns/SKILL.md`, placing a consumer-owned artifact inside the published skills tree. Three problems follow: (a) `bin/skill-integrity-lib.js` `listInstallableSkills` enumerates every top-level directory with a `SKILL.md` and has no `externalSkills` exclusion, so `bin/skill-integrity.json` drifts as soon as the body exists; (b) the `ws-*` prefix makes the generated folder a scanned package dir for the Phase 5a harness gates; (c) a repo that dogfoods the harness (this upstream package) cannot generate the body without polluting its own source tree. The generated artifact moves to `{sharedDir}/ws-project-patterns/SKILL.md` (default `.ws/ws-project-patterns/SKILL.md`), tracked as consumer-owned content, with the autoload row, hub layout, installer exclusion, tests, and docs kept coherent. The body stays autoload-only: it is loaded through the Always-applied row, not by skills-root discovery.

Architecture touchpoints: upstream SoT `.agents/skills/ws-*` (generator body plus `seed_generated_skill.cjs`, `ws-self-learning`, `configure_autoload.cjs`), `{skillsRoot}/ws-shared/runtime/hub-layout.json` plus the hub `.gitignore` template, `bin/skill-dependencies.json`, `CATALOG.md` router, autoload, integrity plus `ws-check-harness`, `test/` suite, and the effective changelog plus MEMORY. The external spec-memo package (`ws-memo`) is bridge-only; no upstream edits there.

## Acceptance Criteria

- AC1: `node {skillsRoot}/ws-patterns-generator/scripts/seed_generated_skill.cjs --repo-root <dir>` writes `{sharedDir}/ws-project-patterns/SKILL.md` (hub root resolved from `pathTokens.sharedDir`, default `.ws`), exits 0, is byte-stable on rerun, never overwrites an existing body, and writes nothing under `--dry-run`.
- AC2: Symlink containment holds at the new location: a linked hub root, a linked `ws-project-patterns` directory, and a dangling leaf `SKILL.md` are each refused with no file created outside the repository, and in-repo links still seed (positive control).
- AC3: Seeding leaves the skills tree untouched: no `{skillsRoot}/ws-project-patterns` is created and `node bin/generate-skill-integrity.js --check` still exits 0 with the manifest unchanged while the generated body exists.
- AC4: The `ws-project-patterns` Always-applied row is added to `{sharedDir}/autoload.md` at most once on the first seed and points at the hub path; `configure_autoload.cjs --write-autoload` keeps the row only while `{sharedDir}/ws-project-patterns/SKILL.md` exists and drops it when the tree is absent.
- AC5: The generated id remains outside installer management: `bin/cli.js` still excludes it via `excludeExternalSkillIds(...)`, `bin/skill-dependencies.json` keeps `externalSkills` `{ id: ws-project-patterns, sourcePackage: consumer, generatorManaged: true }`, and no `ws-project-patterns` entry appears in `.ws/installed-skills.json`.
- AC6: `hub-layout.json` classifies the new hub path as consumer-owned/tracked content, the hub `.gitignore` template does not ignore it, and every doc that names the generated path is updated (root `AGENTS.md`, `.ws/AGENTS.md`, `README.md`, `CATALOG.md`, `FEATURES.md`, generated site).
- AC7: The integration analysis covers `ws-self-learning`, `ws-patterns-generator`, the generated `ws-project-patterns`, plus at least `ws-changelog`, `ws-spec-memo`, `ws-configure-project`, and `ws-secrets-leak-review`, with an overlap matrix and a merge / collaborate / keep-separate recommendation per pair recorded in `0114-patterns-generator-shared-hub-output.context.md`.
- AC8: A draft integration plan exists in the same companion with bounded file list, integration mechanism (shared helper versus protocol versus merge), performance targets, feature deltas, explicit non-goals, and a rollback or no-op path.
- AC9: Implemented code reduces duplication via shared helper extraction or removed duplicated blocks with before/after file pointers; every previously passing related test still passes.
- AC10: Performance is measured and non-regressed (`npm run test` wall time plus touched script runtime plus skill body size); any claimed improvement cites numbers and no suite-time regression exceeds 10 percent without justification.
- AC11: New collaborative features, if any, are explicit, config-gated where behavioral, covered by tests and docs, and introduce no unrequested scope.
- AC12: Memory contracts hold: `read-memory`/`update-memory` backends, trap shape, sanitize plus compile, and vault bridge ownership are unchanged unless the plan approves; the generated skill still never writes MEMORY or vault traps directly.
- AC13: New or changed Node scripts are `.cjs` with explicit `node` launcher, validate CLI and file inputs, contain filesystem reads and writes inside the repo root, await or handle every promise, and close all handles; `scan_stack_invariants.cjs --stack typescript-node` reports no new findings.
- AC14: Harness and batteries are green: `node test/test-ws-patterns-generator.js`, `node test/test-autoload-configure.js`, `node test/test-ws-shared-layout.js`, `node test/test-external-companion-skills.js`, `npm run test`, `ws-check-harness`, and `npm run generate-integrity` plus `npm run verify-integrity` all exit 0.
- AC15: The release PR carries exactly one `package.json` version bump strictly above the merge-base, aligned `packageVersion` in `bin/skill-dependencies.json` plus site footer, and regenerated integrity in the same commit.
- AC16: No secrets, tokens, or personal data appear in analysis, plan, code, tests, or the generated body; pasted consumer traces are anonymized to the failure class and the configured secrets review is clean.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Merging `ws-self-learning` and `ws-patterns-generator` into one skill | Two distinct contracts: anti-regression records with severity versus generative steering prose with evidence pointers. Companion Options B–E reject the merge and must be honored unless the plan re-justifies it. |
| Giving the generator MEMORY or vault write paths | Memory ownership stays with `ws-self-learning` via `update-memory`. |
| Editing the external spec-memo package or vault protocol | `ws-memo` ships from spec-memo; the harness owns bridge flags only. |
| Migrating or deleting an existing `{skillsRoot}/ws-project-patterns` body | Latest-layout-only policy: no legacy migration shims. The installer already ignores that folder; removal is a manual consumer action. |
| Changing harvest sources, bullet format, or rewrite-vs-append rules | Generator behavior is unchanged; only output location and contracts move. |
| Making the generated body discoverable through skills-root scanning | It is autoload-only by design; the Always-applied row is the loader. |
| Background daemon, scheduling, cross-project sharing, embeddings dedup | Host-owned or out of contract. |
| Reviving retired `ws-patterns-backend` / `ws-patterns-frontend` | Absent from the tree; different interaction model. |
| Editing managed skill bodies outside the approved plan file list | Surgical diffs; opportunistic rewrites need separate approval. |
| Auto commit or push of analysis, plan, or code | User commits explicitly; no script runs git writes. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| `ws-project-patterns` referent | Generated consumer skill from `ws-patterns-generator` | Only live id with that name; retired `ws-patterns` is absent | y |
| Hub root | `{sharedDir}` from `pathTokens.sharedDir` (default `.ws`) | Consumer-owned hub standard; project config wins | y |
| Generated path | `{sharedDir}/ws-project-patterns/SKILL.md` | Mirrors the skills-root layout under the hub; single autoload row | y |
| Source control of the generated body | Tracked in git | Harvested patterns are shared project knowledge reviewed in PRs | y |
| Legacy copies | Not migrated; documented as ignored | Portability rule: latest layout only, no dual defaults | y |
| Default integration mechanism | Collaborate via shared helpers plus protocols, keep skills separate | Preserves memory versus steering contracts | y |
| Other-skill candidate set | At least changelog, spec-memo, configure-project, secrets-leak-review | Direct harvest, memory, seeding, and hygiene neighbors | y |
| Performance target | Measured non-regression plus cited improvements | Makes the improvement claim testable | y |
| Deliverable shape | Analysis plus companion plan plus code diff plus tests plus docs | Matches the issue wording (draft/plan then code) | y |
| Baseline dependency | `ws-patterns-generator` ships in the base branch (PR #383, develop → main) before this change lands | This spec modifies that skill | y |
| Auth, rate limits, concurrency, TTL, external-dependency failure, state transitions | N/A: repo-local analysis, single-writer file generation, no network API, no shared service | Dimensions absent | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Analysis plus plan plus approved code in the listed skills, generator script, autoload resolver, hub layout, external-skills metadata, tests, docs, version/integrity | Diff lists only those paths |
| Atomic criteria | AC1–AC16 each pass or fail | Authoring validate plus listed commands |
| Failure modes | Escape attempts refused (AC2); overwrite prevented (AC1); row dropped when tree absent (AC4); installer never manages the id (AC5); no behavior regression (AC9, AC12); dry-run writes nothing | Negative scenarios below |
| Observation telemetry | Overlap matrix and plan in the companion; seed stdout (`written` / `unchanged` / `planned`); autoload row diff; with-before/after dedup pointers; suite timings; integrity and harness output | Validation notes commands |
| Stack invariants | typescript-node Node-subset enforced on new or changed scripts (awaited promises, validated inputs, contained paths, closed handles); en-us bodies with path tokens; no `.py`; strict-type checks N/A (JavaScript `.cjs`, no `tsc` gate) | `scan_stack_invariants.cjs`, `node --check`, `ws-check-harness` |
| Open blockers | None for implementation on `develop`; landing on `main` waits for PR #383 | Recorded in Notes |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Commands: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0114-patterns-generator-shared-hub-output.spec.md` exits 0; the AC14 command list exits 0; `scan_stack_invariants.cjs --stack typescript-node` reports no new findings.
- Files: `.ws/ws-project-patterns/SKILL.md` exists after seed; `.ws/autoload.md` carries the hub-path row once; `bin/skill-integrity.json` unchanged by seeding.
- Companion: `0114-patterns-generator-shared-hub-output.context.md` holds the overlap matrix, per-pair recommendation, plan, performance numbers, and deferred ideas.
- Cross-checks: `node bin/generate-skill-integrity.js --check` with the generated body present; `git status --porcelain` shows no `{skillsRoot}/ws-project-patterns` path after a generator run.
- Changelog: one entry per applied code run through the effective changelog file when code ships.

### Negative & Failing Test Scenarios

- Seeding still writes under `{skillsRoot}/` or ignores `pathTokens.sharedDir` (must fail AC1).
- A hub-root link, generated-dir link, or dangling leaf link escapes the repo (must fail AC2).
- The generated body appears in the integrity manifest or changes the skill count (must fail AC3).
- The autoload row keeps pointing at `.agents/skills/ws-project-patterns/SKILL.md`, is duplicated, or survives with the tree removed (must fail AC4).
- `ws-project-patterns` lands in `installed-skills.json`, or an update/uninstall removes the hub body (must fail AC5).
- Hub layout still classifies the body as a managed skill root, the ignore template drops it from git, or a doc still names the old path (must fail AC6).
- Analysis omits self-learning or patterns-generator overlap, or skips the required other-skill candidates (must fail AC7).
- Companion plan lacks file list, mechanism, targets, or rollback path (must fail AC8).
- Code reduction breaks a previously passing related test (must fail AC9).
- Suite time regresses over 10 percent without justification, or a claimed improvement lacks numbers (must fail AC10).
- New collaborative behavior ships without a config gate, test, or doc (must fail AC11).
- The generated skill writes MEMORY or vault traps directly, or a memory contract changes without plan approval (must fail AC12).
- A new script floats a promise, builds a path from unsanitized input, or leaks a handle (must fail AC13).
- Any AC14 command exits non-zero (must fail AC14).
- Version unbumped or integrity stale in the release commit (must fail AC15).
- A secret, token, or personal identifier appears in analysis, plan, code, tests, or the body (must fail AC16).

## Original Issue Context

Merged from issue #382 (`draft integration ws-self-learning skill with ws-project-patterns`) and the local hub-output spec `114` (`Store the generated ws-project-patterns body under the shared project hub`).

Issue #382, verbatim: analyze and verify integration ws-self-learning skill with ws-project-patterns; check if there are other skills to merge/collaborate - integrate; it could be complementary/improved/collaborative way these two or more skills (draft/plan); reduce skill code / improve performance / + features - code.

Source: https://github.com/jpolvora/workflow-skills/issues/382 (state open, labels none, assignees none, comments none).

### Prior Work Sweep

Provider sweep on 2026-09-21 (`sweep_prior_work.cjs --issue 382 --keywords self-learning project-patterns integration merge collaborate`): status ok, zero PRs, zero commits, no exact open PR for #382, no duplicate-risk open work. Closest in-tree relatives: `ws-self-learning`, `ws-patterns-generator`, generated `ws-project-patterns` (consumer-owned), `ws-changelog`, `ws-spec-memo`, `ws-configure-project`, `ws-secrets-leak-review`, `ws-wiki`. Local memory hits: spec validator AC-bullet scan (Medium) and CRLF edit anchors (Medium); vault bootstrap returned harness traps with no existing integration plan. Predecessor specs: `0018-project-patterns-memory-skills` (retired layer-split model), `0110-us-378` (generator plus generated skill), and `0111-us-382` (superseded by this merged spec).

### Design Intent

Modification plus analysis, not greenfield. `git log --oneline -10 -- .agents/skills/ws-self-learning/` shows long-lived memory ownership; `git log --oneline -10 -- .agents/skills/ws-patterns-generator/` shows only `32076bba feat(#378)` plus `31afaf28 fix(#383)`, confirming the generator is new and intentionally complementary (steering prose with evidence pointers) rather than an accidental duplicate of traps. `ws-project-patterns` is intentionally generator-managed consumer content (`bin/skill-dependencies.json` externalSkills), not an upstream skill. Integration must preserve these ownership boundaries unless the draft plan justifies a merge.

## Notes

- Merge record: `0111-us-382.spec.md` and its companion are retired by this spec; the companion content moved to `0114-patterns-generator-shared-hub-output.context.md`, and the `#382` issue linkage is preserved in this frontmatter.
- `ws-project-patterns` always means the generated consumer skill from `ws-patterns-generator`, not the retired `ws-patterns` id.
- Sequencing: implement on `develop` after PR #383 (`feat: add ws-patterns-generator skill (us-378)`) is merged or rebased, since this spec edits that skill.
- Tests to update: `test/test-ws-patterns-generator.js` (seed target, containment fixtures, autoload row, installer exclusion), `test/test-autoload-configure.js` (generator-managed row fixtures), `test/test-ws-shared-layout.js` (new hub-layout category or path), plus any CLI fixture asserting `listInstallableSkills` counts.
- Shared harvest readers or helpers live under `{skillsRoot}/ws-shared/runtime/scripts/` or the owning skill `scripts/` dir; the generator never gains MEMORY write paths.
- `generatorManagedTreeExists` becomes hub-relative; the global-skills fallback check is removed for generated ids (the body is project-local by definition).
- Skill bodies and the generated body stay en-us, host-neutral, portable tokens, `user-gate` only for gates, one directive per line.
