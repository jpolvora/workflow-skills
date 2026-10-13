---
step: 1
slug: us-511
workflowId: us-511-20261013T040003Z
status: completed
startedAt: "2026-10-13T04:00:03.000Z"
endedAt: "2026-10-13T04:00:03.000Z"
acRefs: []
---
# Implementation Plan — us-511

**Slug:** us-511
**Workflow id:** us-511-20261013T040003Z
**Spec:** `.agents/plans/us-511/step-00-us-511.spec.md`
**Pipeline:** standard (`standard`, `enableDag: true`, DAG exec mode)
**Branch:** develop (shared-head batch) — **baseline:** `625493850f23cf1df25856b2c5a1e964b5772a6f`

## 1. Goal

Close the implementation gap between the canonical review-thread reader
(`ws-spec-provider-github/scripts/fetch_threads.cjs`) and its own documented token
contract by adding the missing last link: when none of
`AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN`, `GITHUB_TOKEN`, or `GH_TOKEN` is set, fall
back to `gh auth token`. Keep the failure loud (non-zero, actionable, never the
zero-thread success path), keep the credential secret (never printed, logged, or
persisted), and keep the `ws-fix-pr` forwarding shim a shim.

## 2. Existing baseline to build on (do not re-implement)

- `ws-spec-provider-github/SKILL.md:40` already documents the four-link chain; it is
  the contract of record and needs no change unless wording must match AC11.
- `resolve_thread.cjs:67-86` and `ws-shared/runtime/scripts/ingest_visual_attachments.cjs:240-251`
  already implement the exact env-then-`gh auth token` sequence with
  `execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })`.
  This plan reuses that established shape; it does **not** introduce a shared helper
  (out of scope) and does **not** edit `resolve_thread.cjs`.
- `ws-fix-pr/scripts/fetch_threads.cjs` already forwards stdio and the canonical exit
  status; it stays untouched (AC9/AC10 hold structurally).
- `fetch_threads.cjs` already imports `execSync`; no new dependency or module boundary
  is needed.

## 3. Change surface

| Path | Change |
|------|--------|
| `.agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs` | `resolveToken()` gains the `gh auth token` last-resort link and returns the selected source; failure message names `gh auth login` + the three variables; CLI-fallback source note on stderr (AC1–AC8, AC12) |
| `.agents/skills/ws-spec-provider-github/INTENTS.md` | `validate-auth` procedure documents the same four-link chain incl. the CLI fallback (AC11) |
| `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md` | GitHub Token section names the CLI fallback |
| `.agents/skills/ws-fix-pr/README.md` | Platform support auth cell names the CLI fallback |
| `test/test-fetch-threads-token-fallback.js` | **New** network-free token-resolution module (PATH `gh` stub + scrubbed env + `fetch` shim); registered in `test/test-suites.json` (`local` + `remote`) |
| `test/COVERAGE.md` | Note the now-hermetic token-resolution coverage for `fetch_threads` |
| `FEATURES.md`, `README.md`, root `AGENTS.md`, `.ws/AGENTS.md`, `docs/index.html` | Feature/doc/site sync for the fallback |
| `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/version.json`, site footer | Version bump 0.5.45 → 0.5.46 (once per PR) |
| `.agents/skills/ws-shared/skill-integrity.json` (generated) | Re-hash after the skill edits |

No change to: `package.json` dependencies, `config.json` schema/keys, GraphQL query,
`--json` payload keys, the retry helper, or the ADO provider.

## 4. Contract detail (AC1–AC14)

1. **Resolution order (AC1):** `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` → `GITHUB_TOKEN`
   → `GH_TOKEN` → `gh auth token`. The first three are read with `||` so an empty
   string falls through; the CLI link runs only after a total miss.
2. **Environment wins (AC2):** an env token returns before the `try`, so the
   subprocess is never spawned when any of the three variables is truthy.
3. **Attempt before failing (AC3, AC7):** `execSync('gh auth token', { encoding: 'utf8',
   stdio: ['pipe', 'pipe', 'ignore'] })`; `.trim()`; empty/whitespace output is treated
   as absent. stdout is captured, stderr discarded.
4. **Header only (AC4, AC8):** the resolved value flows only into
   `Authorization: Bearer ${token}`. It is never printed, logged, or written to disk.
5. **Loud failure (AC5, AC6):** when no source yields a token, print
   `Error: ... Set AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN, GITHUB_TOKEN, or GH_TOKEN, or
   authenticate the GitHub CLI with \`gh auth login\`.` and `process.exit(1)` **before**
   the GraphQL request. The zero-thread success path (`normalized.length === 0`) is
   unreachable on this branch.
6. **Source diagnostic (AC12):** when the CLI fallback supplies the token, write a
   one-line note naming the source (`gh auth token`) to **stderr** — never stdout,
   never the value. This keeps the frozen `--json` payload intact.
7. **Shim parity (AC9, AC10):** `ws-fix-pr/scripts/fetch_threads.cjs` is unchanged; it
   re-execs the canonical script with inherited stdio and forwards `result.status`.
8. **Docs parity (AC11):** `validate-auth` in `INTENTS.md` and the prerequisites in
   `SKILL.md` both state the identical four-link chain.
9. **Frozen output (AC13, AC14):** the zero-thread message and the `--json` payload
   keys (`prNumber`, `owner`, `repo`, `cooperativeContract`, `activeThreads`) are
   unchanged.

## 5. Test strategy (network-free)

New module `test/test-fetch-threads-token-fallback.js`:

- Hermetic fixture: temp dir with `git init` + `origin` remote set to a GitHub URL (so
  remote parsing succeeds), an empty `.env`, a `PATH`-first stub for `gh` (both a POSIX
  `gh` and a Windows `gh.cmd`), and a `--require` preload that replaces `globalThis.fetch`
  with a recorder returning an empty `reviewThreads` response.
- **Precedence:** env sentinel set → stub never invoked (marker file absent); header
  captures the env sentinel (AC1, AC2, AC4, NS6).
- **Fallback:** env scrubbed → stub prints a sentinel → header captures it, stderr names
  the source, stdout/stderr never contain the sentinel (AC1, AC3, AC7, AC12, AC8, NS5).
- **Failure (absent):** stub absent from `PATH` → non-zero exit, message names
  `gh auth login` + the three variables, zero-thread text absent, no request issued
  (AC5, AC6, NS1, NS2).
- **Failure (non-zero):** stub exits 1 with stderr text → non-zero exit, actionable
  message, stub stderr not forwarded verbatim (NS3).
- **Failure (empty):** stub exits 0, prints nothing → non-zero exit, no empty Bearer
  (NS4).
- **Legitimate empty:** token resolved + zero threads → exit 0, prints
  `No active unresolved threads found.` (AC13).
- **JSON contract:** `--json` payload keeps the documented keys (AC14).
- **Shim:** `ws-fix-pr/scripts/fetch_threads.cjs` on the no-token fixture exits with the
  canonical non-zero code and inherits the error text (AC9, AC10, NS8).
- **No-disk / no-Python / no-package-change:** assert no credential file appears, no
  `.py`/`.pyc`/`.pyo` under `.agents/skills/` or `bin/`, and no dependency diff
  (AC8, NS7, NS11).

## 6. Stack & Security Invariants Verification Plan

| Invariant | Verification |
|-----------|--------------|
| node-skills-package (Node 22 CJS, no Python, no new dep) | `node --check` on both touched scripts; dependency diff empty; no `.py` under `.agents/skills/` or `bin/` |
| Managed runtime resolution preserved | `node test/test-skills-runtime-resolution.js` |
| `activeThreads` literal + shim paths + install assertions | `node test/test-provider-parity.js`, `node test/test-install.js` |
| Credential never exposed | new test sentinel assertions over stdout, stderr, and created files |
| Least-privilege request surface | new test asserts no `fetch` call on the failure path |

## 7. Artifacts & integrity

- Product commit (G2-code) after Step 5 and after any Step 6 review fix, path-scoped.
- `{plansDir}` staging only at Step 8 delivery.
- `npm run generate-integrity` then `npm run verify-integrity` after the skill edit.
- `node test/test-harness-clean.js` must report 0 findings before ship.

## 8. Out of scope (from spec)

Removing/reordering `loadDotEnv`; extracting one shared token helper and adopting it in
`resolve_thread.cjs` / `ingest_visual_attachments.cjs`; converting shims into real
implementations; ADO fallback; GitHub App/OAuth/keyring inside the script; caching the
token; changing the GraphQL query, filtering, `--json` semantics, or the retry helper.
