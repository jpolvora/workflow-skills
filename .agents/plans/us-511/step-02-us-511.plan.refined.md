---
step: 2
slug: us-511
workflowId: us-511-20261013T040003Z
status: completed
supersedes: step-01-us-511.plan.md
startedAt: "2026-10-13T04:01:00.000Z"
endedAt: "2026-10-13T04:01:00.000Z"
acRefs: []
---
# Refined Implementation Plan — us-511

**Slug:** us-511
**Workflow id:** us-511-20261013T040003Z
**Spec:** `.agents/plans/us-511/step-00-us-511.spec.md`
**Pipeline:** standard (`standard`, `enableDag: true`, DAG exec mode)
**Branch:** develop (shared-head batch) — **baseline:** `625493850f23cf1df25856b2c5a1e964b5772a6f`
**Supersedes:** `step-01-us-511.plan.md` (approved by `step-02-us-511.plan-interview.md`, F1–F3 applied)

## 1. Goal

Add the missing `gh auth token` last link to the canonical review-thread reader's token
resolution, keep the failure loud and actionable, keep the credential secret, and keep the
`ws-fix-pr` shim a shim. Closes the drift between
`ws-spec-provider-github/SKILL.md:40` (documented four-link chain) and the implementation.

## 2. Change surface (final)

| Path | Change |
|------|--------|
| `.agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs` | `resolveToken()` gains the CLI fallback and returns the selected source; failure message gains `gh auth login`; source note on stderr (AC1–AC8, AC12) |
| `.agents/skills/ws-spec-provider-github/INTENTS.md` | `validate-auth` documents the four-link chain (AC11) |
| `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md` | GitHub Token section names the CLI fallback |
| `.agents/skills/ws-fix-pr/README.md` | Auth cell names the CLI fallback |
| `test/test-fetch-threads-token-fallback.js` | New network-free module (AC1–AC14, NS1–NS11) |
| `test/test-suites.json` | Register the new module (`local` + `remote`) |
| `test/COVERAGE.md` | Record the now-hermetic token-resolution coverage |
| `FEATURES.md`, `README.md`, root `AGENTS.md`, `.ws/AGENTS.md`, `docs/index.html` | Doc/site sync |
| `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/version.json` | Version bump 0.5.45 → 0.5.46 |
| `.agents/skills/ws-shared/skill-integrity.json` (generated) | Re-hash |

Untouched: `resolve_thread.cjs`, `ingest_visual_attachments.cjs`, the `ws-fix-pr` shim,
the GraphQL query, the `--json` payload keys, the retry helper, ADO provider, dependencies.

## 3. Contract detail (AC1–AC14)

1. **Resolution order (AC1):** `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` → `GITHUB_TOKEN` →
   `GH_TOKEN` → `gh auth token`; env read with `||` (empty falls through), CLI link only
   after a total miss.
2. **Environment wins (AC2):** env token returns before the subprocess is spawned.
3. **Attempt before failing (AC3, AC7):** `execSync('gh auth token', { encoding: 'utf8',
   stdio: ['pipe','pipe','ignore'] }).trim()`; empty/whitespace = absent; stdout captured,
   stderr discarded.
4. **Header only (AC4, AC8):** value flows only into `Authorization: Bearer ${token}`.
5. **Loud failure (AC5, AC6):** print a message naming `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN`,
   `GITHUB_TOKEN`, `GH_TOKEN`, and `gh auth login`; `process.exit(1)` before the request.
6. **Source diagnostic (AC12, F1):** one-line **stderr** note naming `gh auth token` when
   the fallback supplies the token; never stdout, never the value.
7. **Shim parity (AC9, AC10):** `ws-fix-pr/scripts/fetch_threads.cjs` unchanged; forwards
   stdio and exit status.
8. **Docs parity (AC11):** `validate-auth` and prerequisites state the identical chain.
9. **Frozen output (AC13, AC14):** zero-thread message and `--json` keys unchanged.

## 4. Test strategy (network-free, F2)

`test/test-fetch-threads-token-fallback.js` builds a temp git repo (origin → GitHub URL,
empty `.env`), prepends a `gh` stub (`gh` + `gh.cmd`) to `PATH`, and passes
`--require <fetch-shim>` to replace `globalThis.fetch` with a recorder returning an empty
`reviewThreads` response. Cases: env precedence (stub not invoked), CLI fallback (header +
stderr source note + no sentinel leak), absent stub, non-zero stub, empty stub, legitimate
zero-thread success, `--json` keys, shim exit propagation, no-disk/no-Python/no-dep checks.

## 5. Stack & Security Invariants Verification Plan

| Invariant | Verification |
|-----------|--------------|
| node-skills-package (Node 22 CJS, no Python, no new dep) | `node --check` both scripts; empty dependency diff; no `.py` under `.agents/skills/` or `bin/` |
| Managed runtime resolution preserved | `node test/test-skills-runtime-resolution.js` |
| `activeThreads` literal + shim paths + install assertions | `node test/test-provider-parity.js`, `node test/test-install.js` |
| Credential never exposed | new test sentinel assertions (stdout/stderr/files) |
| Least-privilege request surface | new test asserts no `fetch` call on the failure path |

## 6. Artifacts & integrity

Product commit after Step 5 (and after a Step 6 fix if files change). `{plansDir}` staging
only at Step 8. `npm run generate-integrity` + `npm run verify-integrity` after the skill
edit. `node test/test-harness-clean.js` 0 findings before ship.

## 7. Out of scope

Shared token helper extraction; `resolve_thread.cjs` / `ingest_visual_attachments.cjs`
edits; shim conversion; ADO fallback; in-script OAuth/keyring; token caching; GraphQL /
filtering / `--json` semantics / retry-helper changes; `loadDotEnv` reordering.
