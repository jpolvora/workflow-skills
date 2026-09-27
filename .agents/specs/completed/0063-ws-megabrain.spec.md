---
id: null
slug: ws-megabrain
title: "ws-megabrain: vibe-coding implementer with specialists"
source: local
specDate: 2026-09-04
---

# Specification — ws-megabrain: vibe-coding implementer with specialists

## Description

Ship skill `ws-megabrain` (`.agents/skills/ws-megabrain/SKILL.md`) as a vibe-coding **task implementer**. Specs are optional. On `/ws-megabrain` / `/megabrain` (or autoload on prompt-driven work) it binds `user-gate`, chooses mode (`implement` | `plan` | `research` | `menu` | `defer`), optionally scans dirty git / `{plansDir}` / `{specsDir}/index.PRD` for a what-next menu, **Read**s at most two specialist files, then **consumes** companion skills instead of duplicating their protocols:

| Need | Companion |
|------|-----------|
| Investigate / act / verify / report; plan-first; research (Question) | `ws-fable-method` |
| Surgical diffs | `ws-karpathy-guidelines` |
| Extras, ambiguity gates, Code review proof | `ws-senior-developer` |
| Reply shape | `ws-tdah` |
| MEMORY before mutate | `read-memory` |

Defer when `ws-spec-to-pr` / lite / `ws-spec-multi` owns the session. Do not start that FSM from this skill. Do not run `ws-spec-write` unless the user asked for a spec.

Specialists are Tier 2 (`references/*.md`). Router kinds: `product`, `development`, `review`, `delivery`. Domain kinds include `ddd`, `platform`, `performance`, `debug`, `reverse`, `api`, `data`, `qa`, `refactor`, `frontend`, `distributed`. Combine at most two files. `REVERSE.md` is in-tree archaeology only (no third-party product raids).

Consumer autoload: `ws-megabrain` is a shipped Always-applied row (`autoload.md` + `configure_autoload.py` `DEFAULT_ALWAYS_APPLIED`). Opt out: `stop ws-megabrain`.

## Acceptance Criteria

- AC1: `.agents/skills/ws-megabrain/SKILL.md` exists with YAML `name: ws-megabrain`, `version:` equal to package `packageVersion`, and invocation names covering `ws-megabrain` and `megabrain`. No `scripts/` directory is required.
- AC2: Directly under the `# ws-megabrain` heading the body contains `> When this skill is loaded, output "ws-megabrain loaded."` Specialist files under `references/` must **not** contain that loaded-banner directive.
- AC3: Every numbered step in `SKILL.md` has a checkable `Done when:` line.
- AC4: The skill binds `askQuestionTool` from `{sharedDir}/host-capabilities.json` or one probe per `ws-shared/tools.md`, then presents a what-next menu via `user-gate` when mode is `menu` (≥2 options, Recommended first); when the tool is `none` it uses a markdown list and yields the turn with no further tool calls in that response.
- AC5: `SKILL.md` and `references/*.md` contain no host IDE/agent product names and no `AskQuestion` / `ask_questions` vendor tool ids (portable `user-gate` / `askQuestionTool` only).
- AC6: Menu scan collects `git status --porcelain`, current branch, recent `git log`, unfinished `{plansDir}` state files, and `{specsDir}/index.PRD` when those paths exist; missing config uses default `.agents/plans` / `.agents/specs` and records `config-missing` without blocking. Scan does not `Read` `references/*.md`. Autoload with a clear task skips the menu.
- AC7: Ranking (menu) prefers unfinished in-flight work with dirty product files, always includes Stop, and names specialist kind ids plus `question` or `task`. Options do not name another `ws-*` skill as the executor (companions load after the gate).
- AC8: After mode/gate, the agent `Read`s at most 1–2 specialist files, then follows `ws-fable-method` for that shape. Product edits only inside fable Act. The skill body must not duplicate fable's 7-step table.
- AC9: Cancel / dismiss of the direction gate STOPs and does not infer a recommended yes, and does not load specialists.
- AC10: `autoMode` selects ranked option 1 with zero `user-gate` prompts, then still loads that option's specialists (cap 2) and runs fable.
- AC11: `ws-megabrain` is in `packages.workflows.skills` in both `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json`, with `dependencies.ws-megabrain` listing `ws-fable-method`, `ws-senior-developer`, `ws-karpathy-guidelines`, `ws-tdah`, `ws-self-learning`, and `ws-changelog`.
- AC12: Task-router rows exist in root `CATALOG.md` and `.agents/skills/ws-shared/CATALOG.md` for vibe-coding / what-next / megabrain intent.
- AC13: `ws-check-harness` Phase 0–5c still exits 0 after the skill and catalog edits (no host names, no duplicated normative blocks introduced in this skill).
- AC14: Authoring validation of this spec (`validate_spec.cjs --mode=authoring`) exits 0.
- AC15: `SKILL.md` contains a Router table (`product`, `development`, `review`, `delivery`) and a Domain table that includes `ddd`, `debug`, and `reverse`, each pointing at `references/{NAME}.md` on disk.
- AC16: `references/DEVELOPMENT.md` states persona Principal software architect, an align/harvest/inject/surgical pipeline, in-repo pattern reuse, and an explicit ban on reverse-engineering unrelated third-party products.
- AC17: `references/DDD.md` requires bounded context from existing paths/spec and ubiquitous language aligned to repo names; it is skippable for harness-only or cleanup tasks.
- AC18: Combine rule in `SKILL.md`: at most two specialist files; never Read the whole `references/` folder.
- AC19: `references/REVERSE.md` exists, is selected by kind `reverse`, reconstructs undocumented behavior in this working tree, and explicitly excludes cloning, decompiling, or copying unrelated third-party products, license cracking, and access-control bypass.
- AC20: `SKILL.md` instructs the agent to load `ws-fable-method`, `ws-karpathy-guidelines`, `ws-senior-developer`, and `ws-tdah` by relative `SKILL.md` path (or `read-memory` for MEMORY) and states `/ws-megabrain plan` and `/ws-megabrain research` map to fable Plan-First and Question.
- AC21: `{sharedDir}/autoload.md` Always-applied table includes `ws-megabrain`, and `configure_autoload.py` `DEFAULT_ALWAYS_APPLIED` includes that id. Opt-out phrase `stop ws-megabrain` is documented.

## Original Issue Context

Free-text (2026-09-04): create `ws-megabrain` inspired by a viral "Megabrain" agent prompt. Detect dirty/unfinished work, present a choose-one menu, specialist personas, reverse-engineering specialist (in-repo only). Later: consume fable/senior/karpathy/tdah instead of duplicating the loop; autoload; vibe-coding without specs; plan mode and research. Implementation landed before a Spec-to-PR plan; this spec is the contract of record for that tree.

### Prior Work Sweep

Local keyword + `git log` on 2026-09-04: no prior megabrain commits. Closest utilities: `ws-pre-daily`, `ws-spec-explain`, `ws-spec-list`, `ws-task-lifecycle` (prompt-driven, may draft specs). This skill does not require spec-write.

### Design Intent

Greenfield coordinator: vibe implement without spec ceremony; companions own loop/proof/shape; specialists are Tier 2. Not a second Spec-to-PR FSM. Autoload on consumers who enable Always-applied; defer when orch owns the session.

## Notes

- Package version stamps via release bump (`build-site:bump`).
- Plan mode does not mkdir `{us-dir}` unless the user asked for a workflow.
- New specialist kinds: table row + `references/*.md`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Spec-to-PR FSM steps 0–9 | Orch owns that; this skill defers |
| Duplicating fable/senior/karpathy/tdah bodies | Load those SKILL.md files |
| Shipping root `MEGABRAIN.md` or CodeThief / market-video text | Inspiration only |
| Required collector scripts under `scripts/` | Agent uses git / Glob / Read |
| Host-product-named tool APIs | Portable `user-gate` / `askQuestionTool` |
| Loading every specialist on every prompt | Cap 2 after mode/gate |
| Consumer-custom specialist dirs outside this skill folder | Shipped map is the SoT |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Package membership | Workflows (`packages.workflows`) | Same class as `ws-pre-daily` | y |
| Invocation | Model-reachable description + autoload; slash `/ws-megabrain` | Vibe sessions should find it | y |
| Specialist set | Router + domain table in SKILL.md | Progressive disclosure; cap 2 | y |
| Input validation / auth / concurrency / TTL / rate limits | N/A because this skill is local scan + companion dispatch with no network API | Dimensions not present | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | SKILL.md + `references/*.md` + catalog/deps/autoload | Diff lists those paths |
| Atomic criteria | AC1–AC21 pass/fail | Authoring validate + grep |
| Failure modes | Missing config, cancel gate, orch defer | AC6/AC9; skill Mode step |
| Observation telemetry | Loaded banner; gate logs; companion loads | Skill text |
| Open blockers | None | Implementable 2026-09-04 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Loaded banner: `ws-megabrain loaded.`
- Gate logs: `user-gate-modal`, `user-gate-fallback`, or `auto-gate-apply`
- Commands: `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0063-ws-megabrain.spec.md` exit 0
- Registry: `dependencies.ws-megabrain` lists the six companions
- Autoload: `ws-megabrain` row in `{sharedDir}/autoload.md`

### Negative & Failing Test Scenarios

- Agent implements product files during the menu `user-gate` turn (must fail AC8)
- `SKILL.md` pastes a duplicate fable 7-step table instead of loading `ws-fable-method` (must fail AC8 / AC20)
- Scan/menu Reads all `references/*.md` (must fail AC6 / AC18)
- SKILL.md names a host product or vendor `AskQuestion` tool id (must fail AC5)
- Cancelled gate treated as Recommended (must fail AC9)
- Missing `config.json` aborts instead of defaults + `config-missing` (must fail AC6)
- Combine loads three or more specialist files (must fail AC18)
- `DEVELOPMENT.md` or `REVERSE.md` instructs reverse-engineering unrelated third-party products (must fail AC16 / AC19)
- Always-applied table omits `ws-megabrain` (must fail AC21)

### [2026-09-04] Revision: Align spec to companion-load + autoload implementation (Prompt: "/ws-spec-update then implement and ship")
