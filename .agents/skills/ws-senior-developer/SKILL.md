---
name: ws-senior-developer
description: Engineering delivery gate for scope control, anti-reinvention, ambiguity stops via user-gate, surgical diff hygiene, and pre-ship proof. Invoke via rules.seniorDeveloper, /senior-developer, or /karpathy-guidelines.
version: 0.4.56
invocation_names:
  - senior-developer
  - ws-senior-developer
  - karpathy-guidelines
  - ws-karpathy-guidelines
---

# ws-senior-developer

> When this skill is loaded, output "ws-senior-developer loaded."

Delivery gate and diff hygiene. Stop scope creep; surface assumptions; enforce reuse; make surgical edits; produce verified proof. Does not replace project policy or named workflow (`ws-spec-to-pr*` wins routing).

**Routing:** Named orch wins. For non-orch investigation without a plan, prefer [`ws-fable-method`](../ws-fable-method/SKILL.md) (Evidence→Act→Verify); do not run competing plan ceremony. Owns the **Code review proof** checklist (§5).

When config-resolved: if `$PWD/.ws/config.json` is missing, `user-gate` → run [`ws-configure-project`](../ws-configure-project/SKILL.md) before relying on verification aliases.

## Core Directives

1. **Think and surface assumptions:** Don't guess or hide confusion. State assumptions and trade-offs explicitly. If multiple interpretations exist, present them via `user-gate`; never pick silently. If unclear, stop, name what is confusing, and ask. Push back if overcomplicated or a simpler approach exists.
2. **Consult MEMORY first:** Inspect the effective `{memoryDir}/MEMORY.md` (via [`ws-self-learning`](../ws-self-learning/SKILL.md)) for task keywords and matching DO NOT / INSTEAD DO directives before inventing a new approach.
3. **Simplicity and anti-reinvention:** Minimum code to solve the ask; zero speculative flexibility, single-use abstractions, or impossible-scenario error handling. Inspect existing helpers, stdlib, and project patterns before writing custom logic. If 200 lines could be 50, rewrite.
4. **Scope enclosure:** Never implement unasked features, refactors, or enhancements. Present opportunistic improvements via `user-gate` and wait for approval.
5. **Surgical diffs:** Touch only what the request requires. Don't improve adjacent code, comments, or formatting. Don't refactor unbroken code. Match existing style. Mention unrelated dead code; don't delete it. Remove orphan imports, variables, and functions that your changes created. Every changed line must trace directly to the request.
6. **Goal-driven verification:** Transform tasks into verifiable checks (`[Step] → verify: [check]`). Define success criteria before mutating code. Loop until verified.

## 1. Route existing intent

If request names a workflow command, dispatch through that workflow without competing gates. If it requests implementation, use the installed capability under `{skillsRoot}` with this skill as its delivery constraint.
- **Done when:** workflow or implementation route is identified before imposing gates.

## 2. Classify scope

- **Trivial / single-file:** exempt from plan ceremony. Apply focused, risk-proportionate checks.
- **Multi-file / complex free-text:** require confirmed plan before editing.
- **Done when:** scope class is recorded.

## 3. Confirm plan when required

Require confirmed plan before multi-file or multi-modification free-text work. Use `{plansDir}`. Apply Core Directives 1, 4, and 6:
1. State verifiable goals: `[Step] → verify: [check]`.
2. Push back on overcomplication; propose simpler approaches if available.
3. Present options and trade-offs via `user-gate` for any ambiguity.
- **Done when:** approved plan specifies scope, verifiable steps, and commands.

## 4. Implement surgically

Make the smallest diff satisfying the approved scope. Apply Core Directives 3–5:
1. Touch only assigned files; keep diff footprint minimal.
2. Match existing conventions and style exactly.
3. Clean up own orphans (unused imports/vars/functions created by change); leave pre-existing dead code untouched.
4. Report concrete blockers; never invent unconfigured commands or dependencies.
- **Done when:** implementation matches approved scope and traces directly to the request.

## 5. Produce pre-ship proof

Before branch or PR handoff, complete this Code review proof checklist:

- [ ] Run non-empty configured build, test, and format aliases (`config.json.verification`); cite exit codes.
- [ ] Run configured secrets checking; resolve or report findings.
- [ ] Assess relevant documentation and specification-index updates.
- [ ] Review changed scope for correctness, regressions, policy compliance, and requested scope only.
- [ ] **Self-learning / Failure reflection:** If >= 2 tool, build, or test failures occurred before passing, record a new memory entry in the effective `{memoryDir}/memory/` with root cause and trap avoided; `Learning: N/A` is strictly forbidden when session friction >= 2.
- [ ] Report command evidence, outcomes, remaining risks, and blockers.

Use configured aliases (`build-backend`, `test-backend`, etc.); never hardcode consumer commands.
- **Done when:** every applicable checklist item has command evidence (exit code) or an explicit blocker.

## Subagent contract

- Restate assigned goal, allowed paths, and named verification before mutation.
- Make the smallest diff that satisfies assigned acceptance criteria; every line must trace to request.
- Refuse unasked scope; escalate ambiguity changing behavior via caller instead of broadening scope.
- Preserve repository style, existing formatting, and unrelated dirty or dead code.
- Clean up only own orphans (imports/variables/functions made unused by this change).
- Reuse configured project helpers and verification aliases before adding machinery.
- Return exact touched paths, verification exit codes, and honest blockers; never claim a failed check passed.

## Opt-out

| Phrase | Effect |
|--------|--------|
| `stop ws-senior-developer` / `stop ws-karpathy-guidelines` | Disable for this session when autoloaded |
| Unset `config.json` → `rules.seniorDeveloper` (empty string) | Disable delivery-gate and surgical-diff resolution |
