# spec-provider-skills — Execution Plan (Parallel)

**Mode:** parallel — plan exceeds `dagThresholds`.
**Reason:** 6 implementation steps, ~28 expected files, 4 layers (skills / tests / docs / hub) — any metric over limits (`maxImplementationSteps: 3`, `maxExpectedFiles: 6`, `maxLayers: 2`).
**Plan input:** `step-02-spec-provider-skills.plan.refined.md`
**DAG:** `step-03-spec-provider-skills.exec.dag.json`
**Concurrency:** ≤3 tasks per level; file sets non-overlapping within a level.
**Target model:** coder (Step 5 build)

---

## Size detection

| Metric | Value | Threshold | Result |
|--------|-------|-----------|--------|
| Steps (§3) | 6 | ≤ 3 | exceed |
| Expected files | ~28 | ≤ 6 | exceed |
| Layers | 4 (skills, tests, docs, hub) | ≤ 2 | exceed |

**execMode:** `parallel`

---

## Level map

```
L0  T1 ‖ T2 ‖ T3     scaffolds (3 providers)
L1  T4 ‖ T5 ‖ T6     GH move/shim ‖ ADO move/shim+en-us ‖ config schema
L2  T7 ‖ T8          orchestrator+ARTIFACTS+faq ‖ 00-write-spec mirror
L3  T9 ‖ T10 ‖ T11   11-ship-pr ‖ 08-fix-pr ‖ 09-goal-fix-pr
L4  T12 ‖ T13        AGENTS.md ‖ test-install
L5  T14              README/tools + build-site (after AGENTS.md)
```

---

## Tasks

### L0 — Provider scaffolds

#### T1 — Scaffold github-provider
- **dependsOn:** []
- **files:**
  - `.agents/skills/github-provider/SKILL.md`
  - `.agents/skills/github-provider/scripts/.gitkeep` (or empty `scripts/` dir marker)
- **acceptance:**
  - Frontmatter: `name: github-provider`, `upstream`, `version: 1.0`, `disable-model-invocation: true`
  - Sections: Standalone Mode + Workflow Mode
  - Intent table: `fetch-to-spec`, `validate-auth`, `create-pr`, `list-threads`, `resolve-thread`, `merge-pr` (all implemented by this provider)
  - Documents canonical script paths under `github-provider/scripts/` (converter + thread scripts)
  - en-us only; no hardcoded org/repo
- **coderPrompt:** Create `.agents/skills/github-provider/SKILL.md` as a dual-mode provider skill matching `08-fix-pr` / `11-ship-pr` frontmatter. Document shared contract intents for GitHub (`gh` CLI + scripts). Include standalone invoke examples for `fetch-to-spec`, `validate-auth`, and at least one PR intent. Point script paths at future canonical locations under `github-provider/scripts/`. English only. Do not move scripts yet (T4).

#### T2 — Scaffold azure-devops-provider
- **dependsOn:** []
- **files:**
  - `.agents/skills/azure-devops-provider/SKILL.md`
  - `.agents/skills/azure-devops-provider/scripts/.gitkeep`
- **acceptance:**
  - Frontmatter convention matched
  - Dual-mode sections present
  - Documents entry patterns `ADO {id}`, `{org}/{project}#{id}`, and PAT via env / `issueTrackers.azureDevOps`
  - Intent table covers all six intents for ADO
  - en-us only; no hardcoded org/project
- **coderPrompt:** Create `.agents/skills/azure-devops-provider/SKILL.md` dual-mode. Document ADO fetch/auth/PR/thread intents using `az` and/or REST + moved scripts under `azure-devops-provider/scripts/`. Prefer `config.json` `issueTrackers.azureDevOps` + env PAT; mention legacy `azure-devops.config.json` only as fallback. English only. Do not move scripts yet (T5).

#### T3 — Scaffold local-spec-provider + local scripts
- **dependsOn:** []
- **files:**
  - `.agents/skills/local-spec-provider/SKILL.md`
  - `.agents/skills/local-spec-provider/scripts/detect_specs_dir.py` (or `.sh` — shell/Python OK)
  - `.agents/skills/local-spec-provider/scripts/register_local_spec.py` (or equivalent)
- **acceptance:**
  - Dual-mode + frontmatter
  - Documents `plans.specsDir` default `specs`, detect/configure, flat + one-level nested layouts
  - PR intents documented as **delegate to `providers.scm`** (no silent no-op)
  - Local `validate-auth` = specsDir exists/creatable + config writable when configuring
  - Helper script(s) exist under `scripts/` or SKILL documents exact paths
- **coderPrompt:** Create `local-spec-provider` skill + minimal scripts for detect/configure `specsDir` and register/normalize/mirror local specs into `{us-dir}/step-00-{slug}.spec.md` with `source: local`. Document hybrid: PR intents load scm provider. Support flat and one-level nested specs. English only. No PowerShell files.

---

### L1 — Script migration + config

#### T4 — Move GitHub scripts + shims (AC9)
- **dependsOn:** [T1]
- **files:**
  - `.agents/skills/github-provider/scripts/github-issue-to-spec.py` (moved)
  - `.agents/skills/github-provider/scripts/fetch_threads.cjs` (moved)
  - `.agents/skills/github-provider/scripts/resolve_thread.cjs` (moved)
  - `.agents/skills/spec-to-pr/scripts/github-issue-to-spec.py` (thin shim)
  - `.agents/skills/08-fix-pr/scripts/fetch_threads.cjs` (thin shim)
  - `.agents/skills/08-fix-pr/scripts/resolve_thread.cjs` (thin shim)
  - `.agents/skills/github-provider/SKILL.md` (canonical path refs only)
- **acceptance:**
  - Canonical logic lives only under `github-provider/scripts/`
  - Old paths still invocable (shim forwards same CLI args; no duplicated logic)
  - `github-provider/SKILL.md` references canonical paths
  - Existing canonicity path asserts for `spec-to-pr/scripts/github-issue-to-spec.py` still find a file
- **coderPrompt:** Move `github-issue-to-spec.py` from `spec-to-pr/scripts/` and `fetch_threads.cjs` / `resolve_thread.cjs` from `08-fix-pr/scripts/` into `github-provider/scripts/`. Leave thin forwarder shims at old paths (re-exec or re-export). Update github-provider SKILL script path table. Do not edit `08-fix-pr/SKILL.md` or README (T10). Prefer move+shim over copy.

#### T5 — Move ADO scripts + shims + en-us (AC9, D9, D10)
- **dependsOn:** [T2]
- **files:**
  - `.agents/skills/azure-devops-provider/scripts/ado-workitem-to-spec.py` (moved)
  - `.agents/skills/azure-devops-provider/scripts/fix_pr_azure_context.py` (moved + translated)
  - `.agents/skills/spec-to-pr/scripts/ado-workitem-to-spec.py` (thin shim)
  - `.agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py` (thin shim)
  - `.agents/skills/azure-devops-provider/SKILL.md` (canonical path refs only)
- **acceptance:**
  - Canonical logic under `azure-devops-provider/scripts/`
  - Shims at old paths; no logic duplication
  - User-facing stdout/stderr/exit messages in `fix_pr_azure_context.py` are en-us (no Portuguese)
  - Config resolution prefers `issueTrackers.azureDevOps` + env PAT; legacy file paths remain fallback only
- **coderPrompt:** Move `ado-workitem-to-spec.py` and `fix_pr_azure_context.py` into `azure-devops-provider/scripts/`. Translate all user-facing PT-BR strings in the ADO helper to en-us. Prefer `spec-to-pr/config.json` `issueTrackers.azureDevOps` + `patEnvVar` / `ADO_PAT` / `AZURE_DEVOPS_PAT`; keep legacy `.agents/skills/azure-devops/` config as fallback. Thin shims at old paths. Update azure-devops-provider SKILL paths only (not 08 SKILL/README).

#### T6 — Config schema + example + local providers (AC7)
- **dependsOn:** []
- **files:**
  - `.agents/skills/spec-to-pr/config.schema.json`
  - `.agents/skills/spec-to-pr/config.json.example`
  - `.agents/skills/spec-to-pr/config.json` (local working copy only — gitignored)
- **acceptance:**
  - Schema defines `providers.active` enum `github|azure-devops|local` and `providers.scm` enum `github|azure-devops` (never `local`)
  - Example includes `providers` + documents omit-providers → legacy `issueTrackers` inference
  - `plans.specsDir` default `"specs"` documented
  - Example script path fields point at provider canonical paths
  - Local `config.json` set `providers.active: "github"`, `providers.scm: "github"` for this hub (do not stage/commit)
- **coderPrompt:** Add additive `providers` block to `config.schema.json` and `config.json.example`. Document resolution algorithm in `_comment`s. Update example `*Script` paths to provider canonical locations. Update local gitignored `config.json` with github active+scm for this repo. Do not invent Domain/DB layers.

---

### L2 — Entry / orchestrator wiring

#### T7 — Wire orchestrator Spec Protocol + ARTIFACTS + FAQ (AC2–AC4)
- **dependsOn:** [T1, T2, T3, T6]
- **files:**
  - `.agents/skills/spec-to-pr/SKILL.md`
  - `.agents/skills/spec-to-pr/ARTIFACTS.md`
  - `.agents/skills/spec-to-pr/docs/faq.md`
- **acceptance:**
  - Specification Protocol / Entry Gate: resolve `providers.active` → load provider → `fetch-to-spec`
  - No multi-line embedded `gh issue view` / `az` / hand-written local recipe bodies (dispatch table + provider links only)
  - Input→slug matrix and bare-number rules preserved; when `providers` set, `active` overrides
  - Scripts inventory updated (canonical + shim note)
  - ARTIFACTS entry Action column → provider `fetch-to-spec`
  - FAQ entry docs updated similarly
- **coderPrompt:** Refactor `spec-to-pr/SKILL.md` Specification Protocol and Entry Gate to delegate `fetch-to-spec` to the skill selected by `providers.active` (with legacy inference when `providers` omitted). Replace concrete CLI recipe blocks with a short dispatch table linking to the three providers. Keep slug matrix and local `source: local` + skip Step 0 behavior. Update Scripts table, ARTIFACTS.md, and docs/faq.md Action/entry docs. Surgical edits only.

#### T8 — Wire 00-write-spec optional mirror (AC4)
- **dependsOn:** [T3]
- **files:**
  - `.agents/skills/00-write-spec/SKILL.md`
- **acceptance:**
  - Optional post-draft hook documents calling local-spec-provider to mirror under `specsDir`
  - Does not move canonical truth away from `{us-dir}/step-00-{slug}.spec.md`
  - Dual-mode of 00 preserved
- **coderPrompt:** Add a minimal optional mirror hook to `00-write-spec/SKILL.md`: after drafting canonical step-00, may ask `local-spec-provider` to write/update human mirror under `plans.specsDir`. No duplicated mirror logic inside 00 — delegate. Surgical edit only.

---

### L3 — SCM pipeline wiring

#### T9 — Wire 11-ship-pr scm intents (AC5)
- **dependsOn:** [T1, T2, T6]
- **files:**
  - `.agents/skills/11-ship-pr/SKILL.md`
- **acceptance:**
  - Phases 4–6 call scm provider intents (`create-pr`, checks wait, `merge-pr`) via `providers.scm`
  - Happy path not GitHub-only; documents ADO route when `scm=azure-devops`
  - Never delete `workingBranch` after merge
  - Dual-mode preserved
- **coderPrompt:** Update `11-ship-pr/SKILL.md` Phases 4–6 to load the skill selected by `providers.scm` and call `create-pr` / checks / `merge-pr` intents. Remove GitHub-only happy-path hardcoding. Keep FSM/phase structure. Branch deletion rule unchanged. English only.

#### T10 — Wire 08-fix-pr scm intents + README (AC5)
- **dependsOn:** [T4, T5]
- **files:**
  - `.agents/skills/08-fix-pr/SKILL.md`
  - `.agents/skills/08-fix-pr/README.md`
- **acceptance:**
  - Phase 1/5 list/resolve via scm provider intents (not hardcoded single-host happy path)
  - Scoring/FSM unchanged
  - README platform table uses provider paths; stale primary `azure-devops/azure-devops.config.json` removed
  - Does not re-edit shim script bodies (already done in T4/T5)
- **coderPrompt:** Update `08-fix-pr/SKILL.md` to resolve list/resolve through `providers.scm` provider skills. Keep scoring FSM. Update README platform table to canonical provider script paths and note shims. Do not rewrite shim files.

#### T11 — Wire 09-goal-fix-pr thread count (AC5)
- **dependsOn:** [T1, T2, T6]
- **files:**
  - `.agents/skills/09-goal-fix-pr/SKILL.md`
- **acceptance:**
  - Active-thread count uses scm `list-threads` (or provider-documented count), not only hardcoded `gh pr view … jq`
  - Goal-loop / sentinel structure preserved
  - Dual-mode preserved
- **coderPrompt:** Update `09-goal-fix-pr/SKILL.md` so thread-count probes delegate to the scm provider `list-threads` intent. Keep goal-loop convergence behavior. Surgical edit only.

---

### L4 — Hub + tests

#### T12 — AGENTS.md Layer 2 + Task Router (AC8)
- **dependsOn:** [T1, T2, T3]
- **files:**
  - `AGENTS.md`
- **acceptance:**
  - Layer 2 rows for `github-provider`, `azure-devops-provider`, `local-spec-provider` (unnumbered pipeline deps)
  - Task Router entries for provider use cases
  - Language remains en-us
- **coderPrompt:** Add the three providers to `AGENTS.md` Layer 2 (peer to 00–11, not Layer 5) and Task Router. Match existing table style. No drive-by hub rewrites.

#### T13 — Extend install canonicity tests (AC1, AC8, AC9)
- **dependsOn:** [T1, T2, T3, T4, T5, T6]
- **files:**
  - `test/test-install.js`
- **acceptance:**
  - Asserts three provider `SKILL.md` exist
  - Keeps existing asserts that converter paths under `spec-to-pr/scripts/` exist (shims)
  - Optional: parse example config for `providers` keys
  - `npm run tests -- --local` intended to pass after this task (with prior tasks done)
- **coderPrompt:** Extend `test/test-install.js` with provider skill existence checks (and dual-mode/frontmatter smoke if pattern fits). Keep AC9 shim path asserts. Optionally assert `providers` in example config. Do not weaken existing canonicity checks.

### L5 — Docs + site

#### T14 — Consumer docs + regenerate site (AC8, D12)
- **dependsOn:** [T12]
- **files:**
  - `README.md` (if entry/PR docs need update)
  - `.agents/skills/spec-to-pr/tools.md` (if present and documents entry/PR)
  - `docs/index.html` (via `node bin/build-site.js`)
- **acceptance:**
  - Consumer docs note `update --include-new` for the three new skill folders
  - `node bin/build-site.js` succeeds; catalog lists three providers
  - Offer harness audit reminder in task summary (do not auto-run unless asked)
- **coderPrompt:** Update README and `tools.md` only where they document entry/PR/install so they mention providers and `update --include-new`. Run `node bin/build-site.js` to regenerate `docs/index.html` from AGENTS.md. No unrelated doc churn.

---

## Dependency edges (summary)

| Task | dependsOn |
|------|-----------|
| T1–T3, T6 | — |
| T4 | T1 |
| T5 | T2 |
| T7 | T1, T2, T3, T6 |
| T8 | T3 |
| T9 | T1, T2, T6 |
| T10 | T4, T5 |
| T11 | T1, T2, T6 |
| T12 | T1, T2, T3 |
| T13 | T1–T6 |
| T14 | T12 |

## Invariants (carry into every coderPrompt)

- No product commits; no staging `.cursor/plans/` or `config.json`
- Delegate platform recipes; no duplicated converter logic in shims
- en-us only (including moved ADO helper messages)
- No new `.ps1`; no Domain/DB/UI layers; `scm` never `local`
- Never delete `workingBranch` after merge

## Verify loop (after build)

1. Scaffolds → three SKILL.md dual-mode + intents
2. Move/shim → old script paths executable; ADO helper en-us
3. Config → schema + example `providers` enums
4. Orchestrator → no embedded gh/az recipes; dispatch table present
5. 08/09/11 → scm delegation; scoring FSM intact
6. Hub/tests/site → `npm run tests -- --local` + `node bin/build-site.js`
