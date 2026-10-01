---
step: 1
slug: us-475
workflowId: us-475-20260930T201858Z
status: completed
acRefs: []
title: Executable foreign-commit guard for shared-head multi-spec batches
startedAt: "2026-09-30T20:18:58Z"
endedAt: "2026-09-30T20:20:00Z"
---
## 0. Summary & Business Rules

On stay-on-develop shared-head batches every worker ships from one branch, so a commit
landing on `develop` from outside the batch silently joins the next item's PR range.
Today the master detects this only by manual re-scan. Deliverable = one executable,
batch-owned guard plus the protocol wiring that makes it authoritative:

1. `foreign_commit_guard.cjs` — a Node-only helper that records a per-dispatch baseline
   of the local and remote `develop` tips, detects an unexpected advance and names the
   new commits, performs the convergence-time PR-head check, and lists foreign commits
   that ride a PR range.
2. `ws-spec-multi` protocol wiring — Phase 4 records a baseline before every dispatch and
   pauses (Resume / Skip / Abort) on an unexpected advance; Phase 4b refuses to merge when
   the PR head differs from the local tip and injects the foreign-commit list into the PR
   body and audit notes.
3. Shared-contract documentation in `git-ownership.md` so the guard is part of the batch
   state machine, not a convention.

Business rules:
- The guard only **reads** git refs; its sole write is the baseline sidecar under the run
  plan folder. It never mutates another writer's commits, never pushes, never resets.
- Quiet path (no foreign commit) adds no gate: an unchanged baseline passes silently (AC7).
- Node-only `.cjs` launched with `node`; no `.py` (harness fails closed on Python).
- Foreign commits are named by full SHA + short SHA + subject; a mismatch refusal names
  both heads.

## 1. Definition of Ready & Scope

**Resolved assumptions (spec, Confirmed = y):** baseline store is the batch state under the
run plan folder; the advance trigger is a local or `origin/*` tip difference from the last
baseline; the convergence check is PR-head == local tip; input validation/auth/concurrency/
idempotency are N/A (git-read-only).

**Measurable ACs:** AC1–AC7 from `step-00-us-475.spec.md`.

**In scope:**
- New `ws-spec-multi/scripts/foreign_commit_guard.cjs` (record-baseline, check-advance,
  check-convergence, list-foreign).
- Baseline store `{plansDir}/{runId}/foreign-commits.json`.
- Phase 4 / Phase 4b wiring in `ws-spec-multi/PROTOCOL.md`; contract rows in `SKILL.md`,
  `STATE.md`; shared rule in `git-ownership.md`; shared-head PR-body note in `ws-ship-pr`.
- `test/test-foreign-commit-guard.js` fixture coverage for AC1–AC7 + NS1–NS3.
- Integrity regenerate + one version bump at ship.

**Out of scope (spec table):** blocking/reverting/rewriting foreign pushes; per-spec feature
branches; distributed baton beyond the same-branch case; base/branch-policy changes.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 / JavaScript). Layers touched:

| Layer | Path | Role |
|-------|------|------|
| skills-sot | `.agents/skills/ws-spec-multi/scripts`, `.agents/skills/ws-spec-multi/*.md`, `.agents/skills/ws-shared/runtime/git-ownership.md`, `.agents/skills/ws-ship-pr/SKILL.md` | guard + wiring |
| tests | `test/test-foreign-commit-guard.js`, `test/test-suites.json` | fixture coverage |
| installer-cli | `bin` / site | integrity + version bump (ship only) |

**Guard CLI (`foreign_commit_guard.cjs`, CommonJS, git-read-only):**

1. `record-baseline --run <state.md> [--slug <slug>] [--branch <b>] [--repo <dir>] [--json]`
   resolves the branch (flag → run frontmatter `branch` → `baseBranch`), captures
   `git rev-parse <b>` and `git rev-parse origin/<b>` (remote `null` when absent), and
   upserts one record per slug in `{runDir}/foreign-commits.json`
   `{schemaVersion, runId, branch, records:[{slug, localTip, remoteTip, recordedAt}]}` (AC1).
2. `check-advance --run <state.md> [--slug] [--branch] [--repo] [--json]` re-reads the tips and
   compares to the slug's baseline. Equal → `{ok:true, advanced:false}` exit 0 (AC7). Changed →
   `{ok:false, advanced:true, local:{from,to,newCommits:[...]}, remote:{...}}` exit 1, naming the
   new commits via `git log --reverse --format=%H%x09%h%x09%s <from>..<to>` (AC2). Missing
   baseline → exit 2 `no-baseline` (fail closed; master always records first).
3. `check-convergence --pr-head <sha> --local-tip <sha> [--repo] [--json]` normalizes both with
   `git rev-parse`; equal → `{ok:true, converged:true}` exit 0 (AC4); differ →
   `{ok:false, converged:false, prHead, localTip}` exit 1 (AC5, names both heads).
4. `list-foreign --base <sha> --head <sha> [--own <sha,sha>] [--repo] [--markdown] [--json]`
   lists commits reachable from head but not base minus the batch's `--own` SHAs; emits a
   `### Foreign commits in range` markdown block for the PR body and audit notes (AC6).

**Protocol wiring:** `PROTOCOL.md` Phase 4 gains a pre-dispatch baseline + check-advance step
and the Resume / Skip / Abort pause menu (AC3); Phase 4b gains the pre-merge convergence check
and the foreign-commit PR-body/audit-note injection. `STATE.md` documents the baseline store
and invariants; `SKILL.md` lists the helper in the Native Tool Contract; `git-ownership.md`
gains a shared-head foreign-commit section; `ws-ship-pr` § Shared-head notes the injected list.

**Not touched:** provider intents, `record_child_outcome.cjs` semantics, ship resolution,
`refresh_baseline.cjs`, consumer `.ws/config.json` schema.

## 3. Step-by-Step Plan

1. **`foreign_commit_guard.cjs`** — four subcommands, git-read-only, baseline sidecar writer,
   fail-closed exit codes, `--json` contract. → AC1, AC2, AC4, AC5, AC6
2. **Protocol wiring** — `PROTOCOL.md` Phase 4 baseline+pause and Phase 4b convergence+foreign
   list; `STATE.md` baseline store; `SKILL.md` contract row. → AC1, AC2, AC3, AC4, AC5, AC6, AC7
3. **Shared contract** — `git-ownership.md` § foreign-commit guard; `ws-ship-pr` PR-body note. → AC6
4. **Tests** — `test/test-foreign-commit-guard.js` temp-repo fixtures; register in
   `test/test-suites.json`. → AC1–AC7, NS1–NS3
5. **Harness / Node-only check** — no `.py`; `test-harness-clean.js` 0 findings. → AC7
6. **Integrity + version bump (ship hygiene)** — `npm run build-site:bump` once,
   `npm run generate-integrity` + `verify-integrity`. → ship hygiene

## 4. Permissions, Tenancy & i18n

N/A — local git ref reads and a local baseline file; no RBAC, tenancy, authZ, or user-facing
i18n. Output is en-us factual JSON/text.

## 5. Test Coverage

| AC / NS | Named check / test | Expected files |
|---------|--------------------|----------------|
| AC1 | `testRecordsBaselineLocalAndRemoteTips` — record-baseline writes both tips for the slug | `foreign_commit_guard.cjs` |
| AC2 | `testAdvanceNamesNewCommits` — a commit between dispatches → exit 1 + new commit sha/subject named | `foreign_commit_guard.cjs` |
| AC3 | `testDocOffersResumeSkipAbort` — PROTOCOL.md surface carries Resume / Skip / Abort on advance | `PROTOCOL.md` |
| AC4 | `testConvergencePassesOnEqualHead` — equal PR head and local tip → exit 0 | `foreign_commit_guard.cjs` |
| AC5 | `testConvergenceRefusesOnMismatch` — differing heads → exit 1, both heads named | `foreign_commit_guard.cjs` |
| AC6 | `testListForeignExcludesOwnCommits` — non-own commit listed, own commit excluded, markdown block emitted | `foreign_commit_guard.cjs` |
| AC7 | `testQuietAdvanceNoGate` — unchanged tips → exit 0 `advanced:false`, no new commits | `foreign_commit_guard.cjs` |
| NS1 | Advance simulation pauses (exit non-zero) rather than proceeding silently | `foreign_commit_guard.cjs` |
| NS2 | Convergence mismatch refuses the merge (exit non-zero) | `foreign_commit_guard.cjs` |
| NS3 | Foreign-commit-free sequential run adds no pause/refusal/extra gate | `foreign_commit_guard.cjs` |

## 6. Stack & Security Invariants Verification Plan

| Invariant | Verification check | Expected files |
|-----------|--------------------|----------------|
| Node-only runtime | `node --check` on the new `.cjs`; no `.py` introduced | `foreign_commit_guard.cjs` |
| Git-read-only guard | source scan: no `git push`/`reset`/`checkout`/`clean`/`add`/`commit`; only `rev-parse`/`log` | `foreign_commit_guard.cjs` |
| Core-ownership contract | guard writes only the run-dir baseline sidecar; never product paths | `foreign_commit_guard.cjs`, `git-ownership.md` |
| Fail-closed gate | `check-advance`/`check-convergence` exit non-zero on unexpected advance / mismatch | `foreign_commit_guard.cjs` |
| Quiet path | unchanged baseline → exit 0 with no new gate | `foreign_commit_guard.cjs` |
