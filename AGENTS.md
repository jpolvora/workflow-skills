# AGENTS.md — Agent harness hub

**Audience: agents (and tools that load agent instructions).**  
Humans: use [`README.md`](README.md) for install, overview, and contribution narrative.

This file is the **routing and operating contract** for the agent harness in this repository. Load skills from the tables below. Do not treat `README.md` as the skill router. Session start in **this repo:** apply § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only). Do not `Read` a separate harness skill.

**Language:** en-us only for skill bodies, gates, banners, and harness docs.

**Source anonymization (mandatory):** Bug/issue fixes (prompt or spec) must not cite private consumer project names. Pasted consumer code or traces are for diagnosis only. Closing reports, commits, specs, and new GitHub (or other tracker) issues must use generic wording: strip private names, paths, hostnames, and customer data; describe the failure class, not the originating app. Name this public package (`workflow-skills`, `ws-*`) only when the work is actually here.

---

## Portability & harness neutrality (mandatory)

Shipped skills are **agent- and IDE-neutral**. They must run in any consumer host that can load `SKILL.md` from an installed skills root (project-local or global).

| Rule | Detail |
|------|--------|
| **No host product names** | Skill bodies, gates, banners, templates, and scripts must **not** name or require specific IDEs/agents (examples of forbidden coupling: product-branded UIs, host-only tool IDs as the contract, host-only folder layouts as required defaults). |
| **Capability vocabulary** | Use portable aliases from [`ws-shared/tools.md`](.agents/skills/ws-shared/tools.md): `user-gate`, `dispatch-agent`, path tokens `{skillsRoot}` / `{sharedDir}` / `{plansDir}` (← `plans.dir`), etc. Load `config.json` + `tools.md` Path tokens before tool calls; expand braces first. Prefer a host structured-choice UI when available; markdown fallback when not. |
| **Consumer-owned asset paths** | Workflow artifacts, reviews, and optional project rules live where **the consumer configures** them (`config.json` → `plans.dir`, `reviews.dir`, `rules.*`). Skill prose uses `{plansDir}/{slug}/` — never hardcode the default path. Shipped default for `plans.dir` is `.agents/plans`. |
| **No compatibility maintenance** | Do **not** keep legacy path aliases, migration shims, or dual defaults for old host-specific folders. Latest layout only on install/update. |
| **Host adapters stay out of skills** | Optional host pointer files, marketplace manifests, and this upstream repo’s local `.cursor/` tree are **not** part of the portable skill contract. Put lasting guidance in skills / `AGENTS.md`, not host-private rule files. |
| **Upstream dogfood exception** | This source repo may keep a local `.cursor/` for authoring/plans. That layout must **not** leak into shipped skill defaults or required consumer paths. |

Consumer mirror: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) — the hub shipped by the installer. This file is the only upstream-authoring hub; there is no separate packaged index.

---

## Skill SoT, install scopes & config override (mandatory)

Always apply this layout and resolution order. **`.agents/skills/ws-*` is the ONLY canonical source of truth for skills in this upstream package.** Author, package, hash, audit, catalog, and install from that tree. Whenever reviewing, updating, enhancing, or creating skills (`ws-*`), agents **MUST edit the authoritative files under `.agents/skills/`**. The installation source shipped by the installer is always `.agents/skills/`.

| Layer | Path | Role |
|-------|------|------|
| **Upstream development SoT** | `.agents/skills/ws-*` | Author, test, and publish skill bodies here. Packaging, integrity, catalog, and harness audits treat **`.agents/skills/`** as the only skill-content SoT. |
| **Project config hub** | `$PWD/.agents/skills/ws-shared/` | Consumer-owned (and upstream dogfood) project settings: `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, optional `CHANGELOG.md`, `installed-skills.json`. Created/filled by `ws-configure-project`. **Not** published as skill SoT templates (hub templates are the non-consumer-owned files beside them). |
| **Project-local install** | `$PWD/.agents/skills/ws-*` | Optional: install skill packages into a consumer project. Skill bodies live beside the project hub. |
| **Global install** | `$HOME/.agents/skills/ws-*` (override via `WORKFLOW_SKILLS_GLOBAL_DIR`) | Optional: install skill packages once per machine. Agents may load global `ws-*` while the open project keeps its own `ws-shared` config. |

**Hybrid mode (supported):** skill bodies from **global** `$HOME/.agents/skills/ws-*` (or project-local `.agents/skills/ws-*`) + **project** config from `$PWD/.agents/skills/ws-shared/`.

**Authoring in this upstream package:** Edit skill folders directly under **`.agents/skills/ws-<skill-id>/`** (keep `SKILL.md` + scripts/refs). Do **not** treat consumer-owned hub data (`config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, `skill-integrity-local.json`, optional `CHANGELOG.md`, hub `.gitignore`) as publishable SoT — templates/examples only (`*.example`, `*.template`, `hub.gitignore`, `AGENTS.md`, `tools.md`, etc.). Register new skills in `bin/skill-dependencies.json`, update hubs, regenerate integrity (`npm run generate-integrity`), and verify with `ws-check-harness` before ship.

### Global vs local `ws-*` (this repo only — mandatory)

Agent hosts often list the **same** `ws-*` id twice: this package’s SoT and a machine-wide install. They are different trees. **Do not merge, sync, or edit them as one.**

| Tree | Path | Use in this package root |
|------|------|--------------------------|
| **Stable install** | `{globalSkillsRoot}/ws-*` (`$HOME/.agents/skills` or `WORKFLOW_SKILLS_GLOBAL_DIR`) | **Default load / invoke** when that folder exists — follow this copy for skill *behavior* so in-progress local bodies do not replace the published skill mid-session |
| **Development SoT** | `$PWD/.agents/skills/ws-*` | **Only edit / hash / test / ship** target. `Read` this copy when the task is to **author, review, or test that skill id** |

**Rules:**

1. **Default invoke:** If `{globalSkillsRoot}/ws-<id>/SKILL.md` exists, `Read` **that** path (not the in-tree duplicate) unless rule 2 applies. Do not `Read` both copies.
2. **Author / test / review `ws-<id>`:** `Read` and edit **only** `$PWD/.agents/skills/ws-<id>/`. Ignore the global duplicate for that id. Verify with this repo’s tests (`npm run test`, `ws-check-harness`) — never by writing the global tree.
3. **Never write, uninstall, or “fix”** `{globalSkillsRoot}/ws-*` from a session whose cwd is this package root. That tree is a managed consumer install for other projects; `update` overwrites it.
4. **`{skillsRoot}` in this repo** still expands to **local** `.agents/skills` (authoring, integrity, harness audits). Do not retarget `pathTokens.skillsRoot` at `{globalSkillsRoot}`. When invoking under rule 1, run that skill’s scripts from `{globalSkillsRoot}` so `SKILL.md` and scripts stay the same version.
5. **Session autoload** is this file § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only). Do not autoload live `ws-*` from either tree.
6. **Non-`ws-*` user skills** (other folders under `{globalSkillsRoot}` or the host’s user-skills dir) are not this package; keep using them.
7. **No host/IDE switch** removes the duplicate. Project skills roots and user/global skills roots are discovered together. Per-workspace skill toggles are host-private and **not** the portable contract — this section is the tie-break. Do not add product-branded disable rules as shipped guidance.

Consumer projects keep hybrid rules unchanged: local `{skillsRoot}` overrides `{globalSkillsRoot}` when both exist; config always from the project hub.

**Config specificity (most specific wins — always):**

1. Explicit override (`WORKFLOW_SKILLS_SHARED_DIR` / absolute `pathTokens.sharedDir` when set).
2. **Project-local** `$PWD/.agents/skills/ws-shared/config.json` — **overrides** any global hub config.
3. Global `$HOME/.agents/skills/ws-shared/` — templates / fallback only when the project hub does not exist yet (run `ws-configure-project` to create the project hub).

**Skills-root resolution (for scripts / `{skillsRoot}`):** explicit override → project `.agents/skills` if the needed `ws-*` skill exists there → else global `$HOME/.agents/skills` (or `WORKFLOW_SKILLS_GLOBAL_DIR`). In **this upstream package**, `{skillsRoot}` is always the local SoT (`.agents/skills`) even when a global install exists. Invoke vs edit for `SKILL.md` bodies: § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory). Never read a project’s `config.json` from the global hub when a project hub exists.

**Agent obligations:** before tool calls, resolve `{sharedDir}` from the project working tree first; expand `{skillsRoot}` independently when hybrid. Do not assume `{skillsRoot}` and `{sharedDir}` are always the same physical tree. When the host lists duplicate `ws-*` ids, follow § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory) before `Read`.

**Global skill execution & local config gate:** When executing a skill installed globally (`$HOME/.agents/skills`), agents must check if the target skill is **config-dependent** (requires project settings, verification commands, SCM providers, or stack companions). If so, the agent MUST verify that the consuming local repository has `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, the agent MUST prompt the user via `user-gate` recommending running `ws-configure-project` to set up the project hub. Config-independent skills (e.g., `ws-configure-project`, `ws-secrets-leak-review`, `ws-karpathy-guidelines`, `ws-tdah`, `ws-write-a-skill`) do not require `config.json` and may run directly.

---

## Doc roles (mandatory)

| File | Audience | Purpose |
|------|----------|---------|
| **`AGENTS.md`** (this file) | Agents | Skill loading, task router, layers, verification, and this repo’s inlined session contract |
| **`README.md`** | Humans | What this repo is, how to install/update/uninstall, contribute, safety |
| **`CATALOG.md`** | Agents + site generator | On-demand upstream workflow commands, task router, and bounded skill inventory |
| **`SKILL_AUTHORING.md`** | Agents & Skill Authors | Mandatory guidelines for designing, pruning, and maintaining lean skills |
| **`ws-shared/AGENTS.md`** | Agents (consumers) | Installed hub: config, gates, consumer task router, external dependencies |
| **`ws-shared/autoload.md`** | Agents (consumers + specs router) | Consumer Always-applied set + specs progressive-disclosure router. This repo does **not** follow its Always-applied table (live `ws-*` bodies). Specs vocabulary/router still load on keywords. |
| **`.agents/skills/ws-*/SKILL.md`** | Agents (upstream SoT) | Skill bodies under development / publish — load on demand via router when **authoring or testing** that skill |
| **Installed `…/skills/*/SKILL.md`** | Agents (consumers) | Progressive disclosure after project-local or global install |
| **Optional host pointer** | Agents (host-specific) | Thin pointer to this hub if the consumer’s IDE needs one — not required by skills; not a portable dependency |

When editing harness docs: put **agent obligations** here; put **human install/UX prose** in `README.md`. Keep them aligned on facts (paths, install commands) without duplicating full skill bodies.

---

## Canonical upstream

Repo `jpolvora/workflow-skills` is the authoritative upstream for **spec-driven** workflows and pipeline skills. Specs (`{specsDir}/*.spec.md`) are the contract of record; `{plansDir}` holds run artifacts.

- Installed copies via `npx --yes github:jpolvora/workflow-skills` are **managed** (project-local and/or **global**). `update` overwrites skill files; `uninstall` removes skill folders (cascades unused deps) and never deletes project `ws-shared/` consumer data.
- **Preserve** under the **project** `.agents/skills/ws-shared/`: `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, optional `CHANGELOG.md` when `rules.changelogFile` points there (consumer-owned; never overwrite from upstream). Project hub **overrides** any global `$HOME/.agents/skills/ws-shared` values. The installer ships no packaged upstream index — the consumer hub is `ws-shared/AGENTS.md`. Fresh install / `ws-configure-project` seeds `config.json` (from example), `MEMORY.md`, `CHANGELOG.md`, and `STACK.md` under the **project** `ws-shared/` when missing. Installer never writes consumer repo-root files.
- **Layout contract:** § [Skill SoT, install scopes & config override](#skill-sot-install-scopes--config-override-mandatory) — upstream SoT `.agents/skills/ws-*`; consumer install `.agents/skills` and/or `$HOME/.agents/skills`; project config always wins.
- **Latest layout only:** installer does not migrate older folder names or legacy host paths — consumers get the current skill tree and neutral defaults on install/update. See [`README.md`](README.md) § Safety and § [Portability & harness neutrality](#portability--harness-neutrality-mandatory).
- Lasting skill changes: PR to `develop` → `main` only after **`ws-check-harness`** passes. Authoring rules: [`SKILL_AUTHORING.md`](.agents/skills/ws-write-a-skill/SKILL_AUTHORING.md).
- **Consumers / CI / Actions:** agents must not silently hygiene-refactor managed skill scripts; lasting fixes → suggest or open an **upstream** PR. See [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) § Managed skills.
- After install/update in a consumer: run `ws-check-harness`.
- Skills stay portable: parameterize via `ws-shared/config.json` / stack docs; no project hardcoding; no IDE/agent product coupling. Client data hub: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md).
- Guardrails resolution: § [External dependencies](#external-dependencies) (consumer install mirror: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md)).
- **This upstream’s local `.cursor/`:** authoring/plans only for this repo — never the shipped default for consumers.
- **Upstream developer loop:** § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) (this package root only — not the portable consumer contract).

### Upstream developer workflow (this repo only)

Authoring + Before-ship checklist: [`CATALOG.md`](CATALOG.md) § Upstream developer workflow. Consumers: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md).

### Consumer CLI (install / update / uninstall)

Commands + flags: [`README.md`](README.md) § Install, update, and uninstall (`npx --yes github:jpolvora/workflow-skills …`). Manifest: `.agents/skills/ws-shared/installed-skills.json`. **This source repo:** use local `node bin/cli.js` / `./install-skills.sh` (not remote `npx` against package root, except under `test/`).
---

## Workflows

| Workflow | Path | Role |
|----------|------|------|
| `ws-spec-to-pr` | `.agents/skills/ws-spec-to-pr/SKILL.md` | Spec → plan → interview → implement → check → product commit → review → review-fix commit → test → ship → fix-pr (FSM F0–F6, steps 0–9) |
| `ws-spec-to-pr-lite` | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Fast sequential spec → plan → implement → product commit → review → review-fix commit → ship → fix-pr (steps 0–5) |

### Dual-mode

- Config: `.agents/skills/ws-shared/config.json` only — [`config-resolution.md`](.agents/skills/ws-shared/config-resolution.md)
- SCM intents: [`scm-provider-contract.md`](.agents/skills/ws-shared/scm-provider-contract.md) — GitHub and Azure DevOps must implement the same required intents
- Gates: [`gates.md`](.agents/skills/ws-shared/gates.md) — prefer `user-gate` (native structured choice when available; markdown fallback)
- **Session model:** orch stays on `currentModel` (Pause → host → Resume; no `--model` / `--model-chain`). Subagent models: `defaults.modelsPreset` / `modelPresets` / `stepModels` / legacy phase keys; standard `dispatch-agent` only (lite inline). Fix-PR batches use `fixPrPlan` → `reviewerModel`, then `fixPrExec` → `executionModel`; both bypass numeric Step 9 and emit dispatch events only. `defaults.enableDag` default `false` = sequential; `true` = DAG. `defaults.verboseMode` explicit `true` = start-of-step `*` preview (schema seed writes `true`). Review-model tip at Advance into Step 6 (full orch)
- State: `workflowType` `standard` | `lite` (no cross-resume)
- Shared pipeline skills stay orch-agnostic
- **Product commits:** standard after Step 5 when score ≥ `defaults.minVerifyScore` (default 9) (before Step 6 review) then after Step 6 review-fix if files changed; lite after Step 2 (before Step 3 review) then after review-fix if files changed. Stage only workflow `files_touched` (never `{plansDir}` until Step 8 / lite Step 4). Review uses `git diff {base}...HEAD`. No push before ship.
- **Dispatch:** [`ws-spec-to-pr/STEP-DISPATCH.md`](.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md) is **standard-only** (steps 0–9). Lite keeps its own Steps 0–5 table; do not use STEP-DISPATCH as lite step numbers.

### Pipeline skills (owned here)

| Skill | Step(s) | Role |
|-------|---------|------|
| `ws-spec-to-pr` | Orchestrator | FSM dispatcher |
| `ws-write-spec` | 0 | Spec from description |
| `ws-classify-complexity` | 0 (after spec) | Pipeline lite vs standard classifier |
| `ws-write-plan` | 1 | Implementation plan |
| `ws-interview` | 2 | Plan audit |
| `ws-plan-to-tasks` | 3 | DAG tasks |
| `ws-implement-tasks` | 4, 6 (fix substep) | Build / review fix |
| `ws-verify-plan` | 5 | Check-implementation (advance at `defaults.minVerifyScore` (default 9); uncovered `negativeScenarios` cap 8); product commit before review |
| `ws-code-review` | 6 | Local review of committed diff vs base (fix → re-review, max 3; then product commit) |
| `ws-testing` | 7 | Testing (unit/integration/coverage; optional mutation score gate) |
| `ws-ship-pr` | 8 | Delivery artifacts + push/PR (product already committed) |
| `ws-fix-pr` | 9 | Batch gate-only plan → execute/proactive fix |
| `ws-goal-fix-pr` | 9 | Repeat plan/execute batches until zero threads |
| `ws-update-plan-implementation` | Post (optional Extra) | Plan deltas |
| `ws-github-provider` | Provider | GitHub issue→spec + PR ops (same intents as Azure) |
| `ws-azure-devops-provider` | Provider | ADO WI→spec + PR ops (same intents as GitHub) |
| `ws-local-spec-provider` | Provider | Local `*.spec.md` |
| `ws-spec-format` | Protocol | Spec format |
| `ws-goal-loop` | Primitive | Convergence loop |
| `ws-spec-memo` | Utility | External spec-memo vault **setup/bridge** (`specMemo.*`, import, hybrid fallback, write-block hook interview) via `ws-configure-project --section specMemo` or `/ws-spec-memo`. Runtime vault ops → **`ws-memo`** from [spec-memo](https://github.com/jpolvora/spec-memo) (not packaged here) |

---

## Upstream session contract (this repo only)

**Not packaged.** Inline here so this repo does not `Read` live `ws-*` SKILL.md for session autoload (those files are the SoT being authored). Compact snapshot of packaged behavior **0.3.47** (`ws-tdah`, `ws-karpathy-guidelines`, `ws-senior-developer`, `ws-fable-method`, `ws-self-learning`, `ws-changelog`, `ws-write-spec`, `ws-spec-format`). When those contracts change and dogfood should follow, update **this section** in the same PR.

Do **not** recreate `.agents/dev-harness/` or any extra `SKILL.md` for this contract. A folder under `.agents/skills/` would be hashed and shipped. Summarize here; invoke live scripts by path; load a live body only when **authoring or testing that skill**. Orchestrators, providers, `ws-check-harness`: task router, one skill at a time.

Hub files (`config.json`, `tools.md`, `gates.md`) are not skills. Specs keywords → `{sharedDir}/autoload.md` § Specs vocabulary + router only (not that file’s Always-applied table). Config missing → `user-gate` → `ws-configure-project` (do not load that skill unless running the wizard). Duplicate `ws-*` ids: § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory).

`user-gate`: host structured choice (≥2 options, recommended first); markdown fallback; cancel → STOP, never infer yes.

### 1. Surgical scope (`ws-karpathy-guidelines`)

Caution over speed; trivial tasks: judgment. Consult knowledge via `read-memory` (local MEMORY and/or spec-memo vault per routing) before inventing (§5).

- **Think:** state assumptions; present multiple interpretations; say if a simpler path exists; stop and ask when unclear.
- **Simplicity:** minimum code that solves the ask. No extras, single-use abstractions, unrequested configurability, or impossible-path error handling. If 200 lines could be 50, rewrite.
- **Surgical:** touch only what the request requires. Do not improve adjacent code, comments, or formatting. Match existing style. Mention unrelated dead code; do not delete it. Remove orphans **your** change created. Every changed line traces to the request.
- **Goal-driven:** verifiable success; multi-step `step → verify` until checked. Weak criteria ("make it work") need clarification.

### 2. Delivery gate (`ws-senior-developer`)

Does not replace project policy or a named orch (`ws-spec-to-pr*` wins routing). This section owns **Code review proof**. Opt out: `stop ws-senior-developer` (or unset `rules.seniorDeveloper` in a consumer).

1. Unasked extras: present via `user-gate`; wait.
2. Reuse helpers, stdlib, project patterns before custom logic.
3. Ambiguity: options + trade-offs via `user-gate`; wait.

Trivial / single-file → skip plan ceremony. Multi-file or multi-modification free-text → confirm a plan (`{plansDir}`). Implement the smallest change that satisfies that plan. Report a blocker; do not invent unconfigured commands.

**Code review proof** (before branch / PR handoff): run non-empty `config.json.verification` aliases and cite exit codes; run configured secrets checking; assess docs / spec-index; review changed scope only; verify self-learning reflection (if $\ge 2$ tool/test/build failures occurred, `Learning: N/A` is forbidden and a memory trap must be recorded); report evidence, risks, blockers. Use configured aliases; do not hardcode consumer commands.

### 3. Investigate loop (`ws-fable-method`)

Follow literally. Do not print step headers unless asked. Orch or confirmed senior plan → no competing Plan-First. Fable Verify does not replace §2 proof. Recurring domain → load live `ws-fable-domain` only when asked.

**Triviality** (all): 1 file · <10 lines · no new behavior/architecture · solution known without search → change → one verify → 1–2 sentence report. Else full loop. Unlearned technique → lookup budget first. Inference only → say so.

```
ask → 0 Classify → 1 Done → 2 Evidence → 3 Decide → 4 Act → 5 Verify → 6 Report
```

| Step | Done when |
|------|-----------|
| **0** | Question (findings + 1 rec, no edits) · Task (verified change) · Plan-First (plan + named checks, **STOP**). Tie-break: plan-first. |
| **1** | 1–2 sentences + named check (test/build/log cite). |
| **2** | Orient (glob) → primary sources → parallel lookups; max **2** rounds then state gaps. |
| **3** | One primary recommendation + surgical blast radius. |
| **4** | Surgical edits; stop after 3 failed verify retries. |
| **5** | Observed re-run / diff; `git diff` matches scope. |
| **6** | Outcome first → evidence → honest caveats. |

Subcommands: default = full loop; `plan` = 0–3 then STOP; `audit` = live `ws-fable-judge` only when asked; `report` = outcome-first with caveats.

### 4. Reply shape (`ws-tdah`)

Action-first. Apply implicitly; do not lecture. Shape: `[next action]. [state]. [numbered steps]. [one next step].`

1. Lead — first line = next action
2. Number — multi-step as `1.` `2.` `3.`
3. State — one line: done / blocked / remaining
4. Close — one concrete next step
5. Estimate — minutes when timing matters
6. Win — name completed outcomes (`Done: X`)
7. Error — cause → fix
8. Lists — max 5 items; else top 5 + "N more on request"
9. Compress — filler, hedging, preamble, recap, closers, tangents out; fragments OK

Judgment: outcome > polish; challenge weak plans; no silent guessing; verify risky facts with tools; "I don't know" over fake certainty.

Style: no em dash or `--` in conversational replies; match user language; "X or Y?" → recommend with reason. Auto-Clarity (full sentences) for security, irreversible confirms, or ambiguity that risks a wrong action. Code / commits / PRs: normal prose. Skill bodies / gates / banners: en-us.

Opt-out: `stop ws-tdah` / `stop verbosity` / `normal mode` (retired `stop ws-gabarito`). Re-enable: `/ws-tdah` · `/tdah` · `start ws-tdah`.

### 5. Memory + changelog (`ws-self-learning`, `ws-changelog`)

MEMORY = anti-regression (input + output). Changelog = append-only history, not MEMORY.

**Before** plan/code/fix (skip pure Q&A): 3–8 keywords + touched file paths → [`tools.md`](.agents/skills/ws-shared/tools.md) **`read-memory`** (when `enableSpecMemoIntegration`: MCP/CLI `bootstrap`/`search`; when `enableMemoryFiles`: `Grep` / `Read` `{sharedDir}/MEMORY.md` or `node .agents/skills/ws-self-learning/scripts/self_learning.cjs --match-paths <files>`; dual → vault first then local) → fold Medium+ **DO NOT** / **INSTEAD DO**.

**After** mutating work (required `Learning:` line):
- **Failure Reflection**: If $\ge 2$ tool/test/build failures occurred before passing, `Learning: N/A` is strictly **forbidden**. Persist Root Cause & Trap via **`update-memory`** (local `memory/YYYY-MM-DD-[slug].md` + compile and/or vault `upsert --kind trap`).
- **Fix-PR round**: After each `ws-goal-fix-pr` / `ws-fix-pr` round, if a reviewer or CI thread was a real agent mistake (score 6–10 or a `diff-regression` we fixed), persist via **`update-memory`**. `Learning: N/A` is forbidden for those defects. Skip writes in `dry-run`.
- **Adversarial Reflection**: If `ws-fable-judge` audit yields `REFUTED` or `CAVEATS`, record mandatory High/Critical entry via **`update-memory`** (local body may say `Severity: High`; vault MCP frontmatter must use `severity: "high"` \| `"critical"` lowercase).
- **Standard work**: new trap → **`update-memory`** (local file then `node .agents/skills/ws-self-learning/scripts/self_learning.cjs --compile` when files enabled — compile only after the file is on disk, not in the same parallel tool batch as Write; vault upsert when integration enabled). No trap & $<2$ failures → `Learning: N/A (standard implementation)` or `Learning: N/A (no new project knowledge)`.
- `MEMORY.md` conflict (files backend): re-run `--compile`; do not resolve by hand.

Entry shape: `### [YYYY-MM-DD] [Topic]` plus Layer, Module, Severity, PathPattern, Scenario / Context, DO NOT, INSTEAD DO.

Then changelog (`config.json` → `rules.changelogFile`, else `{sharedDir}/CHANGELOG.md`), insert under `# Changelog`:

```markdown
### [YYYY-MM-DD HH:MM] Agent: {agent/runtime}
- **Prompt**: …
- **Done**: …
- **Result**: …
```

Do not re-read or rewrite past changelog entries.

#### spec-memo MCP + hooks (this repo dogfood)

Optional external vault ([spec-memo](https://github.com/jpolvora/spec-memo)) and configurable memory routing (`enableMemoryFiles` and `enableSpecMemoIntegration`). Default is `enableMemoryFiles: true, enableSpecMemoIntegration: false` (in-repo MEMORY/changelog) unless `enableSpecMemoIntegration` or legacy `specMemo.enabled` is explicit `true`.

| Piece | Use |
|-------|-----|
| **MCP** | When the host exposes namespace `spec-memo`, `user-spec-memo`, or `specMemo.mcpServerName`, prefer those tools. Discover schema before invoke. Core tools: `bootstrap`, `search`, `get`, `upsert`, `append`, `forget`, `gc`, `promote`. Do **not** invent a ninth MCP tool. Host snippet: [`.agents/skills/ws-spec-memo/references/MCP-TEMPLATE.json`](.agents/skills/ws-spec-memo/references/MCP-TEMPLATE.json) (stdio `{cli} serve`). |
| **Runtime skill** | Load **`ws-memo`** from `{globalSkillsRoot}/ws-memo/SKILL.md` (shipped by spec-memo; install/copy into global or project `{skillsRoot}` — not authored under this package). Prefer MCP; CLI (`memo` / `npx -y spec-memo`) for extras. |
| **Setup/bridge** | **`ws-spec-memo`** only: `enableMemoryFiles`, `enableSpecMemoIntegration`, `specMemo.*`, import, dual-mode fallback, check/bootstrap/disable. Map: [`ws-spec-memo/references/INTEGRATION.md`](.agents/skills/ws-spec-memo/references/INTEGRATION.md). |
| **Write-block hook** | CLI-only: `memo hook install [--productRoot {repo}]` (blocks committing vault residue / workflow scratch). Bypass: `SKIP_MEMO_HOOK=1`. Setup interview may offer this via `ws-spec-memo`; do not invent a custom hook script. |

When spec-memo integration is on: session consult → MCP `bootstrap` (or `memo bootstrap`); new traps → `upsert`; task log → `append`; follow [`tools.md`](.agents/skills/ws-shared/tools.md) `read-memory` / `update-memory` vault reroutes. Dual mode persists to both local files and vault.

### 6. Write a spec (on demand)

When the user asks to draft a spec or reformulate a tracker issue. Do not load live `ws-write-spec` / `ws-spec-format` unless authoring those skills.

Write `{specsDir}/{slug}.spec.md` (`plans.specsDir`, default `.agents/specs`). Create `{specsDir}` if missing. Do **not** create `{plansDir}/{slug}/` or `step-00-*.spec.md`. Lookup codebase, `{sharedDir}/MEMORY.md`, and the stack file **before** any `user-gate`. Include `## Out of Scope`, `## Assumptions & Open Questions`, `## Definition of Ready (DoR)`, `## Validation & Observation Notes`, and `## Negative & Failing Test Scenarios`. Run `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` and do not finish while non-zero. Gray area with ≥2 product options → `{specsDir}/{slug}.context.md` (never empty). When derived from a **public** tracker issue, reformulate into explicit, testable agentic ACs and keep human wording in `## Original Issue Context` (`source: github` | `source: azure-devops`). Private consumer pastes: paraphrase that section with generic examples. For free-text: `source: local`, `id: null`. After a **standalone** user invoke (not orch Step 0), present `user-gate`: **Add to index.PRD (Recommended)** / **Skip tracking**. On Add, load `ws-spec-index` `track {slug}` (Feature map `[ ]` + Next-specs only). Cancel → STOP; never infer yes. Optional `--register` / orch (skip register when authoring validation fails):

```bash
python .agents/skills/ws-local-spec-provider/scripts/register_local_spec.py \
  --input "{specsDir}/{slug}.spec.md"
```

Use `--force` only when overwriting a differing plan copy. Handoff: `{specsDir}` path (and `step-00` path only if register ran).

Frontmatter: `id: {n}|null`, `slug`, `title`, `source: {local|github|azure-devops}`, `specDate`. Body: Description, testable one-line ACs, Out of Scope, Assumptions, Definition of Ready, Validation & Observation Notes, Negative & Failing Test Scenarios, `## Original Issue Context` (for tracker issues), Notes as needed. Every stated requirement → ≥1 AC or explicit out-of-scope. Downstream orch reads `{us-dir}/step-00-*.spec.md` after register, never live tracker APIs.


---

## Skill loading (mandatory)

**Session start:** this file is the hub. Apply § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only) before acting on the first prompt. Do **not** `Read` live `ws-tdah` / `ws-karpathy-guidelines` / `ws-senior-developer` / `ws-fable-method` / `ws-self-learning` / `ws-changelog` / `ws-write-spec` / `ws-spec-format` SKILL.md for session autoload. Do not `Read` a separate harness skill.

[`ws-shared/autoload.md`](.agents/skills/ws-shared/autoload.md) still owns **specs vocabulary**, **specs skill router**, and **hub contracts** (SCM parity, verify score). Load those sections when the user mentions specs / plans / Spec-to-PR / SCM intents / verify score without naming a skill. Do **not** follow `autoload.md` § Always-applied in this repo (those rows point at live `ws-*` bodies).

The table below is the root-hub set that always loads in **this** repo.

| Item | Path | Trigger |
|------|------|---------|
| Upstream session contract | This file § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only) | Every prompt — compact dogfood snapshot (**this repo only; not a skill**) |
| `using-superpowers` | `(global)` | Session start — skill discovery |

**Upstream dogfood (this repo only):** Apply the inlined contract above. Consumers still load installed `ws-*` skills from their hub (`ws-shared` keeps `ws-tdah` / `ws-senior-developer` on-demand). Load a live `ws-*` body here only when needed: **author / test that id** → `$PWD/.agents/skills/ws-*`; **otherwise invoke** `{globalSkillsRoot}/ws-*` when that install exists (see § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory)).

### Progressive disclosure (load on demand)

Only the sets above load unconditionally. Everything else is **pull, not push** — resolve one route, then read only that `SKILL.md`.

| Situation | Do this |
|-----------|---------|
| Session start | This file (including § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only)). Nothing else. Do not load `autoload.md` § Always-applied. |
| Task with a clear intent | Match one row in § [Task router](#task-router) → load that single skill (or use § [6. Write a spec](#6-write-a-spec-on-demand)). Do not preload sibling or downstream skills. Duplicate `ws-*` paths: § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory). |
| Spec / plan / `index.PRD` / Spec-to-PR wording without a named skill | Load [`autoload.md`](.agents/skills/ws-shared/autoload.md) § Specs vocabulary + § Specs skill router (or § Keyword → skill) → load **only** the matching skill, except standalone draft-spec uses § [6. Write a spec](#6-write-a-spec-on-demand). Never load the whole specs family. |
| SCM / verify-score wording without a named skill | Load [`autoload.md`](.agents/skills/ws-shared/autoload.md) § Hub contracts → then that hub file or one skill. |
| Orchestrated run (`ws-spec-to-pr` / lite / `ws-multi-spec`) | The orchestrator owns loading. Load step skills via its dispatch table, one step at a time. |
| Need config, tokens, or gate wording | Read `{sharedDir}/config.json` (shape: [`config.json.example`](.agents/skills/ws-shared/config.json.example)) + [`tools.md`](.agents/skills/ws-shared/tools.md) / [`gates.md`](.agents/skills/ws-shared/gates.md) — not a skill body. |
| spec-memo / vault / memo MCP / write-block hook | § [5. Memory + changelog](#5-memory--changelog-ws-self-learning-ws-changelog) (MCP + hooks). Setup → `ws-spec-memo`. Runtime → `{globalSkillsRoot}/ws-memo` (or project `{skillsRoot}/ws-memo`). Do not vendor `SURFACE.md` into this repo. |
| Check-implementation / verify score / `scoreAndRefine` | Orchestrated: Step 5 via orch dispatch (`ws-verify-plan` only). Standalone: `ws-verify-plan`. Gate copy: `{sharedDir}/gates.md`. Advance only at `defaults.minVerifyScore` (default 9); do not load `ws-implement-tasks` until scoreAndRefine says to. |
| SCM intents / GitHub vs Azure parity / `scm-provider-contract` | Read [`scm-provider-contract.md`](.agents/skills/ws-shared/scm-provider-contract.md). Load **one** provider `SKILL.md` when executing that SCM. Do not load both provider bodies to compare intents. |
| A skill names a companion file (`PHASES.md`, `STEP-DISPATCH.md`, `FORMAT.md`, `scm-provider-contract.md`, …) | Read it **when that skill says to**, not upfront. |
| No route matches | Ask via `user-gate` (or `find-skills` / `using-superpowers` to discover) instead of loading the catalog. |

**Anti-patterns:** loading [`CATALOG.md`](CATALOG.md) rows as a batch · reading every `ws-spec-*` body to decide which applies · loading both `ws-github-provider` and `ws-azure-devops-provider` SKILL.md to compare intents (use `scm-provider-contract.md`) · loading `ws-check-harness` / `ws-check-workflows` before a change exists to audit · re-reading a skill already loaded this session · `Read`ing both copies of a duplicate `ws-*` id · editing `{globalSkillsRoot}/ws-*` from this package root.

### Dual-hub precedence (root override)

This **root** hub applies § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only) instead of live `ws-tdah` / `ws-senior-developer` SKILL.md. The installed **ws-shared** hub ([`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md)) still treats those packaged skills as **on-demand** by default (`ws-tdah` via invoke; `ws-senior-developer` via `rules.seniorDeveloper`).

Consumers may add their own root `AGENTS.md` with the same override pattern. When root and ws-shared hubs both load, **root hub** skill-loading and precedence sections win for autoload decisions. This is intentional — not a harness drift defect. See ws-shared § Consumer root override.

### Precedence (highest first)

1. Explicit user instructions (current turn)
2. This root `AGENTS.md` when present (skill loading + precedence — overrides ws-shared opt-in defaults; see § Dual-hub precedence)
3. Design / spec / architecture constraints
4. Surgical scope (§ [1. Surgical scope](#1-surgical-scope-ws-karpathy-guidelines); live `ws-karpathy-guidelines` only when authoring that skill)
5. Delivery gate (§ [2. Delivery gate](#2-delivery-gate-ws-senior-developer); opt out `stop ws-senior-developer`)
6. Investigate loop (§ [3. Investigate loop](#3-investigate-loop-ws-fable-method); defer Plan-First when orch owns session or senior plan already confirmed)
7. Reply shape (§ [4. Reply shape](#4-reply-shape-ws-tdah); opt out `stop ws-tdah` / `stop verbosity` / `normal mode`)

### Opt-out

| Phrase | Effect |
|--------|--------|
| `stop ws-tdah` / `stop verbosity` / `normal mode` | Disable ws-tdah |
| `stop ws-gabarito` / `sem ws-gabarito` | Same disable (retired alias) |
| `stop ws-senior-developer` | Disable ws-senior-developer when autoloaded |
| `/ws-tdah` · `/tdah` · `start ws-tdah` · `start ws-gabarito` | Activate (single default mode) |

---

## Harness change protocol

On changes under `.agents/skills/ws-*`, this file, `README.md`, or `docs/`:

1. **Mandatory Website & Documentation Update Rule:** Whenever any feature, capability, CLI option, workflow, or skill is added, changed, updated, or removed, agents **MUST** update and describe the change across:
   - `docs/index.html` (rebuild catalog via `node bin/build-site.js` / `npm run build-site:bump`, and update website feature cards/install sections/FAQ as applicable).
   - `README.md` (update human install/usage narrative, CLI flags, and feature options).
   - Root `AGENTS.md` and [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) (keep skill indexes, task routers, autoload set, and CLI documentation in sync).
   - [`FEATURES.md`](FEATURES.md) when `tracking.featuresMdEnabled` is not `false` (feature inventory — optional via `{sharedDir}/config.json`; upstream dogfood keeps it on).
2. Evaluate: **ws-check-harness** (Phases 0–5c → plan) · site rebuild · `README.md` if install/usage/human docs changed. For PRs that ship package changes, follow [`CATALOG.md`](CATALOG.md) § Upstream developer workflow (dependency graph, integrity, version/catalog, hub drift).
3. If hashed install content changed, regenerate integrity in the same commit (`npm run generate-integrity` + `npm run verify-integrity`) — [`CATALOG.md`](CATALOG.md) § Before ship PR step 7.

---

## Skill catalog (layers)

On demand: [`CATALOG.md`](CATALOG.md). Package membership: [`bin/skill-dependencies.json`](bin/skill-dependencies.json). Do not preload every prompt.

---

## Task router

Intent → skill: [`CATALOG.md`](CATALOG.md) § Task router (includes `ws-spec-explain` / `ws-spec-archive` / `ws-cleanup` / `ws-spec-memo`). Vault runtime ops after setup → `ws-memo` (spec-memo package / `{globalSkillsRoot}`). Specs keywords: [`autoload.md`](.agents/skills/ws-shared/autoload.md). Standalone write-spec: § [6. Write a spec](#6-write-a-spec-on-demand).

## Verification (before claim complete / commit)

Full ordered checklist (harness → tests → deps → integrity → workflows → site → FEATURES): [`CATALOG.md`](CATALOG.md) § Upstream developer workflow. Integrity regenerate obligation stays in that section and § [Harness change protocol](#harness-change-protocol).
---

## Local dry-run: agentic code reviewers

See [`CATALOG.md`](CATALOG.md) § Local dry-run.

## External dependencies

Resolve in order (first match). Read paths from project `{sharedDir}/config.json` when present. Do not assume host-private rule folders.

| Dependency | Resolve (first match) |
|------------|------------------------|
| `senior-developer` | **This repo:** § [2. Delivery gate](#2-delivery-gate-ws-senior-developer). **Consumers:** `config.json` → `rules.seniorDeveloper` (default `.agents/skills/ws-senior-developer/SKILL.md`; set `""` to disable) → local skill (`senior-developer/SKILL.md`) → global/user skill |
| `ws-karpathy-guidelines` | **This repo:** § [1. Surgical scope](#1-surgical-scope-ws-karpathy-guidelines). **Consumers:** `config.json` → `rules.karpathyGuidelines` → shipped `.agents/skills/ws-karpathy-guidelines/SKILL.md` → global skill |
| Stack companion | `config.json` → `rules.stackFile` (default `.agents/skills/ws-shared/STACK.md`) — consumer-owned under `ws-shared/`; do not require repo-root `STACK.md` |
| Changelog file | `config.json` → `rules.changelogFile` (default `.agents/skills/ws-shared/CHANGELOG.md`) — create under that path only; repo-root `CHANGELOG.md` only if explicitly configured |
| Domain glossary | `config.json` → `domain.glossaryFile` (often `CONTEXT.md`) — consumer root, optional |
| Optional consumer rules | Other `config.json` `rules.*` paths when set (e.g. `rules.efMigrations`, `rules.viewPatterns`) — do not invent filenames; prefer skills over host-private rule files |
| Domain catalog | `specs/domains/` — consumer; starter [`specs/domains/index.md.example`](specs/domains/index.md.example) |
| Workflow artifacts | `config.json` → `plans.dir` (token `{plansDir}`; default `.agents/plans`) · `plans.specsDir` (token `{specsDir}`; default `.agents/specs`; prefer existing repo-root `specs/`) · optional `reviews.dir` (token `{reviewsDir}`; default `.agents/codereviews`) |

Packaged consumer mirror: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) § External dependencies · bootstrap notes in [`ws-shared/setup.md`](.agents/skills/ws-shared/setup.md).

### Code review proof

**This repo:** § [2. Delivery gate](#2-delivery-gate-ws-senior-developer) (do not load live `ws-senior-developer/SKILL.md` for session proof). **Consumers:** use the resolved `rules.seniorDeveloper` checklist — do not paste it into hubs.
