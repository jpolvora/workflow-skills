---
id: 95
slug: us-95
title: "fix(check-workflows): dependency closure audit fails in consumer repos (missing bin/skill-dependencies.json)"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/95"
specDate: 2026-07-22
---

# Specification — fix(check-workflows): dependency closure audit fails in consumer repos (missing bin/skill-dependencies.json)

**State:** open

## Description

## Description

When running \check-workflows\ (\python .agents/skills/check-workflows/scripts/check_workflows.py\) inside a consumer repository (installed via \
px github:jpolvora/workflow-skills\), \DEPS_JSON_PATH\ (\in/skill-dependencies.json\) does not exist because \in/\ is an upstream repo root folder that is not shipped to consumer projects.

Because \_load_dependencies()\ sets \self.deps_map = {}\ when \in/skill-dependencies.json\ is missing, \simulate_standard_workflow()\ and \simulate_lite_workflow()\ evaluate \dispatched_skills - set()\ and report 2 false-positive CRITICAL \Dependency Closure\ issues:

- \spec-to-pr dispatches skills not listed in dependencies['spec-to-pr']\
- \spec-to-pr-lite dispatches skills not listed in dependencies['spec-to-pr-lite']\

---

## Architectural Analysis & Solution Options

Rather than simply ignoring the check when \in/\ is missing, consumer repos would benefit from running real dependency closure validation to ensure all sub-skills dispatched by orchestrators are present on disk.

### Option A (Recommended): Ship \skill-dependencies.json\ in \.agents/skills/shared/\
- Move or copy \skill-dependencies.json\ into \.agents/skills/shared/skill-dependencies.json\.
- Include \shared/skill-dependencies.json\ as a managed file shipped during \install\ / \update\.
- Update \check_workflows.py\ path resolution order:
  1. Check \.agents/skills/shared/skill-dependencies.json\ (consumer install path)
  2. Fall back to \REPO_ROOT/bin/skill-dependencies.json\ (upstream dev path)
  3. If neither exists, guard the closure check to prevent false positives (\if DEPS_JSON_PATH.exists():\).

### Option B: Guard upstream-only path in \check_workflows.py\
- Keep \skill-dependencies.json\ in \in/\ upstream only.
- In \check_workflows.py\, explicitly guard the dependency closure audit: \if DEPS_JSON_PATH.exists():\ so consumer projects skip \in/skill-dependencies.json\ validation cleanly.

---

## Expected Behavior
- \python .agents/skills/check-workflows/scripts/check_workflows.py\ should return \✅ PASS\ (exit code 0) in consumer repos out-of-the-box.
- If Option A is implemented, consumer repos gain offline dependency closure verification for partial/custom skill installs.

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
