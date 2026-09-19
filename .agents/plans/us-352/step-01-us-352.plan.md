# Implementation Plan — us-352: fix-PR loop execution-mode gate (`ws-goal-fix-pr.useSubAgents`, default inline)

- slug: us-352 | spec: `.agents/specs/0102-us-352.spec.md` | branch: `feature/us-352` | base: `main`
- pipeline: standard | execMode: sequential (`defaults.enableDag: false`)

## 1. Goal

One documented `config.json` boolean selects the fix-PR plan/fix loop execution site.
Absent or `false` = inline legacy loop with zero subagent dispatches (default).
Explicit `true` = per-iteration subagent dispatch, behavior identical to current.
Fix semantics are identical in both modes; only the execution site changes.

## 2. Section-home decision (plan-owned, per spec Assumptions row 3)

Single top-level per-skill section exactly as the issue proposes:

```json
{
  "ws-goal-fix-pr": {
    "useSubAgents": false
  }
}
```

- Rationale: matches the issue JSON verbatim; seeds the per-skill-section
  convention with the skill that owns convergence (`ws-goal-fix-pr`); one key
  gates the whole fix path so adjacent entry points cannot leak dispatches.
- `ws-fix-pr` standalone batches and `ws-ship-pr` Step 6 convergence read the
  SAME key (via the shared resolver) — gate once in the resolver, not per skill
  (per spec Notes row 2). No `ws-fix-pr.*` or `ws-ship-pr.*` sibling keys in
  this spec (Out of Scope row 1).

## 3. Resolver contract (fail-closed)

New export `resolveFixPrDispatchMode(config)` in
`.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`:

- returns `'subagent'` only when `config['ws-goal-fix-pr'].useSubAgents === true`
  (strict boolean; truthy non-booleans do not opt in);
- returns `'inline'` for absent section, absent key, `false`, null, or any
  non-boolean value (fail-closed to legacy behavior, per spec Assumptions row 1).

Skill bodies cite the resolver and state the mode table; agents without a JS
runtime apply the same truth table by reading `config.json` directly.

## 4. Touchpoints (surgical file list)

| # | File | Change |
|---|------|--------|
| 1 | `.agents/skills/ws-shared/runtime/config.schema.json` | Add `ws-goal-fix-pr` object: `useSubAgents` boolean, default `false`, with description documenting inline default + per-skill-section convention seed |
| 2 | `.agents/skills/ws-shared/templates/config.json.example` | Add `ws-goal-fix-pr` section with `_comment` + `"useSubAgents": false` (GUI descriptions + parity derive from schema/example) |
| 3 | `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | Add + export `resolveFixPrDispatchMode` (fail-closed truth table above); no existing export signatures change |
| 4 | `.agents/skills/ws-goal-fix-pr/SKILL.md` | New `## Fix-loop execution mode` section: mode table, resolver reference, inline posture = ordered `fixPrPlan` → `fixPrExec` pair inline on captured session model with identical gate/learning contracts and no internal role telemetry; `true` = current per-round dispatch. Zero edits to existing paragraphs (verbatim dispatch-contract readings preserved) |
| 5 | `.agents/skills/ws-fix-pr/SKILL.md` | Short paragraph: standalone batches consult the same key via the same resolver (single default; `true` = current two-role dispatch, `false`/absent = Tier-3-style inline pair under session model) |
| 6 | `.agents/skills/ws-ship-pr/SKILL.md` | One line in Step 6: pre-ship convergence inherits the mode from `ws-goal-fix-pr.useSubAgents` (single default; no separate ship key) |
| 7 | `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` | One `Add-ConfigFieldRow` (`-Section 'ws-goal-fix-pr' -Key 'useSubAgents'`, bool, default `$false`) on the integrations tab; ASCII-only |
| 8 | `README.md` | Short config bullet documenting the key + default (harness change protocol) |
| 9 | `test/test-fix-pr-subagent-mode.js` (new) | AC1–AC4 executable assertions (see section 6) |
| 10 | `package.json` | Register the new test in the test script list (follow existing per-file entries) |

Docs/site: `docs/index.html` rebuild is catalog-driven (`bin/build-site.js --check`
in test-doc-sync); a config-key bullet does not change the catalog inventory, so
no site rebuild is required. `.ws/config.json` (consumer-owned project config)
is NOT seeded with the key — absent means inline by contract.

## 5. Negative scenarios (must stay red/green as specified)

- NS1: default-config fix-loop run dispatching any subagent fails (resolver
  returns `inline` for absent/`false`; skill text mandates inline posture).
- NS2: opt-in run staying inline or changing fix semantics fails (mode table:
  `true` keeps the exact current dispatch + gate/learning contracts).
- NS3: schema updated without GUI sync fails parity (GUI row added atomically;
  new test asserts the `-Section 'ws-goal-fix-pr' -Key 'useSubAgents'` binding).

## 6. Verification

- New: `node test/test-fix-pr-subagent-mode.js` — asserts schema default,
  example value, resolver truth table (absent/false/non-boolean → inline;
  `true` → subagent), GUI binding presence + ASCII safety, and gate wording in
  all three skill bodies.
- Existing: `node test/test-powershell-config-editor.js` (schema/GUI sync),
  `node test/test-goal-fix-pr-orchestrator-dispatch.js` (verbatim contract
  preserved), `node test/test-harness-clean.js`, `npm run test` (touched areas).
- Telemetry signals: dispatch count per fix-loop run (0 on default; per-round
  pair count on opt-in), observable via `telemetry.jsonl` dispatch events
  (present only on the dispatch path) and the resolver unit assertions.

## 7. Rollout / risks

- Backward compatible: additional optional key; all existing configs resolve to
  inline (current dispatch-heavy behavior becomes opt-in — this is the issue's
  explicit intent: inline is the mandated default).
- Risk: consumers relying on dispatch-by-default see behavior change to inline.
  Accepted per spec (issue mandates inline default); docs bullet calls it out.
- No migration, no new skill, no dependency changes.
