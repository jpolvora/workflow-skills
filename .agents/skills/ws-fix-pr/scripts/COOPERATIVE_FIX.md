# Cooperative Fix Contract (Auto-Fix ↔ fix-pr)

**Normative shared document** between:

| Runtime | Where it lives | Mode |
|---------|-----------|------|
| **Auto-Fix CI** | `AUTO_FIX.md` + `src/orchestrator/autofix-runner.ts` | `--auto-fix` / `auto-fix.yml` |
| **fix-pr IDE** | `SKILL.md` | Manual invocation `/fix-pr` |

These runtimes are **independent** (no code import or coupling). This contract aligns **gates**, **response format**, and **order of operations** for cross-reading PR threads.

---

## Principles (Karpathy + AGENTS.md)

1. **Think before coding** — understand root cause before editing.
2. **Simplicity first** — minimal code that resolves the issue; no adjacent refactoring.
3. **Surgical, class-wide** — touch only what the defect requires, but fix the **defect class**, not just the anchored `file:line`. Do not stop at the first reported instance.
4. **Tests when material** — run `npm test` (or stack equivalent) before committing when the fix touches executable logic.

## Proactive discovery (mandatory — extends sibling sweep)

After validating a thread (score 6–10 or equivalent), **name the defect class in one line** (example: "gate claims JSON Schema validation but never reads the schema file"). Then run **proactive discovery** across every source below before editing. This extends the sibling occurrence sweep; it does not replace validate → score → user/goal gate.

### Discovery order (mandatory)

| Step | Source | What to do |
|------|--------|------------|
| 1 | **Code** | Repo-wide grep / structural search for the same pattern (identifiers, schema shapes, copied helpers, false-green claims). Include every path the thread already named. |
| 2 | **Memory** | Consult via [`tools.md`](../../ws-shared/tools.md) **`read-memory`** / [`ws-self-learning`](../../ws-self-learning/SKILL.md) Pre-work for the defect class and touched paths — **same evidence class as code**. When `enableSpecMemoIntegration`: vault MCP/CLI `bootstrap`/`search`. When `enableMemoryFiles`: `{sharedDir}/MEMORY.md` + `memory/*` / `--match-paths`. Dual → vault first, then local. Reuse known `INSTEAD DO` solutions. Per-backend absence or flag-off is **consult-skipped, not fatal** — record `memory-files: consult-skipped` and/or `spec-memo: consult-skipped` in `sourcesConsulted` and continue. |
| 3 | **Context** | Other **open** threads on the same PR that share the class; prior `{reviewsDir}/PR-<id>-round-*.md` findings when present; `check-pr-status` failed-log snippets for the same pattern; thread-body "similar occurrence" notes. **Missing prior round reports is advisory, not a failure.** |

Discovery findings that are the **same class** become candidate fixes in this round (not deferred to "hope CI finds them").

### Size / surgical gate

| Outcome | When |
|---------|------|
| **Fix now** | Same-class hit is local and surgical (same correction shape as the validated anchor; typically few files / small LOC; no new abstraction or cross-layer redesign) |
| **Skip with reason** | Hit requires a large refactor, unrelated feature work, ambiguous ownership, or would expand the PR beyond the review scope — record `path + reason` under `proactiveSkipped`; do **not** mark the class "fully cleared" |

Do not invent drive-by cleanups. Prefer fixing many small siblings over one speculative redesign.

### Sweep actions (sibling sweep baseline — keep)

| Sweep | Do |
|-------|----|
| **Keywords** | Grep identifiers, log strings, untyped schema shapes, copied helpers, and sibling paths named in the thread |
| **Fix** | Apply the same correction to every in-scope hit in this round |
| **Exempt** | Leave a hit unfixed only with `path + reason` on the plan-gate and in the resolution comment |
| **Report** | List proactive report fields (below) plus legacy `siblingsFixed` / `siblingsSkipped` in the resolution body |

Do not close a thread whose description listed extra paths until those paths are fixed or explicitly exempted. Reviewer "similar occurrence" notes are extra search seeds, not a cap. **Do not resolve** after fixing only the anchored `file:line` when same-class surgical hits remain unfixed without a recorded skip.

### Report fields (plan-gate + resolution + Auto-Fix explanation)

For each resolved blocking thread, record:

| Field | Content |
|-------|---------|
| `defectClass` | One-line class name |
| `sourcesConsulted` | Which sources were actually searched (`code`, `memory-files`, `spec-memo`, `context`, `patterns` — use `consult-skipped` per enabled-or-attempted backend that was unavailable; legacy token `memory` still means the routed `read-memory` consult) |
| `proactiveFixed` | Paths fixed beyond the anchor |
| `proactiveSkipped` | `path + reason` for each exempted same-class hit |

Resolve is allowed only after the proactive pass completes (or every discovery source is explicitly skipped with reason, e.g. dry-run analysis-only).

Legacy phrasing: `siblingsFixed` / `siblingsSkipped` remain valid aliases in resolution bodies where the cooperative contract already used them; map them to `proactiveFixed` / `proactiveSkipped` when writing plan-gate files.

Always run these class greps even when the thread named one file:

| Defect class | Search |
|--------------|--------|
| Schema claim without loading the file | `Validated` / `against` `schema.json` vs actual `readFile`/`loadJsonSchema` of that path |
| Untyped arrays | `"type": "array"` with no `"items"` under `*.schema.json` |
| Untyped object items | `"items": { "type": "object" }` with no `properties` |
| Copied AC counters | `acTotal` / `acImplemented` writers outside `ac_counts.cjs` |
| Legacy dispatch key | `dispatched:` on `stepDispatches` vs writer `dispatchedAt` |

Aligns with [`ws-implement-tasks`](../../ws-implement-tasks/SKILL.md) Fix the Entire Defect Class.

---

## Thread Scope

| Runtime | Scope |
|---------|--------|
| **Auto-Fix CI** | **All** open review threads with file+line. Analyzes the full description of each. |
| **fix-pr IDE** | **All** open review threads in the PR |

Do not close a thread without a corresponding fix listed explicitly (`resolvedThreads` in Auto-Fix).

---

## Order of Operations (fix-pr IDE)

Follow `SKILL.md` steps 1–5 (outer preflight → gate-only `fixPrPlan` → validated `fixPrExec` → verify/learn/resolve/push). Use this file for proactive discovery, defect-class sweeps, and resolution report fields — not as a competing outer sequence.

```
0. Outer preflight: sync branch, refuse dirty worktree, `validate-auth`
1. fixPrPlan: list-threads + check-pr-status; score threads; write complete plan-gate.md only
2. Handoff validation: batchId/prId/headSha/activeThreadIds must match HEAD
3. fixPrExec: proactive discovery (below) → surgical fixes → verification
4. Provider resolve-thread with <!-- resolution-reply --> and --model {currentModel}
5. Commit + push (unless dry-run)
```

GitHub close recipe (after fixes land):  
`node …/resolve_thread.cjs {THREAD_ID} "{note}" --model {currentModel}`  
(Azure: provider `resolve-thread --model` equivalent.)

If verify or resolve fails: **do not push**. Local commit preserved for manual inspection.

## Order of Operations (Auto-Fix CI)

```
1. Fetch open threads (file+line)
2. Deeply analyze each description; name the defect class
2b. Proactive discovery across **all open-thread files plus paths named in those descriptions** (code + `read-memory` backends + context + patterns when present; see Proactive discovery section)
3. Apply surgical fixes for the class (anchored instance + proactive hits per size gate)
4. git add + local commit (`fix(#N): auto-fix issues from review threads [...])
5. Execute validation build (`npm test` / `npm run build` or `AGENTIC_CODE_REVIEWERS_AUTO_FIX_BUILD_COMMAND`; failure = exit ≠ 0)
6. Close each resolved thread with a detailed comment (root cause + what changed)
7. git push — only if build and attempted resolutions succeed
8. Post detailed summary comment on PR (changed files, resolved threads with links, `<!-- auto-fix-summary -->`)
```

If step 5 or 6 fails: **do not push**. Local commit preserved for manual inspection.

**Sequential Dual-Engine (CI):** if a previous engine resolved threads but the push failed, the next engine attempts a **recovery push** of the pending local commit.

---

## Thread Response

All resolutions include the canonical marker:

```
<!-- resolution-reply -->
```

Body: **detailed explanation** from the agent (problem, root cause, change, why it resolves). Auto-Fix prefixes with `botTag` in the API.

---

## Structured Format (Auto-Fix Subagent)

JSON (see `AUTO_FIX.md`):

- `replacements[]` — modified intervals in the file.
- `resolvedThreads[]` — `{ threadId, explanation }` per closed thread.

---

## Intra-Review Context

| Field | Usage |
|-------|-----|
| `threadId` | API resolution |
| `filePath` | Anchored file |
| `lineNumber` | Review line |
| `description` | Full comment text (deep analysis) |
| `summary` | Short summary for reviewer tables |

---

## GitHub Token

`AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` → `GITHUB_TOKEN` → `GH_TOKEN`

PAT recommended for `resolveReviewThread`.
