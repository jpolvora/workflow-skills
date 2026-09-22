---
step: 6
slug: us-405
workflowId: us-405-20260922T203800Z
status: completed
startedAt: "2026-09-22T20:38:00.000Z"
endedAt: "2026-09-22T20:57:42.396Z"
acRefs: []
---
# Code Review — us-405 (Step 6, round 1)

**Scope:** commits `d5e2da2f` + `cc94aa2f` on `develop` (`main...HEAD` product slice for close-issue). Primary snapshot: committed range only (dirty `{plansDir}` / hub files ignored).

**Stack:** `node-skills-package` (no matching `stacks/*.md` auth/DTO pack). Rule pack fallback scan: `typescript-node` via `scan_stack_invariants.cjs` — 0 issues on us-405 product files.

## Phase 1 — Triage hypotheses

1. `close-issue` missing from contract / one provider / parity required list?
2. Ship or STEP-DISPATCH still rely on `Closes #N` alone, or Create-PR path wrongly closes?
3. `comment-issue` / `close-loop` mutated to close state?
4. Skip (`id: null`) or `--dry-run` mutates tracker / requires auth?
5. GitHub close non-idempotent after default-branch auto-close (blocks merge path)?
6. ADO close missing Closed→Done fallback or silent provider fallback?

## Phase 2 — Proof outcomes

1. REFUTED — `scm-provider-contract.md` requires `close-issue`; both `SKILL.md` / `INTENTS.md` implement; `test/test-provider-parity.js` lists it and both `scripts/close_issue.cjs` exist. Parity exit 0.
2. REFUTED — `ws-ship-pr` Step 7 Merge dispatches `close-issue` after merge + comment-only follow-up; Step 5 Create PR keeps `Closes #N` / `comment-issue` only. `STEP-DISPATCH.md` Step 9 + lite Step 5 mirror merge → comment → close. `test-close-issue.js` asserts Create PR has no `` `close-issue` `` and Merge does.
3. REFUTED — both `comment_issue.cjs` remain comment-only (parity asserts no `issue close` / no `System.State`); contract + `tools.md` + INTENTS state comment-only.
4. REFUTED — both close scripts skip null/empty/non-integer with exit 0 `skipped`; `--dry-run` returns before auth/host mutation. Focused test exit 0 (incl. ADO mutate-without-PAT → non-zero + `validate-auth`).
5. REFUTED — live `gh issue close` on already-CLOSED #402 exits 0 (`already closed`); INTENTS idempotency claim holds.
6. REFUTED — ADO tries `Closed` then `Done` on HTTP 400; auth failure STOPs with `validate-auth`; no cross-provider fallback.

### Stack Invariant Compliance

- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` — exit 0, 0 Critical / 0 Warning on scanned files.
- `config.json.verification.localReviewCommand` empty — dry-run reviewer skipped.
- MEMORY sweep: no Medium+ trap matched close-issue / comment-only / skip-dry-run product paths for this diff.

## Findings

No feedback

## Verdict

**APPROVE** — 0 Critical, 0 Warning. No product-tree review fixes. Advance allowed.

**Apply fixes?** No — clean review.

Observed checks: `node test/test-close-issue.js` exit 0; `node test/test-provider-parity.js` exit 0.
