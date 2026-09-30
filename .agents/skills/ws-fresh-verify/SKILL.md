---
name: ws-fresh-verify
description: Fresh-worker re-verification stage — re-derives AC verdicts from the spec with fresh eyes, injects one fault per AC on a scratch worktree, and reports evidence-or-zero. Trigger for fresh verification or orch Step 6b.
disable-model-invocation: true
invocation_names:
  - fresh-verify
  - ws-fresh-verify
---
# ws-fresh-verify

> When this skill is loaded, output "ws-fresh-verify loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check.

Re-derive every spec AC verdict from the spec plus the product tree with no prior
step outputs, prove each AC test can fail via fault injection on a scratch
worktree, and report evidence-or-zero per criterion.

**Canonical output:** `{us-dir}/step-05b-{slug}.fresh-verify.md` (registry:
[`ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md)). Report shape: [`TEMPLATE.md`](TEMPLATE.md).

## Invocation

Standalone:

```
/fresh-verify <spec-path> [plan=<plan-path>] [product-tree=<dir>]
```

Workflow (standard Step 6b): the orchestrator dispatches after Step 6 review with
`specPath` (`step-00-*.spec.md`), `planOfRecord` (refined plan, else `step-01`),
and the compact handoff only — never prior full step outputs.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<spec-path>` | required | `step-00-{slug}.spec.md` |
| `plan` | inferred | Refined plan when present, else `step-01-{slug}.plan.md` |
| `product-tree` | repo root | Directory the verdicts are re-derived against |

## Steps

1. **Build fresh dispatch** — Run `node scripts/build_fresh_dispatch.cjs --spec <spec> --plan <plan> --product-tree <dir> --output {us-dir}/step-05b-{slug}.fresh-dispatch.json` plus `--prior-output` for every file the dispatch would inject. Exit 1 refuses a prior full step output — drop it and re-run.
   - Done when: the handoff JSON exists and names only spec, plan of record, product tree, and the AC list.
2. **Re-derive verdicts** — For each AC read the spec and the product tree only. Record `pass` with `file:line` evidence for each reproduced pass, else `fail`. Never open ledger reports, reviews, or test reports from earlier steps.
   - Done when: every spec AC has an independent verdict row with evidence or an explicit gap.
3. **Inject faults** — For each AC run `node scripts/run_fresh_injection.cjs --ac <ACn> --test "<configured *Test alias>" --paths <f...> --invert-patch <caller-authored.patch> --worktree-dir {worktrees-dir}/fresh-verify/<ACn>`. Collect each call's JSON into `{us-dir}/step-05b-{slug}.fresh-injections.json` (array, one entry per AC). Record the red signal (failing test name plus exit code) per AC.
   - Done when: every AC has an injection record and `git worktree list` shows no leftover scratch worktree.
4. **Score evidence-or-zero** — Collect step 2 verdicts into `{us-dir}/step-05b-{slug}.fresh-verdicts.json`, then run `node scripts/write_fresh_report.cjs --slug {slug} --verdicts {us-dir}/step-05b-{slug}.fresh-verdicts.json --injections {us-dir}/step-05b-{slug}.fresh-injections.json --output {us-dir}/step-05b-{slug}.fresh-verify.md --round <n>`. An AC with no pass evidence or no red signal scores zero and is listed as a defect with the missing evidence named.
   - Done when: the report exists; exit 0 advances, exit 1 carries `loopAction: continue|pause`.
5. **Bounded fix loop** — On `continue`, the orchestrator re-dispatches `ws-implement-tasks` for defect ACs and re-verifies. Max 3 rounds per stage visit; round 3 with residual defects Pauses with the residual list. Never a 4th round.
   - Done when: zero defects, or Pause with residuals recorded.
   - Contract: [`gates.md`](../ws-shared/runtime/gates.md) § Fresh-verify fix loop.
6. **Skip rule** — When the run has no product tree changes, write the marker via `write_fresh_report.cjs --skip no-product-changes` and exit 0. No verdicts, no injection.
   - Done when: the marker report exists.
7. **Handoff** — Return the report path, round, and defect count in `step-output`.
   - Done when: the caller has the report path and the loop action.

## Guardrails

- Fresh inputs only: spec, plan of record, compact handoff, product tree. Prior full step outputs are refused by the dispatch builder, not by worker discipline.
- Never mutate the product tree: injection runs only on the scratch worktree; unrestored bytes abort the stage before any fix dispatch.
- Never author a pass without `file:line` evidence; never record an injection red without a failing test name and exit code.
- Contract: [`STEP-DISPATCH.md`](../ws-spec-to-pr/STEP-DISPATCH.md) § Step 6b · orch: standard Step 6 substep.

## Subagent contract

- Re-derive verdicts from the spec and product tree without opening earlier step outputs.
- Run one fault injection per AC on a scratch worktree; verify removal after each call.
- Link only observed verdict, file-line, and red-signal evidence into the report inputs.
- Write only the assigned fresh-verify report and return path plus loop action in `step-output`.
