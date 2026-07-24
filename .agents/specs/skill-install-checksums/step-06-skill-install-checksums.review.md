---
us: skill-install-checksums
reviewDate: 2026-07-20
base: 85e7a0b1078d5353299d620039b89acdb2b2c42b
reviewer: ws-code-review / Cursor Grok 4.5
seniorDeveloper: portable-checklist (rules.seniorDeveloper empty)
stack: node-skills-hub (bin + test)
scope:
  - bin/install-rules.js
  - bin/skill-integrity-lib.js
  - bin/generate-skill-integrity.js
  - bin/skill-integrity.json (structure)
  - bin/cli.js (integrity-related)
  - test/test-install.js (Phase 0b / Phase 11)
  - README.md (integrity docs)
  - .agents/skills/check-harness/SKILL.md (integrity bullet)
  - .agents/skills/shared/hub.gitignore
  - .agents/skills/shared/.gitignore
excluded: pre-existing dirty 08-ship-pr/*
---

# Code review — skill-install-checksums (Step 6)

## Diff scope

Working-tree integrity US only (vs baseline `85e7a0b…`). `rules.seniorDeveloper` empty → portable checklist: correctness, fail-closed integrity, consumer-owned exclusions, security/trust docs, architectural lockstep copy↔hash, test coverage for ACs.

## Triage / investigate summary

Hypotheses investigated with Evidence → Failure Scenario → Missing Protection → Discards. Retained: 2 Warnings (fixed in-session). Dropped: unsigned-manifest MITM (spec out of scope / documented trust limit); no post-copy rollback (plan-deferred); hub.gitignore packing asymmetry (intentional, tested).

## MEMORY Review Patterns

`MEMORY.md` has no `## Review Patterns` section. Pattern sweep: N/A. Applied related High trap **Integrity — npm never packs .gitignore; skip runs/** (hub.gitignore + runs skip) — implementation matches.

## Invariants

| Check | Result |
|-------|--------|
| `commitPlanFilesOnlyAtStep8` | OK for product code; review artifacts under `{plansDir}` only |
| Tenancy / EF / i18n | N/A (stack) |
| Consumer-owned never hashed | OK (`CONSUMER_OWNED_*`, local record excluded) |
| Copy ↔ hash lockstep via `install-rules.js` | OK after memory-skip fix |

---

## Critical

*(none remaining)*

---

## Warning

### W1 — Post-verify failure blessed bad local integrity record — **FIXED**

- **path:** `bin/cli.js` (`postVerifyAndWriteLocal`, previously ~L602–653)
- **score:** 8/10
- **Evidence:** On consumer mismatch, code built `buildLocalRecord` from **actual** digests, wrote `skill-integrity-local.json`, then `process.exit(1)` when not `--force-integrity`.
- **Failure scenario:** Partial/bad post-copy tree (e.g. unmanaged extra file left under a skill) → install/update exits ≠0, but local record matches the bad tree → later `integrity` audit exits 0 and conceals the failed gate (AC5/AC6 undermined).
- **Missing protection:** Write local record only on verify OK or explicit `--force-integrity` (force row already documents actual digests).
- **Siblings:** none (single write path).
- **suggestion:** Gate write behind `result.ok \|\| force`; on fail without force leave prior record (or none) so audit stays honest.

```
Fix applied: rewrite postVerifyAndWriteLocal; Phase 11 regression test.
```

### W2 — Absolute-path `memory` segment skipped managed files — **FIXED**

- **path:** `bin/skill-integrity-lib.js:L135` (was); siblings `bin/cli.js` `copyDirSync` / `copyDirPreservingConfig`
- **score:** 7/10
- **Evidence:** `pathParts.includes('memory')` used **absolute** `srcPath`/`abs`, not skill-relative path. Consumer-owned `memory/` already skipped via `CONSUMER_OWNED_DIRS` / `isConsumerOwnedEntry`.
- **Failure scenario:** Package or consumer clone under a directory named `memory` (e.g. `…/memory/workflow-skills/…`) → every managed file skipped for copy and/or hash → empty trees or false integrity mismatches.
- **Missing protection:** Rely on entry-name consumer-owned rules only; do not scan absolute path segments.
- **Siblings:** `copyDirSync`, `copyDirPreservingConfig`, `enumerateSkillFiles` (all three removed).
- **suggestion:** Delete the abs-path `memory` checks; keep `CONSUMER_OWNED_DIRS` / `isConsumerOwnedEntry`.

```
Fix applied: removed abs-path checks in lib + both copy helpers.
```

---

## Suggestion

### S1 — Dead identical branches in mismatch printer — **FIXED**

- **path:** `bin/cli.js` `printIntegrityMismatches`
- **score:** 2/10
- **Note:** Both ternary arms printed ` (${m.reason})`. Collapsed to single format.

### S2 — (informational) Residual documented risks

Unsigned manifest / no auto-rollback remain plan-deferred; README + CLI already document. No code change.

---

## Apply fixes?

**AUTO fullMode:** Yes — W1, W2, S1 applied in-session. See `step-06-skill-install-checksums.fix.report.md`.

## Post-fix re-review slice

Re-read `postVerifyAndWriteLocal` + enumeration/copy skips; `npm run tests -- --local` PASS including new Phase 11 assert. No further Critical/Warning retained.
