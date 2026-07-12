# AGENTS.md — Cursor Agent Skill Hub

This file is the **hub** of the agent harness. It contains the routing and index of all skills available in this repository. Refer to the appropriate table to find the correct skill for your task.

---

## Language (mandatory)

All skill content, agent instructions, user-facing output, questions, answers, and interactions **MUST be in English (en-us)**. No Portuguese (PT-BR) in any skill body, frontmatter, gates, banners, progress boards, or documentation. This is a portable repository consumed by international teams.

---

## Skill loading (mandatory)

Skills loaded automatically by task type:

| Skill | Path | Trigger |
|-------|------|---------|
| `caveman` | `.agents/skills/caveman/SKILL.md` | Every prompt — response compression |
| `gabarito` | `.agents/skills/gabarito/SKILL.md` | Every prompt — operational guidelines |
| `karpathy-guidelines` | `.agents/skills/karpathy-guidelines/SKILL.md` | Every prompt — behavioral guardrails |
| `changelog` | `.agents/skills/changelog/SKILL.md` | Every prompt — summarized historical record |
| `learning` | `.agents/skills/learning/SKILL.md` | Every prompt — anti-regression record |
| `using-superpowers` | `(global skill)` | Session start — skill discovery |

---

## Harness integrity check

Whenever skills are created, modified, or updated, or any harness file is changed (`.agents/skills/`, `AGENTS.md`, `README.md`, `docs/`), **ask the user** if they want to run the harness audit.

To audit, load the `.agents/skills/check-harness.md` skill and execute the scan phases (Phases 0–5c) followed by the correction plan (Phase 6).

> **Note:** This is the `workflow-skills` source repository. **Never** run scripts via `npx github:jpolvora/workflow-skills` — use local files from this repository.

---

## Skill Catalog

### Layer 0 — Harness & Agent Infrastructure

| Skill | Path | Description |
|-------|------|-------------|
| `check-harness` | `.agents/skills/check-harness.md` | Audit harness integrity (AGENTS.md, skills, rules) |
| `write-a-skill` | `.agents/skills/write-a-skill/SKILL.md` | Create new skills with structure and progressive disclosure |
| `using-superpowers` | `(global skill)` | Agent onboarding: skill discovery via Skill tool |

### Layer 1 — Engineering Standards (Auto-load by task)

| Skill | Path | Description |
|-------|------|-------------|
| `mobile-first-design` | `.agents/skills/mobile-first-design/SKILL.md` | Responsive mobile-first design |
| `design-taste-frontend` | `.agents/skills/taste-skill/SKILL.md` | Anti-slop frontend — landing pages, portfolios, redesigns |

### Layer 2 — Workflow Pipeline (numbered, 00-11)

| Step | Skill | Path | Description |
|------|-------|------|-------------|
| 00 | `00-write-spec` | `.agents/skills/00-write-spec/SKILL.md` | Generates spec.md from feature description |
| 01 | `write-plan` | `.agents/skills/01-write-plan/SKILL.md` | Generates implementation plan from GH issue / spec.md |
| 02 | `interview` | `.agents/skills/02-interview/SKILL.md` | Audits and interrogates a plan until shared understanding |
| 03 | `plan-to-tasks` | `.agents/skills/03-plan-to-tasks/SKILL.md` | Breaks plan into atomic tasks in a DAG of parallelizable topological levels |
| 04 | `implement-tasks` | `.agents/skills/04-implement-tasks/SKILL.md` | Executes or fixes code following plan/DAG |
| 05 | `verify-plan` | `.agents/skills/05-verify-plan/SKILL.md` | Compares criteria/plan against current code (Quick Score + US verification) |
| 06 | `us-code-review` | `.agents/skills/06-code-review/SKILL.md` | Local code review in two phases (triage → investigation) |
| 07 | `integration-validation` | `.agents/skills/07-integration-validation/SKILL.md` | Pre-PR integration test battery |
| 08 | `fix-pr` | `.agents/skills/08-fix-pr/SKILL.md` | Automatic code review thread fixer for PRs |
| 09 | `goal-fix-pr` | `.agents/skills/09-goal-fix-pr/SKILL.md` | Loop fix-pr until zero open threads |
| 10 | `step-10-update-plan-implementation` | `.agents/skills/10-update-plan-implementation/SKILL.md` | Post-workflow: capture QA findings and apply deltas |
| 11 | `11-ship-pr` | `.agents/skills/11-ship-pr/SKILL.md` | End-to-end delivery: PR develop→master/main, merge |

### Layer 3 — Discovery & Library Integration

| Skill | Path | Description |
|-------|------|-------------|
| `supabase-postgres-best-practices` | `.agents/skills/supabase-postgres-best-practices/SKILL.md` | Postgres optimization and best practices |

### Layer 4 — Review & Audit

| Skill | Path | Description |
|-------|------|-------------|
| `security-review` | `.agents/skills/security-review/SKILL.md` | Security review (OWASP, injection, XSS, auth, crypto) |
| `dotnet-security-performance-review` | `.agents/skills/dotnet-security-performance-review/SKILL.md` | C# security and performance review (login, auth, EF) |
| `tdd-sdd-ddd-reviewer` | `.agents/skills/tdd-sdd-ddd-reviewer/SKILL.md` | Architectural audit (Clean Architecture, TDD, DDD) |
| `domain-review` | `.agents/skills/domain-review/SKILL.md` | Domain/bounded context review (smells, SOLID, security) |
| `multi-domain-review` | `.agents/skills/multi-domain-review/SKILL.md` | Batch review of multiple domains |

### Layer 5 — Utility & Meta

| Skill | Path | Description |
|-------|------|-------------|
| `caveman` | `.agents/skills/caveman/SKILL.md` | Ultra-compressed response (~75% less tokens) |
| `gabarito` | `.agents/skills/gabarito/SKILL.md` | Ten operational response guidelines (accountability, anti-sycophancy, chain-of-verification) |
| `karpathy-guidelines` | `.agents/skills/karpathy-guidelines/SKILL.md` | Behavioral guidelines to reduce common LLM coding mistakes — surgical changes, no scope creep |
| `us-workflow` | `.agents/skills/us-workflow/SKILL.md` | E2E US orchestrator (FSM F0-F6, steps 0-12) |
| `spec-format` | `.agents/skills/spec-format/SKILL.md` | Creates, reviews, or formats *.spec.md artifacts |
| `learning` | `.agents/skills/learning/SKILL.md` | Anti-regression knowledge record in MEMORY.md |
| `changelog` | `.agents/skills/changelog/SKILL.md` | Summarized historical record in CHANGELOG.md |
| `goal-loop` | `.agents/skills/goal-loop/SKILL.md` | Generic goal/loop convergence pattern (sentinel, heartbeat, verify) |
| `grill-with-docs` | (global skill in `~/.agents/skills/grill-with-docs/SKILL.md`) | Grilling session against existing domain + docs |
| `find-skills` | `using-superpowers` (skill global) | Skill discovery and installation |

---

## Task Router

| When to use | Skill to load |
|-------------|---------------|
| I want to write a spec | `00-write-spec` |
| I want to plan implementation | `write-plan` → `interview` → `plan-to-tasks` |
| I want to implement | `implement-tasks` |
| I want to verify what was done | `verify-plan` |
| I want to review local code | `us-code-review` |
| I want to review security | `security-review` or `dotnet-security-performance-review` |
| I want to review architecture (DDD) | `tdd-sdd-ddd-reviewer` |
| I want to review domain | `domain-review` or `multi-domain-review` |
| I want to test integration pre-PR | `integration-validation` |
| I want to fix PR | `fix-pr` |
| I want to ship PR | `11-ship-pr` |
| I want E2E workflow | `us-workflow` |
| I want to format/review spec | `spec-format` |
| I want to create new skill | `write-a-skill` |
| I want to audit harness | `check-harness` |
| I want to grill plan against docs | `grill-with-docs` |
| I want to optimize Postgres | `supabase-postgres-best-practices` |
| I want to do frontend design | `taste-skill` or `mobile-first-design` |
| I want to record learning | `learning` |
| I want to record changelog | `changelog` |
| I want to discover/install skills | `find-skills` or `using-superpowers` |

---

## Verification

Before closing a task or committing, run:

```bash
# Check harness integrity (paths, routing, redundancy)
# Load .agents/skills/check-harness.md and execute Phases 0–5c

# Or via gh API if installed globally
gh api repos/jpolvora/workflow-skills/pages   # verify site is building
```

---

## External Dependencies

Some skills reference `senior-developer` (a global skill installed at `~/.agents/skills/senior-developer/SKILL.md`) and `.cursor/rules/ef-migrations.mdc`. These are **not** included in this repository — they must be installed separately in consumer projects for the referenced skills to resolve correctly.

## Custom Commands

| Command | File | Description |
|---------|------|-------------|
| `/check-harness` | `.opencode/commands/check-harness.md` | Audit harness integrity (paths, links, routing, redundancy) |
