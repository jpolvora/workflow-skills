---
name: ws-spec-translate-to-human
description: Translates an agent spec into a parallel human runbook (numbered Implementation / UI Test / Out of scope steps beside the source artifact). Trigger on spec translate, human runbook, manual test script, or refinement companion.
version: 0.4.74
disable-model-invocation: true
invocation_names:
  - ws-spec-translate-to-human
  - translate-to-human
  - spec-translate-to-human
---

# ws-spec-translate-to-human

> When this skill is loaded, output "ws-spec-translate-to-human loaded."

Emit a human companion beside one agent spec artifact. Never implements
product code and never edits the agent spec.

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check when config is present. Missing config → local-paths mode with gap `config-missing`.

## Invocation

```text
/ws-spec-translate-to-human step-00-us-402.spec.md
/ws-spec-translate-to-human {specsDir}/0123-us-402.spec.md [slug=us-402] [output=step-00-us-402.spec-translated.md] [lang=pt-BR]
ws-plan-write … → ws-spec-translate-to-human (refinement hook, non-blocking)
```

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<spec-input>` | required | Agent spec path (`{specsDir}/*.spec.md` or `{us-dir}/step-NN-*.spec.md`) |
| `slug` | inferred | From spec frontmatter or filename |
| `output` | `step-NN-{slug}.spec-translated.md` | Basename only; always beside the source artifact |
| `lang` | `ws-spec-translate-to-human.outputLanguage` | `en-us` default; optional consumer companion locale (e.g. `pt-BR`). Harness en-us applies to skill bodies; this controls only the generated runbook artifact. |

Companion shape → [`references/COMPANION-FORMAT.md`](references/COMPANION-FORMAT.md). Worked example → [`references/EXAMPLE.md`](references/EXAMPLE.md).

## Steps

1. **Resolve target** — Expand `{plansDir}` / `{specsDir}` / `{sharedDir}` / `{skillsRoot}` from config + [`../ws-shared/runtime/tools.md`](../ws-shared/runtime/tools.md). Map input → source spec path + slug + step NN + companion path (`{us-dir}/step-NN-{slug}.spec-translated.md`). Refuse when the companion path equals the spec path or escapes `{us-dir}`.
   - Done when: source and companion paths are fixed, distinct, and co-located.

2. **Gather context** — Read in order when present: agent spec (required) → `step-00-{slug}.issue.json` → original tracker item (**one** provider skill, audit-only) → `{memoryDir}/MEMORY.md` → changelog file → `README.md` → project docs → `AGENTS.md`/hub rules → spec-memo vault (only when memory integration is enabled). Record a consulted / not-found list; it ships inside the companion.
   - Done when: every listed source is marked consulted or not-found (invent nothing).

3. **Map labels** — Resolve spec terms (menu, screen, button, status, entity) to real system labels from project sources (route providers, screen templates, hub docs) without expanding scope. A name that cannot be resolved becomes `[unresolved: <term>]`, never an invented label.
   - Done when: every mapped term cites its source or carries the unresolved flag.

4. **Write companion** — Write only the companion file per `COMPANION-FORMAT.md`: title + `### Implementation` + `### UI Test` + `### Out of scope`, continuous numbering per section, every source AC cited as `(ACn)` in ≥1 step, each UI-test step running from an initial state to a visible verification. A blocking ambiguity goes through `user-gate` when interactive; in `autoMode` record it in the companion open-question block instead of prompting.
   - Done when: the companion exists and no other file was written.

5. **Validate** — Run `node scripts/validate_companion.cjs --spec <source> --companion <companion>`. Done when exit code is 0. A non-zero exit returns to step 4 (fix the companion, never the spec).

## Rules

- Single write target: the `*-translated.md` companion. The agent spec and product code are read-only.
- Preserve source ACs and Out-of-scope intent; add no flow the spec does not state.
- Non-blocking in refinement: a skill or validator failure is recorded, never a planning-gate failure.
- Downstream agent steps read the agent spec, never the companion.
