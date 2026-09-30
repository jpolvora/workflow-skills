---
superseded: true
supersededBy: step-02-fresh-worker-verifier-step.plan.refined.md
slug: fresh-worker-verifier-step
title: Fresh-worker verifier step
status: completed
step: 1
workflowId: fresh-worker-verifier-step-20260930T062223Z
startedAt: "2026-09-30T06:22:23.921Z"
endedAt: "2026-09-30T06:27:34.532Z"
acRefs: []
---
## 0. Summary & Business Rules

Add a fresh-worker verifier stage (`ws-fresh-verify`) to the standard pipeline between Step 6 review and Step 7 testing. A worker that never saw the implementation re-derives every AC verdict from `step-00-{slug}.spec.md` plus the product tree, injects one fault per AC on a scratch worktree, and reports evidence-or-zero per criterion. Defects route to a bounded fix loop (max 3 implement-plus-reverify rounds, then Pause). The stage writes `{us-dir}/step-05b-{slug}.fresh-verify.md` and never renumbers steps 6-9.

Business rules carried from the spec:

- Freshness is enforced by dispatch construction (spec + plan of record + compact handoff only), never by worker self-discipline.
- Every declared injection path must change bytes; restoration must match the pre-invert snapshot bytes (sabotage vocabulary from `run_sabotage.cjs`).
- The Step 5 ledger-derived score stays authoritative; this stage is additional, not a replacement.
- Scratch worktrees are removed after the stage; the primary branch is byte-identical before and after injection.

## 1. Definition of Ready & Scope

Resolved assumptions (spec Confirmed=y): placement after Step 6 / before Step 7; artifact name `step-05b-{slug}.fresh-verify.md`; fix-loop bound 3 then Pause; one fault per AC on a scratch worktree; empty product tree skips with a `no-product-changes` marker.

Measurable ACs (8): AC1 fresh dispatch inputs; AC2 independent re-derivation with file:line evidence; AC3 one fault per AC with red signal (failing test name + exit code); AC4 evidence-or-zero defect listing; AC5 bounded loop max 3 then Pause; AC6 report artifact with verdict table, evidence, injections, round history; AC7 placement + skip rules; AC8 worktree removal + byte-identical primary.

Out of scope: replacing the Step 5 score; full mutation testing in this stage; lite orchestrator support; fault-injection engines beyond caller-authored invert patches.

## 2. Technical Design & Architecture

New skill `ws-fresh-verify` (standalone id in the `ws-testing` / `ws-code-review` style; no `spec` token so no family-prefix rule applies). Three-tier layout per SKILL_AUTHORING.md:

- Tier 1 `SKILL.md` (<=150 lines): stage state machine — build fresh dispatch, re-derive verdicts, inject per-AC faults on scratch worktree, evidence-or-zero score, bounded fix loop, write report, cleanup. Done-when gates per step.
- Tier 2 `TEMPLATE.md`: report shape for `step-05b-{slug}.fresh-verify.md` (frontmatter: slug, reportDate, rounds, defects; body: per-AC verdict table with evidence links, injection results table, round history, skip marker section).
- Tier 3 `scripts/*.cjs` (Node 22, CommonJS, stdlib + in-repo helpers only):
  - `build_fresh_dispatch.cjs` — emits the compact fresh-worker handoff JSON (`specPath`, `planOfRecordPath`, `productTreeRoot`, `acList`, `createdAt`). Fail-closed: refuses any `--prior-output` pointing at full step outputs (`step-01`, `step-02`, `step-05`, `step-06`, exec/DAG files); only the compact handoff plus spec/plan/product tree are admitted.
  - `run_fresh_injection.cjs` — per-AC fault injection on a scratch worktree: `git worktree add --detach <dir> HEAD`, snapshot declared paths, `git apply` the caller-authored invert patch, assert every declared path changed bytes, run the configured test alias, capture failing test name + exit code, restore snapshot bytes, verify byte-identity, `git worktree remove --force`. Emits per-AC injection JSON (`ac`, `redObserved`, `failingTest`, `testExitCode`, `restored`, `worktreeRemoved`). Any unrestored path aborts with exit 1 before any fix dispatch.
  - `write_fresh_report.cjs` — takes verdict JSON (`--verdicts`: per-AC pass/fail + file:line evidence) and injection JSON (`--injections`), applies evidence-or-zero (an AC with no pass evidence or no red signal scores zero and is listed as a defect with the missing evidence named), tracks `--round n/3` history, writes `step-05b-{slug}.fresh-verify.md`. Exit 0 when zero defects; exit 2 with defect list when defects remain and rounds remain; exit 3 with residual list when round 3 still has defects (orchestrator Pauses).

Contract edits (docs only, no FSM renumber — the stage runs as a Step 6 substep, mirroring `reviewFix`):

- `ws-spec-to-pr/STEP-DISPATCH.md`: Step 6 row gains the 6b handoff; new `### Step 6b - Fresh-worker verify (substep)` section with placement (after Step 6 review, before Step 7), dispatch construction rule, skip rule (`no-product-changes` marker when the run has no product tree changes), and fix-loop bound.
- `ws-spec-to-pr/ARTIFACTS.md`: artifact-map row for `step-05b-{slug}.fresh-verify.md` (produced by Step 6b `ws-fresh-verify`, committable No); advance-to-7 row gains the 05b report-or-skip-marker requirement; forbidden-alias guard stays unchanged.
- `ws-shared/runtime/gates.md`: new `## Fresh-verify fix loop (standard Step 6b)` section (max 3 implement-plus-reverify rounds, Pause with residual list) plus one auto-gate defaults row.
- `ws-shared/runtime/git-ownership.md`: §2 allow-list gains scoped `git worktree add/remove` for the stage scratch dir; new scratch-worktree rule paragraph (create under `{worktrees-dir}/fresh-verify/`, remove after, primary byte-identical); §5 matrix row for `ws-fresh-verify` (git-mutating, like `ws-testing`).

Registration edits (new-skill surfaces, mirroring the `ws-version` footprint):

- `bin/skill-dependencies.json` + `.agents/skills/ws-shared/runtime/skill-dependencies.json`: register `ws-fresh-verify` with edges to `ws-plan-verify` (report shape), `ws-testing` (sabotage vocabulary), `ws-spec-to-pr` (stage placement).
- `test/test-suites.json`: register `test/test-fresh-verify.js`.
- `CATALOG.md`, `FEATURES.md`, `README.md`, root `AGENTS.md`: inventory / router / pipeline-table rows.
- `docs/index.html` via site rebuild; version bump + integrity regen at ship.

No validator-code change: pre-advance stays doc-enforced for 6b (same posture as `reviewFix`), so no existing `validate_state` test needs rework.

Layer edits (config `stack.backend.layers`): `skills-sot` (new skill + contract docs), `tests` (new regression test). No `installer-cli` logic change; site rebuild only.

## 3. Step-by-Step Plan

1. Scaffold `ws-fresh-verify` skill shell: `SKILL.md` (state machine + done-when gates), `TEMPLATE.md` (report shape). Affected files: `.agents/skills/ws-fresh-verify/SKILL.md`, `.agents/skills/ws-fresh-verify/TEMPLATE.md`. Checks: 3-tier layout, <=150-line body, portable prose (no internal spec numbers, no host product names), explicit `node` launchers.
2. Implement `build_fresh_dispatch.cjs`: compact-handoff emission + fail-closed prior-output refusal. Affected files: `.agents/skills/ws-fresh-verify/scripts/build_fresh_dispatch.cjs`. Checks: dashed-flag normalization, unknown-flag failure, `--help` text, exit codes (0 ok / 2 usage / 1 refused input).
3. Implement `run_fresh_injection.cjs`: scratch-worktree lifecycle + invert + red capture + byte-identical restore + removal. Affected files: `.agents/skills/ws-fresh-verify/scripts/run_fresh_injection.cjs`. Checks: every declared path changes bytes (else exit 1 `invert-did-not-change-every-path`); test command must equal a configured `*Test` alias (mirror `run_sabotage.cjs`); restore verified against pre-invert snapshot; worktree removed even on failure paths; no whole-tree verbs (allow-listed scoped `git worktree add/remove` only).
4. Implement `write_fresh_report.cjs`: evidence-or-zero scoring + report writer + round accounting (exit 0/2/3). Affected files: `.agents/skills/ws-fresh-verify/scripts/write_fresh_report.cjs`. Checks: missing pass evidence or missing red signal forces zero + defect entry naming the gap; round history appended, never rewritten; report matches TEMPLATE.md sections.
5. Wire contracts: STEP-DISPATCH §6b, ARTIFACTS.md row + advance-to-7 requirement, gates.md fix-loop section + auto-gate row, git-ownership.md scratch rules + matrix row. Affected files: the four contract docs. Checks: quoter sweep for retired phrasing (no forked rules), portable prose, en-us.
6. Register the skill: both `skill-dependencies.json` copies, `test-suites.json`, CATALOG.md, FEATURES.md, README.md, root AGENTS.md. Affected files: registration surfaces. Checks: id string identical everywhere (`ws-fresh-verify`); no legacy aliases.
7. Write `test/test-fresh-verify.js` (§5 mapping) and register it. Affected files: `test/test-fresh-verify.js`, `test/test-suites.json`. Checks: temp fixture git repos (mirror the sabotage fixture pattern in `test-hermes-spec-to-pr-enhancements.js`); no network; suite side-effect free for `.ws/config.json`.
8. Ship hygiene: site rebuild + version bump, integrity regen from a clean tree (untracked skill-tree files moved aside first), full `npm run test`, `ws-check-harness`, `test-harness-clean.js` 0 findings. Checks: digest actually changed in the commit; no `.py` under skills/`bin/`.

## 4. Permissions, Tenancy & i18n

N/A — agent-harness skill package. No auth surface (stage runs local commands on the existing worktree), no tenant data (no consumer PII in artifacts; source anonymization applies to specs/commits/PRs), no user-facing strings requiring i18n (en-us skill prose only).

## 5. Test Coverage

`test/test-fresh-verify.js` maps each AC to named assertions:

- AC1: `build_fresh_dispatch` emits compact handoff with only spec/plan/product-tree/AC list; refuses `--prior-output step-05-*.plan.report.md` (exit 1); refuses exec/DAG paths.
- AC2: `write_fresh_report` requires file:line evidence for every pass verdict; verdict JSON missing evidence forces zero.
- AC3: `run_fresh_injection` on a fixture repo records `redObserved` with failing test name + non-zero exit code; invert patch that changes no declared path exits 1.
- AC4: AC without pass evidence or without red signal scores zero and appears in the defect list with the missing evidence named (both gaps covered).
- AC5: round 1-2 with defects exits 2 (fix loop continues); round 3 with defects exits 3 with residual list (Pause signal); zero defects exits 0.
- AC6: report file exists with per-AC verdict table, evidence links, injection results, round history sections (TEMPLATE.md shape assertion).
- AC7: STEP-DISPATCH.md carries the 6b placement section (after Step 6, before Step 7) with skip rules; ARTIFACTS.md carries the `step-05b` map row; skip path: `write_fresh_report --skip no-product-changes` writes the marker and exits 0.
- AC8: after injection the scratch worktree is gone from `git worktree list` and primary-tree bytes equal the pre-injection snapshot; simulated restore failure aborts (exit 1) before any report/fix step.

Negative scenarios from the spec: injected-fault pass recorded as defect (not pass); zero-evidence AC scores zero despite ledger pass; unrestored injection aborts before fix dispatch; 3 exhausted rounds Pause with residual list. Each is a named test block.

## 6. Stack & Security Invariants Verification Plan

Stack: Node 22 skill package (`node-skills-package`); no `{skillsRoot}/ws-shared/runtime/stacks/` rule pack applies (spec Notes). Touched framework boundaries: none of auth/async/DTO/subscription — the scripts are synchronous CLI helpers over the local git tree.

Applicable harness invariants (verified at implement + review):

- Node-only runtime: new helpers are `.cjs`, stdlib + in-repo helpers only, zero npm deps; recipes invoke via `node`.
- CLI hygiene: dashed flags normalized to camelCase keys; unknown flags fail loudly; every documented flag covered by an assertion.
- EOL safety: preserve target-file dominant EOL on append; patch CRLF files via Node replace with explicit `\r\n` anchors; verify cross-module exports with a smoke require.
- Git ownership: path-scoped staging only; no whole-tree verbs; scratch worktree verbs scoped to the stage dir; foreign dirty paths untouched.
- Integrity: regenerate only when the tree holds this slug's hashed files alone (move untracked skill-tree files aside, regen, verify, commit, restore); confirm digest change.
- Secrets: no tokens/PATs/hostnames in skill bodies, scripts, tests, or reports (report carries file:line evidence and exit codes only).
- Portable prose: no internal spec/issue/PR numbers, no host product names in shipped text.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot + tests only; no installer logic change).
- [ ] New skill follows the 3-tier layout with verifiable done-when gates.
- [ ] Stack & security invariants verified (§6 list, all green).
- [ ] Test cases cover all ACs (AC1-AC8 + 4 negative scenarios, named blocks).
- [ ] Registration surfaces in sync (deps ×2, suites, CATALOG, FEATURES, README, AGENTS, site).
- [ ] Integrity regenerated from a clean tree and verified; digest changed in commit.
- [ ] `npm run test`, `ws-check-harness`, `test-harness-clean.js` all green.

## 8. Open Questions

None blocking. Decisions recorded: (a) new skill id `ws-fresh-verify` (standalone style, no family rename needed); (b) stage modeled as a Step 6 substep (no FSM renumber, mirrors `reviewFix`); (c) pre-advance enforcement stays doc-level for 6b (no `validate_state.cjs` change, no existing-test rework); (d) injection reuses sabotage vocabulary via a dedicated worktree wrapper rather than modifying `run_sabotage.cjs` (no behavior change to the Step 7 path).
