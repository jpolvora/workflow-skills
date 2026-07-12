---
name: step-10-update-plan-implementation
description: Post-workflow follow-up after us-workflow. Captures manual QA findings, implements delta fixes, appends implementation steps to the last US plan, verifies against code, updates result.md, and certifies the pack for the next PR. Use on demand when tests after workflow reveal more work — invoke explicitly; not part of us-workflow.
disable-model-invocation: true
version: 1.0
---

# Step 10 — Update Plan & Implementation (Post-Workflow)

Runs **after** [`us-workflow`](../us-workflow/SKILL.md) completes or stops before Step 12. Packs manual QA findings, implements delta fixes, appends steps to the US plan, verifies against code, updates result.md, and certifies for the next PR.

Invoke on demand via `@step-10-update-plan-implementation` or `/step-10`. Never auto-starts from `us-workflow`.

---

## Allowed Dependencies

- This file
- Durable US artifacts: `.cursor/plans/{slug}/{slug}.plan.md`, `{slug}.result.md`
- Project: [`AGENTS.md`](../../../AGENTS.md), [`.cursor/rules/ef-migrations.mdc`](../../../.cursor/rules/ef-migrations.mdc), [`MEMORY.md`](../../../MEMORY.md), `docs/`
- Skills (read-only reference): [`us-workflow`](../us-workflow/SKILL.md), [`stack.md`](../us-workflow/stack.md), [`code-review`](../code-review/SKILL.md) (optional spot-check)
- **No** `us-workflow` state file required (may remain after Step 12 or be deleted on cleanup)

---

## Working Folder

Same convention as [`us-workflow`](../us-workflow/SKILL.md) § Work dir:

| Path | Role |
|------|------|
| `{us-dir}/` | `.cursor/plans/{slug}/` |
| `{us-dir}/{slug}.plan.md` | **Updated** — append §9 delta |
| `{us-dir}/{slug}.result.md` | **Updated** — Done / Next steps / commits |
| `{us-dir}/{slug}.step10-{session}.md` | **New transient** — session log (optional commit; delete after certify) |

**Resolve `{slug}`** from user input (`us-1234`, `job-run-observability`, path to `*.plan.md`) or by scanning `.cursor/plans/**/` for the most recent `{slug}.result.md` / `{slug}.plan.md` on the current branch.

| Entry | `{slug}` |
|-------|----------|
| GitHub issue `1234` | `us-1234` |
| Local spec / feature name | folder basename (e.g. `job-run-observability`) |

---

## Authorization Ladder

| Level | Operations | Gate |
|-------|------------|------|
| **G0** | Read plan, result, git log, code | None |
| **G1** | Edit source, update plan/result | User confirms intake summary |
| **G2-code** | `git commit` code (`src/`, `web/`, `tests/`) | Explicit consent per commit batch |
| **G2-docs** | `git commit` `{slug}.plan.md` + `{slug}.result.md` | Explicit consent (docs-only) |
| **G3** | `git push`, PR | Out of scope — user manual |

**Hard stops:** cancelled `AskQuestion` → STOP; commit without G2 → STOP; build fails → fix loop before G2.

**Schema changes:** EF migrations **CLI-only** — [`ef-migrations.mdc`](../../../.cursor/rules/ef-migrations.mdc); never hand-write migration files.

---

## Execution Flow

Copy and track:

```
Step-10 Progress:
- [ ] 1. Bootstrap — resolve US context
- [ ] 2. Intake — capture manual QA findings
- [ ] 3. Delta plan — append §9 to plan.md
- [ ] 4. Implement — code fixes (if authorized)
- [ ] 5. Verify — build/test + plan↔code check
- [ ] 6. Certify — update result.md, session log, summary for PR
```

### 1. Bootstrap — Resolve last workflow context

1. Determine **`{slug}`** (ask if ambiguous).
2. Read `{us-dir}/{slug}.plan.md` frontmatter / header: `workflow`, `branch`, baseline.
3. Read `{us-dir}/{slug}.result.md` (if missing, treat workflow as incomplete — still proceed; stub from plan §0 / spec ACs).
4. `git checkout` / confirm on branch from plan (or current branch if user overrides).
5. Collect **post-workflow commits**:
   ```bash
   git log --oneline {base}..HEAD
   ```
   Base = last commit listed in `result.md` **or** merge-base with `master`/`main`.
6. List dirty/uncommitted files: `git status -sb`.

Present **Context Board** (pt-BR): slug, branch, workflow-id, commits since delivery, open items from `result.md` **Next steps**.

### 2. Intake — Manual QA findings

User describes what failed or is missing after their tests. For each item record:

| Field | Content |
|-------|---------|
| `finding-id` | F-01, F-02, … |
| `source` | manual QA / browser / GitHub comment / code review residual |
| `severity` | blocker / should-fix / nice-to-have |
| `description` | What user observed |
| `expected` | From AC / plan / issue |
| `evidence` | Screenshot path, steps, file:line if known |

If intake is empty, offer: **(A)** scan `result.md` Next steps + `git diff` for obvious gaps, **(B)** stop.

**Gate G1:** `AskQuestion` — “Resumo dos achados está correto?” → only then edit plan or code.

### 3. Delta plan — Append §9 to `{slug}.plan.md`

Append (do not replace prior sections):

```markdown
## §9 Post-workflow follow-up (Step-10)

**session-id:** `step10-{YYYYMMDD-HHMMSS}`
**triggered:** {date}
**after-workflow:** `{workflow-id}`
**branch:** `{branch}`
**intake-source:** manual QA

### Findings

| ID | Severity | Description | Expected | Status |
|----|----------|-------------|----------|--------|
| F-01 | … | … | … | open / done |

### Delta implementation steps

| Step | Finding | Action | Files (expected) | AC / test | Status |
|------|---------|--------|------------------|-----------|--------|
| S-01 | F-01 | … | `path/...` | … | pending / done |

### Commits (this session)

| Hash | Message | Steps |
|------|---------|-------|
| (filled in phase 6) | | |

### Certification

| Check | Status |
|-------|--------|
| Build | pending / pass |
| Tests (scoped) | pending / pass / skipped |
| Plan ↔ code | pending / pass |
| result.md updated | pending / done |
```

Also patch **§1 DoR / ACs** or checklist sections when a finding maps to an existing AC (add sub-bullet; do not delete history).

Write session copy to `{us-dir}/{slug}.step10-{session}.md` (same content as §9 for audit).

Template reference: [plan-delta-template.md](plan-delta-template.md).

### 4. Implement — Delta execution

For each open step `S-NN` (priority: blocker → should-fix → nice-to-have):

1. Read [`MEMORY.md`](../../../MEMORY.md) — apply Patterns, avoid Traps.
2. Implement minimal fix; match style of files touched in original workflow ([`senior-developer`](../senior-developer/SKILL.md), [`karpathy-guidelines`](../karpathy-guidelines/SKILL.md)).
3. Mark step `done` in §9 table; note `files_touched`.
4. **Build & test** (tools from `tools.md`, commands from `config.json.verification`):
   - Always: `build-backend`; `build-frontend` when FE touched
   - Tests: `test-backend`; `test-frontend` when i18n/UI logic touched — scoped unless user said `skip-tests`
   - Port bind conflicts: ask before stopping dev stack

**Gate G2-code** before each code commit batch:

- Suggested message: `fix({slug}): {short summary}` or `fix(us-{id}): post-workflow {F-01}`
- Stage **only** `src/`, `web/`, `tests/` — never `git add .`
- Group related steps in one commit when sensible.

**Pre-existing dirty files:** never revert; only commit files attributed to this session.

### 5. Verify — Plan ↔ implementation

Read-only validation:

1. **Coverage:** Every `F-NN` with severity blocker/should-fix has step `done` or explicit `wont-fix` with user consent.
2. **Files:** Each step’s expected files exist and reflect the described action (`git diff`, read files).
3. **AC mapping:** Updated §1/checklist items checked where applicable.
4. **Regression:** Build green; scoped tests green (or documented skip).
5. **Optional:** Run [`code-review`](../code-review/SKILL.md) on `master...HEAD` for delta only — do not enter fix loop unless user asks.

Update §9 **Certification** table. On failure → return to phase 4.

### 6. Certify — Pack for next PR

1. Fill §9 **Commits** table with hashes from this session (including plan/result doc commits).
2. Update `{us-dir}/{slug}.result.md` (structured delivery format — English body):
   - **Done:** append new fixes/features (factual bullets)
   - **Next steps:** remove resolved items; add remaining pendências
   - Note new commits under **Done** or inline
   - Keep **Expected** / **References** intact unless scope changed
3. **Gate G2-docs:** stage only `{slug}.plan.md` + `{slug}.result.md` → `docs({slug}): step-10 follow-up plan and result`
4. Present **PR Readiness Summary** (pt-BR):

```markdown
## Pacote Step-10 — {slug}

**Branch:** `{branch}`
**Sessão:** `{session-id}`

### Entregue nesta sessão
- …

### Commits novos
| Hash | Mensagem |

### Verificação
- Build: PASS/FAIL
- Testes: …
- Plano §9: certificado

### Próximo passo (manual)
Push + abrir/atualizar PR. Opcional: `code-review` / `fix-pr`.
```

5. Delete `{us-dir}/{slug}.step10-{session}.md` if user prefers a clean folder (default: keep until PR merged).

**Task completion:** [`learning`](../learning/SKILL.md) → [`changelog`](../changelog/SKILL.md) when code changed.

---

## Resume / partial runs

| Situation | Action |
|-----------|--------|
| §9 exists with `pending` steps | Resume at phase 4 |
| Only plan update, no code yet | Stop after phase 3; user implements later |
| Workflow never reached Step 12 | Bootstrap from `plan.md` only; `result.md` may be absent — create stub per [Delivery Result Protocol](../us-workflow/SKILL.md#delivery-result-protocol-step-12--before-delivery-commit) |
| User already committed fixes manually | Skip phase 4; run phases 5–6 to align plan + result |

---

## Naming disambiguation

| Name | Skill / step |
|------|----------------|
| `us-workflow` Step 10 | In-pipeline code review fixes (`fix(us-{id}): …`) |
| **`step-10-update-plan-implementation`** | **This skill** — post-delivery QA delta |

---

## Additional resources

- Plan section template: [plan-delta-template.md](plan-delta-template.md)
- Workflow conventions: [SKILL.md](../us-workflow/SKILL.md) · [stack.md](../us-workflow/stack.md)
