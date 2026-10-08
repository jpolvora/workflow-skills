---
name: ws-retro
description: Optional session retrospective — reviews a completed workflow run and proposes curated, evidence-linked improvements to memory, harness directives, reviewer standards, automated checks, navigation pointers, or no-op deletions. Proposes only; applies nothing without user approval. Opt-in auto-run via config retro.enabled.
disable-model-invocation: true
invocation_names:
  - retro
  - ws-retro
---
# ws-retro

> When this skill is loaded, output "ws-retro loaded."

Self-improvement loop for the agent environment. It reviews **one completed workflow run** and turns each observed struggle into a candidate change to the environment (never to product code). Candidates are ranked most-severe-first and each must trace to a specific moment or artifact of the reviewed run.

## When to use

| Mode | Trigger | Approval |
|------|---------|----------|
| **Manual** | User invokes `/retro` / `/ws-retro` standalone — runnable at any time, with no active workflow run and no workflow state on disk | After proposing, ask via `user-gate`; write only approved candidates |
| **Auto (opt-in)** | Orchestrator hook after the run's ship phase ends, and only when `config.json` → `retro.enabled` is explicit `true` | Propose only — unattended runs never prompt and never write |

The skill is advisory in both modes: it never blocks workflow close, ship, merge, or fix-PR convergence.

## Inputs

Read only what exists; missing inputs are noted, never synthesized:

- Workflow machine state: `{plansDir}/{slug}/{workflow-id}.state.json` (handoffs, step dispatches, telemetry, commits, shipStatus).
- Run telemetry stream: `{plansDir}/{slug}/telemetry.jsonl` (dispatch/finish/exit events, retries, gate bypasses).
- Step artifacts under `{plansDir}/{slug}/`: plan/report/review/testing/fresh-verify/delivery result files that exist.
- Optional: `git log` for the run's commits, PR threads/review comments when the configured SCM provider is reachable, agent transcripts when the host exposes them.
- Summary/handoff only — do not bulk-load unrelated historical runs.

Selecting the reviewed run:

1. Explicit workflow id (or slug + run id) from the invocation.
2. Otherwise the most recent `completed` (or `pr-open`/`stopped`) workflow for the current project from `{plansDir}/index.json`.
3. Manual mode with no recorded run: review the current session's observable evidence only (no invented state), and say so in the report header.

## Process

1. **Collect friction signals** — enumerate moments where the run struggled: failed/retried commands, review findings and fix rounds, test failures, scoreAndRefine/fresh-verify rounds, gate bypasses, missing/misused pointers, repeated re-reads. Each signal keeps its exact artifact reference (path + line/section, telemetry event, or thread id).
2. **Draft candidates** — one candidate per signal; skip anything without a concrete moment (no generic best-practice filler). Rank most-severe-first (`critical`, `high`, `medium`, `low`).
3. **Label each candidate** with exactly one destination category from the closed enum:
   `memory` | `harness-directive` | `reviewer-standard` | `automated-check` | `navigation-pointer` | `no-op-deletion`.
4. **Validate candidates mechanically** before presenting:
   ```bash
   node {skillsRoot}/ws-retro/scripts/validate_candidates.cjs --input {us-dir}/{workflow-id}.retro.json --json [--repo-root .]
   ```
   Present only `accepted`; report `rejected` (with reasons) and emit no generic advice for them.
5. **Write the proposal artifacts** under the reviewed run's folder:
   - `{us-dir}/{workflow-id}.retro.md` — ranked report: context, per-candidate evidence, category, proposed change, and the approval checklist.
   - `{us-dir}/{workflow-id}.retro.json` — machine records consumed by the validator.
   These are runtime artifacts; never commit them.
6. **Approve (manual mode only)** — present candidates through `user-gate` (at most 3 options per question, chunk longer lists with a `More…` option; recommended first). Nothing is written to memory or directives until the user approves; a dismissed gate stops with no writes.
7. **Apply approved candidates only** — per category:
   - `memory` — persist through the `ws-self-learning` memory contract (`update-memory`): local entry under `rules.memoryDir` + compile, and/or the spec-memo vault when `enableSpecMemoIntegration` routes there. No new store.
   - `harness-directive` / `reviewer-standard` / `navigation-pointer` / `no-op-deletion` — apply the exact targeted edit to the named file; deletions only for steering lines this run demonstrated as no-ops.
   - `automated-check` — add the smallest check (test/lint/CI hook) that mechanically catches the recurring violation.
8. **Report** — write a short application summary into the retro report (`## Applied`) and return the artifact paths.

Auto mode stops after step 5: proposals only, zero prompts, zero writes (the orchestrator logs `retro | started:{artifact}` and continues regardless of outcome).

## Candidate schema (`{workflow-id}.retro.json`)

```json
{
  "candidates": [
    {
      "id": "C1",
      "title": "Short imperative title",
      "severity": "critical | high | medium | low",
      "category": "memory | harness-directive | reviewer-standard | automated-check | navigation-pointer | no-op-deletion",
      "evidence": { "artifact": "path-or-artifact-ref", "ref": "L120-L140 | thread #3 | telemetry dispatch step 4", "quote": "optional short excerpt" },
      "proposedChange": { "target": "repo-relative file", "change": "exact intended edit" }
    }
  ]
}
```

Validation rules (enforced by `validate_candidates.cjs`): all fields non-empty; category from the closed enum; severity from the closed set; with `--repo-root`, `evidence.artifact` must resolve repo-relative (run-local refs go in `evidence.ref`). Stable rejection reasons: `field-required`, `category-invalid`, `evidence-required`, `evidence-unresolvable`.

## Guardrails

- **Propose-only by default.** No memory or directive file changes without explicit `user-gate` approval (NS3); auto runs never write.
- **Evidence or nothing.** A candidate with no concrete run moment is rejected, not softened into advice (NS2).
- **Single-run scope.** Do not audit, prune, or supersede candidates from earlier runs; each run stands alone.
- **Anonymization.** No private consumer names, absolute paths, hostnames, or customer data in proposals (source-anonymization rule).
- **Never blocks.** Close, ship, merge, and fix-PR convergence never wait on or fail because of this skill's outcome.
- **No product-code changes.** The targets are environment surfaces only (memory, directives, standards, checks, pointers, no-op deletions).
- Read-only decision helper (the orchestrator hook):
  ```bash
  node {skillsRoot}/ws-retro/scripts/retro_hook.cjs should-run --config {sharedDir}/config.json --json
  ```
  prints `{"run":{"true|false"},"reason":"enabled|disabled|missing","key":"retro.enabled"}` — explicit `true` only; fail-closed off.

## Outputs

- `{us-dir}/{workflow-id}.retro.md` + `{us-dir}/{workflow-id}.retro.json`
- Optional applied edits after approval (manual mode only), with a `## Applied` summary in the report.
- Log line from the orchestrator hook: `retro | started:{artifact}` or `retro | skipped:{reason}`.

## Subagent contract

- Review one run's compact evidence (state/handoffs, telemetry, named step artifacts); do not request transcripts or unrelated history.
- Write only the two retro artifacts; apply environment edits only after explicit `user-gate` approval in manual mode.
- Return ranked candidates with exact evidence references and exactly one category each; report rejected candidates with their reasons.
- Never block close/ship; never write product code; never commit.
