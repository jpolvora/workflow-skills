```markdown
# workflow-skills Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill introduces the core development patterns and workflows used in the `workflow-skills` JavaScript repository. It covers coding conventions, documentation workflows, and testing patterns, providing practical examples and command suggestions to streamline contribution and maintenance.

## Coding Conventions

**File Naming**
- Use kebab-case for all file names.
  - Example: `user-profile.js`, `specs/feature-123/step-00-feature-123.issue.json`

**Import Style**
- Use absolute imports (relative to the project root).
  - Example:
    ```javascript
    import { fetchData } from 'utils/network';
    ```

**Export Style**
- Use named exports.
  - Example:
    ```javascript
    // In utils/math.js
    export function add(a, b) { return a + b; }
    export function subtract(a, b) { return a - b; }

    // Usage
    import { add } from 'utils/math';
    ```

**Commit Messages**
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard.
- Common prefixes: `docs`, `fix`, `chore`
  - Example: `fix: correct typo in user validation`

## Workflows

### spec-documentation-workflow
**Trigger:** When you need to formally document the lifecycle of a user story or issue, including planning, review, testing, and results.  
**Command:** `/document-spec`

**Step-by-step Instructions:**

1. **Create or Update Issue and Specification Files**
   - Add or update the following in `specs/<issue-id>/`:
     - `step-00-<issue-id>.issue.json` (issue metadata)
     - `step-00-<issue-id>.spec.md` (specification markdown)

2. **Add or Update Planning Artifacts**
   - `step-01-<issue-id>.plan.md` (planning document)
   - `step-05-<issue-id>.plan.report.md` (plan report)

3. **Add or Update Review, Testing, and Result Artifacts**
   - `step-06-<issue-id>.review.md` (review notes)
   - `step-07-<issue-id>.testing.report.md` (testing report)
   - `step-08-<issue-id>.result.md` (result summary)
   - Optionally, add state snapshots: `<issue-id>-<timestamp>.state.md`

4. **Commit All Related Documentation Files**
   - Use a descriptive commit message, e.g.:
     ```
     docs: update spec and planning docs for issue-123
     ```

**Example Directory Structure:**
```
specs/issue-123/
  step-00-issue-123.issue.json
  step-00-issue-123.spec.md
  step-01-issue-123.plan.md
  step-05-issue-123.plan.report.md
  step-06-issue-123.review.md
  step-07-issue-123.testing.report.md
  step-08-issue-123.result.md
  issue-123-20240601T120000.state.md
```

## Testing Patterns

- **Test File Naming:**  
  Test files follow the `*.test.*` pattern (e.g., `math.test.js`).
- **Testing Framework:**  
  Not explicitly detected—refer to project documentation or existing test files for guidance.
- **Example Test File:**
  ```javascript
  // math.test.js
  import { add } from 'utils/math';

  test('add returns correct sum', () => {
    expect(add(2, 3)).toBe(5);
  });
  ```

## Commands

| Command         | Purpose                                                        |
|-----------------|----------------------------------------------------------------|
| /document-spec  | Start or update the specification documentation workflow       |
```
