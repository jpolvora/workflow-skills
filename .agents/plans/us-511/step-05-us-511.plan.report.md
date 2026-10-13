---
step: 5
slug: us-511
workflowId: us-511-20261013T040003Z
status: completed
verificationScore: 9
startedAt: "2026-10-13T04:06:00.000Z"
endedAt: "2026-10-13T04:06:00.000Z"
acRefs: []
---
# Check-Implementation Report — us-511

**Slug:** us-511 · **Workflow id:** us-511-20261013T040003Z
**Plan of record:** `step-02-us-511.plan.refined.md`
**Verification score:** **9 / 10** (≥ `defaults.minVerifyScore` 9 → advance)

## Evidence commands (observed, cited exit codes)

| Command | Result |
|---------|--------|
| `node --check .agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs` | exit 0 |
| `node --check .agents/skills/ws-fix-pr/scripts/fetch_threads.cjs` | exit 0 |
| `node test/test-fetch-threads-token-fallback.js` | exit 0 — 40 assertions OK |
| `node test/test-provider-parity.js` | exit 0 (incl. `activeThreads` literal anchor) |
| `node test/test-skills-runtime-resolution.js` | exit 0 (`HUB_SCRIPTS_DIR` candidate chain intact) |
| `npm run test` | exit 0 — all 166 entries passed (`mode=local`) |
| `node test/test-harness-clean.js` | exit 0 — 0 findings |
| `npm run verify-integrity` | exit 0 — manifest matches tree |

## AC coverage

| AC | Assertion | Evidence |
|----|-----------|----------|
| AC1 | four-link order | `resolveToken()` env chain then `execSync('gh auth token', …)`; new test Cases A/B |
| AC2 | env token short-circuits CLI | Case A: stub marker file absent; header carries env sentinel |
| AC3 | CLI fallback attempted after miss | Case B: stub marker present |
| AC4 | CLI token in `Authorization` header | Case B: captured `Authorization: Bearer <cli-sentinel>` |
| AC5 | non-zero + actionable message | Case C/D/E: exit 1, message names `gh auth login` + three variables |
| AC6 | no zero-thread success on failure | Cases C/E: message absent, exit non-zero, no request |
| AC7 | capture stdout / discard stderr | Case B: recorded header carries stdout token; stub stderr absent from output |
| AC8 | token never printed/logged/persisted | Cases A/B: sentinels absent from stdout/stderr and from `{repo}`; no new files |
| AC9 | shim keeps forwarding, no token logic | `SHIM` source has `spawnSync`, no `gh auth token`; success/failure forwarded |
| AC10 | shim propagates non-zero + error text | Case H: shim exit non-zero, stderr names `gh auth login` |
| AC11 | `validate-auth` documents the chain | `INTENTS.md` updated to the four-link chain |
| AC12 | non-secret source diagnostic | Case B: stderr names `gh auth token` |
| AC13 | legitimate zero-thread success preserved | Case F: exit 0, documented message printed |
| AC14 | `--json` payload keys frozen | Case A: `prNumber`/`owner`/`repo`/`cooperativeContract`/`activeThreads` |

Negative scenarios NS1–NS11 are covered by the new test (see the module's `NS*` assertions).

## Notes / deviations

- **Zero-thread message wording:** the spec paraphrase reads
  `No active unresolved threads found.`; the shipped script prints
  `No active unresolved review threads found.`. The test asserts the **actual** message
  (present on success, absent on the failure path). No behavior change was made — this is
  a spec-text paraphrase, and the zero-thread path is out of scope for edits.
- **NS1 "gh absent":** the CLI-absent case is simulated with a `PATH` `gh` stub that exits
  127 with no output (the spec's sanctioned stub seam), because the host ships a real `gh`.
  This is the same failure bucket the spec groups ("unavailable, exits non-zero, or empty").
- **NS11 "no package.json change":** interpreted as no dependency change (the mandatory
  one-time version bump is a separate ship-scope change). `dependencies` remains empty;
  `devDependencies` is still `c8` only.
- **Source-restore:** `register_local_spec.cjs` defaults `source` to `local`; both the spec
  of record and the workflow copy were restored to `source: github` (this is a GitHub issue).

## Verdict

All AC1–AC14 mapped and observed; negative scenarios executed red-first then green;
regression anchors and the full suite pass. **Score 9/10** (deduction: NS1 CLI-absence is
simulated via a stub exit rather than a literal PATH removal). Advances to Step 6.
