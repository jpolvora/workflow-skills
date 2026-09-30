---
slug: explicit-knowledge-chain
title: Explicit knowledge chain in research guidance
status: completed
step: 1
workflowId: explicit-knowledge-chain-20260930T140853Z
startedAt: "2026-09-30T14:13:38.436Z"
endedAt: "2026-09-30T14:13:38.436Z"
acRefs: []
---
## 0. Summary & Business Rules

Make the research source order and anti-fabrication rules explicit in the fable research skills. Every factual claim walks the ordered knowledge chain (codebase, then project docs, then MCP sources, then web); claims with no chain grounding carry the fixed `UNCERTAIN` marker and are never presented as observed fact. `ws-fable-judge` audits gain a chain-compliance check. Prose-only change; no new calls, no behavior change outside skill text.

Business rules:
- Earlier chain links are preferred over later ones; citing a later link when an earlier link grounds the claim is a skipped-link violation.
- The max-2 lookup rounds budget is unchanged (AC7); the chain orders lookups without adding rounds.
- Portable skill prose must not cite internal spec numbers; describe gates generically.

## 1. Definition of Ready & Scope

Resolved assumptions (from spec): chain order codebase/docs/MCP/web; one table row per factual claim; one fixed marker word (`UNCERTAIN`) shared by method and judge; unreachable MCP is a stated gap, not a skipped link; sourcing flags ride the existing verdict (no new gate).

Acceptance Criteria: AC1 chain order defined; AC2 per-claim chain-link citation; AC3 uncertain flag, never presented as fact; AC4 anti-fabrication ban + gap statement; AC5 per-claim source table (claim, chain link, reference, uncertain marker); AC6 judge chain-compliance check; AC7 2-round budget preserved; AC8 chain/flag/rules grep-verifiable in both skill files.

Out of scope: automated claim extraction tooling; web-search vendor requirements; changing the round budget; pipeline orchestrator research steps.

## 2. Technical Design & Architecture

Stack: Node 22 skill package (`node-skills-package`); product files are SKILL.md prose plus one Node regression test. No framework boundaries touched; stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply (per spec Notes).

Edits:
1. `.agents/skills/ws-fable-method/SKILL.md` (AC1, AC2, AC3, AC4, AC5, AC7, AC8):
   - Step 2 Evidence row/table: replace the implicit "primary sources" ordering with the explicit chain `codebase -> project docs -> MCP sources -> web`; keep `max 2 lookup rounds then state gaps` verbatim.
   - Add an anti-fabrication block: never invent APIs, paths, numbers, versions, or tool output; state gaps when the lookup budget is spent; mark every inference as inference; ungrounded claims carry `UNCERTAIN` and are never presented as observed fact.
   - Step 6 Report: require a per-claim source table with columns Claim | Chain link | Reference | Uncertain.
2. `.agents/skills/ws-fable-judge/SKILL.md` (AC6, AC8):
   - Audit checklist: add a chain-compliance check (Step 1 claims carry chain link + reference; mis-sourced or unsourced claims flagged; skipped-link rule: web citation when codebase grounds it is a violation).
   - Verdict section: sourcing flags ride the existing verdict; cross-reference the report template section.
3. `.agents/skills/ws-fable-judge/references/REPORT.md` (AC6):
   - Add a `## Source Chain Compliance` section template (per-claim table echo + violations list).
4. `AGENTS.md` upstream session contract §2 Investigate loop (dogfood mirror; spec Notes dependency):
   - Mirror the chain, marker, and fabrication ban in one compact row/bullet; no spec numbers.
5. `test/test-explicit-knowledge-chain.js` (new, AC8):
   - Grep-assert the chain order tokens, the `UNCERTAIN` marker, the fabrication-ban tokens, the source-table headers, and the judge check in the files above; assert the 2-round budget prose is intact.
6. Integrity: `npm run generate-integrity` + `npm run verify-integrity` after final skill edits (hashed tree). SKILL.md frontmatter descriptions unchanged, so no site rebuild is required.

Design intent: convention made explicit per spec `### Design Intent`; `git log -S "knowledge chain"` shows no prior named chain (intentional lightness, not a removed rule).

## 3. Step-by-Step Plan

1. Edit `ws-fable-method/SKILL.md` Step 2 Evidence row: insert explicit chain order; keep max-2-rounds prose byte-identical. (AC1, AC7, AC8)
2. Add anti-fabrication block to `ws-fable-method/SKILL.md` (after Fit or inside Step 2/6 rows): fabrication ban list, gap statement, inference marking, `UNCERTAIN` rule. (AC3, AC4, AC8)
3. Edit Step 6 Report row: require per-claim source table with the four columns. (AC2, AC5, AC8)
4. Edit `ws-fable-judge/SKILL.md`: add chain-compliance check to the audit protocol and sourcing-flag note to verdict determination. (AC6, AC8)
5. Edit `ws-fable-judge/references/REPORT.md`: add `## Source Chain Compliance` template section. (AC6)
6. Mirror chain + marker + ban in `AGENTS.md` §2 (compact, generic wording, no spec numbers). (spec Notes dependency)
7. Write `test/test-explicit-knowledge-chain.js` grep assertions; run it green. (AC8)
8. Run `npm run test` (full suite stays green), `ws-check-harness` phases, integrity regenerate + verify. (DoR)
9. File spec via organizer at close (pending -> completed with index.PRD rewrite). (close-out)

Each step states affected files inline; engineering checks: grep assertions per AC, full suite green, harness clean.

## 4. Permissions, Tenancy & i18n

N/A: prose-only skill change with no new calls, no caller identity, no tenant data, no UI strings.

## 5. Test Coverage

- AC1: test asserts chain order tokens `codebase`, `project docs`, `MCP`, `web` appear in order in ws-fable-method/SKILL.md.
- AC2: test asserts per-claim citation rule prose (chain link + reference) in ws-fable-method/SKILL.md.
- AC3: test asserts `UNCERTAIN` marker rule and "never presented as observed fact" prose in ws-fable-method/SKILL.md.
- AC4: test asserts fabrication-ban tokens (`APIs`, `paths`, `numbers`, `versions`, `tool output`) and gap-statement prose.
- AC5: test asserts source-table headers (`Claim`, `Chain link`, `Reference`, `Uncertain`) in ws-fable-method/SKILL.md.
- AC6: test asserts chain-compliance check prose in ws-fable-judge/SKILL.md and `Source Chain Compliance` in REPORT.md.
- AC7: test asserts max-2-rounds prose intact in ws-fable-method/SKILL.md.
- AC8: all of the above run via `node test/test-explicit-knowledge-chain.js`; full `npm run test` stays green.

## 6. Stack & Security Invariants Verification Plan

Touched framework boundaries: none. No authorization surface, no async code, no DTO/input boundary, no subscriptions/lifecycle, no secrets. Verification: `npm run test` green; `ws-check-harness` Phases 0-5c clean (portability: no host product names, no internal spec numbers in shipped prose); integrity regenerate + verify from a clean skill tree (no untracked files under `.agents/skills/` at regen time).

## 7. Pre-PR Checklist

- [ ] Chain order prose in ws-fable-method Step 2; 2-round budget intact.
- [ ] Anti-fabrication block + UNCERTAIN rule in ws-fable-method.
- [ ] Per-claim source table requirement in Step 6 Report.
- [ ] Chain-compliance check in ws-fable-judge + REPORT.md section.
- [ ] AGENTS.md §2 dogfood mirror (generic wording, no spec numbers).
- [ ] test/test-explicit-knowledge-chain.js green; full suite green.
- [ ] Integrity regenerated + verified; harness clean.
- [ ] Test cases cover all ACs.

## 8. Open Questions

None. Order, granularity, marker, gaps, and enforcement were decided in the spec Assumptions table (all Confirmed y).
