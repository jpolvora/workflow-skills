---
id: null
slug: skill-family-naming
title: "Regroup packaged skill ids as ws-{family}-{verb} (spec family first)"
source: local
specDate: 2026-08-21
---

# Specification — Regroup packaged skill ids as ws-{family}-{verb} (spec family first)

## Description

Rename packaged `ws-*` skill folders and every live reference so skill ids read as **`ws-{family}-{skillName}`**. Consumers scanning a skills root, catalog, or slash-command list must see family first, then the verb.

This is an **id and reference rewrite** in the upstream SoT (`.agents/skills/ws-*`), installer graph (`bin/skill-dependencies.json` and the hub copy), tests, hubs, site catalog, and hashed skill bodies. Behavior of each skill stays the same except for the `ws-spec-update` memory hook below. **No dual folders, dual `name:` fields, or installer migration shims.** `update` leaves only the new directory names (same rule as current “latest layout only”).

### Naming rule (canonical)

1. Pattern: `ws-{family}-{skillName}` in kebab-case. `{family}` is a short noun grouping related skills (`spec`, `plan`, `check`, `fable`, `patterns`, `goal`).
2. **Specs family hard rule:** every packaged skill whose id contains the token `spec` MUST start with `ws-spec-`. Forbidden: `ws-write-spec`, `ws-sync-spec`, `ws-multi-spec`, `ws-local-spec-provider`, `ws-github-provider`, `ws-azure-devops-provider`, or any future `ws-{other}-spec*` / host-first `ws-{host}-provider` for spec/SCM entry.
3. Already-correct `ws-spec-*` ids stay (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-spec-format`, `ws-spec-index`, `ws-spec-list`, `ws-spec-explain`, `ws-spec-archive`).
4. Folder name, SKILL.md `name:`, dependency graph keys, and hub router rows are the **same** string.
5. `invocation_names` use the new short forms (`spec-write`, `spec-update`, `spec-provider-github`, …). Retired short forms MAY remain as extra invocation aliases for host slash-command discovery. Retired **folder** names MUST NOT remain on disk after `update`.
6. Document the rule in `SKILL_AUTHORING.md` and enforce it in `ws-check-harness` so new skills cannot reintroduce `ws-*-spec` (spec not in first position after `ws-`) or host-first provider folders for the three spec providers.
7. **Spec providers subfamily:** GitHub, Azure DevOps, and local are three **implementations of the same role** (tracker/filesystem → `{specsDir}` + register/promote; GitHub/Azure also own SCM intents). Canonical id shape: `ws-spec-provider-{backend}` with `{backend}` ∈ `github` | `azure-devops` | `local`. There is no separate installable meta-skill named `ws-spec-providers`; the shared contract stays in `{sharedDir}/scm-provider-contract.md` (GitHub ↔ Azure parity) plus local register/fetch docs on the local provider skill.

### In-scope rename table (must implement)

| Current id | New id | Family | Notes |
|------------|--------|--------|-------|
| `ws-write-spec` | `ws-spec-write` | spec | Draft / reformulate `{specsDir}/{slug}.spec.md` only |
| `ws-sync-spec` | `ws-spec-update` | spec | Surgical spec-body sync after prompt-driven code change; **plus** memory hook (below) |
| `ws-multi-spec` | `ws-spec-multi` | spec | Batch orch; was `ws-{verb}-spec` |
| `ws-github-provider` | `ws-spec-provider-github` | spec-provider | Spec-provider implementation for GitHub issues + SCM intents |
| `ws-azure-devops-provider` | `ws-spec-provider-azure-devops` | spec-provider | Spec-provider implementation for ADO work items + SCM intents |
| `ws-local-spec-provider` | `ws-spec-provider-local` | spec-provider | Spec-provider implementation for filesystem `{specsDir}` register/fetch (promotion primitive) |
| `ws-write-plan` | `ws-plan-write` | plan | Same verb-after-family pattern as `ws-spec-write` |
| `ws-verify-plan` | `ws-plan-verify` | plan | Step 5 check-implementation |
| `ws-update-plan-implementation` | `ws-plan-update` | plan | Post-delivery plan deltas |
| `ws-interview` | `ws-plan-interview` | plan | Plan audit; name currently hides the family |

Keep `ws-plan-to-tasks` as-is (already `ws-plan-*`).

`providers.active` / `providers.scm` config values stay `github` | `azure-devops` | `local` (config keys are not skill folder names). Resolution tables that map those values to skill paths must point at `ws-spec-provider-*`.

### `ws-spec-update` behavior (beyond rename)

Successor of `ws-sync-spec`. After approved surgical edits to `{specsDir}` (and aligned `step-00` when still linked):

1. Keep existing drift detect → propose → `user-gate` → apply → revision-history steps.
2. When the code change was a **correction or fix whose original or refined ACs did not catch the gap in time**, the skill MUST offer / perform a `ws-self-learning` memory write (trap: what the spec missed, what the code actually required, `DO NOT` / `INSTEAD DO`) and then compile `MEMORY.md`.
3. When the spec update is a routine AC wording alignment with no missed requirement, skip memory with an explicit `Learning: N/A (spec wording only)` equivalent in the skill report.
4. Do not confuse this with `ws-spec-index` `sync` (index checkboxes vs delivery evidence).

### Other family opportunities (document; do not rename in this spec)

These already group well, or renaming them now would churn SCM/PR vocabulary without a specs-family violation. Record them in the authoring naming table as **future optional** rows only:

| Family | Current ids | Optional future ids | Why deferred |
|--------|-------------|---------------------|--------------|
| check / harness | `ws-check-harness`, `ws-check-workflows`, `ws-show-harness`, `ws-doctor` | `ws-harness-show`, `ws-harness-doctor` | `ws-check-*` already groups the auditors; doctor/show are distinct products |
| pr | `ws-ship-pr`, `ws-fix-pr`, `ws-goal-fix-pr` | `ws-pr-ship`, `ws-pr-fix` | Slash commands `/ship-pr` `/fix-pr` are established |
| fable | `ws-fable-method`, `ws-fable-judge`, `ws-fable-domain` | (none) | Already grouped |
| patterns | `ws-patterns-backend`, `ws-patterns-frontend` | (none here) | Separate catalog-cleanup spec owns a possible `ws-patterns` merge; do not collide |
| goal | `ws-goal-loop`, `ws-goal-fix-pr` | (none) | Already grouped |
| other | `ws-write-a-skill`, `ws-classify-complexity`, `ws-implement-tasks`, `ws-code-review`, `ws-testing` | not required | No `spec` token; not a confused family |

`ws-spec-to-pr` / `ws-spec-to-pr-lite` stay. They are orchestrators, not `ws-*-spec` outliers.

### Reference-update blast radius (live SoT only)

Every **live** mention of a renamed id must move: skill `name:` / banners / relative links, `bin/skill-dependencies.json`, `{sharedDir}/skill-dependencies.json`, `AGENTS.md` (root + hub), `autoload.md`, `CATALOG.md`, `FEATURES.md`, `README.md`, `docs/` (via site rebuild at ship), `SKILL_AUTHORING.md`, `config-resolution.md`, `tools.md`, `setup.md`, `FORMAT.md`, orch `STEP-DISPATCH` / `PROTOCOLS` / `ARTIFACTS`, provider INTENTS, installer/tests (`test/test-install.js` and any hardcoded folder lists), evals JSON, generate-skill-evals, `ws-check-harness` / `ws-check-workflows` inventories, `ws-configure-project` autoload emitters.

**Do not** rewrite archived `{plansDir}/**` history, completed `{specsDir}` specs other than this file, or compiled `CHANGELOG.md` past entries. Optional one-line note in authoring docs: historical artifacts may still name retired ids.

Installer `update` MUST delete leftover retired skill directories under project-local and global skills roots (same as today’s overwrite/latest-layout contract). Do not keep empty stub folders.

### Architecture touchpoints

- Install graph keys and `packages.*.skills` arrays.
- Integrity: after folder moves, `npm run generate-integrity` in the same ship commit.
- Harness Phase inventories that glob `ws-*` folders.
- Upstream session contract lists that name `ws-write-spec` (root `AGENTS.md` §6 / autoload isolation list) must name `ws-spec-write`.
- `ws-spec-provider-github` / `ws-spec-provider-azure-devops` fetch-to-spec still call `ws-spec-write` then register via `ws-spec-provider-local`.
- `config-resolution.md`, `scm-provider-contract.md`, and `tools.md` skill-path tables map `providers.scm` / `providers.active` to the new `ws-spec-provider-*` folders.

## Acceptance Criteria

- AC1: Directory `.agents/skills/ws-spec-write/` exists with `SKILL.md` `name: ws-spec-write` and load banner `ws-spec-write loaded.`. Directory `.agents/skills/ws-write-spec/` does not exist in the SoT.
- AC2: Directory `.agents/skills/ws-spec-update/` exists with `name: ws-spec-update` and banner `ws-spec-update loaded.`. Directory `.agents/skills/ws-sync-spec/` does not exist in the SoT.
- AC3: Directory `.agents/skills/ws-spec-multi/` exists with `name: ws-spec-multi`. Directory `.agents/skills/ws-multi-spec/` does not exist in the SoT.
- AC4: Directories `.agents/skills/ws-spec-provider-github/`, `ws-spec-provider-azure-devops/`, and `ws-spec-provider-local/` exist with matching `name:` fields and load banners. Directories `ws-github-provider`, `ws-azure-devops-provider`, and `ws-local-spec-provider` do not exist in the SoT. Scripts and INTENTS move with each folder; callers use the new paths.
- AC5: Directories `ws-plan-write`, `ws-plan-verify`, `ws-plan-update`, and `ws-plan-interview` exist with matching `name:` fields. Directories `ws-write-plan`, `ws-verify-plan`, `ws-update-plan-implementation`, and `ws-interview` do not exist in the SoT.
- AC6: Every packaged skill id that contains the substring `spec` (folder name and `name:`) matches `^ws-spec-`. A repo-wide grep of hashed skill trees and `bin/skill-dependencies.json` finds zero live ids `ws-write-spec`, `ws-sync-spec`, `ws-multi-spec`, `ws-local-spec-provider`, `ws-github-provider`, or `ws-azure-devops-provider`.
- AC7: `bin/skill-dependencies.json` and `{sharedDir}/skill-dependencies.json` use only the new ids in `packages.*` and `dependencies` keys/arrays. Graph edges that pointed at old ids point at the successors (including orch deps that listed `ws-write-spec` or the three old provider ids).
- AC8: Root `AGENTS.md`, `{sharedDir}/AGENTS.md`, `{sharedDir}/autoload.md` (specs vocabulary, router, keyword table, ASCII flow), `CATALOG.md` (root and hub), `FEATURES.md`, `README.md`, `tools.md`, `setup.md`, `config-resolution.md`, `scm-provider-contract.md`, and `ws-spec-format` / `FORMAT.md` name only the new ids for live routing. Specs router maps “write a spec” → `ws-spec-write`, “sync spec to code / spec drift” → `ws-spec-update`, and provider keywords (GitHub / ADO / local register) → the matching `ws-spec-provider-*` skill. Authoring prose may describe the trio as **spec providers** (`ws-spec-provider-*`); it MUST NOT invent a fourth installable skill folder named `ws-spec-providers`.
- AC9: `SKILL_AUTHORING.md` states the `ws-{family}-{skillName}` rule, the specs-family hard rule (`ws-spec-*` only), and the `ws-spec-provider-{backend}` subfamily rule. It lists the in-scope rename table and the deferred optional families from this spec’s Description.
- AC10: `ws-check-harness` fails closed (critical) when a packaged skill folder or `skill-dependencies.json` id matches `^ws-(?!spec-)[a-z0-9-]*spec` (token `spec` not immediately after `ws-`) or equals a retired host-first provider id (`ws-github-provider`, `ws-azure-devops-provider`, `ws-local-spec-provider`). Existing `ws-spec-*` ids pass.
- AC11: `ws-spec-update/SKILL.md` requires, after approved spec-body edits: if the triggering change was a correction/fix that ACs missed, write a `ws-self-learning` memory entry (missed requirement + `DO NOT` / `INSTEAD DO`) and compile; if wording-only alignment, skip memory and report that skip. It still distinguishes itself from `ws-spec-index` sync.
- AC12: `invocation_names` for renamed skills include the new short names (`spec-write`, `spec-update`, `spec-multi`, `spec-provider-github`, `spec-provider-azure-devops`, `spec-provider-local`, `plan-write`, `plan-verify`, `plan-update`, `plan-interview`). Retired folder ids are not required as `name:`.
- AC13: Installer `update` in a scratch tree that already had the old folders results in only the new folders on disk (retired directories absent). Tests under `test/` that hardcoded old folder names use the new names and still pass `npm run test`.
- AC14: `ws-spec-provider-github` and `ws-spec-provider-azure-devops` fetch-to-spec prose and scripts invoke `ws-spec-write` then `ws-spec-provider-local` register (not the retired ids). Shared SCM intents remain defined once in `scm-provider-contract.md` and implemented by both remote providers.
- AC15: `config.json` `providers.active` / `providers.scm` enum strings remain `github` | `azure-devops` | `local`. Live resolution docs and scripts load `ws-spec-provider-github`, `ws-spec-provider-azure-devops`, or `ws-spec-provider-local` from those values. `ws-ship-pr`, `ws-fix-pr`, `ws-spec-to-pr`, and `ws-spec-to-pr-lite` keep those orchestrator folder ids unchanged.
- AC16: After hashed content changes, `npm run generate-integrity` and `npm run verify-integrity` exit 0 in the same ship commit. Site catalog rebuild (`npm run build-site:bump` at ship) lists the new ids. `ws-check-harness` Phases 0–5c report 0 critical findings for the renamed ids and hub drift.
- AC17: Archived plan/spec history may still contain retired ids; no AC requires rewriting `{plansDir}` archives or past changelog entries.

## Original Issue Context

Free-text todo from the maintainer (not a tracker issue):

- Rename `ws-sync-spec` to `ws-spec-update` — updates specs after prompting/adjusting code after work is done; avoid spec out of sync; create an opportunity to write to memory about corrections/fixes that spec refine did not catch in time.
- Rename `ws-write-spec` to `ws-spec-write`.
- All `ws-*spec*` skills should start with `ws-spec-{skillName}` (never `ws-xyz-spec` / `ws-abc-spec`).
- Find other opportunities to group skill names as `ws-{group}-{skillName}` so developers, users, and consumers can read what a skill does.
- Group `ws-github-provider`, `ws-azure-devops-provider`, and `ws-local-spec-provider` under a common **spec providers** naming pattern (`ws-spec-provider-{backend}`); they are implementations of the same provider role, not unrelated host-named skills.

### Prior Work Sweep

- Keywords: skill rename, `ws-write-spec`, `ws-sync-spec`, `ws-multi-spec`, `ws-local-spec-provider`, `ws-github-provider`, `ws-azure-devops-provider`, family naming, spec providers.
- Git: no commit whose purpose is this regroup. Related history: PR #122 (`release: v0.0.81 - skill evals + rename pipeline folders to ws-*`); PR #218 (agentic reformulation via `ws-write-spec`); catalog-cleanup spec (Extra demotion / patterns merge, **out of scope** here); [`spec-provider-skills.spec.md`](spec-provider-skills.spec.md) introduced the three providers.
- Open GitHub PRs: none for these exact id changes (`gh pr list` search on rename / write-spec / spec-write). Continue; do not reuse another PR.
- Related local spec [`skill-catalog-cleanup.spec.md`](skill-catalog-cleanup.spec.md) explicitly left the spec family uncollapsed. This spec **renames** that family and the three providers; it does not merge or delete those skills into one package.
- Successor ids for the provider trio: `ws-spec-provider-github`, `ws-spec-provider-azure-devops`, `ws-spec-provider-local`.

### Design Intent

Not a bug restore. Current mixed names (`ws-write-spec`, `ws-sync-spec`, `ws-multi-spec`, `ws-interview`) were added incrementally. Root `AGENTS.md` already forbids compatibility folders and dual defaults; this rename follows that contract (new folders only). `git log` on those skill trees shows feature/release history, not an intentional “verb-before-family” design.

Greenfield skip: N/A (existing folders move).

## Child Tasks

### Task A — Spec family moves

- **Status:** Open
- **Description:** Move `ws-write-spec`, `ws-sync-spec`, `ws-multi-spec` to `ws-spec-write`, `ws-spec-update`, `ws-spec-multi`; update `name:`, banners, evals, scripts, and all live references.

### Task A2 — Spec-provider trio moves

- **Status:** Open
- **Description:** Move `ws-github-provider`, `ws-azure-devops-provider`, and `ws-local-spec-provider` to `ws-spec-provider-github`, `ws-spec-provider-azure-devops`, and `ws-spec-provider-local`; retarget config-resolution / scm-provider-contract / tools / orch / tests while keeping config enum values `github` | `azure-devops` | `local`.

### Task B — Plan family moves

- **Status:** Open
- **Description:** Move `ws-write-plan`, `ws-verify-plan`, `ws-update-plan-implementation`, `ws-interview` to `ws-plan-*`; retarget orch Step 1 / 2 / 5 and post-workflow docs.

### Task C — Spec-update memory hook

- **Status:** Open
- **Description:** Extend `ws-spec-update` with the self-learning path for missed-AC corrections vs wording-only skip.

### Task D — Graph, harness, tests, integrity

- **Status:** Open
- **Description:** skill-dependencies, harness regex gate (including retired provider ids), installer leftover-dir coverage, tests, integrity, hub/site/FEATURES/README sync.

## Notes

- Language: en-us for skill bodies, gates, banners, and harness docs.
- Do not collide with [`skill-catalog-cleanup.spec.md`](skill-catalog-cleanup.spec.md) `ws-patterns` merge (deferred/separate).
- Upstream session contract currently lists `ws-write-spec` as a live body not to autoload; after this change that token is `ws-spec-write`.
- `{skillsRoot}` in this repo remains local `.agents/skills`. Authoring edits only the SoT folders; do not write `{globalSkillsRoot}`.
- Standalone draft path for this spec: `{specsDir}/skill-family-naming.spec.md`. Workflow `step-00` only after `ws-spec-provider-local` register (new id once implemented; today `ws-local-spec-provider`).
- Do not create a fourth skill folder `ws-spec-providers`; the common name is the **prefix** `ws-spec-provider-` plus the shared contract docs.
