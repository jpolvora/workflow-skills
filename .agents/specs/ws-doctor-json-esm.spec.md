---
id: null
slug: ws-doctor-json-esm
title: "ws-doctor --json stdout contract and self-describing ESM entrypoint"
source: local
specDate: 2026-09-02
---

# Specification — ws-doctor --json stdout contract and self-describing ESM entrypoint

## Description

This local spec is the filtered implementation contract for open GitHub issues on `jpolvora/workflow-skills` as of 2026-09-02. Four issues were open. Each was checked against this package tree, live `ws-doctor` output, `git log`, and Node 22 behavior. Only defects that reproduce in this repo (or in a consumer/global copy of this repo's `ws-doctor` files) are in scope.

**Included**

- [Issue #260](https://github.com/jpolvora/workflow-skills/issues/260) — `ws-doctor --json` must be machine-parseable. Callers that `json.loads` stdout fail when extra text follows the object (`JSONDecodeError: Extra data`) or when stdout is empty because the entrypoint did not load.
- [Issue #261](https://github.com/jpolvora/workflow-skills/issues/261) — **amended**. The symptom is real for copies of `doctor.js` that do not inherit this repo's root `"type": "module"`. The proposed fix (add `"type": "module"` to the upstream root `package.json`) is **already done** (present since the initial commit). The remaining gap is a **self-describing ESM marker next to `doctor.js`** so consumer and global installs do not depend on the ancestor package.

**Skipped (invalid or not this repo)**

- [Issue #262](https://github.com/jpolvora/workflow-skills/issues/262) — `sync-db-remote-to-local/scripts/sync.sh` is not in this package (zero matching files). It is a separate user skill. Out of scope.
- [Issue #259](https://github.com/jpolvora/workflow-skills/issues/259) — not reproducing here. `ws-fix-pr/README.md`, repo-root `README.md`, and repo-root `FEATURES.md` exist. `ws-doctor --json --skill ws-fix-pr|ws-spec-index|ws-tdah` reports `missingReferences: "none"`. `ws-memo` is not packaged in this repo (runtime skill from spec-memo). Do not add `FEATURES.md` to consumer installs.

### Architecture touchpoints

| Layer | Path | Change class |
|-------|------|----------------|
| skills-sot | `.agents/skills/ws-doctor/scripts/doctor.js` | ESM entry; `--json` stdout isolation |
| skills-sot | `.agents/skills/ws-doctor/package.json` (recommended) or `doctor.mjs` | Self-describing ESM so Node 22 does not treat copies as CJS |
| tests | `test/test-ws-doctor.js` | Failing-then-green fixtures for CJS ancestor + strict JSON stdout |

`doctor.js` is the only skill script that uses ESM `import` (all other skill helpers are `.cjs`). Root `package.json` already has `"type": "module"`, so in-repo `node .agents/skills/ws-doctor/scripts/doctor.js --json --skill ws-doctor` currently prints parseable JSON. Copies under a CommonJS or typeless `package.json` fail on Node 22 (`SyntaxError: Cannot use import statement outside a module`, empty stdout). Older Node that reparses as ESM can emit `MODULE_TYPELESS_PACKAGE_JSON` and then JSON, which matches #260 extra-data if that warning is captured on stdout.

`test/test-ws-doctor.js` already writes a stub `"type": "module"` into temp fixtures so copied `doctor.js` loads. That workaround hides the consumer failure. Replace it with the product ESM marker (copy `ws-doctor/package.json` or the `.mjs` file) and assert `--json` stdout with `JSON.parse` on the full stdout string.

Surgical rule: do not retouch root `"type": "module"`; do not convert other skills to ESM; do not vendor `ws-memo`; do not invent JSONL unless stdout isolation fails.

## Acceptance Criteria

- AC1: `node .agents/skills/ws-doctor/scripts/doctor.js --json --skill ws-doctor` writes exactly one JSON object to stdout, with an optional single trailing newline.
- AC2: `--json` stdout after the closing `}` contains no Node module-type warning and no persist or usage text.
- AC3: `doctor.js` runs as ESM when the copied skill tree sits under a `package.json` with `"type": "commonjs"`.
- AC4: `doctor.js` runs as ESM when the copied skill tree sits under a `package.json` that omits `type`.
- AC5: `test/test-ws-doctor.js` includes a fixture that copies the shipped ESM marker with `doctor.js` and does not write `"type": "module"` at the fixture repo root.
- AC6: Root `package.json` keeps the existing `"type": "module"` value; the spec does not add or remove that key.
- AC7: `--persist` prints the saved artifact path on stderr only.
- AC8: `node test/test-ws-doctor.js` exits 0 after the product change.

## Original Issue Context

Open issues on 2026-09-02 (newest first). Bodies are the GitHub text at fetch time.

### Issue #262 (skipped)

**Title:** CRITICAL: sync-db-remote-to-local/scripts/sync.sh uses mixed-quote python -c payloads violating CROSS-PLATFORM.md

**URL:** https://github.com/jpolvora/workflow-skills/issues/262

**Validation:** Invalid for this repo. No `sync-db-remote-to-local` tree in `workflow-skills`. CROSS-PLATFORM / `check_shell_quoting.cjs` still apply to this package's own skill scripts; this issue names a foreign script.

### Issue #261 (included, amended)

**Title:** Add type: module to package.json to eliminate Node.js ES module reparse warning

**URL:** https://github.com/jpolvora/workflow-skills/issues/261

**Body (verbatim):**

```
## Problem

Running ws-doctor/scripts/doctor.js triggers Node.js warning about module type not being specified, causing ES module reparse overhead.

## Impact
- Performance overhead from reparse
- Noise in output (especially problematic for --json parsing)

## Proposed Fix
Add type: module to the upstream package.json or create one if missing.

## References
- Node.js ES modules documentation
- CROSS-PLATFORM.md Script launchers
- ws-doctor/SKILL.md Launcher (mandatory)
```

**Validation:** Symptom valid for copies of `doctor.js`. Proposed root `package.json` change is already present (`"type": "module"`). Remaining work is a skill-local ESM marker.

### Issue #260 (included)

**Title:** ws-doctor --json produces invalid JSON output (extra data after closing brace)

**URL:** https://github.com/jpolvora/workflow-skills/issues/260

**Body (verbatim):**

```
## Problem

Running node ws-doctor/scripts/doctor.js --json produces output that fails JSON parsing with:
``njson.decoder.JSONDecodeError: Extra data: line 1765 column 1
``n

The JSON object is valid but followed by additional text (likely Node.js module warnings or trailing output).

## Impact
- Machine parsing of doctor output fails
- CI/automation cannot consume --json reliably
- Forces fallback to text parsing

## Proposed Fix
1. Ensure --json outputs only the JSON object to stdout
2. Redirect warnings/logs to stderr
3. Or use JSONL format (one JSON object per line)
4. Add type: module to package.json to eliminate the Node.js reparse warning

## Environment
- ws-doctor version: 0.3.53
- Error occurs on both Windows and POSIX

## References
- Node.js warning: [MODULE_TYPELESS_PACKAGE_JSON]
- ws-doctor/SKILL.md --json flag documentation
```

**Validation:** Valid. `--json` is a machine contract. In-repo run is currently clean because root `"type": "module"` is set. Node 22 CJS-ancestor copy yields empty stdout plus stderr `SyntaxError`. Extra-data matches warning-on-stdout or concatenated streams.

### Issue #259 (skipped)

**Title:** Missing README.md and FEATURES.md references causing broken links in skills

**URL:** https://github.com/jpolvora/workflow-skills/issues/259

**Validation:** Not reproducing on this tree (`missingReferences: "none"` for the named skills). `ws-memo` / `FEATURES.md` consumer-install claim is out of package scope. See companion Deferred Ideas for a possible later `README.md` resolver tightening (same class as #205), not this spec.

### Prior Work Sweep

- Keywords: `ws-doctor json`, `type module package.json`, `missing README FEATURES`, `sync-db-remote-to-local`, `python -c CROSS-PLATFORM`.
- Provider `sweep_prior_work.py`: no matching open PRs; no extra commit hits for those keyword strings.
- Related merged PRs (title search): [#191](https://github.com/jpolvora/workflow-skills/pull/191) (introduce `ws-doctor`), [#206](https://github.com/jpolvora/workflow-skills/pull/206) (doctor false-positive `docs/` links, issues #204 #205). No open PR for #260/#261.
- `git log -S '"type": "module"' -- package.json`: key exists from the initial commit (2026-06-25). Not an accidental omission.
- Local specs already covering doctor path/docs: `.agents/specs/0020-ws-doctor.spec.md`, `.agents/specs/0026-ws-doctor-204-205.spec.md`. This spec does not reopen those ACs.

### Design Intent

- **Root `"type": "module"`:** intentional product setting from the first `package.json`. Keep it. Do not treat #261 as a missing root key.
- **`doctor.js` ESM `import`:** intentional (uses `import.meta.url` / `createRequire`). Keep ESM; do not rewrite the file to CJS.
- **Temp fixture `package.json` in `test/test-ws-doctor.js`:** workaround so copied `doctor.js` loads. Not a shipped contract. The shipped skill must carry the ESM marker so the test can stop inventing `"type": "module"` at the *consumer* root.
- **`--json` via `console.log(JSON.stringify(...))`:** intended machine report on stdout. Persist path is already `console.error`. Keep persist on stderr. Do not print warnings on stdout.
- **#262 / #259 skip:** design intent is package boundary. This repo's shell-quoting gate stays for *this* tree; foreign skills are not patched here. Doctor missing-ref work for `docs/` was already shipped in #205 / spec 0026.

## Child Tasks

### Task #260 — strict `--json` stdout

- **Status:** Open
- **Description:** One JSON object on stdout; no extra tokens; persist/usage/warnings off stdout.

### Task #261 — self-describing ESM for copies

- **Status:** Open
- **Description:** Ship an ESM marker with `ws-doctor` so Node 22 loads `doctor.js` under CJS or typeless ancestors without changing root `package.json`.

## Notes

- Companion `.agents/specs/ws-doctor-json-esm.context.md` records the ESM-marker choice (skill-local `package.json` vs `doctor.mjs`).
- Code-review proof for the later implement step: `node test/test-ws-doctor.js` exit 0; CJS-ancestor fixture `JSON.parse(stdout)`; `git diff` limited to `ws-doctor` plus `test/test-ws-doctor.js` (and SKILL.md only if the launcher filename changes). Integrity regenerate is an implement/ship duty, not this spec write.
- `npm run test` remains `verification.backendTest` after implementation; this spec write does not claim that run.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Issue #262 `sync-db-remote-to-local` | Not present in this repository |
| Issue #259 README / FEATURES missing-ref table | Not reproducing; `ws-memo` not packaged here |
| Adding `"type": "module"` to root `package.json` | Key already exists |
| JSONL `--json` output | Single JSON object is enough if stdout is isolated |
| Converting other skill scripts from `.cjs` to ESM | Only `doctor.js` uses ESM `import` |
| Shipping `FEATURES.md` into consumer skill trees | Upstream inventory only; not a doctor JSON defect |
| `resolveCitedPath` `README.md` project-root special-case | Optional later; see companion Deferred Ideas |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| ESM marker shape | Skill-local `ws-doctor/package.json` with `"type": "module"` | Smallest diff; keeps `doctor.js` launcher; matches current test workaround | y |
| Input validation / auth / rate limits / TTL / concurrency | N/A because this is a local Node CLI stdout and module-type contract, not a networked product API | Collapse unused FORMAT.md dimensions | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only #260 and amended #261; #259 and #262 skipped with evidence | This spec skip table + live doctor `missingReferences` |
| Atomic criteria | AC1–AC8 each have a pass/fail command or fixture | Authoring `validate_spec.cjs --mode=authoring` |
| Failure modes | CJS ancestor SyntaxError and extra-data JSON listed as red tests | `### Negative & Failing Test Scenarios` |
| Observation telemetry | Named `node` doctor and test commands | `### Telemetry & Observable Signals` |
| Open blockers | None; ESM marker choice recorded in companion | `ws-doctor-json-esm.context.md` Implementation Decisions |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-doctor/scripts/doctor.js --json --skill ws-doctor` (stdout parse; stderr may be empty or persist-only).
- Copy `ws-doctor/` under a temp `"type": "commonjs"` package; run `node <copy>/scripts/doctor.js --json --skill ws-doctor` from that cwd; `JSON.parse` full stdout.
- `node test/test-ws-doctor.js` exit code 0.
- After implementation, `npm run test` (`verification.backendTest`) exit 0 before claiming review-proof.

### Negative & Failing Test Scenarios

- NS1: Copy only `scripts/doctor.js` into a `"type": "commonjs"` tree (no skill `package.json`, still named `.js`). Node 22 exits non-zero with `Cannot use import statement outside a module` and empty stdout. This must stay red until the ESM marker ships, then the *product* copy (marker included) must go green.
- NS2: `JSON.parse` of the entire `--json` stdout string must throw if any non-whitespace follows the root object (Python `json.loads` Extra data). Add this assertion so warnings cannot hide on stdout.
- NS3: A fixture that writes `"type": "module"` only at the *consumer repo root* and copies `doctor.js` without the skill-local marker must not be the passing proof. Proof is the CJS or typeless *ancestor* plus the shipped marker beside the skill.
