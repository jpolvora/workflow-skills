---
slug: enable-auditing
title: "defaults.enableAuditing — runtime workflow audit wrapper for ws-spec-to-pr*"
status: "plan to be refined"
---

## 0. Summary & Business Rules

Add opt-in `defaults.enableAuditing` (default `false`). When `true`, `ws-spec-to-pr`, `ws-spec-to-pr-lite`, and `ws-multi-spec` run under a runtime audit observer that logs script/tool/I/O/dispatch anomalies (including LLM-recovered skill defects) to `{us-dir}/audit-{slug}-{timestamp}.log.md`. At run end, actionable `error` findings trigger `user-gate` proposing a GitHub issue on the upstream repo (`jpolvora/workflow-skills`), not a consumer fix PR. Observer must not change delivery outcomes when disabled or when findings are logged only.

## 1. Definition of Ready & Scope

**In scope (v1):** config flag + schema + resolution docs; new harness skill `ws-audit` (or `ws-runtime-audit`) with protocol + optional Node helper; orch wrapper hooks in `ws-spec-to-pr` / `ws-spec-to-pr-lite` / `ws-multi-spec` SKILL + STEP-DISPATCH; audit log writer; end-of-run upstream issue draft gate; hub/router docs; integrity + tests.

**Out of scope:** replacing `ws-doctor` / `ws-check-harness` / `ws-fable-judge`; auto-creating issues; full chat transcripts; CI-mandatory auditing.

**AC mapping:** AC1–AC2 config; AC3–AC9 observer + log; AC10 issue gate; AC11 docs; AC12 harness-neutral + integrity.

## 2. Technical Design & Architecture

### Config layer (`ws-shared`)

| File | Change |
|------|--------|
| `config.json.example` | Add `defaults.enableAuditing: false` + `_comment` |
| `config.schema.json` | Boolean property under `defaults` |
| `config-resolution.md` | Resolution table (missing → false) |

### New skill: `ws-audit` (Workflows package)

| Path | Role |
|------|------|
| `.agents/skills/ws-audit/SKILL.md` | Protocol: when to wrap, event categories, log format, end-of-run issue gate |
| `.agents/skills/ws-audit/scripts/audit_log.js` | Append structured finding; finalize log; build `gh issue` draft body |
| `.agents/skills/ws-audit/AUDIT-FORMAT.md` | Finding schema (timestamp, step, skill, category, severity, summary, evidence, recovered) |

**Event sources (agent protocol — orch documents obligation):**

- Script: Shell exit ≠ 0, missing launcher, path deviation vs skill recipe
- Tool: unknown alias, retry then alternate tool
- I/O: missing `{us-dir}` artifact, malformed state YAML
- Dispatch: wrong step skill, skipped required step, double-dispatch

**Log path:** `{us-dir}/audit-{slug}-{ISO}.log.md` (markdown, en-us).

### Orchestrator integration

| Skill | Change |
|-------|--------|
| `ws-spec-to-pr/SKILL.md` | Load `ws-audit` when `enableAuditing`; wrap each dispatch; end-of-run gate |
| `ws-spec-to-pr/STEP-DISPATCH.md` | Per-step audit obligations before/after `dispatch-agent` |
| `ws-spec-to-pr-lite/SKILL.md` | Same wrapper (lite step map) |
| `ws-multi-spec/SKILL.md` | Propagate flag to child orch runs |
| `ws-shared/setup.md` | Parse flag in init banner (informational) |

### End-of-run GitHub issue gate (AC10)

When log has ≥1 `error` severity finding:

1. Build draft title/body from log + upstream owner/repo from `skill-dependencies.json` `upstream` or `project.repoUrl`
2. `user-gate`: **Open GitHub issue (Recommended)** / **Skip** / **Copy draft only**
3. On accept: delegate `gh issue create` via `ws-github-provider` pattern (no auto without accept)

### Hub / package registration

- `bin/skill-dependencies.json` — add `ws-audit` to workflows package
- Root `AGENTS.md` + `ws-shared/AGENTS.md` — task router + catalog row
- Boundary prose vs `ws-doctor`, `ws-check-harness`, `ws-fable-judge`

## 3. Step-by-Step Plan

### Step A — Config & resolution (AC1, AC2, AC11 partial)

1. Add `defaults.enableAuditing` to `config.json.example` and `config.schema.json`
2. Document resolution in `config-resolution.md`
3. Optional: `ws-configure-project` defaults interview mentions flag (if defaults section already lists booleans)

**Files:** `ws-shared/config.json.example`, `config.schema.json`, `config-resolution.md`

### Step B — `ws-audit` skill package (AC4–AC9, AC12)

1. Create `SKILL.md` with banner, entry check, invocation, event categories, log contract
2. Create `AUDIT-FORMAT.md` finding schema
3. Implement `scripts/audit_log.js`: `init`, `append`, `finalize`, `hasErrors`, `draftIssueBody`
4. Register in `skill-dependencies.json`

**Files:** `.agents/skills/ws-audit/*`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/skill-dependencies.json`

### Step C — Orchestrator wrapper (AC3, AC7, AC8, AC11)

1. `ws-spec-to-pr`: init reads `enableAuditing`; if true, `audit_log.js init` at bootstrap; log dispatch events each step; finalize at workflow end
2. `ws-spec-to-pr-lite`: mirror lite step indices
3. `ws-multi-spec`: note in SKILL that child runs inherit project config flag
4. Update `STEP-DISPATCH.md` transition block with audit append hooks

**Files:** `ws-spec-to-pr/SKILL.md`, `STEP-DISPATCH.md`, `ws-spec-to-pr-lite/SKILL.md`, `ws-multi-spec/SKILL.md`

### Step D — End-of-run issue gate (AC10)

1. After finalize, if `hasErrors`, render `user-gate` with draft from `draftIssueBody`
2. On accept, run `gh issue create` against upstream repo (document in `ws-audit` SKILL)

**Files:** `ws-audit/SKILL.md`, optional thin helper in `ws-github-provider` or inline `gh` recipe

### Step E — Docs, integrity, verification (AC11, AC12)

1. Hub sync: `AGENTS.md`, `ws-shared/AGENTS.md`
2. `npm run generate-integrity` && `npm run verify-integrity`
3. `ws-check-harness` 0 critical
4. Add `test/test-ws-audit.js` (log append/finalize, resolution false default)

## 4. Permissions, Tenancy & i18n

N/A — harness package; no RBAC/tenancy. en-us only.

## 5. Test Coverage

| AC | Test |
|----|------|
| AC1 | Schema/example contain `enableAuditing`; default false |
| AC2 | Orch SKILL states no log when false (doc + manual orch dry path) |
| AC3 | Orch SKILL references wrapper activation |
| AC4–AC8 | `audit_log.js` unit tests: append finding with recovered flag; categories |
| AC9 | Finalize writes file under temp `{us-dir}` |
| AC10 | `draftIssueBody` includes error findings; gate documented |
| AC11 | Harness phase 3/4b includes `ws-audit` id |
| AC12 | Integrity verify passes after regenerate |

## 6. Invariants (Do Not Violate)

- `commitPlanFilesOnlyAtStep8: true` — no `{plansDir}/` in delivery commit except configured artifacts
- Harness-neutral skill bodies (no host product names)
- Default-off: zero overhead when `enableAuditing` false
- Managed skills: consumer defects → upstream issue, not local skill rewrite

## 7. Pre-PR Checklist

- [ ] Config example + schema + resolution aligned
- [ ] `ws-audit` registered in dependency graph
- [ ] Orch wrapper documented in SKILL + STEP-DISPATCH
- [ ] Boundary vs doctor/harness/fable-judge in SKILL prose
- [ ] Integrity regenerated
- [ ] `npm run test` + harness 0 critical

## 8. Open Questions

- **Resolved:** End-of-run remediation = upstream GitHub issue (not PR).
- **Resolved:** Skill id `ws-audit` (short, harness layer).
- **Deferred:** Auto-append audit log to `deliveryCommitArtifacts` toggle (v2).
