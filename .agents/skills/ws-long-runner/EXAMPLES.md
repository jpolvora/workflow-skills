# `ws-long-runner` — Usage Examples

## 1. Blank-List Scan

```bash
/ws-long-runner
```

Scans `.agents/specs/**/*.spec.md`, prompts the user with a multi-select gate, creates `{plansDir}/ws-long-runner/lr-20260725T220000Z.state.md`, and runs selected specs sequentially.

## 2. Explicit Spec List

```bash
/ws-long-runner .agents/specs/13-runner.spec.md .agents/specs/14-editor.spec.md
```

Initializes run queue with specified spec paths and processes them sequentially.

## 3. Resume Existing Run

```bash
/ws-long-runner .agents/plans/ws-long-runner/lr-20260725T220000Z.state.md
```

Loads existing state file and resumes from the first pending or failed item without re-running shipped items.

## 4. Failure Recovery Gate

When a worker fails:
```text
Worker for '14-editor' failed.
Options:
1. Resume (Recommended) — Retry worker for 14-editor
2. Skip — Mark skipped and continue to next spec
3. Abort run — Pause execution and exit
```
