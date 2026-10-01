---
step: 2
slug: us-488
workflowId: us-488-20261001T164503Z
status: completed
title: "fix(installer): physical folder copy for the gemini target on Windows and regex include_only"
startedAt: "2026-10-01T17:00:00Z"
endedAt: "2026-10-01T17:06:00Z"
acRefs: []
supersedes: step-01-us-488.plan.md
---
# Refined plan — us-488

Additive to `step-02-us-488.plan-interview.md` (registry G1..G10). §8 open questions are resolved and folded into §2/§3; §5 AC mapping and §6 stack invariants are preserved verbatim in intent.

## 0. Summary & Business Rules

The `gemini` secondary global target is configured declaratively in `<home>/.gemini/config/skills.json` and, historically, individual `ws-*` folders under `<home>/.gemini/config/skills/` were swept by `cleanupLegacyGeminiSkills`. Two defects make `ws-*` skills invisible to the target host on Windows: (a) the host scanner does not follow ReparsePoints, so junction/symlink projections are skipped; (b) `include_only: ['ws-*']` is interpreted as a regular expression and therefore never matches `ws-version`/`ws-doctor` (regex `ws-*` matches only `w`, `ws`, `wss`).

Business rules / objectives (AC1..AC7):

- On Windows, project each `ws-*` skill into `<home>/.gemini/config/skills/` as a real physical directory copy (AC1).
- Replace a pre-existing junction/symlink for a `ws-*` skill with a physical copy (AC2).
- Write the declarative entry with `include_only: ["^ws-.*"]` in every upsert path (AC3).
- Keep physical `ws-*` copies during install, update, and uninstall of other skills (AC4).
- On full uninstall, remove only the `ws-*` directories and the owned `skills.json` entry, preserving non-`ws-*` third-party skills (AC5).
- Remain idempotent: exactly one `skills.json` entry per resolved skills path, no duplicate or dangling `ws-*` entries/dirs (AC6).
- Isolate the `gemini` `skills.json` path in tests so runs never touch the real `<home>/.gemini/config/skills.json` (AC7).

Security mitigations: all projection/removal stays inside the target home's `.gemini/config/skills/` directory; path comparison uses `normalizeGeminiPath`; JSON read/recovery preserves `inherits` and unrelated entries; tests must not write outside owned paths.

## 1. Definition of Ready & Scope

Scope: defect fix limited to `bin/install-rules.js`, `bin/cli.js`, and `test/test-install.js`. DoR items from the spec (`## Definition of Ready (DoR)`) are met; the reproducible failure is a fixture home with a `ws-*` junction plus `include_only: ['ws-*']`.

Out of scope (spec `## Out of Scope`): projection strategy for non-`gemini` targets; non-Windows behavior change for `gemini`; shipping the PowerShell workaround as a script; new host targets/capabilities.

**Resolved assumptions** (spec `## Assumptions & Open Questions`, now decided; see §8):

| Item | Decision |
|------|----------|
| Windows is the only affected platform | `shouldProjectGeminiAsCopy(platform) === (platform === 'win32')`; POSIX gemini stays declarative-only (G2) |
| Physical copies acceptable | Copy `ws-*` dirs (incl. `ws-shared`, G6) with `simpleCopyDir`/`syncManagedSkillDir`; discovery correctness wins |
| Existing junctions self-heal | `projectSkillToTarget(..., { symlink:false })` removes the lexical destination (link or dir) before copy (AC2) |
| `skills.json` still maintained | Keep the entry with `include_only: ["^ws-.*"]` |
| Rate limits / concurrency / data lifecycle | N/A — single local CLI process, no auth boundary, no concurrent writers, no persisted lifecycle |

## 2. Technical Design & Architecture

Layers touched (`config.json`): `installer-cli` (`bin/`) and `tests` (`test/`).

Design intent (`### Design Intent`): the declarative `skills.json` + junction strategy were deliberate (PR #335 / PR #269). The fix narrows only the `gemini` projection strategy (physical copy on Windows) and corrects the declarative regex; it does not revert declarative configuration.

`bin/install-rules.js`:
- `upsertGeminiSkillsJsonEntry`: JSDoc default, function-parameter default, and `targetPattern` fallback change to `['^ws-.*']` (AC3, G8).
- `removeGeminiSkillsJsonEntry`: strip `'^ws-.*'` **and** legacy `'ws-*'` from owned entries, keep remaining custom patterns, drop the entry only when nothing remains (AC3, AC5, AC6, G4).
- `projectSkillToTarget(src, dest, { symlink: false })` already removes a lexical destination (link, dir, or dangling reparse point) via `pathLexists` + `rmSync` and then copies; reuse it to satisfy AC2 without new machinery. Uses `lstat`/lexical existence so dangling links heal (memory: dangling-link-lexists).
- New pure, exported decision helper `shouldProjectGeminiAsCopy(platform = process.platform)` returns `platform === 'win32'` (AC1, G2), unit-testable cross-platform.
- `cleanupLegacyGeminiSkills(homeDir, { includePhysical = false } = {})` (G1): always remove `ws-*` reparse points (junction/symlink, including dangling); remove physical `ws-*` directories only when `includePhysical` is true; never touch non-`ws-*` items (AC4, AC5). Preserves the recorded partial-uninstall legacy-sweep requirement (links-only) while no longer deleting legitimate physical copies.

`bin/cli.js`:
- `projectSkillsToSecondaryTargets` `gemini` branch: upsert with `['^ws-.*']`; when `shouldProjectGeminiAsCopy()`, loop `skillNames` and `projectSkillToTarget(..., { symlink: false, copyFn: (s, d) => syncManagedSkillDir(s, d) })` into `<home>/.gemini/config/skills/<skillName>`; then call `cleanupLegacyGeminiSkills(homeDir)` **links-only default** to sweep stale links while the fresh copies survive (AC1, AC2, AC3, AC4). On POSIX the branch performs only upsert + links-only sweep (no physical copies) (G2, G11).
- `removeSkillsFromSecondaryTargets(skillNames, secondaryTargets, { geminiKeepEntry = false, geminiIncludePhysical = false } = {})` (G3): gemini branch skips `removeGeminiSkillsJsonEntry` when `geminiKeepEntry` is true, and forwards `{ includePhysical: geminiIncludePhysical }` to `cleanupLegacyGeminiSkills`. Non-gemini targets unchanged.
- Uninstall block (`bin/cli.js` ~:2581): compute `remainingWsSkills`; call `removeSkillsFromSecondaryTargets` with `{ geminiKeepEntry: remainingWsSkills.length > 0, geminiIncludePhysical: remainingWsSkills.length === 0 }`; delete the bespoke partial-sweep loop at :2591-2603 (AC4, AC5, G3).
- Hub copy (G6): `skillsToProject` continues to include `HUB_DIR` (`ws-shared`, `bin/cli.js:2064-2068`); the gemini copy loop copies it like every other target so copied skills' relative `../ws-shared/...` references resolve.

Test isolation (AC7, G5): `test/test-install.js` already isolates `HOME`/`USERPROFILE` for gemini-touching spawns (`:2469`, `:2791`); audit every gemini-touching spawn and centralize a mock-home env, then add a before/after guard on `getGeminiSkillsJsonPath(os.homedir())` (content + mtime) proving the real user file is untouched. No production env switch.

## 3. Step-by-Step Plan

1. **Regex token consolidation (AC3, G8)** in `bin/install-rules.js` and `bin/cli.js`: change the `gemini` upsert default and call site to `include_only: ['^ws-.*']`; update `removeGeminiSkillsJsonEntry` to strip `'^ws-.*'` and legacy `'ws-*'` (G4). Sibling sweep: grep bin/ + test/ for remaining `include_only: ['ws-*']` and `'ws-*'` strip literals in gemini paths. Tests: V3:gemini-regex-pattern, V10:gemini-no-glob-literal.

2. **cleanup semantics (AC4, AC5, G1)** in `bin/install-rules.js`: add `{ includePhysical = false }` to `cleanupLegacyGeminiSkills`; always remove `ws-*` reparse points (junction/symlink, incl. dangling), remove physical `ws-*` only when requested, keep non-`ws-*` untouched. Tests: V4:gemini-preserve-physical-install, V5:gemini-full-uninstall, V9:gemini-dangling-heal; convert the `1f` fixture (`:2850-2865`) from a physical dir to a reparse point (G9).

3. **Physical-copy projection (AC1, AC2, G2, G6)** in `bin/install-rules.js` + `bin/cli.js`: add `shouldProjectGeminiAsCopy`; in the `gemini` branch project `skillNames` (incl. `ws-shared`) via `projectSkillToTarget` with `symlink: false`. AC2 is satisfied because the destination is removed lexically before copy. Tests: V1:gemini-physical-copy, V2:gemini-replace-link, V8:gemini-copy-projection-decision (explicit `'win32'`/`'linux'` args).

4. **Uninstall wiring (AC4, AC5, G3)** in `bin/cli.js`: thread the `{ geminiKeepEntry, geminiIncludePhysical }` options through `removeSkillsFromSecondaryTargets`; partial keeps the entry and physical copies while sweeping links; full removes entry + physical copies. Tests: V11:gemini-preserve-on-partial-uninstall, V12:gemini-third-party-preserved.

5. **Idempotency hardening (AC6, G7)** in `bin/install-rules.js` + `bin/cli.js`: rely on normalized-path upsert matching (one entry per resolved path) and `projectSkillToTarget`'s remove-then-copy (one dir per skill); ensure no second sweep path recreates/dangles entries. Tests: V6:gemini-idempotent-repeat, plus the extended custom-globalDir repeat-upsert assertion (`:2904-2921`).

6. **Test isolation + regression suite (AC7, all, G5, G9)** in `test/test-install.js`: centralize the mock-home env for gemini-touching spawns; update assertions from `'ws-*'` to `'^ws-.*'`; convert the legacy-cleanup fixture to a link; add the real-home isolation guard. Tests: V7:gemini-test-isolation.

Defect-class sibling sweep (repo-wide, bin/ + test/): `include_only: ['ws-*']` literals in gemini paths, legacy `'ws-*'` strip in `removeGeminiSkillsJsonEntry`, and any other target-specific physical-sweep helper. Sabotage verification: `node .agents/skills/ws-testing/scripts/run_sabotage.cjs` (mutation unset in `config.json`; `skipMutationTesting` true) to prove the new AC1/AC3/AC5 assertions fail when the fix is reverted.

## 4. Permissions, Tenancy & i18n

Not applicable: local single-process CLI installer, no auth boundary, no tenancy field, no user-facing i18n strings (`config.json` frontend framework `none`). The only sensitive boundary is filesystem ownership of the target `.gemini/config/skills/` tree, covered in §6.

## 5. Test Coverage

All tests run in `test/test-install.js` (Phase 12 "Multi-host global targets" plus the gemini helper unit block), driven by `npm run test` (`verification.backendTest`).

| AC | Implementation work | Expected files | Named test |
|----|---------------------|----------------|------------|
| AC1 | `shouldProjectGeminiAsCopy` + gemini branch copy loop | `bin/install-rules.js`, `bin/cli.js` | V1:gemini-physical-copy, V8:gemini-copy-projection-decision |
| AC2 | `projectSkillToTarget(..., {symlink:false})` remove-then-copy | `bin/install-rules.js` | V2:gemini-replace-link |
| AC3 | `include_only: ['^ws-.*']` default + call site; strip in remove | `bin/install-rules.js`, `bin/cli.js` | V3:gemini-regex-pattern, V10:gemini-no-glob-literal |
| AC4 | links-only default sweep; keep physical `ws-*` | `bin/install-rules.js`, `bin/cli.js` | V4:gemini-preserve-physical-install, V11:gemini-preserve-on-partial-uninstall |
| AC5 | `{includePhysical:true}` on full uninstall + owned-entry removal (strip `^ws-.*` + legacy `ws-*`) | `bin/install-rules.js`, `bin/cli.js` | V5:gemini-full-uninstall, V12:gemini-third-party-preserved |
| AC6 | normalized upsert match + remove-then-copy idempotency | `bin/install-rules.js`, `bin/cli.js` | V6:gemini-idempotent-repeat |
| AC7 | mock-home env centralization + real-home guard | `test/test-install.js` | V7:gemini-test-isolation |

Negative/failing scenarios from the spec map to: V1 (pre-existing junction at `ws-doctor` must become physical; `lstat` not-a-symlink), V3 (seeded `ws-*` must be rewritten to `^ws-.*`), V6 (second install must not duplicate), V12 (pre-existing third-party physical skill preserved), V7 (real home `skills.json` mtime/content unchanged), V9 (dangling link healed), plus remove-after-fix leaves no `^ws-.*` entry. Existing Phase 12 assertions at `test/test-install.js` `:2798`, `:2893`, `:3268` (and upserts at `:2896`, `:2908`) must move to `'^ws-.*'`.

## 6. Stack & Security Invariants Verification Plan

Stack: `typescript-node` (`{skillsRoot}/ws-shared/runtime/stacks/typescript-node.md`) with `node-skills-package` layers. Touched framework boundaries:

- **Path traversal / filesystem containment (Critical):** projection and removal destinations must resolve under `<home>/.gemini/config/skills/`; compare with `normalizeGeminiPath`; use lexical existence (`pathLexists`) so junction/symlink/dangling paths are handled. Check: V1, V2, V4, V5, V9.
- **Boundary input validation (Warning):** `skills.json` parse/recovery must preserve `inherits` and unrelated entries (existing `readGeminiSkillsJson`); the regex token is a constant, not user input. Check: V3, V10.
- **Concurrency & async safety (Critical, N/A):** the installer is synchronous; no new promises/floating async introduced. Confirm no `async` added.
- **Resource/lifecycle cleanup (Warning, N/A):** no streams/sockets; files are read/written atomically enough for a single local process.
- **Idempotent data lifecycle:** JSON read-modify-write writes only when the snapshot changes; remove-then-copy projection yields exactly one directory per skill. Check: V6.
- **Reparse-point removal safety (Critical):** `projectSkillToTarget`/`removeLexicalPath` must unlink a junction/symlink (not recurse into and delete the link target). Reuses the existing `lstat`-based pattern already shipping. Check: V2, V9.
- **config.json invariants:** `commitPlanFilesOnlyAtStep8: true` (plan artifacts are not staged before Step 8); EF/tenancy/migration invariants are `false`/N/A for this Node package. Check: `git status` after edits; no `{plansDir}` staging.

Commands: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`; `npm run test` (`verification.backendTest`); run install tests only via the npm-run env (memory: WSL `bash.exe` breaks the secrets-hook phase; `npm test` re-packs first). No secrets introduced.

Memory guidance applied (Medium+ DO NOT / INSTEAD DO):

- **Antigravity/Gemini declarative config (2026-09-15):** DO NOT clobber custom user entries or `inherits`; INSTEAD DO heal corrupt JSON with `.bak.<timestamp>`. Preserved by keeping `readGeminiSkillsJson` and merge/strip semantics.
- **Partial uninstall must still sweep legacy junctions (2026-09-15):** DO NOT drop the legacy sweep on partial uninstall; INSTEAD DO still call the sweep (links-only) when the declarative entry is preserved. Applied in Step 2/4.
- **Shared-path `skills.json` merge/strip, never narrow or delete (2026-09-15):** upsert merges only when `include_only` is an array (unrestricted entries untouched); remove strips only the owned patterns and keeps remaining patterns. Applied in Step 1.
- **Wrong-shape recovery preserves `inherits` (2026-09-15):** unchanged; regression assertions retained.
- **Dangling symlink/junction handling (2026-09-15):** DO NOT gate removal on `fs.existsSync`; INSTEAD DO use `lstatSync`/`pathLexists`. Applied to the new links-only sweep (V9).
- **Gemini matcher must expand tilde before compare (2026-09-15):** keep `normalizeGeminiPath` in upsert/remove.
- **Home prefix check must require path separator (2026-09-15):** do not change `resolveTargetHomeDir`; separation already enforced.
- **Stale test after intentional default change (2026-09-18):** update the old cleanup test to the new links-only contract in the same change (G9); never revert the feature to satisfy the stale expectation.
- **Install-test fixture hygiene (2026-09-25):** run install tests via the npm-run env; snapshot/restore repo fixtures; verify `git status --porcelain` shows only intended files.
- This plan intentionally supersedes the older "do not project individual skills into `~/.gemini/config/skills/`" guidance for the `gemini` target on Windows only, based on newly observed target-host scanner behavior (`### Design Intent`); record via `update-memory` after implementation.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (bin/ + test/ only).
- [ ] No schema migrations (N/A).
- [ ] No authorization boundary (N/A).
- [ ] Stack & security invariants verified (path containment, input recovery, reparse-point removal, idempotency, cleanup).
- [ ] i18n keys declared (N/A).
- [ ] Tests cover AC1..AC7 (V1..V12) and negative scenarios.
- [ ] Sibling sweep for `include_only: ['ws-*']` / `'ws-*'` gemini literals clean.
- [ ] `npm run generate-integrity` + `npm run verify-integrity` if hashed content changed.
- [ ] Version bump once per PR (`npm run build-site:bump`) before ship.
- [ ] `plan.index.json` rebuild positive (`plan_index.cjs build` maps AC1..AC7).

## 8. Resolved Decisions (was Open Questions)

1. **cleanup function shape →** extend `cleanupLegacyGeminiSkills(homeDir, { includePhysical = false } = {})`; no new exported helper (G1, `project`).
2. **Windows-only gating →** `shouldProjectGeminiAsCopy(platform = process.platform) === (platform === 'win32')`; POSIX gemini stays declarative-only, AC2 exercised cross-platform via direct projection unit tests (G2, `model-inferred`).
3. **Full-uninstall wiring →** thread `{ geminiKeepEntry, geminiIncludePhysical }` through `removeSkillsFromSecondaryTargets`; remove the bespoke partial-sweep loop (G3, `project`).
4. **Legacy token migration in remove →** strip both `'^ws-.*'` and legacy `'ws-*'`, keep custom patterns, drop entry only when empty (G4, `project`).
5. **AC7 isolation →** centralize mock-home env for gemini-touching spawns + real-home content/mtime guard; no production env switch (G5, `model-inferred`).
6. **`ws-shared` hub projection →** copy it with the other `ws-*` folders (relative refs depend on it; other targets already project it; no `SKILL.md` so no slash command) (G6, `project`).
7. **Idempotency for `WORKFLOW_SKILLS_GLOBAL_DIR` →** normalized-path upsert yields one entry per resolved path; extend the custom-globalDir test to repeat-upsert and use `'^ws-.*'` (G7, `project`).
