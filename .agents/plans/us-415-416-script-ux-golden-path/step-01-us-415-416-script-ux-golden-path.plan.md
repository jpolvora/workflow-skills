---
slug: us-415-416-script-ux-golden-path
title: "Workflow script UX and golden-path state commands: discoverable help, score diagnostics, boundary errors, exit codes, per-gate commands, tamper-evidence"
status: completed
step: 1
workflowId: us-415-416-script-ux-golden-path-20260924T190500Z
startedAt: "2026-09-24T19:00:00.000Z"
endedAt: "2026-09-24T19:30:00.000Z"
acRefs: []
---
## 0. Summary & Business Rules

Make the sanctioned path for driving workflow state discoverable and unambiguous so agents stop hand-editing machine state. Two layers ship in one release:

- **Tool layer:** per-subcommand `--help` for `ac_ledger.cjs` and `update_state.cjs`, per-row deficiency detail in `score`/`verify` output, boundary-label errors naming expected vs actual plus differing fields, and fail-closed `finish` on phantom `filesTouched` paths (no `ok: true` + non-zero exit ambiguity).
- **Skill-text layer:** golden-path copy-paste commands at each gate boundary in `gates.md` (shared) with pointers in standard `STEP-DISPATCH.md` and lite `SKILL.md`, plus tamper-evidence on `scoreState` (content hash) and explicit hand-edit-unsupported prose.

Deferred by design: the composed `advance --to <step>` command, Group 2 run-state integrity, Group 3 monitor accuracy, scoring weight changes.

### Business Rules

| # | Rule |
|---|------|
| BR1 | `ac_ledger.cjs link` / `score` are the only sanctioned writers of ledger evidence and `scoreState`; `update_state.cjs` is the only sanctioned writer of workflow state. Hand-editing `.state.*` / `ac-ledger.json` is unsupported. |
| BR2 | `score` persists `scoreState`, `verify` is a dry run. This distinction is now printed by `--help`, not only visible in source. |
| BR3 | `finish` with any phantom `filesTouched` path fails without applying (non-zero exit, revision unchanged). Partial phantoms are not silently dropped. |
| BR4 | Every `scoreState` persisted by `ac_ledger.cjs` carries `writer` and `ledgerHash` (canonical JSON hash of the ledger minus `scoreState`); pre-advance gates fail closed on hash mismatch with the remediating command named. Ledgers persisted before this change (no `ledgerHash`) are grandfathered past the hash check but still subject to boundary/score matching. |
| BR5 | Scoring weights are unchanged; only deficiency reporting is added (`deficiencies[]` alongside existing aggregates). |
| BR6 | Portable prose only: no internal tracker numbers in shipped skill bodies, help text, or error strings; no host product names. |
| BR7 | Node-only `.cjs`; CRLF-safe single-line edit anchors; integrity regenerated after any skill-tree edit before tests. |

## 1. AC to file map

| AC | File(s) | Change |
|----|---------|--------|
| AC1 | `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` (`main()` help branch) | Per-subcommand help for `init`, `link`, `sync-plan-index`, `verify`, `score`, `report`: required/optional flags + one example each. Generic usage line kept. |
| AC2 | `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` (`runUpdateCli()` help branch) | Per-operation help for `dispatch`, `finish`, `finish-batch`, `bypass` (+ brief `checkpoint`, `pause-turn`): flags incl. `--modified/--created/--deleted/--noop` + one example each. Generic usage lines kept. |
| AC3 | `ac_ledger.cjs` help text | Help states `--ledger` + positional boundary required, `score` persists vs `verify` dry-run, and `link` evidence flags (`--ledger --event-id --ac/--negative/--gap/--plan-index/--commit`, task/test backfill, `--score-boundary`). |
| AC4 | `ac_ledger.cjs` (`scoreLedger()`, `verify()`, `report()`) | New `deficiencies[]` in score result: per-row `no linked files`, `files[i] missing sha256`, `no mapped tests`, `no tasks or planSections`, per-NS `no observed passing test (caps score at 8)`, plus `score capped at 8: knownDefect` summary when capped. `verify`/`score` stdout carry it; `report` gains a deficiencies section. Included in `scoreState` via existing spread. |
| AC5 | `workflow_state.cjs` (`validateSnapshot()` pre-advance block) | Boundary-mismatch error names expected boundary label, persisted vs derived boundary/score, which fields differ, and the exact `ac_ledger.cjs score --ledger <path> --boundary <label>` remediation. |
| AC6 | `workflow_state.cjs` (`performUpdate()` finish path) | Any phantom path in `filesTouched` throws before any write: names phantom paths, states nothing was applied, tells the agent to fix or drop the paths. Removes the silent-drop NOTICE path for finish (keep `normalizeFilesTouched` return shape; the NOTICE stays only as defense for non-finish callers, of which there are none writing state). New unit test pins exit != 0 with revision unchanged and no `ok: true`. |
| AC7 | `ws-shared/runtime/gates.md` (new shared section) + pointer in `ws-spec-to-pr/STEP-DISPATCH.md` + `ws-spec-to-pr-lite/SKILL.md` | Golden-path copy-paste commands per gate boundary (pre-advance 4/6/7-8/9 standard; implement/review/close lite) using `{skillsRoot}`/`{plansDir}` tokens with `<ledger>`/`<state>` placeholders. |
| AC8 | Manual walkthrough (Step 8 evidence) | Fresh scratch repo exercising init/link/score/finish/pre-advance on documented commands only; recorded in `step-08` result. |
| AC9 | `workflow_state.cjs` validate + `gates.md` prose | `scoreState.ledgerHash` tamper check in the `next >= 6` block (fail closed naming `ac_ledger.cjs score <boundary>`); shared prose stating hand-editing `.state.*` / `ac-ledger.json` is unsupported and naming the sanctioned commands. Covers NEG3 via boundary-mismatch error naming the command. |
| AC10 | `test/test-script-ux-golden-path.js` + `test/test-suites.json` | New suite pins: per-subcommand help content, deficiencies output, boundary-label error content, phantom-finish exit/revision contract, tamper-evidence failure. `npm run test` + `ws-check-harness` green. |

## 2. Design decisions

1. **Phantom semantics (AC6): fail without applying.** Chosen over apply-with-exit-0 because silent drops already caused real debugging time; the fail-closed error names every phantom path and the fix. Verified pre-change behavior live: step 1 finish with a phantom-only `--modified` returns `ok: true`, revision +1, exit 0 with a stderr NOTICE (reproduced 2026-09-24); step 4 additionally fails on empty filesTouched. Post-change, all steps fail before any write.
2. **Tamper hash covers ledger-minus-scoreState** so boundary flips route to the boundary-mismatch error (NEG3) while content edits route to the tamper error. Canonical key-sorted JSON keeps the hash stable across parse/write cycles. Grandfathering avoids hard-failing pre-existing ledgers (e.g. in-flight runs).
3. **`deficiencies[]` is additive.** `errors[]`, score caps, and weights untouched; existing tests asserting current shapes keep passing.
4. **Help stays plain-text stdout**, one example per subcommand; generic usage first line preserved for backward compatibility.
5. **Git history intent** (`git log -S`): `phantom` handling introduced in the dispatch-regex/G2 review-fix commit (accidental gap, no documented intent for silent drop); `must match derived` introduced in a docs/config commit (accidental gap, no intent for label-less errors). Both treated as accidental gaps per the spec Notes.

## 3. Stack & Security Invariants Verification Plan

- Node 22 only; no new scripts (helpers exported from existing modules and covered by the new test file). No Python.
- No tokens, machine paths, or customer data in help text or error strings (redaction path untouched; new strings are static prose + repo-relative paths via `toRepoRelative`).
- Integrity: `npm run generate-integrity` + `npm run verify-integrity` immediately after skill-tree edits, before `npm run test`.
- Ownership: G2/product commits stage only this slug's `files_touched` minus `{plansDir}`; delivery commit per `defaults.deliveryCommitArtifacts` (refined plan only, since no refined plan exists the delivery commit carries the step-01 plan per ARTIFACTS fallback).

## 4. Tasks (sequential, enableDag false)

| # | Task | ACs | Files out |
|---|------|-----|-----------|
| T1 | Per-subcommand help in `ac_ledger.cjs` (+ AC3 semantics prose) | AC1, AC3 | `ac_ledger.cjs` |
| T2 | Per-operation help in `runUpdateCli()` | AC2 | `workflow_state.cjs` |
| T3 | `deficiencies[]` in `scoreLedger` + `report` section | AC4 | `ac_ledger.cjs` |
| T4 | Boundary-label + differing-fields error | AC5 | `workflow_state.cjs` |
| T5 | Phantom fail-closed in finish + `ledgerHash` writer/tamper check | AC6, AC9 | `workflow_state.cjs`, `ac_ledger.cjs` |
| T6 | Golden-path + hand-edit prose in `gates.md`, pointers in STEP-DISPATCH + lite SKILL | AC7, AC9 | `gates.md`, `STEP-DISPATCH.md`, lite `SKILL.md` |
| T7 | New unit suite + registration + integrity regen | AC10 | `test/test-script-ux-golden-path.js`, `test/test-suites.json`, `bin/skill-integrity.json` (+ site rebuild artifacts) |
| T8 | Full verification: `npm run test`, `ws-check-harness`, scratch-repo golden-path walkthrough (AC8), ledger link/score/finish dogfood on this run | AC8, AC10 | step-05/06/07/08 artifacts |

## 5. Risks

- CRLF files: patch via Node replace scripts with single-line anchors; verify with `git diff --stat`.
- `finish` fail-closed may surface latent phantom reliance in other suites: full `npm run test` after T5 decides; adjust only genuinely legitimate flows (none known; non-git temp repos are unaffected since tracking is unavailable there).
- Sibling session owns `pre-ship-doc-sync`: touch only the files in section 1; never stage or read its uncommitted work.
- Version bump once (`npm run build-site:bump`) with ship-scope changes before PR; site rebuild keeps docs in sync.

## 6. Open Questions

None. All spec assumptions confirmed; implementer choices (AC6 fail-without-applying, plain-text help) resolved in section 2.
