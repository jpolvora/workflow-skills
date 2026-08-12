---
id: null
slug: enable-auditing
title: "defaults.enableAuditing — runtime workflow audit wrapper for ws-spec-to-pr*"
source: local
specDate: 2026-08-11
---

# Specification — defaults.enableAuditing — runtime workflow audit wrapper for ws-spec-to-pr*

## Description

### Problem

Skill bodies (`SKILL.md`, companions, script recipes) can contain broken paths, wrong launchers, invalid tool aliases, contradictory steps, or missing validation contracts. During `ws-spec-to-pr` / `ws-spec-to-pr-lite` (and related dispatch), a capable model often **silently corrects** those defects at runtime (retrying commands, inventing alternate paths, skipping broken instructions). Delivery may succeed while the authored skill content remains wrong. Maintainers never see a durable record of the unusual events, so regressions stay latent until a weaker model or stricter host fails.

Existing tools do not cover this gap:

| Capability | Covers | Does not cover |
|------------|--------|----------------|
| `ws-check-harness` | Disk/routing/integrity/portability meta-audit | Live per-step runtime anomalies during orch |
| `ws-doctor` | Static install diagnose (paths, parse, config summary, missing refs) | Live wrap of orch dispatch / script & tool I/O |
| `ws-fable-judge` | Adversarial claim vs git diff / fraud types | Skill-content defects masked by LLM self-repair |
| `ws-show-harness` | Session snapshot of what is loaded | Continuous event log + upstream issue proposal |

### Solution

Add an opt-in config flag **`defaults.enableAuditing`** (`boolean`, **default `false`**). When effective `true`, orchestrators (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, and batch drivers that dispatch those orchs such as `ws-multi-spec`) run under a **runtime audit wrapper** that observes and logs unusual execution without changing successful delivery outcomes by default.

The wrapper MUST diagnose and record anomalies across:

1. **Script calling** — launched commands (explicit `python` / `node` / `bash` per `tools.md`), exit codes, stdout/stderr excerpts, retries, and any deviation from the skill-prescribed recipe (wrong launcher, invented path, ignored required args).
2. **Tool calling** — portable tool aliases vs actual invocations; missing/unknown tools; repeated failures then alternate tool choice; host-private tool IDs when skill prose required portable aliases.
3. **Input / output validation** — step handoff contracts (expected artifacts under `{us-dir}`, gate payloads, state file updates, required section presence); missing or malformed inputs/outputs even when the agent proceeds anyway.
4. **Orchestration dispatch** — every step advance, skill load, agent/subagent/dispatch-agent spawn, gate/user-gate event, pause/resume, and bypass; flag unexpected skips, double-dispatch, wrong step skill, or FSM transitions that contradict the orch dispatch table.

**Critical detection rule:** Log skill-content defects **even when the model recovers** (successful retry, workaround, or “corrected” interpretation). A recovered run with skill-body errors is still an audit finding. Severity must distinguish: `error` (skill content / contract broken), `unusual` (unexpected but non-fatal deviation), `info` (normal audited breadcrumb when useful).

**End-of-run behavior:** When the audit log contains one or more `error` (or equivalent actionable) findings, the orchestrator (or wrapper skill) MUST present a `user-gate` proposing to **open a GitHub issue on the original upstream repository** (`jpolvora/workflow-skills`, or the resolved package `upstream` / `project.repoUrl` ownership for managed skills) so maintainers can fix the **skill / hub / script content** that caused the runtime execution errors. The issue body SHOULD summarize findings from the audit log (severity, step, skill id, evidence, recovered flag) and link or attach the local log path when useful. Do **not** auto-create the issue without confirmation; do **not** treat “open a local fix PR in the consumer tree” as the primary outcome for managed skill defects.

**Scope boundary:** Auditing is a **wrapper / observer**, not a replacement for `ws-doctor`, `ws-check-harness`, or `ws-fable-judge`. When `enableAuditing` is false or omitted, orch behavior is unchanged (no audit log obligation, no end-of-run GitHub-issue gate from this feature).

### Proposed config shape

| Key | Type | Default | Meaning |
|-----|------|---------|---------|
| `defaults.enableAuditing` | boolean | `false` | When `true`, wrap `ws-spec-to-pr*` (and dispatching parents) with the runtime audit observer and write an audit log for the run. |

**Resolution rule (mandatory):**

| Condition | Effective `enableAuditing` |
|-----------|----------------------------|
| No project `{sharedDir}/config.json` | `false` |
| Key omitted / null / unreadable | `false` |
| Explicit `true` / `false` | that value |

Seed in `config.json.example` and `config.schema.json`. Document in `config-resolution.md` (and configure-project defaults interview when that section already covers boolean defaults).

### Audit log artifact

When enabled, write a run log under the active plan folder (consumer-owned workflow artifacts), e.g. `{us-dir}/audit-{slug}-{timestamp}.log.md` (exact filename may be refined in plan; must be discoverable and en-us). Each finding MUST include at least: timestamp, orch step id, skill id (if known), category (`script` | `tool` | `io-validation` | `dispatch` | `other`), severity, summary, evidence excerpt, and whether the model recovered (`recovered: true|false`).

Do not commit audit logs unless the consumer explicitly includes them; default gitignore / Notes guidance may recommend leaving them local. The log is the evidence pack for the optional upstream GitHub issue.

### Out of scope (v1)

- Replacing static `ws-doctor` or harness Phases 0–5c.
- Auto-creating GitHub issues without user-gate; silent rewrite of managed skills.
- Opening consumer fix PRs as the primary remediation for managed skill-content defects (prefer upstream issue).
- Full transcript capture of every model token (observe structured events + anomalies, not a raw chat dump).
- Requiring auditing in CI by default (opt-in via config only).

## Acceptance Criteria

- AC1: `config.json.example` and `config.schema.json` define `defaults.enableAuditing` as a boolean with documented default `false`; omitted/missing/unreadable resolves to effective `false`.
- AC2: When effective `enableAuditing` is `false`, `ws-spec-to-pr` and `ws-spec-to-pr-lite` behavior matches today’s non-audited path (no required audit log; no end-of-run GitHub-issue proposal from this feature).
- AC3: When effective `enableAuditing` is `true`, starting `ws-spec-to-pr` or `ws-spec-to-pr-lite` (including when launched from `ws-multi-spec`) activates the runtime audit wrapper for the duration of that orch run.
- AC4: The wrapper records anomalies for script calling (launcher/path/exit/retry/deviation from skill recipe), including cases where a later retry succeeds (`recovered: true` still logged when the first failure or skill-prescribed recipe was wrong).
- AC5: The wrapper records anomalies for tool calling (missing/unknown/non-portable tools, repeated failure then alternate choice) tied to the step and skill id when known.
- AC6: The wrapper records input/output validation failures for step handoffs (missing `{us-dir}` artifacts, malformed state/gate payloads, required outputs skipped) even if the agent continues.
- AC7: The wrapper records every orch dispatch event of interest (step advance, skill load, agent/subagent/dispatch-agent, user-gate, bypass) and flags unusual transitions vs the orch dispatch table (wrong skill, skipped required step, double-dispatch).
- AC8: Skill-content defects that the LLM corrects at runtime are still logged as findings (recovery does not suppress the finding).
- AC9: An audit log file is written under `{us-dir}` for the run with structured findings (timestamp, step, skill, category, severity, summary, evidence, recovered flag) suitable as evidence for an upstream issue.
- AC10: At run end, if any actionable `error` findings exist, a `user-gate` proposes opening a **GitHub issue on the original upstream repo** to fix the runtime skill/hub/script execution errors, with a draft title/body derived from the audit log; no issue is created without explicit user acceptance.
- AC11: Hub docs (`ws-shared` config comments / resolution notes as needed) and orch skill prose document the flag, the wrapper obligation, the log → upstream-issue handoff, and the boundary vs `ws-doctor` / `ws-check-harness` / `ws-fable-judge`.
- AC12: Implementation remains harness-neutral (portable tool aliases; no host product names in skill bodies) and en-us; after content land, integrity regenerate + `ws-check-harness` 0 critical when hashed skills/hubs change.

## Notes

- Related: `ws-doctor.spec.md` under `{specsDir}` (static diagnose; SoT `.agents/specs/ws-doctor.spec.md`), `ws-check-harness`, `ws-fable-judge`, `ws-multi-spec`, `ws-github-provider` (issue creation via `gh` when user accepts).
- Prefer implementing the observer as a small dedicated skill or shared protocol referenced by orch SKILL.md / STEP-DISPATCH (plan decides package shape); keep default-off so consumers pay zero cost unless they opt in.
- Upstream dogfood: maintainers may set `defaults.enableAuditing: true` when authoring skills to catch body defects that models paper over.
- Target issue repo for managed skill findings: package upstream (`jpolvora/workflow-skills` / skill-dependencies `upstream` block), not ad-hoc consumer forks. Consumer-owned config/project bugs may stay local; managed skill defects always prefer the original upstream issue.
