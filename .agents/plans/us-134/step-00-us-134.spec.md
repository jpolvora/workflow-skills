---
id: 134
slug: us-134
title: "feat: add ws-spec-index skill (project spec index init/sync/promote)"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/134"
specDate: 2026-07-25
---

# Specification — feat: add ws-spec-index skill (project spec index init/sync/promote)

**State:** open

## Description

## Summary

Add a new **model-invoked** skill `ws-spec-index` that creates, manages, and maintains a **progressive-disclosure project spec index** for consumer repos:

- Living **index** (default `index.PRD`) with status checkboxes, phases, ordered next-specs, inbox, done log
- Linked **`*.spec.md`** detail files
- Status marks: `[ ]` todo ?? `[~]` partial ?? `[x]` done ?? optional `Verified:` (never auto-set)

**Source of truth / reference shape:** [cursor-server](https://github.com/jpolvora/cursor-server) `.agents/specs/index.PRD` + `*.spec.md` workflow.

**Decision:** Implement **directly in this upstream package** (not a consumer-local experiment first). Wire durable orch call sites here so consumer `update` does not wipe them.

Originated from write-a-skill + ws-write-spec + ws-interview design session in cursor-server (2026-07-25). Local planning artifacts there were discarded in favor of this issue.

---

## Locked decisions

| Topic | Choice |
|-------|--------|
| Name | `ws-spec-index` |
| Modes | `init` ?? `sync` ?? `promote` (mode set **A**) |
| Auto-run | Orchestrator / delivery exit only (**trigger 1**) ??? no Cursor session `stop` hook in v1 |
| Evidence | **E1** ??? mark done only when ship/delivery already claims success **and** work maps to a known index row / `*.spec.md` slug |
| Scripts | **S1** ??? agent-edited Markdown + skill template/reference; **no** deterministic rewrite scripts in v1 |
| Invocation | **Model-invoked** (orch must load it); humans may still `/ws-spec-index <mode>` |
| Approach | Standalone skill + **thin orch call sites in this package** |
| Call-site strategy (**G2**) | **Resolved by promoting upstream:** patch `spec-to-pr` / `spec-to-pr-lite` / `ws-ship-pr` **in this repo** so call sites are durable across consumer `update` |
| Package graph | Add to Workflows (and Full) install graph + hub task router |

---

## Problem

Consumer projects need a reusable, project-agnostic way to:

1. Turn `README.md` / `PROJECT.PRD` / `SPECS.md` (or free text) into a specs directory with an index + progressive disclosure.
2. Keep checkbox / next-specs / done-log status honest as features are delivered.
3. Auto-run status updates at delivery/ship time without relying on ad-hoc agent memory.

This must work across any consumer stack ??? not coupled to cursor-server Kanban/`/board` APIs.

---

## Directory shape (consumer)

```text
{plans.specsDir}/          # from config.json; default .agents/specs/
  index.PRD                # progressive-disclosure hub (name overridable)
  NN-slug.spec.md          # detail / ACs (prefer existing numbering convention; else {slug}.spec.md)
```

### Index sections (required scaffold)

Mirror cursor-server `index.PRD` structure (product-agnostic template):

1. How to use
2. Status legend
3. Goal
4. Problems
5. Primary use cases (optional)
6. Constraints / non-goals (optional)
7. Feature map by phase (nested checkboxes + `spec:` links)
8. Next specs (ordered table)
9. Inbox (unscheduled ideas)
10. Done log
11. Maintenance checklist
12. Related docs

### Status legend

| Mark | Meaning |
|------|---------|
| `[ ]` | todo |
| `[~]` | partial |
| `[x]` | done |
| `Verified: ???` | optional host smoke ??? **never auto-written by sync** |

---

## Modes

### `init`

- Bootstrap `{plans.specsDir}/` + index from README / PROJECT.PRD / SPECS.md / free text.
- Seed phase bullets and next-specs rows with `spec:` links.
- **Must not** invent full AC bodies for each feature.
- Stub `*.spec.md` optional; full specs via `ws-write-spec` / `spec-format` when work starts.

### `sync` (auto at orch delivery exit)

- Called when ship/delivery evidence exists.
- Map shipped work ??? index row(s) / slug.
- Update checkboxes, next-specs status, Done log; may set linked `*.spec.md` frontmatter `status` under E1.
- If no mapping ??? **no file edits**; return `updated: []` and `skipped: <reason>`.
- Idempotent (re-applying `[x]` is OK).

### `promote`

- Inbox idea ??? phase bullet + next-specs row.
- Optional stub `*.spec.md` **or** handoff to `ws-write-spec`.
- Stubs: `source: local`, `id: null` (do not invent tracker ids).

---

## Evidence rule E1 (interview G1 ??? resolved)

Mark `[x]` / spec `status` only when **both**:

1. **Ship-success signal** (either is enough; **merge not required**):
   - Local delivery commit success recorded in `step-08-*.result.md` / ship gate, **or**
   - `shipAction: create-pr` with PR URL captured
2. **Mapping** to a known index row or `*.spec.md` slug

Step 9 / merge is separate and must **not** be required for sync.

**Do not** mark done from file existence alone (anti-regression: false ???already-implemented??? probes).

---

## Orch call contract

```yaml
input:
  mode: sync | init | promote
  slug: string?                 # workflow slug when known
  shipEvidence:                 # sync only
    deliveryCommit: boolean?
    prUrl: string?
    resultPath: string?         # step-08-*.result.md when present
  specsDir: string?             # override; else config plans.specsDir
  indexFile: string?            # default index.PRD
  sourcePath: string?           # init: README/PRD/SPECS path or free text
  inboxItem: string?            # promote

output:
  updated: string[]             # paths or row ids touched
  skipped: string?              # reason when no-op
```

### Call sites to wire in this package (v1)

| Caller | When |
|--------|------|
| `spec-to-pr` Step 8 | After successful delivery commit and/or create-PR ship action |
| `spec-to-pr-lite` Step 4 ship path | Same evidence semantics |
| `ws-ship-pr` | After successful ship when evidence is present |

Pass `slug` from workflow state when available.

Also add hub **task-router** entry in packaged `shared/AGENTS.md` (and site/docs catalog as needed).

---

## Skill package layout

```text
ws-spec-index/
  SKILL.md              # prefer ???100 lines; steps + Done when
  INDEX-TEMPLATE.md     # disclosed index scaffold
  REFERENCE.md          # legend, E1, path tokens, call contract, maintenance notes
  evals/evals.json      # ???2 prompts: init + sync (E1 skip vs update)
  GLOSSARY.md           # optional if terms need disclosure
```

### Frontmatter / packaging

- `name: ws-spec-index`
- Model-invoked `description` ??? third person, leading words for init/sync/promote triggers
- `version:` must match package `packageVersion`
- Register in `skill-dependencies.json` install graph (Workflows + Full)
- Ownership via single package `upstream` block (no per-skill `upstream:` in SKILL.md)
- Follow `write-a-skill` review checklist; no scripts in v1

### Related skills (reference, do not duplicate)

`spec-format` ?? `ws-write-spec` ?? `local-spec-provider` ?? `changelog` ?? `ws-ship-pr` ?? `spec-to-pr` ?? `spec-to-pr-lite`

---

## Acceptance Criteria

- AC1: **AC1:** Skill folder shipped with `SKILL.md`; model-invoked description; version matches `packageVersion`; in install graph.
- AC2: **AC2:** Modes `init` / `sync` / `promote` with checkable Done when; template detail disclosed (not duplicated).
- AC3: **AC3:** `init` creates `{plans.specsDir}/` + index with required sections; seeds from README/PRD/SPECS/free text without inventing full ACs.
- AC4: **AC4:** `init` may seed links/rows; must not fabricate complete AC bodies (stub optional; full specs via write-spec/format).
- AC5: **AC5:** `sync` invoked from orch delivery/ship exit call sites listed above with the call contract.
- AC6: **AC6:** E1 updates index + optional spec `status`; else empty `updated` + `skipped` and no edits.
- AC7: **AC7:** `sync` never auto-writes `Verified:`.
- AC8: **AC8:** `promote` inbox ??? phase + next-specs; optional stub or handoff to `ws-write-spec`; `source: local`, `id: null`.
- AC9: **AC9:** Documents OOS v1: session stop hooks, rewrite scripts, Kanban/board API coupling, auto-`Verified:`.
- AC10: **AC10:** `evals/evals.json` ???2 prompts covering `init` and `sync` (skip vs update).
- AC11: **AC11:** Hub task-router / catalog documents when to load `ws-spec-index`.
- AC12: **AC12:** Skill/docs-only relative to consumer apps (no requirement that consumer product `src/` change).
- AC13: ---

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
