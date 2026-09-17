---
id: null
slug: muse-code-harness-adaptation
title: "Muse Code harness adaptation for ws-spec-to-pr workflows on muse-spark agents"
source: local
specDate: 2026-09-17
---

# Specification — Muse Code harness adaptation for ws-spec-to-pr workflows on muse-spark agents

## Description

Adapt the `ws-spec-to-pr` / `ws-spec-to-pr-lite` orchestration (steps, step transitions,
`user-gate` usage, automatic modes, and auxiliary `.md` runtime files) so runs driven by
single-session CLI-harness agents on the `muse-spark` model family flow smoothly, while
keeping the shipped skill contract agent- and IDE-neutral.

Technical scope and boundaries:

- Touchpoints (read first, change only what the ACs require): `ws-spec-to-pr/SKILL.md`,
  `ws-spec-to-pr-lite/SKILL.md`, `ws-ship-pr/SKILL.md` + `PREPARE-CHECKLIST.md`,
  shared runtime `gates.md`, `host-dispatch.md`, `tools.md`, `config-resolution.md`,
  `CROSS-PLATFORM.md`, `scm-provider-contract.md` (intents only, no raw recipes),
  `STEP-DISPATCH.md`, `PROTOCOLS.md`, `ARTIFACTS.md`, `setup.md`, `GOAL-OVERRIDES.md`,
  `config.schema.json` + `templates/config.json.example` (new `modelsPreset` entry and any
  new `hostAdapter`/`defaults` knobs), and the affected pipeline skills only where a gate
  or shell recipe changes.
- Host capability binding: at bootstrap resolve the structured-choice binding
  (`askQuestionTool`: host structured-choice tool vs markdown fallback) and the dispatch
  binding (`subagentTool`: native child agents vs background runner vs inline-isolated
  Tier 3) once, log the binding per `host-dispatch.md`, and never re-probe mid-run.
  This host class exposes both native child agents (which inherit the lead session's
  effective tools and permission boundary, narrow-only) and a structured-choice input
  surface, so the normal binding is native/native; markdown fallback and Tier 3 inline
  remain the healthy path only where a binding is unexposed.
- Command-execution policy: record the host-declared session posture once at session
  start (permission profile, approval mode, sandbox on/off) and never re-probe it.
  Under a declared no-approval posture (`Unrestricted` / `--yolo`, or `--approval-mode
  never` for the approval layer only), routine shell recipes run without permission
  prompts and `user-gate` is reserved for genuine product decisions. Recipes themselves
  stay non-interactive (subject-CLI `--yes` / `--non-interactive` style flags so nothing
  blocks on stdin). Approval bypass affects only command execution; it never waives
  workflow planning or converts normal mode into `autoMode`. When the host declares no
  posture, fail closed: assume approval is required.
- Ship preflight auto-resolution: `ws-ship-pr` resolves every resolvable value from the
  environment and config (head, base, provider, remote, commit-title default, stage set,
  consumer prepare obligations) before restating them, and reserves `user-gate` for
  genuine ambiguity only.
- Portability invariant (intentional constraint, see Design Intent): shipped skill bodies
  keep capability vocabulary (`user-gate`, `dispatch-agent`, path tokens) and must not
  name host products or require host-only layouts. Host-specific values travel via config
  (`modelsPreset`, `providerCompat` hints, `hostAdapter`) and capability bindings, never
  as prose branches in skill bodies.

## Acceptance Criteria

- AC1: Bootstrap binds native tools — on this host class the orchestrator logs one
  `host-capability-bind` record showing native child-agent dispatch and the
  structured-choice binding, dispatches steps to child agents (which inherit session
  tools and boundary, narrow-only), and completes Steps 0–9 without treating the
  bindings as errors. Markdown fallback gates and Tier 3 inline apply only where a
  binding is unexposed. Fail: re-probe mid-run, shelling out to a second CLI runner
  when native dispatch is bound, or abort/alarm on a healthy binding.
- AC2: Gate/turn discipline per binding — with markdown fallback, a `user-gate` turn
  emits zero step tool calls (One Step Per Turn); with a native modal gate, a
  recommended advance selection continues in the same turn and never leaves state
  advanced (`currentStep: N+1`) with no corresponding dispatch. Fail: gate plus Step N+1
  tools in one markdown turn, or a post-advance stall.
- AC3: No-approval posture runs quietly — in a session whose host-declared posture is
  `Unrestricted` / `--yolo` (or `--approval-mode never` for the approval layer), shell
  recipes run with non-interactive subject-CLI flags and the agent is never asked to
  permit routine command execution; `user-gate` appears only for genuine product
  decisions (scope, ship intent, unresolved ambiguity). Fail: any permit-this-command
  prompt for a routine recipe step, or any recipe that blocks waiting on stdin.
- AC4: Bypass is not autoMode — with approval bypass on and `autoMode` off, all step
  plans still execute (Steps 1–3 for `standard`/`complex`; classifier routing honored)
  and every step-boundary `user-gate` still fires. Fail: skipped planning or a missing
  boundary gate attributed to the bypass flag.
- AC5: Ship preflight auto-resolves — `ws-ship-pr` derives head (`state.branch` in
  workflow mode, else explicit `head=` else `workingBranch`), base/remote/provider from
  config (auto-detect base only when unset), commit-title default from workflow state or
  spec title, and the stage set from `files_touched` + `deliveryCommitArtifacts`
  without asking, then restates all resolved values before executing. Fail: asking for
  any value that was resolvable from state, git, or config.
- AC6: Ship asks only on genuine ambiguity — standalone `/ship-pr` prompts at most for
  unresolvable items (dirty files outside delivery scope, missing upstream auth,
  conflicting open PR for the same head→base). Consumer prepare discovery (row 6:
  `AGENTS.md`, hub, `rules.*` obligations) is scanned and executed, never asked about.
  Fail: a prompt whose answer existed on disk, in config, or in git.
- AC7: Neutral model preset — config gains a session-safe preset entry for the
  `muse-spark` model class (planner/execution/testing/reviewer roles resolvable,
  defaulting to session-current where the host manages models), selectable via
  `defaults.modelsPreset` with no skill-body edits per host (pin the `muse-spark`
  class, never a minor version; verify the id against the host `--model` surface at
  plan time). Fail: hardcoded model ids
  in any shipped `SKILL.md`, or an unknown-preset fallback that aborts the run.
- AC8: Portability holds — after the change, the harness audit reports zero findings
  attributable to this work: no host product names or host-only paths in shipped skill
  bodies, templates, or scripts; path tokens expanded before tool calls. Fail: any new
  audit finding naming a host product in a shipped body.
- AC9: No integrity or budget regressions — `npm run generate-integrity` +
  `npm run verify-integrity` are the last hashed-content steps before commit,
  `npm run test` passes, and budgeted docs stay within limits
  (measure `CATALOG.md` normalized size before/after). Fail: stale-integrity suite
  failure or a budget overrun.

## Notes

### Prior Work Sweep

- `git log` on `ws-ship-pr/`, `ws-spec-to-pr/`, `gates.md`, `host-dispatch.md`:
  recent related work is the preview-before-ship gate, install-mode detection, G2 hunk
  procedure, and blast-radius guardrails. No commit addresses this host class or
  approval-bypass execution.
- Literal search for `yolo` across `.agents/skills` returns zero hits: host
  approval-bypass mode is currently unhandled everywhere.
- `config.json` `modelPresets` serves `default`, `cursor`, `deepseek`, `opencode`,
  `cheap` — there is no entry for the `muse-spark` model class.
- Official docs ([Permissions and safety](https://dev.meta.ai/docs/muse-code/permissions.md),
  read 2026-09-17): approval + sandbox on by default as two independent layers; profiles
  Ask me / Auto-review (default) / Unrestricted (= `--yolo` posture) / Read-only;
  `--approval-mode on-request|untrusted|never`; child agents inherit the lead session's
  effective tools and permission boundary (narrow-only); trusted workspace loads
  `AGENTS.md`/rules/skills; peer messages cannot approve tools or change permissions;
  shell fails as an environment error where the sandbox cannot be confirmed.
- Community-adapter observed (not official-doc confirmed, verify with host `--help` at
  plan time): `muse exec --json` headless shape; `--disable-approval` (sandbox stays
  on); `--user-input-auto-resolve`; `approval-policy.json` argv-prefix allow rules
  (deny overrides prompt overrides allow); `MUSE_APPROVAL_MODE` in third-party adapters.
- Alternative considered for AC4: treat host approval bypass as implying `autoMode`.
  Rejected as default: it would waive step-boundary gates the user never asked to skip
  and contradicts the `autoMode ≠ skip planning` invariant. Kept as opt-in via the
  existing `autoMode` flag (see Assumptions).

### Design Intent

- Intentional constraint (keep): shipped skills stay agent- and IDE-neutral per the
  root hub portability rules — capability aliases, config-driven values, no host
  product names in skill bodies. The friction observed on this host class is an
  accidental gap (missing capability binding + missing non-interactive policy +
  ask-first ship preflight), not a licensed reason to fork per-host skill prose.
- Accidental gap (fix): no `askQuestionTool`/`subagentTool` binding exists for this
  host class, so gates fall back to markdown without the turn discipline being
  honored end to end; shell recipes assume an approving human in the loop; ship
  preflight asks for state-/config-resolvable values.

### Possible today vs not possible (doc-grounded)

Possible today (operator + skill changes in this spec):

- Quiet routine execution: launch with `--yolo` (no approval, no sandbox, trusted
  workspace) or `--approval-mode never` (approval quiet, sandbox stays on); persist via
  `permissions.default_profile`; pre-approve routine argv prefixes via
  `approval-policy.json` allow rules.
- Native step dispatch: child agents inherit session tools/boundary, so `dispatch-agent`
  maps to native dispatch; structured `user-gate` maps to the host question tool.
- Ship auto-resolution and consumer-rule discovery: all values come from state, git,
  config, and the trusted workspace (`AGENTS.md` autoloads once trusted), so asking is
  avoidable except on genuine ambiguity.
- Session transcripts: the host keeps a local event/session log the agent can consult
  for prior runs.

Not possible today (do not design around these):

- The agent changing its own posture mid-run (no in-session escalation; peers and
  subagents cannot approve tools or change permissions).
- The agent reliably re-deriving launch flags it was not told; undeclared posture must
  fail closed to approval-required.
- Shell execution where the sandbox cannot be confirmed (fails as an environment
  error, not something skills can code around).
- Assuming community-observed flags (`--user-input-auto-resolve`,
  `MUSE_APPROVAL_MODE`) without operator confirmation via host `--help`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-host skill-body forks or host-named prose branches | Violates the portability invariant; config + bindings are the mechanism |
| Changing `autoMode` semantics or the One Step Per Turn rule itself | Out of scope; this work binds existing rules to a new host class |
| New SCM provider or tracker integration | Provider intents already cover GitHub/ADO; no new host requested |
| Rewriting step artifacts, state schemas, or telemetry shapes | Only gate/dispatch/shell-recipe behavior changes |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| How the agent learns the session posture | Host-declared session-open context (permission profile, approval mode, sandbox state; startup mode line where surfaced); recorded once, never re-probed | Official permissions doc defines profiles/modes; the host surfaces posture at session start | y |
| In-session posture change by the agent | N/A because not possible: only launch flags/settings set posture, and peer/subagent messages cannot approve tools or change permissions | Official permissions doc (two layers; session-messaging boundary) | y |
| `--user-input-auto-resolve` assumed on | Off unless the operator passes it; skills handle question-prompts explicitly in both states | Community-adapter observed only, not confirmed on the official permissions page; verify with host `--help` at plan time | n |
| Bypass implies autoMode | No: bypass affects only shell assume-yes behavior; gates and planning unchanged unless `autoMode` is explicitly set | Preserves `autoMode ≠ skip planning` and explicit user control | n |
| Commit-title default source | Workflow state subject, else spec title shaped as a conventional commit; user override via explicit param only | Title is always resolvable; asking is never required | n |
| Stack rule pack for DoR/negatives | N/A because no `runtime/stacks/` pack targets this Node skill package; harness invariants (portability audit, integrity, suite) serve as the invariant set | Do not invent stack ACs for absent dimensions | y |
| Remaining implicit dimensions (i18n, migrations, browser, tenancy) | N/A because a harness/skill-text change has no UI strings, schema, browser surface, or tenant boundary | No ACs invented for absent dimensions | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Scope bounded | Changes limited to gate/dispatch/shell-recipe/config behavior in the listed touchpoints; no artifact or schema changes | `git diff --stat` shows only listed paths |
| Host bindings defined | `askQuestionTool` and `subagentTool` bindings for the new host class specified via `host-dispatch.md` + capabilities cache, with Tier 3 as healthy fallback | Bootstrap log shows one bind record; AC1 run observed |
| Non-interactive policy specified | Assume-yes flag mapping for shell recipes and the bypass≠autoMode rule written in `CROSS-PLATFORM.md` or the owning skill | AC3/AC4 runs observed |
| Ship auto-resolution specified | Resolution order (state → git → config → auto-detect → ask) written in `ws-ship-pr/SKILL.md` / `PREPARE-CHECKLIST.md` | AC5/AC6 runs observed |
| Portability preserved | No host product names or host-only paths in shipped bodies, templates, scripts | Harness audit reports zero new findings |
| Doc-grounded mechanisms | Every host mechanism cites the official docs or is labeled community-observed with a `--help` verification step | Spec re-read against cited pages at plan time |
| Zero open blockers | Assumptions above are the only opens; none blocks drafting the plan | This table reviewed at plan time |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `host-capability-bind | {json} | {hit|probe}` at bootstrap (existing signal; must now
  also cover the new host class).
- Session-open posture record (permission profile, approval mode, sandbox state;
  startup mode line where the host surfaces it).
- `user-gate-modal` vs `user-gate-fallback` vs `auto-gate-apply` records per gate.
- `npm run test` exit code; `npm run verify-integrity` exit code; harness audit
  finding count (must be zero new).
- `CATALOG.md` normalized byte size before/after when docs change.

### Negative & Failing Test Scenarios

- A shipped `SKILL.md` naming a host product fails the harness audit (portability
  guard; must stay red until the name moves to config/capabilities).
- Regenerating integrity before the last hashed-file edit makes the suite fail with a
  stale-integrity error (ordering guard; regen must be last).
- Markdown-fallback gate emitted together with Step N+1 tool calls in one turn is a
  gate violation regardless of model confidence.
- Native modal advance selection followed by no dispatch while state shows
  `currentStep: N+1` is a stall bug, not a pause.
- Approval-bypassed session that still emits a permit-this-command prompt fails AC3.
- Standalone `/ship-pr` asking for commit title when state/spec title resolves one
  fails AC5.
- A recipe that assumes `--user-input-auto-resolve` without an operator flag fails AC3
  when the host stops for the question.
- Any design that changes session posture mid-run, or lets a subagent approve tools,
  fails DoR (not possible per docs).
