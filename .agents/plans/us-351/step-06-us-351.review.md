# Code Review — us-351 (worker self-review, Step 6)

Scope: consumer-hub relocation `.agents/skills/ws-shared` → `{projectRoot}/.ws`
(scripts' installed-location probe, installer relocation, test re-hubbing, docs, dogfood).
Full `git diff HEAD` read in hunks; no test edits for behavior, no unrelated refactors.

## Findings

None blocking. Notes (accepted, no fix round):

1. **Duplicated probe text** (`HUB_SCRIPTS_DIR` IIFE in ~40 `.cjs`, `_SHARED_SCRIPTS`
   in 11 `.py`): deliberate. The managed runtime cannot be reached through a shared
   module before the first require/import resolves, so each entry point computes its
   installed location locally. Single canonical text; packaged-first order preserves
   the upstream dev loop (live SoT sources, never stale `.ws` copies).
2. **Mixed LF/CRLF**: edited files keep their on-disk endings (LF inserts in CRLF
   files where multi-line match failed); `node --check` + `py_compile` green everywhere,
   suite green. No normalization (would explode the diff).
3. **Leave-both collision corner**: when legacy hub and `.ws/` coexist with a stale
   legacy `runtime/`, packaged-first probe prefers the legacy tree. Installer removes
   the emptied legacy dir in the normal path; the corner needs manual removal (installer
   message says so). Pinned by the new collision test (never overwrites current `.ws`).
4. **Pre-existing scanner findings** (3 floating-promise Criticals in two test files):
   untouched lines, out of scope, suite does not gate on them. Recorded in Step 5.

## Checks

- Surgical diffs: every hunk traces to hub relocation (probe, fixture re-hub, doc/link
  retarget, relocation logic, sweep/contract tests). No adjacent refactors.
- Secrets: no credentials/tokens/keys in diff (marker scan clean; diff is paths,
  comments, fixtures with dummy values).
- Scope discipline: `ws-fix-pr/runs/`, other workers' `us-*` dirs, `ws-spec-multi`
  state, `.agents/plans/index.json` (us-353's) untouched by this change; `test/.ws`
  fixture output left untracked, uncommitted.
- Contracts honored: refined-plan decision 3 (SoT stays; relative skill↔skill links
  untouched), no-legacy-probe rule (refined-plan line 25–26; doctor fallback
  repointed, not duplicated), harness no-legacy-alias rule (symlink/compat-dir
  options rejected; installer writes `.ws` only).

**Verdict: clean, no fix round.** Proceed to Step 7 testing (already green) and delivery commit.
