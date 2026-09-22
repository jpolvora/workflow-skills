# Companion format (Tier 2)

## File shape

```markdown
## [Short title]

> Source: `<spec basename>` · Consulted: <source, source, …> · Not found: <source, …>

### Implementation
1. … (AC1)
2. … (AC2)

### UI Test
1. … (AC3)
2. … (AC4)

### Out of scope
- …

### Open questions
- …
```

Rules:

- Sections stay in this order. Omit `### Out of scope` only when the source
  spec states no boundary. Omit `### Open questions` only when no ambiguity
  was recorded.
- Numbering restarts at 1 per section and runs continuously (1, 2, 3, …).
- Every source acceptance criterion appears as `(ACn)` in at least one
  Implementation or UI Test step. One step may cite several ACs.
- Implementation steps state what the system must do (states, transitions,
  side effects, blocks). Bold menu, screen, button, status, entity names.
- UI Test steps are manual runbook lines: precondition → action →
  verification on a named screen. One step equals one testable observation;
  each starts from an initial state and ends in a visible verification.
- Out of scope bullets are short and preserve the source intent verbatim in
  meaning; add nothing.
- An unresolvable label is written `[unresolved: <term>]` with the sentence
  still testable without it. Never invent a screen or button name, and never
  widen scope to make a label fit.
- A blocking ambiguity is either resolved through `user-gate` (interactive)
  or recorded under `### Open questions` (`autoMode`); it is never guessed
  silently.

## Context checklist

Consult in order; mark each consulted or not-found in the companion header:

1. Agent spec of record (`{specsDir}` copy or `{us-dir}/step-NN-*.spec.md`).
2. `step-00-{slug}.issue.json` (original tracker snapshot, audit-only).
3. Original US/issue from the SCM provider (one provider skill, read-only).
4. `{memoryDir}/MEMORY.md`.
5. Changelog file (`rules.changelogFile`).
6. `README.md`.
7. Project docs (`docs/` or configured equivalent).
8. `AGENTS.md` / hub rules.
9. Spec-memo vault (only when memory integration is enabled).

## Phrase patterns (en-us default)

| Use | Pattern |
|-----|---------|
| Navigate | In menu **X**, item **Y**, open **Z**. |
| Check | On load, verify **condition**. |
| Implement | Change **control/rule** to **behavior**. |
| Persist | On save/confirm, store **state/data**. |
| Conditional | If **X**, then **Y**; verify on **screen**. |
| Scope | Do **not** handle when **X**. |

## Output language (`lang`, default `en-us`)

- `en-us`: this document's patterns and headings (`Implementation`, `UI Test`,
  `Out of scope`, `Open questions`).
- `pt-BR`: headings (`Implementação`, `Teste UI`, `Fora de escopo`,
  `Perguntas abertas`) with imperative numbered steps and bold menu, screen,
  button, status, entity names, per the reference runbook style.

Only these two languages are supported; any other value falls back to
`en-us` and records the fallback in the consulted line.

## Never do

- Edit the agent spec or any product file.
- Restate the spec without mapping ACs to steps.
- Ship without running `validate_companion.cjs` (exit 0 required).
