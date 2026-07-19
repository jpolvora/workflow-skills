# AGENTS.md — Packaged Skills Index

**Audience: agents** (consumer skill index + portability rules).  
**Humans:** install and contribute via the upstream root [`README.md`](../README.md). Upstream agent hub: root [`AGENTS.md`](../AGENTS.md).

This folder ships skills for consumers (`npx --yes github:jpolvora/workflow-skills` or local CLI). Skills under `.agents/skills/` support project workflows (`spec-to-pr` / lite + pipeline) and the `test/` install dry-run tree.

This file is the **packaged routing index** after install — not a human install guide.

> **Source hub:** Root [`AGENTS.md`](../AGENTS.md) owns layers, skill loading, verification, and site catalog for the upstream repo. Prefer *this* file for what ships under `.agents/skills/` in consumers.

> **Drift check:** After add/remove/rename under `.agents/skills/`, update **both** root `AGENTS.md` and this packaged index (and regenerate the site when routing/layers change). Root [`AGENTS.md`](../AGENTS.md) retains the **full upstream layer catalog** (Workflows + Extra + global discovery). **This file** scopes the Skill index and Task router to the **Workflows package** (28 skills on disk after a default install); Extra-package skills appear only in [`### Extra package (optional)`](#extra-package-optional) so Workflows-only consumers avoid phantom routes.

> **Doc roles:** `AGENTS.md` / this file = agent contracts. `README.md` = human install/UX. Keep facts aligned; do not put install walkthroughs here.

**Language:** Skill content and pipeline output = **en-us**.

---

## Rules for skills under `skills/` (`.agents/skills/*`)

These rules apply to **every** skill shipped in this package (pipeline, providers, review, utility). They mirror the portability and integrity expectations enforced by [`check-harness`](skills/check-harness/SKILL.md).

### Portability and genericity (mandatory)

1. **Portable and project-agnostic** — Skills must work in any consumer repo. Do **not** hardcode org/repo names, solution filenames, API hosts, tenant fields, or stack-specific build/test commands inside skill bodies or scripts.
2. **Customize via `config.json`** — Project identity, stack, verification commands, issue trackers, and `providers.active` / `providers.scm` live in `skills/shared/config.json` (gitignored; copy from `skills/shared/config.json.example`). Skills **read** config / `STACK.md` / `tools.md`; they do not embed consumer metadata. See [`config-resolution.md`](skills/shared/config-resolution.md).
3. **Repo-root-relative paths only** — References use paths like `skills/01-write-plan/SKILL.md` or `.agents/skills/...` from the consumer root. **Forbidden:** absolute paths (`C:\Users\...`, `/home/...`) or author-machine dependencies.
4. **Harness-neutral** — Skill bodies must not name IDE or agent-product brands. Artifact roots come **only** from config: `plans.dir` (skill token `{plansDir}`), optional `reviews.dir`. Documented default for `plans.dir` is `.agents/plans`. Skill prose uses `{plansDir}/{slug}/` — no hardcoded plans roots. No back-compat path aliases. Gates use `user-gate`; model switches via Pause → IDE/agent host → Resume; step work via `dispatch-agent` / host subagent dispatch. Mirror: root [`AGENTS.md`](../AGENTS.md) § Portability & harness neutrality.
5. **Progressive disclosure** — Route via this index / root hub; do not paste entire skill bodies into hubs. Prefer links to the canonical skill over duplicated prose.
6. **No `name:` collisions** — Each `SKILL.md` frontmatter `name:` must be unique across the installed tree.
7. **Evidence-based harness changes** — When fixing routing/links, cite verified paths; do not invent files.
8. **Consistent skill and task folder references** — FSM steps `00`–`09` use prefixed folder names (e.g. `05-verify-plan`, `07-testing`, `09-fix-pr`). Convergence / post skills use unprefixed folders `goal-fix-pr` and `update-plan-implementation`. Retired or placeholder folder references are forbidden.

### Language (mandatory)

- All skill bodies, frontmatter, scripts (user-facing strings), gates, banners, Progress Board text, and generated artifact templates: **English (en-us)**.
- No Portuguese (PT-BR) in skill content. Conversational replies to a user may follow the user’s language when the project allows it; **skill files stay en-us**.

### Upstream ownership and consumer edits

| Role | Rule |
|------|------|
| **Canonical upstream** | [`jpolvora/workflow-skills`](https://github.com/jpolvora/workflow-skills) is the authoritative source for pipeline and dependency skills. |
| **Installed copies** | Skills under `.agents/skills/` in consumer projects are **managed copies**. A plain `update` **overwrites** skill files. **Preserved:** `shared/config.json`, `shared/stack.md`, `shared/MEMORY.md`, `shared/memory/*`, `shared/installed-skills.json`. Latest layout only — no older-folder migration and no legacy host-path shims (see upstream README § Safety; root [`AGENTS.md`](../AGENTS.md) § Portability). |
| **Local edits** | Consumers **may** edit skills locally for experiments, but those changes **can be lost** on the next `npx --yes github:jpolvora/workflow-skills update` (or `update --include-new`). |
| **Contribute back** | Lasting improvements must be authored against the upstream repo and submitted as a **pull request** to `jpolvora/workflow-skills` (prefer `develop` → `main`). Do not treat a consumer fork of skill files as the long-term source of truth. |

### Pre-merge gate: `check-harness` (mandatory for upstream)

Before committing skill changes and before merging to **`main`** on `workflow-skills`:

1. Load and run [`skills/check-harness/SKILL.md`](skills/check-harness/SKILL.md) (Phases 0–5c scan → Phase 6 correction plan → Phase 7 only with approval).
2. The audit **must** cover at least: routing vs disk inventory, broken/relative links, absolute paths, redundancy / progressive disclosure, **portability** (no hardcoded project metadata; parameterization via `config.json` / stack docs), **harness neutrality** (no IDE/agent product coupling; no legacy host path defaults), and **en-us** compliance.
3. Do **not** merge skill PRs to `main` while critical harness findings remain open.
4. After harness-affecting changes, also regenerate the site catalog when applicable (`node bin/build-site.js` in the upstream repo) and keep root `AGENTS.md` + this packaged index in sync (**Drift check** above).

Standalone invoke: `/check-harness` or `@check-harness` (optional `--dry-run` for report-only).

---

## Workflows

| Skill | Path | Role |
|-------|------|------|
| `spec-to-pr` | `skills/spec-to-pr/SKILL.md` | Spec → plan → interview → implement → check → review → test → ship → fix-pr (FSM F0–F6, steps 0–9) |
| `spec-to-pr-lite` | `skills/spec-to-pr-lite/SKILL.md` | Fast sequential spec → plan → implement → review → ship → fix-pr (steps 0–5) |

### Dual-Mode Execution & Compatibility

Both workflows co-exist cleanly in **dual mode** inside consumer projects:
- **Shared Configuration**: `.agents/skills/shared/config.json` only ([`config-resolution.md`](skills/shared/config-resolution.md)).
- **Shared Gates**: [`gates.md`](skills/shared/gates.md) — prefer `user-gate`; markdown fallback when unavailable; slim transitions; one delivery; one ship; no re-ask inside `08-ship-pr` when `workflowMode: true`.
- **Session model**: `currentModel` from the executing session; switch via Pause → IDE/agent host → Resume (no `--model` / `--model-chain`). Soft tips at F1→F2 / F3→F4 (full orch only).
- **State Isolation**: `workflowType` (`standard` / `lite`) prevents cross-resuming.
- **Pipeline Reusability**: Shared pipeline skills stay orch-agnostic and interchangeable.
- **Dispatch:** [`spec-to-pr/STEP-DISPATCH.md`](skills/spec-to-pr/STEP-DISPATCH.md) is **standard-only** (steps 0–9). Lite keeps its own Steps 0–5; do not treat STEP-DISPATCH as lite step numbers.

---

## Skill loading (mandatory)

| Skill | Path | Trigger |
|-------|------|---------|
| `caveman` | `skills/caveman/SKILL.md` | Every prompt — compression |
| `gabarito` | `skills/gabarito/SKILL.md` | Every prompt — operational guidelines |
| `karpathy-guidelines` | `skills/karpathy-guidelines/SKILL.md` | Every prompt — surgical scope |
| `changelog` | `skills/changelog/SKILL.md` | Every task completion |
| `self-learning` | `skills/self-learning/SKILL.md` | Every task completion → `skills/shared/MEMORY.md` |
| `using-superpowers` | `(global — not shipped)` | Session start — skill discovery |

### Precedence (highest first)

1. Explicit user instructions (current turn)
2. Design / spec / architecture constraints
3. `karpathy-guidelines`
4. `gabarito`
5. `caveman` (compression only; keep technical accuracy)

### Opt-out

| Phrase | Effect |
|--------|--------|
| `stop caveman` / `normal mode` | Disable caveman |
| `stop gabarito` / `sem gabarito` | Disable gabarito |
| `/caveman lite\|full\|ultra\|…` | Intensity |

---

## Skill index

Primary tables list **Workflows-package** skills only (`bin/skill-dependencies.json` → `packages.workflows.skills`, 27 ids). Optional Extra-package skills are in [`### Extra package (optional)`](#extra-package-optional) — not on disk until Extra or Full install.

### Harness & infrastructure

| Skill | Path | Description |
|-------|------|-------------|
| `check-harness` | `skills/check-harness/SKILL.md` | Audit harness integrity (routing, links, redundancy) |
| `check-workflows` | `skills/check-workflows/SKILL.md` | Validate workflow FSM paths, step continuity, config sharing, and state isolation |

### `spec-to-pr` pipeline (`00`–`09` + goal-fix / update-plan)

| Skill | Step(s) | Path | Description |
|-------|---------|------|-------------|
| `ws-write-spec` | 0 | `skills/00-write-spec/SKILL.md` | Draft canonical spec from feature description |
| `ws-write-plan` | 1 | `skills/01-write-plan/SKILL.md` | Generate implementation plan from issue / spec |
| `ws-interview` | 2 | `skills/02-interview/SKILL.md` | Audit and refine plan until shared understanding |
| `ws-plan-to-tasks` | 3 | `skills/03-plan-to-tasks/SKILL.md` | Break plan into atomic DAG tasks |
| `ws-implement-tasks` | 4, 6 (fix substep) | `skills/04-implement-tasks/SKILL.md` | Execute or fix code following plan/DAG |
| `ws-verify-plan` | 5 | `skills/05-verify-plan/SKILL.md` | Check-implementation vs spec (score 0–10) |
| `ws-code-review` | 6 | `skills/06-code-review/SKILL.md` | Two-phase triage + investigation local review |
| `ws-testing` | 7 | `skills/07-testing/SKILL.md` | Testing gate (unit, integration, coverage) |
| `ws-ship-pr` | 8 | `skills/08-ship-pr/SKILL.md` | Delivery commit + push + create PR |
| `ws-fix-pr` | 9 | `skills/09-fix-pr/SKILL.md` | Resolve active PR review threads |
| `ws-goal-fix-pr` | 9 | `skills/goal-fix-pr/SKILL.md` | Loop fix-pr until zero open threads |
| `ws-update-plan-implementation` | Post-workflow | `skills/update-plan-implementation/SKILL.md` | Capture QA findings and apply plan deltas |

### Providers (platform-specific entry + PR ops)

| Skill | Path | Description |
|-------|------|-------------|
| `github-provider` | `skills/github-provider/SKILL.md` | GitHub issue→spec; auth; PR create/threads/merge (`gh`) |
| `azure-devops-provider` | `skills/azure-devops-provider/SKILL.md` | ADO work item→spec; PAT auth; PR create/threads/merge |
| `local-spec-provider` | `skills/local-spec-provider/SKILL.md` | Local `*.spec.md` detect/register; PR via configured SCM |

### Utility & meta (promoted — Workflows package)

| Skill | Path | Description |
|-------|------|-------------|
| `caveman` | `skills/caveman/SKILL.md` | Ultra-compressed response (~75% fewer tokens) |
| `gabarito` | `skills/gabarito/SKILL.md` | Ten operational response guidelines |
| `karpathy-guidelines` | `skills/karpathy-guidelines/SKILL.md` | Surgical changes; no scope creep |
| `spec-format` | `skills/spec-format/SKILL.md` | Create / review / format `*.spec.md` |
| `self-learning` | `skills/self-learning/SKILL.md` | Anti-regression notes in `MEMORY.md` |
| `changelog` | `skills/changelog/SKILL.md` | Summarized history in `CHANGELOG.md` |
| `configure-project` | `skills/configure-project/SKILL.md` | Interview/detect fill `shared/config.json` |
| `goal-loop` | `skills/goal-loop/SKILL.md` | Generic convergence loop (used by `goal-fix-pr`) |

### Review & audit (Workflows package)

| Skill | Path | Description |
|-------|------|-------------|
| `secrets-leak-review` | `skills/secrets-leak-review/SKILL.md` | Secrets / PII / credential leak scan |

### Extra package (optional)

Not on disk after a **Workflows-only** install. Add via installer shortcut **`e`** (Extra package) or **`f`** (Full package). Source of truth: upstream `bin/skill-dependencies.json` → `packages.extra.skills` (2 ids).

#### Harness & authoring

| Skill | Path | Description |
|-------|------|-------------|
| `write-a-skill` | `skills/write-a-skill/SKILL.md` | Create, edit, and optimize predictable skills |
| `show-harness` | `skills/show-harness/SKILL.md` | Snapshot skills/rules/instructions active in this session |

---

## Task router

Primary table: **Workflows-package** install only (matches Skill index above).

| When to use | Skill to load |
|-------------|---------------|
| Spec → PR end-to-end | `spec-to-pr` |
| Spec → PR lite (sequential) | `spec-to-pr-lite` |
| Write a spec | `ws-write-spec` |
| Plan implementation | `ws-write-plan` → `ws-interview` → `ws-plan-to-tasks` |
| Implement / fix code | `ws-implement-tasks` |
| Verify against plan | `ws-verify-plan` |
| Local code review | `ws-code-review` |
| Testing pre-PR | `ws-testing` |
| Secrets / leak scan | `secrets-leak-review` |
| Fix PR review threads | `ws-fix-pr` / `ws-goal-fix-pr` |
| Ship / merge PR | `ws-ship-pr` |
| GitHub issue→spec or GitHub PR ops | `github-provider` |
| Azure DevOps work item→spec or ADO PR ops | `azure-devops-provider` |
| Local `*.spec.md` register / normalize | `local-spec-provider` |
| Format / review a spec | `spec-format` |
| Fill / update `config.json` | `configure-project` |
| Audit harness | `check-harness` |
| Validate / check workflow processes | `check-workflows` |
| Generic convergence loop | `goal-loop` |

### Extra package (optional)

Requires Extra or Full install — skills not on Workflows-only disk.

| When to use | Skill to load |
|-------------|---------------|
| Create / rewrite a skill | `write-a-skill` |
| Show active harness snapshot | `show-harness` |

---

## External dependencies

Portable guardrails contract for **installed** consumers (this file ships under `.agents/`). Prefer this section when the consumer root `AGENTS.md` omits `#external-dependencies`. Upstream hub copy (same contract): root [`AGENTS.md`](../AGENTS.md) § External dependencies. Bootstrap notes: [`skills/shared/setup.md`](skills/shared/setup.md).

Not shipped in the skill package (except where noted). Resolve each dependency in **order** (first match wins). Read paths from `skills/shared/config.json` when present. Do **not** assume host-private rule folders.

| Dependency | Resolve (first match) |
|------------|------------------------|
| `senior-developer` | `config.json` → `rules.seniorDeveloper` → local skill (`senior-developer/SKILL.md`) → global/user skill |
| `karpathy-guidelines` | `config.json` → `rules.karpathyGuidelines` → shipped `skills/karpathy-guidelines/SKILL.md` → global skill |
| Stack companion | `config.json` → `rules.stackFile` (default `STACK.md` / `stack.md`) — consumer-owned |
| Domain glossary | `config.json` → `domain.glossaryFile` (often `CONTEXT.md`) — consumer root, optional |
| Optional consumer rules | Other `config.json` `rules.*` paths when set (e.g. `rules.efMigrations`, `rules.viewPatterns`) — do not invent filenames; prefer skills over host-private rule files |
| Domain catalog | `specs/domains/` — consumer-owned |
| Workflow artifacts | `config.json` → `plans.dir` (token `{plansDir}`; default `.agents/plans`) · optional `reviews.dir` (default `.agents/codereviews`) |

### Code review proof

When skills ask for **Code review proof**, use the checklist / verification obligations from the **resolved** `rules.seniorDeveloper` skill (local/global `senior-developer` equivalent after the table above). Do **not** paste or duplicate that checklist here.

---

## Consumer notes

- Installed skill trees are **managed upstream copies**. Consumer-owned under `skills/shared/`: `config.json`, `stack.md`, `MEMORY.md`, `memory/`, `installed-skills.json` — preserved on update; skill files are overwritten.
- **Install / update / uninstall** (consumer project cwd; never `@latest` / `@main`):

```bash
npx --yes github:jpolvora/workflow-skills
npx --yes github:jpolvora/workflow-skills install --package workflows --yes
npx --yes github:jpolvora/workflow-skills update
npx --yes github:jpolvora/workflow-skills update --include-new
npx --yes github:jpolvora/workflow-skills uninstall --skills <csv> --yes
```

- `shared/installed-skills.json` tracks managed skills (`skills` + `selected` roots). `update` bootstraps it from disk when missing. `uninstall` cascades unused deps and never deletes `shared/` consumer data.
- Consumers may copy or adapt this index into their own root `AGENTS.md`; keep paths relative to the install root (typically `.agents/skills/...`).
- **Dual hub (OK):** consumer root `AGENTS.md` may stay project-specific and delegate skill routing to a local rules/index file **when the host provides one** — not required. This packaged `.agents/AGENTS.md` remains the **skill catalog** for the installed hub; keep both aligned after updates. Do **not** require host-specific rules files for dual-mode workflows.
- **Do not** rely on in-place edits to pipeline skills in a consumer project for production workflows — prefer an upstream PR (see **Upstream ownership** above). In-place edits are overwritten on update.
- Before upstream merge to `main`, skill changes must pass **`check-harness`** (see **Pre-merge gate** above).
- Guardrails / External Dependencies: use **this file** § [External dependencies](#external-dependencies) (`rules.seniorDeveloper` / `rules.karpathyGuidelines` / `rules.stackFile` in config). Do not require a consumer root `AGENTS.md` section; if the root hub also documents the contract, keep both aligned.
