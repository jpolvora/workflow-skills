---
slug: us-348
title: "enhance host capabilities - detect tools & cache it"
status: "plan to be refined"
---

## 0. Summary & Business Rules

Brainstorm decision (spec AC1): **refine-and-implement**. The current probe-once/cache design in
`host-dispatch.md` + `tools.md` § Host-tool binding stays; this spec systematizes it by adding
tool coverage (read, write/update, shell exec, dispatch, plus the already-bound ask-question and
browser), a portable capability-token vocabulary, a repo-side pre-mapped host/tool table, and one
documented invalidation rule. Abandon was rejected because the shell-out failure evidence (agents
shelling out for native-capable file work) is real and the fix is additive, not a redesign.

Goals: pay detection cost once per session key, make native tools visible to orchestrator and
subagents via tokens, keep skill bodies host-neutral (capability names, never host product tool IDs).

## 1. Definition of Ready & Scope

Resolved assumptions (from spec): brainstorm recorded either way; common tools are read,
write/update, shell exec, dispatch (plan confirms the list below); pre-mapped host data lives in
the repo as a static map file plus the runtime cache.

Measurable ACs: AC1 decision note = §0 above + shipped
`runtime/host-capability-tokens.md` decision section; AC2 cache-content test on ≥2 host shapes;
AC3 grep of token vocabulary + scenario test (file work picks native tool); AC4 probe-count test
over multi-step run + documented invalidation rule; AC5 pre-map file with named entries including
dispatch-agent variants.

Out of scope (per spec): rewriting every skill body to tokens; host-specific tool IDs in shipped
skill bodies; changing dispatch semantics or provider contracts.

## 2. Technical Design & Architecture (refined — interview findings 5–7 folded in)

- Token doc states **effective resolution precedence**: pre-map hit → host-declared tools →
  minimal fallback (per token-contract trap).
- Quoter sweep: after editing `tools.md` + `host-dispatch.md`, grep the skills tree for retired
  phrasing and reconcile every quoter in the same batch.
- Ship includes a release version bump when the branch version equals the base
  (`package.json` + `bin/skill-dependencies.json` + site footer).

## 2. Technical Design & Architecture (original)

Layer edits (config.json layers: skills-sot, installer-cli, tests):

- New `runtime/host-capability-tokens.md` — decision note (AC1), token vocabulary table
  `{readFile} {writeFile} {editFile} {shellExec} {dispatchAgent} {askQuestion} {browserVerify}`
  mapped to `tools.md` aliases, cache-query-first ordering rule (AC3), invalidation rule (AC4).
- New `runtime/host-tool-map.json` — static pre-map keyed by neutral host-shape names
  (e.g. `muse-spark-like`, `opencode-like`, `cursor-like`, `generic`), each entry mapping tokens
  to known tool/function name variants including dispatch-agent variants (AC5). Neutral shape keys
  only — no host product branding in shipped prose.
- New `runtime/scripts/probe_host_capabilities.cjs` (plain Node, explicit `node` launcher) —
  resolves a host shape via the pre-map, merges host-declared tools, degrades unknown hosts to the
  minimal safe set (`{shellExec}` only, everything else `none`, never a hard failure), upserts only
  the current `hostId::orchestratorModel` key into the consumer-local gitignored
  `host-capabilities.json`, supports `--refresh` explicit invalidation (AC2/AC4).
- Edit `runtime/tools.md` — capability-token table pointer + "query the cached
  host-capabilities file before choosing how to act" ordering (AC3).
- Edit `runtime/host-dispatch.md` §2 — reference the probe script + tokens doc, state the reuse
  rule (bind once at bootstrap, no per-step re-probe) and the invalidation rule (AC4).
- New `test/test-host-capabilities.js` (ESM style per `test/test-shell-quoting-audit.js`) covering
  AC2–AC5; wire into `package.json` `tests:harness-efficiency` chain.
- Regenerate integrity (`npm run generate-integrity` + `npm run verify-integrity`) from a clean
  tree per the 2026-09-06 integrity trap.

No provider or SCM changes. No new external input surface (detection reads host metadata).

## 3. Step-by-Step Plan

1. Write `runtime/host-capability-tokens.md` (decision + vocabulary + ordering + invalidation).
   Files: 1 new. Check: vocabulary greppable, no product tool IDs, ≤3-option gate prose untouched.
2. Write `runtime/host-tool-map.json` (neutral shape keys, token→name variants incl. dispatch
   variants, `generic` minimal entry). Files: 1 new. Check: `node -e JSON.parse` valid, named
   entries present.
3. Write `runtime/scripts/probe_host_capabilities.cjs` (`--host-shape`, `--cache`, `--refresh`,
   `--json`; upsert-one-key; unknown→minimal; never throws on unknown). Files: 1 new.
   Check: run against two fixture shapes + unknown shape, exit 0 throughout.
4. Edit `runtime/tools.md` (token table pointer + cache-query-first) and
   `runtime/host-dispatch.md` (probe script reference + reuse/invalidation rule). Files: 2 modified.
   Check: grep zero residual retired phrasing; quoter sweep per 2026-09-18 sweep trap.
5. Write `test/test-host-capabilities.js` (cache-content ×2 shapes, vocabulary grep, scenario
   native-over-shell, probe-count reuse, unknown-host graceful, map coverage). Wire into
   `package.json`. Files: 1 new + 1 modified. Check: `node test/test-host-capabilities.js` green.
6. Regenerate integrity from clean tree; run `npm run test` subset + `test-harness-clean.js`.
7. Ship: bump release version when branch version equals base (one patch bump per release PR),
   rebuild site catalog, update README/usage docs only if behavior prose changed.
   Files: integrity manifest. Check: `verify-integrity` OK, harness-clean 0 findings.

## 4. Permissions, Tenancy & i18n

N/A — no RBAC, no tenant data, no UI strings. Detection reads host metadata, not user free input.

## 5. Test Coverage

- AC1 → decision section exists in `host-capability-tokens.md` (file-content assertion).
- AC2 → cache-content test: probe two host shapes, assert detected tools cached per key.
- AC3 → vocabulary grep test + scenario test: file work with cached native tool resolves native,
  shell equivalent rejected.
- AC4 → probe-count test: multi-step fixture run probes once (cache hits after); invalidation rule
  text present; `--refresh` forces re-probe.
- AC5 → map-coverage test: pre-mapped shapes resolve to mapped tool names incl. dispatch variants.
- Negatives (spec §): shell-when-native-available fails tool-choice; per-step re-probe fails
  probe-count; unknown host degrades without startup failure; unmapped known-host tool fails map
  coverage.

## 6. Stack & Security Invariants Verification Plan

Touched framework boundaries: none (docs + Node probe script + static JSON; no auth endpoints, no
async I/O beyond sync fs, no DTOs, no subscriptions). Invariants from config.json.invariants: all
false except `commitPlanFilesOnlyAtStep8` (plan files commit only at Step 8 delivery — honored:
product files G2 after Step 5/6, plan files at Step 8). Script hygiene: explicit `node` launcher,
no shell-outs from the probe script (it replaces shell-outs, not adds them), unknown-host input
treated as data (no eval of tool names). `scan_stack_invariants.cjs` runs at implement time.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (runtime/ managed, test/ harness, no consumer data touched).
- [ ] Domain entities and mappings encapsulated (N/A — no domain layer).
- [ ] Schema migrations created (N/A — no DB).
- [ ] Authorization checks applied (N/A — no endpoints).
- [ ] Stack & security invariants verified (§6).
- [ ] i18n keys declared (N/A).
- [ ] Test cases cover all ACs (§5).

## 8. Open Questions

- Token naming taste (`{readFile}` vs prose guidance) — resolved refine-and-implement with the
  shell-out evidence cited in §0; interview to confirm or push back.
- Pre-map shape-key granularity (per-model vs per-host-family) — default per-host-family with a
  `generic` fallback; interview to confirm.
- Cache TTL vs explicit-refresh-only — default explicit-refresh-only within a session key (simplest
  predictable rule); interview to confirm.
