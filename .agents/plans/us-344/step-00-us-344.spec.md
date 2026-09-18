---
id: 344
slug: us-344
title: change website cta / main slug/slogan
source: local
specDate: 2026-09-18
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/344"
step: 0
workflowId: us-344-20260918T114109Z
status: completed
startedAt: "2026-09-18T03:47:05.503Z"
endedAt: "2026-09-18T03:47:05.503Z"
acRefs: []
---
# Specification — change website cta / main slug/slogan

## Description

Decide the product slogan/CTA wording: keep `From Spec to Delivery` or change to `From Spec to Ship`, and apply the decision consistently across all user-facing and doc surfaces.

Current state (observed): `docs/index.html` hero `h1` reads `From Spec to Delivery` with subtitle `Spec in. Named pipeline. Reviewed pull request out.`; `<title>`, meta description/keywords, OG/Twitter tags, and JSON-LD repeat the same slogan. `README.md` and `docs/llms.txt` repeat it. The issue asks to analyze the product and pick the wording that makes more sense, then sync every surface (same page, README.md, AGENTS.md, wiki, and so on) so no stale variant remains.

Scope is docs/site/prose only: no pipeline behavior, skill, script, or config change. The decision must weigh product semantics (`Delivery` = reviewed PR handoff vs `Ship` = merged/deployed connotation, while the pipeline actually ends at reviewed PR + fix-PR convergence, not deploy) and state the rationale in the spec/plan before editing.

## Acceptance Criteria

- AC1: Decision recorded with rationale — the spec/plan states the chosen slogan (`From Spec to Delivery` kept or `From Spec to Ship` adopted) and why it fits the product (pipeline ends at reviewed PR, not deploy).
- AC2: Site hero updated — `docs/index.html` `h1`, hero subtitle/CTA row, `<title>`, meta description/keywords, OG/Twitter titles/descriptions, and JSON-LD `description` use the chosen slogan consistently.
- AC3: README and llms.txt updated — `README.md` tagline/intro lines and `docs/llms.txt` header use the chosen slogan.
- AC4: Hub and catalog docs synced — `AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `CATALOG.md`, and `FEATURES.md` prose referencing the old slogan updated (historical CHANGELOG/FEATURES release rows stay verbatim).
- AC5: Wiki synced — applicable wiki pages/domains referencing the slogan updated to the chosen wording.
- AC6: No stale variant remains — case-insensitive sweep for the losing slogan variant across `docs/`, root `*.md`, and `ws-shared` hub docs reports zero non-historical hits.
- AC7: Site and docs verify green — site rebuild (as applicable) plus repo checks for touched areas pass with no new failures.

## Original Issue Context

Change From Spec To Delivery => From Spec to Ship ?

Analyze the product and decide what does makes more sense/is more appropriated for the product.

This change would trigger more updates in other pages/docs to stay in sync - same page, including README.md, AGENTS.md, wiki and so on.

### Prior Work Sweep

- Ran provider `sweep-prior-work` for issue 344 (keywords: website, cta, slogan, From Spec, Delivery, Ship). No exact open PR for issue 344. Keyword PR hits (#188 autoload, #319 ws-wiki, #219 pattern consults) are merged and unrelated — search noise from `#344` matching, not duplicate work.
- `gh pr list --search "344" --state all`: same three MERGED PRs, no open duplicate.
- Codebase sweep: `From Spec to Delivery` present in `docs/index.html` (title, meta, OG/Twitter, JSON-LD, hero h1), `README.md` (2 hits), `docs/llms.txt`, and `FEATURES.md` 0.3.47 history row. `From Spec to Ship` has zero hits — greenfield wording change.

### Design Intent

- `git log -S "From Spec to Delivery" -- docs/index.html README.md AGENTS.md` → `b83eddc5 docs: align public site with shipped 0.3.46 and LLM-agnostic positioning`. The slogan is an intentional positioning choice (LLM-agnostic, spec → reviewed PR), not an accidental gap — so this spec decides a deliberate repositioning, not a bug restore.

## Notes

- Stack: Node 22 skill package, no backend/frontend build; site is static `docs/`.
- Historical rows (CHANGELOG.md, FEATURES.md release history, shipped spec files) must stay verbatim; only live positioning prose changes.
- If the decision is to keep `Delivery`, the change set shrinks to explicit confirmation + closing the issue with rationale (still verify AC6 sweep documents historical-only hits).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pipeline behavior, skill, script, or config changes | Slogan/CTA prose change only |
| Rewriting historical CHANGELOG/FEATURES release rows or shipped specs | History stays verbatim |
| Visual redesign of hero/CTA layout | Wording sync only, layout unchanged |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Canonical casing follows existing hero style (`From Spec to X`) | `From Spec to Ship` casing if adopted | Matches current title/hero capitalization | y |
| Losing-variant hits in historical release notes are acceptable | Keep history verbatim, document as exceptions in AC6 evidence | Rewriting history harms auditability | y |
| Dimensions N/A to a static prose change | N/A because no inputs, auth, concurrency, TTL, retries, external deps, or state transitions exist | Docs-only wording sync | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Touch list fixed: docs/index.html, README.md, docs/llms.txt, AGENTS.md, ws-shared hub, CATALOG.md, FEATURES.md live prose, wiki pages | `git status --short` shows only those paths |
| Atomic criteria | Each AC maps to a grep-verifiable string change | `grep -rni` before/after per AC |
| Failure modes | Stale-variant sweep and site checks named | AC6–AC7 commands recorded in Validation Notes |
| Observation telemetry | Named commands for sweep and build/test | See Telemetry below |
| Zero open blockers | Slogan decision recorded before edits | Plan states choice + rationale |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `grep -rni "From Spec to" README.md AGENTS.md CATALOG.md FEATURES.md docs/index.html docs/llms.txt .agents/skills/ws-shared/AGENTS.md` (before/after per AC).
- `grep -rni "From Spec to Ship\|From Spec to Delivery" docs/ README.md AGENTS.md` for the AC6 stale-variant sweep.
- Site rebuild per repo docs (as applicable) and `npm run test` for touched-area checks.

### Negative & Failing Test Scenarios

- Stale variant survives in OG/Twitter meta or JSON-LD while hero h1 changed — sweep must catch head-metadata misses, not just visible hero text.
- README updated but `docs/llms.txt` still carries the old slogan — LLM-readable summary drifts from the site.
- Over-eager rewrite touches historical CHANGELOG/FEATURES release rows — diff review must show history untouched.
- Decision to keep `Delivery` implemented as no-op without rationale — close-out must still record why `Ship` was rejected.
