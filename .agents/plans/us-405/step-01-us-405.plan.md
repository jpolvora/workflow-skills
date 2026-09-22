---
slug: us-405
title: Ship phase leaves source issue open when baseBranch is not the repo default branch
status: completed
step: 1
workflowId: us-405-20260922T203800Z
startedAt: "2026-09-22T20:38:00.000Z"
endedAt: "2026-09-22T20:43:59.369Z"
acRefs: []
---
# Implementation Plan — us-405

## 0. Summary & Business Rules

Close the gap where Spec-to-PR deliveries that merge into a non-default `project.baseBranch` leave the linked tracker item OPEN because GitHub only honors `Closes #N` when the PR base is the repository default branch.

Business rules:

1. **Explicit close intent** — add required SCM intent `close-issue` (GitHub `gh issue close`; Azure DevOps work-item state transition to a terminal Closed/Done state) with the same parity rules as existing intents.
2. **Invoke after merge** — when a PR is merged and `activeThreads == 0`, callers dispatch `close-issue` by intent name (not host CLI). Keep the PR-body `Closes #N` line for default-branch auto-close.
3. **Comment ≠ close** — `comment-issue` (alias `close-loop`) stays comment-only; docs state that explicitly.
4. **Skip / dry-run** — `source: local` / `id: null` → exit 0 `skipped`; parent `dry-run` prints the planned close with no remote mutation.
5. **Parity** — `node test/test-provider-parity.js` passes with the new required intent on both implementers (no allowlist unless a host truly cannot mirror).

Design intent preserved from `174f2f44`: retain `Closes #{id}` in the PR body; this plan adds the missing explicit close, it does not reverse that keyword guarantee.

## 1. Definition of Ready & Scope

- Spec of record: `.agents/specs/0124-us-405.spec.md`. Workflow copy: `.agents/plans/us-405/step-00-us-405.spec.md` (AC1–AC6).
- Stack: `node-skills-package` (Node 22 skill harness). No matching `stacks/*.md` pack for auth/DTO/subscription dimensions; §6 uses harness Node-only / provider-parity / no-silent-fallback invariants instead.
- Resolved assumptions (from spec + orch goal):
  - Invoke `close-issue` **unconditionally** after a successful merge when threads are zero (not only when base ≠ default).
  - Retain `ensure_pr_closer.cjs` / `Closes #N`.
  - GitHub primitive: `gh issue close`; ADO: WIT state PATCH to Closed/Done.
- Out of scope (per spec): changing base-branch selection; closing on unmerged/closed-without-merge PRs; bulk-closing historically stranded issues; changing comment body format; deleting `project.workingBranch` on merge.

## 2. Technical Design & Architecture

Layers (`config.json` → `stack.backend.layers`):

| Layer | Path | Edit |
|-------|------|------|
| skills-sot | `.agents/skills` | Contract, both SCM providers (`SKILL.md` / `INTENTS.md` / new `close_issue.cjs`), `ws-ship-pr` merge path, orch Step 9 prose, `tools.md` |
| tests | `test` | Parity required-intent list + close_issue skip/dry-run assertions (extend `test-provider-parity.js`; optional focused helper test) |

No `.py`. Node-only `.cjs` helpers. No `config.schema.json` / GUI editor change.

**Intent contract (`close-issue`):**

| Field | Contract |
|-------|----------|
| Input | tracker id (`--id`) |
| Output | JSON `{ status: ok\|skipped\|dry-run, … }` |
| Skip | `--id null` / empty / non-integer → exit 0 `skipped` (same as `comment-issue`) |
| Dry-run | print planned close; no `gh` / REST mutation |
| Auth | `validate-auth` before mutate; STOP on failure; no silent provider fallback |
| GitHub | `spawnSync('gh', ['issue', 'close', String(id)], …)` after auth |
| ADO | PATCH WIT `System.State` to a terminal closed state (`Closed` preferred; `Done` if process rejects `Closed`); reuse org/project/PAT resolution pattern from `comment_issue.cjs` |

**Caller wiring:**

1. **`ws-ship-pr` Step 7 (Merge)** — after successful `merge-pr`, when tracker `id` is present: keep existing merged-follow-up `comment-issue`, then dispatch **`close-issue`** (`--dry-run` when parent dry-run). Merge already requires Step 6 convergence (`activeThreads == 0` + green checks), so the threads gate is satisfied by the existing merge preconditions.
2. **Orch Step 9 / in-session merge** — `STEP-DISPATCH.md` (and any matching Step 9 merge prose) currently says `comment-issue` on in-session merge; add sibling **`close-issue`** after merge when tracker id present (workflow mode uses `stopBeforeFixPr`, so merge is not inside `ws-ship-pr`).
3. **`ensure_pr_closer.cjs`** — unchanged behavior; docs clarify it is default-branch auto-close insurance, not the sole close mechanism.
4. **`comment-issue` scripts** — no state-change code; docs explicitly say comment-only.

**Defect-class sibling sweep (bug-fix):** grep for `Closes #`, `ensure_pr_closer`, `comment-issue` / `close-loop`, and required-intent inventories (`scm-provider-contract`, `test-provider-parity.js`, `docs/faq.md`, `tools.md`, STEP-DISPATCH Step 8/9) so no caller still documents auto-close-only for non-default bases.

## 3. Step-by-Step Plan

1. **Contract row (AC2)** — Edit `.agents/skills/ws-shared/runtime/scm-provider-contract.md`:
   - Add required intent `close-issue` (input: tracker id; output: closed / skipped / dry-run; behavioral guarantee: GitHub `gh issue close`; ADO state transition; skip null/local; dry-run prints only; validate-auth before mutate).
   - Clarify `create-pr` row: `Closes #{id}` remains for GitHub default-branch auto-close; explicit `close-issue` covers all bases after merge.
   - Clarify `comment-issue` row: comment-only; does **not** change tracker state (AC4).
2. **GitHub implementer (AC2, AC5)** — NEW `.agents/skills/ws-spec-provider-github/scripts/close_issue.cjs` mirroring `comment_issue.cjs` skip/dry-run/auth shape; recipe `gh issue close {id}`. Update `SKILL.md` intent table + `INTENTS.md` `## \`close-issue\`` heading with recipe and guarantees.
3. **Azure DevOps implementer (AC2, AC5)** — NEW `.agents/skills/ws-spec-provider-azure-devops/scripts/close_issue.cjs` (WIT PATCH state transition; same skip/dry-run/auth/override flags as ADO `comment_issue.cjs`). Update `SKILL.md` + `INTENTS.md` in lockstep. Do **not** allowlist unless a host capability blocks mirroring.
4. **Tools vocabulary (AC2, AC4)** — Edit `.agents/skills/ws-shared/runtime/tools.md`: add `close-issue` row (state transition); keep `comment-issue` / `close-loop` as comment-only alias wording.
5. **Ship merge invocation (AC1, AC3)** — Edit `.agents/skills/ws-ship-pr/SKILL.md` Step 7: after successful `merge-pr` + existing `comment-issue` follow-up, dispatch `close-issue` when tracker id present; note that `Closes #N` from Step 5/`ensure_pr_closer.cjs` is retained. Update Dependencies line so close is intent-name, not `gh` embedded in ship.
6. **Orch Step 9 sibling (AC1, AC3 — defect-class sweep)** — Edit `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` Step 9 (and faq required-intent list if present) so in-session merge dispatches `close-issue` after `comment-issue`. Sweep lite/multi docs only if they restate the merge close assumption.
7. **Parity + unit coverage (AC5, AC6)** — Update `test/test-provider-parity.js`: add `close-issue` to the hard-coded required list; assert both providers have table/heading + `scripts/close_issue.cjs` with `--dry-run`, `skipped` on `--id null`, and no state mutation inside `comment_issue.cjs`. Add/extend a small scripted assertion for dry-run JSON (print-only). Sabotage: when mutation testing is unset, Step 7 later runs `run_sabotage.cjs` against the close path invariants (skip must not call host; dry-run must not PATCH/close).
8. **Release hygiene** — After product edits (implementation phase): `npm run generate-integrity` + `verify-integrity`; version bump once per release PR; `npm run test` including parity; no config/GUI change.

## 4. Permissions, Tenancy & i18n

N/A (package harness; no RBAC/tenancy/i18n). Skill bodies, gates, and banners stay en-us. Tracker comments/close payloads remain anonymized (no private paths/hostnames).

## 5. Test Coverage

| AC | Test / verification |
|----|---------------------|
| AC1 | V1:ship-merge-close — after merge with `activeThreads == 0`, GitHub issue reaches CLOSED even when PR base ≠ repo default (manual/telemetry: `gh issue view {id} --json state`; fixture or documented verification delivery). Contract + ship Step 7 / Step 9 prose require the explicit intent call. |
| AC2 | V2:parity-intent — `node test/test-provider-parity.js` asserts `close-issue` in contract Required intents and both `SKILL.md` / `INTENTS.md`; both `close_issue.cjs` exist. |
| AC3 | V3:ship-docs-invoke — assert `ws-ship-pr/SKILL.md` Step 7 names `close-issue` after merge; `ensure_pr_closer` / `Closes #` still present for create-pr path. |
| AC4 | V4:comment-only — assert `comment_issue.cjs` (both providers) still has no `issue close` / state PATCH; contract + INTENTS + tools.md state comment-only. |
| AC5 | V5:skip-dry-run — `close_issue.cjs --id null` → exit 0 `skipped`; `--dry-run` with real id → exit 0 print-only (no host mutation). |
| AC6 | V6:parity-gate — `node test/test-provider-parity.js` exit 0 (or documented allowlist row with host-capability reason — prefer none). |

Negative scenarios mapped:

| Negative | Coverage |
|----------|----------|
| Neg1 non-default base without fix | Pre-fix red; post-fix green via AC1/V1 |
| Neg2 id null | V5 skip |
| Neg3 dry-run | V5 dry-run |
| Neg4 auth failure | Script STOP with validate-auth remediation (mirror `comment_issue.cjs`) |
| Neg5 closed-without-merge | No `close-issue` on create-pr / unmerged paths (only post-merge call sites) |

## 6. Stack & Security Invariants Verification Plan

Stack id `node-skills-package` has no `stacks/*.md` pack. Apply harness boundaries:

| Boundary | Check |
|----------|-------|
| Node-only runtime | New helpers are CommonJS `.cjs`; no `.py`; invoke with explicit `node` |
| No silent SCM fallback | Auth failure STOPs; never switch GitHub ↔ ADO |
| Dry-run / skip safety | Mutating host calls gated behind non-dry-run + valid id |
| Intent-name callers | `ws-ship-pr` / Step 9 call `close-issue` by name; no embedded `gh`/`az` in ship orch prose beyond provider scripts |
| Portability | Docs use `{skillsRoot}` / `{plansDir}`; no host product coupling |
| Integrity | Hashed skill edits → regenerate + verify in the same ship commit |
| Config GUI sync | No schema/example change → PowerShell editor untouched |
| Sibling sweep | Repo-wide search for auto-close-only assumptions; update intent inventories |
| Sabotage | When `verification.mutationTest` unset, `run_sabotage.cjs` covers skip/dry-run non-mutation |

Touched framework boundaries from the stack pack list: **authorization** → `validate-auth` before close; **input validation** → id parse + skip; **async safety** → sync `spawnSync` / existing `fetchRetry` patterns only (no new floating promises); **subscription cleanup** → N/A.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills SoT + tests only).
- [ ] Domain entities / migrations N/A.
- [ ] Authorization: validate-auth on mutating close path.
- [ ] Stack & security invariants verified (Node-only, skip/dry-run, parity, no silent fallback).
- [ ] i18n N/A.
- [ ] Test cases cover AC1–AC6 + negatives.
- [ ] Integrity regenerated + verified; version bumped once; harness clean.

## 8. Open Questions

- ADO terminal state: prefer `Closed`, fall back to `Done` when the process template rejects `Closed`? **Plan default: yes** (document in ADO `INTENTS.md`); interview may confirm if a fixed single state is preferred.
- Should lite `ws-spec-to-pr-lite` close/ship docs get a one-line `close-issue` pointer if they only say `comment-issue` today? **Plan default: yes if they restate the merge close path** (sibling sweep); otherwise leave untouched.
- Human companion (`ws-spec-translate-to-human`): skipped this Step 1 turn (orch asked for plan artifact only).
