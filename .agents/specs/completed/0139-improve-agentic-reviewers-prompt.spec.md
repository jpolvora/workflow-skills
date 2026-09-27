---
id: null
slug: improve-agentic-reviewers-prompt
title: "Improve agentic code reviewers prompt — simplify and align upstream vs local needs"
source: local
specDate: 2026-09-26
status: completed
---

# Specification — Improve agentic code reviewers prompt — simplify and align upstream vs local needs

## Description

The repository ships a custom review prompt at `.github/agentic-code-reviewers-prompt.md` (57 lines, ~6.9k chars) consumed by `.github/workflows/agentic-code-review.yml` (`--stack Custom --custom-prompt .github/agentic-code-reviewers-prompt.md --score-min 5`). The workflow is the single env-driven reviewer (`AGENTIC_CODE_REVIEWERS_ENGINE/MODEL/VARIANT` via `vars`, secrets `OPENCODE_API_KEY`/`CURSOR_API_KEY`) shared by `opencode` and `cursor-sdk` through `jpolvora/agentic-code-reviewers/release/run.sh`.

The prompt tightened iteratively (commits `a5de6880`, `112864c3`, `9f04f146`, `29308d41`): it now encodes skill structure, progressive disclosure, portability, language, managed-skill refactor bans, STEP-DISPATCH dual-mode, skill inventory drift, dependency graph closure, harness gates, installer contracts, and workflow/markdown/script hygiene. It is the only place that tells the LLM what "good" means for this Node 22 skill-package harness.

The request is to improve/simplify that prompt: evaluate what is actually necessary for a good review on this repo, decide what belongs upstream in `jpolvora/agentic-code-reviewers` generic templates vs what must stay repo-local, and rewrite the file so reviewers catch high-signal harness defects without over-specifying style or re-litigating retired `NN-*` history.

System touchpoints:
- **Workflow:** `.github/workflows/agentic-code-review.yml` (engine/model/variant resolution, `run.sh` invocation, `--include-patterns`, `--extra-exclude`, timeout 1200000ms).
- **Prompt:** `.github/agentic-code-reviewers-prompt.md` (sectioned guidance + `score_min: 5` thread rule).
- **Harness contracts referenced by prompt:** `AGENTS.md` / `.ws/AGENTS.md`, `.agents/skills/ws-shared/runtime/autoload.md`, `bin/skill-dependencies.json`, `docs/index.html` (`node bin/build-site.js`), `ws-check-harness` / `ws-check-workflows` gates, installer `bin/cli.js`.
- **Stack:** `node-skills-package` (Node 22, `.agents/skills` SoT, `bin/` CLI, `test/`), no DB/frontend.

## Acceptance Criteria

- AC1: Current prompt and workflow invocation are audited — the spec records how `--stack Custom` requires `--custom-prompt` and how `--score-min 5` is enforced both in prompt §5 and workflow args, plus which `include-patterns`/`extra-exclude` paths are currently reviewed.
- AC2: A revised prompt ships keeping high-signal gates (routing/phantom/duplicate, NN-* ban, inventory drift, dependency closure, harness 0-critical, installer preservation, secrets, FSM) and removing low-value repetition; file stays en-us, target ≤80 lines, hard cap 120 lines.
- AC3: The revision preserves the Custom-stack contract: reviewer invoked with `--stack Custom` always supplies `--custom-prompt .github/agentic-code-reviewers-prompt.md`; a CI check or workflow comment makes the coupling explicit so a future workflow edit cannot run `Custom` without a prompt.
- AC4: Coverage delta is explicit — the spec lists which sections move upstream to `agentic-code-reviewers` generic guidance (if any) vs which stay repo-local, with rationale; if nothing should move upstream, the decision is recorded with reason (keep-local default).
- AC5: The workflow file `.github/workflows/agentic-code-review.yml` remains functionally intact: env-driven engine/model/variant, Node 22.13, timeout, `gh api` PR context, `AGENTIC_CODE_REVIEWERS_EXTRA_EXCLUDE_PATTERNS=.agents/plans/**,.agents/specs/**`, and `score_min 5` flag are unchanged unless the spec justifies the change and the AC names it.
- AC6: Documentation/hub pointers that the prompt mentions are verified against reality: referenced hub paths use current managed layout (`{skillsRoot}/ws-shared/runtime/autoload.md`, `.ws/AGENTS.md` entrypoint) not retired `.ws/runtime` or `.agents/skills/ws-shared` hub paths; mismatched references are corrected.
- AC7: The change is observable without a live LLM run: `npm run test` harness checks + at least one dry-run proof (`npm run review:dry` or doc-level validation) are enumerated in Validation notes; if credentials/network unavailable, the limitation is stated and the unit/contract check performed instead.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing `agentic-code-reviewers` runtime (`run.sh`, scoring engine, thread posting logic) | Prompt-only scope; engine is external release artifact |
| Adding new `ws-*` skills or pipeline steps | Prompt hygiene vs feature work — separate spec |
| Translating prompt to other locales | Contract requires en-us for harness docs and prompts |
| Switching default `REVIEW_ENGINE/MODEL/VARIANT` values | Not part of prompt simplification; independent variable |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Prompt is repo-local (`workflow-skills`), not consumer template | Keep file at `.github/agentic-code-reviewers-prompt.md` and invite upstream PR only if generic value proven | Consumers receive different stack docs; generic harness advice belongs upstream only when stack-agnostic | y |
| Reviewer stack stays `Custom` | Continue `--stack Custom --custom-prompt <file>` | Repo-specific harness rules (ws-*, skill-dependencies, autoload) cannot be expressed by generic stack | y |
| Score threshold remains 5 | Keep `--score-min 5` and §5 thread rule `>=5` | Matches current workflow + prompt, reduces noise | y |
| Upstream proposal channel | Open issue/PR in `jpolvora/agentic-code-reviewers` with generic wording if a reusable rule is extracted | Avoid consumer-secret leakage; describe failure class not app | n |
| Token budget for prompt | Target ≤80 lines / cap 120 lines | Reviewer context window rewards brevity; current 57 lines is baseline | n |
| N/A because dimensions absent | N/A because auth/tenancy, concurrency, data lifecycle, retry/idempotency are not reviewer-prompt concerns — they are product invariants verified by skill tests, not by the external code-review LLM | No ACs invented for absent dimensions | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Prompt line-budget and section keep/drop list agreed | Review draft diff of `.github/agentic-code-reviewers-prompt.md` against AC2/AC4 table |
| Atomic criteria | Each retained gate maps to one observable harness failure (routing, graph, installer, secrets, FSM) | `grep -c` retained gate phrase in prompt + cross-check to `ws-check-harness` finding codes |
| Failure modes enumerated | Negative scenarios list stale-prompt, missing-prompt, and Custom-without-prompt regressions | Inspect Validation & Observation Notes |
| Telemetry named | Dry-run command and harness gate commands recorded | `cat .ws/config.json` `preview.dryRunCommand` + `npm run review:dry --help` |
| Zero open blockers | Prompt path, stack id, and workflow coupling confirmed | `Read .github/agentic-code-reviewers-prompt.md`, `Read .github/workflows/agentic-code-review.yml`, `node -e` stack print |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0139-improve-agentic-reviewers-prompt.spec.md` — must exit 0.
- `node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs` / `npm run test` (includes harness audits) — 0 critical after prompt/workflow edits.
- `npm run review:dry` — mirrors CI with `--dry-run --stack Custom --custom-prompt .github/agentic-code-reviewers-prompt.md` (requires `OPENCODE_API_KEY` or `CURSOR_API_KEY`; network needed). When unavailable, record "live reviewer unverified — contract test only" per MEMORY `2026-09-23-separate-tested-integration-contracts`.
- `git diff main...HEAD -- .github/agentic-code-reviewers-prompt.md .github/workflows/agentic-code-review.yml` shows only prompt + optional workflow comment changes; no product skill edits mixed in.

### Negative & Failing Test Scenarios

- **Missing prompt:** Delete or rename `.github/agentic-code-reviewers-prompt.md` then run workflow locally (`bash /tmp/agentic-code-reviewers-run.sh --stack Custom` without `--custom-prompt`) — must fail fast; reviewer must not run Custom without custom prompt.
- **Custom without prompt drift:** Edit workflow to drop `--custom-prompt` while keeping `--stack Custom` — expect harness or review-preflight failure; regression proves AC3.
- **Score threshold regression:** Change `--score-min` to 1 and feed a trivial markdown churn diff — expect low-score nits to be posted (noise); reverting to 5 suppresses them.
- **Retired path reference:** Prompt still mentions `.ws/runtime/autoload.md` after runtime move to `{skillsRoot}/ws-shared/runtime` — `ws-check-harness` link gate must flag stale path (validates AC6).
- **Prompt bloat:** Extend prompt to 200 lines — reviewer context/effectiveness degrades; CI still passes but spec's line-budget gate fails (AC2).

## Notes

- Stack invariants: Node 22 only; skill helpers under `.agents/skills/**/scripts` are CommonJS `.cjs` requiring explicit `node` launcher; no Python runtime — prompt should not suggest `python <<'PY'` for harness checks where `node` or `muse.search` suffices (retain if useful as anti-pattern).
- Prior art: recent prompt diffs fixed `ws-shared` vs `.ws` hub paths (commits `29308d41`, `9f04f146`); carry those corrections forward rather than reverting.
- Companion decision: if upstream generic improvement is warranted (e.g. generic advice for `score_min` or `Custom` vs `Default`), write `.agents/specs/0139-improve-agentic-reviewers-prompt.context.md` with Feature Boundary (`upstream generic` vs `workflow-skills local`) and Deferred Ideas; otherwise no companion file (no gray area).

### Design Intent

Intentional constraint vs accidental gap (per `git log -- .github/agentic-code-reviewers-prompt.md`):

- `a5de6880` intentionally tightened harness/skill-naming gates (check-harness 0-critical, NN-* ban, dependency closure) — preserve.
- `112864c3` intentionally set `score_min: 5` to suppress nits — preserve.
- Path corrections `.ws/runtime` → `{skillsRoot}/ws-shared/runtime` are intentional relocations (commits `9f04f146`/`29308d41`) — align prompt with current managed hub layout.
- No accidental gap detected — prompt evolution is deliberate hygiene. Greenfield edits beyond path/length hygiene must be justified by AC table.

### Prior Work Sweep

- Local keyword sweep (`grep -r agentic-code-review`): only `.github/workflows/agentic-code-review.yml`, `.github/agentic-code-reviewers-prompt.md`, `bin/review-dry-run.cjs`, `package.json:review:dry`.
- `git log` sweep: recent tightens listed above; no open PR duplicating this slug (`0139-*` is next sequence, no collision).
- Upstream `jpolvora/agentic-code-reviewers` generic prompt templates not inspected — evaluation deferred to AC4 upstream-vs-local analysis.
