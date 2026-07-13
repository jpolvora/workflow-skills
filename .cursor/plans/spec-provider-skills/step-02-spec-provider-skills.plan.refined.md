---
slug: spec-provider-skills
title: "Provider skills for spec-to-pr (GitHub, Azure DevOps, local specs)"
status: "implemented — delivery"
refinedFrom: step-01-spec-provider-skills.plan.md
refineRounds: 0
sharedUnderstanding: confirmed
---

## 0. Summary & Business Rules

**Feature:** `spec-provider-skills` — extract platform-specific entry and PR/delivery behavior into three first-class provider skills that collaborate with `spec-to-pr` and pipeline deps `08` / `09` / `11`.

**Core objectives:**
- Single active work-item/spec source via `config.providers.active` (`github` | `azure-devops` | `local`).
- Separate SCM host via `config.providers.scm` (`github` | `azure-devops` only) for `create-pr` / threads / merge (hybrid: local specs + remote PRs allowed).
- Progressive disclosure: orchestrator and generic pipeline skills **delegate** intents; no embedded `gh` / `az` recipes beyond links.
- Dual mode (workflow + standalone) on every new provider and every touched pipeline skill.
- Backward compatible: legacy `issueTrackers.*.enabled` inference; converter scripts remain reachable via move + thin shims (AC9).

**Business rules:**
1. `providers.active` owns `fetch-to-spec` and entry registration. When set, it **overrides** bare-number tracker preference from `issueTrackers.*.enabled`.
2. `providers.scm` owns `create-pr`, `list-threads`, `resolve-thread`, `merge-pr`, and remote `validate-auth` for the PR host. Enum is **never** `local`.
3. Canonical artifact remains `{us-dir}/step-00-{slug}.spec.md`; `{specsDir}` is human mirror only (default `specs/`).
4. Never delete `workingBranch` after merge; never hardcode org/repo/project (config + env only).
5. Skill bodies, scripts, gates, banners: **en-us** only (includes scripts moved from `08-fix-pr` that currently print Portuguese — translate on move).

**Security mitigations:**
- PATs only via env (`ADO_PAT` / `AZURE_DEVOPS_PAT` / `patEnvVar`); never commit tokens.
- `config.json` stays gitignored; commit schema + example only.
- Auth failures → STOP with fix instructions (`validate-auth`), no silent fallback to wrong provider.

## 1. Definition of Ready & Scope

**Resolved assumptions (from spec + stack + codebase grill):**
- Stack: Node 22 skills hub (`node-skills-hub`); mutating layers = skills / cli / tests / docs / hub — no app Domain/DB/UI layers ([STACK.md](../../../STACK.md)).
- Move converters under provider `scripts/` with thin wrappers left at current paths so `test/test-install.js` canonicity checks keep passing (asserts existence of `spec-to-pr/scripts/github-issue-to-spec.py` and `ado-workitem-to-spec.py`).
- Hybrid mode intentional: `active=local` + `scm=github|azure-devops`.
- Layer catalog: route providers under **Layer 2** as unnumbered pipeline dependency skills (peer to numbered 00–11), not Layer 5.
- Physical GH thread scripts (`fetch_threads.cjs`, `resolve_thread.cjs`) and ADO `fix_pr_azure_context.py` move under the owning provider with shims in `08-fix-pr/scripts/`.
- **No new PowerShell files** in this feature: repo has zero `.ps1` under `.agents/skills/` today; providers document `gh` / `az` / Python as first-class. Optional PS wrappers are out of scope (non-blocking future).
- **No new shared npm/Python package** for provider resolution; algorithm lives in orchestrator + each provider SKILL (and optionally a short comment block in schema/example).
- Hub delivery staging uses `.agents/skills/`, `bin/`, `test/`, `docs/`, hub markdown — not classic `src/`/`web/` (orchestrator generic text still mentions `src/`/`web/`; do not invent those layers here).

**Acceptance Criteria (measurable):**

| AC | Criterion |
|----|-----------|
| AC1 | Three skill dirs with `SKILL.md` (frontmatter + dual-mode) and `scripts/` (or documented paths) covering `fetch-to-spec` min. |
| AC2 | `active=github` (or legacy GH-only): numeric issue → `{us-dir}/step-00-us-{id}.spec.md` via github-provider; orchestrator has no raw `gh` recipe body (link only). |
| AC3 | `active=azure-devops` + org/project/PAT: `ADO {id}` / `{org}/{project}#{id}` → canonical spec via azure-devops-provider. |
| AC4 | `active=local`: path under `specsDir` → register/copy with `source: local`; missing `specs/` detected and defaulted to repo-root `specs/`. |
| AC5 | `11-ship-pr` create/merge and `08-fix-pr` list/resolve use `providers.scm`; no GitHub-only happy-path hardcoding. |
| AC6 | Standalone invoke: each provider `fetch-to-spec`; remotes also `validate-auth` + ≥1 PR intent; no full FSM required. Local: `fetch-to-spec` (+ local `validate-auth`); PR intents redirect to scm provider. |
| AC7 | `config.schema.json` + `config.json.example` document `providers.active`, `providers.scm`, `plans.specsDir`; omit `providers` → infer from `issueTrackers`. |
| AC8 | `AGENTS.md` routes three providers; `npm run tests -- --local` passes; `node bin/build-site.js` regenerates catalog. |
| AC9 | `github-issue-to-spec.py` and `ado-workitem-to-spec.py` reachable at old paths (shim) or updated canonicity asserts + documented migration. |

**Out of scope:**
- Jira/Linear/other trackers.
- FSM step order or `step-NN-` naming changes.
- Deleting `develop` after merge.
- Requiring PowerShell on non-Windows (POSIX via `gh`/`az`/Python remains first-class).
- Authoring new `.ps1` helpers (none exist today).
- Creating a separate `.agents/skills/azure-devops/` skill or secret-file layout (prefer `config.json` + env; keep legacy path only as fallback inside moved ADO script).

## 2. Technical Design & Architecture

### Shared provider contract

Each provider `SKILL.md` documents intents as follows:

| Intent | github-provider | azure-devops-provider | local-spec-provider |
|--------|-----------------|----------------------|---------------------|
| `fetch-to-spec` | Implement (move converter) | Implement (move converter) | Implement (register/normalize/mirror) |
| `validate-auth` | `gh auth status` (+ token note for GraphQL) | PAT env + org/project present | `specsDir` exists or creatable; config writable when configuring |
| `create-pr` | `gh pr create` | `az repos pr create` and/or REST (document from existing ADO patterns) | **Delegate** to `providers.scm` skill — do not no-op silently |
| `list-threads` | `fetch_threads.cjs` | `fix_pr_azure_context.py collect` | **Delegate** to scm |
| `resolve-thread` | `resolve_thread.cjs` | `fix_pr_azure_context.py resolve-thread` | **Delegate** to scm |
| `merge-pr` | `gh pr merge` (never delete working branch) | `az repos pr update --status completed` (or equivalent documented REST); never delete working branch | **Delegate** to scm |

Pipeline skills call intents by **loading the skill selected by `providers.active` (fetch) or `providers.scm` (PR)** — not by hardcoding CLI flags in happy paths.

### Provider resolution (canonical algorithm)

Document identically in orchestrator + each provider (no shared package):

1. Read `providers.active` / `providers.scm` from `config.json`.
2. If `providers` absent: enabled GitHub → active=`github`; else enabled ADO → `azure-devops`; else `local`. Prefer GitHub if both enabled.
3. If `scm` absent: if active is `github`|`azure-devops` → scm=active; if active=`local` → parse `project.repoUrl` host (`github.com` → github; `dev.azure.com` / `visualstudio.com` → azure-devops); else STOP and require explicit `providers.scm`.
4. Reject `scm: "local"` (schema enum + runtime STOP).
5. When `providers.active` is present, bare `{n}` / `US {n}` resolve against **active**, not against dual-enabled tracker preference. Legacy dual-enabled bare-number rule applies only when `providers` is omitted.

### Evidence anchors (current codebase)

| Area | Current state | Grill implication |
|------|---------------|-------------------|
| Orchestrator recipes | `spec-to-pr/SKILL.md` § Specification Protocol embeds `gh issue view` and `ado-workitem-to-spec.py` blocks (~L369–396) | Replace with dispatch table + provider links; preserve input→slug matrix |
| Local register | Same file § Hand-written local steps (~L400–408) | Move body into `local-spec-provider`; orchestrator keeps one-line dispatch |
| Ship-pr | `11-ship-pr` Phases 4–6 hardcode `gh pr create\|checks\|merge` | Must branch on `providers.scm` |
| Goal-fix-pr | `09` thread count uses `gh pr view … jq` and ADO collect | Must use scm `list-threads` / count |
| Fix-pr | Dual platform described; scripts under `08-fix-pr/scripts/` | Move scripts; Phase 1/5 call scm intents; keep scoring FSM |
| ADO helper | `fix_pr_azure_context.py` Portuguese strings; reads `.agents/skills/azure-devops/azure-devops.config.json` (folder absent in this hub) | On move: en-us messages; prefer `issueTrackers.azureDevOps` + env PAT; keep legacy paths as fallback |
| Canonicity | `test/test-install.js` requires converter paths under `spec-to-pr/scripts/` | Shims mandatory (AC9) |
| Installer | `bin/cli.js` `listSkillDirs` installs top-level skill folders; `update` needs `--include-new` for new names | Document in FAQ/README |
| Config | `plans.specsDir` already in schema/example/local config; **no** `providers` yet | Additive schema/example + local working `config.json` only |
| PowerShell | No `.ps1` under `.agents/skills/` | Do not invent PS helpers this feature |
| ARTIFACTS / FAQ | Entry tables still name `gh` / converter scripts | Update Action column to provider `fetch-to-spec` |

### Layer edits (skills hub)

| Layer | Paths | Changes |
|-------|-------|---------|
| **skills** | `.agents/skills/github-provider/` | New: `SKILL.md`, `scripts/` (moved converter + GH thread scripts) |
| **skills** | `.agents/skills/azure-devops-provider/` | New: `SKILL.md`, `scripts/` (moved converter + ADO PR/thread script, en-us) |
| **skills** | `.agents/skills/local-spec-provider/` | New: `SKILL.md`, `scripts/` (detect/configure `specsDir`, register/normalize/mirror — shell/Python OK) |
| **skills** | `.agents/skills/spec-to-pr/` | Spec Protocol / Entry Gate: delegate `fetch-to-spec`; remove concrete `gh`/`az` recipe blocks; update Scripts table; shims under `scripts/` |
| **skills** | `.agents/skills/08-fix-pr/` | Happy path: load scm provider for list/resolve; keep scoring/FSM; shims for moved scripts; update README platform table |
| **skills** | `.agents/skills/09-goal-fix-pr/` | Thread-count probes via scm provider intents (not hardcoded `gh`/`az` only) |
| **skills** | `.agents/skills/11-ship-pr/` | Phases 4–6: `create-pr` / checks / `merge-pr` via scm provider |
| **skills** | `.agents/skills/00-write-spec/` | Optional post-draft: ask local-spec-provider to mirror under `specsDir` (no mirror logic today) |
| **skills** | `spec-to-pr/config.schema.json`, `config.json.example` | Add `providers` (`active` enum, `scm` enum); keep `plans.specsDir`; update example script paths to canonical provider paths |
| **skills** | `spec-to-pr/ARTIFACTS.md` (+ FAQ/README/tools.md as needed) | Provider delegation + intents; entry Action → provider |
| **hub** | `AGENTS.md` | Layer 2 provider rows + Task Router entries |
| **tests** | `test/test-install.js` | Assert three provider `SKILL.md`; keep shim path asserts for converters (AC9); optional `providers` keys in example parse |
| **docs** | `docs/index.html` | Regenerate via `node bin/build-site.js` |
| **cli** | `bin/` | No behavior change expected (new skills are normal top-level folders); verify `--include-new` surfaces them; mention in consumer docs |

### Frontend / DB / i18n

N/A for this hub (STACK.md: frontend none, database none). Catalog site is static HTML regenerated from AGENTS.md — treat as docs layer only.

### Invariants from `config.json.invariants`

- `commitPlanFilesOnlyAtStep12: true` — do not stage `.cursor/plans/` in delivery commits until Step 12.
- App EF/tenancy invariants are false/N/A on this hub; do not invent migrations or RBAC layers.

### Script migration map

| Current | Canonical after | Shim |
|---------|-----------------|------|
| `spec-to-pr/scripts/github-issue-to-spec.py` | `github-provider/scripts/github-issue-to-spec.py` | Thin wrapper at old path (re-exec / import) |
| `spec-to-pr/scripts/ado-workitem-to-spec.py` | `azure-devops-provider/scripts/ado-workitem-to-spec.py` | Thin wrapper at old path |
| `08-fix-pr/scripts/fetch_threads.cjs` | `github-provider/scripts/fetch_threads.cjs` | Shim or re-export at old path |
| `08-fix-pr/scripts/resolve_thread.cjs` | `github-provider/scripts/resolve_thread.cjs` | Shim at old path |
| `08-fix-pr/scripts/fix_pr_azure_context.py` | `azure-devops-provider/scripts/fix_pr_azure_context.py` | Shim at old path; translate user-facing strings to en-us; prefer `config.json` trackers |

Update `issueTrackers.*.*Script` defaults in example to canonical provider paths; shims preserve mid-migration consumers.

### Skill frontmatter convention

Match pipeline skills (`08-fix-pr` / `11-ship-pr`):

```yaml
name: github-provider  # etc.
description: ... Use when ...
upstream: jpolvora/workflow-skills — this skill is a spec-to-pr pipeline dependency. Improvements must be submitted upstream to https://github.com/jpolvora/workflow-skills
version: 1.0
disable-model-invocation: true
```

### Local specs layout

Support (document, do not over-build):
- Flat: `{specsDir}/{slug}.spec.md`
- Nested (one level): `{specsDir}/{slug}/README.spec.md` or `{specsDir}/{slug}/{slug}.spec.md`
Canonical workflow copy always `{us-dir}/step-00-{slug}.spec.md`. Detect missing `specs/` → create repo-root `specs/` and set `plans.specsDir: "specs"` in local `config.json` (never commit).

## 3. Step-by-Step Plan

*Adapted for skills hub (not Domain→UI app steps).*

### Step 1: Provider skill scaffolds (AC1, AC6)

**Action:** Create three skill directories with dual-mode SKILL.md (Standalone + Workflow), intent tables per §2 contract, config keys, entry/PR patterns, and `scripts/` layout. English only. Frontmatter per convention above.

**Affected files:**
- `.agents/skills/github-provider/SKILL.md` (+ `scripts/` placeholders)
- `.agents/skills/azure-devops-provider/SKILL.md` (+ `scripts/`)
- `.agents/skills/local-spec-provider/SKILL.md` (+ `scripts/` for detect/register/mirror)

**Engineering checks:**
- Each SKILL has `### Standalone Mode` and `### Workflow Mode`.
- Local documents hybrid: PR intents → load scm provider.
- No Portuguese; no hardcoded org/repo.

### Step 2: Move scripts + compatibility shims (AC9)

**Action:** Move converters and thread/ADO scripts into provider `scripts/`. Leave thin shims at old paths that forward to new locations (same CLI args). Translate ADO helper user-facing strings to en-us. Update ADO config resolution to prefer `spec-to-pr/config.json` `issueTrackers.azureDevOps` + env PAT; keep legacy `azure-devops.config.json` / `.secret` as fallback. Update internal references in provider SKILL.md to canonical paths.

**Affected files:**
- Move + shim pairs listed in §2 migration map
- Optional: small README note under each provider `scripts/`

**Engineering checks:**
- `python …/spec-to-pr/scripts/github-issue-to-spec.py --help` (or equivalent) still works via shim.
- Same for ADO converter.
- No logic duplication (shim only forwards).
- No Portuguese in moved ADO helper stdout/stderr/exit messages.

### Step 3: Config + schema + inference (AC7, AC4 config)

**Action:** Add `providers` block to schema + example; document inference from `issueTrackers`; ensure `plans.specsDir` default `"specs"`. Schema: `providers.active` enum `github|azure-devops|local`; `providers.scm` enum `github|azure-devops`. Document resolution rules in example `_comment`s. Do **not** commit local `config.json` (gitignored); update local working copy with `providers.active: "github"`, `providers.scm: "github"` for this repo.

**Affected files:**
- `.agents/skills/spec-to-pr/config.schema.json`
- `.agents/skills/spec-to-pr/config.json.example`
- (local only) `.agents/skills/spec-to-pr/config.json`

**Engineering checks:**
- Schema documents `providers`; example includes them.
- Example documents omit-providers → legacy inference.
- Script path fields point at provider canonical paths.

### Step 4: Wire orchestrator entry + 00-write-spec (AC2, AC3, AC4)

**Action:** Refactor Specification Protocol and Step 0 Entry Gate: resolve active provider → load that skill → `fetch-to-spec`. Replace concrete `gh` / `az` / hand-written recipe subsections with short dispatch table + links to provider skills. Keep input→slug matrix and bare-number rules (extended by §2.5 when `providers.active` set). Wire `00-write-spec` optional mirror via local-spec-provider. Update ARTIFACTS.md Spec entry rules Action column.

**Affected files:**
- `.agents/skills/spec-to-pr/SKILL.md` (Specification Protocol, Entry Gate, Scripts inventory)
- `.agents/skills/00-write-spec/SKILL.md` (optional mirror hook)
- `.agents/skills/spec-to-pr/ARTIFACTS.md` (entry table → provider)
- `.agents/skills/spec-to-pr/docs/faq.md` (entry docs → provider)

**Engineering checks:**
- Orchestrator body contains no multi-line `gh issue view` / `az` recipe (link to provider only).
- Bare-number rules preserved when `providers` omitted; overridden by `active` when set.
- Local path registration still sets `source: local` and skips Step 0.

### Step 5: Wire ship-pr + fix-pr + goal-fix-pr (AC5, AC6)

**Action:** Replace GitHub-only happy paths with scm provider delegation. Keep generic FSM (score, confirm, surgical fix, goal loop). `11-ship-pr` Phases 4–6 call scm intents (`create-pr`, checks wait, `merge-pr`). `08` Phase 1/5 resolve via scm. `09` active-thread count via scm `list-threads`. Document standalone `/github-provider create-pr|…` etc. Update `08-fix-pr/README.md` platform table to provider paths (remove stale `azure-devops/azure-devops.config.json` as primary).

**Affected files:**
- `.agents/skills/11-ship-pr/SKILL.md`
- `.agents/skills/08-fix-pr/SKILL.md` (+ README)
- `.agents/skills/09-goal-fix-pr/SKILL.md`

**Engineering checks:**
- Happy-path text does not assume only `gh pr create|merge`.
- When `scm=azure-devops`, instructions route to azure-devops-provider scripts/`az repos pr`.
- Branch deletion rule unchanged.
- `09` no longer hardcodes only `gh pr view … jq` for GitHub count without scm delegation note.

### Step 6: Hub, docs, tests, site (AC8)

**Action:** Update AGENTS.md Layer 2 + Task Router; FAQ/README as needed (include `update --include-new` for the three new skill folders); extend install canonicity tests for three providers while keeping shim path asserts; regenerate site. Offer harness audit (`check-harness`) after skill/hub edits per AGENTS.md.

**Affected files:**
- `AGENTS.md`
- `README.md` / FAQ / `tools.md` (if they document entry/PR)
- `test/test-install.js`
- `docs/index.html` (via `node bin/build-site.js`)

**Engineering checks:**
- `npm run tests -- --local` passes.
- `node bin/build-site.js` succeeds; catalog lists three providers.
- Ask user about harness audit after skill/hub edits.

### Per-step verify loop (karpathy)

```
1. Scaffolds → verify: three SKILL.md + dual-mode + intents + frontmatter
2. Move/shim → verify: old script paths still executable; ADO helper en-us
3. Config → verify: schema + example document providers enums
4. Orchestrator → verify: no embedded gh/az recipes; dispatch table present
5. 08/09/11 → verify: scm delegation; scoring FSM intact
6. Hub/tests/site → verify: npm local tests + build-site
```

## 4. Permissions, Tenancy & i18n

- **RBAC / tenancy:** N/A (skills hub; no multi-tenant app data).
- **Auth surfaces:** `gh auth status`; ADO PAT via env; GitHub token for GraphQL threads as today (`AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` / `gh`). Providers own `validate-auth` messaging.
- **ADO config preference order (refined):** (1) `config.json` `issueTrackers.azureDevOps` + `patEnvVar` / `ADO_PAT` / `AZURE_DEVOPS_PAT`; (2) legacy `.agents/skills/azure-devops/azure-devops.config.json` + `.secret` / env (fallback only — folder not present in this hub).
- **Secrets:** never write PATs into specs, state, or committed config.
- **i18n:** all skill/user-facing pipeline text **en-us**; translating moved ADO script messages is in scope.
- **Isolation:** provider selection must not leak the wrong tracker’s credentials into the other provider’s scripts.

## 5. Test Coverage

Map each AC to concrete verification (automated where possible; manual/agent checks for skill text).

| AC | Test / method | How |
|----|---------------|-----|
| AC1 | `test_providers_skill_dirs_exist` | Assert `.agents/skills/{github,azure-devops,local-spec}-provider/SKILL.md` exist; frontmatter contains `name:`; body contains `Standalone Mode` and `Workflow Mode`; `scripts/` exists or SKILL documents script paths |
| AC2 | `test_orchestrator_delegates_github_fetch` | Grep `spec-to-pr/SKILL.md`: no raw `gh issue view` recipe block; contains link/path to `github-provider`; canonicity still finds shimmed converter |
| AC3 | `test_ado_provider_documents_fetch` | Assert azure-devops-provider SKILL documents `ADO {id}` / `{org}/{project}#{id}` and points at moved `ado-workitem-to-spec.py` |
| AC4 | `test_local_provider_specs_dir` | Assert local-spec-provider documents `plans.specsDir` default `specs` and detect/configure behavior; example config has `specsDir` |
| AC5 | `test_ship_fix_delegate_scm` | Grep `11-ship-pr` / `08-fix-pr` / `09-goal-fix-pr` SKILL: reference `providers.scm` or provider skill paths; happy path not solely `gh pr create` without ADO branch |
| AC6 | `test_standalone_sections` | Each provider SKILL has standalone invoke examples for `fetch-to-spec` (+ remotes: `validate-auth` + one PR intent; local: validate-auth + PR delegate note) |
| AC7 | `test_config_schema_providers` | Parse `config.schema.json` for `providers` properties `active`/`scm`; example JSON includes them; comments/docs mention legacy inference |
| AC8 | `npm run tests -- --local` + `node bin/build-site.js` | Full install/canonicity suite; AGENTS.md contains three provider routes; site rebuild |
| AC9 | `test_converter_shims_present` (existing asserts) | Keep `fail` if `spec-to-pr/scripts/github-issue-to-spec.py` or `ado-workitem-to-spec.py` missing; optionally assert they are shims or re-export canonical files |

**Manual / agent smoke (not necessarily automated):** dry-run `fetch-to-spec` wording against a sample issue id path; local copy of `specs/*.spec.md` registration steps.

## 6. Invariants (Do Not Violate)

- Canonical spec only under `{us-dir}/step-00-{slug}.spec.md` — never treat tracker API or `*.issue.json` as post-entry source of truth.
- Do not stage/commit `.cursor/plans/` until Step 12 (`commitPlanFilesOnlyAtStep12`).
- Do not commit `config.json` or secrets.
- Do not change FSM step numbers or artifact naming (`step-00` … `step-12` / Step 13 ship).
- Do not delete `workingBranch` after merge.
- Do not duplicate converter logic in shim and canonical file.
- Do not embed platform CLI recipes in orchestrator / generic 08/09/11 happy paths — **delegate**.
- English (en-us) only in skill content and pipeline banners (including moved scripts).
- Surgical edits only: no drive-by refactors of unrelated skills.
- Prefer move+shim over copy-paste of scripts.
- Do not invent Domain/DB/UI layers or new PowerShell product files for this hub feature.
- Do not set `providers.scm` to `local`.

## 7. Pre-PR Checklist

- [x] Three provider skills exist with dual-mode + intents (AC1).
- [x] Converters moved; old paths still reachable via shims (AC9).
- [x] ADO helper messages en-us; config prefers `issueTrackers.azureDevOps`.
- [x] `providers` + `plans.specsDir` in schema and example; legacy inference documented (AC7).
- [x] Orchestrator Entry/Spec Protocol delegates `fetch-to-spec`; no raw `gh`/`az` recipe blocks (AC2–AC4).
- [x] `11-ship-pr` / `08-fix-pr` / `09-goal-fix-pr` delegate SCM intents (AC5).
- [x] Standalone sections present for each provider (AC6).
- [x] `AGENTS.md` Task Router + Layer 2 updated (AC8).
- [x] Layer boundaries respected (skills / tests / docs / hub only; no fake Domain/DB layers).
- [x] `npm run tests -- --local` passes.
- [x] `node bin/build-site.js` run; `docs/index.html` updated.
- [x] No `.cursor/plans/` staged; no secrets committed.
- [x] FAQ notes consumer `update --include-new` for new provider skills.
- [x] Offer harness audit (`check-harness`) after hub/skill changes.

## 8. Open Questions & Assumed Defaults

**Blocking open:** none (auto mode: all closed from codebase or assumed-default).

**Assumed defaults (locked for implementation):**

| ID | Topic | Default | Evidence / rationale |
|----|-------|---------|----------------------|
| D1 | Catalog layer | Layer 2 unnumbered pipeline deps | Spec allowed L2 or L5; peers of 00–11 fit L2 |
| D2 | Thread/ADO scripts | Move under provider + shim in `08-fix-pr/scripts/` | Same pattern as converters; canonicity needs old paths |
| D3 | Ambiguous `repoUrl` when `active=local` | STOP; require explicit `providers.scm` | Spec hybrid rule; hosts only github.com / Azure DevOps |
| D4 | PowerShell helpers | Out of scope; do not create `.ps1` | Zero PS files in skills tree today |
| D5 | Shared resolution package | None; duplicate short algorithm in docs | Plan §2; avoid new abstraction |
| D6 | Local PR intents | Document redirect to scm provider | Shared contract + hybrid decision |
| D7 | Local `validate-auth` | Check `specsDir` existence/writability | AC6 without remote auth |
| D8 | `providers.active` vs bare number | When `providers` set, active wins | Spec resolution rule 1 |
| D9 | ADO auth config | Prefer `config.json` trackers + env; legacy file fallback | Hub has no `azure-devops` skill dir; MEMORY en-us |
| D10 | ADO script language | Translate to en-us on move | MEMORY + AGENTS language mandate |
| D11 | Ship-pr ADO checks | Provider documents `az repos pr` status/policy wait (or REST equivalent); no new product service | Mirror GH `checks --watch` intent |
| D12 | Consumer install | Document `update --include-new` | `bin/cli.js` behavior |
| D13 | Hub staging | Stage skills/cli/tests/docs/hub paths | STACK.md; ignore generic src/web wording for this repo |
| D14 | Frontmatter | `upstream` + `version` + `disable-model-invocation: true` | Match 08/11 |
| D15 | Nested specs | Document flat + one-level nested; shallow detect | Spec notes; no deep crawler |

## Interview registry

| id | class | section | gap | recommendation | status | resolution | dependsOn |
|----|-------|---------|-----|----------------|--------|------------|-----------|
| G1 | blocking | §2 contract | Local provider cannot implement remote PR intents but shared table lists them | Document PR intents as **delegate to scm**; AC6 local = fetch + local validate-auth | closed | Codebase: local is filesystem-only; hybrid already in spec | — |
| G2 | non-blocking | §2 PS | Plan mentioned optional PowerShell helpers | Do not invent `.ps1`; gh/az/Python only | closed | Glob: zero `.ps1` under `.agents/skills/` | — |
| G3 | blocking | §2 ADO script | `fix_pr_azure_context.py` is PT-BR and reads missing `azure-devops` skill config | Move + en-us + prefer `issueTrackers.azureDevOps` / env; legacy fallback | closed | Script + MEMORY language trap; no azure-devops skill dir in hub | — |
| G4 | blocking | §2 resolution | Where does shared resolution live? | Inline algorithm in orchestrator + providers; no package | closed | Plan already preferred no package; confirmed | — |
| G5 | blocking | §5 AC5 | `11-ship-pr` / `09` GitHub-hardcoded | Explicit scm delegation for create/checks/merge and thread count | closed | Grep evidence in 11/09 SKILL.md | — |
| G6 | blocking | §2 scm | Can scm be local? | Schema enum github\|azure-devops only; STOP on local | closed | Spec `_scmComment` + hybrid model | — |
| G7 | non-blocking | §4 ARTIFACTS/FAQ | Entry docs still embed gh/converter recipes | Update Action → provider `fetch-to-spec` in Step 4 | closed | ARTIFACTS.md + faq.md evidence | — |
| G8 | non-blocking | §6 install | New skills invisible to existing consumers on plain `update` | Document `--include-new` | closed | `bin/cli.js` `includeNew` | — |
| G9 | blocking | §0 staging | Orchestrator mentions stage `src/`/`web/` | Hub implementers use STACK paths | closed | STACK.md + state workflow memory | — |
| G10 | non-blocking | §1 bare number | Interaction of `providers.active` with dual-enabled trackers | When `providers` present, active overrides | closed | Spec resolution rule 1; auto assumed-default | — |
| G11 | non-blocking | §1 frontmatter | write-a-skill template vs pipeline skill frontmatter | Match 08/11 pipeline fields | closed | 08-fix-pr frontmatter | — |
| G12 | non-blocking | §2 local layouts | Flat vs nested specs under specsDir | Support flat + one-level nested; document | closed | Spec local-provider notes | — |

**Rounds asked:** 0 (autoMode: no user escalation).  
**Blocking open:** 0.  
**shared_understanding:** pending (orchestrator auto-confirm 2e).
