```markdown
# workflow-skills Development Patterns

> Auto-generated skill from repository analysis

## Overview
This repository demonstrates best practices for managing and synchronizing skill dependencies in JavaScript projects. It emphasizes clear coding conventions, structured commit messages, and repeatable workflows for maintaining dependency integrity. The codebase is framework-agnostic and focuses on maintainability and consistency across skill-related files.

## Coding Conventions

- **File Naming:**  
  Files use PascalCase.  
  *Example:*  
  ```
  SkillManager.js
  DependencySyncer.ts
  ```

- **Import Style:**  
  Always use relative imports.  
  *Example:*  
  ```javascript
  import { updateIntegrity } from './IntegrityUtils';
  ```

- **Export Style:**  
  Use named exports.  
  *Example:*  
  ```javascript
  export function syncDependencies() { ... }
  export const SKILL_VERSION = '1.0.0';
  ```

- **Commit Messages:**  
  Follow [Conventional Commits](https://www.conventionalcommits.org/) with prefixes like `feat`, `fix`, and `docs`.  
  *Example:*  
  ```
  feat: add support for binary skill dependency sync
  fix: correct path resolution in integrity check
  docs: update skill workflow instructions
  ```

## Workflows

### sync-skill-dependencies-and-integrity
**Trigger:** When updating or adding skill dependencies to keep shared and binary dependency files in sync.  
**Command:** `/sync-skill-deps`

1. **Edit** `.agents/skills/shared/skill-dependencies.json` to update the list of dependencies.
2. **Regenerate** `bin/skill-integrity.json` to reflect the updated dependencies. This ensures that the integrity digest matches the current dependency definitions.

*Example:*
```json
// .agents/skills/shared/skill-dependencies.json
{
  "dependencies": {
    "skillA": "^1.2.0",
    "skillB": "^3.4.5"
  }
}
```
After editing, run the sync command or associated script to regenerate the integrity file:
```bash
/sync-skill-deps
```
This will update `bin/skill-integrity.json` accordingly.

**Files Involved:**
- `.agents/skills/shared/skill-dependencies.json`
- `bin/skill-integrity.json`

**Frequency:** ~2x/month

## Testing Patterns

- **Test Files:**  
  Test files use the `*.test.ts` pattern.

- **Framework:**  
  The specific testing framework is not detected, but tests are likely written in TypeScript.

*Example:*
```typescript
// SkillManager.test.ts
import { syncDependencies } from './SkillManager';

test('syncDependencies updates integrity', () => {
  // ...test implementation
});
```

## Commands

| Command           | Purpose                                                                 |
|-------------------|-------------------------------------------------------------------------|
| /sync-skill-deps  | Synchronize skill dependencies and regenerate the integrity digest files |
```
