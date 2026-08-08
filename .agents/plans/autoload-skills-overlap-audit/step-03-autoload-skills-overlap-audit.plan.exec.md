---
slug: autoload-skills-overlap-audit
execMode: sequential
title: "Overlap audit and simplification of autoload utility skills"
---

# Execution Plan — autoload-skills-overlap-audit

`execMode: sequential` — steps A–E are strictly ordered (audit before edits before harness). Metrics exceed DAG thresholds but dependencies force serial execution.

## Tasks

| id | dependsOn | label | files |
|----|-----------|-------|-------|
| T1 | — | Evidence harvest — read five SKILL.md + hub/autoload | `.agents/skills/ws-senior-developer/SKILL.md`, `ws-self-learning`, `ws-changelog`, `ws-fable-method`, `ws-tdah`, `ws-shared/AGENTS.md`, `ws-shared/autoload.md` |
| T2 | T1 | Write overlap-matrix.md + recommendations.md | `{us-dir}/overlap-matrix.md`, `{us-dir}/recommendations.md` |
| T3 | T2 | Apply Thin/cross-link edits (auto-accepted) | five skills ± hub ± autoload |
| T4 | T3 | Harness 5b/5c + AC8 proof in recommendations | harness report notes in recommendations.md |
| T5 | T4 | Delivery prep notes for Step 8 fullMode PR | (no extra files) |
