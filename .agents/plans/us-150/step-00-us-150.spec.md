---
id: 150
slug: us-150
title: "Add optional ws-senior-developer engineering delivery gate"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/150"
labels: [enhancement]
specDate: 2026-07-26
---

# Specification — Add optional ws-senior-developer engineering delivery gate

**State:** open
**Labels:** enhancement

## Description

Create an optional, installable `ws-senior-developer` skill that gives consumer repositories concise, portable engineering-delivery guardrails. It must provide a maintained upstream implementation for the optional `rules.seniorDeveloper` dependency already resolved by the shared hub and used for code-review proof.

For non-trivial work, the skill must direct agents to inspect project context, architecture constraints, consumer rules, and relevant anti-regression memory; use a plan-first default for multi-file or multi-modification free-text requests; prefer the project's installed workflow and specifications; and report evidence and unresolved blockers. It must preserve low-friction handling for trivial or single-file changes, and honor explicit implementation requests and named workflow commands.

Before branch or PR delivery, it must require focused review, configured verification (tests, build, and format when configured), configured secrets checks, and relevant documentation or spec-index updates. Consumer-root `AGENTS.md` remains the portable source of consumer policy: the skill operationalizes that policy without copying it, inventing consumer policy, or editing managed skills in consumer repositories.

## Acceptance Criteria

- AC1: The package contains an installable `ws-senior-developer` skill whose frontmatter declares and justifies its invocation mode, whose scope is concise and portable, and whose body has checkable completion criteria.
- AC2: Before drafting the new skill or scripts, implementation follows `ws-write-a-skill`: consult shared MEMORY, decide invocation behavior, use progressive disclosure, use explicit script launchers if scripts are earned, and preserve LF for any shell files.
- AC3: The skill's pre-implementation gate requires inspection of project context, consumer rules, architecture constraints, and relevant MEMORY; requires a confirmed plan for multi-file or multi-modification free-text work; and routes applicable work to installed workflow, specification, and spec-sync capabilities.
- AC4: The skill explicitly exempts trivial or single-file work from unnecessary ceremony while honoring explicit implementation requests and named workflow commands.
- AC5: The pre-ship gate requires focused review; configured tests, build, and format commands when present; configured secrets checks; relevant documentation and spec-index updates; and evidence or unresolved blockers in the completion report.
- AC6: The shared dependency resolution for `rules.seniorDeveloper` resolves the shipped skill when configured, and all code-review-proof consumers use its canonical checklist without duplicating it.
- AC7: Consumer activation is optional and documented through the installer/configuration and/or a root-AGENTS pointer strategy; it is evaluated against context load and existing always-on skills without imposing automatic autoload.
- AC8: The implementation preserves consumer-root `AGENTS.md` as the single source of consumer policy and does not duplicate consumer-specific policies or silently edit managed skill files in consumer repositories.
- AC9: Installer and dependency integration makes the skill available in the intended package selection, updates the dependency graph and consumer fixture expectations, and proves both package installation and dependency closure.
- AC10: All changed installable content has regenerated and verified integrity digests, and harness checks confirm there are no critical portability, routing, or dependency findings.
- AC11: Human-facing and agent-facing documentation, catalog/site output, and both hub indexes accurately describe the optional skill, installation/activation behavior, and `rules.seniorDeveloper` integration.
- AC12: Release preparation performs the required package version bump once, synchronizes the site footer and test tarball dependency version, runs package/install tests and harness verification, and leaves no documentation conflict markers.
- AC13: Skill evals cover multi-file free-text work, trivial fixes, explicit implementation commands, and a ship/PR handoff; each scenario asserts the intended gate behavior and evidence expectations.

## Notes

- Source snapshot: `step-00-us-150.issue.json`, fetched from GitHub issue #150.
- The GitHub issue is authoritative for scope; this refinement turns its integration and release implications into testable acceptance criteria.
- Downstream planning must choose the minimal supported installer/configuration mechanism for optional consumer activation and document the decision.
