---
slug: us-498-install-mode-reporting
title: "Truthful install-mode reporting: coincident roots report scope global, and globalVersion comes from the canonical hub version file"
status: completed
step: 2
workflowId: us-498-install-mode-reporting-20261010T070620Z
startedAt: "2026-10-10T07:20:00Z"
endedAt: "2026-10-10T07:20:00Z"
acRefs: []
---
# Implementation Plan (refined) — us-498-install-mode-reporting

Spec of record: `.agents/plans/us-498-install-mode-reporting/step-00-us-498-install-mode-reporting.spec.md` (29 ACs, NS1–NS12).
Workflow: `us-498-install-mode-reporting-20261010T070620Z` (standard, `autoMode`, `fullMode`, `enableDag: true`, `execMode: dag`, interview required, `scoreAndRefine` off).
Refinement: `.agents/plans/us-498-install-mode-reporting/step-02-us-498-install-mode-reporting.plan-interview.md` (registry G1–G15, `blocking_open: 0`, `shared_understanding: confirmed`).

## 0. Summary & Business Rules

`ws-check-harness` Phase 0 runs the read-only detector `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs`. One consumer-facing report is currently untruthful in two independent ways:

1. **False `hybrid` scope (#494).** The consumer scope matrix uses two non-emptiness booleans (`localIds.length > 0 && globalIds.length > 0`) and never compares the resolved local root (`<repoRoot>/.agents/skills`) with the root returned by `resolveGlobalSkillsRoot()`. When the audit runs with `--repo-root` set to the user home (normal for a global-only install) one physical tree is enumerated twice: `installScope` becomes `hybrid`, `skillsScanRoots` lists the same directory twice, and the hybrid override guidance is emitted where no coexistence exists.
2. **Misleading `globalVersion` (#495).** The version resolver probes four representative ids for a `version:` frontmatter line (none declares one in this package), then falls back to the **modal** frontmatter version across every folder in the global skills root. That population is dominated by skills outside this package (`externalSkills` companions such as `ws-memo` / `ws-session-tracking`, plus consumer-authored folders); their shared value wins and is published as the workflow-skills install version. The canonical `<skillsRoot>/ws-shared/version.json` (declared by `bin/canonical-version.js`) is never read.

Business rules:

| # | Rule |
|---|------|
| BR1 | **Identity before scope.** Directory identity of the two resolved roots is established before the consumer scope decision. Equal roots are one install tree and that tree is the global skills root → `global`, never `hybrid`. Distinct roots keep today's matrix (`hybrid` both populated / `project` local only / `global` global only). `upstream` still short-circuits on package markers plus skill SoT before the consumer branch. |
| BR2 | **Coincident report shape.** On a coincident tree `skillsScanRoots` lists `{globalSkillsRoot}` only, an informational note states the coincidence, and the hybrid duplicate-`name:` note is omitted. |
| BR3 | **Version precedence.** Global version resolution order: (1) `{globalSkillsRoot}/ws-shared/version.json`; (2) `packageVersion` in `{globalSkillsRoot}/ws-shared/runtime/skill-dependencies.json`; (3) package-owned `ws-*` frontmatter (representative-id probe order first, then package-scoped modal fallback, `externalSkills` ids excluded); (4) honest `null`. |
| BR4 | **Untrusted input.** Every candidate value is schema-checked as `major.minor.patch` semver before use; a non-semver value is discarded and never surfaces as the global version. |
| BR5 | **Honest drift.** No resolved version ⇒ `coexistence.globalVersionDrift` stays `null`; drift is always an informational note (never a warning) and never changes the exit code. |
| BR6 | **Read-only, synchronous.** The detector stays read-only, single-process, synchronous CommonJS on Node 22: no new CLI flag, no enum change, no filesystem write, no network, no new dependency, no shared resolver module. |

Security mitigations: frontmatter reads stay confined to `{globalSkillsRoot}` (`SKILL_ID_RE` guard plus the exported `inside()` containment check); hub files are untrusted input (parse failures fall through, never throw). Detection remains advisory and drift never changes the exit code.

## 1. Definition of Ready & Scope

Resolved design choices (spec § Assumptions + interview registry):

| Choice | Resolution | Source |
|--------|-----------|--------|
| Canonicalization | `path.resolve` → `realpathSync.native` → `realpathSync` → resolved path; compare lowercased only on `win32` | G1, AC10–AC12 |
| Package-owned id source | Union `externalSkills[].id` from `{repoRoot}/bin/skill-dependencies.json` and `{globalRoot}/ws-shared/runtime/skill-dependencies.json` | G2, AC21 |
| Existing frontmatter fixture | Keep `testUpstreamWithGlobalCoexistence` as-is (no hub version file → probe still yields `0.4.30`); add a new `9.9.9` hub-file fixture | G3, AC29 |
| Drift note | Informational note in `notes` for all modes once both versions resolve; `warnings` untouched | G4, AC25 |
| Frontmatter containment | Exported `inside()` + `SKILL_ID_RE` | G5, AC28 |
| Upstream short-circuit | `rootsCoincide` computed up front, consulted only in the consumer branch | G6, AC6 |
| Coincidence note scope | Emitted whenever the roots coincide (any mode) | G7, AC8 |
| Case test | Runtime host case-sensitivity probe; assert only when case-insensitive | G8, AC11/N2 |
| Null-version fixture | External companions + consumer-authored folder, no hub file | G9, AC21/AC23/N10 |
| Malformed hub inputs | Truncated → projection fallback; non-semver → discarded | G10, AC19/AC20 |
| Unreadable package.json | Existing `packageVersion === null` guard; assert explicitly | G11, AC23/N12 |
| Documentation surface | One clause in `ws-check-harness/SKILL.md` and `PHASES.md` | G12, AC15 |
| Red-first baseline | Pre-fix `hybrid` and pre-fix frontmatter version recorded as fixture pairs | G13, N1/N7 |
| Link gate | No link-gate change; its buckets stay out of `total`/`ok` | G14 |
| Integrity | `generate-integrity` + `verify-integrity` + `test-harness-clean.js` at orchestrator level | G15 |

Measurable ACs: AC1–AC29 of the spec; negative scenarios NS1–NS12.

Out of scope (spec § Out of Scope): enum vocabulary changes; re-tuning the distinct-root matrix; retargeting `pathTokens.skillsRoot` / `{skillsRoot}`; pruning or updating a global tree; adding `version:` frontmatter to package `SKILL.md` bodies; changing how `packageVersion` is read from `{repoRoot}/package.json`; removing the representative probe or the `externalSkills` exclusion; reworking `coexistence.globalIdsOutsidePackage` or the `ahead`/`behind`/`same` vocabulary; introducing a shared version-resolver/path-identity module; new CLI flags; auditing third-party non-`ws-*` skills.

Bounded edit surface (DoR): `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs` + `test/test-check-harness-install-mode.js`; the only permitted documentation edit is the `ws-check-harness` detection wording in `SKILL.md` / `PHASES.md` required by AC15. Integrity and version artifacts are regenerated by the orchestrator.

## 2. Technical Design & Architecture

Layers touched (config.json `stack.backend.layers`):

| Layer | Path | Change |
|-------|------|--------|
| `skills-sot` | `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs` | Scope identity predicate + version-resolution chain (behavioral change) |
| `skills-sot` (docs) | `.agents/skills/ws-check-harness/SKILL.md`, `PHASES.md` | AC15 wording: hybrid requires distinct resolved roots |
| `tests` | `test/test-check-harness-install-mode.js` | Coincident-root fixture, version-precedence fixtures, negative scenarios |

Detector design (single file, CommonJS, synchronous):

1. **Path identity helpers** (new, local to the detector):
   - `canonicalizeForCompare(target)`: `path.resolve(target)` → `fs.realpathSync.native(resolved)`; on throw `fs.realpathSync(resolved)`; on throw the resolved absolute path (AC10, AC12).
   - `sameRootPath(a, b)`: canonicalize both, compare with `toLowerCase()` when `process.platform === 'win32'`, exact otherwise (AC10, AC11), mirroring the `workflow_state.cjs` `GIT_PATH_CASE_INSENSITIVE` / `trackedKey()` precedent named in the spec Notes.
   - `inside` is reused from `ws-shared/runtime/scripts/resolve_consumer_root.cjs` (already required, exported at line 609) for the AC28 containment check — no new shared helper (spec Out of Scope).
2. **Scope matrix** (AC1–AC9): compute `rootsCoincide = sameRootPath(localRoot, globalRoot)` before the matrix; `mode === 'upstream'` remains the first branch and is unchanged (AC6, G6). Consumer branch:
   - `rootsCoincide && (localIds.length + globalIds.length) > 0` → `global`;
   - else today's matrix unchanged (`hybrid` / `project` / `global`).
   `scanRoots` stays derived from `scope`, so a coincident tree yields `['{globalSkillsRoot}']` only (AC7). Notes: push the coincidence note whenever `rootsCoincide` regardless of mode (AC8, G7); the existing `scope === 'hybrid'` note branch is untouched and therefore absent on a coincident tree (AC9).
3. **Version resolution** (AC16–AC24, AC28):
   - `SEMVER_RE = /^\d+\.\d+\.\d+$/`; `semverOrNull(value)` trims strings and returns `null` otherwise (AC20).
   - `readJsonIfPossible(file)` swallows read/parse errors → `null` (AC19, N8).
   - `{globalRoot}/ws-shared/version.json` → `semverOrNull(parsed.version)` (AC16, AC17).
   - `{globalRoot}/ws-shared/runtime/skill-dependencies.json` → `semverOrNull(parsed.packageVersion)` (AC19).
   - `externalIds` = union of `externalSkills[].id` from `{repoRoot}/bin/skill-dependencies.json` (when present) and `{globalRoot}/ws-shared/runtime/skill-dependencies.json` (when present). Package-owned ids = global ids matching `SKILL_ID_RE` and not in `externalIds` (AC21; consumer-authored folders already fail `SKILL_ID_RE`).
   - Frontmatter fallback: representative probe (`ws-check-harness` → `ws-tdah` → `ws-spec-to-pr` → `ws-senior-developer`) restricted to package-owned ids, then modal fallback over package-owned ids only (AC22). Both read `path.join(globalRoot, id, 'SKILL.md')` guarded by `SKILL_ID_RE` and `inside(file, globalRoot)` (AC28, N11).
   - All sources funnel into the single `globalVersion` value consumed by `evidence.globalSkills.version`, `coexistence.globalVersion`, and the human-readable line (AC18, AC24).
4. **Coexistence/drift** (AC23, AC25–AC27): the drift computation is unchanged and only runs when both `globalVersion` and `packageVersion` are truthy, so a `null` version yields `null` drift; add an informational drift note for consumer scopes (`notes`, never `warnings`), exit code unchanged (AC13, AC25).
5. **Docs (AC15):** add "requires the local and global skills roots to resolve to different directories" to the hybrid row in `ws-check-harness/SKILL.md` and `PHASES.md`, preserving the existing advisory wording.

Invariant checks from `config.json.invariants`: `commitPlanFilesOnlyAtStep8: true` (product commit is G2-code after Step 5; `{plansDir}` only at Step 8), `skipQualityGates: false`.

## 3. Step-by-Step Plan

**T1 — Identity helpers + scope matrix (AC1–AC12).**
Affected: `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs` (require `inside`; add `canonicalizeForCompare`, `sameRootPath`; compute `rootsCoincide`; consumer branch; coincidence note).
Engineering checks: `node --check` on the detector; coincident-root fixture; distinct-root fixtures unchanged.
Defect-class sibling sweep: grep the repo for other two-boolean scope heuristics comparing `{skillsRoot}` with `{globalSkillsRoot}` — `resolve_consumer_root.cjs` `isGlobalSkillsRoot` (compares against known global roots, intentionally unchanged), `ws-version` scope reporting (read-only display), `check_harness_links.cjs` (consumes Phase 0 evidence and adds no detection of its own, per PR #500 AC24/D7). No other site needs the identity predicate.

**T2 — Version resolution chain (AC16–AC24, AC28, AC29).**
Affected: same detector (`SEMVER_RE`, `semverOrNull`, `readJsonIfPossible`, external-id union, hub/projection reads, package-scoped probe + modal fallback).
Engineering checks: fixture with `ws-shared/version.json` `9.9.9` while companions declare `0.37.1` and `ws-tdah` declares `0.4.30` → `9.9.9`; truncated `version.json` → projection value; `not-a-semver` → discarded; external-only fixture with no hub file → `null` + `null` drift.

**T3 — Drift notes + exit code (AC13, AC25–AC27).**
Affected: same detector (informational drift note for consumer scopes; no `warnings` entry; no exit-code change).
Engineering checks: exit 0 in every fixture; drift `same` when the canonical version equals the package version.

**T4 — Docs wording (AC15).**
Affected: `.agents/skills/ws-check-harness/SKILL.md`, `.agents/skills/ws-check-harness/PHASES.md`.
Engineering checks: wording states hybrid requires distinct resolved roots; `check_harness_links.cjs` stays green (no dead link introduced).

**T5 — Regression suite (AC14, AC29, NS1–NS12).**
Affected: `test/test-check-harness-install-mode.js` (new fixtures + assertions; existing fixtures stay green).
Engineering checks: `node test/test-check-harness-install-mode.js` exit 0; `node test/test-harness-clean.js` 0 findings; `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.

Ordering: T1 → T2 → T3 → T4 → T5 (T5 asserts T1–T3; T4 verified last).

Sabotage verification: the coincident-root fixture (N1/AC14) and the "hub version file wins" fixture (N7/AC29) are red before the fix — pre-fix baselines recorded in G13 (`--repo-root $HOME` → `hybrid`; frontmatter version vs `ws-shared/version.json` `0.5.37`). Mutation testing is unset in this project, so the recorded sabotage is the red-first fixture pair; `run_sabotage.cjs` is not invoked.

## 4. Permissions, Tenancy & i18n

N/A — the detector is an unauthenticated, read-only local CLI with no tenancy surface, no user-facing strings requiring i18n, and no persisted state. No authorization, tenant-isolation, or locale surface is touched. This is an explicit N/A: no AC in the spec covers these dimensions (spec § Assumptions row "Concurrency, auth boundaries, rate limits, idempotency, ordering, data lifecycle, expiry, and network failure → N/A").

## 5. Test Coverage

All tests live in `test/test-check-harness-install-mode.js` unless noted. `detect()` spawns the detector with `WORKFLOW_SKILLS_GLOBAL_DIR` pointed at a temp tree and `--repo-root` at a temp repo.

| AC | Test case (method) | Assertion |
|----|--------------------|-----------|
| AC1, AC2, AC3 | `testCoincidentRootsReportGlobal` | `--repo-root` = temp repo whose `.agents/skills` **is** the global root → `installScope !== 'hybrid'` and `=== 'global'` |
| AC4, N4 | `testProjectAndHybridScopes` (existing, unchanged) | distinct populated roots → `hybrid`, scan roots `['.agents/skills', '{globalSkillsRoot}']` |
| AC5, N3 | `testProjectAndHybridScopes` + `testMissingGlobalRootFallsBackToResolvedPath` | local-only → `project`; missing `WORKFLOW_SKILLS_GLOBAL_DIR` path → exit 0, `project`, no `ENOENT` |
| AC6 | `testUpstreamWithGlobalCoexistence` (existing) | upstream markers + SoT → `upstream` regardless of root coincidence |
| AC7, N5 | `testCoincidentRootsReportGlobal` | scan roots `['{globalSkillsRoot}']` — the same directory is never listed twice |
| AC8 | `testCoincidentRootsReportGlobal` | a note matches `/same directory/i` |
| AC9, N5 | `testCoincidentRootsReportGlobal` | no note matches `/Hybrid install/` and none mentions duplicate `name:` entries |
| AC10 | `testTrailingSeparatorAndDotSegmentsAreSameRoot` | `--repo-root` variants with trailing separator / `..` / `.` segments → still `global` |
| AC11, N2 | `testCaseVariantSpellingIsSameRoot` | host case-sensitivity probed at runtime; when case-insensitive, case-variant spelling → `global`, never `hybrid` |
| AC12, N3 | `testMissingGlobalRootFallsBackToResolvedPath` | uncanonicalizable (missing) root → resolved absolute path used, exit 0 |
| AC13 | every fixture | exit `0` with the documented JSON field set |
| AC14, N1 | `testCoincidentRootsReportGlobal` | coincident fixture exists and is the failing test pre-fix (G13 baseline) |
| AC15 | doc review of `ws-check-harness/SKILL.md` + `PHASES.md` | wording states hybrid requires distinct directories; `check_harness_links.cjs` green |
| AC16, AC17, AC24, AC29, N7 | `testHubVersionFileWins` | global `ws-shared/version.json` `9.9.9` while companions declare `0.37.1` and `ws-tdah` declares `0.4.30` → `evidence.globalSkills.version === '9.9.9'` and `coexistence.globalVersion === '9.9.9'` |
| AC18 | `testHubVersionFileWins` + human-output run | same value in `evidence.globalSkills.version`, `coexistence.globalVersion`, and `Global skills: … (v9.9.9)` |
| AC19, N8 | `testTruncatedVersionFileFallsBackToProjection` | `{"version":` → exit 0, projection `packageVersion` (`0.5.38`) reported |
| AC20, N9 | `testNonSemverVersionFileIsDiscarded` | `{"version":"not-a-semver"}` → value never appears; drift not `ahead`/`behind` |
| AC21, AC23, N10 | `testExternalOnlyVersionsReportNull` | only external/consumer skills declare versions, no hub file → `coexistence.globalVersion === null` and `globalVersionDrift === null` |
| AC22 | `testRepresentativeProbeBeatsModalFallback` | no hub sources; `ws-tdah` `0.4.30` (1 occurrence) vs `ws-memo` `0.37.1` (2 occurrences) → `0.4.30` |
| AC23, N12 | `testUnreadablePackageJsonLeavesDriftNull` | package `package.json` unreadable → drift `null`, exit 0, no drift note |
| AC25 | `testHubVersionFileWins` (package `0.5.38`) | differing version → note (not warning), exit 0 |
| AC26 | `testHubVersionFileWinsSameVersion` | canonical version equals package version → drift `same` |
| AC27 | `testHubVersionFileWins` | drift `behind` computed only from the two resolved versions |
| AC28, N11 | `testSkillIdGuardRejectsEscapingFolder` | `..`-bearing folder name excluded by `SKILL_ID_RE`; no read outside `{globalSkillsRoot}` |
| NS6 | review + `node --check` + diff scan | no `async`/`await`, no floating promise, no `fs.write*`, no new subprocess |
| NS16 | `scan_stack_invariants.cjs --stack typescript-node` | no new critical stack findings |

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `{skillsRoot}/ws-shared/runtime/stacks/typescript-node.md` (`node-skills-package`, Node 22 CommonJS, no Python).

- **Input validation & boundary (typescript-node #3):** `ws-shared/version.json` and `ws-shared/runtime/skill-dependencies.json` are untrusted on-disk inputs → parsed inside try/catch and semver-validated (`major.minor.patch`) before use; `--repo-root` and `WORKFLOW_SKILLS_GLOBAL_DIR` values are normalized with `path.resolve` before comparison. Verified by AC17, AC19, AC20 and the malformed-input fixtures.
- **No unchecked `any` (#1) / Node-only runtime:** plain CommonJS, no `any`/`as any`/`@ts-ignore`/`@ts-nocheck`, no new `.py`; `scan_stack_invariants.cjs --stack typescript-node` stays clean.
- **Synchronous, no floating promises (#2):** `detect()` and every new helper stay synchronous; no `async`, `await`, `.then`, or deferred `realpath`. Verified by `node --check` plus a diff scan for `async`/`await`.
- **Path containment (security):** frontmatter reads resolve to `path.join(globalRoot, id, 'SKILL.md')` with `SKILL_ID_RE` and `inside(file, globalRoot)` guards → AC28/N11.
- **Authorization & endpoint protection:** N/A (local CLI, no endpoints, no RBAC).
- **Concurrency & async safety:** N/A beyond the sync rule above (single-process, no shared mutable state, no cancellation surface).
- **Subscription & lifecycle cleanup:** N/A (no subscriptions, hooks, or streams).
- **Read-only, no new traversal (security invariant):** no `fs.write*`, `fs.mkdir*`, `child_process`, or network addition; canonicalization only calls `realpath`/`existsSync`. Verified by diff review and `ws-check-harness` Phases 0–5c.
- **Adjacent-contract regression (sibling spec 0171):** `check_harness_links.cjs` stays untouched; its `installLayoutNotes` / `warnings` buckets remain outside `total`/`ok`, and it keeps deriving hub directories from the resolved context. `node test/test-check-harness-links.js` is the guard.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected — only `skills-sot` detector/docs and `tests` change; integrity/version artifacts regenerated by the orchestrator.
- [ ] Domain entities and mappings encapsulated — N/A (no domain model).
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A (documented in §4).
- [ ] Stack & security invariants verified (validation, sync, containment, read-only, adjacent contract) — §6 evidence recorded.
- [ ] i18n keys declared — N/A (no user-facing strings).
- [ ] Test cases cover all ACs — §5 table maps AC1–AC29 and NS1–NS12.
- [ ] Version bumped once (`npm run build-site:bump`) and integrity regenerated (`npm run generate-integrity`, `npm run verify-integrity`).
- [ ] `node test/test-harness-clean.js` reports 0 findings; `ws-check-harness` Phases 0–5c clean; `npm run test` green (Windows flake recorded honestly).
- [ ] Docs/site/hub in sync (SKILL.md/PHASES.md wording per AC15).
- [ ] No harness benchmark executed; no private consumer project names cited.

## 8. Open Questions

None blocking. Decisions recorded during refinement:

1. **Where `externalSkills` is read from** — union of the repo-root manifest and the shipped global hub manifest (G2). Rationale: AC21 requires excluding `externalSkills` ids, which is only possible where the manifest exists; the union keeps upstream and consumer behavior identical in effect.
2. **Coincidence note scope** — emitted whenever the two resolved roots are the same directory, including `upstream` mode (AC8 is unconditional); the consumer-only identity *decision* is unchanged (AC6). (G7)
3. **Drift note for consumer scopes** — added for all modes with both versions resolved, inside `notes` (never `warnings`), preserving exit 0 (AC25). (G4)
4. **`ws-version` scope reporting** — read-only display surface, out of the DoR bound; left unchanged (T1 sibling sweep). No follow-up required because it resolves scope for its own surface, not for Phase 0 evidence.
