# AGENTS.md — Packaged Skills Index

This folder contains skills developed for consumers. Clients install them via the installer (`npx github:jpolvora/workflow-skills` or the local CLI script).

Skills under `.agents/skills/` are used by:

- **Project workflows** — especially `spec-to-pr` and its pipeline dependencies (`00`–`11`, providers)
- **Local verification** — the `test/` consumer tree (install/pack dry-runs)

This file is a **brief index / routing table** for skills shipped in this package. It can also serve as a **template** for an `AGENTS.md` (or `.agents/AGENTS.md`) skill index in consumer projects after install.

> **Source hub:** The canonical harness hub for *this* repository (layers, skill loading, verification, site catalog) remains the root [`AGENTS.md`](../AGENTS.md). Prefer that file when editing the upstream harness. Prefer *this* file when documenting what ships under `.agents/skills/` for consumers.

> **Drift check:** After adding/removing/renaming skills under `.agents/skills/`, update **both** root `AGENTS.md` (hub + site catalog) and this packaged index so consumer-facing tables stay aligned.

**Language:** All skill content and pipeline output remain **en-us**.

---

## Workflows

| Skill | Path | Role |
|-------|------|------|
| `spec-to-pr` | `skills/spec-to-pr/SKILL.md` | Spec → plan → implement → verify → review → integrate → PR (FSM F0–F6, steps 0–13) |

---

## Skill index

### Harness & infrastructure

| Skill | Path | Description |
|-------|------|-------------|
| `check-harness` | `skills/check-harness.md` | Audit harness integrity (routing, links, redundancy) |
| `write-a-skill` | `skills/write-a-skill/SKILL.md` | Create skills with structure and progressive disclosure |

### Engineering standards

| Skill | Path | Description |
|-------|------|-------------|
| `mobile-first-design` | `skills/mobile-first-design/SKILL.md` | Responsive mobile-first design |
| `design-taste-frontend` | `skills/taste-skill/SKILL.md` | Anti-slop frontend (landing pages, portfolios, redesigns) |

### `spec-to-pr` pipeline (`00`–`11`)

| Skill | Step(s) | Path | Description |
|-------|---------|------|-------------|
| `00-write-spec` | 0 | `skills/00-write-spec/SKILL.md` | Draft canonical spec from feature description |
| `01-write-plan` | 1 | `skills/01-write-plan/SKILL.md` | Generate implementation plan from issue / spec |
| `02-interview` | 2 | `skills/02-interview/SKILL.md` | Audit and refine plan until shared understanding |
| `03-plan-to-tasks` | 3 | `skills/03-plan-to-tasks/SKILL.md` | Break plan into atomic DAG tasks |
| `04-implement-tasks` | 5, 10 | `skills/04-implement-tasks/SKILL.md` | Execute or fix code following plan/DAG |
| `05-verify-plan` | 6 | `skills/05-verify-plan/SKILL.md` | Verify deliverables against acceptance criteria |
| `06-code-review` | 9 | `skills/06-code-review/SKILL.md` | Two-phase triage + investigation local review |
| `07-integration-validation` | 11 | `skills/07-integration-validation/SKILL.md` | Pre-PR integration test battery |
| `08-fix-pr` | 13 (via ship-pr) | `skills/08-fix-pr/SKILL.md` | Resolve active PR review threads |
| `09-goal-fix-pr` | 13 (via ship-pr) | `skills/09-goal-fix-pr/SKILL.md` | Loop fix-pr until zero open threads |
| `10-update-plan-implementation` | Post-workflow | `skills/10-update-plan-implementation/SKILL.md` | Capture QA findings and apply plan deltas |
| `11-ship-pr` | 13 | `skills/11-ship-pr/SKILL.md` | End-to-end PR delivery and merge |

### Providers (platform-specific entry + PR ops)

| Skill | Path | Description |
|-------|------|-------------|
| `github-provider` | `skills/github-provider/SKILL.md` | GitHub issue→spec; auth; PR create/threads/merge (`gh`) |
| `azure-devops-provider` | `skills/azure-devops-provider/SKILL.md` | ADO work item→spec; PAT auth; PR create/threads/merge |
| `local-spec-provider` | `skills/local-spec-provider/SKILL.md` | Local `*.spec.md` detect/register; PR via configured SCM |

### Review & audit

| Skill | Path | Description |
|-------|------|-------------|
| `security-review` | `skills/security-review/SKILL.md` | Security review (OWASP, injection, XSS, auth, crypto) |
| `dotnet-security-performance-review` | `skills/dotnet-security-performance-review/SKILL.md` | C# security and performance review (login, auth, EF) |
| `tdd-sdd-ddd-reviewer` | `skills/tdd-sdd-ddd-reviewer/SKILL.md` | Architectural audit (Clean Architecture, TDD, DDD) |
| `domain-review` | `skills/domain-review/SKILL.md` | Domain / bounded-context review |
| `multi-domain-review` | `skills/multi-domain-review/SKILL.md` | Batch review of multiple domains |
| `secrets-leak-review` | `skills/secrets-leak-review/SKILL.md` | Secrets / PII / credential leak scan |

### Utility & meta (under `spec-to-pr/extra-skills/`)

| Skill | Path | Description |
|-------|------|-------------|
| `caveman` | `skills/spec-to-pr/extra-skills/caveman/SKILL.md` | Ultra-compressed response (~75% fewer tokens) |
| `gabarito` | `skills/spec-to-pr/extra-skills/gabarito/SKILL.md` | Ten operational response guidelines |
| `karpathy-guidelines` | `skills/spec-to-pr/extra-skills/karpathy-guidelines/SKILL.md` | Surgical changes; no scope creep |
| `spec-format` | `skills/spec-to-pr/extra-skills/spec-format/SKILL.md` | Create / review / format `*.spec.md` |
| `learning` | `skills/spec-to-pr/extra-skills/learning/SKILL.md` | Anti-regression notes in `MEMORY.md` |
| `changelog` | `skills/spec-to-pr/extra-skills/changelog/SKILL.md` | Summarized history in `CHANGELOG.md` |
| `goal-loop` | `skills/spec-to-pr/extra-skills/goal-loop/SKILL.md` | Generic convergence loop (used by `09-goal-fix-pr`) |

---

## Task router

| When to use | Skill to load |
|-------------|---------------|
| Spec → PR end-to-end | `spec-to-pr` |
| Write a spec | `00-write-spec` |
| Plan implementation | `01-write-plan` → `02-interview` → `03-plan-to-tasks` |
| Implement / fix code | `04-implement-tasks` |
| Verify against plan | `05-verify-plan` |
| Local code review | `06-code-review` |
| Integration tests pre-PR | `07-integration-validation` |
| Fix PR review threads | `08-fix-pr` / `09-goal-fix-pr` |
| Ship / merge PR | `11-ship-pr` |
| GitHub issue→spec or GitHub PR ops | `github-provider` |
| Azure DevOps work item→spec or ADO PR ops | `azure-devops-provider` |
| Local `*.spec.md` register / normalize | `local-spec-provider` |
| Format / review a spec | `spec-format` |
| Security review | `security-review` or `dotnet-security-performance-review` |
| Secrets / leak scan | `secrets-leak-review` |
| Architecture (TDD/DDD) | `tdd-sdd-ddd-reviewer` |
| Domain review | `domain-review` or `multi-domain-review` |
| Frontend design | `design-taste-frontend` or `mobile-first-design` |
| Create a new skill | `write-a-skill` |
| Audit harness | `check-harness` |

---

## Consumer notes

- Installed skill trees are **read-only** upstream copies (except preserved `config.json` on update).
- To refresh from upstream: `npx github:jpolvora/workflow-skills update`
- Consumers may copy or adapt this index into their own root `AGENTS.md`; keep paths relative to the install root (typically `.agents/skills/...`).
- Do not edit pipeline skills in-place in a consumer project — changes are overwritten on the next update.
