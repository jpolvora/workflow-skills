---
id: 498
slug: us-498-install-mode-reporting
title: "Truthful install-mode reporting: coincident local and global skills roots must report scope global (never hybrid), and globalVersion must come from the canonical ws-shared/version.json"
source: github
specDate: 2026-10-09
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/498"
---

# Specification — Truthful install-mode reporting: coincident local and global skills roots must report scope global (never hybrid), and globalVersion must come from the canonical ws-shared/version.json

## Description

**Defect class (bug fix of existing detector behavior).** `ws-check-harness` Phase 0 runs the read-only install-mode detector `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs`, which classifies `installMode` (`upstream`, `consumer`, `none`) and `installScope` (`upstream`, `project`, `global`, `hybrid`, `none`), selects the primary hub and the `skillsScanRoots` that every later phase consumes, and reports the resolved global-install version together with its drift against the package version. Two output-correctness defects make that one consumer-facing report untruthful: it reports the wrong scope for the install and the wrong version of the global install. This specification consolidates issues #494 and #495 into a single install-mode reporting contract: the report must describe the skills tree that is actually installed, and the version that is actually installed there.

- **False `hybrid` scope (#494).** The consumer branch of the scope matrix assigns `scope = 'hybrid'` from two non-emptiness booleans (`localIds.length > 0 && globalIds.length > 0`) and never compares `<repoRoot>/.agents/skills` (`LOCAL_SKILLS_REL`) against the root returned by `resolveGlobalSkillsRoot()` in `.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs` (which resolves `WORKFLOW_SKILLS_GLOBAL_DIR` or `<home>/.agents/skills`). When the audit runs with `--repo-root` set to the user home for a global-only install, one physical tree is enumerated twice: `scope` becomes `hybrid`, `skillsScanRoots` lists `['.agents/skills', '{globalSkillsRoot}']` for the same directory, `evidence.localSkills` and `evidence.globalSkills` describe the same tree, and the hybrid "local bodies override global, do not flag duplicate `name:` entries across trees" guidance is emitted where no coexistence exists. The identity comparison is the missing predicate; the hybrid rule itself is correct for genuinely distinct trees.
- **Misleading `globalVersion` (#495).** The version resolver never consults the canonical install version file. It probes four representative package ids (`ws-check-harness`, `ws-tdah`, `ws-spec-to-pr`, `ws-senior-developer`) for a `version:` line in their `SKILL.md` frontmatter — none of those bodies declares `version:` — then falls back to the modal (most frequent) frontmatter `version:` across every folder in the global skills root. That population is not package-scoped and is dominated by skills that are not part of this package: the ids declared under `externalSkills` in `bin/skill-dependencies.json` (for example `ws-memo` and `ws-session-tracking`, both shipped by the external `spec-memo` package) and consumer-authored skills. Their shared frontmatter value therefore wins the count and is published as the workflow-skills install version, and `coexistence.globalVersionDrift` is computed against that unrelated value. The canonical source is never read: `bin/canonical-version.js` exports `CANONICAL_VERSION_REL = .agents/skills/ws-shared/version.json` and documents `package.json.version` plus the `packageVersion` fields as generated projections, while `bin/skill-integrity.json` `hub.files` ships `version.json` and `runtime/skill-dependencies.json` into any project-local or global install, so `<skillsRoot>/ws-shared/version.json` exists exactly where the detector should look.

**Required behavior.** Version resolution precedence for the global install becomes: (1) `{globalSkillsRoot}/ws-shared/version.json`; (2) the `packageVersion` projection in `{globalSkillsRoot}/ws-shared/runtime/skill-dependencies.json`; (3) a frontmatter fallback scoped strictly to package-owned `ws-*` ids, keeping the representative-id probe order ahead of any modal fallback; (4) honest `null`. A `null` global version leaves `coexistence.globalVersionDrift` `null` rather than fabricating a direction, and every candidate value is schema-checked as `major.minor.patch` semver before use because these are untrusted on-disk inputs. For scope, directory identity of the two resolved roots is established before the scope decision: equal roots are one install tree, and that tree is the global skills root, so the scope resolves to `global` — never `hybrid` — `skillsScanRoots` lists `{globalSkillsRoot}` only, and the report states the coincidence instead of the hybrid override guidance. Distinct roots keep the current matrix unchanged (`hybrid` when both are populated, `project` when only local, `global` when only global), and `upstream` classification is decided by package markers (`bin/skill-dependencies.json` plus `bin/cli.js`) together with the skill SoT before the consumer branch, so it is unaffected.

**Intentional versus accidental.** The project memory entry `[2026-09-16] Global install version sampling needs representative skills` (module `ws-check-harness install-mode detector`) records why the representative-id probe exists — an earlier sample of the first alphabetical `ws-*` folder picked an external companion instead of the package version — and its rule is to probe representative package ids first, keep `externalSkills` ids out of package comparisons, and never derive the package version from an arbitrary `ws-*` folder. That probe order and the `externalSkills` exclusion are deliberate constraints and must survive this fix. Two behaviors the same history never justified are accidental gaps to close: the modal fallback population spans the entire global skills root, so the external companions the memory entry was written to exclude still decide the reported version; and frontmatter is read instead of the canonical `ws-shared/version.json` that `bin/canonical-version.js` declares. The scope defect is accidental in the same way: the local-scope expression added by `67e7f081` encodes a two-boolean heuristic ("both trees have skills") that was never extended to the coincident-root case, and no path-identity comparison has ever existed in the detector.

**System boundaries.** Both fixes stay inside the detector and its regression suite: `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs` and `test/test-check-harness-install-mode.js`. The detector is a read-only, single-process, synchronous Node 22 CommonJS script: no new CLI flags, no change to the `installMode` or `installScope` vocabulary, no filesystem writes, no network access, no new dependency, no change to how `{skillsRoot}` or `{sharedDir}` resolve for the consumer layout, no mutation of the hub or of a machine-global install, and no shared version-resolver module (the path-identity check may live inside the detector, and the case-insensitive path-normalization precedent stays `GIT_PATH_CASE_INSENSITIVE` / `trackedKey()` in `workflow_state.cjs`, with `inside()` in `resolve_consumer_root.cjs`). Detection remains advisory: drift is reported as an informational note and never changes the detector's exit code.

## Acceptance Criteria

- AC1: The install-mode detector shall determine whether the resolved local skills root and the resolved global skills root are the same directory before assigning an install scope.
- AC2: If the resolved local skills root and the resolved global skills root are the same directory, then the detector shall not report `installScope` as `hybrid`.
- AC3: When the resolved local and global skills roots are the same directory and that directory holds `ws-*` skill folders, the detector shall report `installScope` as `global`.
- AC4: When the resolved local and global skills roots are different directories and both hold `ws-*` skill folders, the detector shall report `installScope` as `hybrid`.
- AC5: When the resolved local and global skills roots are different directories and only the local root holds `ws-*` skill folders, the detector shall report `installScope` as `project`.
- AC6: While package markers and the skill source of truth are present at the repository root, the detector shall report `installScope` as `upstream` regardless of whether the global root coincides with the local root.
- AC7: When the resolved local and global skills roots are the same directory, the detector shall list only `{globalSkillsRoot}` in `skillsScanRoots`.
- AC8: When the resolved local and global skills roots are the same directory, the detector shall emit an informational note stating that the two roots resolve to the same directory.
- AC9: If the resolved local and global skills roots are the same directory, then the detector shall omit the hybrid-install note about duplicate `name:` entries across trees.
- AC10: The install-mode detector shall compare the two roots as absolute canonical paths so that separator style, trailing separators, `.` and `..` segments, and symlink or junction aliases do not register as distinct roots.
- AC11: Where the host filesystem is case-insensitive, the detector shall treat case-only spelling differences between the two roots as the same directory.
- AC12: If a root path cannot be canonicalized on disk, then the detector shall fall back to its resolved absolute path for the comparison.
- AC13: The install-mode detector shall exit 0 with the documented JSON field set for every scope outcome.
- AC14: The install-mode regression test suite shall include a fixture in which the local skills root and the global skills root resolve to the same directory.
- AC15: The ws-check-harness documentation shall state that hybrid scope requires the local and global skills roots to resolve to different directories.
- AC16: The install-mode detector shall resolve the global install version from the hub file at `{globalSkillsRoot}/ws-shared/version.json` before consulting any skill `SKILL.md` frontmatter.
- AC17: When `{globalSkillsRoot}/ws-shared/version.json` holds a `major.minor.patch` `version` string, the detector shall report that exact string as `evidence.globalSkills.version` and as `coexistence.globalVersion`.
- AC18: When the detector resolves a global version from the hub version file, from the projection manifest, or from a package-owned frontmatter fallback, the detector shall report the same value across the JSON `evidence.globalSkills.version` field, the `coexistence.globalVersion` field, and the human-readable output.
- AC19: If the hub version file is missing, unreadable, or malformed, then the detector shall fall back to the `packageVersion` field in `{globalSkillsRoot}/ws-shared/runtime/skill-dependencies.json` before sampling any frontmatter.
- AC20: If the hub version file carries a value that is not `major.minor.patch` semver, then the detector shall discard that value and shall not report it as the global version.
- AC21: If neither hub version source yields a value, then the detector shall restrict its frontmatter fallback to package-owned `ws-*` ids and shall exclude every id declared under `externalSkills` in `bin/skill-dependencies.json` along with consumer-authored skill folders.
- AC22: The install-mode detector shall probe the representative package ids (`ws-check-harness`, `ws-tdah`, `ws-spec-to-pr`, `ws-senior-developer`) for a frontmatter version in that order before applying any package-scoped modal fallback.
- AC23: If no package-owned version source yields a value, then the detector shall report a null global version and a null `coexistence.globalVersionDrift` instead of a guessed value.
- AC24: When the global install ships the same package version as `.agents/skills/ws-shared/version.json`, the detector shall report that canonical version as `coexistence.globalVersion`.
- AC25: While the resolved global version differs from the package version, the detector shall keep its exit code at 0 and shall record the drift as an informational note rather than a warning.
- AC26: When the resolved global version equals the package version, the detector shall report `coexistence.globalVersionDrift` as `same`.
- AC27: When the resolved global version differs from the package version, the detector shall report `coexistence.globalVersionDrift` as `ahead` or `behind`, derived only from those two resolved versions.
- AC28: When the detector reads a skill `SKILL.md` for a version fallback, the detector shall confine that read to a path inside the resolved global skills root.
- AC29: The install-mode regression test suite shall include a fixture whose global skills declare conflicting frontmatter versions and shall assert that the hub version file wins.

## Original Issue Context

### Issue #494 — detect_install_mode.cjs reports false Install scope 'hybrid' when local and global skills roots are the same directory

## Summary
`detect_install_mode.cjs` reports **Install scope: hybrid** when the local skills root and the global skills root resolve to the **same directory**. This happens whenever the audit is run with `repoRoot` = the user home (`$HOME`), which is the normal case for a global-only install: `<home>/.agents/skills` is both `{skillsRoot}` (local) and `{globalSkillsRoot}`.

## Environment
- workflow-skills **0.5.35**
- Windows 11, Node v22.22.2

## Repro
```
node .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs --json --repo-root %USERPROFILE%
# -> "installScope": "hybrid"
#    evidence.localSkills.count  = 64   (root ".agents/skills")
#    evidence.globalSkills.count = 64   (resolved C:\Users\jpolv\.agents\skills)   # same folder

node .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs --json --repo-root <empty-dir>
# -> "installScope": "global"        # correct
```

## Root cause
`detect_install_mode.cjs`:
```js
const localRoot  = path.join(root, LOCAL_SKILLS_REL);   // <repoRoot>/.agents/skills
const globalRoot = resolveGlobalSkillsRoot();           // ~/.agents/skills
...
if (localIds.length > 0 && globalIds.length > 0) scope = 'hybrid';
```
There is no check that `localRoot` and `globalRoot` are different directories. When `repoRoot` is `$HOME`, they are the same path, so the same 64 skills are counted as both local and global.

## Impact
- False `Install scope: hybrid` and the note “Hybrid install … do not flag duplicate `name:` entries across trees” is emitted for a global-only tree.
- Downstream scope handling (scan roots `['.agents/skills', '{globalSkillsRoot}']`) is wrong; consumers/hosts get a misleading report.
- Also affects `coexistence` output.

## Suggested fix
Compare the resolved paths (e.g. `fs.realpathSync.native` / `path.resolve`, case-insensitive on Windows). If they are equal, resolve to `global` (or `project` when there is no global tree), never `hybrid`. Optionally emit a note that the local and global roots coincide.

### Prior Work Sweep

Sweep run for `source: github` (issue 494), command:

```
node .agents/skills/ws-spec-provider-github/scripts/sweep_prior_work.cjs --issue 494 --keywords detect_install_mode install scope hybrid skills root
```

- **Same-issue PRs: none.** Two merged pull requests matched only a full-text `#494` mention and are unrelated to this defect: PR #222 ("expand ws-audit script error auditing across all workflows and fix Azure DevOps CLI argument handling") and PR #432 ("path-aware alias failure classification and verification contracts"). Neither is an open PR for this issue, so nothing has to be reused or superseded.
- **Same-issue commits:** the sweep returned no commits for `#494`.
- **Duplicate risk: low.** The keyword sweep found no other issue or PR addressing install-scope identity, so this work item is the only track for the defect.
- **Related local knowledge (`.ws/MEMORY.md`):** `### [2026-09-16] Global install version sampling needs representative skills` carries `PathPattern` `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs;test/test-check-harness-install-mode.js`. Its trap is orthogonal but binding here: never derive the global install version from an arbitrary `ws-*` folder, keep `externalSkills` ids out of package comparisons, and keep the representative-id probe (`ws-check-harness` → `ws-tdah` → `ws-spec-to-pr` → `ws-senior-developer`). The identity fix must not disturb that probe, the drift comparison, or `coexistence.globalIdsOutsidePackage`.

### Design Intent

Probes run against the detector's real history:

```
git log --oneline -n 20 -- .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs
git log -p -S "localIds.length > 0 && globalIds.length > 0" -- .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs
git log -p -S "realpath" -- .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs
```

- The whole file was introduced by `67e7f081` — `feat(ws-check-harness): install-mode detection and upstream clean-audit invariant` (2026-09-16) — including `if (localIds.length > 0 && globalIds.length > 0) scope = 'hybrid';`, the hybrid `scanRoots` push, and the hybrid note. The `-S` probe shows the scope expression added once in that commit and never modified or removed afterwards.
- The `realpath` probe returns no history for this file: no path-identity comparison, canonicalization, or same-directory guard has ever existed in `detect_install_mode.cjs`, and no later commit narrowed the hybrid rule on purpose.
- **Conclusion: accidental gap, not an intentional constraint.** The hybrid branch encodes a two-boolean heuristic ("both trees have skills") that was correct for the distinct-root fixtures shipped with the feature and was never extended to the coincident-root case. The feature's own tests (`testProjectAndHybridScopes`) build local and global roots as two different temporary directories, so a coincident-root regression could not surface there.
- The issue's own "Suggested fix" already chooses the product outcome (equal roots → `global`, never `hybrid`), so this spec records it as an assumption instead of a gray-area companion.

### Issue #495 — detect_install_mode.cjs reports misleading globalVersion from frontmatter modal fallback (0.37.1 vs version.json 0.5.35)

## Summary
`detect_install_mode.cjs` reports a **misleading `globalVersion`** that does not match the installed package. It derives the version from skill frontmatter and, when the representative skills carry no `version:`, falls back to the **most common** frontmatter version across all global skills — which can be dominated by unrelated companion/consumer skills.

## Environment
- workflow-skills **0.5.35** (hub `ws-shared/version.json` = `0.5.35`)
- Windows 11, Node v22.22.2

## Repro
```
node .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs --json --repo-root .
# -> evidence.globalSkills.version = "0.37.1"
# -> coexistence.globalVersion     = "0.37.1"
```
But the hub version file says:
```
.agents/skills/ws-shared/version.json -> { "version": "0.5.35" }
```

## Root cause
`detect_install_mode.cjs` (~L138-152):
```js
const representativeVersions = ['ws-check-harness', 'ws-tdah', 'ws-spec-to-pr', 'ws-senior-developer'];
const globalVersion = (() => {
  for (const id of representativeVersions) {
    const version = frontmatterVersion(path.join(globalRoot, id, 'SKILL.md'));
    if (version) return version;         // none of these four define `version:`
  }
  // fallback: modal frontmatter version across ALL global skills
  const counts = new Map();
  for (const id of globalIds) { ... }
  let best = null;
  for (const [version, count] of counts) if (!best || count > best.count) best = { version, count };
  return best ? best.version : null;
})();
```
On this install the only skills with a `version:` frontmatter are:
```
ws-memo              version: 0.37.1   (external companion from the spec-memo package)
ws-session-tracking  version: 0.37.1   (external companion)
my-activities        version: 1.0.0    (consumer-authored)
```
`0.37.1` wins the count (2), so the detector reports `0.37.1` as the workflow-skills install version.

## Impact
- `evidence.globalSkills.version`, `coexistence.globalVersion`, and any drift comparison (`globalVersionDrift`) are meaningless/misleading.
- Consumers see a version unrelated to the installed package, making “am I up to date?” checks unreliable.

## Suggested fix
Read the version from the hub (`{globalSkillsRoot}/ws-shared/version.json`, fallback `ws-shared/config.json` package version) instead of skill frontmatter. Keep frontmatter as a last-resort fallback only, and scope the fallback to package-owned skills (`ws-*` present in `skill-dependencies.json`), never to external companions or consumer-authored skills.

### Prior Work Sweep

Command run (issue #495, keywords `detect_install_mode globalVersion frontmatter version`):

```
node .agents/skills/ws-spec-provider-github/scripts/sweep_prior_work.cjs --issue 495 --keywords detect_install_mode globalVersion frontmatter version
```

Outcome: `status: ok`, `pullRequests: []`, `commits: []`. **No open (or closed) PR and no commit references issue #495**; there is no same-issue open PR to reuse or stop for, and no duplicate-risk hit from the sweep. Related local history (same symptom family, not this issue) is recorded under `### Design Intent`.

### Design Intent

`git log --oneline -n 20 -- .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs` shows seven commits touching the detector; the version resolver itself was introduced whole by `67e7f081 feat(ws-check-harness): install-mode detection and upstream clean-audit invariant` and has not been revised since. `git log -p -S "representativeVersions"` on that path returns only `67e7f081`: the representative-id probe list, the modal-fallback loop, and the `best` selection were all added in that single greenfield commit — there is no later commit that deliberately extended or re-scoped the fallback.

**Intentional constraint (preserve).** The project memory index (`MEMORY.md` under `rules.memoryDir`, entry `[2026-09-16] Global install version sampling needs representative skills`, module `ws-check-harness install-mode detector`) records why the representative probe exists: an earlier approach that sampled the first alphabetical `ws-*` folder picked an external companion instead of the package version, and the recorded rule is to probe representative package ids first, then fall back to the most frequent frontmatter version, while keeping `externalSkills` ids out of package comparisons. The representative-probe ordering and the `externalSkills` exclusion are therefore deliberate; the fix must not remove them.

**Accidental gap (fix).** The same entry never contemplated that the modal fallback population spans the *entire* global skills root, so it can be dominated by external companions and consumer-authored skills; the entry's own stated goal (stop external companions from deciding the reported version) is violated by that fallback. Separately, no commit or memory entry ever justified reading frontmatter instead of the canonical `.agents/skills/ws-shared/version.json` that `bin/canonical-version.js` declares. Conclusion: the representative probe is an intentional constraint to keep, while the unscoped modal fallback and the missing canonical-source read are accidental gaps to close.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing the `installMode` or `installScope` vocabulary (`upstream`, `project`, `global`, `hybrid`, `none`) | Both defects are wrong values, not a missing value: consumers, docs, and `REPORT-FORMAT.md` already parse this enum, so it stays as-is |
| Re-tuning the scope matrix for genuinely distinct roots | That rule is correct today (both populated, local only, global only) and is guarded by the existing fixtures; only the coincident-root identity predicate is added |
| Retargeting `pathTokens.skillsRoot` or redefining `{skillsRoot}` for the consumer install layout | Skills-root and hub resolution are owned by the config/resolution contract in `resolve_consumer_root.cjs`, not by the Phase 0 install-mode detector |
| Pruning, updating, or uninstalling a machine-global skills tree | The detector is read-only; the installer `update` / `uninstall` commands own global tree maintenance |
| Adding `version:` frontmatter to package `SKILL.md` bodies | `ws-shared/version.json` is the declared canonical source, and frontmatter additions would churn integrity hashes for no gain |
| Changing how `packageVersion` is read from `{repoRoot}/package.json` | Separate resolution concern; these issues are only about the global-install version and the install scope |
| Removing or rescoping the representative-id version probe and the `externalSkills` exclusion | Both are deliberate recorded constraints; the fix keeps the probe order and keeps external companion ids out of package version comparisons |
| Reworking the `coexistence.globalIdsOutsidePackage` computation or the `ahead` / `behind` / `same` drift vocabulary | Intentional and independent of root identity; the version fix changes only which value feeds the existing comparison |
| Introducing a shared version-resolver or path-identity module reused across skills | Unrequested abstraction; `ws-version` and `workflow_state.cjs` already resolve versions for their own surfaces, and the identity check may live inside the detector |
| Adding a CLI flag to override the detected scope | No product need is stated; the same result is reachable through `repoRoot` and `WORKFLOW_SKILLS_GLOBAL_DIR` |
| Auditing third-party non-`ws-*` skills under a shared global root | Belongs to the skills-scan-root consumers of Phases 1-5c, not to scope classification |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Hub file layout in an installed (project-local or global) tree | `<skillsRoot>/ws-shared/version.json` and `<skillsRoot>/ws-shared/runtime/skill-dependencies.json` both exist | `bin/skill-integrity.json` `hub.files` lists both as shipped hub content, and `bin/cli.js` instructs the operator to "Run update to install ws-shared/version.json from upstream" | y |
| Version resolution precedence | `version.json` → `runtime/skill-dependencies.json` `packageVersion` → package-owned frontmatter → `null` | `bin/canonical-version.js` declares `version.json` canonical and treats `package.json.version` and the `packageVersion` fields as generated projections; the issue's suggested fix keeps frontmatter as last resort | y |
| Frontmatter fallback scope | Package-owned `ws-*` ids only, never `externalSkills` ids or consumer-authored folders, keeping the representative-id probe order first | The issue's suggested fix, the `[2026-09-16]` memory entry, and the recorded constraint that external companions stay out of package version comparisons | y |
| Unresolved version handling | Report `null` and leave `coexistence.globalVersionDrift` `null` | Honest reporting was explicitly requested; a guessed version silently corrupts drift direction | y |
| Input validation boundary | Treat `version.json` and `skill-dependencies.json` content as untrusted file input and require `major.minor.patch` semver | `typescript-node` stack invariant 3 (boundary input validation) | y |
| Scope value when the two roots coincide and hold `ws-*` skills | `global` | The issue's "Suggested fix" resolves equal roots to `global` (or `project` only when no global tree exists); because the coincident path *is* the global root, `global` is the single consistent answer | y |
| Which classification the identity check applies to | Only the `consumer` scope matrix; `upstream` keeps short-circuiting on package markers plus SoT | `upstream` scope is decided before the consumer branch and never inspects root identity; changing it would alter the upstream self-audit invariant | y |
| Case handling for the root comparison | Case-insensitive when `process.platform === 'win32'`, exact elsewhere | Matches the existing precedent in `workflow_state.cjs` (`GIT_PATH_CASE_INSENSITIVE` / `trackedKey()`) instead of inventing a new path contract | y |
| Whether canonicalization may touch the filesystem | Read-only `realpath` / existence checks only, with a resolved-path fallback when a root is missing | The detector is documented as read-only and must keep working for a repository root or global root that does not exist yet | y |
| Concurrency, auth boundaries, rate limits, idempotency, ordering, data lifecycle, expiry, and network failure | N/A because the detector is a single-process, synchronous, read-only, unauthenticated local CLI that holds no persisted state, performs no network I/O, has no TTL surface, and is safe to re-run | None of these dimensions has a behavior to specify here; inventing ACs for them would be noise | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope — behavior surface | Code acceptance depends on changing only `detect_install_mode.cjs` and `test/test-check-harness-install-mode.js`; no new CLI flag, no enum change, no shared-helper API change | `git diff --name-only` lists exactly those two paths for the behavioral change |
| Bounded scope — documentation surface | The only permitted additional edit is the `ws-check-harness` detection wording (`SKILL.md` / `PHASES.md`) needed to state that hybrid requires distinct roots; because that tree is hashed install content, integrity must be regenerated in the same change | `git diff --name-only` lists `SKILL.md` / `PHASES.md` only when the wording item is satisfied, plus `npm run generate-integrity` and `npm run verify-integrity` exit 0 |
| Atomic criteria | Every AC maps to one observable field, one exit code, or one test assertion | `validate_spec.cjs --mode=authoring` exits 0 and each AC maps to a named fixture or observation |
| Failure modes | Missing, malformed, and non-semver hub version inputs plus coincident, distinct, missing, uncanonicalizable, case-variant, trailing-separator, and alias roots are each handled without a false `hybrid`, a fabricated version, or a crash | AC19, AC20, AC23, AC12, AC11 and negative scenarios N3, N8, N9, N10, N12 |
| Observation telemetry | Detector JSON (`installMode`, `installScope`, `skillsScanRoots`, `primaryHubSource`, `evidence`, `coexistence`, `warnings`, `notes`) is the observable signal before and after | `node .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs --json --repo-root <dir>` |
| Zero open blockers | No open PR or commit references either issue | `node .agents/skills/ws-spec-provider-github/scripts/sweep_prior_work.cjs --issue 494 --keywords detect_install_mode install scope hybrid skills root` and the same sweep with `--issue 495 --keywords detect_install_mode globalVersion frontmatter version` |
| Regression protection | The existing suite gains a version-precedence fixture and a coincident-root fixture and still passes end to end | `node test/test-check-harness-install-mode.js` and `npm run test` exit 0 |
| Stack invariant — boundary input validation (typescript-node #3) | Hub version inputs are semver-validated before use, and `--repo-root` plus `WORKFLOW_SKILLS_GLOBAL_DIR` are normalized through `path.resolve` before comparison, including relative and missing values | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`, plus AC17, AC20 and a run with a relative `--repo-root` and a missing global dir |
| Stack invariant — path containment | Frontmatter fallback reads stay inside the resolved global skills root and the existing `ws-*` id guard stays in place | AC28 and N11, plus code review of the `path.join` read sites |
| Stack invariant — no silent failure | Unreadable hub files and uncanonicalizable roots fall through to the next source instead of throwing an unhandled error | AC12, AC19 and negative scenarios N3, N8 |
| Stack invariant — synchronous, no floating promises (typescript-node #2) | The fix keeps `detect()` fully synchronous; no deferred promise, awaited `realpath`, or fire-and-forget call is introduced | `node --check .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs` plus diff review for `async` / `await` additions |
| Stack invariant — no unchecked `any` (typescript-node #1) and Node-only runtime | The CommonJS change adds no `any`, `as any`, `@ts-ignore`, or `@ts-nocheck` and no `.py` file | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` |
| Security invariant — read-only, no new traversal | Both fixes perform read-only checks, resolve nothing outside the two compared roots, and add no filesystem write or subprocess call | Diff review confirms no `fs.write*`, `fs.mkdir*`, or `child_process` addition |
| Harness integrity | Editing hashed `ws-check-harness` content regenerates the integrity manifest and keeps the package-root self-audit clean | `npm run generate-integrity`, then `npm run verify-integrity`, and `node test/test-harness-clean.js` reports 0 findings |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Primary signal: `node .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs --json --repo-root <dir>` and its `installMode`, `installScope`, `skillsScanRoots`, `primaryHubSource`, `evidence`, `coexistence`, `warnings`, and `notes` fields.
- Version baseline observed on this repository before the fix, with the machine-global install present: the same command returned exit 0 with `installMode: "upstream"`, `installScope: "upstream"`, `evidence.globalSkills.version: "0.37.1"`, `coexistence.globalVersion: "0.37.1"`, `coexistence.packageVersion: "0.5.35"`, `coexistence.globalVersionDrift: "ahead"`, and a note claiming the global install is *ahead* of the package.
- The same invocation's globally installed hub reports `{ "version": "0.5.35" }` and `packageVersion` `0.5.35`, so the global install is *not* ahead of the package. The reported `0.37.1` therefore comes from the frontmatter modal fallback, confirming the root cause without reading anything outside the two version files the detector is supposed to consult.
- Version acceptance signal after the fix: the same command reports `coexistence.globalVersion: "0.5.35"`, `coexistence.globalVersionDrift: "same"`, and no drift note. This is the primary acceptance signal for AC16, AC17, AC18, AC24, AC25, and AC26.
- Scope baseline observed on this Windows host before the fix, with `--repo-root` set to the user home: `"installScope": "hybrid"` with `evidence.localSkills.count` equal to `evidence.globalSkills.count` (64 on the reporting host) and `evidence.globalSkills.resolved` pointing at the same `<home>/.agents/skills` directory as `evidence.localSkills.root`, plus the hybrid override note. The same detector invoked with `--repo-root` set to an empty directory already reported `"installScope": "global"`, which is the correct classification.
- Scope acceptance signal after the fix, for the coincident-root invocation: `installScope` `global`, `skillsScanRoots` listing `{globalSkillsRoot}` only, and a note stating that the two roots resolve to the same directory (AC3, AC7, AC8).
- Deterministic regression signal: `node test/test-check-harness-install-mode.js` (prints one ✅/❌ per assertion and exits non-zero on any failure); the suite is registered in `test/test-suites.json` and therefore executed by `npm run test` (configured `verification.backendTest`).
- Package self-audit signal: `node test/test-harness-clean.js` must report 0 findings at the package root.
- Stack signal: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.
- Integrity signals after editing hashed skill content: `npm run generate-integrity`, then `npm run verify-integrity`.
- Exit-code signal: the detector stays exit 0 in every scenario below, including the malformed-input and coincident-root scenarios.

### Negative & Failing Test Scenarios

- N1 (red before the fix, AC2/AC3/AC14): a fixture whose repository root hosts `.agents/skills` *and* whose `WORKFLOW_SKILLS_GLOBAL_DIR` points at that same directory must assert `installScope !== 'hybrid'` and `installScope === 'global'`. The observed pre-fix value is `hybrid`, so this assertion is the failing test that proves the scope defect.
- N2 (AC11): a case-variant spelling of the same root on a case-insensitive host must not yield `hybrid`. The fixture must probe host case-sensitivity at runtime rather than assume it, so the test does not become platform-flaky on a case-sensitive filesystem.
- N3 (AC5, AC12, stack invariant — no silent failure): with local `ws-*` skills present and `WORKFLOW_SKILLS_GLOBAL_DIR` pointing at a missing path, the detector must exit 0 and report `project`, never a canonicalization `ENOENT` throw and never a false `hybrid`.
- N4 (AC4): distinct-root regression guard — the existing `testProjectAndHybridScopes` assertions must keep passing unchanged; two genuinely different roots with skills in both must still report `hybrid` with scan roots `['.agents/skills', '{globalSkillsRoot}']`, proving the identity check does not over-collapse.
- N5 (AC7, AC9): unwanted-behavior guard — the coincident-root report must not contain the hybrid "do not flag duplicate `name:` entries across trees" note and must not list the same physical directory twice in `skillsScanRoots`.
- N6 (stack safety, typescript-node pack): the fix must not introduce asynchronous canonicalization, a floating promise, or a new filesystem write into the synchronous read-only detector; an `async` / `await` diff hunk, a `node --check` failure, or an added `fs.write*` call is a red signal.
- N7 (red before the fix, AC16/AC17/AC24/AC29): temp fixture where the global tree's `ws-shared/version.json` holds `9.9.9` while external companion skills (`ws-memo`, `ws-session-tracking`) declare `version: 0.37.1` and one representative id declares `version: 0.4.30`. Assert `coexistence.globalVersion === '9.9.9'`. The current modal fallback returns `0.37.1` and fails.
- N8 (AC19, stack invariant — no silent failure): `ws-shared/version.json` containing truncated JSON (`{"version":`). The detector must exit 0, fall through to the `packageVersion` projection, and must not throw an unhandled parse error.
- N9 (AC20): `ws-shared/version.json` containing `{ "version": "not-a-semver" }`. The value must be discarded and must never surface as `coexistence.globalVersion` or as an `ahead` / `behind` drift direction.
- N10 (AC21, AC23): global tree where the only skills declaring `version:` are external companions and consumer-authored folders, and no hub version file exists. Assert `coexistence.globalVersion === null` and `coexistence.globalVersionDrift === null` — no fabricated version and no fabricated drift.
- N11 (AC28, stack invariant — path containment): a global skills folder name that attempts directory escape (for example an id containing `..`) must not cause a read outside the resolved global skills root. The detector's existing `SKILL_ID_RE = /^ws-[a-z0-9][a-z0-9-]*$/` listing guard must still reject it; the negative test asserts the guard stays in place after the resolver is rewritten.
- N12 (AC23, AC25): a resolved version that cannot be compared against a package version (package `package.json` unreadable) must leave `globalVersionDrift` `null` and must not emit a misleading drift note or a non-zero exit.

## Notes

- Observable contract: the detector's JSON field set stays stable (`installMode`, `installScope`, `skillsScanRoots`, `primaryHub`, `primaryHubSource`, `integrityGate`, `evidence`, `coexistence`, `warnings`, `notes`). `ws-check-harness` Phase 0 records these fields, and `test/test-harness-clean.js` asserts the upstream self-audit invariant on the same fields. Once the coincident tree is classified `global`, the `coexistence` block keeps reporting it meaningfully (`globalPresent`, `globalSkillsRoot`, `globalSkillCount`, `globalVersion`, `globalVersionDrift`), while `globalIdsOutsidePackage` (computed only for `upstream` mode when package markers and the skill SoT are present) is unaffected.
- Both fixes are confined to the report and neither mutates anything: the version change does not alter scope classification, and the scope change does not alter version resolution. `integrityGate`, the upstream clean-audit invariant, the `installMode` / `installScope` vocabulary, and every installed tree stay untouched. Detection remains advisory, and drift is reported as an informational note rather than a warning.
- Intentional constraints preserved: the representative-id version-probe order (`ws-check-harness` → `ws-tdah` → `ws-spec-to-pr` → `ws-senior-developer`) and the `externalSkills` exclusion stay in place (AC21, AC22). Accidental gaps closed: the modal fallback population must no longer span the whole global root, and the canonical `ws-shared/version.json` must be consulted (AC16, AC17, AC21).
- The `packageVersion` field the detector reads from `{repoRoot}/package.json` is a separate concern from the global-install version and is unchanged here.
- Downstream note: hashed skill or script content changes require `npm run generate-integrity` plus `npm run verify-integrity` in the same change. Acceptance of the behavioral contract depends on changing only `detect_install_mode.cjs` plus `test/test-check-harness-install-mode.js`; the sole permitted additional edit is the `ws-check-harness` detection wording in `SKILL.md` / `PHASES.md` required by AC15, which is hashed content and therefore carries the same integrity obligation. `bin/skill-integrity.json` does not hash the detector's behavior itself, but it does hash `ws-shared/version.json` and `ws-shared/runtime/skill-dependencies.json`, which this spec reads and does not modify.
- The human-readable output already prints the version inline (`Global skills: <n> under {globalSkillsRoot} (v<version>)`); AC18 keeps both surfaces consistent rather than adding a new one.
- Prefer reusing the existing path-normalization precedent (`GIT_PATH_CASE_INSENSITIVE` / `trackedKey()` in `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`, and `inside()` in `resolve_consumer_root.cjs`) over adding a new shared contract. Keep the lookup synchronous: `detect()` has no async call sites today.
- Node-only runtime contract: CommonJS `.cjs`, no Python helper, no new dependency; Node 22 is the packaged runtime.
- Repository delivery rules that touch this work item: every shipped PR bumps the patch version once (`npm run build-site:bump`), and the harness self-audit (`node test/test-harness-clean.js`) must stay at 0 findings.
- `MEMORY.md` (configured `rules.memoryDir`) is a local-only consumer artifact; it is cited here as design-intent evidence, not as a shipped dependency.
