---
title: "Feature: Long-runner orchestrator for batch spec execution (`long-runner`)"
slug: us-125
source: github
sourceUrl: https://github.com/jpolvora/workflow-skills/issues/125
version: 1.0.0
status: draft
---

# Feature: Long-runner orchestrator for batch spec execution (`ws-long-runner`)

## Context

Currently, `spec-to-pr` handles delivery of a single spec (or single issue converted to spec). When a project has a queue of specs (e.g. in `.agents/specs/` or an explicit list), developers must trigger `/spec-to-pr` manually for each spec after the prior PR merges.

We need a **`ws-long-runner`** orchestrator skill that reads a queue of specs, dispatches a sequential `spec-to-pr` worker for each, handles probes (skip already-implemented items), manages a unified run state file, and pauses on failure with a clear recovery gate.

## User Story

As a developer maintaining multiple progressive feature specs,
I want to launch `/ws-long-runner` to process a queue of specs sequentially end-to-end,
So that each feature is automatically specified, implemented, verified, reviewed, tested, and shipped to PR with zero manual intervention between specs unless an error occurs.

## Functional Requirements

### FR-1: Skill structure & definitions
- Create `.agents/skills/ws-long-runner/SKILL.md` with frontmatter `name: ws-long-runner`, `version: 0.0.1`, and detailed prompt/trigger contracts (`/ws-long-runner`).
- Include `PROTOCOL.md` defining the 6-phase master loop (Entry/Resume, Scan/Init, Select next, Dispatch worker, Record outcome, Advance/Report).
- Include `STATE.md` defining the run state schema under `{plansDir}/ws-long-runner/lr-YYYYMMDDTHHMMSSZ.state.md`, already-implemented probe, blank-list scan, and parseable `step-output` contract.
- Include `EXAMPLES.md` covering blank-list scan, explicit list, resume, and failure pause options.
- Include `evals/evals.json` containing test evaluation scenarios.

### FR-2: Package registration & index integration
- Register `ws-long-runner` under `packages.workflows.skills` in `bin/skill-dependencies.json`.
- Add `ws-long-runner` to skill catalogs and routing tables in `AGENTS.md`, `.agents/AGENTS.md`, and `.agents/skills/shared/AGENTS.md`.

### FR-3: Harness & integrity validation
- Ensure `check-harness` passes with 0 critical findings.
- Re-generate site catalog (`node bin/build-site.js`) and checksums (`npm run generate-integrity`).
- Ensure `npm run verify-integrity` exits 0 and test suites pass (`npm run tests -- --local`).

## Non-Functional Requirements
- **Portability:** Use token `{plansDir}` expanded from `config.json.plans.dir` (default `.agents/plans`). No hardcoded absolute or IDE-private paths.
- **Isolation:** Sequential execution; master dispatches one `spec-to-pr` worker at a time.
- **Language:** English (en-us) for all skill instructions and docs.

## Verification Plan

### Automated Verification
- Run `node bin/build-site.js`
- Run `npm run generate-integrity`
- Run `npm run verify-integrity`
- Run `python .agents/skills/check-workflows/scripts/check_workflows.py` (or `check-harness`)
- Run `npm run tests -- --local`
