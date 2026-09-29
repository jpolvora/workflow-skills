---
step: 1
slug: us-455
workflowId: us-455-20260929T125300Z
status: completed
startedAt: "2026-09-29T12:55:51.000Z"
endedAt: "2026-09-29T12:58:40.000Z"
acRefs: []
title: "add ws-version skill — install scope, skill directory, package version, path tokens"
---
## 0. Summary & Business Rules

Add packaged skill `ws-version` (`/ws-version`) that prints a short, read-only install/version snapshot so agents and humans can tell which skills tree is loaded and which package semver that tree carries.

Business rules:
- Report **install scope** (`global` vs `project-local`) from the absolute directory of the loaded `ws-version` skill folder vs the global skills root (`WORKFLOW_SKILLS_GLOBAL_DIR` or `$HOME/.agents/skills`).
- Report **`packageVersion`** from `{loadedSkillsRoot}/ws-shared/version.json` (canonical field is `version` — see §8). Missing/invalid JSON → explicit unavailable; never invent a semver; surface non-zero helper exit.
- When `$PWD/.ws/config.json` exists and parses, print stored `pathTokens.skillsRoot`, `pathTokens.sharedDir`, `plans.dir`, `plans.specsDir` as authored (do not expand brace tokens into a second root). Missing/invalid config → explicit unavailable; still print scope, directory, version.
- Skill stays host-neutral (no IDE product names), Node-only helpers (`.cjs` + `node` launcher), no workflow start, no file writes, no confirmation gates.
- Register in `bin/skill-dependencies.json` (and runtime mirror) plus task router / catalog so install graph and discovery stay consistent.

Memory applied: regenerate integrity only after the last hashed-file edit; stage only `files_touched` (never `git add -A`); harness scans must stay scoped to package membership (`ws-shared` + `ws-*`). No trap blocks this reader skill.

## 1. Definition of Ready & Scope

**Resolved assumptions (from spec, Confirmed = y):**
| Item | Default |
|------|---------|
| Skill id / invoke | `ws-version` / `/ws-version` |
| Version source | `{loadedSkillsRoot}/ws-shared/version.json` |
| Scope rule | Under global skills root → `global`; else `project-local` |
| Auth / concurrency / lifecycle | N/A (read-only local report) |

**Measurable ACs:** AC1–AC5 from `step-00-us-455.spec.md`. Negative scenarios NS1–NS3 (missing `version.json`, invalid `.ws/config.json`, `.py` / IDE-named body).

**In scope:**
- New skill package under `.agents/skills/ws-version/` (`SKILL.md`, Node helper, evals).
- Dependency-graph + package membership registration.
- Task router / catalog / FEATURES inventory rows.
- Focused Node tests for helper behavior.
- Integrity regenerate + one version bump at ship (Step 8), not as a separate product feature.

**Out of scope (spec table):**
- Changing bump / write path for `version.json`.
- Field-by-field compare of global vs project skill copies.
- IDE status bars or product-branded commands.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 / JavaScript). Layers touched:

| Layer | Path | Role in this feature |
|-------|------|----------------------|
| **skills-sot** | `.agents/skills` | New `ws-version` skill body + `.cjs` helper |
| **installer-cli** | `bin` | `skill-dependencies.json` membership + empty dep edge; integrity |
| **tests** | `test/` | `test-ws-version.js` (or equivalent) fixture coverage |

**Runtime design (recommended):**
1. **Helper** `.agents/skills/ws-version/scripts/report_version.cjs`
   - `skillDir` = absolute path of the skill folder containing the script (`path.resolve(__dirname, '..')`).
   - `loadedSkillsRoot` = absolute parent of `skillDir` (the skills root that owns this copy).
   - `globalSkillsRoot` = `path.resolve(process.env.WORKFLOW_SKILLS_GLOBAL_DIR || path.join(os.homedir(), '.agents', 'skills'))`.
   - Scope: `global` when `skillDir` is equal to or under `globalSkillsRoot` (normalize with `path.resolve`; on win32 compare lower-cased paths); else `project-local`.
   - Version: read `{loadedSkillsRoot}/ws-shared/version.json`; require JSON object with string field `version` matching `^\d+\.\d+\.\d+$` (align with `bin/canonical-version.js`). Print label `packageVersion: <semver>`. On missing file, parse error, wrong shape, or non-semver → print unavailable; exit non-zero for helper, but still emit scope + skillDir lines on stdout (or stdout facts + stderr reason — pick one contract in SKILL.md and keep tests aligned).
   - Config: read `$PWD/.ws/config.json` only. On success, print the four stored values (use empty-string / `(unset)` only when the key is absent after a successful parse — do not invent defaults that are not in the file). On missing/invalid → `project config: unavailable`.
2. **SKILL.md** — short invoke recipe: load via `{skillLoader}`; run `node {skillsRoot}/ws-version/scripts/report_version.cjs` from the **same tree that loaded the skill** (when invoking under global install, run the global script path so SKILL.md and helper stay version-aligned). Emit helper stdout only; stop. No gates, no writes.
3. **Package membership** — add `ws-version` to **Workflows** `packages.workflows.skills` (alongside other always-useful utilities such as `ws-monitor`) and `"ws-version": []` under `dependencies`. Mirror the same edits in `.agents/skills/ws-shared/runtime/skill-dependencies.json`.
4. **Router / docs** — add inventory + task-router rows in root `CATALOG.md` and `.agents/skills/ws-shared/runtime/CATALOG.md`; mention in root `AGENTS.md` task-router parenthetical list; FEATURES.md Extra/Workflows inventory row; optional one-line consumer hub note in `.ws/AGENTS.md` / runtime `AGENTS.md` utility table if those list peer utilities.

**Not touched:** installer bump writers, `canonical-version.js` schema, per-skill frontmatter versions, consumer `.ws/config.json` schema/GUI (no new keys).

## 3. Step-by-Step Plan

1. **Scaffold skill package** — create `.agents/skills/ws-version/SKILL.md` (name, description, `invocation_names: [ws-version, version]`, boundaries, one-step run helper, output field list, host-neutrality note). Create `evals/evals.json` stub matching peer Extra/utility skills. (`skills-sot`) → AC4, AC5
2. **Implement `report_version.cjs`** — scope detection, absolute `skillDir`, canonical `version` → labeled `packageVersion`, config token dump, unavailable paths for missing/invalid inputs; Node CommonJS only; no network; no writes. (`skills-sot`) → AC1, AC2, AC3, AC5
3. **Register dependency graph** — insert `ws-version` into Workflows package skills list + `"ws-version": []` in `dependencies` in both `bin/skill-dependencies.json` and `.agents/skills/ws-shared/runtime/skill-dependencies.json`. (`installer-cli`) → AC4
4. **Task router & catalog** — add CATALOG inventory row + Task router intent (e.g. “Show install scope / package version”); sync runtime CATALOG; update FEATURES.md and AGENTS.md router mention lists. (`skills-sot` docs / hubs) → AC4
5. **Add Node tests** — `test/test-ws-version.js`: happy path against repo tree; fixture missing `version.json`; fixture invalid JSON version file; fixture invalid `.ws/config.json`; fixture skill dir under a fake `WORKFLOW_SKILLS_GLOBAL_DIR` → `global`. Assert no invented semver; assert skillDir still printed. (`tests`) → AC1–AC3, NS1–NS2
6. **Harness / portability check** — confirm no `.py`, no IDE product names in skill body; run `ws-check-harness` / `node test/test-harness-clean.js` over the new id; confirm dependency-edge gate green. (`tests`) → AC4, NS3
7. **Integrity + version bump (ship hygiene)** — after last hashed edit: `npm run build-site:bump` once per PR, `npm run generate-integrity` + `npm run verify-integrity`. (`installer-cli`) — owned at Step 8 close; listed here so implement does not forget hashed content.

## 4. Permissions, Tenancy & i18n

N/A — no RBAC, tenancy, authZ attributes, or user-facing i18n. Output is en-us factual lines only. No secrets in output beyond absolute local paths already known to the operator.

## 5. Test Coverage

| AC / NS | Named check / test | Expected files |
|---------|--------------------|----------------|
| AC1 | `testPrintsScopeAndAbsoluteSkillDir` in `test/test-ws-version.js` — project-local under repo `.agents/skills`; `testPrintsGlobalScopeUnderGlobalRoot` with `WORKFLOW_SKILLS_GLOBAL_DIR` fixture | `.agents/skills/ws-version/scripts/report_version.cjs`, `SKILL.md` |
| AC2 | `testPrintsPackageVersionFromVersionJson`; `testVersionUnavailableWhenMissing`; `testVersionUnavailableWhenInvalidJson` — asserts unavailable text, skillDir still present, non-zero exit on bad/missing version | helper + `ws-shared/version.json` (read-only) |
| AC3 | `testPrintsPathTokensFromConfig`; `testConfigUnavailableWhenMissingOrInvalid` | helper; fixture `.ws/config.json` |
| AC4 | `testSkillRegisteredInDependencyGraph` (assert package list + `dependencies['ws-version']`); harness / `test-harness-clean.js` 0 findings for new id; catalog/router grep for `ws-version` | `bin/skill-dependencies.json`, runtime mirror, `CATALOG.md`, `FEATURES.md` |
| AC5 | `testOutputIsShortAndReadOnly` — stdout line-count / forbidden substrings (no “Advance”, no write paths, no gate prompt); static: skill body has no workflow-start steps | `SKILL.md`, helper |
| NS1 | same as `testVersionUnavailableWhenMissing` | helper |
| NS2 | same as `testConfigUnavailableWhenMissingOrInvalid` | helper |
| NS3 | harness Node-only + portability scan; `rg` for forbidden IDE product names in skill folder = 0 | skill package |

## 6. Stack & Security Invariants Verification Plan

Stack id `node-skills-package`. Closest rule pack: `{skillsRoot}/ws-shared/runtime/stacks/typescript-node.md` (applies to the new `.cjs` helper). `config.json.invariants`: `commitPlanFilesOnlyAtStep8: true` (plan artifacts only at Step 8); EF/tenancy keys N/A.

Touched framework boundaries:
- **Authorization & endpoint protection:** N/A — no HTTP/routes.
- **Concurrency & async safety:** Helper stays sync fs reads (or fully awaited promises). Zero floating promises. Verify with review + `scan_stack_invariants.cjs --stack typescript-node` if the scan covers `.cjs`.
- **Input validation & DTO boundary:** Treat `version.json` and `.ws/config.json` as untrusted-on-disk JSON: parse safely; reject non-objects; never `eval`; never invent version. Path inputs are env + `__dirname` only (no user path concatenation into shell).
- **Subscription & lifecycle cleanup:** N/A — no listeners/streams beyond process lifetime.
- **Harness-specific:**
  - Node-only: `.cjs` only under skill `scripts/`; launch with `node`.
  - Portability: no IDE/agent product names in `SKILL.md` or helper strings.
  - Dependency graph: new id has an explicit edge list (`[]`); package membership present so harness does not report a missing edge.
  - Integrity: regenerate after hashed skill/bin content changes.
  - Dual-hub: docs mention install scopes without instructing agents to edit `{globalSkillsRoot}` from this package root.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (`skills-sot` + `bin` deps + `test/`).
- [ ] Domain entities and mappings encapsulated — N/A.
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A.
- [ ] Stack & security invariants verified (Node-only, JSON validation, no invented version, harness clean).
- [ ] i18n keys declared — N/A.
- [ ] Test cases cover all ACs (table in §5).
- [ ] `ws-version` registered in both skill-dependencies manifests + task router/catalog.
- [ ] Integrity regenerated; version bumped once at ship.
- [ ] Output remains one-screen facts; skill does not mutate disk or start orch.

## 8. Open Questions

1. **Version JSON field name vs AC wording (blocking for interview confirm):** Spec AC2 / Assumptions say read field `packageVersion` from `ws-shared/version.json`, but the authored file and `bin/canonical-version.js` require exactly one property named `version`. **Recommendation:** read `version`, print it under the label `packageVersion:` (satisfies operator wording without inventing a second key). Interview may instead choose to treat missing `packageVersion` key as unavailable even when `version` exists — that would break happy-path on current trees and is **not** recommended.
2. **Package bucket:** Plan recommends **Workflows** membership (broad install). Alternative: **Extra** next to `ws-show-harness`. Interview confirms if Extra-only is preferred.
3. **Helper exit codes:** Recommend non-zero when version file missing/invalid (AC2 “non-zero helper exit is surfaced”) while still printing scope + skillDir on stdout; config-unavailable alone stays exit 0. Confirm preferred exit matrix in interview if needed.
