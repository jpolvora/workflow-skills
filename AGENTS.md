# AGENTS.md — Cursor Agent Skill Hub

This file is the **hub** of the agent harness. It contains the routing and index of all skills available in this repository. Refer to the appropriate table to find the correct skill for your task.

---

## ⭐ Canonical Upstream Source

**This repository (`jpolvora/workflow-skills`) is the canonical, authoritative upstream source for `us-workflow` and all of its pipeline dependency skills.**

Skills installed in consumer projects via `npx github:jpolvora/workflow-skills` are **read-only copies** managed by this repository. The contract is:

- **All bug fixes, improvements, and new features** for `us-workflow` pipeline skills must be authored here and submitted as a PR to the `develop` branch.
- **Consumer projects must never edit pipeline skill files in-place** — changes will be overwritten on the next `update` run. The sole exception is `config.json`, which is always preserved during updates.
- **To propagate upstream changes to a consumer project**, run: `npx github:jpolvora/workflow-skills update`

### `us-workflow` Pipeline — Skills Owned by This Repository

| Skill | Step(s) | Role |
|-------|---------|------|
| `us-workflow` | Orchestrator | FSM orchestrator — dispatches all steps |
| `00-write-spec` | Step 0 | Draft canonical spec from feature description |
| `01-write-plan` | Step 1 | Generate implementation plan |
| `02-interview` | Step 2 | Audit and refine plan until shared understanding |
| `03-plan-to-tasks` | Step 3 | Break plan into atomic DAG tasks |
| `04-implement-tasks` | Steps 5, 10 | Execute code changes (build + fix modes) |
| `05-verify-plan` | Step 6 | Verify deliverables against acceptance criteria |
| `06-code-review` | Step 9 | Two-phase triage + investigation code review |
| `07-integration-validation` | Step 11 | Pre-PR integration test battery |
| `08-fix-pr` | Step 13 (via ship-pr) | Resolve active PR review threads |
| `09-goal-fix-pr` | Step 13 (via ship-pr) | Convergence loop — fix-pr until zero open threads |
| `10-update-plan-implementation` | Post-workflow | Delta adjustments from QA findings |
| `11-ship-pr` | Step 13 | End-to-end PR delivery and merge |
| `spec-format` | Spec protocol | Canonical spec format validation |
| `goal-loop` | Loop primitive | Generic convergence loop (consumed by `09-goal-fix-pr`) |

---

## Language (mandatory)

All skill content, agent instructions, user-facing output, questions, answers, and interactions **MUST be in English (en-us)**. No Portuguese (PT-BR) in any skill body, frontmatter, gates, banners, progress boards, or documentation. This is a portable repository consumed by international teams.

---

## Skill loading (mandatory)

Skills loaded automatically by task type:

| Skill | Path | Trigger |
|-------|------|---------|
| `caveman` | `.agents/skills/us-workflow/extra-skills/caveman/SKILL.md` | Every prompt — response compression |
| `gabarito` | `.agents/skills/us-workflow/extra-skills/gabarito/SKILL.md` | Every prompt — operational guidelines |
| `karpathy-guidelines` | `.agents/skills/us-workflow/extra-skills/karpathy-guidelines/SKILL.md` | Every prompt — behavioral guardrails |
| `changelog` | `.agents/skills/us-workflow/extra-skills/changelog/SKILL.md` | Every prompt — summarized historical record |
| `learning` | `.agents/skills/us-workflow/extra-skills/learning/SKILL.md` | Every prompt — anti-regression record |
| `using-superpowers` | `(global skill)` | Session start — skill discovery |

---

## Harness integrity check

Whenever skills are created, modified, or updated, or any harness file is changed (`.agents/skills/`, `AGENTS.md`, `README.md`, `docs/`), **ask the user** if they want to run the harness audit.

To audit, load the `.agents/skills/check-harness.md` skill and execute the scan phases (Phases 0–5c) followed by the correction plan (Phase 6).

> **Note:** This is the `workflow-skills` source repository. **Never** run scripts via `npx github:jpolvora/workflow-skills` — use local files from this repository (remote installations are permitted only within the `test/` folder for testing/verification).

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
| 01 | `01-write-plan` | `.agents/skills/01-write-plan/SKILL.md` | Generates implementation plan from GH issue / spec.md |
| 02 | `02-interview` | `.agents/skills/02-interview/SKILL.md` | Audits and interrogates a plan until shared understanding |
| 03 | `03-plan-to-tasks` | `.agents/skills/03-plan-to-tasks/SKILL.md` | Breaks plan into atomic tasks in a DAG of parallelizable topological levels |
| 04 | `04-implement-tasks` | `.agents/skills/04-implement-tasks/SKILL.md` | Executes or fixes code following plan/DAG (Steps 5 build, 10 fix) |
| 05 | `05-verify-plan` | `.agents/skills/05-verify-plan/SKILL.md` | Compares criteria/plan against current code (Quick Score + US verification) |
| 06 | `06-code-review` | `.agents/skills/06-code-review/SKILL.md` | Local code review in two phases (triage → investigation) |
| 07 | `07-integration-validation` | `.agents/skills/07-integration-validation/SKILL.md` | Pre-PR integration test battery |
| 08 | `08-fix-pr` | `.agents/skills/08-fix-pr/SKILL.md` | Automatic code review thread fixer for PRs |
| 09 | `09-goal-fix-pr` | `.agents/skills/09-goal-fix-pr/SKILL.md` | Loop fix-pr until zero open threads |
| 10 | `10-update-plan-implementation` | `.agents/skills/10-update-plan-implementation/SKILL.md` | Post-workflow: capture QA findings and apply deltas |
| 11 | `11-ship-pr` | `.agents/skills/11-ship-pr/SKILL.md` | End-to-end delivery: PR develop→master/main, merge |

### Layer 3 — Discovery & Library Integration

| Skill | Path | Description |
|-------|------|-------------|
### Layer 4 — Review & Audit

| Skill | Path | Description |
|-------|------|-------------|
| `security-review` | `.agents/skills/security-review/SKILL.md` | Security review (OWASP, injection, XSS, auth, crypto) |
| `dotnet-security-performance-review` | `.agents/skills/dotnet-security-performance-review/SKILL.md` | C# security and performance review (login, auth, EF) |
| `tdd-sdd-ddd-reviewer` | `.agents/skills/tdd-sdd-ddd-reviewer/SKILL.md` | Architectural audit (Clean Architecture, TDD, DDD) |
| `domain-review` | `.agents/skills/domain-review/SKILL.md` | Domain/bounded context review (smells, SOLID, security) |
| `multi-domain-review` | `.agents/skills/multi-domain-review/SKILL.md` | Batch review of multiple domains |
| `secrets-leak-review` | `.agents/skills/secrets-leak-review/SKILL.md` | Secrets/password/PII/credential leak scan (pre-public audit) |

### Layer 5 — Utility & Meta

| Skill | Path | Description |
|-------|------|-------------|
| `caveman` | `.agents/skills/us-workflow/extra-skills/caveman/SKILL.md` | Ultra-compressed response (~75% less tokens) |
| `gabarito` | `.agents/skills/us-workflow/extra-skills/gabarito/SKILL.md` | Ten operational response guidelines (accountability, anti-sycophancy, chain-of-verification) |
| `karpathy-guidelines` | `.agents/skills/us-workflow/extra-skills/karpathy-guidelines/SKILL.md` | Behavioral guidelines to reduce common LLM coding mistakes — surgical changes, no scope creep |
| `us-workflow` | `.agents/skills/us-workflow/SKILL.md` | E2E US orchestrator (FSM F0-F6, steps 0-12) |
| `spec-format` | `.agents/skills/us-workflow/extra-skills/spec-format/SKILL.md` | Creates, reviews, or formats *.spec.md artifacts |
| `learning` | `.agents/skills/us-workflow/extra-skills/learning/SKILL.md` | Anti-regression knowledge record in MEMORY.md |
| `changelog` | `.agents/skills/us-workflow/extra-skills/changelog/SKILL.md` | Summarized historical record in CHANGELOG.md |
| `goal-loop` | `.agents/skills/us-workflow/extra-skills/goal-loop/SKILL.md` | Generic goal/loop convergence pattern (sentinel, heartbeat, verify) |
| `grill-with-docs` | (global skill in `~/.agents/skills/grill-with-docs/SKILL.md`) | Grilling session against existing domain + docs |
| `find-skills` | `using-superpowers` (skill global) | Skill discovery and installation |

---

## Task Router

| When to use | Skill to load |
|-------------|---------------|
| I want to write a spec | `00-write-spec` |
| I want to plan implementation | `01-write-plan` → `02-interview` → `03-plan-to-tasks` |
| I want to implement | `04-implement-tasks` |
| I want to verify what was done | `05-verify-plan` |
| I want to review local code | `06-code-review` |
| I want to review security | `security-review` or `dotnet-security-performance-review` |
| I want to scan for secrets/leaks | `secrets-leak-review` |
| I want to review architecture (DDD) | `tdd-sdd-ddd-reviewer` |
| I want to review domain | `domain-review` or `multi-domain-review` |
| I want to test integration pre-PR | `07-integration-validation` |
| I want to fix PR | `08-fix-pr` |
| I want to ship PR | `11-ship-pr` |
| I want E2E workflow | `us-workflow` |
| I want to format/review spec | `spec-format` |
| I want to create new skill | `write-a-skill` |
| I want to audit harness | `check-harness` |
| I want to grill plan against docs | `grill-with-docs` |
| I want to do frontend design | `taste-skill` or `mobile-first-design` |
| I want to record learning | `learning` |
| I want to record changelog | `changelog` |
| I want to discover/install skills | `find-skills` or `using-superpowers` |

---

## Verification

Before closing a task or committing, run the following verification steps:

### 1. Harness Integrity
```bash
# Check harness integrity (paths, routing, redundancy)
# Load .agents/skills/check-harness.md and execute Phases 0–5c
```

### 2. Automated Installation & Packaging Verification
Verify that the package is correctly bundled and can be successfully installed and executed by target projects:
```bash
# Test remote installation of the live main branch
npm run tests

# Test local installation (packs current local changes and tests them in a test consumer)
npm run tests -- --local
```

### 3. Build Status Verification (Optional)
```bash
# Or via gh API if installed globally
gh api repos/jpolvora/workflow-skills/pages   # verify site is building
```

### 4. Website Catalog Update
Whenever skills, layers, or routing tables are modified, you must regenerate the static catalog website (`docs/index.html`) using the build script:
```bash
# Regenerate the site catalog based on AGENTS.md layers
node bin/build-site.js
```
Commit the updated `docs/index.html` along with your source changes.

---

## Local Dry-Run: Agentic Code Reviewers

Run the multi-agent code reviewer locally in dry-run mode before pushing. Requires `OPENCODE_API_KEY` set in the environment.

```bash
curl -fsSL https://raw.githubusercontent.com/jpolvora/agentic-code-reviewers/release/run.sh | bash -s -- \
  --dry-run \
  --gh \
  --engine opencode \
  --model opencode-go/deepseek-v4-flash \
  --stack Custom \
  --include-patterns "**/*.md,**/*.yml,**/*.yaml,**/*.json,**/*.sh,**/*.ps1,**/*.psm1,**/*.psd1,**/*.cmd,**/*.js,**/*.ts,**/*.css,**/*.html" \
  --target-branch refs/heads/main \
  --source-branch refs/heads/develop
```

This reviews the diff between `develop` and `main` using the opencode engine with a custom stack filter covering all file types in this repo. Remove `--dry-run` to publish threads on the PR. See [agentic-code-reviewers](https://github.com/jpolvora/agentic-code-reviewers) for engine options and stack configuration.

---

## External Dependencies

Some skills reference `senior-developer` (a global skill installed at `~/.agents/skills/senior-developer/SKILL.md`) and `.cursor/rules/ef-migrations.mdc`. These are **not** included in this repository — they must be installed separately in consumer projects for the referenced skills to resolve correctly.

## Custom Commands

| Command | File | Description |
|---------|------|-------------|
| `/check-harness` | `.opencode/commands/check-harness.md` | Audit harness integrity (paths, links, routing, redundancy) |
