# CATALOG.md — Skill inventory (on demand)

**Audience: agents.** Load this file when you need the full skill inventory or intent→skill router tables. Do **not** load it every prompt. Root `AGENTS.md` keeps progressive-disclosure rules; this companion holds the indexes.

Path tokens: expand via [`tools.md`](tools.md) before tool calls.

## Skill catalog (layers)

> **Scope note:** Full inventory for this install. Membership is [`skill-dependencies.json`](skill-dependencies.json) (`workflows` = 47, `extra` = 8). Extra rows are absent from Workflows-only installs. Ids in `externalSkills` (spec-memo companions) are not packaged here. Consumer routes: [`AGENTS.md`](AGENTS.md).
>
> **Do not load this catalog as a work list** — it is an index. Load skills per [`AGENTS.md`](AGENTS.md) § Skill loading.

### Layer 0 — Harness

| Skill | Path | Description |
|-------|------|-------------|
| `ws-check-harness` | `.agents/skills/ws-check-harness/SKILL.md` | Harness integrity audit (install mode/scope aware) |
| `ws-check-workflows` | `.agents/skills/ws-check-workflows/SKILL.md` | Deep workflow simulation & validation |
| `ws-doctor` | `.agents/skills/ws-doctor/SKILL.md` | Install & runtime diagnostics |
| `ws-write-a-skill` | `.agents/skills/ws-write-a-skill/SKILL.md` | Create/edit/optimize skills (Extra) |
| `ws-show-harness` | `.agents/skills/ws-show-harness/SKILL.md` | Session harness snapshot (Extra) |
| `ws-preview` | `.agents/skills/ws-preview/SKILL.md` | Run consumer `preview.dryRunCommand` local dry-run (Extra; `/ws-configure-project --section preview`) |
| `ws-run-benchmark` | `.agents/skills/ws-run-benchmark/SKILL.md` | Upstream-only fixture compare (Extra; never spec-to-pr) |
| `ws-benchmarks` | `.agents/skills/ws-benchmarks/SKILL.md` | Benchmark management suite & evolution reporting (Extra; never spec-to-pr) |
| `using-superpowers` | `(global)` | Skill discovery |

### Layer 1 — Engineering standards

| Skill | Path | Description |
|-------|------|-------------|
| `ws-senior-developer` | `.agents/skills/ws-senior-developer/SKILL.md` | Engineering delivery gate, surgical diff hygiene, and Code review proof source |

### Layer 2 — Pipeline + providers

| Step | Skill | Path |
|------|-------|------|
| 00 | `ws-spec-write` | `.agents/skills/ws-spec-write/SKILL.md` |
| 01 | `ws-plan-write` | `.agents/skills/ws-plan-write/SKILL.md` |
| 02 | `ws-plan-interview` | `.agents/skills/ws-plan-interview/SKILL.md` |
| 03 | `ws-plan-to-tasks` | `.agents/skills/ws-plan-to-tasks/SKILL.md` |
| 04 | `ws-implement-tasks` | `.agents/skills/ws-implement-tasks/SKILL.md` |
| 05 | `ws-plan-verify` | `.agents/skills/ws-plan-verify/SKILL.md` |
| 06 | `ws-code-review` | `.agents/skills/ws-code-review/SKILL.md` |
| 07 | `ws-testing` | `.agents/skills/ws-testing/SKILL.md` |
| 08 | `ws-ship-pr` | `.agents/skills/ws-ship-pr/SKILL.md` |
| 09 | `ws-fix-pr` | `.agents/skills/ws-fix-pr/SKILL.md` |
| — | `ws-goal-fix-pr` | `.agents/skills/ws-goal-fix-pr/SKILL.md` |
| Post | `ws-plan-update` | `.agents/skills/ws-plan-update/SKILL.md` (Extra) |
| — | `ws-spec-provider-github` | `.agents/skills/ws-spec-provider-github/SKILL.md` |
| — | `ws-spec-provider-azure-devops` | `.agents/skills/ws-spec-provider-azure-devops/SKILL.md` |
| — | `ws-spec-provider-local` | `.agents/skills/ws-spec-provider-local/SKILL.md` |

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
| `ws-tdah` | `.agents/skills/ws-tdah/SKILL.md` | Action-first shape + /wait-what |
| `ws-spec-to-pr` | `.agents/skills/ws-spec-to-pr/SKILL.md` | Spec-to-PR (steps 0–9) |
| `ws-spec-to-pr-lite` | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Fast Spec-to-PR (steps 0–5) |
| `ws-spec-multi` | `.agents/skills/ws-spec-multi/SKILL.md` | Batch multi-spec delivery |
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
| `ws-megabrain` | `.agents/skills/ws-megabrain/SKILL.md` | Vibe-coding implementer + specialists |
| `ws-spec-explain` | `.agents/skills/ws-spec-explain/SKILL.md` | Status and delivery panorama |
| `ws-spec-archive` | `.agents/skills/ws-spec-archive/SKILL.md` | Harvest plan history into index.PRD |
| `ws-cleanup` | `.agents/skills/ws-cleanup/SKILL.md` | Workflow leftover cleanup |
| `ws-spec-update` | `.agents/skills/ws-spec-update/SKILL.md` | Auto-update specs after code changes |
| `ws-spec-memo` | `.agents/skills/ws-spec-memo/SKILL.md` | Harness ↔ spec-memo **bridge** only (`config.json`, import, hybrid fallback); runtime vault ops → `ws-memo` |
| `ws-spec-organizer` | `.agents/skills/ws-spec-organizer/SKILL.md` | Spec path resolution & NNNN organizer |
| `ws-spec-manager` | `.agents/skills/ws-spec-manager/SKILL.md` | Unified spec router & lifecycle manager |
| `ws-wiki` | `.agents/skills/ws-wiki/SKILL.md` | Living project feature wiki & domain knowledge base manager (init, from-code genesis, sync, sweep, Phase 2 wiki-vs-code verify and Phase 3 plan/apply) |
| `ws-task-lifecycle` | `.agents/skills/ws-task-lifecycle/SKILL.md` | Prompt-driven task tracking |
| `grill-with-docs` | `(global)` | Docs grill |
| `find-skills` | via `using-superpowers` | Discover/install |

---

## Task router

| Intent | Load |
|--------|------|
| Write a spec | `ws-spec-write` (standalone draft under `{specsDir}`; the orch registers the workflow `step-00` copy) |
| Classify spec pipeline complexity | `ws-classify-complexity` |
| Plan implementation | `ws-plan-write` → `ws-plan-interview` → `ws-plan-to-tasks` |
| Implement | `ws-implement-tasks` |
| Engineering delivery gate / Code review proof | `ws-senior-developer` (on-demand default via `rules.seniorDeveloper`; proof checklist loads from the resolved skill) |
| Verify / check-implementation / verify score | `ws-plan-verify` (advance at `defaults.minVerifyScore` (default 9); `scoreAndRefine` below) |
| SCM intent contract / GitHub vs Azure parity | [`scm-provider-contract.md`](scm-provider-contract.md) — then one provider skill |
| Local code review | `ws-code-review` |
| Secrets / leaks | `ws-secrets-leak-review` |
| Adversarial audit / fraud scan | `ws-fable-judge` |
| Fable Method 7-step loop | `ws-fable-method` (on-demand; defer when the orch owns the session) |
| Domain adapters (DevOps/Data/Research) | `ws-fable-domain` (Extra) |
| Standup briefing (last 36 hours) | `ws-pre-daily` |
| What next / vibe-coding implement / megabrain | `ws-megabrain` |
| Explain spec / US status & delivery panorama | `ws-spec-explain` |
| Archive plan history into `index.PRD` / clean shipped plan dirs | `ws-spec-archive` |
| Clean workflow leftovers / shipped plan dirs | `ws-cleanup` |
| Testing pre-PR | `ws-testing` |
| Fix PR threads | `ws-fix-pr` / `ws-goal-fix-pr` |
| Ship PR | `ws-ship-pr` |
| Spec → PR E2E | `ws-spec-to-pr` |
| Spec → PR lite | `ws-spec-to-pr-lite` |
| Prompt-driven implementation (not Spec-to-PR) | `ws-task-lifecycle` |
| Batch spec delivery | `ws-spec-multi` |
| Project spec index init/sync/promote | `ws-spec-index` |
| List / manage specs vs plan workflows (dual board + menu) | `ws-spec-list` |
| Bulk-import GH issues / ADO US → local specs | `ws-spec-from-provider` |
| Session autoload set (which skills load every prompt) | [`{skillsRoot}/ws-shared/runtime/autoload.md`](autoload.md) § Always-applied (a consumer root `AGENTS.md` may override membership) |
| Specs keywords / which skill to invoke | [`{skillsRoot}/ws-shared/runtime/autoload.md`](autoload.md) § Specs skill router |
| Package release tasks (deps, integrity, site) | Upstream source repo only — see root `CATALOG.md` |
| Local code review / audits | `ws-code-review` (review `{base}...HEAD`; fix → re-review, max 3) |
| Auto-update feature specs after code changes | `ws-spec-update` |
| Resolve spec path / organize board specs | `ws-spec-organizer` |
| Manage / route all spec operations (unified front door) | `ws-spec-manager` |
| Living project feature wiki & domain knowledge base (init, from-code genesis, sync, first-time spec sweep/baseline, Phase 2 wiki-vs-code verify and Phase 3 plan/apply) | `ws-wiki` |
| spec-memo vault setup/bridge / import MEMORY / hybrid fallback | `ws-spec-memo` |
| Runtime spec-memo vault ops (search, upsert, bootstrap, canvas, doctor) | `ws-memo` (external; skip if missing) |
| Prompt/session tracking / vault activity (MCP prompt) | `ws-session-tracking` (external; skip if missing) |
| Spec-to-PR plan-folder timesheet for a civil day | `ws-activity-report` (Extra) |
| GitHub issue/PR ops | `ws-spec-provider-github` |
| ADO WI/PR ops | `ws-spec-provider-azure-devops` |
| Local `*.spec.md` | `ws-spec-provider-local` |
| Format/review spec | `ws-spec-format` |
| New skill / skill rewrite | `ws-write-a-skill` |
| Show active harness | `ws-show-harness` |
| Pipeline review / local dry-run preview | `ws-preview` |
| Upstream package-version fixture compare (never spec-to-pr) | `ws-run-benchmark` |
| Harness benchmark suite & evolution reporting (never spec-to-pr) | `ws-benchmarks` (Extra) |
| Audit harness | `ws-check-harness` |
| Diagnose skills / doctor the harness | `ws-doctor` |
| Check workflows | `ws-check-workflows` |
| Grill plan vs docs | `grill-with-docs` |
| Record learning | `ws-self-learning` (MEMORY consult before plan/code/fix; trap write on completion) |
| Convergence loop | `ws-goal-loop` |
| Record ws-changelog | `ws-changelog` (append-only history at `rules.changelogFile`) |
| Fill / update `config.json` | `ws-configure-project` |
| Discover/install skills | `find-skills` or `using-superpowers` |

---

### Upstream authoring (source repo only)

Package skill authoring, development commands, review commands, and the ship checklist live in the upstream repo's root `CATALOG.md` (authoring-only; not copied to consumer installs). Consumer delivery follows the installed `{skillsRoot}/ws-shared/runtime/AGENTS.md` § Recommended Feature Delivery Checklist — not an upstream table here.

---

## External dependencies (consumer mirror)

Resolve in order (first match). Paths below come from project `config.json` when present.

| Dependency | Resolve (first match) |
|------------|------------------------|
| `senior-developer` / `karpathy-guidelines` | `config.json` → `rules.seniorDeveloper` (default `.agents/skills/ws-senior-developer/SKILL.md`; set `""` to disable) → local skill → global/user skill |
| Stack companion | `config.json` → `rules.stackFile` (default `.ws/STACK.md`) — consumer-owned; never require repo-root files |
| Changelog file | `config.json` → `rules.changelogFile` (default repo-root `CHANGELOG.md`) — create under the effective path only |
| Memory files | `config.json` → `rules.memoryDir` (default repo root: `MEMORY.md` + `memory/`) |
| Domain glossary | `config.json` → `domain.glossaryFile` (often `CONTEXT.md`) — consumer root, optional |
| Optional consumer rules | Other `config.json` `rules.*` paths when set — do not invent filenames |
| Domain catalog | Consumer `specs/domains/` index (optional) |
| Workflow artifacts | `config.json` → `plans.dir` (token `{plansDir}`; default `.agents/plans`) · `plans.specsDir` (token `{specsDir}`; default `.agents/specs`) · optional `reviews.dir` (token `{reviewsDir}`) |

**Code review proof:** load the checklist from the **resolved** `rules.seniorDeveloper` skill (on-demand default; a consumer root `AGENTS.md` may promote it to autoload). Do not paste that checklist into hub docs.
