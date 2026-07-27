```markdown
# workflow-skills Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and workflows used in the `workflow-skills` repository. The codebase is written in JavaScript (with some TypeScript for tests), and focuses on modular skill development, structured planning, and rigorous documentation. It uses conventional commit messages, enforces consistent code style, and supports collaborative workflows for adding, updating, and reviewing skills and features.

## Coding Conventions

- **File Naming:**  
  Use kebab-case for all file and directory names.
  ```
  good-example: add-skill-helper.js
  badExample: AddSkillHelper.js
  ```

- **Import Style:**  
  Use absolute imports.
  ```js
  import { addSkill } from 'utils/skill-manager';
  ```

- **Export Style:**  
  Use named exports.
  ```js
  // In add-skill-helper.js
  export function addSkill(...) { ... }
  ```

- **Commit Messages:**  
  Follow the Conventional Commits standard.  
  Prefixes: `feat`, `docs`
  ```
  feat: add support for skill evaluation configs
  docs: update AGENTS.md with new workflow steps
  ```

## Workflows

### add-or-update-skill
**Trigger:** When introducing a new skill or updating an existing skill's logic, documentation, or evaluation.  
**Command:** `/add-skill`

1. Create or update `SKILL.md` in the skill's directory:
   ```
   .agents/skills/<skill-name>/SKILL.md
   ```
2. Update or add evaluation configs:
   ```
   .agents/skills/<skill-name>/evals/evals.json
   ```
3. Optionally add or update scripts:
   ```
   .agents/skills/<skill-name>/scripts/*.py
   ```
4. Update shared skill registry or dependencies if needed.

**Example:**
```bash
# Add a new skill
/add-skill my-new-skill
```

---

### plan-and-execute-feature
**Trigger:** When delivering a new feature or user story using the agents/plans or agents/specs workflow.  
**Command:** `/plan-feature`

1. Create issue and spec files:
   ```
   .agents/plans/<feature>/step-00-<feature>.issue.json
   .agents/plans/<feature>/step-00-<feature>.spec.md
   ```
2. Write plan files:
   ```
   .agents/plans/<feature>/step-01-<feature>.plan.md
   .agents/plans/<feature>/step-*.plan.refined.md
   ```
3. Add execution and report files:
   ```
   .agents/plans/<feature>/step-*.exec.dag.json
   .agents/plans/<feature>/step-*.plan.exec.md
   .agents/plans/<feature>/step-*.plan.report.md
   .agents/plans/<feature>/step-*.testing.report.md
   ```
4. Add review and result files:
   ```
   .agents/plans/<feature>/step-*.review.md
   .agents/plans/<feature>/step-*.result.md
   ```
5. Update state:
   ```
   .agents/plans/<feature>/*.state.md
   ```

**Example:**
```bash
# Start a new feature plan
/plan-feature user-authentication
```

---

### update-shared-hub-or-config
**Trigger:** When reorganizing the shared hub, updating config schemas, or changing default behaviors for skills.  
**Command:** `/update-shared-hub`

1. Rename or move shared hub directories:
   ```
   .agents/skills/ws-shared/*
   ```
2. Update config files and schemas:
   ```
   .agents/skills/ws-shared/config*.json*
   ```
3. Update documentation:
   ```
   .agents/skills/ws-shared/AGENTS.md
   .agents/skills/ws-shared/setup.md
   .agents/skills/ws-shared/gates.md
   ```
4. Propagate path and config changes across skills and installer scripts:
   ```
   bin/install-rules.js
   bin/skill-integrity.json
   ```

---

### document-and-review-feature
**Trigger:** When documenting a new hub/skill behavior or updating review guidance.  
**Command:** `/doc-feature`

1. Update AGENTS.md in root and/or shared directories:
   ```
   AGENTS.md
   .agents/AGENTS.md
   .agents/skills/ws-shared/AGENTS.md
   ```
2. Update other documentation files:
   ```
   .agents/skills/ws-shared/setup.md
   .agents/skills/ws-check-harness/PHASES.md
   ```
3. Update review or integrity check files as needed:
   ```
   bin/skill-integrity.json
   ```

---

## Testing Patterns

- **Test Files:**  
  Tests are written in TypeScript and follow the `*.test.ts` naming pattern.
  ```
  example: add-skill-helper.test.ts
  ```
- **Testing Framework:**  
  Not explicitly specified; check test files for framework usage.

- **Example Test File:**
  ```ts
  import { addSkill } from 'utils/skill-manager';

  describe('addSkill', () => {
    it('should add a new skill', () => {
      // test implementation
    });
  });
  ```

## Commands

| Command           | Purpose                                                      |
|-------------------|--------------------------------------------------------------|
| /add-skill        | Add or update a skill, including docs and evaluation configs |
| /plan-feature     | Plan and execute a new feature or user story                 |
| /update-shared-hub| Update shared hub structure or config schemas                |
| /doc-feature      | Document and review features or changes                      |
```
