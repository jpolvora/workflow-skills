---
name: ws-run-benchmark
version: 0.3.53
description: >-
  Upstream-only package-root fixture compare. Never during ws-spec-to-pr.
  Trigger only on explicit /ws-run-benchmark from the workflow-skills source tree.
disable-model-invocation: true
invocation_names:
  - ws-run-benchmark
  - run-benchmark
---

# ws-run-benchmark

> When this skill is loaded, output "ws-run-benchmark loaded."

Automates the upstream harness benchmark CLI. **Package root only.** Does not replace `npm run benchmark:static` for CI.

**Never part of consumer delivery.** Do not load this skill from `ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-testing`, or Step 8 Timing. Explicit `/ws-run-benchmark` from the `workflow-skills` source tree only.

**Config-independent.** Gate is the CLI path below, not `config.json`.

## Invocation

```text
/ws-run-benchmark
/ws-run-benchmark --mode static
/ws-run-benchmark --mode live --fixture fx-node-helper
/ws-run-benchmark --collect-only --sandbox <path> --fixture fx-node-helper
/ws-run-benchmark --mode live --fixture fx-config-merge --snapshot
```

| Arg | Rule |
|-----|------|
| `--mode` | `static` or `live` (default **live**) |
| `--fixture` | Fixture id. If omitted on live: `user-gate` (recommended `fx-node-helper`) |
| `--sandbox` | Existing sandbox (required with `--collect-only`) |
| `--collect-only` | Skip prepare and orch |
| `--snapshot` | Promote collect report after success (skip gate) |
| `--no-snapshot` | Skip snapshot |
| `--install` | Pass through to `prepare` (tarball install) |

Canonical version-over-version fixture: `fx-config-merge`. Fast lite fixture: `fx-node-helper`.

## Steps

1. **Gate** — From package root:
   ```bash
   node {skillsRoot}/ws-run-benchmark/scripts/context.cjs --check
   ```
   Exit 1 → STOP (this is not the workflow-skills source tree).
   - Done when: stdout JSON has `ok: true` and `repoRoot`.

2. **Resolve** — `--mode static` → Step 3. Else:
   ```bash
   node {skillsRoot}/ws-run-benchmark/scripts/context.cjs --list
   ```
   Missing `--fixture` → `user-gate` with listed ids; recommended `fx-node-helper`. Then:
   ```bash
   node {skillsRoot}/ws-run-benchmark/scripts/context.cjs --fixture {id}
   ```
   - Done when: `mode`, `fixtureId`, `orchSkill`, `specFile`, `slug`, `cli` are known.

3. **Static** — Only when `mode=static`:
   ```bash
   npm run benchmark:static
   ```
   Print fixture index/verdict. Stop (no orch, no snapshot).
   - Done when: command exit 0 and run dirs exist under `benchmarks/runs/static-*`.

4. **Prepare** — Skip when `--collect-only`. From `repoRoot`:
   ```bash
   node scripts/harness-benchmark/cli.cjs prepare --fixture {fixtureId}
   ```
   Add `--install` only when requested. Parse `Sandbox: ` from stdout. Confirm `{sandbox}/RUN.md` exists.
   - Done when: sandbox path is known and `RUN.md` is present.

5. **Orch** — Skip when `--collect-only`. Load [`references/ORCH.md`](references/ORCH.md). `dispatch-agent` into `{sandbox}` with `{orchSkill}` + `{specFile}`.
   - Done when: `{sandbox}/.agents/plans/{slug}/plan.index.json` and `ac-ledger.json` exist.

6. **Collect** — From `repoRoot`:
   ```bash
   node scripts/harness-benchmark/cli.cjs collect --sandbox {sandbox} --fixture {fixtureId}
   ```
   Read `report.json` from the printed `collect complete:` dir. Print index, dimensions, verdict.
   - Done when: collect exit 0 and report validates (CLI writes it).

7. **Snapshot** — `--no-snapshot` → skip. `--snapshot` → snapshot. Else `user-gate`: **Snapshot (Recommended)** / **Skip**.
   ```bash
   node scripts/harness-benchmark/cli.cjs snapshot --from {report.json} --name {packageVersion}-{fixtureId}-live
   ```
   - Done when: skipped or `benchmarks/baselines/{name}.json` exists. Skill stops.
