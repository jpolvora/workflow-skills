---
slug: dispatch-prompt-audit-trail
title: Dispatch prompt audit trail
status: completed
step: 2
workflowId: dispatch-prompt-audit-trail-20260930T043902Z
startedAt: "2026-09-30T04:47:53.312Z"
endedAt: "2026-09-30T04:47:53.312Z"
acRefs: []
---
## 0. Summary & Business Rules

Persist a durable per-step dispatch-prompt audit pair beside existing step artifacts on
every standard dispatch and every lite inline step boundary:

- `{us-dir}/step-{NN}-{slug}.prompt.md`: exact `build_dispatch_context.cjs` output bytes.
- `{us-dir}/step-{NN}-{slug}.prompt.json`: budget/refs/hash manifest (step, slug,
  sourceSkill, acRefs, budgetBytes, fixedPreambleBytes, mandatoryBytes, totalBytes,
  memoryBytes, promptSha256, createdAt, dispatchMode, revision).

Both files are linked from `state.stepDispatches[]` (`promptPath`, `promptSha256`) and
from the `telemetry.jsonl` dispatch event, survive Phase A/B cleanup, stay out of
G2-code staging and the default Step 8 delivery set, and gate the next pre-advance
(missing or hash-mismatched pair fails closed naming the step). Dispatch builder
semantics, budget caps, and progressive-disclosure rules are unchanged; the volatile
`.runtime/step-{N}-dispatch-prompt.md` builder output remains the working scratch.

Business rules:

- Audit durability only; no behavior change to dispatch content, budgets, or disclosure.
- Atomic writes (temp file plus rename); a crashed dispatch never leaves a half-written
  markdown without its manifest (write order markdown-first/manifest-second plus a gate
  that requires both yields fail-closed, never half-passing).
- Prompt markdown is UTF-8 with LF normalization, matching the builder output contract.
- Grandfathering: steps whose `stepDispatches` entry carries no `promptPath` (dispatched
  before this feature) are exempt from the pre-advance prompt gate; no retroactive
  backfill (out of scope per spec).
- Prior-sha placement (interview G7): `priorPromptSha256` lives on the telemetry
  re-dispatch event and the writer manifest only; the `stepDispatches` entry keeps the
  latest pair (existing replace-by-step stays latest-only).
- Re-dispatch verbs (interview G8): Replay/Refine/Previous are all "second `dispatch`
  to the same step" through the existing replace path; no new substep vocabulary.

## 1. Definition of Ready & Scope

Resolved assumptions (all Confirmed y in spec): filename pattern
`step-{NN}-{slug}.prompt.md` + `.prompt.json`; DAG per-node filenames
`step-04-{slug}.prompt.{node}.md`; re-dispatch overwrites pair, bumps revision, keeps
prior sha in telemetry; preserved by Phase A and Phase B; lite parity with
`dispatchMode: inline` plus skip markers; fail-closed pre-advance; no auth/rate-limit
surface (local atomic write).

Acceptance Criteria (10, all in scope):

- AC1: standard orch persists each dispatched step prompt to
  `{us-dir}/step-{NN}-{slug}.prompt.md` before the dispatch completes (NN zero-padded).
- AC2: sibling `.prompt.json` manifest carries step, slug, sourceSkill, acRefs,
  budgetBytes, fixedPreambleBytes, mandatoryBytes, totalBytes, memoryBytes,
  promptSha256, createdAt, dispatchMode, revision.
- AC3: prompt bytes equal exact builder output; manifest sha matches the file;
  totalBytes and fixedPreambleBytes respect configured budget caps.
- AC4: `state.stepDispatches[]` entry and `telemetry.jsonl` dispatch event record
  promptPath and promptSha256.
- AC5: parallel DAG dispatches write per-node prompts
  `step-04-{slug}.prompt.{node}.md` + per-node manifest without sibling overwrites.
- AC6: re-dispatch (Replay, Refine, Previous) overwrites the pair, bumps revision,
  appends a re-dispatch telemetry event preserving the prior sha.
- AC7: pairs registered in `ARTIFACTS.md`, preserved by Phase A/B cleanup, never staged
  by G2-code, excluded from the default Step 8 delivery set.
- AC8: lite inline steps write the same pair with `dispatchMode: inline` at each
  executed step boundary, or a skip marker entry when skipped.
- AC9: missing or hash-mismatched pair fails the next pre-advance with the step named.
- AC10: writer adds no secrets/tokens/PATs/hostnames beyond the already-inlined MEMORY
  slice and config pointers in the dispatch output.

Out of scope: worker response transcripts; host transcript capture
(`agentTranscripts`); retroactive backfill; Step 8 default commit of prompt pairs
(stays a deferred opt-in toggle decision).

## 2. Technical Design & Architecture

Stack (`config.json` → `stack.id: node-skills-package`, Node 22 skill package;
layers `skills-sot` / `installer-cli` / `tests`; operative invariant
`commitPlanFilesOnlyAtStep8: true`). Consumer stack rule packs under
`{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this repo. Operative knobs:
`defaults.contextBudget` (default 32000) and `defaults.deliveryCommitArtifacts`.

Components (all edits under the in-tree `.agents/skills/` SoT plus `test/`):

1. **New writer script**
   `.agents/skills/ws-spec-to-pr/scripts/write_dispatch_prompt_audit.cjs` (Node CJS,
   new file written LF per repo normalization; see refined §3 EOL rule):
   - Args: `--us-dir DIR --step N --slug SLUG --prompt-file FILE --manifest FILE
     [--node NODE] [--dispatch-mode standard|inline] [--skip-marker] [--json]`.
     Dashed→camelCase normalization with loud failure on unknown flags.
   - `--prompt-file`: builder `--output` bytes (already LF-normalized by the builder);
     copied verbatim, never re-encoded. `--manifest`: builder `--manifest` JSON
     (budget/refs source).
   - Writes `step-{NN}-{slug}.prompt.md` + `step-{NN}-{slug}.prompt.json` atomically
     (write `<file>.tmp.<pid>` then `fs.renameSync` in the same directory).
   - Manifest fields: `schemaVersion: 1`, step, slug, sourceSkill, acRefs,
     budgetBytes, fixedPreambleBytes, mandatoryBytes, totalBytes, memoryBytes,
     promptSha256 (sha256 of the exact markdown bytes), createdAt (ISO), dispatchMode,
     revision (1 on first write; existing + 1 on overwrite), plus `node` for DAG
     per-node pairs and `priorPromptSha256` on overwrite.
   - DAG: `--node <id>` sanitizes to filename-safe `[A-Za-z0-9_-]+` (any other char
     becomes `-`; empty after sanitize is a hard error — interview G4: observed ids
     like `T1` make this purely defensive) and writes
     `step-04-{slug}.prompt.{node}.md`/`.json`.
   - `--skip-marker` (lite skipped steps): writes only the `.prompt.json` manifest
     with `skipped: true`, `promptSha256: null`, `dispatchMode: inline`, revision 1;
     no markdown. Gate treats a skip-marker manifest as satisfied for skipped steps.
   - Prints JSON result `{ ok, promptPath, promptSha256, revision, priorPromptSha256 }`
     with `--json` (repo-relative promptPath, forward slashes).
   - No secrets: verbatim builder bytes plus the fixed manifest schema; never reads
     env, tokens, or host identity.

2. **`workflow_state.cjs` provenance (AC4, AC6)** — same-file edits via CRLF-aware
   Node patch scripts (never hand-edit EOL):
   - `dispatch` accepts `--prompt-path PATH --prompt-sha256 SHA`: stored on the
     `stepDispatches` entry and copied onto the `dispatch` telemetry event via
     `commonEvent` additions. Reject absolute paths and `..` segments (repo-relative
     only).
   - `finish` accepts the same pair and backfills the entry when dispatch did not
     carry it (covers lite inline: prompt written at the step boundary equals finish
     time; standard orch passes them at dispatch). No lite script change needed —
     lite `update_state.cjs` wraps the same `runUpdateCli` (interview G5).
   - Re-dispatch: the existing replace-by-step gains prior-sha retention — when the
     replaced entry carried a different `promptSha256`, the new dispatch event carries
     `priorPromptSha256`. The writer bump (revision+1) is invoked by the orch before
     re-dispatch; `update_state` never writes prompt files itself (single-writer rule).
   - `workflow-state.schema.json`: extend `stepDispatches.items.properties` with
     optional `promptPath` + `promptSha256` strings — mandatory because the item
     schema sets `additionalProperties: false` (interview G1).
   - `telemetry.schema.json`: declare `promptPath`, `promptSha256`,
     `priorPromptSha256` (optional strings; `additionalProperties: false` makes this
     mandatory).

3. **Pre-advance prompt gate (AC9)** in `validateSnapshot`:
   - For flow standard, pre-advance `next`: for each step in `1..next-1` present in
     `completedSteps` (excluding skipped steps), look up its `stepDispatches` entry:
     no entry or no `promptPath` means grandfathered (exempt); otherwise require the
     pair at `{us-dir}/{promptPath}` + sibling `.prompt.json`, recompute sha256 over
     the markdown bytes, and compare to both the manifest `promptSha256` and the
     entry `promptSha256`. Any absence or mismatch pushes
     `dispatch prompt audit missing|mismatch for step {N}: ...` (step number named).
   - DAG step 4: satisfied by the plain pair OR at least one per-node pair matching
     `step-04-{slug}.prompt.*.md` with valid sibling manifests (node set is dynamic;
     the gate must not depend on exec-file presence).
   - Lite flow: same loop over lite completed steps; a skip-marker manifest
     (`skipped: true`) satisfies a skipped step; executed lite steps require the full
     pair when their dispatch entry carries `promptPath`.
   - Budget-cap cross-check (AC3): manifest `fixedPreambleBytes <= 18000` and
     `totalBytes <= budgetBytes`; violations fail the gate (defense in depth — the
     builder already enforces, but a hand-edited manifest must not pass).

4. **Recipe + registry docs**:
   - `ws-spec-to-pr/STEP-DISPATCH.md` § Dispatch context: after the builder call, run
     the builder with `--manifest {us-dir}/.runtime/step-{N}-dispatch-manifest.json`,
     then the writer with `--prompt-file` + `--manifest`; pass the writer JSON result
     to `update_state dispatch --prompt-path ... --prompt-sha256 ...`. Re-dispatch
     paragraph: re-run writer (revision bump) then dispatch (prior sha telemetry).
   - `ws-spec-to-pr/ARTIFACTS.md`: registry rows for the prompt pair (+ DAG per-node
     variant), `Committable: No`; extend § Step 8 "Still never staged" with the
     `step-{NN}-{slug}.prompt.*` glob; note the pre-advance gate in § Step input
     prerequisites.
   - `ws-spec-to-pr/protocols/artifact-cleanup.md`: add prompt pairs to the Preserved
     list (both phases preserve; Phase B delete list unchanged).
   - `ws-spec-to-pr-lite/SKILL.md`: new invariant — at each executed inline step
     boundary run builder (prompt bytes for the inline step context) + writer with
     `--dispatch-mode inline`; skipped steps write `--skip-marker`; pass writer
     result to `finish` (backfill path).
   - G2-code (AC7): `commit_g2_code.cjs` already stages `files_touched` minus
     `{plansDir}` — prompt pairs under `{us-dir}` are structurally excluded; no code
     change, but the regression test pins it and ARTIFACTS.md states it.

5. **Tests** `test/test-dispatch-prompt-audit.js` (hermetic temp-dir fixture) plus a
   `test/test-suites.json` `local` entry in the same change (interview G2 — enumerated
   suites, no glob discovery):
   - Sequential, DAG, replay, lite-inline, cleanup-preserved, gate missing/mismatch,
     budget-exceed fail-closed, no-secrets scan, G2-code exclusion, registry sync
     (full mapping in refined §5).

6. **Dependency graph check**: writer is same-skill (`ws-spec-to-pr/scripts/`),
   requires only Node builtins (`crypto`, `fs`, `path`) — no new cross-skill require,
   no `bin/skill-dependencies.json` edge. `workflow_state.cjs` gains no new requires.
   Callers touched: STEP-DISPATCH recipe (orch behavior), lite SKILL (orch behavior),
   telemetry schema consumers (additive only). No site-card changes (orch behavior, no
   user-facing feature surface).

## 3. Step-by-Step Plan

1. **Writer script** — create
   `.agents/skills/ws-spec-to-pr/scripts/write_dispatch_prompt_audit.cjs` (new file LF;
   CRLF-aware Node patch scripts for every edit to CRLF siblings — interview G3):
   arg parsing, node-id sanitize, atomic temp+rename writes, manifest schema incl.
   revision bump and `--skip-marker`, `--json` result output. Files: 1 created.
   Engineering checks: byte-exact copy (no re-encoding); rename same-directory.
2. **Provenance in `workflow_state.cjs`** — `dispatch`/`finish` accept
   `promptPath`/`promptSha256`; `stepDispatches` entry + `commonEvent` carry them;
   re-dispatch replace preserves prior sha as `priorPromptSha256` on the new event;
   reject absolute/`..` prompt paths. Files: 1 modified. Checks: existing
   dispatch/finish suites stay green; no new requires.
3. **Telemetry + state schemas** — declare `promptPath`, `promptSha256`,
   `priorPromptSha256` in `telemetry.schema.json`; extend
   `workflow-state.schema.json` `stepDispatches.items.properties` with `promptPath` +
   `promptSha256`. Files: 2 modified. Checks: schema validation suites green.
4. **Pre-advance gate** — `validateSnapshot` prompt-pair loop with grandfathering,
   DAG variant, lite/skip-marker variant, budget cross-check, step-naming errors.
   Files: same `workflow_state.cjs`. Checks: new gate cases + full existing
   `validate_state` suites green (grandfather exemption keeps old fixtures passing).
5. **Recipe + registry docs** — STEP-DISPATCH.md recipe (+ builder `--manifest` flag,
   writer call, dispatch flags, re-dispatch paragraph); ARTIFACTS.md rows +
   never-staged glob + prerequisites note; artifact-cleanup.md preserved list; lite
   SKILL.md inline invariant. Files: 4 modified.
   Checks: `test-harness-clean.js` link/path checks green.
6. **Regression tests** — `test/test-dispatch-prompt-audit.js` covering §5 mapping +
   `test/test-suites.json` entry. Files: 1 created, 1 modified. Checks: new suite
   green in isolation, then full `npm run test` green.
7. **Integrity + ship prep** — `npm run generate-integrity` + `npm run verify-integrity`
   from a clean skill tree (unrelated dirty work stashed first per the clean-tree
   trap); version bump per ship protocol at Step 8 (single bump for the PR).

## 4. Permissions, Tenancy & i18n

N/A — local file writer with no network, auth, tenancy, or user-facing strings.
AC10 (no secrets) is covered by design (§2 item 1) and pinned by test (§5 AC10 case).
No RBAC, no tenant isolation surface, no i18n keys.

## 5. Test Coverage

| AC | Test case(s) in `test/test-dispatch-prompt-audit.js` |
|----|------------------------------------------------------|
| AC1 | `sequential dispatch persists step-NN prompt markdown` — writer output exists at `step-01-{slug}.prompt.md`, bytes identical to builder `--output`. |
| AC2 | `manifest carries the full field set` — assert all 13 fields present with types (step int, revision int ≥1, createdAt ISO, dispatchMode enum). |
| AC3 | `bytes equal builder output and sha matches` (same test as AC1 plus sha recompute); `budget caps respected` — manifest `fixedPreambleBytes ≤ 18000`, `totalBytes ≤ budgetBytes`; `budget exceed fails before write` — temp skill fixture with an over-budget `## Subagent contract` makes the builder exit non-zero and no pair files exist (interview G9). |
| AC4 | `dispatch records promptPath and promptSha256` — `update_state dispatch` with flags lands on `stepDispatches[]` and the `telemetry.jsonl` dispatch event (schema-valid). |
| AC5 | `parallel DAG node pairs coexist` — two `--node` writes produce distinct `.prompt.{node}.md/json`; neither overwrites the other; gate passes with node pairs only. |
| AC6 | `re-dispatch bumps revision and preserves prior sha` — second writer run overwrites bytes, `revision: 2`, manifest `priorPromptSha256` set; second dispatch event carries `priorPromptSha256`. |
| AC7 | `registry lists prompt pairs as non-committable` — ARTIFACTS.md rows + never-staged glob assertions; `cleanup preserves prompt pairs` — Phase B delete globs (read from the protocol file) do not match prompt pairs; `G2-code stage set drops prompt paths`. |
| AC8 | `lite inline boundary writes dispatchMode inline pair` — writer with `--dispatch-mode inline`; `skip marker satisfies skipped steps` — `--skip-marker` manifest, no markdown, gate passes for skipped step. |
| AC9 | `missing pair fails pre-advance naming the step`; `tampered markdown fails with mismatch naming the step`; `grandfathered dispatch without promptPath passes` (old-run compat). |
| AC10 | `writer emits no secret shapes` — manifest JSON scanned for token/PAT/key patterns; prompt markdown is verbatim builder bytes (no writer-added content). |

Negative & failing scenarios from the spec map 1:1 to the AC9/AC3/AC5/Phase-B cases
above. Method style follows existing suites (`node:test` + `assert/strict`, hermetic
`fs.mkdtempSync` fixtures, `child_process` spawn with `stdio: pipe`).

## 6. Stack & Security Invariants Verification Plan

Stack: `node-skills-package` (Node 22); layers touched: `skills-sot`
(`.agents/skills/...` writer, provenance, schemas, recipe docs) and `tests`
(`test/test-dispatch-prompt-audit.js`, `test/test-suites.json`). Consumer stack rule
packs N/A. Operative config invariant: `commitPlanFilesOnlyAtStep8: true` — honored:
no `{plansDir}` paths are staged before Step 8, and prompt pairs are never staged at
all (registry `Committable: No` + G2-code plansDir exclusion + no delivery toggle).

Touched boundaries:

- **File-write atomicity** (new writer): temp+rename in the same directory; verified by
  code review of the writer plus the crash-order argument (markdown first, manifest
  second, gate requires both → crash fails closed, never half-passing).
- **Input validation & injection defenses**: `--node` sanitize to `[A-Za-z0-9_-]`
  (path traversal impossible — no slashes survive); `--step` integer range 0–9;
  unknown flags fail loudly (no silent defaults); repo-relative `promptPath` only
  (absolute or `..` paths rejected at dispatch/finish time).
- **Async safety**: writer is fully synchronous (`fs.writeFileSync`/`renameSync`) —
  no floating promises, no cancellation surface.
- **Secrets hygiene (AC10)**: writer never reads env/host identity; manifest is a
  fixed schema; regression test scans for secret shapes.
- **Schema fail-closed**: both schemas keep `additionalProperties: false`; new keys
  declared; existing telemetry/state suites must stay green.
- **Back-compat**: grandfather exemption keeps in-flight pre-feature runs advancing;
  pinned by the AC9 grandfather test.

## 7. Pre-PR Checklist

- [ ] Writer script created with atomic writes, revision bump, DAG sanitize, skip marker.
- [ ] `dispatch`/`finish` provenance flags land on `stepDispatches[]` + telemetry.
- [ ] Telemetry/state schemas declare new keys; `additionalProperties` intact.
- [ ] Pre-advance gate fails closed naming the step; grandfathered runs pass.
- [ ] STEP-DISPATCH recipe, ARTIFACTS registry, cleanup preserved set, lite invariant.
- [ ] `test/test-dispatch-prompt-audit.js` covers AC1–AC10 + suites entry; full suite green.
- [ ] Integrity regenerated from clean tree + verified; version bumped once (Step 8).
- [ ] G2-code exclusion pinned; no new cross-skill requires (no dependency edge).

## 8. Open Questions

None open — interview closed all gaps (`blocking_open: 0`). Deferred per spec context
(not this change): `includeDispatchPrompts` delivery toggle, prompt diff view across
revisions, retention policy for long runs.
