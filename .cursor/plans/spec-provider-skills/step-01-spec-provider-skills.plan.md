---
slug: spec-provider-skills
title: "Provider skills for spec-to-pr (GitHub, Azure DevOps, local specs)"
status: "plan to be refined"
---

## 0. Summary & Business Rules

**Feature:** `spec-provider-skills` — extract platform-specific entry and PR/delivery behavior into three first-class provider skills that collaborate with `spec-to-pr` and pipeline deps `08` / `09` / `11`.

**Core objectives:**
- Single active work-item/spec source via `config.providers.active` (`github` | `azure-devops` | `local`).
- Separate SCM host via `config.providers.scm` for `create-pr` / threads / merge (hybrid: local specs + remote PRs allowed).
- Progressive disclosure: orchestrator and generic pipeline skills **delegate** intents; no embedded `gh` / `az` recipes beyond links.
- Dual mode (workflow + standalone) on every new provider and every touched pipeline skill.
- Backward compatible: legacy `issueTrackers.*.enabled` inference; converter scripts remain reachable via move + thin shims (AC9).

**Business rules:**
1. `providers.active` owns `fetch-to-spec` and entry registration.
2. `providers.scm` owns `create-pr`, `list-threads`, `resolve-thread`, `merge-pr`, `validate-auth` for PR host (defaults: same as `active` when active is github/ado; when `active=local`, infer from `project.repoUrl` host or require explicit `scm`).
3. Canonical artifact remains `{us-dir}/step-00-{slug}.spec.md`; `{specsDir}` is human mirror only (default `specs/`).
4. Never delete `workingBranch` after merge; never hardcode org/repo/project (config + env only).
5. Skill bodies, scripts, gates, banners: **en-us** only.

**Security mitigations:**
- PATs only via env (`ADO_PAT` / `AZURE_DEVOPS_PAT` / `patEnvVar`); never commit tokens.
- `config.json` stays gitignored; commit schema + example only.
- Auth failures → STOP with fix instructions (`validate-auth`), no silent fallback to wrong provider.

## 1. Definition of Ready & Scope

**Resolved assumptions (from spec + stack):**
- Stack: Node 22 skills hub (`node-skills-hub`); layers = skills / cli / tests / docs / hub — no app Domain/DB/UI layers.
- Move converters under provider `scripts/` with thin wrappers left at current paths so `test/test-install.js` canonicity checks keep passing.
- Hybrid mode intentional: `active=local` + `scm=github|azure-devops`.
- Layer catalog: route providers under **Layer 2** as unnumbered pipeline dependency skills (peer to numbered 00–11).
- Physical GH thread scripts (`fetch_threads.cjs`, `resolve_thread.cjs`) and ADO `fix_pr_azure_context.py` move under the owning provider with shims in `08-fix-pr/scripts/`.

**Acceptance Criteria (measurable):**

| AC | Criterion |
|----|-----------|
| AC1 | Three skill dirs with `SKILL.md` (frontmatter + dual-mode) and `scripts/` (or documented paths) covering `fetch-to-spec` min. |
| AC2 | `active=github` (or legacy GH-only): numeric issue → `{us-dir}/step-00-us-{id}.spec.md` via github-provider; orchestrator has no raw `gh` recipe body (link only). |
| AC3 | `active=azure-devops` + org/project/PAT: `ADO {id}` / `{org}/{project}#{id}` → canonical spec via azure-devops-provider. |
| AC4 | `active=local`: path under `specsDir` → register/copy with `source: local`; missing `specs/` detected and defaulted to repo-root `specs/`. |
| AC5 | `11-ship-pr` create/merge and `08-fix-pr` list/resolve use `providers.scm`; no GitHub-only happy-path hardcoding. |
| AC6 | Standalone invoke: each provider `fetch-to-spec`; remotes also `validate-auth` + ≥1 PR intent; no full FSM required. |
| AC7 | `config.schema.json` + `config.json.example` document `providers.active`, `providers.scm`, `plans.specsDir`; omit `providers` → infer from `issueTrackers`. |
| AC8 | `AGENTS.md` routes three providers; `npm run tests -- --local` passes; `node bin/build-site.js` regenerates catalog. |
| AC9 | `github-issue-to-spec.py` and `ado-workitem-to-spec.py` reachable at old paths (shim) or updated canonicity asserts + documented migration. |

**Out of scope:**
- Jira/Linear/other trackers.
- FSM step order or `step-NN-` naming changes.
- Deleting `develop` after merge.
- Requiring PowerShell on non-Windows (POSIX via `gh`/`az`/Python remains first-class).

## 2. Technical Design & Architecture

### Shared provider contract

Each provider `SKILL.md` documents and implements (instruction + scripts):

| Intent | Input | Output |
|--------|-------|--------|
| `fetch-to-spec` | Tracker id or local path | `{us-dir}/step-00-{slug}.spec.md` + optional `*.issue.json` |
| `validate-auth` | none | Pass/fail + fix instructions |
| `create-pr` | head, base, title/body | PR URL + id |
| `list-threads` | PR id | Structured thread list |
| `resolve-thread` | thread id (+ comment) | Resolved (or dry-run log) |
| `merge-pr` | PR id | Merged; never delete working branch |

Resolution helper (document in orchestrator + providers; implement as short shared note or inline in each skill — **no new shared package unless needed**):

1. Read `providers.active` / `providers.scm`.
2. If `providers` absent: enabled GitHub → active=github; else enabled ADO → azure-devops; else local. Prefer GitHub if both enabled.
3. If `scm` absent: if active is github|azure-devops → scm=active; if active=local → parse `project.repoUrl` host (`github.com` → github, `dev.azure.com` / `visualstudio.com` → azure-devops); else STOP ask for `providers.scm`.

### Layer edits (skills hub)

| Layer | Paths | Changes |
|-------|-------|---------|
| **skills** | `.agents/skills/github-provider/` | New: `SKILL.md`, `scripts/` (moved converter + optional PS helpers; own GH thread scripts) |
| **skills** | `.agents/skills/azure-devops-provider/` | New: `SKILL.md`, `scripts/` (moved converter + ADO PR/thread scripts) |
| **skills** | `.agents/skills/local-spec-provider/` | New: `SKILL.md`, `scripts/` (detect/configure `specsDir`, register/normalize/mirror helpers — shell/Python OK) |
| **skills** | `.agents/skills/spec-to-pr/` | Spec Protocol / Entry Gate: delegate `fetch-to-spec`; remove concrete `gh`/`az` recipe blocks (replace with provider links); update Scripts table; shims under `scripts/` |
| **skills** | `.agents/skills/08-fix-pr/` | Happy path: load `providers.scm` skill for list/resolve; keep scoring/FSM; shims for moved scripts |
| **skills** | `.agents/skills/09-goal-fix-pr/` | Thread-count probes via scm provider intents (not hardcoded `gh`/`az` only) |
| **skills** | `.agents/skills/11-ship-pr/` | Phases 4–6: `create-pr` / checks / `merge-pr` via scm provider |
| **skills** | `.agents/skills/00-write-spec/` | Optional post-draft: ask local-spec-provider to mirror under `specsDir` |
| **skills** | `spec-to-pr/config.schema.json`, `config.json.example` | Add `providers`; keep `plans.specsDir`; update example script paths to canonical provider paths (shims still work) |
| **skills** | `spec-to-pr/ARTIFACTS.md` (+ FAQ/README/tools.md as needed) | Provider delegation + intents |
| **hub** | `AGENTS.md` | Layer 2 provider rows + Task Router entries |
| **tests** | `test/test-install.js` | Assert three provider `SKILL.md`; keep shim path asserts for converters (AC9); optional `providers` keys in example parse |
| **docs** | `docs/index.html` | Regenerate via `node bin/build-site.js` |
| **cli** | `bin/` | No behavior change expected if new skills are normal top-level folders (installer already copies skill dirs); verify `--include-new` surfaces them |

### Frontend / DB / i18n

N/A for this hub (STACK.md: frontend none, database none). Catalog site is static HTML regenerated from AGENTS.md — treat as docs layer only.

### Invariants from `config.json.invariants`

- `commitPlanFilesOnlyAtStep12: true` — do not stage `.cursor/plans/` in delivery commits until Step 12.
- App EF/tenancy invariants are false/N/A; do not invent migrations or RBAC layers.

### Script migration map

| Current | Canonical after | Shim |
|---------|-----------------|------|
| `spec-to-pr/scripts/github-issue-to-spec.py` | `github-provider/scripts/github-issue-to-spec.py` | Thin wrapper at old path (re-exec / import) |
| `spec-to-pr/scripts/ado-workitem-to-spec.py` | `azure-devops-provider/scripts/ado-workitem-to-spec.py` | Thin wrapper at old path |
| `08-fix-pr/scripts/fetch_threads.cjs` | `github-provider/scripts/fetch_threads.cjs` | Shim or re-export at old path |
| `08-fix-pr/scripts/resolve_thread.cjs` | `github-provider/scripts/resolve_thread.cjs` | Shim at old path |
| `08-fix-pr/scripts/fix_pr_azure_context.py` | `azure-devops-provider/scripts/fix_pr_azure_context.py` | Shim at old path |

Update `issueTrackers.*.*Script` defaults in example to canonical provider paths; shims preserve mid-migration consumers.

## 3. Step-by-Step Plan

*Adapted for skills hub (not Domain→UI app steps).*

### Step 1: Provider skill scaffolds (AC1, AC6 partial)

**Action:** Create three skill directories with dual-mode SKILL.md (Standalone + Workflow), intent tables, config keys, entry/PR patterns, and `scripts/` layout. English only. Follow write-a-skill structure (frontmatter `name`, `description`, `upstream`, `version`).

**Affected files:**
- `.agents/skills/github-provider/SKILL.md` (+ `scripts/` placeholders)
- `.agents/skills/azure-devops-provider/SKILL.md` (+ `scripts/`)
- `.agents/skills/local-spec-provider/SKILL.md` (+ `scripts/` for detect/register/mirror)

**Engineering checks:**
- Each SKILL has `### Standalone Mode` and `### Workflow Mode`.
- Intents listed; local provider documents hybrid (PR intents deferred to scm provider).
- No Portuguese; no hardcoded org/repo.

### Step 2: Move scripts + compatibility shims (AC9)

**Action:** Move converters and thread/ADO scripts into provider `scripts/`. Leave thin shims at old paths that forward to new locations (same CLI args). Update internal references in provider SKILL.md to canonical paths.

**Affected files:**
- Move + shim pairs listed in §2 migration map
- Optional: small README note under each provider `scripts/`

**Engineering checks:**
- `python …/spec-to-pr/scripts/github-issue-to-spec.py --help` (or equivalent) still works via shim.
- Same for ADO converter.
- No logic duplication (shim only forwards).

### Step 3: Config + schema + inference (AC7, AC4 config)

**Action:** Add `providers` block to schema + example; document inference from `issueTrackers`; ensure `plans.specsDir` default `"specs"`. Document resolution rules in example `_comment`s. Do **not** commit local `config.json` (gitignored); update local working copy only if needed for verify.

**Affected files:**
- `.agents/skills/spec-to-pr/config.schema.json`
- `.agents/skills/spec-to-pr/config.json.example`
- (local only) `.agents/skills/spec-to-pr/config.json` — add `providers.active: "github"`, `providers.scm: "github"` for this repo

**Engineering checks:**
- Schema validates example JSON.
- Example documents omit-providers → legacy inference.
- Script path fields point at provider canonical paths.

### Step 4: Wire orchestrator entry + 00-write-spec (AC2, AC3, AC4)

**Action:** Refactor Specification Protocol and Step 0 Entry Gate: resolve active provider → load that skill → `fetch-to-spec`. Replace concrete `gh` / `az` / hand-written recipe subsections with short dispatch table + links to provider skills. Keep input→slug matrix. Wire `00-write-spec` optional mirror via local-spec-provider.

**Affected files:**
- `.agents/skills/spec-to-pr/SKILL.md` (Specification Protocol, Entry Gate, Scripts inventory)
- `.agents/skills/00-write-spec/SKILL.md` (optional mirror hook)
- `.agents/skills/spec-to-pr/ARTIFACTS.md` (entry table → provider)

**Engineering checks:**
- Orchestrator body contains no multi-line `gh issue view` / `az` recipe (link to provider only).
- Bare-number rules preserved (GitHub preferred if both enabled unless active overrides).
- Local path registration still sets `source: local` and skips Step 0.

### Step 5: Wire ship-pr + fix-pr + goal-fix-pr (AC5, AC6)

**Action:** Replace GitHub-only happy paths with scm provider delegation. Keep generic FSM (score, confirm, surgical fix, goal loop). `11-ship-pr` Phases 4–6 call scm intents. `08` Phase 1/5 resolve via scm. `09` active-thread count via scm. Document standalone `/github-provider create-pr|…` etc.

**Affected files:**
- `.agents/skills/11-ship-pr/SKILL.md`
- `.agents/skills/08-fix-pr/SKILL.md`
- `.agents/skills/09-goal-fix-pr/SKILL.md`

**Engineering checks:**
- Happy-path text does not assume only `gh pr create|merge`.
- When `scm=azure-devops`, instructions route to azure-devops-provider scripts/`az repos pr`.
- Branch deletion rule unchanged.

### Step 6: Hub, docs, tests, site (AC8)

**Action:** Update AGENTS.md Layer 2 + Task Router; FAQ/README/tools.md as needed; extend install canonicity tests for three providers while keeping shim path asserts; regenerate site.

**Affected files:**
- `AGENTS.md`
- `README.md` / FAQ / `tools.md` (if they document entry/PR)
- `test/test-install.js`
- `docs/index.html` (via `node bin/build-site.js`)

**Engineering checks:**
- `npm run tests -- --local` passes.
- `node bin/build-site.js` succeeds; catalog lists three providers.
- Ask user about harness audit (`check-harness`) after skill/hub edits per AGENTS.md.

### Per-step verify loop (karpathy)

```
1. Scaffolds → verify: three SKILL.md + dual-mode + intents
2. Move/shim → verify: old script paths still executable
3. Config → verify: schema + example document providers
4. Orchestrator → verify: no embedded gh/az recipes; dispatch table present
5. 08/09/11 → verify: scm delegation; scoring FSM intact
6. Hub/tests/site → verify: npm local tests + build-site
```

## 4. Permissions, Tenancy & i18n

- **RBAC / tenancy:** N/A (skills hub; no multi-tenant app data).
- **Auth surfaces:** `gh auth status`; ADO PAT via env; GitHub token for GraphQL threads as today (`AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` / `gh`). Providers own `validate-auth` messaging.
- **Secrets:** never write PATs into specs, state, or committed config.
- **i18n:** all skill/user-facing pipeline text **en-us**; no new locale keys.
- **Isolation:** provider selection must not leak the wrong tracker’s credentials into the other provider’s scripts.

## 5. Test Coverage

Map each AC to concrete verification (automated where possible; manual/agent checks for skill text).

| AC | Test / method | How |
|----|---------------|-----|
| AC1 | `test_providers_skill_dirs_exist` | Assert `.agents/skills/{github,azure-devops,local-spec}-provider/SKILL.md` exist; frontmatter contains `name:`; body contains `Standalone Mode` and `Workflow Mode`; `scripts/` exists or SKILL documents script paths |
| AC2 | `test_orchestrator_delegates_github_fetch` | Grep `spec-to-pr/SKILL.md`: no raw `gh issue view` recipe block; contains link/path to `github-provider`; canonicity still finds shimmed converter |
| AC3 | `test_ado_provider_documents_fetch` | Assert azure-devops-provider SKILL documents `ADO {id}` / `{org}/{project}#{id}` and points at moved `ado-workitem-to-spec.py` |
| AC4 | `test_local_provider_specs_dir` | Assert local-spec-provider documents `plans.specsDir` default `specs` and detect/configure behavior; example config has `specsDir` |
| AC5 | `test_ship_fix_delegate_scm` | Grep `11-ship-pr` / `08-fix-pr` SKILL: reference `providers.scm` or provider skill paths; happy path not solely `gh pr create` without ADO branch |
| AC6 | `test_standalone_sections` | Each provider SKILL has standalone invoke examples for `fetch-to-spec` (+ remotes: `validate-auth` + one PR intent) |
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
- English (en-us) only in skill content and pipeline banners.
- Surgical edits only: no drive-by refactors of unrelated skills.
- Prefer move+shim over copy-paste of scripts.

## 7. Pre-PR Checklist

- [ ] Three provider skills exist with dual-mode + intents (AC1).
- [ ] Converters moved; old paths still reachable via shims (AC9).
- [ ] `providers` + `plans.specsDir` in schema and example; legacy inference documented (AC7).
- [ ] Orchestrator Entry/Spec Protocol delegates `fetch-to-spec`; no raw `gh`/`az` recipe blocks (AC2–AC4).
- [ ] `11-ship-pr` / `08-fix-pr` / `09-goal-fix-pr` delegate SCM intents (AC5).
- [ ] Standalone sections present for each provider (AC6).
- [ ] `AGENTS.md` Task Router + Layer 2 updated (AC8).
- [ ] Layer boundaries respected (skills / tests / docs / hub only; no fake Domain/DB layers).
- [ ] `npm run tests -- --local` passes.
- [ ] `node bin/build-site.js` run; `docs/index.html` updated.
- [ ] No `.cursor/plans/` staged; no secrets committed.
- [ ] Offer harness audit (`check-harness`) after hub/skill changes.

## 8. Open Questions

_(none unresolved — decisions locked from spec)_

**Assumed defaults (documented, not blockers):**
- Catalog layer: Layer 2 unnumbered pipeline deps (not Layer 5).
- Thread/ADO scripts: move under provider + shim in `08-fix-pr/scripts/` (same pattern as converters).
- When `active=local` and `repoUrl` host ambiguous: STOP and require explicit `providers.scm` (no silent guess beyond github.com / Azure DevOps hosts).
