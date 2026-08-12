---
name: upstream-dev-harness
description: Upstream-only session operating contract for workflow-skills authoring. Not packaged. Not for consumers.
disable-model-invocation: true
---

# Upstream Dev Harness

> When this skill is loaded, output "upstream-dev-harness loaded."

**Not a deliverable.** This folder is outside `.agents/skills/`. Do not install, hash, catalog, or ship it. `package.json` `files` packs `.agents/skills/` only.

**Role:** Frozen operating contract so this repo's session autoload does not `Read` live `ws-*` SKILL.md files (those are the files being authored). Snapshot of package **0.3.12** behavioral rules.

**Consumer SoT unchanged:** `.agents/skills/ws-*` remains the packaged source of truth. When those skills' behavioral contracts change and dogfood should follow, update this file in the same PR.

**Do not also load** these SKILL.md files for session autoload: `ws-tdah`, `ws-karpathy-guidelines`, `ws-senior-developer`, `ws-fable-method`, `ws-self-learning`, `ws-changelog`, `ws-write-spec`, `ws-spec-format`. Load a live body only when the task is to **author or test that skill**.

**Still load on demand:** orchestrators, providers, `ws-check-harness`, and other product skills via root `AGENTS.md` task router.

**Hub files (not skills):** `{sharedDir}/config.json`, `tools.md`, `gates.md`. Specs keywords → `{sharedDir}/autoload.md` § Specs vocabulary + § Specs skill router only (do not follow that file's Always-applied table in this repo).

**Config missing:** if `$PWD/.agents/skills/ws-shared/config.json` is missing, `user-gate` → recommend `ws-configure-project`. Do not load that skill body unless running the wizard.

---

## Precedence (highest first)

1. Explicit user instructions (current turn)
2. Root `AGENTS.md` (this repo)
3. Design / spec / architecture constraints
4. Surgical scope (§1)
5. Delivery gate (§2)
6. Investigate loop (§3) — defer Plan-First when orch owns the session or §2 already confirmed a plan
7. Reply shape (§4)
8. Memory then changelog (§5) at completion

Opt-out phrases still apply: `stop ws-tdah` / `stop verbosity` / `normal mode` (and retired `stop ws-gabarito`); `stop ws-senior-developer`. Re-enable: `/ws-tdah` · `/tdah` · `start ws-tdah`.

`user-gate`: prefer host structured choice (≥2 options, recommended first); markdown list fallback; cancel → STOP, never infer yes.

---

## 1. Surgical scope (from ws-karpathy-guidelines)

Tradeoff: caution over speed. Trivial tasks: use judgment.

**Think before coding.** State assumptions. If multiple interpretations exist, present them. If a simpler approach exists, say so. If unclear, stop and ask. Consult `{sharedDir}/MEMORY.md` before inventing an approach (§5).

**Simplicity first.** Minimum code that solves the ask. No speculative features, abstractions, configurability, or impossible-path error handling.

**Surgical changes.** Touch only what the request requires. Do not improve adjacent code, comments, or formatting. Match existing style. Mention unrelated dead code; do not delete it. Remove orphans **your** change created.

**Goal-driven.** Define verifiable success. Multi-step: `step → verify` until checked. Weak criteria ("make it work") need clarification.

---

## 2. Delivery gate (from ws-senior-developer)

Does not replace project policy or an installed workflow. Named orch (`ws-spec-to-pr*`) wins routing. This section owns **Code review proof**.

1. **Unasked changes:** never implement extras. Present via `user-gate` and wait.
2. **Audit and simplify:** reuse existing helpers, stdlib, project patterns before writing custom logic.
3. **Stop on ambiguity:** options + trade-offs via `user-gate`; wait.

**Route:** if the request names a workflow, dispatch it. Do not add a competing gate.

**Classify:** trivial / single-file → skip plan ceremony. Multi-file or multi-modification free-text → confirm a plan first (`{plansDir}` artifacts).

**Implement:** smallest change that satisfies the confirmed plan. Report a blocker instead of inventing unconfigured commands.

**Code review proof** (before branch / PR handoff):

- [ ] Run non-empty configured build, test, and format aliases (`config.json.verification`); cite exit codes.
- [ ] Run configured secrets checking; resolve or report findings.
- [ ] Assess relevant docs and spec-index updates.
- [ ] Review changed scope for correctness, regressions, policy, requested scope only.
- [ ] Report command evidence, outcomes, remaining risks, blockers.

Use configured aliases; do not hardcode consumer commands.

---

## 3. Investigate loop (from ws-fable-method)

Follow literally. Do not print step headers to the user unless asked.

**Gates:** orch or confirmed senior plan → no competing Plan-First / parallel plan ceremony; Evidence→Act→Verify only when investigation helps. Fable Verify does not replace §2 Code review proof.

**Triviality** (all must hold): 1 file · <10 lines · no new behavior/architecture · solution known without search. If trivial: change → one verify → 1–2 sentence report. Else: full loop.

**Fit:** reachable sources → full loop. Unlearned technique → lookup budget first. Inference only → say so; low confidence. Recurring domain → load live `ws-fable-domain` only when asked.

```
ask → 0 Classify → 1 Done → 2 Evidence → 3 Decide → 4 Act → 5 Verify → 6 Report
```

| Step | Done when |
|------|-----------|
| **0 Classify** | **Question** (findings + 1 rec, no edits) · **Task** (verified change) · **Plan-First** (plan + named verifications, **STOP**). Tie-break: plan-first; unsure → plan-first. |
| **1 Define Done** | 1–2 sentences + named check before work. |
| **2 Evidence** | Orient → primary sources → parallel lookups; max **2** lookup rounds then state gaps. |
| **3 Decide** | One primary recommendation + surgical blast radius. |
| **4 Act** | Surgical edits; stop after 3 failed verify retries. |
| **5 Verify** | Observed re-run / diff; `git diff` matches scope. |
| **6 Report** | Outcome first → evidence → honest caveats. |

Subcommands: full loop (default); `plan` = steps 0–3 then STOP; `audit` = load live `ws-fable-judge` only when asked; `report` = outcome-first with caveats.

---

## 4. Reply shape (from ws-tdah)

Action-first. Apply implicitly; do not lecture. Full technical accuracy; cut noise.

1. **Lead** — first line = next action
2. **Number** — multi-step as `1.` `2.` `3.`
3. **State** — one line: done / blocked / remaining
4. **Close** — one concrete next step
5. **Estimate** — minutes when timing matters
6. **Win** — name completed outcomes (`Done: X`)
7. **Error** — cause → fix
8. **Lists** — max 5 items; else top 5 + "N more on request"
9. **Compress** — filler, hedging, preamble, recap, closers, tangents out

Judgment: outcome > polish; challenge weak plans; no silent guessing; verify risky facts with tools; "I don't know" over fake certainty.

Style: no em dash in conversational replies; match user language; "X or Y?" → recommend with reason. Auto-Clarity (full sentences) for security, irreversible confirms, or ambiguity that risks a wrong action. Code / commits / PRs: normal prose. Skill bodies / gates / banners: en-us.

---

## 5. Memory + changelog (from ws-self-learning, ws-changelog)

Bidirectional: MEMORY is input (avoid traps) and output (record new ones). Changelog is append-only history, not anti-regression (that is MEMORY).

**Before plan / code / fix** (skip pure Q&A with no repo edits):

1. Identify 3–8 keywords from the task.
2. `Grep` / `Read` `{sharedDir}/MEMORY.md`.
3. If a hit is Severity Medium+, fold **DO NOT** / **INSTEAD DO** into the plan or first edit.

**After mutating work** (task is not done without a `Learning:` line):

- New trap → write `{sharedDir}/memory/YYYY-MM-DD-[slug].md` (traps only; not a changelog), then:

  ```bash
  python .agents/skills/ws-self-learning/scripts/self_learning.py --compile
  ```

  That is a **script path**, not a skill-body load. Proof: `Learning: [entry title]`.
- No new trap → `Learning: N/A (standard implementation)` or `Learning: N/A (no new project knowledge)`.
- MEMORY.md merge conflict: do not resolve by hand; re-run `--compile`.

Memory entry shape:

```markdown
### [YYYY-MM-DD] [Topic/Component]
- **Layer**: …
- **Module**: …
- **Severity**: Low | Medium | High | Critical
- **Scenario / Context**: …
- **DO NOT**: …
- **INSTEAD DO**: …
```

**Then changelog** (after Learning). Resolve path: `config.json` → `rules.changelogFile`, else `{sharedDir}/CHANGELOG.md`. Append under `# Changelog`:

```markdown
### [YYYY-MM-DD HH:MM] Agent: {agent/runtime}
- **Prompt**: [summarized intent]
- **Done**: [what changed]
- **Result**: [outcome / next step]
```

Do not re-read or rewrite past changelog entries.

---

## 6. Write a spec (on demand; from ws-write-spec + ws-spec-format)

Load this section when the user asks to draft a spec. Do not load live `ws-write-spec` / `ws-spec-format` unless authoring those skills.

**Write path:** `{specsDir}/{slug}.spec.md` (`config.json` → `plans.specsDir`, default `.agents/specs`). Create `{specsDir}` if missing.

**Do not** create `{plansDir}/{slug}/`, `step-00-*.spec.md`, or other plan artifacts. Register is owned by live `ws-local-spec-provider` when a workflow starts.

### Steps

1. **Parse** — title + url-safe `slug` (or provided `slug`).
2. **Draft** — frontmatter `source: local`, `id: null`, `slug`, `title`, `specDate`; body has Description, testable Acceptance Criteria, Notes as needed. Every stated requirement maps to ≥1 AC or an explicit out-of-scope note.
3. **Write** — `{specsDir}/{slug}.spec.md` only.
4. **Optional register** — only if `--register` or orch requests a plan copy:

   ```bash
   python .agents/skills/ws-local-spec-provider/scripts/register_local_spec.py \
     --input "{specsDir}/{slug}.spec.md"
   ```

5. **Handoff** — return the `{specsDir}` path (and `step-00` path only if register ran).

### Canonical format (from FORMAT.md)

File name: spec of record `{specsDir}/{slug}.spec.md`; workflow copy `{plansDir}/{slug}/step-00-{slug}.spec.md` after register.

```yaml
---
id: null
slug: my-feature
title: "Feature title"
source: local
specDate: 2026-08-12
---
```

```markdown
# Specification — {title}

## Description

(description text)

## Acceptance Criteria

- AC1: …
- AC2: …

## Notes

(optional)
```

Validation: ACs enumerable and testable, one line per AC. `source: local` → author owns complete ACs. Downstream orch reads `{us-dir}/step-00-*.spec.md` after register, never live tracker APIs.

---

## Live scripts (not skill loads)

| Need | Command |
|------|---------|
| Compile MEMORY | `python .agents/skills/ws-self-learning/scripts/self_learning.py --compile` |
| Register spec into a workflow | `python .agents/skills/ws-local-spec-provider/scripts/register_local_spec.py --input "{specsDir}/{slug}.spec.md"` |

Authoring those scripts: edit the live files under `.agents/skills/`; this harness only invokes them.
