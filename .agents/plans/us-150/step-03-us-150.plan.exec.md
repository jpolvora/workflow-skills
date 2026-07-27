# Execution Plan — US-150

**Source plan:** `.agents/plans/us-150/step-02-us-150.plan.refined.md`  
**Execution mode:** `parallel`

## Sizing decision

| Metric | Measured | Sequential limit | Result |
|---|---:|---:|---|
| Refined implementation steps | 7 | 3 | exceeded |
| Expected unique changed files | 52 | 6 | exceeded |
| Safe DAG levels | 6 | 2 | exceeded |
| Atomic tasks | 9 | n/a | parallel DAG required |

The independent authoring, documentation, and package-registration changes form Level 1. No concurrent tasks in any level edit the same file. Generated evals and the release bump are intentionally serialized because each generator has repository-wide write scope.

## Levels and tasks

### Level 1, independent source changes

#### T1: Create the optional engineering-delivery skill
- **Depends on:** none
- **Files:** `.agents/skills/ws-senior-developer/SKILL.md`
- **Work:** Use the `ws-write-a-skill` preflight decisions to add the concise, model-invoked gate. Include portable context reads, triviality and explicit-request branches, plan routing, the sole detailed Code review proof checklist, policy/managed-skill boundary, and Done-when criteria. Do not add scripts, autoloading, or dependency edges.
- **Acceptance:** AC1–AC5, AC8. Frontmatter name matches folder; description exposes engineering-delivery triggers and optional activation; body is en-us, portable, within the preferred 100-line budget, and every phase has a checkable completion condition.

#### T2: Document opt-in resolution and routes
- **Depends on:** none
- **Files:** `.agents/skills/ws-shared/config.json.example`, `.agents/skills/ws-shared/setup.md`, `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `README.md`
- **Work:** Keep `rules.seniorDeveloper` empty by default; document `.agents/skills/ws-senior-developer/SKILL.md` as its explicit opt-in value. Add root Layer 1 and task-router inventory, packaged Workflows-only inventory/router, shared promoted-utility/router, resolution wording, and human-facing availability. Do not duplicate the skill's detailed checklist or claim the installer creates a consumer root `AGENTS.md`.
- **Acceptance:** AC6–AC8, AC11. Config-path-first precedence remains intact, hubs retain pointer-only proof language, and root-pointer wording remains consumer-owned.

#### T3: Register Workflows package membership
- **Depends on:** none
- **Files:** `bin/skill-dependencies.json`, `.agents/skills/ws-shared/skill-dependencies.json`
- **Work:** Add `ws-senior-developer` to only `packages.workflows.skills` in both mirrored manifests. Do not add `dependencies` or `autoloadOnly` entries.
- **Acceptance:** AC7, AC9. The two graph copies remain equivalent; Full inherits the skill through `all-skills`; no unconditional dispatch edge is introduced.

### Level 2, isolated eval and install-test work

#### T4: Add dedicated eval source and regenerate eval payloads
- **Depends on:** T1
- **Files:** `bin/generate-skill-evals.js`; every file listed for T4 in `step-03-us-150.exec.dag.json`
- **Work:** Add four `ws-senior-developer` scenarios covering multi-file free text, trivial single-file work, explicit/named commands, and branch/PR handoff. Each has at least three assertions. Run `node bin/generate-skill-evals.js` once and inspect the full generated diff.
- **Acceptance:** AC3–AC5, AC13. New eval payload is dedicated and portable; any unrelated generated eval change is explained or reverted.

#### T5: Extend package-install coverage
- **Depends on:** T3
- **Files:** `test/test-install.js`
- **Work:** Add narrow Phase 0b assertions for the new member in both manifests and Phase 6 Workflows-install assertions for `SKILL.md`, `evals/evals.json`, and the shared hub. Preserve selective-install and dynamic integrity coverage; do not repurpose the unrelated Extra-only assertion.
- **Acceptance:** AC7, AC9. Tests prove both source manifest intent and installed-tree presence without treating the optional skill as a dependency of unrelated selections.

### Level 3, release generation

#### T6: Bump once and rebuild catalog
- **Depends on:** T1, T2, T3, T4, T5
- **Files:** `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/skill-dependencies.json`, `docs/index.html`; every `SKILL.md` listed for T6 in `step-03-us-150.exec.dag.json`
- **Work:** Run `npm run build-site:bump` exactly once after all source edits. Inspect the generated catalog card and footer.
- **Acceptance:** AC1, AC11, AC12. Package version, all skill frontmatter, both manifest versions, root-hub-derived catalog, and footer agree. No merge markers remain.

### Level 4, release fixture synchronization

#### T7: Synchronize test tarball reference
- **Depends on:** T6
- **Files:** `test/package.json`
- **Work:** Set the local `workflow-skills` dependency to `file:../workflow-skills-<exact-bumped-version>.tgz`.
- **Acceptance:** AC12. Fixture version exactly equals `package.json`.

### Level 5, final generated integrity

#### T8: Regenerate integrity manifest
- **Depends on:** T7
- **Files:** `bin/skill-integrity.json`
- **Work:** Run `npm run generate-integrity` only after all source and release-generated files are settled.
- **Acceptance:** AC9, AC10, AC12. Manifest covers the new skill and evals and is current for the bumped package.

### Level 6, read-only delivery verification

#### T9: Run delivery checks and inspect evidence
- **Depends on:** T8
- **Files:** `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `README.md`, `docs/index.html`, `package.json`, `test/package.json`, `bin/skill-integrity.json` (read-only verification targets, no edits expected)
- **Work:** Run `npm run verify-integrity`; configured `npm run tests -- --local`; `node bin/build-site.js`; `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`; and `ws-check-harness` Phases 0–5c. Search changed human and hub docs for conflict markers. Report evidence and blockers.
- **Acceptance:** AC6, AC9–AC12. All commands succeed, harness has zero critical findings, and docs have no conflict markers.

## Handoff

Use `.agents/plans/us-150/step-03-us-150.exec.dag.json` for task dispatch. T1–T3 may run concurrently; T4 and T5 may run concurrently after their stated prerequisites. T6–T9 are serialized.

## Step Output

```yaml
step: 3
label: Execution Plan and DAG
status: completed
execMode: parallel
filesTouched:
  - .agents/plans/us-150/step-03-us-150.plan.exec.md
  - .agents/plans/us-150/step-03-us-150.exec.dag.json
evidence:
  - Read workflow state, Step 0 specification, refined Step 2 plan, config DAG thresholds, tools, compiled MEMORY, ws-plan-to-tasks, and ws-write-a-skill.
  - Counted 7 refined implementation steps, 52 expected unique changed files, and 6 safe execution levels against limits of 3 steps, 6 files, and 2 levels.
  - Isolated concurrent tasks so no same-level task edits a shared file; serialized all-repository eval generation, release bump, integrity generation, and verification.
  - Enumerated eval and SKILL.md generator outputs in the machine DAG because both generators have broad write scope.
telemetry:
  planSteps: 7
  atomicTasks: 9
  expectedUniqueChangedFiles: 52
  safeDagLevels: 6
  maxConcurrentTasks: 3
  sameLevelFileCollisions: 0
  sequentialThresholds:
    maxImplementationSteps: 3
    maxExpectedFiles: 6
    maxLayers: 2
learning: "N/A (planning artifact only; MEMORY preflight applied)"
```
