---
name: ws-megabrain
version: 0.3.61
description: >-
  Vibe-coding task implementer without a spec. Scan dirty work when asked what
  next; route specialists; consume fable/senior/karpathy/tdah. Trigger on
  /ws-megabrain, /megabrain, vibe coding, implement without spec, plan mode, or research.
invocation_names:
  - ws-megabrain
  - megabrain
---

# ws-megabrain

> When this skill is loaded, output "ws-megabrain loaded."

Vibe-coding **task implementer**. Specs are optional. Persona: senior product-engineering manager. Autoload: apply this stance on prompt-driven work; **defer** when `ws-spec-to-pr` / lite / `ws-spec-multi` owns the session. Opt out: `stop ws-megabrain`.

Do **not** copy companion protocols into this file. Load them:

| Need | Load |
|------|------|
| Investigate / act / verify / report; `plan`; research (Question) | [`../ws-fable-method/SKILL.md`](../ws-fable-method/SKILL.md) |
| Surgical diffs | [`../ws-karpathy-guidelines/SKILL.md`](../ws-karpathy-guidelines/SKILL.md) |
| Extras, ambiguity `user-gate`, Code review proof | [`../ws-senior-developer/SKILL.md`](../ws-senior-developer/SKILL.md) |
| Reply shape | [`../ws-tdah/SKILL.md`](../ws-tdah/SKILL.md) |
| MEMORY before mutate | `read-memory` ([`../ws-shared/tools.md`](../ws-shared/tools.md)) |

**Entry:** Expand `{sharedDir}` / `{skillsRoot}` / `{plansDir}` / `{specsDir}` / `{reviewsDir}` from [`../ws-shared/tools.md`](../ws-shared/tools.md). Missing config → defaults (`.agents/plans`, `.agents/specs`) and gap `config-missing`. Do not run `ws-spec-write` unless the user asked for a spec.

## Invocation

```text
/ws-megabrain                 implement (default) — optional what-next menu
/ws-megabrain plan            fable plan-first (named checks) then STOP
/ws-megabrain research        fable Question — findings, no edits
/megabrain --focus {path}
```

## Specialists (Read at most two, only after mode/gate)

**Router**

| Kind | File | Load when |
|------|------|-----------|
| `product` | [`references/PRODUCT.md`](references/PRODUCT.md) | Specs, board, refine |
| `development` | [`references/DEVELOPMENT.md`](references/DEVELOPMENT.md) | Implement, dirty product files |
| `review` | [`references/REVIEW.md`](references/REVIEW.md) | Review, harness findings |
| `delivery` | [`references/DELIVERY.md`](references/DELIVERY.md) | Close, leftovers, incomplete ship |

**Domain** (one, from path/title keywords):

| Kind | File | Hits (any) |
|------|------|------------|
| `ddd` | [`references/DDD.md`](references/DDD.md) | domain, aggregate, bounded context |
| `platform` | [`references/PLATFORM.md`](references/PLATFORM.md) | ci, docker, deploy, pipeline |
| `performance` | [`references/PERFORMANCE.md`](references/PERFORMANCE.md) | latency, cache, profile |
| `debug` | [`references/DEBUG.md`](references/DEBUG.md) | race, flaky, dump, root cause |
| `reverse` | [`references/REVERSE.md`](references/REVERSE.md) | undocumented, legacy, reconstruct |
| `api` | [`references/API.md`](references/API.md) | rest, graphql, grpc, webhook |
| `data` | [`references/DATA.md`](references/DATA.md) | schema, migration, sql |
| `qa` | [`references/QA.md`](references/QA.md) | e2e, coverage, test strategy |
| `refactor` | [`references/REFACTOR.md`](references/REFACTOR.md) | debt, solid, spaghetti |
| `frontend` | [`references/FRONTEND.md`](references/FRONTEND.md) | ui, css, a11y, bundle |
| `distributed` | [`references/DISTRIBUTED.md`](references/DISTRIBUTED.md) | queue, kafka, saga, microservice |

No hit → router only. Never Read the whole folder.

## Steps

1. **Bind host** — `askQuestionTool` from `{sharedDir}/host-capabilities.json` or one probe ([`../ws-shared/tools.md`](../ws-shared/tools.md)). `user-gate` / markdown yield ([`../ws-shared/gates.md`](../ws-shared/gates.md)). `autoMode` (`defaults.autoMode`; missing `config.json` → `false`, interactive `user-gate`) → recommended option 1.
   - Done when: `askQuestionTool` is a tool name or `none`.

2. **Mode** — `plan` → fable **Plan-First** then STOP. `research` / Question wording → fable **Question** (no Act). Else **Task** (implement, no spec required). Autoload with a clear task → skip the menu. `/ws-megabrain` with no task, or "what next" → Step 3. Orch owns session → stop this skill.
   - Done when: mode is `plan` | `research` | `implement` | `menu` | `defer`.

3. **Scan + gate** (menu only) — Parallel: `git status --porcelain`; branch; last 8 `git log --oneline`; `{plansDir}/*/*.state.md`; `{specsDir}/index.PRD` if present. Rank (Recommended first): unfinished dirty work → dirty no-plan → next board row → review/cleanup. 2–7 options + **Stop**. Each: evidence, `question`|`task`, specialist ids. Cancel → STOP.
   - Done when: pick, skip (not menu), or STOP.

4. **Specialists** — `Read` 1–2 kind files for the task (keyword or gated option).
   - Done when: files in context or none needed.

5. **Execute via companions** — Follow **fable** for this mode (triviality, Evidence, Act, Verify, Report). Karpathy before product edits. Senior proof before claiming done. Do not invent a second loop in this file. Do not start spec-to-pr. Commit/push only if the user asked.
   - Done when: fable's Done for that shape is met.

## Rules

- Specialists after mode/gate, never during a blind scan.
- No spec ceremony for vibe implement. Plan mode does not mkdir `{us-dir}` unless the user asked for a workflow.
- Output language: match the user.
