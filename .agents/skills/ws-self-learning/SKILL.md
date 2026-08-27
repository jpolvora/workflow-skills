---
name: ws-self-learning
version: 0.3.42
description: Anti-regression memory engine — consults shared MEMORY before planning/coding and records newly discovered traps into the project knowledge hub.
invocation_names:
  - self-learning
  - ws-self-learning
---

# Self-Learning

> When this skill is loaded, output "ws-self-learning loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

**Bidirectional gate** — MEMORY is both input (avoid known traps) and output (record new ones).

Expand path tokens first ([`tools.md`](../ws-shared/tools.md) § Path tokens): `{sharedDir}` → `.agents/skills/ws-shared`, `{skillsRoot}` → `.agents/skills`.

Consumer-owned memory routing is configured via `config.json` (`enableMemoryFiles` and `enableSpecMemoIntegration`):

- **Local markdown files (`enableMemoryFiles: true`)**: entries in `{sharedDir}/memory/YYYY-MM-DD-[slug].md`, compiled index in `{sharedDir}/MEMORY.md`.
- **Spec-memo vault (`enableSpecMemoIntegration: true`)**: records queried/persisted via `spec-memo` MCP server (`bootstrap`, `search`, `upsert --kind trap`) or CLI `memo`.
- Both can be enabled (dual-mode) or both disabled.

## When to run

| Moment | Action |
|--------|--------|
| **Before plan / before code / before fix** | **Consult (`read-memory`):** if `enableSpecMemoIntegration`: query MCP/CLI `bootstrap` or `search`. If `enableMemoryFiles`: `Grep` / `Read` `{sharedDir}/MEMORY.md` for task keywords AND query touched paths with `node {skillsRoot}/ws-self-learning/scripts/self_learning.cjs --match-paths <files>`. Apply matching **DO NOT** and **INSTEAD DO** directives. |
| Implementation hit a trap/pitfall/race | **Write (`update-memory`):** if `enableMemoryFiles`: new file in `{sharedDir}/memory/`, then `node {skillsRoot}/ws-self-learning/scripts/self_learning.cjs --compile`. If `enableSpecMemoIntegration`: `upsert --kind trap` via MCP/CLI. |
| Session had $\ge 2$ tool/test/build failures | **Write (Mandatory):** Failure Reflection Hook — record Root Cause & Trap in `{sharedDir}/memory/` (and/or `upsert --kind trap` via MCP/CLI); `Learning: N/A` is strictly forbidden |
| `ws-fable-judge` audit yields `REFUTED` / `CAVEATS` | **Write (Mandatory):** Adversarial Reflection — record `Severity: High` or `Critical` trap in `{sharedDir}/memory/` and/or vault |
| **After each `ws-fix-pr` / `ws-goal-fix-pr` round** | **Write (when a reviewer or CI defect was a real agent mistake):** follow § Post fix-pr round. `Learning: N/A` is forbidden for those defects. |
| Standard feature/bug fix, no new trap & $<2$ failures | Proof line: `Learning: N/A (standard implementation)` after confirming no new pitfall and session friction $<2$ |
| Pure Q&A, no durable insight | Proof line: `Learning: N/A (no new project knowledge)` |
| Memory disabled (both flags false) | Proof line: `Learning: N/A (memory tracking disabled)` |

Task is **not done** until the completion side runs (write or valid `Learning: N/A`) and proof includes a **`Learning:`** line. Prefer consulting MEMORY **before** inventing a new approach when the domain already has High/Critical entries.

## Pre-work consult (mandatory for mutating work)

Resolve routing via `resolveMemoryRouting` / [`tools.md`](../ws-shared/tools.md) alias **`read-memory`** (same evidence class as code/docs — not optional flavor text).

1. Identify 3–8 keywords and touched file paths from the task (e.g. `bash`, `CRLF`, `launcher`, `verify.sh`, `managed skill`, `encoding`, touched files like `src/Controllers/Auth.cs` or `bin/cli.js`).
2. Query matching memories **per enabled backend** (skip a backend only when its flag is false or the store is unavailable — record that skip; do not skip an enabled backend):
   - **`enableSpecMemoIntegration: true`:** MCP `bootstrap` / `search` (prefer host namespace `spec-memo` / `user-spec-memo` / `specMemo.mcpServerName`) or `{specMemo.cli} bootstrap` / `search` with the same keywords/paths. Runtime follow-ups → **`/ws-memo`**.
   - **`enableMemoryFiles: true`:** Keyword grep in `{sharedDir}/MEMORY.md` or `node {skillsRoot}/ws-self-learning/scripts/self_learning.cjs --query <keyword>`; path match with `node {skillsRoot}/ws-self-learning/scripts/self_learning.cjs --match-paths <touched_files...>`.
   - **Both true (dual):** vault first, then supplement with local files. **Both false:** no hits; continue without inventing traps from empty consult.
3. If a hit is Severity Medium+, fold its **DO NOT** / **INSTEAD DO** directives into the plan or first edit. Do not re-discover the same failure mode.
4. For scripts/skills specifically, also apply the preflight in memory entry **Script/skill authoring preflight** (launchers, LF, Windows Python `\r\n`, no shell bridges) when that entry appears in either backend.

## Failure Reflection Hook (Kill the "Learning: N/A" Escape Hatch)

Agents often attempt to save turn tokens by defaulting to `Learning: N/A`. To ensure continuous learning:
- If `dotnet build`, `npm test`, linters, or any verification command/tool failed $\ge 2$ times during the session before succeeding, the session experienced non-trivial friction.
- In this scenario, **`Learning: N/A` is strictly FORBIDDEN**.
- You MUST analyze the root cause of the friction (e.g., misconfigured path, missing flag, unexpected type error, stale cache) and persist a new trap via **`update-memory`** with concrete **DO NOT** and **INSTEAD DO** directives (local `{sharedDir}/memory/YYYY-MM-DD-[slug].md` + compile and/or vault upsert per routing).

## Adversarial Reflection Trigger (`ws-fable-judge`)

When [`ws-fable-judge`](../ws-fable-judge/SKILL.md) audits work and returns a verdict of **`REFUTED`** or **`VERIFIED WITH CAVEATS`** (due to weakened assertions, false completion, scope creep, or unauthorized actions):
1. Create a mandatory reflection entry in `{sharedDir}/memory/YYYY-MM-DD-fable-[slug].md`.
2. Set `Severity: High` (for caveats/scope creep) or `Severity: Critical` (for refuted fraud/regressions).
3. Document the precise mechanism of divergence in **DO NOT** and the verified invariant in **INSTEAD DO**.

## Post fix-pr round (`ws-goal-fix-pr` / `ws-fix-pr`)

After each `ws-fix-pr` pass, including every `ws-goal-fix-pr` Act round, record mistakes the code-reviewer CI or PR threads caught so the next round does not repeat them.

1. Collect **accepted defects**: threads scored 6–10 that received a code fix, plus `check-pr-status` **diff-regression** failures this round fixed.
2. Skip: score 0–5 no-change threads, baseline noise, infra-flake, wrong reviewer claims justified with no code change, and classes already covered by a Medium+ hit from the **`read-memory`** consult (local and/or vault).
3. For each remaining class: persist via [`tools.md`](../ws-shared/tools.md) **`update-memory`** (local `{sharedDir}/memory/YYYY-MM-DD-fix-pr-[slug].md` + `--compile` when `enableMemoryFiles`; vault `upsert --kind trap` when `enableSpecMemoIntegration`; dual → both). Concrete **DO NOT** / **INSTEAD DO** required.
4. Round report `Learning:` must list new entry titles. **Forbidden:** `Learning: N/A` when step 1 had any accepted defect that was not already covered by `read-memory`.
5. `dry-run`: skip memory writes (analysis-only).

## Process (write after)

1. **Analyze context** — What did we try that failed? What non-obvious constraint or pitfall did we hit?
2. **Write to `{sharedDir}/memory/`** — New file `{sharedDir}/memory/YYYY-MM-DD-[slug].md`. **ONLY** traps/pitfalls. **DO NOT** use as a ws-changelog or to record patterns an LLM already knows.
3. **Compile `MEMORY.md`** — Expand tokens, then run (only after the memory file exists on disk; never in the same parallel tool batch as the `Write`):
   ```bash
   node {skillsRoot}/ws-self-learning/scripts/self_learning.cjs --compile
   ```
   Compile fails closed (exit 1, no `MEMORY.md` rewrite) when any `memory/*.md` lacks `### [YYYY-MM-DD]` or both **DO NOT** (or Trap Avoided) and **INSTEAD DO** (or Solution). The Python path is a thin exec of this Node SoT.
4. **Proof + chat** — Set `**Learning:** [entry title]` or `N/A` (only when valid per rules above) in the final proof; one-line summary in the reply.

## Conflict Resolution

If `MEMORY.md` merge-conflicts on pull/merge, **do not** resolve by hand. Run:
```bash
node {skillsRoot}/ws-self-learning/scripts/self_learning.cjs --compile
```
This rebuilds a clean index from `{sharedDir}/memory/` (per-file entries do not conflict).

## Individual Memory File Template

```markdown
### [YYYY-MM-DD] [Topic/Component]
- **Layer**: [e.g. Core, Infrastructure, Api, Web, Tests, or N/A]
- **Module**: [e.g. Auth, Wallet, Users, or N/A]
- **Severity**: [Low, Medium, High, Critical]
- **PathPattern**: [e.g. src/Api/Controllers/*, *.cs, scripts/*.py, or N/A]
- **Scenario / Context**: [When implementing X, dealing with Y, or configuring Z]
- **DO NOT**: [What specific pattern, assumption, or approach to avoid and why it fails]
- **INSTEAD DO**: [What specific correct implementation pattern or action to use instead]
```

Path tokens: [`tools.md`](../ws-shared/tools.md) § Path tokens.

## Done when

- Pre-work: `read-memory` ran for every **enabled** backend (vault and/or local files); hits or per-backend consult-skips recorded.
- Completion: `update-memory` persisted a new trap (local compile exit 0 and/or vault upsert) when required, or valid `Learning: N/A` proof line (permitted only when session friction $<2$ failures and no accepted fix-pr defect remained uncovered).

## Subagent contract

- Run `read-memory` (keywords + paths) against every enabled backend before planning or editing — treat vault traps and local MEMORY as the same evidence class.
- Inject matching DO NOT and INSTEAD DO guidance into the implementation context.
- Record a new durable trap via `update-memory` only when evidence is novel and reusable.
- After two or more tool, build, or test failures, a failure-reflection memory entry is mandatory (`update-memory`).
- After each fix-pr / goal-fix-pr round, record accepted reviewer/CI defects via `update-memory` (and pattern-file rows when those flags are on).
- Return `memory_consult` (backends queried + hits/skips) and a valid `Learning:` result.

