---
id: null
slug: add-enable-dag-config
title: "Add enableDag configuration option for parallel execution control"
source: local
specDate: 2026-08-13
---

# Specification — Add enableDag configuration option for parallel execution control

## Description

Add a new `enableDag` key-value setting to `config.json` (under `defaults` or top-level configuration) with a boolean value (`true` or `false`), defaulting to `false`.

- When `enableDag: true`, the workflow orchestrator maintains the current behavior of breaking execution plans into multiple parallel tasks executed concurrently by subagents.
- When `enableDag: false` (default), the workflow orchestrator disables parallel task execution and executes tasks sequentially, dispatching subagents one by one in serial order.

## Acceptance Criteria

- AC1: `config.json` schema and default configuration include `enableDag` as a boolean option defaulting to `false`.
- AC2: When `enableDag` is set to `true`, orchestrator workflows break plans into parallel subagent tasks (existing DAG behavior).
- AC3: When `enableDag` is set to `false`, orchestrator workflows execute plan tasks sequentially, invoking subagents one by one in serial order.
- AC4: Legacy `config.json` files missing `enableDag` safely default to `false` (sequential execution).

## Notes

- Resolves `{specsDir}` from `config.json` (`.agents/specs/`).
- Hand-written / local spec of record draft created via `ws-write-spec`.
