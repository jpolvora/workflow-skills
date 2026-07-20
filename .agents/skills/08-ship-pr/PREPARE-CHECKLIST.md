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
| 5 | Consumer prepare-to-ship steps | ✅ / ❌ / ⏭ | … |
| 6 | Board shown; ready to ship | ✅ / ❌ | … |
```

✅ = done/credited · ❌ = failed · ⏭ = N/A or proven earlier with evidence for the **current** tree.

## Consumer rules (always enforce)

Resolve from the **consumer project** only — never invent stack commands:

| Source | Use for |
|--------|---------|
| `config.json` → `verification.*` | Build / test / format |
| `config.json` → `rules.*` + [`AGENTS.md` External dependencies](../../../AGENTS.md#external-dependencies) | Guardrails / optional rule paths |
| `STACK.md` (`rules.stackFile`, default `.agents/skills/shared/STACK.md`) | Ship/verify notes |
| Consumer `AGENTS.md`, `CONTRIBUTING.md`, ship/release docs | Prepare-to-ship steps |
| Session evidence | Orch Steps 6–7 — credit only if tree unchanged |

Prefer `scripts/verify.sh` when it covers configured build+test; else `verification.*` via [`tools.md`](../shared/tools.md).

## Checklist items

### 1. Test coverage for modified code
**When:** non-doc/non-config code change vs `baseBranch` (or uncommitted ship-scope diff).  
**Do:** map changed files → tests; in-scope gaps → ❌ + hand off to implement/fix.  
**⏭:** no code modified, or coverage proven this session with evidence.  
**Done when:** coverage assessed; gaps listed or none.

### 2. Build
**When:** no green build yet for the current tree.  
**Do:** `verification.backendBuild` (+ `frontendBuild` if frontend touched), or `scripts/verify.sh` build portion.  
**⏭:** green build evidence for current tree.  
**Done when:** build green or ❌ with summarized output.

### 3. Tests
**When:** no green tests yet for the current tree.  
**Do:** `verification.backendTest` (+ `frontendTest` if frontend touched), or full `scripts/verify.sh`.  
**⏭:** green evidence, or `skipTests` / orch `skipTesting` with waiver on board.  
**Done when:** tests green, waived with evidence, or ❌.

### 4. Security / leak scan
**When:** no security check yet on ship-scope diff (or full tree if scope unclear).  
**Do:** run [secrets-leak-review](../secrets-leak-review/SKILL.md); HIGH → ❌. Honor `config.json.rules.*` security paths when set.  
**⏭:** clean scan evidence for current ship-scope tree.  
**Done when:** scan clean, or HIGH findings listed and push blocked.

### 5. Consumer prepare-to-ship steps
**When:** always, before commit/push.  
**Do:** follow consumer prepare/ship steps from sources table; N/A → ⏭ + reason.  
**Done when:** applicable steps completed or justified ⏭.

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
