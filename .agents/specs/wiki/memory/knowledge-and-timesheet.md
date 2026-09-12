# Knowledge & Timesheet (`memory`)

## Feature Overview

Project knowledge persists across sessions through two orthogonal backends — local files (`{sharedDir}/MEMORY.md` + `memory/*.md`, compiled index) and the external spec-memo vault (via the `ws-memo` companion) — routed by `enableMemoryFiles` / `enableSpecMemoIntegration`. `ws-self-learning` consults traps before planning/coding and records new ones after; `ws-changelog` appends delivery history; `ws-spec-memo` is setup/bridge only (config, import, fallback, disable) while day-to-day vault ops belong to `/ws-memo`. Timesheet proof comes from `ws-activity-report` (invoice-grade human vs agent timing) and `ws-pre-daily` (rolling 36 h standup briefings). Consumer stack preferences live in `STACK.md`; subagents must verifiably consult compiled MEMORY and pattern files.

## Business Rules & Logic

- **Backend matrix**: local-only, vault-only, dual, and disabled-none combinations are all legal; empty reads degrade gracefully; legacy `specMemo.enabled`/`mode` maps onto the two booleans; dual mode persists to both.
- **Consult before invent**: 3–8 keywords plus touched file paths consult MEMORY/vault before plan/code/fix; subagents touching layered files prove `pattern_consult` + `memory_consult` in `step-output`; review sweeps all compiled entries against the diff.
- **Failure reflection is mandatory**: ≥2 tool/test/build failures before passing forbids `Learning: N/A` — root cause and trap must persist; real reviewer/CI mistakes from fix-PR rounds persist the same way; `REFUTED`/`CAVEATS` audits record High/Critical entries.
- **Two-skill split**: `ws-spec-memo` never duplicates vault `SURFACE.md` and adds no MCP tools; disabled-vault is the Recommended default and warns only when enabled-but-missing.
- **Invoice timing**: Human Total includes agent supervision (Human ≥ Agent Running when agent time > 0); idle/AFK gaps > 30 min are non-billable and reported separately.
- **Standup classification**: `ws-pre-daily` is read-only over git, plan states, and changelog, classifying the window into Delivered / Made / Ongoing / Next / Gaps with stable headings.

## Technical Architecture

- **Scripts & flows**: `self_learning.cjs --match-paths/--compile`, `check_memory_conflict.py` (dynamic `{sharedDir}`), `check_spec_memo.cjs` soft presence checks, `infer_human_timing.py` (`humanSeconds`/`agentRunningSeconds`), `collect_window.py` (stdlib-only), `configure --section memory/patterns` interviews.
- **Configuration**: `enableMemoryFiles` (default true), `enableSpecMemoIntegration` (default false), `defaults.patternsFrontend/patternsBackend`, `tracking.canonicalFiles`, `defaults.autoloadTaskLifecycle`.
- **Entry shape**: `### [YYYY-MM-DD] [Topic]` + Layer/Module/Severity/PathPattern + Scenario + DO NOT / INSTEAD DO.
- **Provenance**: living synthesis of specs 0018, 0021, 0033, 0034, 0048, and 0049.
