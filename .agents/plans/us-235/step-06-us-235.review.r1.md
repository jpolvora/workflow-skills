---
step: 6
slug: us-235
workflowId: us-235-20260823T151631Z
status: active
startedAt: "2026-08-23T15:16:31Z"
endedAt: "2026-08-23T16:07:43.841Z"
acRefs: []
---
# Code Review Report — us-235 (round 1)

Reviewed committed snapshot only: `git diff main...HEAD` on `feature/us-235` (HEAD `92519dd`). Dirty working-tree files (ws-multi-spec, FEATURES.md, AGENTS.md, docs, package.json, untracked plans) are out of scope.

## Status: Clean (No feedback)

### Diff scope

- `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`
- `.agents/skills/ws-shared/scripts/workflow_state.cjs`
- `.agents/skills/ws-shared/config.json.example`
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`
- `.agents/skills/ws-spec-to-pr/protocols/state-hygiene.md`
- `test/test-ac-ledger.js`
- `test/test-workflow-state-contract.js`
- `bin/skill-integrity.json`

### Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| AC1 | met | `configuredAliases` adds `!/^_/.test(key)`; test omits `_comment_mutationTest` from errors |
| AC2 | met | example config has no `verification._comment_mutationTest`; `_comment_mutationThreshold` kept (does not match `Test$`) |
| AC3 | met | `ALIAS_SKIP_REASONS`; invalid `skipReason` throws at `link` |
| AC4 | met | skipped alias does not emit `lacks observed result` |
| AC5 | met | skip + `exitCode: 2` → `knownDefect === false` and score > 8 |
| AC6 | met | `backendFormat` `skipReason: baseline-dirty` accepted; no auto path-diff (deferred by plan) |
| AC7 | met | pre-advance 6 fails when `backendFormat` row is missing; stderr includes `lacks observed result: backendFormat` |
| AC8 / AC15 | met | score 9, `knownDefect` false, `scoreState.boundary === 'pre-step6'`, skip present → validate `--pre-advance 6` exit 0 |
| AC9 | met | `.runtime` `score.cjs` / `invert.patch` / `notes.md` allowed; `helper.txt` still `unknown .runtime residue` |
| AC10 / AC11 | met | `run.json.stateSha256` equals `stateIdentityHash` (frontmatter), differs from full-file hash; `## Gate history` append still validates |
| AC12 / AC13 | met | `finish --commit abcdef1` writes `{ sha, step }`; second finish same SHA does not duplicate |
| AC14 | met | fixture treats `_comment_mutationTest` as documentation, not a required alias |

Policy (locked, not a defect): `skipReason` counts as observed; a truly missing required alias still fails pre-advance 6 via copied `derived.errors`.

### Defect-class sibling sweep

- `knownDefect` from non-zero alias exits: both sites honor `isSkipped` (`scoreLedger` per-alias loop and `aliasResults.some`). No other `aliasResults.some` / `Build|Test|Format` required-alias collector in `.agents/skills`.
- `stateSha256` identity: all three former full-file sites use `stateIdentityHash` (`performUpdate` write, `validateSnapshot`, `rebuildIndex`). `parseFrontmatter` LF-normalizes before hashing inner YAML.
- Exemption: Python `update_state.py` unchanged (plan: Node shared module only; lite inherits `workflow_state.cjs`).

### MEMORY sweep (Medium+)

| Trap | Verdict |
|------|---------|
| Cooperative fix must sweep the defect class | Both `knownDefect` sites and three hash sites in the same commit |
| Windows fsync EPERM on read-only temp files | `atomicWrite` unchanged (`'w'`, ignore `EPERM`/`EINVAL`) |
| skill-integrity.json CRLF fails --check | committed `bin/skill-integrity.json` has `crlf == 0` |
| stamp_state_version must not keep unknown highs | still `STATE_VERSION` literal; not `max(current, schema)` |
| Nested-quote python -c | tests use Node `harness-test-utils.cjs` / exported `parseFrontmatter` |
| Local skills only / dual-install | edits are `$PWD/.agents/skills/**` only |
| Node port tests must migrate with recipes | runtime + focused tests in the same commit |
| Merge conflict staging — never git add -A | product commit is path-scoped (`92519dd`) |
| Multi-spec worker HEAD | review HEAD is `feature/us-235` |

No confirmed MEMORY violation in this diff.

### Invariants / patterns / fable

- `commitPlanFilesOnlyAtStep8`: plan artifacts not in the product commit.
- Tenancy / EF / i18n: N/A (Node harness; frontend `none`).
- `backend.md`: empty patterns log; no Domain/EF rules apply.
- Frontend patterns: no UI files in the diff.
- Fable inline (enabled + autoAudit): no weakened missing-alias check; no false completion vs AC1–AC15; no committed scope creep into CATALOG/FEATURES/AGENTS; no unauthorized global-skills edit.

### Verification

- `node test/test-ac-ledger.js` exit 0
- `node test/test-workflow-state-contract.js` exit 0

**Apply fixes?** No. Round 1 is clean.

No feedback
