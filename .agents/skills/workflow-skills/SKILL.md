```markdown
# workflow-skills Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `workflow-skills` JavaScript repository. It covers file naming, import/export styles, commit message patterns, and testing conventions. While no explicit workflows were detected, this guide provides a foundation for maintaining consistency and quality in contributions.

## Coding Conventions

### File Naming
- Use **PascalCase** for file names.
  - **Example:**  
    `MyComponent.js`  
    `WorkflowHandler.ts`

### Import Style
- Use **relative imports** for modules within the repository.
  - **Example:**
    ```js
    import { MyFunction } from './MyFunction';
    ```

### Export Style
- Use **named exports** rather than default exports.
  - **Example:**
    ```js
    // MyFunction.js
    export function MyFunction() { ... }
    ```

### Commit Message Patterns
- Commit messages are mostly freeform, with occasional `release` prefixes.
- Average commit message length is about 49 characters.
  - **Examples:**
    ```
    release: v1.2.0
    Fix bug in workflow execution logic
    ```

## Workflows

_No explicit workflows were detected in this repository. Below are general steps for contributing and maintaining code consistency._

### Adding a New Module
**Trigger:** When you need to add new functionality.
**Command:** `/add-module`

1. Create a new file using PascalCase (e.g., `NewFeature.js`).
2. Implement your functionality using named exports.
3. Import dependencies using relative paths.
4. Write corresponding test files as `NewFeature.test.ts`.
5. Commit your changes with a clear, concise message.

### Refactoring Existing Code
**Trigger:** When improving or restructuring code.
**Command:** `/refactor`

1. Identify the module to refactor.
2. Ensure file naming and import/export styles match conventions.
3. Update any related imports in other files.
4. Run all tests to verify no regressions.
5. Commit with a descriptive message.

## Testing Patterns

- Test files use the `*.test.ts` pattern.
- The testing framework is not explicitly specified.
- Place test files alongside or near the modules they test.
  - **Example:**
    ```
    MyFunction.js
    MyFunction.test.ts
    ```

## Commands
| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| /add-module    | Scaffold and add a new module                |
| /refactor      | Refactor existing code to match conventions  |
```
