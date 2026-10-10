---
step: 8
slug: us-492
workflowId: us-492-20261010T025900Z
status: completed
startedAt: "2026-10-10T03:34:00Z"
endedAt: "2026-10-10T03:36:00Z"
acRefs: ["AC1", "AC2", "AC3", "AC4", "AC5", "AC6", "AC7", "AC8", "AC9", "AC10"]
---

# us-492 — Delivery Result

## Expected

The installer CLI must stop running its shared-hub install phase twice per run and must stop clobbering the consumer's `config.json.bak` snapshot.

- **AC1/AC2** — one hub install per `install`/`update` run; a set containing `ws-self-learning` plus a workflow skill prints a single hub status block.
- **AC3/AC4** — a changing run backs up the pre-change config bytes and leaves the backup differing byte-for-byte from the live config.
- **AC5/AC6** — an existing backup that differs from the live config is preserved; an unchanged-config run neither deletes nor truncates it.
- **AC7** — an unparseable live config is backed up from its raw bytes and never rewritten.
- **AC8** — consumer-owned hub content (`config.json` values, `STACK.md`, `MEMORY.md`/`memory/`, `CHANGELOG.md`) survives the hub refresh.
- **AC9** — global installs get the same once-per-run and backup-preservation guarantees.
- **AC10** — an unreadable packaged `config.json.example` leaves the live config unmodified.

## Done

Two surgical edits in `bin/cli.js`:

1. A run-scoped latch inside `ensureSharedHubInstalled` (`bin/cli.js:1309-1323`) with a single guard covering every call site, reset once at the entry of `installSelectedSkills` (`bin/cli.js:2076`) and `runUpdate` (`bin/cli.js:2725`). The `ws-self-learning` seed path in `afterSkillCopy` still works, so a memory-only install still seeds the hub.
2. `writeConfigBackup` (`bin/cli.js:978-994`, called at `bin/cli.js:1024`) replaces the unconditional snapshot write: a prior backup whose bytes differ from the live config is preserved, an absent or byte-identical backup is written from the raw pre-change bytes, and an unreadable backup file is never fatal.

Regression coverage added: 8 new assertions in `test/test-install.js` (once-per-run block count for a full workflow set, pre-change backup bytes, backup ≠ live, idempotent re-run preservation, invalid-JSON backup, preserve-priority when the live config is unparseable, global-scope parity, unreadable template) and 2 new assertions in `test/test-ws-shared-layout.js` (differing backup preserved across an idempotent update; backup never collapses onto the live config).

Verification: ledger score **10/10** (`knownDefect: false`, `missingEvidence: false`, no deficiencies); stack invariant scan on the touched files **0 issues**; `test/test-install.js --local` green with all 8 `us-492` assertions; `test/test-ws-shared-layout.js` green; 159/159 remaining suite entries green individually; `test-harness-clean.js` **0 findings**; all `ws-check-harness` phase checks green; integrity regenerated and verified at **0.5.36**; `test/test-powershell-config-editor.js` 12/12 (config schema/example untouched). Code review: 0 Critical, 0 Warning, 2 Suggestions (no fix round). Step 6b fresh-verify: 10/10 ACs pass with a red fault injection each. Red baseline: the unmodified pre-fix CLI prints **2** hub status blocks for one update (the fixed CLI prints 1).

Release housekeeping: version bumped once (`0.5.35` → `0.5.36`, strictly above `main`'s `0.5.35`), integrity regenerated, site rebuilt.

## Next steps

- The orchestrator merges the PR after its convergence loop; this worker stops at PR creation (no merge).
- Aggregate `npm run test` remains red on this host at `test/test-subagent-dispatch.js` (documented Windows-host flake, green standalone and green per-entry for the other 159 entries). Not a product defect; follow-up belongs to the test-harness owners.
- Two non-blocking review Suggestions stay open by choice: an `exit`-time restore for the AC10 template fixture, and a warning line when the prior `.bak` cannot be read.

## References

- Spec: `.agents/plans/us-492/step-00-us-492.spec.md`
- Plan: `.agents/plans/us-492/step-02-us-492.plan.refined.md`
- Check: `.agents/plans/us-492/step-05-us-492.plan.report.md`
- Review: `.agents/plans/us-492/step-06-us-492.review.md`
- Fresh verify: `.agents/plans/us-492/step-05b-us-492.fresh-verify.md`
- Testing: `.agents/plans/us-492/step-07-us-492.testing.report.md`

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 36m 49s (2209s workflow wall clock; 1038s summed step agent execution) |
| Steps executed | 8 (0–7) |
| Total tokens | n/a (host did not expose token counters; estimated: false) |
| Lines added | +305 (bin/ + test/ scope) |
| Lines removed | -75 (bin/ + test/ scope) |
| Net LOC delta | +230 |
| Baseline LOC | 51439 (`bin/` + `test/`) |
| Final LOC | 51669 (`bin/` + `test/`) |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | deepseek-v4.1-flash | 5s | n/a | 1 |
| 1 | Planning | deepseek-v4.1-flash | 109s | n/a | 1 |
| 2 | Interview | deepseek-v4.1-flash | 11s | n/a | 2 |
| 3 | Plan to tasks | deepseek-v4.1-flash | 91s | n/a | 1 |
| 4 | Implement | deepseek-v4.1-flash | 7s | n/a | 12 |
| 5 | Verify | deepseek-v4.1-flash | 676s | n/a | 1 |
| 6 | Code review | deepseek-v4.1-flash | 100s | n/a | 2 |
| 7 | Testing | deepseek-v4.1-flash | 39s | n/a | 2 |

### Lane

| Item | Value |
|------|-------|
| autoMode | true |
| flowMode | standard |
| branch | develop (stay-on-develop; base `main`) |
| Product commits | `df3a7559` (G2-code after Step 5) |
| Delivery commit | configured delivery artifacts (`step-02` refined plan + this result) |
