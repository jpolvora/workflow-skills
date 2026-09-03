# Skill Authoring & Protocol Guidelines

**Audience: Agents and Skill Authors**  
**Mandatory Contract:** Mandatory guidelines for designing, authoring, pruning, and maintaining lean, deterministic, and token-efficient agent skills in this repository.

> **Canonical Source of Truth (`.agents/skills/`):** `.agents/skills/ws-*` is the **only canonical source of truth** for all skills in this upstream package. Whenever creating, reviewing, updating, or enhancing skills (`ws-*`), agents **MUST edit files under `.agents/skills/`**. The installation source shipped by the installer is always `.agents/skills/`.

---

## 1. Core Philosophy: Meta-Instruction & Architecture

Authoring agent skills is **meta-instruction and protocol design**, not application software development. It belongs to the **Planning & Review** phases (Architecture, Trade-offs, Progressive Disclosure, Context Budget Optimization) rather than pure code execution.

| Dimension | Execution (Step 4) | Skill Authoring (Protocol Design) |
|-----------|--------------------|-----------------------------------|
| **Goal** | Solves immediate codebase task | Constrains agent search space & behavior deterministically |
| **Output** | Application code & tests | State machines, gates, verifiable exit criteria, & minimal prompts |
| **Optimization** | Runtime performance / correctness | Context window token economy & cognitive load minimization |

---

## 2. Model Selection & Role Mapping

When designing or revising skills, select LLM architectures according to their cognitive strengths. In `config.json`, skill authoring maps to `plannerModel` and `reviewerModel` — not `executionModel`.

### Recommended 2-Pass Workflow

1. **Pass 1 (Planner / Architect):**
   - **Model:** High-reasoning / thinking models (e.g., Claude Sonnet thinking or Opus thinking).
   - **Role:** Define overall structure, state machine steps, verifiable "Done when" conditions, invocation triggers, and entry gates. Follows long authoring protocols (`ws-write-a-skill`) and balances context load vs. cognitive load.
2. **Pass 2 (Reviewer / Auditor):**
   - **Model:** High-reasoning model executing a dedicated **pruning checklist**.
   - **Role:** Detect no-ops, eliminate sediment, audit loose criteria, remove duplicate instructions, and enforce progressive disclosure limits.
3. **Minor Tweaks & Wording Corrections:**
   - **Model:** Fast models (e.g., Composer fast or Gemini Flash).
   - **Role:** Typos, step renames, formatting adjustments, or localized single-line edits. Avoid fast models for structural skill design from scratch.

### Selection Matrix

| Scenario | Model Recommendation | Rationale |
|----------|----------------------|-----------|
| **Critical / Multi-Workflow Dependency** | Opus thinking | Maximum reasoning capability for complex trade-offs and edge cases. |
| **Day-to-Day Authoring (Default)** | Sonnet thinking | Best balance of procedural brevity, guideline adherence, and cost. |
| **Drafting + Subsequent Audit** | Flash (Draft) → Sonnet (Prune) | Fast initial iteration followed by rigorous auditing. |
| **Typos & Single Step Renames** | Composer fast / Flash | Instant localized updates without overhead. |

---

## 3. The 3-Tier Progressive Disclosure Architecture

To keep primary skill bodies (`SKILL.md`) compact (ideally ≤ ~100–150 lines), enforce a strict 3-tier layout:

```
[ Tier 1: SKILL.md ] (Loaded upon skill invocation)
   ├── Frontmatter (triggers & intent scope)
   ├── Entry Gate / Pre-requisites
   ├── State Machine Steps
   └── Verifiable "Done when" per step
        │
        ├──► [ Tier 2: references/*.md ] (Read on demand via view_file)
        │       ├── Detailed schemas & complex examples
        │       └── Edge case handling & domain rules
        │
        └──► [ Tier 3: scripts/* ] (Executed via shell / runner)
                ├── Deterministic validators (linter, schema, AST)
                └── Scaffolding / automated generators
```

> **Mandatory Rule:** Agents must **never** load Tier 2 documentation into context until they reach the specific step that requires it.

---

## 4. Frontmatter & Trigger Budget

Frontmatter (`name`, `description`) is injected into the agent's discovery index before the skill is invoked.

- **Scope:** Keep `description` strictly focused on **trigger conditions and intent matching**.
- **Forbidden:** Do **not** place execution rules, step protocols, or detailed instructions in the frontmatter description.

```yaml
---
name: ws-spec-write
description: Drafts canonical *.spec.md feature specifications from an issue or user prompt. Trigger when user asks to plan a new feature, draft a spec, or convert an issue into a spec.
---
```

---

## 5. Tool-First & Deterministic Anchors

Replace vague prompt directives with deterministic scripts or shell commands whenever possible.

- ❌ **Prompt Directive (Vague):** "Ensure the output JSON file has valid formatting and no missing keys."
- ✅ **Tool Anchor (Deterministic):** "Run `python scripts/validate_json.py {targetFile}`. Done when exit code is 0."

Using scripts eliminates LLM hallucination risk, reduces prompt size, and converts subjective guidelines into binary pass/fail verification.

---

## 6. Pruning Checklist (Zero Sediment)

During Pass 2 (Review), systematically remove all unnecessary text using this checklist:

| Sediment Category | Example to Eliminate | Rationale for Removal | Action / Replacement |
|-------------------|----------------------|-----------------------|----------------------|
| **No-Ops & Echo Statements** | *"Be careful and write clean code."* | Does not constrain the search space or alter LLM behavior. | Replace with explicit constraint or remove. |
| **Open Negative Constraints** | *"Do not do X, Y, Z, A, B, C..."* | LLMs struggle with negative lists. | Define a single positive enclosure (e.g., *"Modify only target file T"*). |
| **Redundant Synonyms** | *"Analyze, inspect, and examine the log."* | Wastes token budget. | Use single imperative verb (e.g., *"Inspect the log."*). |
| **Dual-Path Ambiguity** | *"You may use method A or method B if preferred."* | Causes agent hesitation or loops. | Specify exact path: *"Use A. If A fails with X, use B."* |

---

## 7. Verifiable "Done When" Exit Criteria

Every step in a skill must possess a non-subjective, empirical exit gate.

- ❌ **Subjective:** "Step completed when the unit tests look good."
- ✅ **Empirical:** "Step completed when `npm test` returns exit code 0 and coverage is ≥ 85%."
- ❌ **Subjective:** "Step completed when documentation is updated."
- ✅ **Empirical:** "Step completed when `README.md` contains the updated `## Installation` section."

---

## 8. Empirical Feedback Loop & Telemetry

1. **Dogfooding:** Execute new skills against realistic test cases.
2. **Failure Diagnosis:**
   - Agent ignored a rule? → *Instruction was too far from the action point or buried in prose.*
   - Agent stopped early? → *Step exit criteria were subjective or premature.*
   - Agent hallucinated paths? → *Missing explicit path tokens or CLI script validation.*
3. **Continuous Maintenance:** Update `SKILL.md` based on real execution traces, and record recurring failure traps in the project memory (`MEMORY.md`).

---

## 9. Global Skill Execution & Config Entry Gates

When skills are installed globally (`$HOME/.agents/skills` or `WORKFLOW_SKILLS_GLOBAL_DIR`), they execute against the **current working directory** (`$PWD`).

### Classification of Skills

1. **Config-Dependent Skills:**
   - Skills that require project identity, verification commands, SCM providers, stack companions, or artifact output paths (e.g. `ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-spec-multi`, `ws-plan-write`, `ws-implement-tasks`, `ws-code-review`, `ws-testing`, `ws-ship-pr`, `ws-fix-pr`, `ws-spec-provider-github`, `ws-spec-provider-azure-devops`, `ws-configure-project`).
   - **Mandatory Entry Gate:** Must check if `$PWD/.agents/skills/ws-shared/config.json` exists in the consuming repository.
   - **Missing Config Protocol:** If missing or unconfigured, the skill MUST trigger a `user-gate` telling the user to run `ws-configure-project` (or offer an option/gate to invoke `ws-configure-project` immediately to seed and configure `.agents/skills/ws-shared/config.json`).
2. **Config-Independent / Standalone Skills:**
   - Pure utility or governance skills that operate without project hub config (e.g. `ws-secrets-leak-review`, `ws-karpathy-guidelines`, `ws-tdah`, `ws-write-a-skill`, `ws-spec-format`, `ws-check-harness`).
   - Can execute directly in any repository without prompting for `ws-configure-project`.

## 10. Pipeline artifacts and host hints

### Provider-compat (optional, config only)

When a skill mentions model hosts, keep HTTP and thinking-mode flags in `defaults.providerCompat` as optional host hints. Do not require a named vendor in SKILL.md bodies.

### Inter-step prune and handoff

Orchestrators persist `{us-dir}/handoff/step-{NN}.json` on `update_state finish`. The next step loads that file plus compact state. Do not instruct a full reread of prior step markdown unless ARTIFACTS.md requires it.

### Verbose-step return recipes

Review and testing steps return structured findings in the handoff JSON (counts plus artifact paths). Full logs stay in `step-06` / `step-07` artifacts. Do not dump raw logs into the orchestrator prompt.

### JSON vs Markdown for machine-mutated workflow artifacts

Machine-mutated workflow state uses JSON as SoT (`{workflow-id}.state.json`, ledgers, indexes, handoff). Markdown is a rendered human view. Do not treat YAML frontmatter as the only writer target when a JSON schema exists.

---

## 11. Skill Family Naming (`ws-{family}-{skillName}`)

Every packaged `ws-*` skill folder and live reference follows the canonical pattern:
1. **Pattern:** `ws-{family}-{skillName}` in kebab-case. `{family}` is a short noun grouping related skills (`spec`, `plan`, `check`, `fable`, `patterns`, `goal`).
2. **Specs family hard rule:** Every packaged skill whose id contains the token `spec` MUST start with `ws-spec-`. Forbidden: `ws-write-spec`, `ws-sync-spec`, `ws-multi-spec`, `ws-local-spec-provider`, `ws-github-provider`, `ws-azure-devops-provider`, or any future `ws-{other}-spec*` / host-first `ws-{host}-provider` for spec/SCM entry.
3. **Spec providers subfamily:** GitHub, Azure DevOps, and local are three implementations of the same role (tracker/filesystem → `{specsDir}` + register/promote; GitHub/Azure also own SCM intents). Canonical id shape: `ws-spec-provider-{backend}` with `{backend}` ∈ `github` | `azure-devops` | `local`. There is no separate installable meta-skill named `ws-spec-providers`.
4. **Consistency:** Folder name, SKILL.md `name:`, dependency graph keys, and hub router rows must be the exact same string.

### In-scope rename table

| Current id | New id | Family | Notes |
|------------|--------|--------|-------|
| `ws-write-spec` | `ws-spec-write` | spec | Draft / reformulate `{specsDir}/{slug}.spec.md` only |
| `ws-sync-spec` | `ws-spec-update` | spec | Surgical spec-body sync after prompt-driven code change; plus memory hook |
| `ws-multi-spec` | `ws-spec-multi` | spec | Batch orch; was `ws-{verb}-spec` |
| `ws-github-provider` | `ws-spec-provider-github` | spec-provider | Spec-provider implementation for GitHub issues + SCM intents |
| `ws-azure-devops-provider` | `ws-spec-provider-azure-devops` | spec-provider | Spec-provider implementation for ADO work items + SCM intents |
| `ws-local-spec-provider` | `ws-spec-provider-local` | spec-provider | Spec-provider implementation for filesystem `{specsDir}` register/fetch (promotion primitive) |
| `ws-write-plan` | `ws-plan-write` | plan | Same verb-after-family pattern as `ws-spec-write` |
| `ws-verify-plan` | `ws-plan-verify` | plan | Step 5 check-implementation |
| `ws-update-plan-implementation` | `ws-plan-update` | plan | Post-delivery plan deltas |
| `ws-interview` | `ws-plan-interview` | plan | Plan audit; name currently hides the family |

### Deferred optional families

| Family | Current ids | Optional future ids | Why deferred |
|--------|-------------|---------------------|--------------|
| check / harness | `ws-check-harness`, `ws-check-workflows`, `ws-show-harness`, `ws-doctor` | `ws-harness-show`, `ws-harness-doctor` | `ws-check-*` already groups the auditors; doctor/show are distinct products |
| pr | `ws-ship-pr`, `ws-fix-pr`, `ws-goal-fix-pr` | `ws-pr-ship`, `ws-pr-fix` | Slash commands `/ship-pr` `/fix-pr` are established |
| fable | `ws-fable-method`, `ws-fable-judge`, `ws-fable-domain` | (none) | Already grouped |
| patterns | `ws-patterns-backend`, `ws-patterns-frontend` | (none here) | Separate catalog-cleanup spec owns a possible `ws-patterns` merge; do not collide |
| goal | `ws-goal-loop`, `ws-goal-fix-pr` | (none) | Already grouped |
| other | `ws-write-a-skill`, `ws-classify-complexity`, `ws-implement-tasks`, `ws-code-review`, `ws-testing` | not required | No `spec` token; not a confused family |

