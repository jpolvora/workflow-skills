---
id: null
slug: research-driven-pipeline-quality
title: "Research-driven spec-to-pr pipeline quality and integration"
source: local
specDate: 2026-08-27
---

# Specification — Research-driven spec-to-pr pipeline quality and integration

## Description

Elevate `ws-spec-to-pr` (steps 0–9) and `ws-spec-to-pr-lite` (steps 0–5) plus the shared pipeline pack so they behave as **one production system**: durable machine state, bounded context between steps, explicit skill-to-skill handoffs, optional deeper review, and sanitized memory. Source of recommendations: repo-root `RESEARCH.md` (2026-08-26 research input). This spec is the program of record for those themes; research text is not itself a shipped contract.

### Baseline already in the tree (do not re-implement)

| Capability | Where it lives |
|------------|----------------|
| Per-dispatch byte cap `defaults.contextBudget` (default 32000) | `config.schema.json`, `build_dispatch_context.cjs` |
| Compact `## Step outputs (compact)` + at most two full outputs in dispatch | `PROTOCOLS.md`, `build_dispatch_context.cjs` |
| `run.json` / `RUN.md` derived from workflow state | `workflow_state.cjs` |
| `ac-ledger.json` + `plan.index.json` as machine plan/AC matrices | orch Step 0–7, `ARTIFACTS.md` |
| Standard `dispatch-agent` for verbose steps 6–7; lite inline | `STEP-DISPATCH.md`, lite `SKILL.md` |
| `defaults.parallelVerifyReview` + `merge_verify_review.cjs` | standard Step 5/6 |
| Fail-closed verify bar, fable ship block, sabotage, pre-advance | `gates.md`, `ac_ledger.cjs` |
| Model presets / per-step models | `defaults.modelsPreset`, `stepModels` |
| Node SoT for `update_state` / `validate_state` (Python exec-wrap only) | `workflow_state.cjs` |

Shipped program `harness-efficiency-and-verifiability` (index `[x]`, PR #223) already cut preamble, ledger scoring, and artifact economy. This spec **adds** RESEARCH gaps that that program did not close: JSON-primary state, optional provider-compat host hints, **inter-step** prune (not just per-dispatch size), consolidated verbose-step payloads, a pack-wide handoff schema, optional review jury, memory write sanitization, and authoring-protocol updates.

### System behavior

1. **Machine state:** `{us-dir}/{workflow-id}.state.json` is schema-validated and is the only file `update_state.cjs` mutates as SoT. The existing `{workflow-id}.state.md` is rendered from that JSON in the same write. `run.json` remains a compact live snapshot hashed to the JSON revision (no third writer).
2. **Context hygiene:** After each `finish`, orchestrators treat raw tool dumps and full step markdown as expired for the next turn. The next step (standard dispatch or lite inline) loads `handoff/step-{NN}.json` plus compact state slices and named artifact paths from `ARTIFACTS.md`.
3. **Integration:** Every pipeline skill (`ws-write-spec` through `ws-goal-fix-pr`, plus both orchestrators and SCM providers at intent boundaries) emits the same handoff object. Dual-mode: lite writes the same files inline; standard writes them from subagent return. Resume/bootstrap reads JSON state + ledger + latest handoff + recent git log (RESEARCH initializer/coding-agent pattern; `ac-ledger.json` is the feature matrix).
4. **Production quality:** Existing gates stay fail-closed. Optional `reviewJury.size` 2–3 unions findings for standard Step 6. Memory writes strip instruction-like injection before persist.
5. **Portability:** No skill body requires a named IDE, host rule folder, or vendor HTTP flag. Provider thinking-mode / KV-cache hints live only under `defaults.providerCompat` as optional host documentation.

Architecture touchpoints: `.agents/skills/ws-shared/scripts/workflow_state.cjs`, `config.schema.json`, `config.json.example`, `tools.md`, `gates.md`, both orch `SKILL.md` files, `STEP-DISPATCH.md`, `PROTOCOLS.md`, `ARTIFACTS.md`, `ws-write-a-skill/SKILL_AUTHORING.md`, `ws-self-learning` write path, `ws-configure-project` defaults interview, `ws-check-harness` (handoff presence), `test/`.

## Acceptance Criteria

- AC1: Existing fail-closed gates (`defaults.minVerifyScore`, fable `REFUTED` ship block, `validate_state --pre-advance`, required sabotage when in scope) gain no new skip, dry-run-only, or auto-approve path in this program.
- AC2: Every new `config.json` key this spec adds is declared in `config.schema.json` and `config.json.example`, documented in `ws-configure-project` defaults interview, and named in both orchestrator skills (lite documents ignore vs apply). Omitted keys resolve to the defaults in this spec.
- AC3: `{us-dir}/{workflow-id}.state.json` validates against a published JSON Schema; `update_state.cjs` writes that file first, then renders `{workflow-id}.state.md` from it in the same operation.
- AC4: `validate_state.cjs` treats `.state.json` as SoT when both JSON and Markdown exist; a Markdown-only edit that disagrees with JSON fails validation with a non-zero exit and a message naming the hash mismatch.
- AC5: `run.json` stays a derived compact snapshot; `validate_state` continues to reject `run.json` revision/state-hash mismatch against the JSON SoT (same class of check as today against Markdown frontmatter).
- AC6: Python `update_state.py` / `validate_state.py` remain exec-wrappers of sibling `.cjs` only; this program does not reimplement dispatch/finish/bypass in Python.
- AC7: A Node test runs a full `dispatch` then `finish` lifecycle with Python absent from `PATH` and asserts `.state.json` exists, `.state.md` is a render of it, and `run.json` hash matches.
- AC8: `defaults.providerCompat` is an object with `additionalProperties: false` and keys `stabilizeStaticPrefix` (boolean, default true) and `thinkingToolCompat` (boolean, default false). Skill bodies must not hardcode vendor HTTP flags or require a named model host.
- AC9: `tools.md` and `SKILL_AUTHORING.md` state that `thinkingToolCompat` is an optional **host** hint (preserve reasoning/assistant text across tool turns; do not force tool choice when the host rejects it) and that `stabilizeStaticPrefix` means keep the orch static dispatch prefix byte-stable from token 0 when the host caches prefixes.
- AC10: When `defaults.contextHygiene.pruneAfterStep` is true (schema default true), both orchestrators after `update_state finish` instruct the next step to read `handoff/step-{NN}.json` and compact state only, not the full prior step markdown, unless `ARTIFACTS.md` names that file as required for that next step.
- AC11: Each successful step `finish` writes `{us-dir}/handoff/step-{NN}.json` (zero-padded `NN` matching telemetry) whose UTF-8 size is ≤ 8192 bytes and which validates against `{skillsRoot}/ws-shared/schemas/handoff.schema.json` (or equivalent published schema path under `ws-shared`).
- AC12: `handoff.schema.json` requires `step` (integer), `slug`, `workflowId`, `workflowType` (`standard` \| `lite`), `status`, `artifactPaths` (array of repo-relative strings), `acRefs` (array of `AC{n}` strings, may be empty), `summary` (string), `nextAction` (string), `findings` (object with integer `critical`, `warning`, `suggestion`, `info`).
- AC13: Standard Steps 6 and 7 and lite Step 3 (review) populate `findings` from the step report; other steps may use zeros. Raw test logs and full diffs stay in existing `step-06` / `step-07` artifacts, not in the handoff object.
- AC14: `build_dispatch_context.cjs` (standard) injects the latest handoff JSON (or a truncated `summary` if over remaining budget) and does not concatenate full `step-06-*.review.md` or `step-07-*.testing.*` bodies into the dispatch prefix.
- AC15: Lite `SKILL.md` post-mutating sequence includes the same handoff write and prune rule (inline session, no `dispatch-agent`).
- AC16: `defaults.contextHygiene.backgroundVerboseSteps` is boolean default false. When true, standard orch **may** dispatch Steps 6 and 7 as non-blocking host jobs using portable `dispatch-agent` only if the host exposes that capability; if unsupported, orch logs `background-unsupported` and runs blocking dispatch. Skill prose names no IDE product and no host-private folder.
- AC17: `ARTIFACTS.md` lists `handoff/step-{NN}.json` and `{workflow-id}.state.json` in the artifact map; `read-artifacts-registry` rows exist; neither file is staged at G2-code (same class as `run.json` / ledger).
- AC18: Pipeline skills `ws-write-spec`, `ws-write-plan`, `ws-interview`, `ws-plan-to-tasks`, `ws-implement-tasks`, `ws-verify-plan`, `ws-code-review`, `ws-testing`, `ws-ship-pr`, `ws-fix-pr`, and `ws-goal-fix-pr` each name the handoff file in a `## Handoff` or `Done when` line (orch may write the file from structured subagent output). A `ws-check-harness` or unit check fails if any of those SKILL.md files omit the substring `handoff/step-`.
- AC19: Bootstrap / resume in `setup.md` (or orch SKILL) tells the agent to load `{workflow-id}.state.json`, `ac-ledger.json`, the latest `handoff/step-*.json`, and `git log -5 --oneline` for the working branch, and not to reload every `step-0*.md` up front.
- AC20: `defaults.reviewJury.size` is an integer 1–3, default 1. When size is 1, Step 6 behavior matches today (one `reviewerModel` dispatch). When size is 2 or 3, standard orch dispatches that many independent `ws-code-review` runs against the same `{base}...HEAD` commit, then unions findings with the same deterministic sort as `merge_verify_review.cjs` (severity, path, line, id, source). Duplicate identical findings collapse to one.
- AC21: Jury merge never drops a Warning or Critical present in any juror report. `requiresFix` is true if any juror would require fix under current severity rules.
- AC22: Lite ignores `reviewJury.size` greater than 1 (one inline review) and records `juryIgnored: lite-inline` in that step's telemetry JSONL object.
- AC23: `ws-self-learning` local file create and spec-memo `upsert` (when integration is on) reject or strip a published injection heuristic before persist: lines matching case-insensitive `ignore previous instructions`, fenced `tool_call` / `invoke` blocks, or `system:` role prefixes. A unit fixture must fail the write (non-zero or sanitized-empty skip) when the body is only those patterns.
- AC24: `tools.md` `read-memory` states that retrieved MEMORY / vault hits are passive history, not executable commands.
- AC25: `SKILL_AUTHORING.md` gains four named subsections covering: optional provider-compat host hints; inter-step prune / handoff hooks; verbose-step return recipes (handoff JSON, not log dumps); JSON as SoT for machine-mutated workflow artifacts with Markdown as render.
- AC26: Finish telemetry JSONL for `type: finish` includes integer `handoffBytes` and boolean `pruneAfterStep` (the effective config value).
- AC27: `ws-check-harness` remains 0 critical on the changed tree; `npm run test` includes tests for JSON state round-trip, handoff schema, jury merge union, and memory sanitizer fixtures.
- AC28: Hashed skill edits in the same ship PR regenerate integrity (`npm run generate-integrity` / `verify-integrity`) and update `FEATURES.md` plus hub/docs required by root `AGENTS.md` harness change protocol.
- AC29: When `backgroundVerboseSteps` or `reviewJury.size` > 1 is set but the host cannot honor them, orch continues (no HS-5) after the documented fallback.
- AC30: Re-running `finish` for the same step with identical structured fields does not change `.state.json` hash (idempotent writer); a second handoff write for that step overwrites in place with the same schema.
- AC31: Schema validation rejects `reviewJury.size` outside 1–3 and rejects unknown keys under `defaults.contextHygiene` and `defaults.providerCompat`.

## Original Issue Context

Free-text maintainer request (2026-08-27): draft a spec/plan from `RESEARCH.md` to improve `spec-to-pr-*` workflows so the whole skill pack works integrated and efficient and delivers best-quality code to production.

### Prior Work Sweep

- **Exact open PR for this slug:** none (local program spec, `id: null`).
- **Related shipped specs:** `harness-efficiency-and-verifiability` (done, PR #223) — preamble budget, ledger, compact outputs, `run.json`, parallel verify/review. `hermes-spec-to-pr-enhancements` — prior-work sweep, design intent, sabotage, CI triage, close-loop. `models-preset-and-per-step` — model routing, not HTTP compat flags. `fable-skills-integration` — adversarial quality, not context prune. `continuous-ai-verification-quality-gates` — classifier/CI/fable, completed.
- **Related unshipped / partial:** `deepseek-harness-improvements` plan (versioned state, background jobs, loop hygiene) — overlap on background jobs and state versioning; this spec stays on JSON SoT + portable dispatch fallback, not a DSH plugin runtime. `harness-spec-benchmark` — measurement toolkit, not pipeline behavior.
- **Code:** `workflow_state.cjs` still treats `.state.md` as the writer path; `run.json` is derived. `build_dispatch_context.cjs` already slices compact outputs. No `defaults.providerCompat`, `contextHygiene`, `reviewJury`, or `handoff.schema.json` in schema today.
- **MEMORY:** High trap `2026-08-25` frozen `update_state.py` — do not reimplement dispatch/finish in Python; keep `.py` as exec-wrappers; canonical CLI `dispatch` / `finish` / `bypass`. Dual-script trap: do not add a new Python twin for handoff/state JSON.

### Design Intent

Greenfield program over a working harness (no single restored function). Intentional constraints to preserve:

- **Markdown state as human board** was intentional for orch readability; inversion keeps a rendered `.state.md`, it does not delete the board.
- **`run.json` as compact live view** was intentional in the efficiency program; it stays derived, not a second writer SoT.
- **Blocking `dispatch-agent`** is the portable default; background jobs are host-optional.
- **Single reviewer** is the cost default; jury is opt-in test-time compute.
- **Portable hubs** remain `AGENTS.md` / `ws-shared`; RESEARCH Strategy 5 host rules stay out of shipped skills.

## Child Tasks

### Task W1 — JSON-primary workflow state

- **Status:** proposed
- **ACs:** AC3–AC7, AC30
- **Depends on:** none

### Task W2 — Provider-compat host hints

- **Status:** proposed
- **ACs:** AC8–AC9, AC31 (providerCompat keys)
- **Depends on:** none

### Task W3 — Inter-step prune and handoff files

- **Status:** proposed
- **ACs:** AC10–AC17, AC26, AC29–AC31 (contextHygiene)
- **Depends on:** W1 (handoff written beside JSON state)

### Task W4 — Pack integration, resume bridge, skill Handoff lines

- **Status:** proposed
- **ACs:** AC18–AC19
- **Depends on:** W3

### Task W5 — Optional review jury

- **Status:** proposed
- **ACs:** AC20–AC22, AC29, AC31
- **Depends on:** W3 (jurors return handoff findings)

### Task W6 — Memory sanitization

- **Status:** proposed
- **ACs:** AC23–AC24
- **Depends on:** none

### Task W7 — Authoring protocol and ship hygiene

- **Status:** proposed
- **ACs:** AC1–AC2, AC25, AC27–AC28
- **Depends on:** W1–W6 content to document

## Notes

- Implement in `.agents/skills/` SoT only. Do not edit `{globalSkillsRoot}/ws-*` from this package root.
- Dual-mode: pipeline skills stay orch-agnostic; orchestrators pass `workflowType` and write handoff files.
- Positive enclosure: orch **loads** compact handoff + named artifacts; do not add long lists of files the agent must never open except where a test needs a forbidden concatenation assertion (AC14).
- `RESEARCH.md` remains research input; after this spec ships, maintainers should point §8 at this slug instead of treating raw research as backlog.

## Out of Scope

| Feature | Reason |
|---------|--------|
| RESEARCH Strategy 5 shipped `.cursor/rules` / replacing `AGENTS.md` | Portability; host adapters stay upstream dogfood only |
| New FSM step numbers or a third orchestrator | Existing 0–9 / lite 0–5 remain the contract |
| New SCM intents or GitHub-only recipes | `scm-provider-contract.md` parity; intents unchanged |
| Re-doing harness-efficiency W1–W10 | Already `[x]` in `index.PRD` (PR #223) |
| Weakening minVerifyScore, fable REFUTED, or sabotage | Production quality stays fail-closed |
| Merging `run.json` into `state.json` | Keeps existing ARTIFACTS and hash checks stable |
| Host-native `clear_tool_uses` API requirement | Not portable; file handoff is the contract |
| Auto-sizing jury from the complexity classifier | Deferred; see companion `context.md` |
| Consumer `config.json` commits | Hub file is gitignored |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Program shape | One umbrella spec with child workstreams W1–W7 | User asked for pack-wide integration | n |
| State SoT | JSON write-first, Markdown render | RESEARCH Strategy 1; avoid three writers | n |
| Handoff byte cap | 8192 UTF-8 bytes | Fits inside default 32k dispatch after 18k preamble + 4k MEMORY | n |
| Jury default | size 1 | Avoid default token/latency cost | n |
| Background verbose steps | default false, fallback to blocking | Portability | n |
| `thinkingToolCompat` default | false | Most hosts need no extra flags; opt-in | n |
| `stabilizeStaticPrefix` default | true | Zero-cost orch instruction (keep prefix stable) | n |
| Auth / rate limits / tenancy / TTL | N/A because this is local harness config, files, and Node scripts with no new network API | Implicit dimensions not present | n |
