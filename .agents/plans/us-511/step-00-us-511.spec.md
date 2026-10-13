---
id: 511
slug: us-511
title: fetch_threads.cjs should fall back to gh auth token
source: github
specDate: 2026-10-12
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/511"
labels:
  - bug
step: 0
workflowId: us-511
status: completed
startedAt: "2026-10-13T04:00:16.132Z"
endedAt: "2026-10-13T04:00:16.132Z"
acRefs: []
---
# Specification — fetch_threads.cjs should fall back to gh auth token

**State:** open
**Labels:** bug

## Description

The canonical review-thread reader, `.agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs`, resolves its GitHub token from a three-variable chain and nothing else. `resolveToken()` (`:55-61`) returns the first non-empty value of `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN`, then `GITHUB_TOKEN`, then `GH_TOKEN`; when all three are absent, `main()` prints `Error: Set AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN, GITHUB_TOKEN, or GH_TOKEN.` and exits 1 (`:114-120`). The script never calls the `gh` CLI, so a host with a healthy `gh auth status` and no token variable exported cannot list threads at all.

The documented contract already includes the missing link. The provider prerequisites state the chain as `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` → `GITHUB_TOKEN` → `GH_TOKEN` → `gh auth token` fallback (`.agents/skills/ws-spec-provider-github/SKILL.md:40`). Two sibling scripts in the same package implement that last link: `resolve_thread.cjs:67-86` tries the same three variables, then runs `gh auth token`, and `ws-shared/runtime/scripts/ingest_visual_attachments.cjs:240-251` does the same via `resolveGithubToken()`. Both capture the CLI's standard output and discard its standard error (`stdio: ['pipe', 'pipe', 'ignore']`); neither echoes the value; neither writes credentials to disk. `fetch_threads.cjs` is therefore an implementation gap against its own documented contract, not a deliberate restriction.

Both files named `fetch_threads.cjs` are in scope for the parity requirement. `.agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs` is the canonical implementation that holds the token logic. `.agents/skills/ws-fix-pr/scripts/fetch_threads.cjs` is a 20-line compatibility shim that re-executes the canonical script through `spawnSync(process.execPath, [target, ...argv], { stdio: 'inherit' })` and forwards its exit status (`process.exit(result.status === null ? 1 : result.status)`); its sibling `ws-fix-pr/scripts/resolve_thread.cjs` has the identical shape. Parity between the two copies is therefore structural: the shim must keep forwarding and keep propagating the canonical exit code, and must not grow a second copy of token logic. The shim already forwards `stderr` and the exit status, so the fix reaches `ws-fix-pr` callers without editing the shim.

Precedence contract to pin: an explicit environment token always outranks the CLI fallback, the three variables keep their documented ranking, and only a total miss of all three reaches the `gh auth token` call. The fallback must be a strict last resort, so a host that exports a reviewer PAT never pays a subprocess and never has its credential silently replaced by the CLI's account token.

Failure contract to pin: when no source yields a token, the run must fail loudly with a non-zero exit and an actionable message that names both the three variables and `gh auth login`. It must never degrade into the script's legitimate empty-result path. That path prints `No active unresolved threads found.` and exits 0 (`:207-210`), which is correct for a pull request that genuinely has no unresolved threads, and is dangerous for an authentication failure because `ws-fix-pr` and `ws-goal-fix-pr` would read it as "nothing to fix" and stop. Today the failure already exits non-zero before any API call; the requirement is to keep that property after adding a fallback that can itself fail, and to make the message actionable for the new failure mode (CLI present but not authenticated, or CLI absent).

Security invariant: the token is a credential. It travels only in the `Authorization: Bearer` request header (`:148-152`). It is never printed, never logged, never embedded in a thread payload, and the fallback never writes credentials to disk; `gh auth token` reads existing CLI state and returns the value on stdout, which the script must capture rather than inherit.

## Acceptance Criteria

- AC1: The canonical thread-fetch script shall resolve its GitHub token from `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN`, then `GITHUB_TOKEN`, then `GH_TOKEN`, then the `gh auth token` CLI fallback, in that order.
- AC2: When an explicit environment token is present in any of the three variables, the script shall use it and shall not invoke the `gh auth token` fallback.
- AC3: When all three environment token variables are absent or empty, the script shall attempt the `gh auth token` CLI fallback before failing.
- AC4: When the CLI fallback returns a non-empty token, the script shall send that token in the `Authorization` header of the GraphQL request.
- AC5: If no environment token exists and the CLI fallback is unavailable, exits non-zero, or returns an empty value, then the script shall exit non-zero with a remediation message naming `gh auth login` and the three token environment variables.
- AC6: If token resolution fails, then the script shall not print the zero-thread success output and shall not exit 0.
- AC7: The CLI fallback shall capture the command's standard output and discard its standard error stream instead of forwarding CLI output to the caller.
- AC8: The script shall never print, log, or persist the resolved token value, and the fallback shall not write credentials to disk.
- AC9: While the `ws-fix-pr` thread script remains a forwarding shim, the shim shall obtain token resolution and failure behavior from the canonical script only, without duplicating token logic.
- AC10: When the canonical script exits non-zero, the shim shall propagate the same non-zero exit status and its error output to the caller.
- AC11: The provider `validate-auth` intent procedure shall document the same token precedence chain, including the CLI fallback, as the provider prerequisites.
- AC12: When the CLI fallback supplies the token, the script shall emit a non-secret diagnostic naming the selected token source and never the token value.
- AC13: When a token resolves and the pull request has no unresolved review threads, the script shall exit 0 and print the documented zero-thread message.
- AC14: Where a caller requests JSON output, the script shall keep emitting the documented `activeThreads` payload shape with owner, repository, and pull request number.

## Original Issue Context

Title: `fetch_threads.cjs should fall back to gh auth token`
URL: https://github.com/jpolvora/workflow-skills/issues/511
State: OPEN · Labels: `bug` · Assignees: none · Comments: none

Verbatim issue body:

## Failure class

`fetch_threads.cjs` errors out demanding `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN`,
`GITHUB_TOKEN`, or `GH_TOKEN` even when `gh` CLI auth is healthy
(`gh auth status` green via keyring). The provider skill documents the
fallback chain ending at `gh auth token`, but the script does not implement
that last link.

## Reproduction

```bash
# No token env vars set; gh auth status green.
node .agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs <PR> --json
# Error: Set AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN, GITHUB_TOKEN, or GH_TOKEN.
```

## Expected

Resolve the token through the documented chain, ending with a
`gh auth token` subprocess call, before failing closed. Same applies to
any sibling thread script sharing the token helper.

## Workaround

Export `GH_TOKEN=$(gh auth token)` for the command (token never persisted).

### Prior Work Sweep

- Provider sweep: `node .agents/skills/ws-spec-provider-github/scripts/sweep_prior_work.cjs --issue 511 --keywords "fetch_threads, gh auth token"` returned `status: ok` with **zero** pull requests and **zero** commits matching issue #511. There is **no open PR** and no in-flight branch work for this defect.
- PR search noise to discard: the sweep's two `pullRequests` hits (#431 "feat(us-429): seed consumer hub with minimal required files", #350 "feat: step-level baton handoffs for multi-CLI workflow runs") matched the search text `#511` inside unrelated merged bodies. Both are `MERGED`, neither touches token resolution; they are not prior work for this issue.
- Most relevant merged history, from the commit half of the sweep plus local `git log` (all of it rename/move/runtime-resolution churn that touched both files without ever adding the fallback):
  1. `906142ab` — "fix(#377): fix issues from review threads" — the last behavioral change to both `fetch_threads.cjs` copies; review-thread fixes only, no token logic.
  2. `9f04f146` — "fix(runtime): resolve managed ws-shared tree from the skills install, never .ws" — the `HUB_SCRIPTS_DIR` candidate chain (`:11-38`) that `fetch_threads.cjs` uses to `require` `http_retry.cjs`.
  3. `64bc059a` — "fix(runtime): resolve managed runtime from skills installation, local then global" — earlier revision of the same candidate chain.
  4. `4d003b63` — "fix(runtime): keep legacy .ws/runtime as deprecated last-resort read fallback" — same area.
  5. `3479171b` — "release(0.3.56): migrate skill family naming to ws-{family}-{verb}" — the only `git log -S "resolveToken"` and `-S "gh auth token"` hit for these files, i.e. pure rename churn that carried the existing three-variable helper forward unchanged.
- Duplicate-risk anchors to preserve: `test/test-provider-parity.js:490` asserts the literal `activeThreads` appears in the canonical file, and `test/test-skills-runtime-resolution.js` plus `test/test-install.js:403-404`, `:1009-1010`, `:1029` pin the shim paths and the canonical `resolve_thread.cjs` runtime resolution. Any edit must keep those assertions passing.

### Design Intent

- **Intentional constraint (documented chain):** the provider prerequisites promise `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` → `GITHUB_TOKEN` → `GH_TOKEN` → `gh auth token` (`ws-spec-provider-github/SKILL.md:40`). The environment-first half is intentional so an explicit reviewer PAT always wins; the CLI fallback is the sanctioned last resort.
- **Intentional constraint (shim, not duplicate):** `ws-fix-pr` deliberately ships forwarding shims instead of second implementations. `ws-fix-pr/README.md:31` states that shims re-exec the provider scripts and that new work should call the canonical provider paths. The issue's "any sibling thread script sharing the token helper" is therefore already satisfied for `ws-fix-pr/scripts/fetch_threads.cjs` by the forwarding contract; duplicating the fallback there would contradict the stated design.
- **Precedent shape:** `resolve_thread.cjs:67-86` and `ingest_visual_attachments.cjs:240-251` both implement the same env-then-CLI resolution with `execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })`, returning `null` on throw or empty output and leaving the caller to print the three-variable hint. The implementation must follow this established shape rather than invent a new one.
- **Accidental gap (not a deliberate restriction):** `fetch_threads.cjs` already imports `execSync` from `child_process` at `:1` for `git remote get-url` (`:91-94`), so no new dependency or module boundary is needed to add the fallback. Nothing in the local history suggests the omission was a choice: the file's recent commits are runtime-resolution and review-thread churn, and the helper was carried through renames unchanged.
- **Intentional constraint (fail closed before network):** token resolution currently runs after git remote parsing and before any API call (`:114-120` precede the GraphQL request at `:146`). The fallback must keep the failure ahead of the request, so an unauthenticated host never issues an anonymous API call.
- **Known documentation drift to close:** `ws-spec-provider-github/INTENTS.md:13` (`validate-auth`) still states that `list-threads` / `resolve-thread` "require a token in `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN`, `GITHUB_TOKEN`, or `GH_TOKEN`" and says nothing about the fallback, which contradicts the same skill's `SKILL.md:40`. `ws-fix-pr/scripts/COOPERATIVE_FIX.md:197` lists only the three variables, and `ws-fix-pr/README.md:28` carries the ambiguous note "(+ `gh` for CLI flows)". AC11 closes the provider-side drift; the two `ws-fix-pr` documents are named under Notes.

## Notes

- Verified current resolution order in the canonical script, in execution order: `loadDotEnv()` runs first (`:71`, defined `:41-53`) and folds `./.env` from the current working directory into `process.env`, then `resolveToken()` (`:55-61`) returns the first non-empty of `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN`, `GITHUB_TOKEN`, `GH_TOKEN`. There is no fourth link, and no `gh` subprocess anywhere in the file.
- `.env` folding does not change the ranking: `loadDotEnv()` sets `process.env[key] = value.trim()` for each parsed key, so a `.env` entry can replace the *value* of one of the three variables but cannot outrank a higher-priority variable that is already populated. A stale `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` in `.env` will therefore beat an exported `GITHUB_TOKEN`; that pre-existing behavior is recorded as an assumption and left unchanged (see Out of Scope).
- Failure ordering that the fallback must not disturb: usage and PR-id parse errors (`:77-86`) and git remote resolution (`:88-112`) both precede token resolution, so "no token" is reported only for an otherwise valid invocation. AC5's message must stay distinguishable from `Usage: node fetch_threads.cjs <PR_ID> [--json]` and from `Error: Only GitHub repositories are supported`.
- The zero-thread path is a legitimate success, not a failure: `normalized.length === 0` prints `No active unresolved threads found.` and returns with exit 0 (`:207-210`). AC6 constrains only the token-failure path; AC13 protects the legitimate path and the negative scenarios assert the contrast explicitly.
- Implementation seam for tests: resolution is a module-private function in a script that calls `main()` on load, so a network-free test needs a controlled `PATH` stub for `gh` (a fake CLI that prints a sentinel and exits 0, exits non-zero, prints nothing, or records that it was invoked) and a scrubbed environment. `test/COVERAGE.md:55` currently lists `fetch_threads` under uncovered provider network paths; the fallback should be covered without reaching the network. Whether to instead export a resolution helper is a design choice recorded in the companion `0181-us-511.context.md`.
- Diagnostics carrier: AC12 requires a source-naming diagnostic but not a specific carrier (a one-line note on the standard error stream, or a `tokenSource` field in the `--json` payload are both acceptable). It must be a source *name*, never a value, and the existing `--json` contract keys (`prNumber`, `owner`, `repo`, `cooperativeContract`, `activeThreads`) must not be renamed or removed.
- Documentation touchpoints beyond AC11: `.agents/skills/ws-spec-provider-github/SKILL.md:40` already states the full chain and needs no change unless wording must match AC11; `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md:197` and `.agents/skills/ws-fix-pr/README.md:28` should gain the CLI fallback so callers stop treating an exported token as mandatory.
- Repo hygiene obligation: this package hashes installed skill content, so any change under `.agents/skills/**` requires `npm run generate-integrity` followed by `npm run verify-integrity` in the same change, per the harness change protocol. This spec does not run the suite; verification commands are named under Telemetry.
- Anonymization: the issue is a public upstream defect report about this public package, its text is reproduced verbatim above, and nothing in this spec adds consumer names, hostnames, machine paths, or customer data. All paths are repo-relative.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Removing or reordering the `loadDotEnv()` behavior that lets a `.env` entry overwrite an exported variable | Pre-existing behavior unrelated to the reported defect; changing it would alter token precedence for consumers who rely on a checked-in working copy of `.env`. Recorded as an assumption instead. |
| Extracting one shared token helper for all three call sites and adopting it in `resolve_thread.cjs` and `ingest_visual_attachments.cjs` | A valid alternative with a wider blast radius across two skills and a `ws-shared` runtime script; recorded as an option in the companion context file rather than required here. |
| Converting the `ws-fix-pr` shims into real implementations, or adding token logic to them | Contradicts the documented shim design (`ws-fix-pr/README.md:31`); AC9 and AC10 pin forwarding parity instead. |
| Adding a token fallback for the Azure DevOps provider (`ADO_PAT` / `AZURE_DEVOPS_PAT` / configured `patEnvVar`) | The reported defect is GitHub-specific; ADO resolution (`ingest_visual_attachments.cjs:253-259`) is untouched. |
| GitHub App, OAuth device-flow, or keyring access implemented inside the script | The sanctioned mechanism is delegating to the `gh` CLI; adding a second credential path would duplicate CLI state handling and widen the secret surface. |
| Caching the resolved token to disk or across runs | AC8 forbids persisting credentials; a cache is exactly the artifact this invariant excludes. |
| Changing the GraphQL query, thread filtering, `--json` payload semantics, or the retry helper | Outside the reported failure class; AC14 freezes the current payload so the fix cannot drift it. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Fallback command and shape | `execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })`, trimmed, empty treated as absent | Matches the two existing implementations in the same package (`resolve_thread.cjs:76-79`, `ingest_visual_attachments.cjs:247`) so the third call site is consistent and reviewable | n |
| Precedence when an environment token and CLI auth both exist | The environment token wins and the fallback is never invoked | The documented chain (`.agents/skills/ws-spec-provider-github/SKILL.md:40`) is ordered, and silently preferring the CLI account token would override an explicitly configured reviewer credential | n |
| Whether `gh` is guaranteed present when the fallback runs | Not guaranteed; absence is treated as fallback failure, not a crash | `gh` is a documented prerequisite for CLI flows but is not verified before the thread read, so a missing binary must surface as the actionable AC5 message | n |
| Diagnostic carrier for the selected source (AC12) | Implementation decision: a one-line standard-error note or a `tokenSource` key in `--json` output | Both are observable and non-secret; the companion context file records the tradeoff, and neither option changes the failure or payload contracts | n |
| `.env` values participate in the same three-variable ranking | Accepted as-is | `loadDotEnv()` only assigns values into `process.env`; it cannot promote a lower-priority variable above a populated higher-priority one, so the documented ranking still holds | n |
| Stale `.env` value outranking an exported lower-priority variable | Accepted as-is, documented | Pre-existing behavior; changing it is out of scope, and this spec must not silently alter credential selection | n |
| Test seam (network-free verification) | A controlled `PATH` stub for `gh` plus a scrubbed environment, rather than exporting internals | Keeps the script's public surface unchanged and avoids reaching the network; `test/COVERAGE.md:55` records the current gap | n |
| Input validation and bounds, idempotency/dedup, concurrency/ordering, data lifecycle/TTL, rate limits | N/A because this change touches one credential lookup executed once per process, before a single read-only GraphQL query, with no persisted state, no concurrent writer, and no new input surface; the PR-id and remote-URL validation already exist and are unchanged | FORMAT.md implicit-dimension collapse for dimensions this change does not touch | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | The change is limited to the token resolution and its failure message in the canonical `fetch_threads.cjs`, the provider `validate-auth` wording, the affected documentation lines, and one network-free test | `git diff --stat` lists only those paths |
| Atomic criteria | Each of AC1–AC14 has one observable assertion; no AC depends on another AC's state machine | AC-to-test map reviewed against this spec before implementation |
| Failure modes enumerated | Missing environment token, missing `gh` binary, non-zero `gh` exit, empty `gh` output, and an authentication failure masquerading as an empty thread list are covered by AC3, AC5, AC6, and the negative scenarios | Negative scenarios below executed as red tests first |
| Observation telemetry | A non-secret diagnostic names the selected token source (AC12), and the failure path prints an actionable message plus a non-zero exit code (AC5) | `node` run against the `PATH`-stub fixtures with the environment scrubbed; captured stdout, stderr, and exit code inspected |
| Zero open blockers | Prior-work sweep reports no open PR and no in-flight commit for issue #511, and no dependency on another spec or unmerged branch | `sweep_prior_work.cjs --issue 511` output recorded under Prior Work Sweep |
| Security invariant — no credential exposure | The token is never printed, logged, embedded in a thread payload, or written to disk; the fallback captures stdout and discards the CLI's stderr; no credential file is created or modified | Sentinels asserted absent from stdout, stderr, and every artifact written during each fixture run, plus a filesystem check that no credential file appears |
| Security invariant — least-privilege request surface | The token appears only in the `Authorization: Bearer` header of the single GraphQL request, and no request is issued when resolution fails | Request-shape inspection plus a fixture asserting zero network calls on the failure path |
| Stack invariant — node-skills-package | The change uses Node 22 CommonJS (`require`, `.cjs`) only, adds no dependency and no `package.json` change, introduces no Python file, and keeps every recipe invoked with an explicit `node` launcher | `node --check` on the touched scripts plus a dependency diff check; no `.py`/`.pyc`/`.pyo` file under `.agents/skills/` or `bin/` |
| Stack invariant — managed runtime resolution preserved | The `HUB_SCRIPTS_DIR` candidate chain and the `http_retry.cjs` require stay intact, so the fallback does not disturb shared-runtime resolution | `node test/test-skills-runtime-resolution.js` |
| Existing anchors preserved | The `activeThreads` payload literal, the shim paths, and the install assertions still hold | `node test/test-provider-parity.js` and `node test/test-install.js` |
| Shim parity | The `ws-fix-pr` shim still forwards to the canonical path, inherits stdio, and propagates the canonical exit status unchanged | Diff inspection plus a fixture whose canonical run exits non-zero, asserting the shim's exit code and stderr match |
| Docs parity | `validate-auth` states the same precedence chain as the prerequisites, and the two `ws-fix-pr` documents name the CLI fallback | Grep comparison of the four documentation surfaces |
| Integrity regenerated | Hashed skill content is re-hashed after the edit | `npm run generate-integrity` then `npm run verify-integrity` |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Syntax gate on the touched runtime scripts: `node --check .agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs` and `node --check .agents/skills/ws-fix-pr/scripts/fetch_threads.cjs` — both must exit 0.
- Precedence signal (no network): with `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` set to a sentinel and a `PATH` stub for `gh` that records its invocation, assert the stub was never executed — proves AC2's strict ordering.
- Fallback signal (no network): with all three variables unset and a `PATH` stub printing a sentinel token, assert the recorded diagnostic names the CLI source and that the sentinel value never appears in stdout or stderr (AC1, AC3, AC12).
- Failure signal (no network): with all three variables unset and `gh` absent or a stub exiting non-zero, assert a non-zero exit code and a message naming `gh auth login` and the three variables, and assert the zero-thread success text is absent (AC5, AC6).
- Legitimate empty-result signal: with a token resolved, assert the zero-thread path still prints `No active unresolved threads found.` and exits 0 (AC13), so the loud-failure change is proven not to break the clean case.
- JSON contract signal: `--json` output still carries `prNumber`, `owner`, `repo`, `cooperativeContract`, and `activeThreads` (AC14).
- Shim signal: invoking `node .agents/skills/ws-fix-pr/scripts/fetch_threads.cjs <PR> --json` on the failing fixture yields the canonical exit code on the shim process, with the error text on the inherited standard error stream (AC9, AC10).
- Suite anchors: `node test/test-provider-parity.js`, `node test/test-skills-runtime-resolution.js`, and `node test/test-install.js`.
- Integrity gate: `npm run generate-integrity` then `npm run verify-integrity` once hashed skill content changes.

### Negative & Failing Test Scenarios

- Red test (no token anywhere): unset all three variables, remove `gh` from `PATH`, and run the script on a valid pull request id. Assert a non-zero exit and a message naming `gh auth login` and the three variables. Before the change the message names only the three variables, so a host with healthy CLI auth gets no actionable next step.
- Red test (silent-empty regression guard): on the same no-token fixture, assert the script never prints `No active unresolved threads found.` and never exits 0. This is the highest-severity failure mode: an authentication miss that exits 0 with an empty list is indistinguishable to `ws-fix-pr` and `ws-goal-fix-pr` from a pull request with nothing to fix.
- Red test (CLI not authenticated): provide a `PATH` stub for `gh` that exits non-zero with an authentication error on stderr and prints nothing on stdout. Assert the script exits non-zero with the actionable remediation message and that the stub's stderr text is not forwarded verbatim to the caller.
- Red test (CLI returns empty output): provide a stub that exits 0 and prints nothing (or only whitespace). Assert the empty value is treated as fallback failure and the script fails closed rather than sending an `Authorization: Bearer ` header with an empty credential.
- Red test (secret leakage): run every fixture above with sentinel tokens in the environment and in the stub's stdout, then assert no sentinel string appears in the process's stdout, stderr, or any file the run creates. This covers the security invariant that a token is never printed or logged.
- Red test (precedence inversion): export `GH_TOKEN` with a sentinel while the `gh` stub would print a different sentinel, and assert the environment value is used and the stub is never invoked. Prevents a regression where the fallback is consulted first and silently replaces an explicit reviewer credential.
- Red test (no credential written to disk): run the fallback path and assert the filesystem gains no token cache, credential file, or dotfile — the fallback reads existing CLI state only.
- Red test (shim exit-code drift): make the canonical script fail on the no-token fixture and assert the `ws-fix-pr` shim exits with the same non-zero code, proving the shim forwards the fallback failure instead of swallowing it.
- Regression assertion: run the parity, runtime-resolution, and install suites and assert the `activeThreads` literal, the shim paths, and the managed-runtime candidate chain still pass unchanged.
- Contract assertion: grep the provider `validate-auth` procedure and the prerequisites for the identical four-link chain, so the code and its documented contract cannot drift apart again.
- Stack assertion: assert no new dependency, no `package.json` change, and no `.py`/`.pyc`/`.pyo` file under `.agents/skills/` or `bin/`, keeping the change inside the Node 22 CommonJS skill-runtime contract.
