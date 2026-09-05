# Config & SCM Resolution — Dual-Mode

Canonical config and SCM resolution for **all** workflow skills.
Used by `ws-spec-to-pr`, `ws-spec-to-pr-lite`, providers, `ws-fix-pr`, `ws-goal-fix-pr`, `ws-ship-pr`.

---

## Entry check

Resolve the project-local `{sharedDir}/config.json` before any config-dependent skill action. If it is missing or still contains required placeholders, use `user-gate` to recommend `ws-configure-project`; cancellation stops the action and never implies approval. Project config always overrides a global hub.

---

## Config path (only)

```text
.agents/skills/ws-shared/config.json
```

Template: [`config.json.example`](config.json.example). Schema: [`config.schema.json`](config.schema.json).

**Forbidden as primary runtime config:**

- `.agents/skills/ws-spec-to-pr/config.json`
- `.agents/skills/ws-spec-to-pr-lite/config.json`

Scripts and skills that still mention those paths are **bugs** — fix to `{sharedDir}/config.json` (expand per [tools.md](tools.md) § Path tokens; default `.agents/skills/ws-shared/config.json`). Lite and full always share this file (dual-mode).

---

## Global execution & local project config check

When skills are executed from a global install (`$HOME/.agents/skills` or `WORKFLOW_SKILLS_GLOBAL_DIR`), they target the local repository at `$PWD`.

- **Config-Dependent Skills** (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-spec-multi`, `ws-plan-write`, `ws-plan-interview`, `ws-plan-to-tasks`, `ws-implement-tasks`, `ws-plan-verify`, `ws-code-review`, `ws-testing`, `ws-ship-pr`, `ws-fix-pr`, `ws-goal-fix-pr`, providers):
  - **Entry Gate:** Must verify `$PWD/.agents/skills/ws-shared/config.json` exists and is non-empty.
  - **Missing Config:** If missing or unconfigured (`<...>` placeholders), trigger `user-gate` recommending running `ws-configure-project` (which seeds and populates `$PWD/.agents/skills/ws-shared/config.json`).
- **Config-Independent / Standalone Skills** (`ws-configure-project`, `ws-secrets-leak-review`, `ws-karpathy-guidelines`, `ws-tdah`, `ws-write-a-skill`, `ws-spec-format`, `ws-check-harness`, `ws-megabrain`):
  - Run directly in any repository without requiring `config.json`.

---

## Harness entrypoint fallback (global-hybrid)

`rules.harness` defaults to the project-local `.agents/skills/ws-shared/AGENTS.md` (local-first; project config always overrides the global hub). On a global-hybrid install (skill bodies under `{globalSkillsRoot}`, project-local `ws-shared/` holding consumer data only), resolve the harness entrypoint in this order:

1. Project-local `{sharedDir}/AGENTS.md` (`.agents/skills/ws-shared/AGENTS.md`) — the installer seeds a thin local pointer here when the file is missing, so the configured `rules.harness` path still resolves.
2. Global `{globalSkillsRoot}/ws-shared/AGENTS.md` (`~/.agents/skills` or `WORKFLOW_SKILLS_GLOBAL_DIR`) — documented fallback when no local file exists.
3. Skill bodies via `resolveSkillMdPath` / `resolveConsumerContext` (`ws-shared/scripts/resolve_consumer_root.cjs`): project `{skillsRoot}/ws-<id>/SKILL.md` first, then `{globalSkillsRoot}/ws-<id>/SKILL.md`.

An agent reading the configured `rules.harness` path succeeds without manual fallback when either the local pointer or the global hub is present.

---

## Path tokens (fixed + configurable)

Load early with `toolsFile` (default `tools.md` § Path tokens).

| Token | Source | Default |
|-------|--------|---------|
| `{skillsRoot}` | `pathTokens.skillsRoot` | `.agents/skills` |
| `{sharedDir}` | `pathTokens.sharedDir` | `.agents/skills/ws-shared` |
| `{plansDir}` | `plans.dir` | `.agents/plans` |
| `{specsDir}` | `plans.specsDir` | `.agents/specs` |
| `{reviewsDir}` | `reviews.dir` | `.agents/codereviews` |

Expand before tool calls. `{skillsRoot}` / `{sharedDir}` are **fixed install layout** (optional `pathTokens` in config for discoverability; not relocatable). `{plansDir}` / `{specsDir}` / `{reviewsDir}` remain consumer-configurable.

---

## SCM provider resolution (`providers.scm`)

1. Read `providers.active` / `providers.scm` from `.agents/skills/ws-shared/config.json`.
2. If `providers` absent: enabled GitHub tracker → `scm=github`; else enabled Azure DevOps → `scm=azure-devops`; else STOP (require explicit `providers.scm`). Prefer GitHub if both enabled.
3. If `scm` absent: if active is `github`|`azure-devops` → scm=active; if active=`local` → parse `project.repoUrl` host (`github.com` → github; `dev.azure.com` / `visualstudio.com` → azure-devops); else STOP.
4. Reject `scm: "local"` for PR/thread/merge intents.
5. Load matching provider skill; call intents by name — do not embed host CLI recipes in consumer skills.

| `providers.scm` | Skill |
|-----------------|-------|
| `github` | [`ws-spec-provider-github`](../ws-spec-provider-github/SKILL.md) |
| `azure-devops` | [`ws-spec-provider-azure-devops`](../ws-spec-provider-azure-devops/SKILL.md) |

Intent names, outputs, and shared rules: [`scm-provider-contract.md`](scm-provider-contract.md). GitHub and Azure DevOps must implement the same required intents. Callers use intent names only.

---

## Workflow mode flag

When dispatched from an orchestrator, skills receive (via subagent / `dispatch-agent` prompt / state):

| Field | Values | Meaning |
|-------|--------|---------|
| `workflowType` | `standard` \| `lite` | Which orch owns the run |
| `workflowMode` | `true` when under orch | Suppress re-ask at user-gate for ship / commit when orch already gated |
| `shipAction` | `create-pr` \| `push-only` \| `skip` | From orch ship gate |

Standalone invokes omit these; skills may present their own gates.


---

## Fable integration resolution (`fable`)

Optional integration block for `fable-*` skills in `ws-spec-to-pr` / `ws-spec-to-pr-lite` workflows.

1. Read `fable` object from `.agents/skills/ws-shared/config.json`.
2. Default in fresh `config.json.example`: `enabled: true`. Default if absent in legacy config: `enabled: false` (strictly opt-in).
3. When `fable.enabled: true`:
   - `autoAudit` (default `true`): `ws-code-review` (Step 6) and `ws-plan-verify` (Step 5) run adversarial audit via `ws-fable-judge`.
   - `autoDetectDomain` (default `true`): `ws-plan-write` (Step 1) auto-detects specialized stack files and applies `ws-fable-domain` evidence rules.
   - `auditVerdictsBlockShip` (default `"refuted"`): accepts `false`, `"refuted"`, or `"caveats"`. `REFUTED` is the unconditional safety floor and always blocks; `"caveats"` additionally blocks `VERIFIED WITH CAVEATS`.

---

## Parallel DAG task execution resolution (`defaults.enableDag`)

Optional setting in `defaults.enableDag` for task execution mode in `ws-spec-to-pr` / `ws-plan-to-tasks` / `ws-implement-tasks`.

| Condition | Effective `enableDag` | Execution Behavior |
|-----------|------------------------|--------------------|
| Key omitted / `false` (default) | `false` | Tasks execute sequentially one by one in serial order using subagents (no parallel tasks/DAG). |
| Explicit `true` | `true` | Tasks break into parallel DAG execution groups (up to 3 concurrent per level) evaluated against `config.json.dagThresholds`. |

---

## Verbose step preview (`defaults.verboseMode`)

Optional setting in `defaults.verboseMode` for `ws-spec-to-pr` / `ws-spec-to-pr-lite`.

**Write-time default:** schema `default` is `true`; `config.json.example` and `ws-configure-project` persist `true` when they write the key.

**Runtime:** effective only when the JSON value is explicit `true` (omitted / missing / `false` → silent).

| Condition | Effective `verboseMode` | Behavior |
|-----------|-------------------------|----------|
| Key omitted / missing | `false` | Step work starts with no preview list. |
| Explicit `false` | `false` | Silent. |
| Explicit `true` | `true` | The model that will execute step N **analyzes this run** (dispatch/action, state, on-disk artifacts, skip rules, config) and prints `Starting step N (Label):` plus 4–8 `*` bullets before any tool call. Standard `dispatch-agent` steps: that subagent prints first. Orch-owned / lite inline steps: the orchestrator model prints. Do not ship or copy canned preview text. |

---

## Host environment detection & subagent dispatch resolution (`defaults.hostAdapter`)

Optional setting in `defaults.hostAdapter` for host-agnostic subagent execution. See [`host-dispatch.md`](host-dispatch.md).

1. **Binding resolution (default):** Resolve the host-tool binding once at bootstrap per `host-dispatch.md` — `defaults.hostAdapter.mode` force → `{sharedDir}/host-capabilities.json` hit → one active probe — then Tier 1 (native-tool) → Tier 2 (cli-command) → Tier 3 (inline-isolated).
2. **Explicit override:** Set `defaults.hostAdapter.mode` (`"auto"`, `"native-tool"`, `"cli-command"`, `"inline-isolated"`). Explicit mode wins over auto-discovery.
3. **Sparse context pointers:** Dispatches pass pointers to artifacts (`step-00-*.spec.md`, `plan.index.json`, `ac-ledger.json`, `handoff/step-*.json`) instead of full transcripts.


