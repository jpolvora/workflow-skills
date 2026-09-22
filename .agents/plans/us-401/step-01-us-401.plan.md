# Implementation Plan — us-401: Ownership-scoped git contract for parallel work

## 1. Goal

Generalize the existing fix-pr/revert safety floor into a shared, ownership-scoped
git contract: a session stages only paths it edited, never runs a destructive
whole-tree verb, tolerates a dirty tree from other writers, and advances its
recorded `baselineCommit` forward (fetch + rebase/merge-forward of its own
commits) when the base branch moves — STOPping instead when re-integration would
touch a foreign path.

## 2. Contract (AC mapping)

- AC1 (path-scoped staging): every workflow commit recipe stages explicit paths
  (`git add -- <paths>`, `git add -u -- <deleted-paths>`); broad forms
  (`git add -A`, `git add .`, bare `git add -u`, bare `git add -u --`,
  directory-wide adds) never appear in a shipped executable recipe.
- AC2 (no destructive verbs): no shipped executable recipe authorizes
  `git reset --hard`, `git checkout -- .`, `git restore .`, `git clean -fd`,
  whole-tree `git stash` / `stash pop`, or force-push of a shared branch; each is
  listed as forbidden with no call site.
- AC3 (baseline advancement): on base advance, refresh recorded `baselineCommit`
  to the new tip and re-integrate own commits forward; foreign-path conflict →
  STOP and report overlapping paths, no mutation.
- AC4 (dirty-tree tolerance): runs proceed with foreign dirty paths; they stay
  byte-identical, never staged/stashed/reverted/cleaned.
- AC5 (baseline record): state carries `baselineCommit` + source ref; refresh is
  idempotent when the tip is unchanged.
- AC6 (shared protocol + references): canonical contract doc referenced by
  `ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-spec-multi` (consistent with
  `ws-fix-pr` / `ws-ship-pr`).
- AC7 (regression test): committed test asserts path-scoped recipes, no
  forbidden-verb call site, and foreign-path-untouched behavior.
- AC8 (gates green): `npm run test`, `ws-check-harness` Phases 0–5c,
  `node test/test-harness-clean.js` exit clean.

## 3. Design

One canonical contract doc, pointers everywhere. The full forbidden-verb list and
the baseline-advancement recipe live in exactly one file —
`ws-shared/runtime/git-ownership.md` — so the `check_duplicates.cjs` normative
gate (≥6 repeated lines) cannot trip on copies. Every other touchpoint links to
it instead of restating it:

1. NEW `.agents/skills/ws-shared/runtime/git-ownership.md` — canonical contract:
   ownership rule, forbidden-verb list, path-scoped staging recipe, baseline
   advancement recipe (fetch + compare + foreign-path intersection + rebase or
   merge-forward + STOP rule), dirty-tree tolerance, scope notes (local git only;
   `uswf/*` runtime cleanup and scoped `reset --mixed` to a checkpoint tag are
   explicitly not whole-tree verbs).
2. `ws-shared/runtime/setup.md` § Dirty tree on create-from-base — replace the
   stash-all option with ownership-scoped options (leave foreign dirty paths in
   place and create from current HEAD, or proceed on the new branch with
   `preExistingDirty` recorded; never whole-tree stash). Record `baselineCommit`
   + source ref at bootstrap §6.
3. `ws-spec-to-pr/PROTOCOLS.md` § Safe Revert & Backward Navigation — keep the
   scoped revert mechanics, add a Baseline advancement subsection (forward-only;
   never `reset` back to the original baseline) and a pointer to the canonical
   contract for the forbidden-verb list.
4. `ws-fix-pr/SKILL.md` outer preflight — keep existing behavior (already
   compliant), add a pointer to the canonical contract.
5. `ws-spec-to-pr/scripts/cleanup_workflow_git.cjs` — no whole-tree verb exists
   there (only `uswf/*`-namespaced tag/branch/worktree removal); add a short
   ownership-scope header comment so the intent is explicit. No behavior change.
6. `ws-shared/runtime/workflow-state.schema.json` — declare `baselineCommit`
   (string) and `baselineSourceRef` (string) as optional state properties.
7. NEW `ws-spec-to-pr/scripts/refresh_baseline.cjs` — executable baseline
   advancement: `--state` JSON path + `--base-ref` (default `origin/develop`
   fallback `develop`); fetches, compares tip to `state.baselineCommit`,
   idempotent no-op when unchanged; on advance, intersects
   `HEAD..FETCH_HEAD` paths with `preExistingDirty` + own `files_touched` and
   STOPs (exit 2, overlapping paths listed) on foreign intersection, else updates
   `baselineCommit`/`baselineSourceRef` via dual-write and prints the
   re-integration command for the session's own commits. Node builtins only.
8. `ws-shared/runtime/gates.md` G2-code section — add the forbidden broad-staging
   forms and a pointer to the canonical contract + `refresh_baseline.cjs`.
9. `ws-shared/runtime/tools.md` `commit-code` row — append pointer to the
   canonical contract (one line; recipe unchanged).
10. AC6 pointers (one line each): `ws-spec-to-pr/SKILL.md`,
    `ws-spec-to-pr-lite/SKILL.md`, `ws-spec-multi/PROTOCOL.md` reference the
    canonical contract.
11. NEW `test/test-git-ownership-contract.js` — regression test (AC7): scans
    executable recipes (fenced command blocks in the touched docs + `.cjs`
    sources) for forbidden broad-staging and destructive verbs; asserts the
    canonical contract is referenced by the orchestrators; exercises
    `refresh_baseline.cjs` idempotency (no tip change → no state churn) and the
    foreign-path STOP path in a temp git repo.
12. `bin/skill-dependencies.json` — no new skill id; no change. Integrity
    regenerated (`npm run generate-integrity` + verify) for the new/edited
    hashed content.

Out of scope (per spec): multi-repo orchestration, auto conflict resolution,
branch protection/merge policy, retroactive repair, new provider intents,
worktree isolation redesign.

## 4. Files touched (surgical set)

- NEW: `.agents/skills/ws-shared/runtime/git-ownership.md`
- EDIT: `.agents/skills/ws-shared/runtime/setup.md`
- EDIT: `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`
- EDIT: `.agents/skills/ws-fix-pr/SKILL.md`
- EDIT: `.agents/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.cjs` (comment only)
- EDIT: `.agents/skills/ws-shared/runtime/workflow-state.schema.json`
- NEW: `.agents/skills/ws-spec-to-pr/scripts/refresh_baseline.cjs`
- EDIT: `.agents/skills/ws-shared/runtime/gates.md`
- EDIT: `.agents/skills/ws-shared/runtime/tools.md` (one line)
- EDIT: `.agents/skills/ws-spec-to-pr/SKILL.md` (one line)
- EDIT: `.agents/skills/ws-spec-to-pr-lite/SKILL.md` (one line)
- EDIT: `.agents/skills/ws-spec-multi/PROTOCOL.md` (one line)
- NEW: `test/test-git-ownership-contract.js`
- REGEN: `bin/skill-integrity.json` (+ version bump per repo policy)

Decisions: regression test only for AC7 (no new Phase 5a harness check — the
`or` in AC7 permits this; keeps the harness gate list stable); forward
integration defaults to rebase with merge-forward fallback (spec assumption);
`refresh_baseline.cjs` prints but does not execute the rebase (executing a
rebase inside a helper risks foreign-path mutation; the session runs it after
the helper's STOP check passes).

## 5. Verification

- `node test/test-git-ownership-contract.js` (new; must pass).
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.
- `npm run test` (touched area + full suite before ship).
- `ws-check-harness` Phases 0–5c + `node test/test-harness-clean.js` (0 findings).
- `npm run verify-integrity`.
- Manual: scripted base-advance run in a temp clone proving idempotent refresh
  and foreign-path STOP (covered by the committed test's temp-repo case).

## 6. Stack & Security Invariants Verification Plan

- Runtime: Node 22 only. New helpers are Node `.cjs` (CommonJS `require`), never
  `.py`; no shebang-only invocation — recipes use explicit `node`.
  Verify: `check_unique_runtime.cjs` green + no `.py` under touched paths.
- No new network, auth, or provider surface: `refresh_baseline.cjs` shells only
  to local `git` (`fetch`, `rev-parse`, `diff --name-only`, `status
  --porcelain`); remote name comes from `--remote` (default `origin`) and is
  never interpolated into a shell string (spawnSync argv, no shell).
- No secrets handling: state fields are commit SHAs and ref names; no redaction
  path needed. The helper never prints file contents.
- Injection safety: workflow-id/state-path args are path-validated the same way
  as `cleanup_workflow_git.cjs` (no glob chars, no `..`, no separators in ids);
  git argv passed as arrays.
- False-positive guard (spec Notes): the regression test scopes the
  forbidden-verb scan to executable recipes (fenced command blocks + `.cjs`
  sources), never narrative prose that documents the forbidden list. The
  canonical doc keeps prose lists out of fenced `bash`/`text` command blocks
  where feasible, or the scanner allowlists the canonical doc's own
  documentation blocks by marker.
- Touched framework boundaries: `ws-shared` runtime docs (consumer hub
  contract), `ws-spec-to-pr` scripts (hashed SoT → integrity regen), harness
  `test-harness-clean.js` (read-only addition of no new gates — unchanged).
  Per the High memory trap on managed-runtime moves: this change adds files but
  moves nothing; resolver/bootstrap copies need no sweep (no hub relocation, no
  alias change). Still run the trap's named suites before ship:
  `test-harness-clean` + full `npm run test`.
- Pre-completion: run `scan_stack_invariants.cjs` and the new contract test;
  both must exit 0 before the Step 5 product commit.
