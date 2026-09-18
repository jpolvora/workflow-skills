---
slug: us-344
title: change website cta / main slug/slogan
status: completed
step: 1
workflowId: us-344-20260918T114109Z
startedAt: "2026-09-18T11:41:09Z"
endedAt: "2026-09-18T11:49:49.154Z"
acRefs: []
---
## 0. Summary & Business Rules

Decide the product slogan/CTA wording for issue #344 and sync every surface so no stale variant remains.

**AC1 Decision: KEEP `From Spec to Delivery` (reject `From Spec to Ship`).**

Rationale (product semantics):

- The pipeline ends at a **reviewed pull request + fix-PR convergence**, not at merge or deploy (hero subtitle: `Spec in. Named pipeline. Reviewed pull request out.`; `docs/llms.txt`: "Orchestrators turn that spec into a reviewed pull request").
- `Delivery` denotes the **handoff of the reviewed-PR artifact** -- what the pipeline actually produces.
- `Ship` connotes **merged/deployed to production** ("shipped it"), which overpromises: this harness never merges or deploys.
- The current slogan is an intentional positioning choice (commit `b83eddc5`, LLM-agnostic spec to reviewed PR), not an accidental gap; no product change justifies repositioning.

Consequence: the change set is **verify-and-confirm**. Pre-plan sweeps show all live surfaces already use `Delivery` consistently and the losing variant `From Spec to Ship` has zero hits. Implementation confirms per-surface consistency with grep-verifiable checks, fixes any drift found (sync to `Delivery`), documents AC6 evidence, and closes the issue with this rationale. Expected product diff: empty.

Business rules: docs/site/prose only -- no pipeline behavior, skill, script, or config change. Historical rows (CHANGELOG/FEATURES release history, shipped specs) stay verbatim. Hero/CTA layout unchanged -- wording only.

Memory consult (this run): keywords `slogan, website CTA, docs sync` + touched paths against both enabled backends (local `ws-shared/MEMORY.md` + `memory/*.md` via grep; spec-memo vault via MCP search) -- zero hits on both. No DO NOT / INSTEAD DO constraints apply.

## 1. Definition of Ready & Scope

Resolved assumptions (from spec, all confirmed):

- Canonical casing follows existing hero style (`From Spec to Delivery`).
- Historical release-note hits stay verbatim; AC6 evidence documents them as exceptions.
- Dimensions N/A: no inputs, auth, concurrency, TTL, retries, external deps, or state transitions (static prose change).

Acceptance criteria (7, all measurable via grep):

- AC1: Decision + rationale recorded in spec/plan (this plan section 0; spec Description).
- AC2: `docs/index.html` h1, hero subtitle/CTA row, `<title>`, meta description/keywords, OG/Twitter titles/descriptions, JSON-LD `description` use `Delivery` consistently.
- AC3: `README.md` tagline/intro + `docs/llms.txt` header use `Delivery`.
- AC4: `AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `CATALOG.md`, `FEATURES.md` live prose synced (history verbatim).
- AC5: Wiki pages/domains referencing the slogan synced.
- AC6: Case-insensitive sweep for losing variant `From Spec to Ship` across `docs/`, root `*.md`, `ws-shared` hub docs reports zero hits; `Delivery` hits limited to live-consistent prose + documented historical rows.
- AC7: Site rebuild (as applicable) + repo checks for touched areas green, no new failures.

Out of scope: pipeline/skill/script/config changes; rewriting historical CHANGELOG/FEATURES rows or shipped specs; hero/CTA layout redesign.

## 2. Technical Design & Architecture

Stack (`node-skills-package`, Node 22 skill package; site is static `docs/`): no backend/frontend/database layers touched. No config.json layer edits. No invariant-key impact (`commitPlanFilesOnlyAtStep8` unaffected -- plan artifact only).

Surface inventory (observed pre-plan, all `Delivery`-consistent):

| Surface | File | Slogan sites |
|---------|------|--------------|
| Site head | `docs/index.html` | `<title>` (L6), meta description (L7), meta keywords (L11), `og:title` (L16), `twitter:title` (L20), JSON-LD `description` (L39) |
| Site hero | `docs/index.html` | `h1` (L164, `Delivery` in gradient span), subtitle (L166, no slogan -- PR-handoff wording), CTA row (L172-175, `Install with npx` / `Explore the pipeline` -- no slogan) |
| README | `README.md` | Tagline (L3), intro (L13) |
| LLM summary | `docs/llms.txt` | Header (L3) |
| Hub/catalog | `AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `CATALOG.md` | Zero `From Spec to` hits (verified) -- nothing to sync |
| Features | `FEATURES.md` | L300 only -- **historical 0.3.47 release row, keep verbatim** |
| Wiki HTML | `docs/wiki/**` | Zero `From Spec to` hits (verified) -- `delivery/` domain dir name is taxonomy, not slogan prose |
| Wiki SoT | `.agents/specs/wiki/**` | Zero `From Spec to` hits (verified) -- authoring source needs no edit |

Design intent (spec Design Intent): `git log -S "From Spec to Delivery"` points at `b83eddc5` intentional LLM-agnostic positioning. This plan preserves that intent (no behavior/slogan change), so no `-p/-L` deep-dive is required beyond the recorded sweep evidence.

## 3. Step-by-Step Plan

1. **AC1 -- Record decision (this plan).** Action: decision + rationale in section 0 above; spec Description already frames the semantics. Files: `.agents/plans/us-344/step-01-us-344.plan.md` (this artifact). Check: `grep -n "KEEP.*From Spec to Delivery" .agents/plans/us-344/step-01-us-344.plan.md`.
2. **AC2 -- Verify site hero/head.** Action: confirm each head/hero site uses `Delivery`; fix drift to `Delivery` if found (expected: no edit). Files: `docs/index.html`. Checks:
   - `grep -n "From Spec to" docs/index.html` -- only `<title>`, `og:title`, `twitter:title`, `h1` lines.
   - `grep -ni "from spec to delivery" docs/index.html` -- head meta description, keywords, JSON-LD included; zero `ship` variants.
3. **AC3 -- Verify README + llms.txt.** Action: confirm tagline/intro/header use `Delivery`; fix drift if found (expected: no edit). Files: `README.md`, `docs/llms.txt`. Check: `grep -n "From Spec to" README.md docs/llms.txt` -- L3/L13 + L3, all `Delivery`.
4. **AC4 -- Verify hub/catalog docs.** Action: confirm `AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `CATALOG.md` carry no slogan prose (zero hits = in sync, nothing to add -- the slogan lives on site/README surfaces by design); confirm `FEATURES.md` has only the historical L300 row. Files: read-only unless drift found. Checks:
   - `grep -rni "From Spec to" AGENTS.md .agents/skills/ws-shared/AGENTS.md CATALOG.md` -- zero hits.
   - `grep -n "From Spec to" FEATURES.md` -- L300 only; `git diff -- FEATURES.md` empty (history verbatim).
5. **AC5 -- Verify wiki.** Action: confirm zero slogan references in both the published tree and the authoring SoT; fix drift if found (expected: no edit). Files: `docs/wiki/**`, `.agents/specs/wiki/**` (read-only). Checks:
   - `grep -rni "From Spec to" docs/wiki/ .agents/specs/wiki/` -- zero hits.
   - Note: `docs/wiki/delivery/` and `delivery` domain labels are bounded-context taxonomy, not slogan prose -- not in scope.
6. **AC6 -- Losing-variant sweep.** Action: case-insensitive sweep for `From Spec to Ship` (losing variant) + audit remaining `Delivery` hits. Files: none touched. Checks:
   - `grep -rni "from spec to ship" docs/ README.md AGENTS.md CATALOG.md FEATURES.md .agents/skills/ws-shared/ .agents/specs/wiki/` -- zero hits.
   - `grep -rni "from spec to delivery" docs/ README.md AGENTS.md CATALOG.md FEATURES.md .agents/skills/ws-shared/` -- only live-consistent sites from the section 2 table + FEATURES.md L300 historical row; record full output as AC6 evidence.
7. **AC7 -- Site + docs verify.** Action: rebuild site without version bump (prose-verify only; expected no output change) and run repo checks for touched areas. Files: none touched (build is verification). Checks:
   - `node bin/build-site.js` -- exit 0; `git status --short -- docs/` shows no unexpected modifications.
   - `npm run test` (configured `verification.backendTest`) -- no new failures vs baseline. Docs-only scope: harness-clean probe for touched areas if applicable.

Negative-scenario guards (spec NS1-NS4): NS1 -- step 2 checks head metadata explicitly, not just `h1`. NS2 -- step 3 covers `llms.txt` alongside README. NS3 -- step 4 asserts `git diff` empty on `FEATURES.md`. NS4 -- this plan section 0 records why `Ship` was rejected even though the outcome is keep.

## 4. Permissions, Tenancy & i18n

N/A -- static prose verification. No RBAC, tenant data, auth boundaries, or localizable runtime strings involved. Site has no i18n framework (`config.json` frontend i18n: none). No permission-gated pages touched.

## 5. Test Coverage

Grep-verifiable checks stand in for unit tests on this docs-only change (no code paths exist to unit-test):

- AC1 -> Check C1: plan section 0 contains KEEP decision + pipeline-ends-at-PR rationale. Method: `grep -n "KEEP.*From Spec to Delivery" <plan>` + reviewer read of section 0.
- AC2 -> Check C2a: `grep -n "From Spec to" docs/index.html` shows only title/OG/Twitter/h1 `Delivery` lines. Check C2b: `grep -cni "from spec to ship" docs/index.html` returns 0.
- AC3 -> Check C3: `grep -n "From Spec to" README.md docs/llms.txt` returns only `Delivery` lines (README L3/L13, llms.txt L3).
- AC4 -> Check C4a: `grep -rni "From Spec to" AGENTS.md .agents/skills/ws-shared/AGENTS.md CATALOG.md` returns zero. Check C4b: `grep -n "From Spec to" FEATURES.md` returns L300 only + `git diff --exit-code -- FEATURES.md`.
- AC5 -> Check C5: `grep -rni "From Spec to" docs/wiki/ .agents/specs/wiki/` returns zero.
- AC6 -> Check C6a: losing-variant sweep (step 6) returns zero non-historical hits (zero total expected). Check C6b: `Delivery` sweep output recorded; every hit classified live-consistent or historical (FEATURES.md L300).
- AC7 -> Check C7a: `node bin/build-site.js` exit 0 with no unexpected `docs/` diff. Check C7b: `npm run test` exit 0 / no new failures.

## 6. Stack & Security Invariants Verification Plan

Stack: `node-skills-package` (Node 22 skill package, static `docs/` site, no backend/frontend/database). No stack rule-pack boundary from `{sharedDir}/runtime/stacks/` is exercised -- no framework code runs. Per-boundary disposition:

- **Authorization & endpoint protection:** not touched -- no routes, endpoints, or guards. Verification: N/A (no files under any served endpoint changed behaviorally).
- **Concurrency & async safety:** not touched -- no async code. Verification: N/A.
- **Input validation & DTO boundary:** not touched -- no inputs, schemas, or injection surface (static HTML/Markdown prose; no user input flows). Verification: N/A; no secrets introduced (prose-only, no credentials).
- **Subscription & lifecycle cleanup:** not touched -- no subscriptions, hooks, or streams. Verification: N/A.
- **Config invariants** (`config.json.invariants`): `commitPlanFilesOnlyAtStep8: true` respected (this plan commits only at Step 8 delivery); EF/tenancy keys are `false`/N/A for this Node package. Verification: `git status` shows plan artifact uncommitted until Step 8.
- **Docs-sync protocol invariant** (repo convention: site/README/hubs/FEATURES consistent): verified by section 3 steps 2-6 sweeps; `ws-check-harness` remains the before-ship gate per repo workflow but introduces no new prose surface for this keep-decision.

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (no code layers touched; docs-only).
- [x] Domain entities and mappings encapsulated (N/A -- no domain model).
- [x] Schema migrations created (N/A -- no database).
- [x] Authorization checks applied (N/A -- no auth surface).
- [x] Stack & security invariants verified (auth, async, validation, cleanup) -- section 6 dispositions recorded, all N/A with rationale.
- [x] i18n keys declared (N/A -- no i18n framework).
- [x] Test cases cover all ACs -- section 5 maps AC1-AC7 to C1-C7 checks.

## 8. Open Questions

None remaining -- all resolved:

- Slogan choice (keep vs adopt)? **Resolved:** keep `From Spec to Delivery`; rationale in section 0.
- Historical rows rewritten? **Resolved:** no -- FEATURES.md L300 and any CHANGELOG rows stay verbatim.
- Wiki authoring SoT in scope? **Resolved:** yes, verified -- `.agents/specs/wiki/**` swept with zero hits; no edit needed.
- Layout/CTA redesign? **Resolved:** out of scope -- wording verification only.
