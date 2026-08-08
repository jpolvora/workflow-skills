# Step 7 Testing Report — agents-skills-as-sot

**Date:** 2026-08-08T08:13:39Z  
**Mode:** autoMode · browser skipped (Approve without browser)  
**Spec:** `.agents/plans/agents-skills-as-sot/step-00-agents-skills-as-sot.spec.md`  
**Plan:** `.agents/plans/agents-skills-as-sot/step-02-agents-skills-as-sot.plan.refined.md`  
**Testing plan:** `.agents/plans/agents-skills-as-sot/step-07-agents-skills-as-sot.testing.plan.md`  
**Result:** **PASSED**

## Summary

| Area | Status | Evidence |
|------|--------|----------|
| Base verify / unit (`npm run test`) | PASS | Exit **0** (~17s wall) |
| Integrity (`npm run verify-integrity`) | PASS | Exit **0** — `OK: bin\skill-integrity.json matches tree (v0.0.119)` |
| Build | Skipped | No `backendBuild` |
| DB seeds | Skipped | N/A |
| API / integration | PASS (via suite) | Install dry-run Phases + quality-gates + memory formatting |
| UI / E2E / browser | Skipped | autoMode / no UI |
| Accessibility / contrast | Skipped | No UI forms/alerts |
| Feature AC (structural) | PASS | See checklist below |
| Harness narrative (dry) | Noted | Expect Install mode **upstream**, Skills scan root **`.agents/skills`**; full Phases 0–5c deferred to ship gate |
| Workflows simulation | Skipped | Orch unchanged |

**tests_passed:** true  
**testExitCode:** 0  
**integrityExitCode:** 0  
**elapsedSec:** 17

## Commands executed

### 1. `npm run test` → exit 0

```
> workflow-skills@0.0.119 test
> npm run tests
> workflow-skills@0.0.119 pretests
> npm pack
… pack includes .agents/skills/** (no src/skills)
…
✅ Success! Install, canonicity, self-overwrite, update+config preserve, packages, deps,
   non-interactive --yes, MEMORY isolation, uninstall, and integrity all passed.
------------------------------------------------------------
  Quality Gates — Integration Test Suite (T16)
… All quality-gates tests passed.
Running memory formatting test...
✅ Memory formatting test PASSED successfully!
TEST_EXIT=0
```

Notable install-suite signals for this SoT move:

- Packaged tree installs from `.agents/skills` (tarball notice lists `.agents/skills/ws-*`)
- Pipeline + provider skills present (**39** dirs)
- Integrity manifest / consumer post-verify OK
- Self-overwrite / config preserve / global+project scopes still green
- Quality-gates AC1–AC7 all ✅
- Memory formatting ✅

### 2. `npm run verify-integrity` → exit 0

```
> workflow-skills@0.0.119 verify-integrity
> node bin/generate-skill-integrity.js --check

OK: bin\skill-integrity.json matches tree (v0.0.119)
INTEGRITY_EXIT=0
```

## Structural / SoT evidence (this step)

| Check | Result |
|-------|--------|
| `src/` / `src/skills/` | Absent |
| `.agents/skills/ws-*` packages | **39** (38 with `SKILL.md` + `ws-shared` hub) |
| `scripts/sync-skills.js` | Absent |
| `package.json` scripts.`sync-skills` | Absent |
| `package.json` `files` | Includes `.agents/skills/`; excludes consumer hub names; no `src/skills/` |
| `bin/cli.js` | `packageSkillsDir = path.join(packageRoot, '.agents', 'skills')` |
| `bin/skill-integrity-lib.js` | `skillsDir = path.join(packageRoot, '.agents', 'skills')` (L233) |
| `bin/build-site.js` | Catalog root `.agents/skills` (L200) |
| `bin/install-rules.js` | Secondary marker `.agents/skills/ws-shared/skill-dependencies.json` (L93) |
| `git check-ignore` skill body | `ws-testing/SKILL.md` **not** ignored (tracked SoT) |
| `git check-ignore` hub config | `ws-shared/config.json` **ignored** (consumer-owned) |

## Feature-quality AC checklist

| AC | Outcome | Notes |
|----|---------|-------|
| AC1 Move SoT; `src` gone | Met | Structural + suite |
| AC2 Consumer hub non-published | Met | `files` exclusions + install preserve asserts |
| AC3 Tooling + integrity | Met | Paths + `verify-integrity` 0 |
| AC4 `files` + tests | Met | Pack + `npm run test` 0 |
| AC5 Hubs/docs SoT narrative | Met (prior Step 5) | Not re-diffed this step |
| AC6–7 Harness scan root / no dogfood-lag | Contract on disk (prior); full audit at ship | Dry note: upstream + `.agents/skills` |
| AC8 `ws-check-workflows` paths | Met (prior) | `{skillsRoot}` / `.agents/skills` |
| AC9 sync bridge removed | Met | File + script absent; suite asserts absence |
| AC10 Gitignore invert | Met | Skill bodies trackable; hub config ignored |
| AC11 Portable / en-us | Met (prior contract) | No new host coupling this step |
| AC12 DoD commands | Met | test 0 + integrity 0 |

## Defect threshold

Pass criteria met: `npm run test` exit 0, `npm run verify-integrity` exit 0, zero critical suite failures.

## Optional harness dry narrative

At package root after SoT move:

- **Install mode (expected):** `upstream` (package markers `bin/skill-dependencies.json` + `.agents/AGENTS.md` **and** ≥1 `.agents/skills/ws-*/SKILL.md`)
- **Skills scan root (expected):** `.agents/skills`
- Full `ws-check-harness` Phases 0–5c → 0 critical: **not re-executed in Step 7**; confirm at upstream ship prepare gate (AGENTS.md row 8)

## Files touched (this step)

- `.agents/plans/agents-skills-as-sot/step-07-agents-skills-as-sot.testing.plan.md` (created)
- `.agents/plans/agents-skills-as-sot/step-07-agents-skills-as-sot.testing.report.md` (created)

No product/code fixes applied (ws-testing rule: report only).

## Recommendation

**APPROVE** — proceed to Step 8 (`ws-ship-pr`). Reconfirm full harness audit in prepare checklist.
