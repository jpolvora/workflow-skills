# AGENTS.md — Packaged Skills Index

**Audience: agents** (consumer skill index + portability rules).  
**Humans:** install and contribute via the upstream root [`README.md`](../README.md). Upstream agent hub: root [`AGENTS.md`](../AGENTS.md).

This folder ships skills for consumers (`npx --yes github:jpolvora/workflow-skills` or local CLI). Skills under `.agents/skills/` support project workflows (`ws-spec-to-pr` / lite + pipeline) and the `test/` install dry-run tree.

This file is the **packaged routing index** after install — not a human install guide.

> **Source hub:** Root [`AGENTS.md`](../AGENTS.md) owns layers, skill loading, verification, and site catalog for the upstream repo. Prefer *this* file for what ships under `.agents/skills/` in consumers.

> **Drift check:** After add/remove/rename under `.agents/skills/`, update **both** root `AGENTS.md` and this packaged index (and regenerate the site when routing/layers change). Root [`AGENTS.md`](../AGENTS.md) retains the **full upstream layer catalog** (Workflows + Extra + global discovery). **This file** scopes the Skill index and Task router to the **Workflows package** (36 skills on disk after a default install); Extra-package skills appear only in [`### Extra package (optional)`](#extra-package-optional) so Workflows-only consumers avoid phantom routes.

> **Doc roles:** `AGENTS.md` / this file = agent contracts. `README.md` = human install/UX. Keep facts aligned; do not put install walkthroughs here.

**Language:** Skill content and pipeline output = **en-us**.

---

## Rules for skills under `skills/` (`.agents/skills/*`)

These rules apply to **every** skill shipped in this package (pipeline, providers, review, utility). They mirror the portability and integrity expectations enforced by [`ws-check-harness`](skills/ws-check-harness/SKILL.md).

### Portability and genericity (mandatory)

1. **Portable and project-agnostic** — Skills must work in any consumer repo. Do **not** hardcode org/repo names, solution filenames, API hosts, tenant fields, or stack-specific build/test commands inside skill bodies or scripts.
2. **Customize via `config.json`** — Project identity, stack, verification commands, issue trackers, and `providers.active` / `providers.scm` live in the **project** hub `ws-shared/config.json` (gitignored; copy from `config.json.example`). Skills **read** config / `rules.stackFile` companion / `tools.md`; they do not embed consumer metadata. See [`config-resolution.md`](skills/ws-shared/config-resolution.md). **Project-local config always overrides global hub config** (root [`AGENTS.md`](../AGENTS.md) § Skill SoT, install scopes & config override).
3. **Repo-root-relative paths only** — References use paths like `skills/ws-write-plan/SKILL.md` or `.agents/skills/...` from the consumer root. **Forbidden:** absolute paths (`C:\Users\...`, `/home/...`) or author-machine dependencies. Global install roots use `$HOME/.agents/skills` (or `WORKFLOW_SKILLS_GLOBAL_DIR`) only as the skills package location, not as the project config SoT.
4. **Harness-neutral** — Skill bodies must not name IDE or agent-product brands. Artifact roots come **only** from config: `plans.dir` (skill token `{plansDir}`), optional `reviews.dir`. Skills layout tokens `{skillsRoot}` / `{sharedDir}` come from `pathTokens` plus hybrid resolution (project `{sharedDir}` may differ from global `{skillsRoot}`; see root hub). Documented default for `plans.dir` is `.agents/plans`. Skill prose uses `{plansDir}/{slug}/` — no hardcoded plans roots. No undeclared path shorthands. Gates use `user-gate`; model switches via Pause → IDE/agent host → Resume; step work via `dispatch-agent` / host subagent dispatch. Mirror: root [`AGENTS.md`](../AGENTS.md) § Portability & harness neutrality.
5. **Progressive disclosure** — Route via this index / root hub; do not paste entire skill bodies into hubs. Prefer links to the canonical skill over duplicated prose.
6. **No `name:` collisions** — Each `SKILL.md` frontmatter `name:` must be unique across the installed tree.
7. **Evidence-based harness changes** — When fixing routing/links, cite verified paths; do not invent files.
8. **Consistent skill and task folder references** — Pipeline folders match frontmatter `name:` (`ws-write-spec` … `ws-fix-pr`, plus `ws-goal-fix-pr` and `ws-update-plan-implementation`). Numeric `NN-*` folder prefixes are forbidden. Retired or placeholder folder references are forbidden.
9. **Skill design & protocol guidelines** — Skill authoring and maintenance must follow [`SKILL_AUTHORING.md`](../SKILL_AUTHORING.md) (meta-instruction architecture, 3-tier progressive disclosure, tool-first validation, model role mapping, and zero-sediment pruning).
10. **Global execution config check** — When running from a global install (`$HOME/.agents/skills`), config-dependent skills must verify `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, prompt the user via `user-gate` recommending running `ws-configure-project`. Standalone/independent skills (e.g., `ws-secrets-leak-review`, `ws-karpathy-guidelines`, `ws-tdah`, `ws-write-a-skill`) do not require project config.

**Upstream SoT (authoring in this package):** skill bodies are developed under **`src/ws-*`**. Consumer install targets remain project `.agents/skills` and/or global `$HOME/.agents/skills`. Project `.agents/skills/ws-shared` holds local config data only. **Promote path:** skills added/installed/developed under `.agents/skills/ws-*` may be promoted into `src/ws-*` to become part of the published package (see root [`AGENTS.md`](../AGENTS.md) § Skill SoT — Promote into SoT). Do not promote `ws-shared` consumer-owned files.

### Language (mandatory)

- All skill bodies, frontmatter, scripts (user-facing strings), gates, banners, Progress Board text, and generated artifact templates: **English (en-us)**.
- No Portuguese (PT-BR) in skill content. Conversational replies to a user may follow the user’s language when the project allows it; **skill files stay en-us**.

### Upstream ownership and consumer edits

| Role | Rule |
|------|------|
| **Canonical upstream** | [`jpolvora/workflow-skills`](https://github.com/jpolvora/workflow-skills) is the authoritative source for pipeline and dependency skills. |
| **Installed copies** | Skills under `.agents/skills/` in consumer projects are **managed copies**. A plain `update` **overwrites** skill files. **Preserved:** `ws-shared/config.json`, `ws-shared/STACK.md`, `ws-shared/MEMORY.md`, `ws-shared/memory/*`, `ws-shared/installed-skills.json`, and optional `ws-shared/CHANGELOG.md` when configured there. Latest layout only — no older-folder migration and no legacy host-path shims (see upstream README § Safety; root [`AGENTS.md`](../AGENTS.md) § Portability). |
| **Local edits** | Consumers **may** edit skills locally for experiments, but those changes **can be lost** on the next `npx --yes github:jpolvora/workflow-skills update` (or `update --include-new`). |
| **No silent LLM refactors** | In **consumer** checkouts and **CI/Actions**, agents must **not** autonomously hygiene-refactor managed skill scripts (reorder helpers, “fix” false forward refs, rewrite scanners) without user approval. If a real fix belongs in skills, **suggest or open an upstream PR** — do not treat the consumer copy as the source of truth. Consumer hub copy: [`skills/ws-shared/AGENTS.md`](skills/ws-shared/AGENTS.md) § Managed skills. |
| **Contribute back** | Lasting improvements must be authored against the upstream repo and submitted as a **pull request** to `jpolvora/workflow-skills` (prefer `develop` → `main`). Do not treat a consumer fork of skill files as the long-term source of truth. |

### Pre-merge gate: `ws-check-harness` (mandatory for upstream)

Before committing skill changes and before merging to **`main`** on `workflow-skills`:

1. Load and run [`skills/ws-check-harness/SKILL.md`](skills/ws-check-harness/SKILL.md) (Phases 0–5c scan → Phase 6 correction plan → Phase 7 only with approval).
2. The audit **must** cover at least: routing vs disk inventory, broken/relative links, absolute paths, redundancy / progressive disclosure, **portability** (no hardcoded project metadata; parameterization via `config.json` / stack docs), **harness neutrality** (no IDE/agent product coupling; no legacy host path defaults), and **en-us** compliance.
3. Do **not** merge skill PRs to `main` while critical harness findings remain open.
4. **Website & Documentation Sync:** Whenever any feature, capability, CLI option, workflow, or skill is added, changed, updated, or removed, agents **MUST** update and describe the change across `docs/index.html` (`node bin/build-site.js` / `npm run build-site:bump`), `README.md`, `AGENTS.md`, and this packaged index. Keep root `AGENTS.md` + this packaged index in sync (**Drift check** above).

Standalone invoke: `/ws-check-harness` or `@ws-check-harness` (optional `--dry-run` for report-only).

---

## Workflows

| Skill | Path | Role |
|-------|------|------|
| `ws-spec-to-pr` | `skills/ws-spec-to-pr/SKILL.md` | Spec → plan → interview → implement → check → review → test → ship → fix-pr (FSM F0–F6, steps 0–9) |
| `ws-spec-to-pr-lite` | `skills/ws-spec-to-pr-lite/SKILL.md` | Fast sequential spec → plan → implement → review → ship → fix-pr (steps 0–5) |

### Dual-Mode Execution & Compatibility

Both workflows co-exist cleanly in **dual mode** inside consumer projects:
- **Shared Configuration**: `.agents/skills/ws-shared/config.json` only ([`config-resolution.md`](skills/ws-shared/config-resolution.md)).
- **Shared Gates**: [`gates.md`](skills/ws-shared/gates.md) — prefer `user-gate`; markdown fallback when unavailable; slim transitions; one delivery; one ship; no re-ask inside `ws-ship-pr` when `workflowMode: true`.
- **Session model**: `currentModel` from the executing session; switch via Pause → IDE/agent host → Resume (no `--model` / `--model-chain`). Soft tips at F1→F2 / F3→F4 (full orch only).
- **State Isolation**: `workflowType` (`standard` / `lite`) prevents cross-resuming.
- **Pipeline Reusability**: Shared pipeline skills stay orch-agnostic and interchangeable.
- **Dispatch:** [`ws-spec-to-pr/STEP-DISPATCH.md`](skills/ws-spec-to-pr/STEP-DISPATCH.md) is **standard-only** (steps 0–9). Lite keeps its own Steps 0–5; do not treat STEP-DISPATCH as lite step numbers.

---

## Skill loading (mandatory)

| Skill | Path | Trigger |
|-------|------|---------|
| `ws-tdah` | `skills/ws-tdah/SKILL.md` | Every prompt — `/ws-tdah` (**upstream development dogfood only**) |
| `ws-karpathy-guidelines` | `skills/ws-karpathy-guidelines/SKILL.md` | Every prompt — surgical scope |
| `ws-changelog` | `skills/ws-changelog/SKILL.md` | Every task completion |
| `ws-self-learning` | `skills/ws-self-learning/SKILL.md` | Before plan/code/fix: consult `{sharedDir}/MEMORY.md`; on completion: write traps → compile |
| `ws-senior-developer` | `skills/ws-senior-developer/SKILL.md` | Every prompt — engineering delivery gate (upstream authoring hub) |
| `using-superpowers` | `(global — not shipped)` | Session start — skill discovery |

### Dual-hub note (upstream authoring)

Packaged consumer hub [`skills/ws-shared/AGENTS.md`](skills/ws-shared/AGENTS.md) treats `ws-tdah` and `ws-senior-developer` as **on-demand** by default. This packaged index and root `AGENTS.md` may **autoload** both for upstream development dogfood. When both hubs load, root hub precedence wins — intentional override; see ws-shared § Consumer root override. Do not flag as drift in harness audits.

### Precedence (highest first)

1. Explicit user instructions (current turn)
2. Design / spec / architecture constraints
3. `ws-karpathy-guidelines`
4. `ws-senior-developer` (delivery gate; opt out via `rules.seniorDeveloper` unset or `stop ws-senior-developer`)
5. `ws-tdah` (action-first shape + judgment; still below karpathy/senior)

### Opt-out

| Phrase | Effect |
|--------|--------|
| `stop ws-tdah` / `stop verbosity` / `normal mode` | Disable ws-tdah |
| `stop ws-gabarito` / `sem ws-gabarito` | Same disable (retired alias) |
| `stop ws-senior-developer` | Disable ws-senior-developer when autoloaded |
| `/ws-tdah` · `/tdah` · `start ws-tdah` · `start ws-gabarito` | Activate (single default mode) |

---

## Skill index

Primary tables list **Workflows-package** skills only (`bin/skill-dependencies.json` → `packages.workflows.skills`, 35 ids). Optional Extra-package skills are in [`### Extra package (optional)`](#extra-package-optional) — not on disk until Extra or Full install.

### Harness & infrastructure

| Skill | Path | Description |
|-------|------|-------------|
| `ws-check-harness` | `skills/ws-check-harness/SKILL.md` | Audit harness integrity (routing, links, redundancy) |
| `ws-check-workflows` | `skills/ws-check-workflows/SKILL.md` | Validate workflow FSM paths, step continuity, config sharing, and state isolation |

### `ws-spec-to-pr` pipeline (steps 0–9, `ws-*` folders + goal-fix / update-plan)

| Skill | Step(s) | Path | Description |
|-------|---------|------|-------------|
| `ws-write-spec` | 0 | `skills/ws-write-spec/SKILL.md` | Draft canonical spec from feature description |
| `ws-classify-complexity` | 0 (after spec) | `skills/ws-classify-complexity/SKILL.md` | Pipeline lite vs standard classifier |
| `ws-write-plan` | 1 | `skills/ws-write-plan/SKILL.md` | Generate implementation plan from issue / spec |
| `ws-interview` | 2 | `skills/ws-interview/SKILL.md` | Audit and refine plan until shared understanding |
| `ws-plan-to-tasks` | 3 | `skills/ws-plan-to-tasks/SKILL.md` | Break plan into atomic DAG tasks |
| `ws-implement-tasks` | 4, 6 (fix substep) | `skills/ws-implement-tasks/SKILL.md` | Execute or fix code following plan/DAG |
| `ws-verify-plan` | 5 | `skills/ws-verify-plan/SKILL.md` | Check-implementation vs spec (score 0–10) |
| `ws-code-review` | 6 | `skills/ws-code-review/SKILL.md` | Two-phase review + fix → re-review (max 3) |
| `ws-testing` | 7 | `skills/ws-testing/SKILL.md` | Testing gate (unit, integration, coverage) |
| `ws-ship-pr` | 8 | `skills/ws-ship-pr/SKILL.md` | Delivery commit + push + create PR |
| `ws-fix-pr` | 9 | `skills/ws-fix-pr/SKILL.md` | Resolve active PR review threads |
| `ws-goal-fix-pr` | 9 | `skills/ws-goal-fix-pr/SKILL.md` | Loop fix-pr until zero open threads |
| `ws-multi-spec` | Orchestrator | `skills/ws-multi-spec/SKILL.md` | Sequential smart multi-spec batch delivery orchestrator |
| `ws-update-plan-implementation` | Post-workflow | `skills/ws-update-plan-implementation/SKILL.md` | Capture QA findings and apply plan deltas |

### Providers (platform-specific entry + PR ops)

| Skill | Path | Description |
|-------|------|-------------|
| `ws-github-provider` | `skills/ws-github-provider/SKILL.md` | GitHub issue→spec; auth; PR create/threads/merge (`gh`) |
| `ws-azure-devops-provider` | `skills/ws-azure-devops-provider/SKILL.md` | ADO work item→spec; PAT auth; PR create/threads/merge |
| `ws-local-spec-provider` | `skills/ws-local-spec-provider/SKILL.md` | Local `*.spec.md` detect/register; PR via configured SCM |

### Utility & meta (promoted — Workflows package)

| Skill | Path | Description |
|-------|------|-------------|
| `ws-tdah` | `skills/ws-tdah/SKILL.md` | Action-first replies + operational judgment |
| `ws-karpathy-guidelines` | `skills/ws-karpathy-guidelines/SKILL.md` | Surgical changes; no scope creep |
| `ws-fable-method` | `skills/ws-fable-method/SKILL.md` | 7-step problem-solving loop with gates |
| `ws-fable-domain` | `skills/ws-fable-domain/SKILL.md` | Domain adapter generator & schemas |
| `ws-spec-format` | `skills/ws-spec-format/SKILL.md` | Create / review / format `*.spec.md` |
| `ws-self-learning` | `skills/ws-self-learning/SKILL.md` | Consult MEMORY before write; record traps after |
| `ws-changelog` | `skills/ws-changelog/SKILL.md` | Summarized history via `rules.changelogFile` (default under `ws-shared/`) |
| `ws-configure-project` | `skills/ws-configure-project/SKILL.md` | Interview/detect fill `ws-shared/config.json` |
| `ws-goal-loop` | `skills/ws-goal-loop/SKILL.md` | Generic convergence loop (used by `ws-goal-fix-pr`) |
| `ws-spec-index` | `skills/ws-spec-index/SKILL.md` | Project spec index init/sync/promote |
| `ws-spec-list` | `skills/ws-spec-list/SKILL.md` | Dual board: specs (`{specsDir}`) vs plan workflows (`{plansDir}`) + manage menu |
| `ws-sync-spec` | `skills/ws-sync-spec/SKILL.md` | Auto-update feature specs after prompt/code evolutions |
| `ws-senior-developer` | `skills/ws-senior-developer/SKILL.md` | Optional engineering-delivery gate and Code review proof source |

### Review & audit (Workflows package)

| Skill | Path | Description |
|-------|------|-------------|
| `ws-secrets-leak-review` | `skills/ws-secrets-leak-review/SKILL.md` | Secrets / PII / credential leak scan |
| `ws-fable-judge` | `skills/ws-fable-judge/SKILL.md` | Adversarial audit, fraud detection & diff-grounded verification |

### Extra package (optional)

Not on disk after a **Workflows-only** install. Add via installer shortcut **`e`** (Extra package) or **`f`** (Full package). Source of truth: upstream `bin/skill-dependencies.json` → `packages.extra.skills` (2 ids).

#### Harness & authoring

| Skill | Path | Description |
|-------|------|-------------|
| `ws-write-a-skill` | `skills/ws-write-a-skill/SKILL.md` | Create, edit, and optimize predictable skills |
| `ws-show-harness` | `skills/ws-show-harness/SKILL.md` | Snapshot skills/rules/instructions active in this session |

---

## Task router

Primary table: **Workflows-package** install only (matches Skill index above).

| When to use | Skill to load |
|-------------|---------------|
| Spec → PR end-to-end | `ws-spec-to-pr` |
| Spec → PR lite (sequential) | `ws-spec-to-pr-lite` |
| Batch spec delivery | `ws-multi-spec` |
| Project spec index init/sync/promote | `ws-spec-index` |
| List / manage specs vs plan workflows (dual board + menu) | `ws-spec-list` |
| Auto-update feature specs after code changes | `ws-sync-spec` |
| Fable Method 7-step loop | `ws-fable-method` |
| Adversarial audit / fraud scan | `ws-fable-judge` |
| Domain adapters (DevOps/Data/Research) | `ws-fable-domain` |
| Write a spec | `ws-write-spec` |
| Classify spec pipeline complexity | `ws-classify-complexity` |
| Plan implementation | `ws-write-plan` → `ws-interview` → `ws-plan-to-tasks` |
| Implement / fix code | `ws-implement-tasks` |
| Engineering delivery gate / Code review proof | `ws-senior-developer` (autoload in upstream root; ws-shared default on-demand) |
| Verify against plan | `ws-verify-plan` |
| Local code review | `ws-code-review` |
| Testing pre-PR | `ws-testing` |
| Secrets / leak scan | `ws-secrets-leak-review` |
| Fix PR review threads | `ws-fix-pr` / `ws-goal-fix-pr` |
| Ship / merge PR | `ws-ship-pr` |
| GitHub issue→spec or GitHub PR ops | `ws-github-provider` |
| Azure DevOps work item→spec or ADO PR ops | `ws-azure-devops-provider` |
| Local `*.spec.md` register / normalize | `ws-local-spec-provider` |
| Format / review a spec | `ws-spec-format` |
| Fill / update `config.json` | `ws-configure-project` |
| Audit harness | `ws-check-harness` |
| Validate / check workflow processes | `ws-check-workflows` |
| Generic convergence loop | `ws-goal-loop` |

### Extra package (optional)

Requires Extra or Full install — skills not on Workflows-only disk.

| When to use | Skill to load |
|-------------|---------------|
| Create / rewrite a skill | `ws-write-a-skill` |
| Show active harness snapshot | `ws-show-harness` |

---

## External dependencies

Portable guardrails contract for **upstream authoring** (this packaged index). **Installed consumers** use [`skills/ws-shared/AGENTS.md`](skills/ws-shared/AGENTS.md) § External dependencies. Upstream full catalog: root [`AGENTS.md`](../AGENTS.md) § External dependencies. Bootstrap notes: [`skills/ws-shared/setup.md`](skills/ws-shared/setup.md).

Not shipped in the skill package (except where noted). Resolve each dependency in **order** (first match wins). Read paths from `skills/ws-shared/config.json` when present. Do **not** assume host-private rule folders.

| Dependency | Resolve (first match) |
|------------|------------------------|
| `senior-developer` | `config.json` → `rules.seniorDeveloper` (default `.agents/skills/ws-senior-developer/SKILL.md`; set `""` to disable) → local skill (`senior-developer/SKILL.md`) → global/user skill |
| `ws-karpathy-guidelines` | `config.json` → `rules.karpathyGuidelines` → shipped `skills/ws-karpathy-guidelines/SKILL.md` → global skill |
| Stack companion | `config.json` → `rules.stackFile` (default `.agents/skills/ws-shared/STACK.md`) — consumer-owned under `ws-shared/`; do not require repo-root `STACK.md` |
| Changelog file | `config.json` → `rules.changelogFile` (default `.agents/skills/ws-shared/CHANGELOG.md`) — create under that path only; repo-root only if explicitly configured |
| Domain glossary | `config.json` → `domain.glossaryFile` (often `CONTEXT.md`) — consumer root, optional |
| Optional consumer rules | Other `config.json` `rules.*` paths when set (e.g. `rules.efMigrations`, `rules.viewPatterns`) — do not invent filenames; prefer skills over host-private rule files |
| Domain catalog | `specs/domains/` — consumer-owned |
| Workflow artifacts | `config.json` → `plans.dir` (token `{plansDir}`; default `.agents/plans`) · `plans.specsDir` (token `{specsDir}`; default `.agents/specs`; prefer existing repo-root `specs/`) · optional `reviews.dir` (token `{reviewsDir}`; default `.agents/codereviews`) |

### Code review proof

When skills ask for **Code review proof**, use the checklist / verification obligations from the **resolved** `rules.seniorDeveloper` skill (local/global `senior-developer` equivalent after the table above). Do **not** paste or duplicate that checklist here.

---

## Consumer notes

- Installed skill trees are **managed upstream copies**. Consumer-owned under `skills/ws-shared/`: `config.json`, `STACK.md`, `MEMORY.md`, `memory/`, `installed-skills.json`, optional `CHANGELOG.md` — preserved on update; skill files are overwritten. Fresh install seeds `config.json` (from example), empty `MEMORY`/`CHANGELOG`, and `STACK.md` under `ws-shared/` when missing. Installer never writes consumer repo-root files.
- **Install / update / uninstall** (consumer project cwd; never `@latest` / `@main`):

```bash
npx --yes github:jpolvora/workflow-skills
npx --yes github:jpolvora/workflow-skills install --package workflows --yes
npx --yes github:jpolvora/workflow-skills install --package workflows --global --yes
npx --yes github:jpolvora/workflow-skills update
npx --yes github:jpolvora/workflow-skills update --global
npx --yes github:jpolvora/workflow-skills update --include-new
npx --yes github:jpolvora/workflow-skills uninstall --skills <csv> --yes
npx --yes github:jpolvora/workflow-skills uninstall --skills <csv> --global --yes
```

- `ws-shared/installed-skills.json` tracks managed skills (`skills` + `selected` roots). `update` bootstraps it from disk when missing. `uninstall` cascades unused deps and never deletes `ws-shared/` consumer data.
- Consumers may copy or adapt routing into their own root `AGENTS.md`; keep paths relative to the install root (typically `.agents/skills/...`).
- **Consumer hub:** `.agents/skills/ws-shared/AGENTS.md` is installed with the ws-shared hub and documents config, gates, and external dependencies. The installer does **not** copy `.agents/AGENTS.md` into consumer projects.
- **Dual hub (upstream only):** root `AGENTS.md` and packaged `.agents/AGENTS.md` stay aligned for ws-check-harness drift checks in this source repo.
- **Do not** rely on in-place edits to pipeline skills in a consumer project for production workflows — prefer an upstream PR (see **Upstream ownership** / **No silent LLM refactors** above). In-place edits are overwritten on update.
- Before upstream merge to `main`, skill changes must pass **`ws-check-harness`** (see **Pre-merge gate** above).
- Guardrails / External Dependencies: use **this file** § [External dependencies](#external-dependencies) (`rules.seniorDeveloper` / `rules.karpathyGuidelines` / `rules.stackFile` in config). Do not require a consumer root `AGENTS.md` section; if the root hub also documents the contract, keep both aligned.
