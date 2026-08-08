# Autoload & progressive disclosure

**Audience: agents.** Load this file when the project root `AGENTS.md` references it, or whenever the user mentions specs / plans / Spec-to-PR without naming a skill.

Path tokens: expand via [`tools.md`](tools.md) before tool calls (`{skillsRoot}`, `{sharedDir}`, `{specsDir}`, `{plansDir}`).

---

## Always-applied skills

When root `AGENTS.md` points here, load these every prompt (unless the user opted out for that skill). Paths are project-local defaults; hybrid installs may resolve the same id under `{globalSkillsRoot}` when missing locally.

| Skill | Path | Trigger |
|-------|------|---------|
| `ws-senior-developer` | `{skillsRoot}/ws-senior-developer/SKILL.md` | Every prompt — delivery gate / Code review proof |
| `ws-self-learning` | `{skillsRoot}/ws-self-learning/SKILL.md` | Every mutating task — MEMORY consult + trap write |
| `ws-changelog` | `{skillsRoot}/ws-changelog/SKILL.md` | Every task completion — append-only history |
| `ws-fable-method` | `{skillsRoot}/ws-fable-method/SKILL.md` | Every prompt — structured investigate/act/verify when non-trivial |
| `ws-tdah` | `{skillsRoot}/ws-tdah/SKILL.md` | Every prompt — action-first shape + judgment |

Precedence when both root and `{sharedDir}/AGENTS.md` load: root / this file win for autoload membership; see [`AGENTS.md`](AGENTS.md) § Consumer root override.

### Precedence among Always-applied (highest first)

1. Explicit user instructions (current turn)
2. Design / spec / architecture constraints
3. `ws-senior-developer` (delivery gate + Code review proof; opt out `stop ws-senior-developer`)
4. `ws-fable-method` (investigate loop; **defer** when orch owns the session or senior already confirmed a plan — see fable Gates)
5. `ws-tdah` (reply shape; does not override senior proof depth)
6. `ws-self-learning` / `ws-changelog` (completion gates: Learning then Changelog)

**Fable vs senior (single rule):** Orch or confirmed senior plan → no fable Plan-First / competing plan ceremony. Fable Verify does not replace senior Code review proof.

---

## Specs vocabulary (dictionary)

Use these terms exactly. Do not treat a **plan** as a **spec**.

| Term | Meaning |
|------|---------|
| **Spec** | Human-facing feature specification `*.spec.md` under `{specsDir}` (`config.json` → `plans.specsDir`, default `.agents/specs`) |
| **`{specsDir}`** | Specs root only — drafts, mirrors, `index.PRD`. Not workflow state |
| **Plan / workflow run** | Artifacts under `{us-dir}` = `{plansDir}/{slug}/` (`plans.dir`, default `.agents/plans`) |
| **`step-00-{slug}.spec.md`** | Workflow copy of the spec inside `{us-dir}` after register/provider fetch — **plan artifact**, not a Spec-board row |
| **`index.PRD`** | Project feature index at `{specsDir}/index.PRD` (phases, next-specs, inbox) — owned by `ws-spec-index` |
| **Register** | Copy/normalize a `{specsDir}` (or other) `*.spec.md` into `{us-dir}/step-00-*.spec.md` via `ws-local-spec-provider` |
| **Mirror** | Refresh `{specsDir}/{slug}.spec.md` from a non-specsDir input during register (`--mirror`) |
| **Classify** | Recommend `lite` vs `standard` orch (`ws-classify-complexity`) after a workflow spec exists |
| **Drift sync** | Update existing `*.spec.md` bodies to match code (`ws-sync-spec`) — not the same as `ws-spec-index sync` (index status) |
| **Batch** | Sequential multi-spec delivery (`ws-multi-spec`) |

### Path rules (mandatory)

1. Standalone `/write-spec` / brainstorm → write **only** `{specsDir}/{slug}.spec.md`. Never mkdir `{plansDir}/{slug}/` for that ask.
2. Workflow planning and later steps read **`{us-dir}/step-00-{slug}.spec.md`** (after register or tracker fetch).
3. Spec board (`ws-spec-list --specs`) lists `{specsDir}` only. Plan board lists `{plansDir}` state — never merge the two inventories.

---

## Specs skill router (progressive disclosure)

Load **only** the skill that matches the user intent. Do not load the whole family.

| When the user / task means… | Load | Does **not** do |
|-----------------------------|------|-----------------|
| Draft a new local spec from free text | [`ws-write-spec`](../ws-write-spec/SKILL.md) | Does not create `{plansDir}` / `step-00`; does not run orch |
| Validate / reshape / review `*.spec.md` format & ACs | [`ws-spec-format`](../ws-spec-format/SKILL.md) | Does not invent product requirements; format SoT is [`FORMAT.md`](../ws-spec-format/FORMAT.md) |
| Register local `*.spec.md` → workflow `step-00`; configure `{specsDir}`; local `fetch-to-spec` | [`ws-local-spec-provider`](../ws-local-spec-provider/SKILL.md) | Not for free-text draft (use write-spec first); PR ops delegate to `providers.scm` |
| List / pick / manage specs vs plan workflows (two boards) | [`ws-spec-list`](../ws-spec-list/SKILL.md) | Does not edit `index.PRD` content (that is spec-index); does not implement pipeline steps |
| Init / sync / promote `index.PRD` feature map | [`ws-spec-index`](../ws-spec-index/SKILL.md) | Does not rewrite AC bodies for code drift (that is sync-spec); `sync` = index status vs delivery evidence |
| Spec text drifted from implemented code after prompts | [`ws-sync-spec`](../ws-sync-spec/SKILL.md) | Does not update `index.PRD` checkboxes (use spec-index `sync`); does not start orch |
| Deliver **one** feature Spec→PR (full FSM 0–9) | [`ws-spec-to-pr`](../ws-spec-to-pr/SKILL.md) | Not for batch; not for format-only edits |
| Deliver **one** feature Spec→PR (fast lite 0–5) | [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md) | Not for complex multi-phase work; never cross-resume with standard |
| Pick lite vs standard for a ready spec | [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) | Orthogonal to gates.md simple/standard/complex skip axis |
| Deliver **many** specs sequentially (auto lite/standard workers) | [`ws-multi-spec`](../ws-multi-spec/SKILL.md) | Master orch only — does not edit product code itself |

### Keyword → skill (quick map)

| Keywords / phrases | Invoke |
|--------------------|--------|
| write a spec, draft spec, brainstorm feature spec | `ws-write-spec` |
| format spec, validate AC, spec-format, missing acceptance criteria | `ws-spec-format` |
| register local spec, fetch-to-spec (file), normalize `source: local` | `ws-local-spec-provider` |
| list specs, list plans, dual board, unlinked specs, manage workflows | `ws-spec-list` |
| index.PRD, promote inbox, sync index status, init PRD | `ws-spec-index` |
| sync spec to code, spec drift, update AC after code change | `ws-sync-spec` |
| spec to pr, full pipeline, standard orch | `ws-spec-to-pr` |
| lite / fast spec to pr | `ws-spec-to-pr-lite` |
| classify complexity, lite or standard? | `ws-classify-complexity` |
| multi-spec, batch specs, run all specs | `ws-multi-spec` |

---

## How the family fits together

```text
ideas / free text
    → ws-write-spec          → {specsDir}/{slug}.spec.md
    → ws-spec-format         → validate / reshape same file
    → ws-spec-index promote  → optional index.PRD row + stub

{specsDir}/*.spec.md
    → ws-spec-list           → browse / start orch / remove
    → ws-local-spec-provider → {us-dir}/step-00-{slug}.spec.md
    → ws-classify-complexity → lite | standard
    → ws-spec-to-pr-lite  or  ws-spec-to-pr  → PR
    → ws-multi-spec          → loop classify + worker orch per spec

after code changes outside orch
    → ws-sync-spec           → surgical updates to {specsDir} (and/or step-00 if still linked)

after ship / delivery evidence
    → ws-spec-index sync     → index.PRD checkboxes / Done log
```

**Complement rules**

1. `ws-write-spec` owns **creation** under `{specsDir}`; `ws-local-spec-provider` owns **promotion** into `{us-dir}`.
2. `ws-spec-format` is the only format SoT; write-spec / providers / sync-spec **follow** it — they do not redefine frontmatter.
3. `ws-spec-list` is the UX board; `ws-spec-index` is the PRD index; do not use one for the other's job.
4. `ws-sync-spec` (body ↔ code) ≠ `ws-spec-index sync` (index ↔ delivery evidence).
5. `ws-multi-spec` dispatches `ws-spec-to-pr` / `ws-spec-to-pr-lite` workers; it does not replace `ws-spec-list` for interactive pick-one.
6. Tracker issues/WIs enter via `ws-github-provider` / `ws-azure-devops-provider` `fetch-to-spec` (write `step-00` directly); local files enter via local-spec-provider.

---

## Seed note

Shipped by install/update as hub template. Prefer keeping the Specs vocabulary and router sections aligned with upstream. Customize the Always-applied table per project when needed (or via `ws-configure-project` when that section is implemented).
