# Prepare to PR — goal checklist

**Mandatory** before commit/push/create-PR. Agent **drives**; show board after each item and before shipping. Success: every required row ✅ or justified ⏭. Any ❌ → STOP (no push/PR).

## Board (print to user)

```markdown
### Prepare to PR
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Test coverage for modified code | ✅ / ❌ / ⏭ | … |
| 2 | Build (consumer verification) | ✅ / ❌ / ⏭ | … |
| 3 | Tests run | ✅ / ❌ / ⏭ | … |
| 4 | Security / leak scan | ✅ / ❌ / ⏭ | … |
| 5 | Consumer prepare / before-push steps | ✅ / ❌ / ⏭ | … |
| 6 | Board shown; ready to ship | ✅ / ❌ | … |
```

✅ = done/credited · ❌ = failed · ⏭ = N/A or proven earlier with evidence for the **current** tree.

## Consumer rules (always enforce)

Resolve from the **consumer project** only — never invent stack commands:

| Source | Use for |
|--------|---------|
| `config.json` → `verification.*` | Build / test / format |
| `config.json` → `rules.*` + [`AGENTS.md` External dependencies](../../../AGENTS.md#external-dependencies) | Guardrails / optional rule paths |
| `STACK.md` (`rules.stackFile`, default `{sharedDir}/STACK.md`) | Ship/verify notes |
| Consumer hubs + ship docs (see §5 scan list) | Prepare / before-push / before-publish steps |
| Session evidence | Orch Steps 6–7 — credit only if tree unchanged |

Prefer `bash .agents/skills/08-ship-pr/scripts/verify.sh` when it covers configured build+test; else `verification.*` via [`tools.md`](../shared/tools.md) (run config strings unchanged). Expand path tokens before Read/Grep/Shell ([`tools.md`](../shared/tools.md) § Path tokens).

## Checklist items

### 1. Test coverage for modified code
**When:** non-doc/non-config code change vs `baseBranch` (or uncommitted ship-scope diff).  
**Do:** map changed files → tests; in-scope gaps → ❌ + hand off to implement/fix.  
**⏭:** no code modified, or coverage proven this session with evidence.  
**Done when:** coverage assessed; gaps listed or none.

### 2. Build
**When:** no green build yet for the current tree.  
**Do:** `verification.backendBuild` (+ `frontendBuild` if frontend touched), or `bash .agents/skills/08-ship-pr/scripts/verify.sh` build portion.  
**⏭:** green build evidence for current tree.  
**Done when:** build green or ❌ with summarized output.

### 3. Tests
**When:** no green tests yet for the current tree.  
**Do:** `verification.backendTest` (+ `frontendTest` if frontend touched), or full `bash .agents/skills/08-ship-pr/scripts/verify.sh`.  
**⏭:** green evidence, or `skipTests` / orch `skipTesting` with waiver on board.  
**Done when:** tests green, waived with evidence, or ❌.

### 4. Security / leak scan
**When:** no security check yet on ship-scope diff (or full tree if scope unclear).  
**Do:** run [secrets-leak-review](../secrets-leak-review/SKILL.md); HIGH → ❌. Honor `config.json.rules.*` security paths when set.  
**⏭:** clean scan evidence for current ship-scope tree.  
**Done when:** scan clean, or HIGH findings listed and push blocked.

### 5. Consumer prepare / before-push steps (discover + wait)

**When:** always, before commit/push/create-PR.  
**Gate:** do **not** proceed to ship-pr Steps 4–5 until this row is ✅ or justified ⏭. Discovered steps are **blocking** unless the cited section marks them optional.

#### Discover (mandatory scan)

1. **Build the scan set** (skip missing paths; do not invent host-private folders):
   - Repo-root `AGENTS.md` (consumer or upstream local hub)
   - `{sharedDir}/AGENTS.md`
   - Every existing path listed under `config.json` → `rules.*`
   - `rules.stackFile` / `STACK.md`
   - `CONTRIBUTING.md`, `RELEASE.md`, `PUBLISH.md` at repo root when present
   - Any other **consumer-owned** markdown the hubs above link as ship/release/prepare guidance
2. **Grep / Read** those files for sections whose headings or lead-in match (case-insensitive), including near-synonyms:
   - `prepare`, `prepare-to-ship`, `prepare to PR`, `prepare to ship`
   - `before push`, `before publish`, `before deliver`, `before delivery`, `before shipping`, `before merge`
   - `ship`, `release`, `publish`, `deliver` when the section lists **agent obligations** before push/PR
   - `local project rule` / `local harness` when tied to shipping or PR creation
3. **List hits** in board evidence for row 5 (file + heading + one-line obligation). Zero hits → ⏭ with `no prepare/before-push steps found in scanned sources` and list what was scanned.

#### Wait / execute

1. For each discovered required step: run it (or credit with evidence for the **current** tree).
2. Re-show the board after the set completes. Incomplete or failed → ❌ and **STOP** (no commit/push/PR).
3. Do not re-ask the user to invent steps; only enforce what local hubs/rules already document.

**Done when:** all discovered required steps ✅, or ⏭ with scan evidence.

### 6. Show board & gate
Print full board. Commit/push/PR **only** if required rows ✅/⏭ and SCM resolves (`providers.scm` per [config-resolution.md](../shared/config-resolution.md)). Unresolved SCM or `shipAction: skip` → stop after board.  
**Done when:** user saw board; ship gate decision explicit.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "Orch tested — skip board" | Show board; credit with ⏭ + evidence. |
| "Docs-only — skip security" | Scan ship-scope; ⏭ only if no secret-bearing paths. |
| "CI will build/test" | Local build/tests required unless waived on board. |
| "No SCM — invent gh" | STOP; resolve `providers.scm` or skip ship. |
| "No consumer prepare — skip scan" | Always scan hubs/rules; ⏭ only after an empty scan with sources listed. |
| "Local AGENTS bump/rule is optional" | If discovery found a before-push/ship obligation, it blocks until done. |
