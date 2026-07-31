```markdown
# workflow-skills Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns used in the `workflow-skills` TypeScript repository. It covers file organization, code style, commit conventions, and testing approaches. By following these guidelines, contributors can maintain consistency and quality across the codebase.

## Coding Conventions

### File Naming
- Use **PascalCase** for all file names.
  - Example: `MyComponent.ts`, `UserService.ts`

### Import Style
- Use **relative imports** for referencing modules within the project.
  - Example:
    ```typescript
    import { UserService } from './UserService';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // UserService.ts
    export function getUser(id: string) { ... }
    export const USER_ROLE = 'admin';
    ```

### Commit Messages
- Follow **Conventional Commits** with the `feat` prefix for new features.
  - Example:
    ```
    feat: add user authentication module
    ```

## Workflows

_No explicit workflows detected in the repository._

## Testing Patterns

- Test files use the pattern `*.test.*` (e.g., `UserService.test.ts`).
- The testing framework is **unknown**, but tests are colocated with source files or in a similar structure.
- Example test file:
  ```typescript
  // UserService.test.ts
  import { getUser } from './UserService';

  describe('getUser', () => {
    it('returns user by id', () => {
      expect(getUser('123')).toEqual({ id: '123', name: 'Alice' });
    });
  });
  ```

## Commands
| Command | Purpose |
|---------|---------|
| /conventions | Show coding conventions and examples |
| /test-patterns | Show testing file patterns and examples |
```
