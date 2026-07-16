# promote-shared-skills — Execution Plan (Parallel)

**Mode:** parallel — plan exceeds `dagThresholds`.
**Reason:** 6 implementation steps, ~45+ expected files, 4 layers (skills / cli / docs / tests).
**Plan input:** `step-02-promote-shared-skills.plan.refined.md`
**DAG:** `step-03-promote-shared-skills.exec.dag.json`
**Concurrency:** ≤2 tasks per level; file sets non-overlapping within a level.
**Target model:** coder (Step 5 build)

---

## Size detection

| Metric | Value | Threshold | Result |
|--------|-------|-----------|--------|
| Steps (§3) | 6 | ≤ 3 | exceed |
| Expected files | ~45+ | ≤ 6 | exceed |
| Layers | 4 | ≤ 2 | exceed |

**execMode:** `parallel`

---

## Level map

```
L0  T1              skill-dependencies.json + git mv 7 skills + shared hub prune
L1  T2 ‖ T3         bin/cli.js packages/migration ‖ harness indexes + link sweep
L2  T4 ‖ T5         build-site + docs ‖ test-install.js expansion
L3  T6              README + install-skills.sh banner
```

---

## Tasks (summary)

| ID | Title | dependsOn | Key ACs |
|----|-------|-----------|---------|
| T1 | Dependency map + promote seven skills | — | AC1, AC2, AC8 |
| T2 | Installer CLI packages + migration | T1 | AC3–AC7, AC9–AC11 |
| T3 | Harness indexes + link sweep | T1 | AC12, AC15 |
| T4 | Site catalog + Installation packages | T1, T3 | AC13 |
| T5 | Install test suite expansion | T1, T2 | AC14 |
| T6 | README + install-skills.sh + harness | T4, T5 | AC15 |

---

## Post-implementation verification

1. `rg 'shared/(caveman|gabarito|karpathy|spec-format|goal-loop|self-learning|changelog)' .agents/skills` → zero (except migration comments)
2. `npm run tests -- --local`
3. `node bin/build-site.js`
4. `check-harness` Phases 0–5c before merge to `main`
