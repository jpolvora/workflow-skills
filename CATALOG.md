# CATALOG.md — Skill inventory (on demand)

**Audience: agents.** Load this file when you need the full skill inventory or intent→skill router tables. Do **not** load it every prompt. Root `AGENTS.md` keeps progressive-disclosure rules; this companion holds the indexes.

Path tokens: expand via `.agents/skills/ws-shared/tools.md` before tool calls.

## Skill catalog (layers)

> **Scope note:** Full upstream inventory. Membership is [`bin/skill-dependencies.json`](bin/skill-dependencies.json) (`workflows` = 43, `extra` = 7). Extra rows are absent from Workflows-only installs. Consumer routes: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md).
>
> **Do not load this catalog as a work list** — it is an index. Load skills per root `AGENTS.md` § Progressive disclosure.

### Layer 0 — Harness

| Skill | Path | Description |
|-------|------|-------------|
| `ws-check-harness` | `.agents/skills/ws-check-harness/SKILL.md` | Harness integrity audit |
| `ws-check-workflows` | `.agents/skills/ws-check-workflows/SKILL.md` | Deep workflow simulation & validation |
| `ws-doctor` | `.agents/skills/ws-doctor/SKILL.md` | Install & runtime diagnostics |
| `ws-write-a-skill` | `.agents/skills/ws-write-a-skill/SKILL.md` | Create/edit/optimize skills (Extra) |
| `ws-show-harness` | `.agents/skills/ws-show-harness/SKILL.md` | Session harness snapshot (Extra) |
| `ws-preview` | `.agents/skills/ws-preview/SKILL.md` | Pipeline review dry-run via external reviewer (Extra) |
| `ws-run-benchmark` | `.agents/skills/ws-run-benchmark/SKILL.md` | Upstream-only fixture compare (Extra; never spec-to-pr) |
| `using-superpowers` | `(global)` | Skill discovery |

### Layer 1 — Engineering standards

| Skill | Path | Description |
|-------|------|-------------|
| `ws-senior-developer` | `.agents/skills/ws-senior-developer/SKILL.md` | Optional engineering-delivery gate and Code review proof source |

### Layer 2 — Pipeline + providers

| Step | Skill | Path |
|------|-------|------|
| 00 | `ws-write-spec` | `.agents/skills/ws-write-spec/SKILL.md` |
| 01 | `ws-write-plan` | `.agents/skills/ws-write-plan/SKILL.md` |
| 02 | `ws-interview` | `.agents/skills/ws-interview/SKILL.md` |
| 03 | `ws-plan-to-tasks` | `.agents/skills/ws-plan-to-tasks/SKILL.md` |
| 04 | `ws-implement-tasks` | `.agents/skills/ws-implement-tasks/SKILL.md` |
| 05 | `ws-verify-plan` | `.agents/skills/ws-verify-plan/SKILL.md` |
| 06 | `ws-code-review` | `.agents/skills/ws-code-review/SKILL.md` |
| 07 | `ws-testing` | `.agents/skills/ws-testing/SKILL.md` |
| 08 | `ws-ship-pr` | `.agents/skills/ws-ship-pr/SKILL.md` |
| 09 | `ws-fix-pr` | `.agents/skills/ws-fix-pr/SKILL.md` |
| — | `ws-goal-fix-pr` | `.agents/skills/ws-goal-fix-pr/SKILL.md` |
| Post | `ws-update-plan-implementation` | `.agents/skills/ws-update-plan-implementation/SKILL.md` (Extra) |
| — | `ws-github-provider` | `.agents/skills/ws-github-provider/SKILL.md` |
| — | `ws-azure-devops-provider` | `.agents/skills/ws-azure-devops-provider/SKILL.md` |
| — | `ws-local-spec-provider` | `.agents/skills/ws-local-spec-provider/SKILL.md` |

### Layer 3 — Discovery (reserved)

Install via `using-superpowers` / `find-skills` until routed here.

### Layer 4 — Review & audit

| Skill | Path | Description |
|-------|------|-------------|
| `ws-secrets-leak-review` | `.agents/skills/ws-secrets-leak-review/SKILL.md` | Secrets and PII leak scan with optional hook |
| `ws-fable-judge` | `.agents/skills/ws-fable-judge/SKILL.md` | Adversarial audit, fraud detection & diff verification |

### Layer 5 — Utility & meta

| Skill | Path | Notes |
|-------|------|-------|
| `ws-tdah` | `.agents/skills/ws-tdah/SKILL.md` | Action-first reply shape |
| `ws-karpathy-guidelines` | `.agents/skills/ws-karpathy-guidelines/SKILL.md` | Micro diff hygiene |
| `ws-spec-to-pr` | `.agents/skills/ws-spec-to-pr/SKILL.md` | Spec-to-PR (steps 0–9) |
| `ws-spec-to-pr-lite` | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Fast Spec-to-PR (steps 0–5) |
| `ws-multi-spec` | `.agents/skills/ws-multi-spec/SKILL.md` | Batch multi-spec delivery |
| `ws-fable-method` | `.agents/skills/ws-fable-method/SKILL.md` | 7-step problem-solving loop |
| `ws-fable-domain` | `.agents/skills/ws-fable-domain/SKILL.md` | Domain adapter generator & schemas (Extra) |
| `ws-spec-format` | `.agents/skills/ws-spec-format/SKILL.md` | Canonical spec schema |
| `ws-classify-complexity` | `.agents/skills/ws-classify-complexity/SKILL.md` | Pipeline lite vs standard classifier |
| `ws-self-learning` | `.agents/skills/ws-self-learning/SKILL.md` | Anti-regression memory engine |
| `ws-changelog` | `.agents/skills/ws-changelog/SKILL.md` | Append-only task history |
| `ws-configure-project` | `.agents/skills/ws-configure-project/SKILL.md` | Interactive config.json wizard |
| `ws-goal-loop` | `.agents/skills/ws-goal-loop/SKILL.md` | Convergence loop primitive |
| `ws-spec-index` | `.agents/skills/ws-spec-index/SKILL.md` | Project spec index init/sync/promote |
| `ws-spec-list` | `.agents/skills/ws-spec-list/SKILL.md` | Dual board: specs vs plans + menu |
| `ws-spec-from-provider` | `.agents/skills/ws-spec-from-provider/SKILL.md` | Bulk-import GH/ADO issues → specs |
| `ws-activity-report` | `.agents/skills/ws-activity-report/SKILL.md` | Timesheet entries for delivery (Extra) |
| `ws-pre-daily` | `.agents/skills/ws-pre-daily/SKILL.md` | 36-hour standup briefing |
| `ws-spec-explain` | `.agents/skills/ws-spec-explain/SKILL.md` | Status and delivery panorama |
| `ws-spec-archive` | `.agents/skills/ws-spec-archive/SKILL.md` | Harvest plan history into index.PRD |
| `ws-cleanup` | `.agents/skills/ws-cleanup/SKILL.md` | Workflow leftover cleanup |
| `ws-sync-spec` | `.agents/skills/ws-sync-spec/SKILL.md` | Auto-update specs after code changes |
| `ws-spec-memo` | `.agents/skills/ws-spec-memo/SKILL.md` | Harness ↔ spec-memo **bridge** only (`config.json`, import, hybrid fallback); runtime vault ops → `ws-memo` |
| `ws-spec-organizer` | `.agents/skills/ws-spec-organizer/SKILL.md` | Spec path resolution & NNNN organizer |
| `ws-task-lifecycle` | `.agents/skills/ws-task-lifecycle/SKILL.md` | Prompt-driven task tracking |
| `grill-with-docs` | `(global)` | Docs grill |
| `find-skills` | via `using-superpowers` | Discover/install |

---

## Task router

| Intent | Load |
|--------|------|
| Write a spec | This file § [6. Write a spec](#6-write-a-spec-on-demand) (live `ws-write-spec` only when authoring that skill) |
| Classify spec pipeline complexity | `ws-classify-complexity` |
| Plan implementation | `ws-write-plan` → `ws-interview` → `ws-plan-to-tasks` |
| Implement | `ws-implement-tasks` |
| Engineering delivery gate / Code review proof | This file § [2. Delivery gate](#2-delivery-gate-ws-senior-developer) (live `ws-senior-developer` only when authoring that skill) |
| Verify / check-implementation / verify score | `ws-verify-plan` (advance at `defaults.minVerifyScore` (default 9); `scoreAndRefine` below) |
| SCM intent contract / GitHub vs Azure parity | [`scm-provider-contract.md`](.agents/skills/ws-shared/scm-provider-contract.md) — then one provider skill |
| Local code review | `ws-code-review` |
| Secrets / leaks | `ws-secrets-leak-review` |
| Adversarial audit / fraud scan | `ws-fable-judge` |
| Fable Method 7-step loop | This file § [3. Investigate loop](#3-investigate-loop-ws-fable-method) (live `ws-fable-method` only when authoring that skill) |
| Domain adapters (DevOps/Data/Research) | `ws-fable-domain` (Extra) |
| Standup briefing (last 36 hours) | `ws-pre-daily` |
| Explain spec / US status & delivery panorama | `ws-spec-explain` |
| Archive plan history into `index.PRD` / clean shipped plan dirs | `ws-spec-archive` |
| Clean workflow leftovers / shipped plan dirs | `ws-cleanup` |
| Testing pre-PR | `ws-testing` |
| Fix PR threads | `ws-fix-pr` / `ws-goal-fix-pr` |
| Ship PR | `ws-ship-pr` |
| Spec → PR E2E | `ws-spec-to-pr` |
| Spec → PR lite | `ws-spec-to-pr-lite` |
| Prompt-driven implementation (not Spec-to-PR) | `ws-task-lifecycle` |
| Batch spec delivery | `ws-multi-spec` |
| Project spec index init/sync/promote | `ws-spec-index` |
| List / manage specs vs plan workflows (dual board + menu) | `ws-spec-list` |
| Bulk-import GH issues / ADO US → local specs | `ws-spec-from-provider` |
| Session autoload set (which skills load every prompt) | This repo: § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only). Consumers: [`{sharedDir}/autoload.md`](.agents/skills/ws-shared/autoload.md) § Always-applied |
| Specs keywords / which skill to invoke | [`{sharedDir}/autoload.md`](.agents/skills/ws-shared/autoload.md) § Specs skill router |
| Dev commands (deps, tests, local install, integrity, site) | § [Development commands](#development-commands-this-repo) |
| Local code review / audits | § [Review & audit commands](#review--audit-commands) |
| Auto-update feature specs after code changes | `ws-sync-spec` |
| Resolve spec path / organize board specs | `ws-spec-organizer` |
| spec-memo vault setup/bridge / import MEMORY / hybrid fallback | `ws-spec-memo` |
| Runtime spec-memo vault ops (search, upsert, bootstrap, canvas, doctor) | `ws-memo` |
| Prompt/session tracking / vault activity (MCP prompt) | `ws-session-tracking` |
| Spec-to-PR plan-folder timesheet for a civil day | `ws-activity-report` (Extra) |
| GitHub issue/PR ops | `ws-github-provider` |
| ADO WI/PR ops | `ws-azure-devops-provider` |
| Local `*.spec.md` | `ws-local-spec-provider` |
| Format/review spec | `ws-spec-format` |
| New skill / skill rewrite | `ws-write-a-skill` |
| Show active harness | `ws-show-harness` |
| Pipeline review / preview CI review | `ws-preview` |
| Upstream package-version fixture compare (never spec-to-pr) | `ws-run-benchmark` |
| Audit harness | `ws-check-harness` |
| Diagnose skills / doctor the harness | `ws-doctor` |
| Check workflows | `ws-check-workflows` |
| Grill plan vs docs | `grill-with-docs` |
| Record learning | This file § [5. Memory + changelog](#5-memory--changelog-ws-self-learning-ws-changelog) (live `ws-self-learning` only when authoring that skill) |
| Convergence loop | `ws-goal-loop` |
| Record ws-changelog | This file § [5. Memory + changelog](#5-memory--changelog-ws-self-learning-ws-changelog) (live `ws-changelog` only when authoring that skill) |
| Fill / update `config.json` | `ws-configure-project` |
| Discover/install skills | `find-skills` or `using-superpowers` |

---

### Upstream developer workflow (this repo only)

**Local project rule** for agents in `jpolvora/workflow-skills`. Consumers dogfood the same skills via install but follow [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) — not this section.

#### Skill tree (authoritative source)

- **Develop and test** under **`.agents/skills/ws-*`** — pipeline, providers, utilities, and hub templates shipped with skills. This is the **only** upstream skill-content SoT (see § [Skill SoT, install scopes & config override](#skill-sot-install-scopes--config-override-mandatory)). Host-listed `{globalSkillsRoot}/ws-*` duplicates: § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory) (default invoke global; edit local only).
- **Consumer hub data** under **`.agents/skills/ws-shared/`** in this repo (`config.json`, MEMORY, STACK, memory, installed-skills) stays local/temp consumer-style data — never published as skill SoT.
- **Package and publish** from `.agents/skills/ws-*` via the installer/CLI (`bin/cli.js`, `bin/skill-dependencies.json`, `bin/skill-integrity.json`) into consumer **project-local** (`.agents/skills`) or **global** (`$HOME/.agents/skills`) installs.
- **Lasting changes** belong in upstream PRs (`develop` → `main`); consumer copies are managed and overwritten on `update` (project `ws-shared` consumer data preserved).

#### Skill authoring contract

| Topic | Canonical doc |
|-------|----------------|
| Skill design, pruning & protocol rules (mandatory) | [`SKILL_AUTHORING.md`](.agents/skills/ws-write-a-skill/SKILL_AUTHORING.md) |
| Portability, language, folder naming | This file § [Portability & harness neutrality](#portability--harness-neutrality-mandatory) |
| Script launchers (`python` / `node` / `bash`) | [`ws-shared/tools.md`](.agents/skills/ws-shared/tools.md) § Script launchers |
| New or rewritten skills (markdown + scripts) | [`ws-write-a-skill`](.agents/skills/ws-write-a-skill/SKILL.md) |
| Spec shape / review | [`ws-spec-format`](.agents/skills/ws-spec-format/SKILL.md) |

Managed script calls use explicit launchers; do not rewrite skill scripts for shell quirks in consumer trees — fix upstream.

#### Development commands (this repo)

**Dependencies:** none to install. `package.json` declares no `dependencies` / `devDependencies`, so the toolchain is Node.js (ESM, `"type": "module"`) plus `npm`; `npm install` is optional and only writes a lockfile. Tests and scripts run straight from a fresh clone.

| Task | Command |
|------|---------|
| Install dependencies | Not required — see above. Run `node -v` to confirm Node is on PATH. |
| Full test suite | `npm run test` (alias `npm run tests`; `pretests` runs `npm pack` first, so it exercises the real tarball) |
| Harness efficiency suite | `npm run tests:harness-efficiency` |
| Same suite against the remote installer | `npm run tests:remote` |
| CLI surface / flags | `node bin/cli.js --help` |
| Local install dry run | `cd <scratch-dir> && node <repo>/bin/cli.js install --package workflows --yes --project` |
| Local update / uninstall | `node <repo>/bin/cli.js update` · `node <repo>/bin/cli.js uninstall --skills <csv> --yes` |
| Global-scope variants | add `--global` / `-g` (project scope is `--project` / `-p`; global root override `WORKFLOW_SKILLS_GLOBAL_DIR`) |
| Integrity digests | `npm run generate-integrity` then `npm run verify-integrity` (must exit 0) |
| Catalog / site | `node bin/build-site.js` (catalog only) · `node bin/build-site.js --check` (read-only verification) · `npm run build-site:bump` (release bump + footer) |
| Harness benchmark (upstream package root only; never spec-to-pr) | `ws-run-benchmark` · `npm run benchmark:static` · `prepare --fixture` · `collect --sandbox` |
| Installed-skill audit | `node bin/cli.js integrity` · `node bin/cli.js --check` (version + `fullPackageDigest` vs `main`) |

**Never run install/update against this package root.** The installer writes into `.agents/skills/`, which is the upstream SoT here — it would overwrite the skills you are authoring. Always target a scratch directory (or the trees under `test/`), and prefer local `node bin/cli.js` / `./install-skills.sh` over remote `npx` (§ [Consumer CLI](#consumer-cli-install--update--uninstall)).

#### Review & audit commands

| Review | How |
|--------|-----|
| Local code review of the working branch | `ws-code-review` skill → `/code-review [base=<ref>] [plan=<plan-path>]`; reviews committed `{base}...HEAD`; runs fix → re-review rounds (max 3) and writes `{us-dir}/step-06-{slug}.review.md` |
| Harness integrity | `ws-check-harness` (Phases 0–5c) → 0 critical |
| Workflow / FSM simulation | `ws-check-workflows`, or `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` |
| Secrets / PII scan | `ws-secrets-leak-review` |
| Adversarial audit of claimed work | `ws-fable-judge` |
| External agentic reviewer (optional) | § [Local dry-run: agentic code reviewers](#local-dry-run-agentic-code-reviewers) |
| PR review threads after ship | `ws-fix-pr` / `ws-goal-fix-pr` |

#### Recommended DX autoload (upstream dogfood)

In **this repo only**, apply § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only) every session (inlined in this file; not a `SKILL.md`). That compact snapshot covers surgical scope, delivery gate, fable loop, reply shape, memory/changelog, and on-demand write-spec so authoring does **not** `Read` live `ws-tdah` / `ws-karpathy-guidelines` / `ws-senior-developer` / `ws-fable-method` / `ws-self-learning` / `ws-changelog` / `ws-write-spec` SKILL.md at runtime.

Those live skills still ship to consumers. Consumer hubs autoload them (or keep them on-demand) from installed `.agents/skills/ws-*`. Load a live body here only when the task is to author or test that skill.

Opt-out phrases (`stop ws-tdah`, `stop ws-senior-developer`, …) are in § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only).

#### Start work

| Intent | Load |
|--------|------|
| Draft a spec | This file § [6. Write a spec](#6-write-a-spec-on-demand) → `{specsDir}/{slug}.spec.md` (not `{plansDir}`). Load live `ws-write-spec` / `ws-spec-format` only when authoring those skills. |
| Spec → PR (full) | `ws-spec-to-pr` |
| Spec → PR (fast) | `ws-spec-to-pr-lite` |
| GitHub issue → spec / fix | `ws-github-provider` `fetch-to-spec` (writes `{specsDir}` first, then registers `step-00`) or orchestrator with issue URL |
| Open PR review threads | `ws-fix-pr` / `ws-goal-fix-pr` |
| Timesheet / activity hours (Spec-to-PR plan folder) | `ws-activity-report` (Extra) |
| Vault prompt/session activity | `ws-session-tracking` |
| Explain spec / US status | `ws-spec-explain` |
| Archive plans into `index.PRD` | `ws-spec-archive` |
| Clean workflow leftovers | `ws-cleanup` |

**Spec-of-record rule:** providers and standalone write-spec land the canonical file under `{specsDir}`; workflow `step-00` is always a registered copy under `{plansDir}/{slug}/`. Re-fetch uses `--force` on the converter first when the spec of record differs, then on register when `step-00` differs.

Workflow artifacts: prefer `{specsDir}` from `config.json` → `plans.specsDir` (default `.agents/specs`; this upstream may also keep legacy repo-root `specs/`); consumers use `config.json` → `plans.dir` / `plans.specsDir`.

#### After changes (recommend / gate)

After edits under `.agents/skills/ws-*`, hubs, `docs/`, `bin/`, or installer inputs:

1. Run **`ws-check-harness`** (Phases 0–5c) — see also § [Harness change protocol](#harness-change-protocol).
2. Resolve **critical** findings before claim complete / merge.

#### Before ship PR — upstream `ws-ship-pr` mandatory gate (this repo only)

**Scope:** `jpolvora/workflow-skills` package root only — not consumer projects.  
**Trigger:** Every time an agent runs `ws-ship-pr` / `/ship-pr` here, Step 2 (Prepare to PR) **must** execute this checklist before commit, push, or PR creation. `ws-ship-pr` discovers it via root `AGENTS.md` (Prepare row 5). Any ❌ → STOP (no push/PR).

Print a board after each row (same ✅ / ❌ / ⏭ convention as [`ws-ship-pr/PREPARE-CHECKLIST.md`](.agents/skills/ws-ship-pr/PREPARE-CHECKLIST.md)).

| # | Check | Command / skill | When required |
|---|-------|-----------------|---------------|
| 1 | **Install tests** | `npm run test` (or `npm run tests` during dev) | Always — installer, integrity, tree verification |
| 2 | **Website / catalog** | `npm run build-site:bump` when shipping package content; else `node bin/build-site.js` for catalog-only | Skills/hubs/CLI/installer changed → bump + rebuild `docs/index.html`; verify no merge-conflict markers |
| 3 | **Version** | `package.json` patch bump via step 2; `bin/skill-dependencies.json` → `packageVersion` stays aligned | **CI deploy on `main` never bumps** — bump locally once per release PR before push |
| 4 | **Installer (Node CLI)** | Review/fix `bin/cli.js`, `bin/install-rules.js` | Install/update/uninstall behavior or hub paths changed |
| 5 | **Installer (npx + bash shim)** | `install-skills.sh` argv/help aligned with `bin/cli.js --help`; consumer docs in `README.md` if UX changed | Shim or npx surface changed |
| 6 | **Skill dependency graph** | `bin/skill-dependencies.json` (+ `.agents/skills/ws-shared/skill-dependencies.json` when packaged graph ships) | Skills added/removed/renamed, package membership, or orch dispatch changed |
| 7 | **Integrity digests** | `npm run generate-integrity` && `npm run verify-integrity` | Any hashed install content changed (`bin/skill-integrity.json` must exit 0 on `--check`) |
| 8 | **Harness audit** | `ws-check-harness` Phases 0–5c → 0 critical | New/changed skills, hubs, routing, links, portability, en-us; Phase 3/4b must cover new skill ids and dependency graph |
| 9 | **Workflow simulation** | `ws-check-workflows` / `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` | Orchestrator FSM, step dispatch, gates, or simulation docs changed — 0 critical |
| 10 | **Hub drift** | Sync root `AGENTS.md` + `ws-shared/AGENTS.md` (+ `ws-shared/autoload.md` when the Always-applied set or specs router changed) | Routing tables or skill index changed |
| 11 | **Human docs** | `README.md` when install/usage/safety narrative changed | Not required for skill-only doc fixes |
| 12 | **Ship** | `ws-ship-pr` / `/ship-pr` after rows 1–11 are ✅ or justified ⏭ | Commit → push → create PR |
| 13 | **Review convergence** | Wait **30s** after PR creation for code-review Action/CI to start, then `ws-goal-fix-pr` (default **300s** heartbeats per [`ws-ship-pr/GOAL-OVERRIDES.md`](.agents/skills/ws-ship-pr/GOAL-OVERRIDES.md)) until `activeThreads == 0` or escalate | Standalone ship-pr Step 6; orch Step 9 when `stopBeforeFixPr` |

**Upstream skill integrity regenerate (step 7 detail):** Hashed paths include **`.agents/skills/ws-*`** skill content, `bin/` installer inputs, and hub templates packed by the CLI. Regenerate and commit `bin/skill-integrity.json` in the **same** commit as content changes; `npm run generate-integrity` and `npm run verify-integrity` must exit 0 before ship.

**Version bump (step 3 detail):** One patch bump per release PR (`npm run build-site:bump` stamps site footer + `package.json`). Do not rely on GitHub Actions to bump — Actions deploy site on `main` only.

**Post-ship:** Do not merge while review threads are open or required checks are red. `ws-goal-fix-pr` owns the fix loop; `ws-ship-pr` merges only after convergence (unless `no-merge` / orch `stopBeforeFixPr`).

*Note:* Consumers use [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) § Recommended Feature Delivery Checklist — not this table.

---

## Local dry-run: agentic code reviewers

Upstream-only verification helper (not part of the portable skill contract). Requires the reviewer’s API key env var. Reviews `develop`…`main` (Custom stack + repo prompt). Active CI: [`.github/workflows/cursor-code-review.yml`](.github/workflows/cursor-code-review.yml) (`cursor-sdk` / `composer-2.5`). OpenCode backup [`.github/workflows/opencode-code-review.yml`](.github/workflows/opencode-code-review.yml) is `workflow_dispatch` only. See [`README.md`](README.md) for human-oriented context; Cursor dry-run:

```bash
# Download to a file first — curl|bash leaves BASH_SOURCE unbound under set -u.
curl -fsSL https://raw.githubusercontent.com/jpolvora/agentic-code-reviewers/release/run.sh \
  -o /tmp/agentic-code-reviewers-run.sh
AGENTIC_CODE_REVIEWERS_EXTRA_EXCLUDE_PATTERNS=".agents/plans/**,.agents/specs/**" \
bash /tmp/agentic-code-reviewers-run.sh \
  --dry-run \
  --gh \
  --engine cursor-sdk \
  --model composer-2.5 \
  --stack Custom \
  --custom-prompt .github/agentic-code-reviewers-prompt.md \
  --include-patterns "**/*.md,**/*.yml,**/*.yaml,**/*.json,**/*.sh,**/*.ps1,**/*.psm1,**/*.psd1,**/*.cmd,**/*.js,**/*.ts,**/*.css,**/*.html" \
  --target-branch refs/heads/main \
  --source-branch refs/heads/develop
```

---
