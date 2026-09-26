---
id: null
slug: workflow-session-leases
title: "Cooperative session leases for parallel agents on one worktree"
source: local
specDate: 2026-08-22
status: retired
---

> **RETIRED (0.3.38):** Session leases were removed from the shipped product. This spec is historical only. Parallel agents on one worktree should use git worktrees (`plans.useWorktrees`), not lease files or `session_lease.cjs`. Run `npx --yes github:jpolvora/workflow-skills update` to prune stale `session-lease.schema.json` and `defaults.sessionLeases` from consumer `ws-shared/`.

# Specification — Cooperative session leases for parallel agents on one worktree

## Description

Prevent two chat sessions from destroying each other's git HEAD, plan state, or the same spec/plan run when they share one working tree.

Today several chats can start `ws-spec-to-pr*` on the same repo and branch. `{plansDir}/index.json` and `{us-dir}/run.json` already list workflow status, but they are not liveness leases: abandoned runs stay `active`, two sessions can claim the same slug, and nothing serializes `git checkout` / `commit` / `reset` / `push`. MEMORY already records the failure mode: a worker keeps editing after another process checks out `develop`.

A single repo-root PID that records every agent and forces wait-until-idle is **not** the recommended design. It over-serializes unrelated specs, races on one file, goes stale when a chat dies, and still shares the working tree so waiters resume into someone else's dirty files.

**Recommended design:** cooperative **session leases** (advisory, heartbeat, TTL) plus a **short git critical-section lock**. Isolation for true parallel independent work stays **git worktrees** (`plans.useWorktrees`), not a mutex.

| Approach | Verdict | Why |
|----------|---------|-----|
| Repo-root PID / one wait file | Reject as SoT | Contended, stale, serializes unrelated work, does not isolate files |
| `{plansDir}/index.json` as the lock | Reject as SoT | Already a derived catalog; two writers already race the whole file |
| `ws-multi-spec` sequential queue | Insufficient | One session only; a second chat still starts a second orch |
| Per-session lease files + same-slug exclusive + git lock | **Adopt** | Atomic create, TTL reclaim, blocks duplicate US/plan, serializes only destroyable git |
| Session worktrees / extra clones | Optional isolation | Real file isolation; keep opt-in via `useWorktrees`; do not require it for this spec |

Lease files live under `{plansDir}/.runtime/leases/` (already gitignored). Status vocabulary reuses workflow-state values plus lease-only `stale`. Heartbeat is script-driven on orch transitions, not an LLM tick. Same-slug acquire is exclusive while a lease is live. Different slugs on the same worktree may proceed after a `user-gate` warn; they must still take the git lock around destroyable git.

### Design Intent

Keep `{plansDir}/index.json` and `{us-dir}/run.json` as derived run catalogs. Add a separate liveness layer so bootstrap and git recipes can fail closed on a live conflicting lease. Do not replace worktrees, `ws-multi-spec`, or product-commit order. Do not invent a second workflow status enum.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Repo-root `.ws.pid` / single wait-until-all-idle file as the lock SoT | Contended, stale, over-serializes unrelated specs |
| Kernel/OS mandatory locks that a non-cooperating host can ignore | Skills are advisory; hosts do not load this file |
| Default-on session worktrees or extra clones | Isolation already exists as `plans.useWorktrees`; this spec is the shared-tree guard |
| Changing `ws-multi-spec` from sequential to parallel | Batch orch is already one-at-a-time; the gap is extra chats |
| Host chat-window IDs as the lease primary key | Not portable across agents/IDEs |
| Replacing `{plansDir}/index.json` or `run.json` | Catalogs stay; leases are liveness only |
| Product-commit order, Step 8 `{plansDir}` staging, or DAG file-overlap rules | Orthogonal |
| Cross-machine / network-share leases | Same-repo local worktree only |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|-----------------------|----------------|-----------|------------|
| Lease directory | `{plansDir}/.runtime/leases/` | Root `.gitignore` already ignores `.agents/plans/**/.runtime/` | y |
| Status vocabulary | `active`, `paused`, `completed`, `cancelled`, `failed`, `stale` | Reuse workflow-state; map user "running/stopped/finished" onto these | y |
| Heartbeat TTL | 15 minutes after `heartbeatAt` | Abandoned chats must not block forever; orch transitions refresh | y |
| Same-slug policy | Exclusive while live; resume reattaches the caller's lease | Prevents two orchs on one US/plan/spec | y |
| Different slug, same worktree | Warn via `user-gate` (Wait / Proceed with git lock / Abort); never silent global wait | Unrelated specs should not deadlock | y |
| Git lock scope | checkout, switch, reset, stash, merge, rebase, commit, push | Destroyable git only; file edits outside those commands are not locked | y |
| Git lock TTL | 2 minutes | A hung commit must not freeze the repo | y |
| Default enable | `defaults.sessionLeases` true when the key is omitted | Fail closed on duplicate slug; opt out in config | y |
| Atomic write | Exclusive create + rename; ignore Windows `fsync` `EPERM`/`EINVAL` | Matches MEMORY trap on `atomicWrite` | y |
| Agent identity | Generated `leaseId` UUID; optional `label` string | Host session ids are not portable | y |

**Open questions:** none.

## Acceptance Criteria

- AC1: `{sharedDir}/session-lease.schema.json` exists with required keys leaseId, slug, workflowId, status, heartbeatAt, expiresAt, pid, and worktreePath.
- AC2: Lease `status` enumerates only `active`, `paused`, `completed`, `cancelled`, `failed`, and `stale`.
- AC3: Live lease files are written under `{plansDir}/.runtime/leases/{leaseId}.json`.
- AC4: A same-slug exclusive lock file `{plansDir}/.runtime/leases/slug-{slug}.lock` stores the holding `leaseId`.
- AC5: `node {skillsRoot}/ws-spec-to-pr/scripts/session_lease.cjs acquire --slug {slug}` creates the lease file with exclusive create.
- AC6: `acquire` for a slug whose live lock is held by a different `leaseId` exits non-zero with `conflict=same-slug`.
- AC7: `acquire` for the caller's existing `leaseId` on that slug refreshes `heartbeatAt` without creating a second lock.
- AC8: `heartbeat` on a held lease rewrites `heartbeatAt` and `expiresAt` (TTL 15 minutes from the write).
- AC9: `prune` marks a lease `stale` and deletes its slug lock when `expiresAt` is in the past.
- AC10: `release` sets status to `completed` or `cancelled` and removes the slug lock when it still names that `leaseId`.
- AC11: Standard and lite orch bootstrap call `acquire` before Step 0 or resume when `defaults.sessionLeases` is not explicit `false`.
- AC12: Bootstrap `user-gate` options for a same-slug conflict are Resume that lease, Wait, and Abort.
- AC13: Bootstrap `user-gate` options for a different live slug on the same worktree are Wait, Proceed, and Abort.
- AC14: `session_lease.cjs git-lock` exclusive-creates `{plansDir}/.runtime/git.lock` with TTL 2 minutes.
- AC15: Orch git recipes for checkout, reset, stash, merge, rebase, commit, and push call `git-lock` before the git command.
- AC16: `git-lock` wait polls at most 60 seconds then exits non-zero instead of waiting forever.
- AC17: `{plansDir}/index.json` is not the exclusive-create lock SoT for slugs or git.
- AC18: No tracked repo-root PID or wait file is introduced as the lease registry.
- AC19: `test/test-session-lease.js` covers exclusive same-slug acquire, TTL prune, heartbeat refresh, git-lock timeout, and omitted-config default on.
- AC20: `FEATURES.md` describes session leases as same-slug exclusive plus git critical-section, not a global wait-PID.

## Original Issue Context

Free-text request (2026-08-22): add a project-root temporary PID-like file that records agents/plans/tasks in execution (`running`, `completed`, `paused`, `stopped`, `finished`, …), with heartbeat/watchdog, so parallel chats wait before destroyable work and two agents cannot run the same US/plan/spec. Also analyze whether that feature is recommended versus other ways to handle parallel agents.

### Prior Work Sweep

- `{plansDir}/index.json` (schema `plans-index.schema.json`) already lists workflowId, slug, status, runPath. Several rows stay `active` after the chat is gone. Not a liveness lock.
- `{us-dir}/run.json` is per-plan derived state. No heartbeat. No cross-session mutex.
- `plans.useWorktrees` (default `false`) isolates Step 4 inside one workflow; PROTOCOLS.md caps one active worktree. It does not stop a second chat on the primary tree.
- `ws-multi-spec` runs specs sequentially inside one orch session. A second chat still starts another orch.
- MEMORY 2026-08-12: "Multi-spec worker HEAD can leave the assigned feature branch" — checkout/stash from a sibling process. Re-check HEAD; never `git add -A`.
- MEMORY 2026-08-21: Windows `fsync` `EPERM` on read-only temp files — lease writes must use the existing atomicWrite pattern.
- Root `.gitignore` already ignores `.agents/plans/**/.runtime/`.
- Related specs: `workflow-bootstrap-feature-branch.spec.md` (bootstrap gate, not concurrency), `add-enable-dag-config.spec.md` (in-run task parallelism), `workflow-cleanup-and-branch-protection.spec.md` (post-run uswf cleanup). No open duplicate for cross-session leases.
- No open GitHub PR for a repo-root PID or session lease (keyword sweep: lease, pid, concurrent agent).

### Design Intent

Add an advisory liveness layer beside the existing catalogs. Fail closed on duplicate slug. Serialize only destroyable git. Warn, do not globally deadlock, when two live slugs share a worktree. Keep worktrees as the isolation option.

## Notes

Status mapping from the request: `running` → `active`; `paused` → `paused`; `stopped`/`finished`/`completed` → `completed` or `cancelled`; expired heartbeat → `stale`. Do not ship a parallel enum.

`defaults.sessionLeases: false` disables acquire and git-lock (tests, nested helpers). Omitted key means enabled.

Suggested later orch (not this spec): `/ws-spec-to-pr-lite` or `/ws-spec-to-pr` after `ws-local-spec-provider --register`.
