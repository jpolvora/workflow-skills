# Session-model gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove in-gate model switching and `--model` / `--model-chain`; orch reads the session model and tells users to Pause → switch in Cursor → Resume.

**Architecture:** Canonical contract lives in `shared/gates.md` + `shared/setup.md`. Full and lite orchestrators point at that contract. State hygiene refreshes `currentModel` from the session on every boundary/resume. Docs (FAQ/README) match. No new skill files.

**Tech Stack:** Markdown skill contracts under `.agents/skills/`; verification via `rg` greps (no runtime unit tests for this doc change). Spec: [`docs/superpowers/specs/2026-07-17-session-model-gates-design.md`](../specs/2026-07-17-session-model-gates-design.md).

## Global Constraints

- Drop `--model` and `--model-chain` as workflow invocation flags (Approach A).
- Do **not** remove `update_state.py --model {modelName}` (hygiene recorder of session model).
- Do **not** change unrelated `--model` usages (e.g. agentic code review curl in root `AGENTS.md`, `.github/workflows/code-review.yml`, provider script args).
- Do **not** invent a Cursor API to force-switch models.
- Soft tips only at full-orch F1→F2 and F3→F4; lite = banner only (no phase soft tips).
- Skill bodies stay **en-us**.
- Commits only when the user explicitly asks (user rule overrides “frequent commits” in this skill).
- Out of scope: AskQuestion FORCE/probe cleanup plan.

## File map

| File | Responsibility |
|------|----------------|
| `.agents/skills/shared/gates.md` | Banner + menu without Switch model; soft-tip note |
| `.agents/skills/shared/setup.md` | Session `currentModel`; no model flags; resume refresh |
| `.agents/skills/spec-to-pr/protocols/state-hygiene.md` | Drop modelChain apply; session refresh + logs |
| `.agents/skills/spec-to-pr/protocols/progress-board.md` | Optional one-line switch hint under Current model |
| `.agents/skills/spec-to-pr/SKILL.md` | Strip flags/Switch UX; soft tips; point to gates |
| `.agents/skills/spec-to-pr-lite/SKILL.md` | Align menu + triggers; no model flags |
| `.agents/skills/spec-to-pr/README.md` | Human docs: pause/resume model switch |
| `.agents/skills/spec-to-pr/docs/faq.md` | FAQ answer + state field list |
| `CHANGELOG.md` | Task completion entry (changelog skill) |

---

### Task 1: Canonical gate contract (`gates.md`)

**Files:**
- Modify: `.agents/skills/shared/gates.md`
- Verify: `rg` commands below

**Interfaces:**
- Produces: transition banner text; More-options list without Switch model; soft-tip pointer for full orch
- Consumes: design § Gate UX

- [ ] **Step 1: Replace § Default transition menu (slim)** with this exact block (replace lines 33–47):

```markdown
## Default transition menu (slim)

**Banner (always, before options):**

```text
Current model: {currentModel}
To use a different model for the next step: Pause → switch model in Cursor → resume workflow.
```

Resolve `{currentModel}` from the **executing session model** (agent identity / runtime). If unknown, use `unknown` and still show the Pause path. Log `model | step {N} | {name} | ISO`. On change vs prior state value, also log `model-change | step {N} | {old} → {new} | ISO`.

**Primary options (always shown):**

1. **Advance to Step N+1** (Recommended)
2. **More options…**

**Under More options…** (second AskQuestion only if user picked More):

- Repeat current step
- Go back to earlier step (full FSM only; lite: Pause instead if no backward nav)
- **Pause workflow** (keeps all artifacts) — after pause, switch model in Cursor, then resume the workflow; orch re-reads the session model
- Cancel without revert / Cancel and revert

Do **not** offer Switch model / Choose model / concrete model-name menus. Model changes happen only via Pause → Cursor model picker → Resume.

**Phase soft tips (full orch only):** When the next step crosses F1→F2 (after Step 3, before Step 5) or F3→F4 (after Step 7, before Step 9), add one hint line under the banner (no picker):

- F1→F2: `Hint: implementation ahead — consider a Coder-class model (Pause → switch → Resume).`
- F3→F4: `Hint: review ahead — consider a Reviewer/Thinking-class model (Pause → switch → Resume).`

Log `model-hint | F1→F2|F3→F4 | current={currentModel} | ISO`. Lite: banner only (no phase soft tips). See full orch Model readiness for tags `before-step-5` / `before-step-9` (telemetry only; not user menus).
```

Note: the inner fence is ```text … ``` inside the outer markdown file — keep nested fences valid (use indented fence or four-backtick outer if needed).

- [ ] **Step 2: Optional Pause copy on delivery/ship** — after the Pause option lines in Delivery and Ship sections, add one parenthetical (same wording):

`(to change model: switch in Cursor, then resume)`

- [ ] **Step 3: Verify**

```bash
rg -n "Switch model and advance|keep current model" .agents/skills/shared/gates.md
rg -n "Pause → switch model in Cursor" .agents/skills/shared/gates.md
```

Expected: first command = no matches; second = ≥1 match.

- [ ] **Step 4: Commit** (only if user asked)

```bash
git add .agents/skills/shared/gates.md
git commit -m "$(cat <<'EOF'
docs(gates): session-model banner; drop in-gate Switch model

EOF
)"
```

---

### Task 2: Bootstrap / resume session model (`setup.md`)

**Files:**
- Modify: `.agents/skills/shared/setup.md`
- Verify: `rg` below

**Interfaces:**
- Consumes: Task 1 banner contract (session model definition)
- Produces: flag parse without `--model` / `--model-chain`; resume refresh of `currentModel`

- [ ] **Step 1: Replace flag-parse bullets** (step 2, currently lines 47–51) with:

```markdown
2. **Parse flags**: `auto`, `dry-run`, `skip-integration`, `skip-tests`, `full`, `strict`.
   - Set `currentModel` from the **executing session model** (agent identity / runtime). If unknown → `unknown`.
   - Do **not** accept `--model` or `--model-chain` (removed). If the raw invocation still contains them, ignore and note once in the init banner: `model flags ignored — use Pause → switch in Cursor → Resume`.
   - Do **not** store or apply `modelChain`.
   - `strict` → full US verification at Step 6 (standard orch only).
```

- [ ] **Step 2: Init table** — remove the `modelChain` row; keep `currentModel` with note `{session model}`:

```markdown
   | `currentModel` | `{session model}` |
```

- [ ] **Step 3: Resume refresh** — after Resume bullet “Resume: load state…” (around step 5 in Resume / Reset), add:

```markdown
5a. **Session model refresh (mandatory on every resume):** Re-read the executing session model → update `currentModel`. If changed vs prior frontmatter value, log `model-change | step {currentStep} | {old} → {new} | ISO` in ## Gate history. Ignore leftover `modelChain` keys in old state files.
```

Renumber following bullets only if the file already uses strict numbering; otherwise keep as `5a`.

- [ ] **Step 4: Verify**

```bash
rg -n "--model-chain|modelChain" .agents/skills/shared/setup.md
rg -n "session model|model flags ignored|Session model refresh" .agents/skills/shared/setup.md
```

Expected: first = no active instruction matches (ideally zero); second = matches for the new contract.

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add .agents/skills/shared/setup.md
git commit -m "$(cat <<'EOF'
docs(setup): derive currentModel from session; drop model flags

EOF
)"
```

---

### Task 3: State hygiene + progress board

**Files:**
- Modify: `.agents/skills/spec-to-pr/protocols/state-hygiene.md`
- Modify: `.agents/skills/spec-to-pr/protocols/progress-board.md`

**Interfaces:**
- Consumes: session `currentModel` from Task 2
- Produces: hygiene steps that refresh model + optional board hint
- Keeps: `update_state.py ... --model {modelName}` as recorder

- [ ] **Step 1: Replace the first manual-fallback bullet** in `state-hygiene.md`:

From:
```yaml
- Check modelChain[N+1] → if set, update currentModel and log model-chain in ## Gate history
```

To:
```yaml
- Refresh currentModel from executing session model (unknown if unavailable). If changed vs prior, log model-change | step {N} | {old} → {new} | ISO in ## Gate history. Ignore leftover modelChain.
- Pass session model into --model {modelName} when calling update_state.py (recorder only; not a user override flag)
```

- [ ] **Step 2: Progress board** — under the `**Current model:**` line in the template, add:

```markdown
_Model switch: Pause → change model in Cursor → resume._
```

- [ ] **Step 3: Verify**

```bash
rg -n "modelChain\[N\+1\]|model-chain \|" .agents/skills/spec-to-pr/protocols/state-hygiene.md
rg -n "Pause → change model in Cursor" .agents/skills/spec-to-pr/protocols/progress-board.md
rg -n "--model \{modelName\}" .agents/skills/spec-to-pr/protocols/state-hygiene.md
```

Expected: first = no matches; second = ≥1; third = still present (recorder kept).

- [ ] **Step 4: Commit** (only if user asked)

```bash
git add .agents/skills/spec-to-pr/protocols/state-hygiene.md .agents/skills/spec-to-pr/protocols/progress-board.md
git commit -m "$(cat <<'EOF'
docs(protocols): session model refresh; drop modelChain hygiene

EOF
)"
```

---

### Task 4: Full orchestrator (`spec-to-pr/SKILL.md`)

**Files:**
- Modify: `.agents/skills/spec-to-pr/SKILL.md`

**Interfaces:**
- Consumes: Tasks 1–3 contracts
- Produces: orch text aligned to session-model gates

- [ ] **Step 1: Frontmatter description** — remove `--model, --model-chain` from Flags line:

```yaml
  Flags: dry-run, auto, skip-integration, skip-tests, full, strict. Delegates via Task tool.
```

- [ ] **Step 2: Invariants table** — delete the `--model` and `--model-chain` rows (currently ~L80–81). Add one row:

```markdown
| Session model | `currentModel` = executing session model. Switch via Pause → Cursor → Resume ([`gates.md`](../shared/gates.md)). |
```

- [ ] **Step 3: Replace § Model readiness** (currently ~L246–252) with:

```markdown
### Model readiness (no separate 4†/8† menus)

No in-gate model picker. At every transition, show the gates.md banner (`Current model` + Pause → Cursor → Resume).

When Advance crosses **F1→F2** (after Step 3, before Step 5) or **F3→F4** (after Step 7, before Step 9), add the soft hint from [`gates.md`](../shared/gates.md) (Coder / Reviewer class). Log `model-hint | F1→F2|F3→F4 | current={currentModel} | ISO`. Tags `before-step-5`, `before-step-9` remain for telemetry only.

Steps **4 and 8** are **not** user-facing menus and stay out of `completedSteps` / Progress Board.
```

- [ ] **Step 4: Automatic Mode table** — replace the two model rows (~L345–346) with:

```markdown
| Transition / phase model | **Advance** with session `currentModel` (no `--model-chain`) |
```

- [ ] **Step 5: State YAML** — remove `modelChain` line; keep `currentModel` / `stepModels`. Add comment on `currentModel`:

```yaml
refineRound, currentModel  # session-derived; refresh on resume
stepModels: [{step: N, model: "name", dispatched: ISO}]
# modelChain removed — ignore if present in old state files
```

- [ ] **Step 6: Transition Gates paragraph** (~L430) — replace with:

```markdown
Shows gates.md banner (`Current model` + Pause → Cursor → Resume) and `**Next step:** {N+1} — {Label}`. Primary: **Advance** (Recommended) / **More options…**. Soft tips at F1→F2 / F3→F4 only.
```

- [ ] **Step 7: Triggers** — remove model flags from invoke lines; replace `switch model | change model → …` with:

```text
@[spec-to-pr] [auto|dry-run|skip-integration|skip-tests|full|strict] [US {issue_id} | {org}/{project}#{id} | {name}.spec.md | "feature description"]
/spec-to-pr [flags] [US {issue_id} | {org}/{project}#{id} | {name}.spec.md | "feature description"]
/status | progress | where am I? → Progress Board only
go back | change plan | back to step X → Backward Nav (not in auto)
switch model | change model → Pause workflow, switch in Cursor, resume (no in-gate picker)
```

Delete the **Model flags** table rows for `--model` / `--model-chain`. Keep `--strict` in a small **Other flags** note or leave `--strict` in the remaining flags prose:

```markdown
**Flags:** `auto`, `dry-run`, `skip-integration`, `skip-tests`, `full`, `strict` (full US verification at Step 6). Model = session; switch via Pause → Cursor → Resume ([`gates.md`](../shared/gates.md)).
```

- [ ] **Step 8: Examples** — delete examples that use `--model` or `--model-chain`. Keep:

```markdown
- `/spec-to-pr auto skip-tests skip-integration US 1234`
- `/spec-to-pr "Implement a product analytics dashboard with real-time charts"`
- `/spec-to-pr auto contoso/project#5678`
- `/spec-to-pr ADO 2416`
- `/spec-to-pr specs/my-feature.spec.md`
- `/spec-to-pr full US 99`
- `/spec-to-pr auto skip-tests US 567`
```

- [ ] **Step 9: Verify**

```bash
rg -n "--model-chain|Switch model and advance|More options… on any transition" .agents/skills/spec-to-pr/SKILL.md
rg -n "Pause → Cursor → Resume|session model|model-hint" .agents/skills/spec-to-pr/SKILL.md
```

Expected: first has no active Switch/`--model-chain` instructions (trigger line may mention “switch model” only as alias to Pause path); second ≥1.

- [ ] **Step 10: Commit** (only if user asked)

```bash
git add .agents/skills/spec-to-pr/SKILL.md
git commit -m "$(cat <<'EOF'
docs(spec-to-pr): session-model transitions; remove model CLI flags

EOF
)"
```

---

### Task 5: Lite orchestrator

**Files:**
- Modify: `.agents/skills/spec-to-pr-lite/SKILL.md`

**Interfaces:**
- Consumes: Task 1 `gates.md` (banner only; no phase soft tips)

- [ ] **Step 1: Frontmatter Flags** — remove `--model, --model-chain`:

```yaml
  Flags: dry-run, auto, skip-tests, full. Delegates via Task tool.
```

- [ ] **Step 2: Transition menu** — replace lines 45–52 with:

```markdown
## Transition menu (every step boundary)

Per [`gates.md`](../shared/gates.md):

**Banner:** Current model + Pause → switch in Cursor → resume.

1. **Advance** (Recommended)
2. **More options…** → Repeat / Pause or cancel (no Switch model)

No 5-option primary menus. No phase soft tips (full-orch only). Progress Board: bootstrap, after each step summary, pause, `/status`, final.
```

- [ ] **Step 3: Triggers** — remove model flags:

```text
@[spec-to-pr-lite] [auto|dry-run|skip-tests|full] [US {issue_id} | {org}/{project}#{id} | {name}.spec.md]
/spec-to-pr-lite [flags] [US {issue_id} | {org}/{project}#{id} | {name}.spec.md]
```

- [ ] **Step 4: Verify**

```bash
rg -n "--model|Switch model" .agents/skills/spec-to-pr-lite/SKILL.md
rg -n "Pause → switch in Cursor" .agents/skills/spec-to-pr-lite/SKILL.md
```

Expected: first = zero (or only in Base Prompt `model {currentModel}` field which must remain); second ≥1. Confirm Base Prompt still has `model {currentModel}`.

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add .agents/skills/spec-to-pr-lite/SKILL.md
git commit -m "$(cat <<'EOF'
docs(spec-to-pr-lite): align gates to session-model pause/resume

EOF
)"
```

---

### Task 6: Human docs (README + FAQ)

**Files:**
- Modify: `.agents/skills/spec-to-pr/README.md`
- Modify: `.agents/skills/spec-to-pr/docs/faq.md`

**Interfaces:**
- Consumes: final gate contract from Tasks 1–5

- [ ] **Step 1: README** — find Safety & Gates / Model flags / invoke examples mentioning `--model` or `--model-chain` and rewrite:

Model switch section (replace any Switch-model / model-chain prose):

```markdown
### Model selection

The workflow uses the **session model** currently selected in Cursor. Shown as `Current model` on every transition.

To change model for the next step: **Pause** → switch model in the Cursor UI → **resume** the workflow (`/spec-to-pr …` or `/spec-to-pr-lite …`). Each step can run on a different model this way.

`--model` and `--model-chain` flags are removed.
```

Remove invoke examples that pass those flags (keep non-model examples). Soften “model readiness checks” wording to “phase soft tips (Coder/Reviewer) — Pause to switch”.

- [ ] **Step 2: FAQ** — replace § How do I switch models mid-workflow? (~L720–722) with:

```markdown
### How do I switch models mid-workflow?

1. Choose **Pause workflow** at any transition gate (or hard-stop pause).
2. Switch the model in the Cursor UI.
3. Resume with the same US/spec (`/spec-to-pr 2416` or lite equivalent).

The orchestrator re-reads the session model into `currentModel` and logs `model-change` when it differs. There is no in-gate model picker and no `--model-chain` flag.
```

In state field list (~L655), change `currentModel`, `modelChain` → `currentModel` (session-derived; `modelChain` removed / ignored if leftover).

Update any remaining FAQ bullets that still describe Switch model / Keep current model menus at 4†/8† if still present as user-facing options — rewrite to soft tip + Pause path.

- [ ] **Step 3: Verify (repo skill bodies, exclude CHANGELOG and this plan/spec)**

```bash
rg -n "Switch model and advance|--model-chain|modelChain:" \
  .agents/skills/shared \
  .agents/skills/spec-to-pr \
  .agents/skills/spec-to-pr-lite \
  --glob '!**/CHANGELOG.md'
```

Expected: no matches for `Switch model and advance` or `--model-chain`. `modelChain` may appear only as “removed / ignore leftover”. `update_state.py --model` and Base Prompt `model {currentModel}` must still exist.

Allowlist check (must still match):

```bash
rg -n "--model \{modelName\}|--model \{model\}" .agents/skills/spec-to-pr/protocols/state-hygiene.md .agents/skills/azure-devops-provider/SKILL.md
```

- [ ] **Step 4: Commit** (only if user asked)

```bash
git add .agents/skills/spec-to-pr/README.md .agents/skills/spec-to-pr/docs/faq.md
git commit -m "$(cat <<'EOF'
docs(spec-to-pr): FAQ/README pause-to-switch model path

EOF
)"
```

---

### Task 7: Changelog + harness follow-up ask

**Files:**
- Modify: `CHANGELOG.md` (via changelog skill)
- Optionally: `shared/MEMORY.md` via self-learning if a durable trap was found

- [ ] **Step 1: Load and follow** `.agents/skills/changelog/SKILL.md` — append an entry summarizing session-model gates (drop in-gate switch + CLI model flags; Pause → Cursor → Resume).

- [ ] **Step 2: Ask user** (harness change protocol):

1. Run **check-harness**? (recommended: yes, Phases 0–5c)
2. Regenerate **site** (`node bin/build-site.js`)? (only if catalog/routing text changed — likely no)
3. Update root **README**? (only if it still documents `--model-chain` — grep first)

```bash
rg -n "--model-chain|Switch model and advance" README.md AGENTS.md .agents/AGENTS.md
```

- [ ] **Step 3: Final success grep** (same as Task 6 Step 3) — must pass before claiming done.

- [ ] **Step 4: Commit** (only if user asked) — changelog (+ any harness fixes).

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Session-derived `currentModel` on bootstrap/transition/resume | 2, 3, 4 |
| Banner every transition | 1, 4, 5 |
| Pause → Cursor → Resume as only switch path | 1, 4, 5, 6 |
| Drop `--model` / `--model-chain` | 2, 4, 5, 6 |
| Soft tips F1→F2 / F3→F4 only | 1, 4 |
| Lite banner only | 5 |
| Drop modelChain apply; ignore leftover | 2, 3, 4 |
| Keep `update_state.py --model` recorder | 3 |
| FAQ/README | 6 |
| CHANGELOG + harness ask | 7 |

## Placeholder / consistency self-review

- No TBD steps; concrete replacements included.
- `currentModel` naming consistent across tasks.
- Log strings: `model | …`, `model-change | …`, `model-hint | …` match the design doc.
- Unrelated `--model` (code-review curl, ADO provider) explicitly preserved.
