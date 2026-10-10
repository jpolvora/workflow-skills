---
slug: us-492
title: "update: hub installed twice per run clobbers config.json.bak (backup ends up identical to live config)"
status: completed
step: 2
workflowId: us-492-20261010T025900Z
startedAt: "2026-10-10T02:59:00Z"
endedAt: "2026-10-10T03:04:30.950Z"
acRefs: []
---
# Refined implementation plan — us-492

Additive to `step-02-us-492.plan-interview.md` (registry G1–G9, `blocking_open: 0`). Base content is `step-01-us-492.plan.md`; the sections below carry the resolved decisions. `step-01-us-492.plan.md` is unchanged.

## 0. Summary & Business Rules

Unchanged from `step-01` §0. Objective: make the installer CLI run its shared-hub install phase **at most once per `install`/`update` run** (project and global scope) and make `config.json.bak` **write-once/preserving**, so pre-change bytes survive and remain a usable rollback point.

Business rules BR1–BR6 (BR1 one hub status block per run; BR2 `.bak` differs from live after a changing run; BR3 a differing backup is preserved; BR4 consumer-owned hub content preserved; BR5 safe degradation on unparseable config / unreadable template; BR6 `.bak` stays gitignored `generatedLocal`).

## 1. Definition of Ready & Scope

AC1–AC10 and their plan-step mapping are unchanged from `step-01` §1. In scope: `bin/cli.js` (`afterSkillCopy`, `installSelectedSkills`, `runUpdate`, `runInstall` call sites, `shouldEnsureHub` usage, `ensureSharedHubInstalled`, `ensureSharedConsumerArtifacts`) plus regression tests under `test/`. Out of scope unchanged (rollback command, desktop editor backup, hub-install re-architecture, `.bak` classification, flag broadening); `install-skills.sh` needs no change.

## 2. Technical Design & Architecture

**D1 — Once-per-run hub ensure.** As in `step-01` §2 D1, with the reset placement fixed by **G9**: a module-level `hubEnsuredForRun` latch consumed at the top of `ensureSharedHubInstalled` (`bin/cli.js:1288`), returning `false` on a suppressed call and `true` after running the body; `resetHubEnsureLatch()` called at the entry of `installSelectedSkills` (`bin/cli.js:2033`) and `runUpdate` (`bin/cli.js:2640`) only. `isGlobalScope` is fixed per process (`bin/cli.js:86-96`); secondary host targets only symlink skill folders (`projectSkillsToSecondaryTargets`, `bin/cli.js:576`) and never install a second hub. The standalone `ws-self-learning` seed path (`bin/cli.js:1098-1106`) keeps its first-call semantics.

**D2 — Preserving backup write.** As in `step-01` §2 D2. `writeConfigBackup(configBakPath, rawConfig, configDisplay)`: absent or byte-identical backup → write from pre-change bytes and log `Backed up <cfg> → <cfg>.bak` verbatim (`bin/cli.js:1001` wording preserved — **G2**); differing backup → preserve and log `Preserved existing <cfg>.bak (pre-change snapshot retained)`. The write still precedes the live rewrite (`bin/cli.js:1013-1016`), so AC4 holds with or without D1. AC7 keeps `existingConfig === null` → `Preserved existing …` branch (`bin/cli.js:1017-1019`). AC10 unchanged. A read failure of the existing `.bak` is caught and treated as absent (never throws).

**D3 — Scope parity.** Unchanged from `step-01` §2 D3.

**Invariants.** `commitPlanFilesOnlyAtStep8: true`; no `{plansDir}` staging before Step 8.

## 3. Step-by-Step Plan

**S1 — Run-scoped hub-ensure latch (AC1, AC2, AC8, AC9).** `bin/cli.js`: latch + `resetHubEnsureLatch()` beside `ensureSharedHubInstalled`; guard/`return` inside it; resets added at `installSelectedSkills` and `runUpdate` entry (**G9**). No change to `afterSkillCopy`'s condition or `shouldEnsureHub`; `hubEnsured` bookkeeping untouched.

**S2 — Preserving backup write (AC3, AC4, AC5, AC6, AC7, AC10).** `bin/cli.js`: new `writeConfigBackup(...)` helper; replace `bin/cli.js:999-1002`. Synchronous; never throws on an unreadable backup file (**D2**).

**S3 — Regression tests (red first, then green).** Extend `test/test-install.js` (anchors `866-879`) and `test/test-ws-shared-layout.js` (anchors `286-290`); do not weaken either (**G8**). Add the once-per-run stdout assertion (**G7**) and the global-scope case using the existing `WORKFLOW_SKILLS_GLOBAL_DIR` fixture (`test/test-install.js:1069`, `2486-2605`, `2669-2673`) — **G1**.

**S4 — Verification sweep.** `npm run test`; `node test/run-tests.cjs` (its `.ws/config.json` / `.ws/config.json.bak` snapshot guard at `run-tests.cjs:26-51` must stay green); `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node --file bin/cli.js` (0 violations).

- **Defect-class sibling sweep (repo-wide):** enumerate other "backup then rewrite" pairs — `Edit-WorkflowSkillsConfig.ps1:201` (out of scope, own test), `relocateLegacyHub` (`bin/cli.js:952-963`, already move-only-when-absent), hub `.gitignore` template (`ws-shared/templates/hub.gitignore:16-17`). Record the classification; edit none of them.
- **Sabotage verification:** `verification.mutationTest` is empty and `defaults.skipMutationTesting: true` → no mutation-score gate; log `mutation-testing | skipped:not-configured`. The behavioural equivalent is the NS1 red test (hub status block count 2 before S1).

## 4. Permissions, Tenancy & i18n

N/A — local single-process file-write path, no RBAC, no tenancy field, no network boundary, no i18n surface. Console strings stay en-us; only the additive preserve line is new (**G2**).

## 5. Test Coverage

| AC | Test | Assertion |
|----|------|-----------|
| AC1 | `test/test-install.js` — hub ensured once per update run | Count of `hub updated (consumer config/MEMORY/stack/CHANGELOG preserved)` lines in stdout `=== 1` (**G7**) |
| AC2 | same fixture with `ws-self-learning` + `ws-spec-to-pr` | Hub status block count `=== 1`; backup line count `=== 1` |
| AC3 | "backup written from pre-change bytes" | `.bak` bytes `===` seeded pre-run bytes (sha256 compare) |
| AC4 | "backup differs from live config after a changing run" | `sha256(config.json) !== sha256(config.json.bak)` |
| AC5 | "differing backup preserved" | Seed differing `.bak`; after `update` its bytes are unchanged; after a second `update` still unchanged |
| AC6 | "unchanged-config run does not touch the backup" | `.bak` exists, byte length and sha256 unchanged (**G6**) |
| AC7 | "invalid JSON backed up raw, live not rewritten" | Warning emitted; live bytes identical; `.bak ===` those raw bytes |
| AC8 | "consumer-owned hub files preserved" | Extend existing preservation assertions (`STACK.md`, `MEMORY.md`/`memory/`, `CHANGELOG.md`, config values) across the hub refresh |
| AC9 | "global scope: once-per-run + backup semantics" | Using `WORKFLOW_SKILLS_GLOBAL_DIR`: one hub block; differing hashes (**G1**) |
| AC10 | "unreadable template leaves live config unmodified" | Live config bytes unchanged |

**Negative scenarios.** NS1 (double hub block) → AC2 red before S1. NS2 (second pass overwrites seeded backup) → AC3 red before S2. NS3 (identical hashes) → AC4. NS4 (idempotent re-run destroys rollback point) → AC5/AC6. NS5 (invalid JSON) → AC7. NS6 (unreadable template) → AC10. NS7 (traversal hub root) → §6. NS8 (interrupted run) → AC5/AC6 observably: the backup is written before the live rewrite and a differing backup is never rewritten, so an interruption cannot leave `.bak` equal to a live partially-upgraded config (**G5**).

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `.agents/skills/ws-shared/runtime/stacks/typescript-node.md`.

| Boundary | Rule | Verification |
|---|---|---|
| Path traversal / containment | rule 4 | Backup path derived from the resolved config dir (`bin/cli.js:981-983`); predicate writes that exact path only. **NS7:** configure `pathTokens.sharedDir` with a traversal value → the hub-root resolver refuses fail-closed (`resolve_hub_root.cjs:115-119`, `147-162`, `HUB_TRAVERSAL`, exit 2) and no file is written outside the hub (**G4**). Command: invariant scan `--stack typescript-node --file bin/cli.js` (0 violations) |
| Boundary input validation | rule 3 | Live-config read/parse stays inside the guarded block (`bin/cli.js:992-997`); the new predicate never throws on an unreadable `.bak` (`try/catch` → absent). **AC7** test asserts warning + byte-identical live config |
| Async / resource safety | rules 2, 5 | No new async API, stream, or timer; helper is synchronous `fs` only. `npm run test` + invariant scan |
| Secrets / tracked-content hygiene | — | Backup holds only consumer bytes at the derived path, never the packaged template, and stays gitignored (`ws-shared/templates/hub.gitignore:16-17`); assert no tracked file changed during the fixture run |

No authorization, subscription/lifecycle, or DTO boundary is touched.

## 7. Pre-PR Checklist

Unchanged from `step-01` §7, plus: [x] interview registry G1–G9 closed with `blocking_open: 0`; [x] no acceptance-criterion sentence overridden, so no spec sync required; [x] no harness benchmark command run.

## 8. Resolved decisions (replaces step-01 §8 Open Questions)

1. **Global-scope test depth — resolved (project).** `test/test-install.js` already isolates a global root via `WORKFLOW_SKILLS_GLOBAL_DIR` (`1069`, `2486-2605`, `2669-2673`); AC9 is tested directly, not indirectly.
2. **Preserve message wording — resolved (project).** Keep `Backed up …` verbatim; add `Preserved existing <cfg>.bak (pre-change snapshot retained)`. No test/doc pins a preserve-side string.
3. **Latch vs. boolean return — resolved (project).** Module-level latch inside `ensureSharedHubInstalled`, reset at the two run drivers; `afterSkillCopy` has four call sites across both drivers, so threading a return value is the larger diff.
4. **`runInstall` reachability — resolved.** `installSelectedSkills` is the single shared entry for `runInstall` and the interactive install; no extra `runInstall`-only path is needed.

No open questions remain; `shared_understanding: confirmed`.
