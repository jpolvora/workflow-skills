# Knowledge & Timesheet (`memory`)

> Provenance: `.agents/skills/ws-self-learning/SKILL.md`, `.agents/skills/ws-changelog/SKILL.md`, `.agents/skills/ws-spec-memo/SKILL.md`, `.agents/skills/ws-activity-report/SKILL.md`, `.agents/skills/ws-pre-daily/SKILL.md`, root `AGENTS.md` § Memory + changelog, living synthesis of specs 0018, 0021, 0033, 0034, 0048, 0049, 0114-patterns-generator-shared-hub-output.

## Feature

Project knowledge persists across sessions through two orthogonal backends: local files under `{memoryDir}/MEMORY.md` and `{memoryDir}/memory/*.md` (defaults: repo root, legacy `{sharedDir}` fallback), and the external spec-memo vault accessed through the `ws-memo` companion when integration is enabled. Routing is controlled by `enableMemoryFiles` and `enableSpecMemoIntegration` in project config. `ws-self-learning` consults compiled traps before planning or coding and records new traps after mutating work. `ws-changelog` appends delivery history to the configured changelog file. `ws-spec-memo` is setup and bridge only (config interview, import, hybrid fallback, disable flows); day-to-day vault operations belong to `/ws-memo`. Timesheet proof comes from `ws-activity-report` for invoice-grade human versus agent timing and from `ws-pre-daily` for rolling 36-hour standup briefings. Stack preferences live in consumer-owned `STACK.md`, and subagents must verifiably consult compiled MEMORY and pattern files when touching layered code.

## How it works

The backend matrix supports local-only, vault-only, dual, and disabled-none combinations. Empty reads degrade gracefully rather than inventing traps. Legacy `specMemo.enabled` and `mode` keys map onto the two boolean flags. Dual mode persists traps to both backends on write.

Before plan, code, or fix work, agents gather three to eight keywords plus touched file paths and consult MEMORY or the vault via the configured routing order. Subagents touching layered files must prove `pattern_consult` and `memory_consult` in step output. Code review sweeps compiled entries against the diff for missed traps.

Failure reflection is mandatory when two or more tool, test, or build failures occurred before passing; `Learning: N/A` is forbidden in that case. Real reviewer or CI mistakes from fix-PR rounds persist the same way. Adversarial audits with `REFUTED` or `CAVEATS` verdicts require High or Critical trap entries. `ws-spec-memo` never duplicates vault `SURFACE.md` and adds no MCP tools to this package; disabled vault remains the recommended default with warnings only when integration is enabled but the vault is missing.

Pattern learning closes the loop into reusable project knowledge. Self-learning runs compile their traps into a generated project-patterns body that is stored under the shared hub output, so later skill generations and plan interviews consult the persisted patterns instead of rediscovering them. The generator and the memory track share the same hub root and the same layout classification, which keeps the stored body discoverable from any later run.

Invoice timing through `ws-activity-report` treats Human Total as inclusive of agent supervision, requiring Human ≥ Agent Running when agent time is positive. Idle or AFK gaps over 30 minutes are non-billable and reported separately. `ws-pre-daily` is read-only over git, plan states, and changelog, classifying the window into Delivered, Made, Ongoing, Next, and Gaps with stable headings.

## Backend

Local memory compiles through `self_learning.cjs` with `--match-paths` and `--compile`. Conflict checks use dynamic `{sharedDir}` resolution. Spec-memo presence checks run via `check_spec_memo.cjs` as soft gates. Human timing inference lives in dedicated helpers that emit `humanSeconds` and `agentRunningSeconds`. Standup collection uses stdlib-only window gatherers. Configure interviews expose memory and pattern sections.

Configuration keys include `enableMemoryFiles` (default true), `enableSpecMemoIntegration` (default false), `defaults.patternsFrontend` and `defaults.patternsBackend`, `tracking.canonicalFiles`, and `defaults.autoloadTaskLifecycle`. Trap entry shape uses `### [YYYY-MM-DD] [Topic]` with Layer, Module, Severity, PathPattern, Scenario, DO NOT, and INSTEAD DO fields.
