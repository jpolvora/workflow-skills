# Step 7 Testing Plan — agents-skills-as-sot

**Slug:** `agents-skills-as-sot`  
**Spec:** `.agents/plans/agents-skills-as-sot/step-00-agents-skills-as-sot.spec.md`  
**Plan:** `.agents/plans/agents-skills-as-sot/step-02-agents-skills-as-sot.plan.refined.md`  
**Mode:** autoMode · `skip-browser` (Approve without browser)  
**Stack:** `node-skills-package` (Node 22 / JS) — no DB, API host, or UI

## Scope

Validate the SoT move: skill packages live under `.agents/skills/ws-*`, packaging/integrity/site/tests resolve that tree, `src/skills` + `sync-skills` are gone, and install dry-runs still pass.

## Verification commands (from `config.json.verification`)

| Area | Command / action | Notes |
|------|------------------|-------|
| Unit / package | `npm run test` (`verification.backendTest`) | `pretests` → `npm pack`; then `test-install.js --local`, `test-quality-gates.js`, `test-memory-formatting.js` |
| Integrity | `npm run verify-integrity` | Must exit 0 against hashed `.agents/skills` (AC3 / AC12) |
| Build | N/A | No `backendBuild` / app build; catalog already bumped in implement step |
| DB seeds | Skip | `database.type: none` |
| API / integration | Covered by install suite | No `apiHost`; install + QG tests exercise CLI contracts |
| UI / E2E / browser | Skip (`skip-browser`) | No frontend |
| Accessibility / contrast | Skip | No UI forms/alerts |
| Feature AC checklist | Structural greps + suite asserts | Map AC1–AC12 to observable outcomes below |
| Harness narrative (optional dry) | Note Install mode + scan root | Expect upstream + Skills scan root `.agents/skills` (≥1 `ws-*/SKILL.md`); full Phases 0–5c at ship gate |
| Workflows simulation | ⏭ | Orch FSM unchanged; `ws-check-workflows` path discovery already retargeted (AC8) |

## Gaps vs changed files

Touched surfaces for this PR class: `bin/cli.js`, `bin/skill-integrity-lib.js`, `bin/build-site.js`, `bin/install-rules.js`, `package.json` `files`/scripts, `.gitignore`, hubs/docs, `.agents/skills/**`, `test/`, deleted `scripts/sync-skills.js` + `src/`. Covered by install/integrity/QG suites and structural checks — no separate unit project beyond `test/`.

## Target hosts / credentials / seeds

- Hosts: none (CLI local pack install into `test/`)  
- Credentials: none  
- DB seed / rollback: N/A  

## API contracts / RBAC / tenancy

N/A — no HTTP API or tenancy field. Installer CLI contracts verified by `test/test-install.js` (self-overwrite refuse, config preserve, integrity abort/force, global/project scopes).

## Feature-quality AC → observable outcomes

| AC | Observable check |
|----|------------------|
| AC1 | `src/` / `src/skills/` absent; 39 `ws-*` under `.agents/skills`; `packageSkillsDir` → `.agents/skills` |
| AC2 | `package.json` `files` exclusions for consumer hub; `config.json` gitignored; install preserves hub |
| AC3 | Tooling paths `.agents/skills`; `verify-integrity` exit 0 |
| AC4 | `files` ships `.agents/skills/`; `npm run test` exit 0 (no `src/skills` SoT fallback) |
| AC5 | Live hubs state SoT = `.agents/skills` (prior Step 5); not re-audited here beyond pack contents |
| AC6–AC7 | Structural: ≥1 `.agents/skills/ws-*/SKILL.md`; harness docs claim scan root `.agents/skills` (full harness at ship) |
| AC8 | `check_workflows.py` uses `{skillsRoot}` / `.agents/skills` (prior evidence) |
| AC9 | `scripts/sync-skills.js` absent; no `sync-skills` npm script |
| AC10 | Skill `SKILL.md` not gitignored; hub `config.json` ignored |
| AC11 | Portable contract (no new absolute/host coupling in this step) |
| AC12 | `verify-integrity` + `npm run test` exit 0 this step |

## Defect thresholds (pass / fail)

| Metric | Pass | Fail |
|--------|------|------|
| `npm run test` | exit 0 | any non-zero / critical assertion |
| `npm run verify-integrity` | exit 0; OK matches tree | stale/mismatch |
| Critical install/QG asserts | all ✅ | any ❌ |
| Browser | skipped (autoMode) | N/A |

**Overall pass:** both commands exit 0 and no critical suite failures.

## Out of scope

- Code fixes (report gaps → `ws-implement-tasks` fix mode)  
- Full `ws-check-harness` Phases 0–5c execution (ship gate / optional note only)  
- Browser automation  
- Rewriting archived plan history that mentions `src/skills`
