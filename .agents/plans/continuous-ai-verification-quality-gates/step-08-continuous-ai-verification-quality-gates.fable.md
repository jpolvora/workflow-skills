# Adversarial Audit Report (`ws-fable-judge`)

**Domain:** DevOps / Harness (config.fable.enabled=true)  
**Baseline:** `f7cd64aa63fef815872774e68af527c2d3c1a6a5`  
**Ship-scope:** `.agents/skills`, `bin/`, `test/`, `AGENTS.md`, `package.json`  
**Claims source:** `step-08-continuous-ai-verification-quality-gates.result.md`  
**Spec:** `step-00-continuous-ai-verification-quality-gates.spec.md`

VERDICT: VERIFIED WITH CAVEATS

## Claims vs Ground Truth

| AC | Claim | Ground-truth evidence |
|----|-------|------------------------|
| AC1 | Fable PREPARE board row | Diff inserts board row **5** “Fable-judge audit verdict” between Security (4) and Consumer prepare (now 6); `REFUTED` → ❌ STOP; preflight safety floor retained in `ws-ship-pr/SKILL.md` |
| AC2 | `--pre-advance` CI | Large adds in `ws-spec-to-pr/scripts/validate_state.py` (+380) and lite twin (+327); STEP-DISPATCH / PROTOCOLS / state-hygiene wire pre-advance; dryRun soft-pass for missing tags documented |
| AC3 | Standalone classifier | Untracked `ws-classify-complexity/` (+ `classify.cjs`); registered in `bin/skill-dependencies.json`, hubs `AGENTS.md` / `ws-shared/AGENTS.md` |
| AC4 | JSONL dual-write | `--jsonl-out` on standard + lite `update_state.py`; orch docs mandate telemetry path |
| AC5 | skip-gates + safety floor | `skipQualityGates` in config example/schema/setup; orch + ship docs; typed `gate-bypass` JSONL on `--bypassed`; `auditVerdictsBlockShip` still STOP on REFUTED |
| AC6 | scoreAndRefine | `classify.cjs --score-analysis`; Step 0 deferral docs in classify + orch skills |
| AC7 | Aggregate telemetry | Untracked `bin/generate-telemetry-aggregate.cjs`; `bin/cli.js` adds `telemetry aggregate` |
| Tests | Wired + green | `package.json` `tests` → `test-install.js && test-quality-gates.js`; suite re-ran **All quality-gates tests passed** (exit 0) |

**Diff footprint (vs baseline):** ~56 paths under ship-scope; substantive AC work concentrated in orch/ship/shared/scripts/cli/tests (+ new classify skill + aggregate script). Broad SKILL.md `version: 0.0.103 → 0.0.104` stamps are package version sync, not feature logic.

## Re-Run Verification Results

- `node test/test-quality-gates.js` → **PASSED** (exit 0) — AC1–AC7 assertions green
- `npm run verify-integrity` → **FAILED** — `packageVersion drift: manifest=0.0.103 package.json=0.0.104`; new hashed paths (`ws-classify-complexity`, `generate-telemetry-aggregate.cjs`) not yet in `bin/skill-integrity.json` skills map
- `package.json` version → already `0.0.104` (bump present; integrity regenerate still required)

## Fraud Audit

- **Weakened Checks:** None detected. New suite adds assertions; dry-run checkpoint soft-pass is intentional (hard-fail when `dryRun` false; documented in validate_state + STEP-DISPATCH; fixed in Step 6 review). No `.skip` / removed assertions found in `test/test-quality-gates.js`.
- **False Completion:** None on AC1–AC7. Delivery result correctly lists integrity regenerate under **Next steps** (not Done). Do not treat integrity as complete until `npm run generate-integrity && npm run verify-integrity` exit 0 in the same ship commit.
- **Scope Creep:** Minor — `ws-self-learning/scripts/self_learning.py` path `shared` → `ws-shared` (hub rename fix, outside AC table but low-risk). Mass SKILL frontmatter version bumps are release hygiene for `0.0.104`.
- **Unauthorized Actions:** None detected (no push/deploy/publish in this audit scope).

## Caveats / Action Items

1. **Integrity regenerate (blocking for upstream ship prepare):** Run `npm run generate-integrity` and confirm `npm run verify-integrity` exit 0 in the same ship commit so `packageVersion` and digests cover classify + aggregate + bumped skills. Planned in delivery result Next steps — acceptable caveat for this Step 8 audit.
2. Complete remaining prepare gate rows (`ws-check-harness` / `ws-check-workflows`) per root `AGENTS.md` before push/PR (outside this fable claim set).

## Binding line

VERDICT: VERIFIED WITH CAVEATS
