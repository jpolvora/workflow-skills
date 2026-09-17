---
step: 1
slug: ws-preview-before-ship-gate
workflowId: ws-preview-before-ship-gate-20260917T011747Z
status: completed
startedAt: "2026-09-17T01:17:47Z"
endedAt: "2026-09-17T01:34:08.136Z"
acRefs: []
---
# Implementation Plan — Optional ws-preview dry-run gate in ws-ship-pr before Create PR

## 0. Summary & Business Rules

- **Objective:** `ws-ship-pr` gains an optional, non-blocking Step 4b that runs the consumer's `preview.dryRunCommand` (owned by `ws-preview`) once, after the workflow close (`status: completed`) and after the ship commit/push step, immediately before the provider Create PR step. It reports the result on the Prepare-to-PR board and always continues to Create PR.
- **Business rules:**
  - Gate runs only when Create PR will actually execute; skipped with a recorded reason otherwise (`shipAction: skip|push-only`, `dry-run`, or a standalone run with no PR).
  - Enablement: `preview.previewBeforeShip` explicit `false` disables; omitted or any non-`false` value means enabled (default `true`).
  - Reuse contract: run `preview.dryRunCommand` verbatim from the consumer repo root, long-lived call (>= 600000 ms), no extra flags, **never publish PR threads**, nothing downloaded.
  - Non-blocking: non-zero exit or findings are reported; ship, merge, and PR handoff continue.
  - SCM-independent: identical for `github` and `azure-devops`; provider resolution and `validate-auth` stay inside Step 5.
- **State of work:** the implementation for this spec already exists in the working tree (uncommitted, recorded as `preExistingDirty` at bootstrap). Step 2 therefore verifies, completes, and commits it — it does not build from zero.

## 1. Definition of Ready & Scope

- **In scope (file surfaces):**
  - `.agents/skills/ws-ship-pr/SKILL.md` — Step 4b block between Step 4 (commit/push) and Step 5 (Create PR).
  - `.agents/skills/ws-preview/SKILL.md` — cross-reference note for the automatic pre-Create-PR run.
  - `.agents/skills/ws-shared/runtime/config.schema.json` — `preview.previewBeforeShip` boolean, default `true`.
  - `.agents/skills/ws-shared/templates/config.json.example` — seed `previewBeforeShip: true` + comment.
  - `.agents/skills/ws-shared/config.json` — project seed `true` with `_comment_previewBeforeShip`.
  - `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` — preview checkbox row (`-Type 'bool' -DefaultVal $true`).
  - `.agents/skills/ws-configure-project/INTERVIEW.md` — § Preview prose + table row.
  - `FEATURES.md` — 0.4.33 row note; `bin/skill-integrity.json` — regenerated manifest.
  - `.agents/specs/0089-ws-preview-before-ship-gate.spec.md` — spec of record (frontmatter `slug` unprefixed).
- **Out of scope:** blocking ship, auto-fixing findings, new reviewer backend/wrapper, PREPARE-CHECKLIST required row, `skipQualityGates` semantics change, release version bump (per spec Out of Scope).
- **ACs (AC1–AC9)** and negative scenarios (NS1–NS5) are defined in `step-00-ws-preview-before-ship-gate.spec.md`; each AC is mapped in §3 and §5 below.

## 2. Technical Design & Architecture

- **Change class:** skill prose + shared-hub config surfaces. No runtime code paths, no endpoints, no shared mutable state. The only executable behavior is the consumer-owned shell command executed by the consumer's agent at ship time.
- **Design decisions:**
  - Gate placement inside `ws-ship-pr` (not the orchestrator) so it works for both workflow and standalone ship paths and observes the final pushed tree (delivery artifacts included) — AC1.
  - Enablement resolution implemented as "not explicit `false`" rather than schema-only enforcement, so existing consumers without the key get the gate — AC3.
  - Empty-command skip is `trim()`-based (`whitespace-only counts as empty`) — AC4.
  - Board summary only; never a STOP, never PR threads — AC6/AC9.
- **Integrity coupling:** all edited `.agents/skills/**` files are hashed by `bin/skill-integrity.json`; the manifest must be regenerated after the last hashed edit and before commit (MEMORY trap: `Latest integrity regeneration must precede ship commit`).
- **Config-surface coupling:** any new `config.json` key must appear in schema + example + GUI + INTERVIEW (MEMORY trap: config key sync).

## 3. Step-by-Step Plan

1. **Verify Step 4b placement and semantics in `ws-ship-pr`** — confirm the block sits after Step 4 commit/push and before Step 5 Create PR; skip conditions (`shipAction` skip/push-only, `dry-run`, no PR), explicit-`false` disable, trimmed-empty command, consumer-root execution, >=600000 ms timeout, no extra flags, board summary, non-blocking continuation. (AC1, AC2, AC3, AC4, AC5, AC6, AC7)
2. **Verify `ws-preview` cross-reference** — the automatic pre-Create-PR run and the same never-publish contract are noted. (AC5, AC7)
3. **Verify config surfaces** — schema key `preview.previewBeforeShip` (boolean, default true), template seed `true` + comment, project `config.json` seed `true` + `_comment_previewBeforeShip`. (AC3, AC8)
4. **Verify GUI + interview surfaces** — `Edit-WorkflowSkillsConfig.ps1` boolean row under the preview section defaulting to true; `INTERVIEW.md` § Preview prose + table row documenting the reuse and the explicit-`false` opt-out. (AC8)
5. **Verification battery + integrity close-out** — run authoring validation, GUI test, harness clean audit, full `npm run test`, then `npm run generate-integrity && npm run verify-integrity` as the final pre-commit action; confirm `FEATURES.md`/`CHANGELOG` notes; re-check NS1–NS5 prose encoding. (AC8, AC9, NS1–NS5)

## 4. Permissions, Tenancy & i18n

- **N/A:** no RBAC/permissions surfaces, no tenancy fields, no user-facing strings; skill bodies remain en-us only.

## 5. Test Coverage

| AC | Verification | Evidence |
|----|--------------|----------|
| AC1 | Prose assertion: Step 4b between Step 4 and Step 5 in `ws-ship-pr/SKILL.md`; gate runs after close (state `status: completed`) before provider `validate-auth`/`create-pr`. | `git diff` hunk at `.agents/skills/ws-ship-pr/SKILL.md` Step 4b |
| AC2 | Prose assertion: skip reasons enumerated for `skip`, `push-only`, `dry-run`, standalone no-PR. (NS4) | Step 4b sentence "only when Step 5 Create PR will actually run" |
| AC3 | Prose + config: "not explicit `false` (default `true`)" in Step 4b; schema default true; template/config seeds true. (NS3) | `config.schema.json`, `config.json.example`, `config.json` diffs; `node test/test-powershell-config-editor.js` |
| AC4 | Prose: "trimmed non-empty (whitespace-only counts as empty)" skip with reason. (NS2) | Step 4b sentence; no backend vendored (`ws-preview/SKILL.md` unchanged contract) |
| AC5 | Prose: run command verbatim from consumer repo root (git top-level, else `$PWD`), no extra flags, long-lived call >=600000 ms; never-publish line present. (NS5) | Step 4b + `ws-preview` cross-reference |
| AC6 | Prose: summary recorded on Prepare-to-PR board; "report and continue to Step 5 regardless"; never blocks ship/merge/handoff. (NS1) | Step 4b closing sentence |
| AC7 | Prose: no provider CLI recipes in Step 4b; provider work remains in Step 5. | Step 4b references `ws-preview` only; Step 5 unchanged |
| AC8 | Config-surface sync battery: schema/template/project/GUI/INTERVIEW; GUI checkbox test green; `npm run test`. | `node test/test-powershell-config-editor.js`; `npm run test` |
| AC9 | Negative-path prose: non-zero exit still reaches Step 5; no PR threads in any outcome. (NS1, NS5) | Step 4b; harness reviews |
| NS1–NS5 | Prose assertions mapped above; live confirmation of the happy path happens at Step 4 ship, where the gate executes `npm run review:dry` for real (outside this repo's PR threads). | Plan §3 step 5 |

- **Regression guard:** `bin/skill-integrity.json` regenerated last; `npm run verify-integrity` green; `node test/test-harness-clean.js` zero findings.
- **Defect-class sibling sweep (repo-wide):** confirm no other ship-path or preview surface still claims the dry-run is standalone-only (`git grep -n "standalone" -- .agents/skills/ws-preview .agents/skills/ws-ship-pr`; check `CATALOG.md`/hub tables for stale wording added by accident).

## 6. Stack & Security Invariants Verification Plan

- **Config invariants:** `commitPlanFilesOnlyAtStep8: true` (never commit `{plansDir}` outside delivery), `skipQualityGates: false`; all other `invariants.*` are false and unaffected.
- **Stack pack:** `node-skills-package` has no dedicated pack under `.agents/skills/ws-shared/runtime/stacks/`; the analogous `typescript-node.md` is not applicable to Markdown/JSON/PowerShell surfaces. Verification here is integrity + portability, not runtime boundaries.
- **Touched framework boundaries:** authorization, async safety, DTO validation, subscription cleanup — **N/A** (no runtime code path added; the only execution is the consumer's configured shell command, owned by the consumer).
- **Portability & prose invariants (spec DoR):** en-us only; no host-product names; portable path tokens; no internal spec numbers in shipped bodies; no new dependency edges (`ws-ship-pr` reuses the configured command; `ws-preview` ships no scripts).
- **Integrity invariant:** last hashed edit precedes `npm run generate-integrity && npm run verify-integrity`; then `npm run test` immediately before commit (MEMORY traps `Latest integrity regeneration must precede ship commit`, `Regenerate integrity from a clean tree only`).

## 7. Pre-PR Checklist

- [ ] Step 4b present and ordered between Step 4 and Step 5 in `ws-ship-pr/SKILL.md`.
- [ ] `ws-preview` cross-reference present.
- [ ] Schema/template/project/GUI/INTERVIEW config surfaces in sync.
- [ ] `FEATURES.md` and `CHANGELOG` mention the gate.
- [ ] Authoring validation PASS; GUI tests green; `npm run test` green.
- [ ] `npm run generate-integrity && npm run verify-integrity` green (regenerated last).
- [ ] `node test/test-harness-clean.js` zero findings.
- [ ] No `{plansDir}` paths staged at G2-code; only `files_touched`.

## 8. Open Questions

- **None blocking.** Note: at Step 4 ship, Step 4b will for real execute `npm run review:dry` (needs network + `OPENCODE_API_KEY`); if it fails, the gate reports and shipping continues (that behavior is itself the AC6 proof).
- Working tree carries the implementation as `preExistingDirty`; G2-code staging (Step 2) treats these paths as workflow-owned `files_touched`, not unrelated WIP.
