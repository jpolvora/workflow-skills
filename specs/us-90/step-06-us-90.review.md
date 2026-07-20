---
us: us-90
reviewDate: 2026-07-20
base: d0f005059a41e65892bc954c03e1415808770312
head: 58479c19cf0421d505c71d5b041bb7da6bd6f7b8
anchor: uswf/us-90-20260720T191159Z/before-step-6
reviewer: ws-code-review / cursor-grok-4.5
seniorDeveloper: portable-checklist (rules.seniorDeveloper empty)
stack: node-skills-hub (bin + test)
scope:
  - bin/skill-integrity-lib.js
  - bin/skill-integrity.json
  - test/test-install.js
  - AGENTS.md
  - package.json
  - test/package.json
  - docs/index.html
  - bin/cli.js (incidental help)
excluded: pre-existing dirty docs/index.html (preExistingDirty); workflow artifacts under specs/us-90/
---

# Code review — us-90 (Step 6)

## Diff scope

`d0f0050...58479c1` (8 files). Focus: LF-canonical integrity hashing + regenerated manifest + package bump 0.0.65 + EOL parity test. Portable checklist: correctness of EOL canonicalize choke point, fail-closed gates preserved, MEMORY integrity traps, AC1–AC5 lockstep.

## Triage / investigate summary

Hypotheses checked with Evidence → Failure Scenario → Missing Protection → Discards:

| Hypothesis | Result |
|------------|--------|
| Enumerate sites still hash raw bytes (bypass canonicalize) | **Discarded** — only `enumerateSkillFiles` L171 and `enumerateHubFiles` L207 hash files; both call `hashFileBytes` |
| Aggregate digests double-canonicalize / diverge | **Discarded** — `digestFromFilesMap` / `aggregateDigest` correctly keep raw `sha256Hex` on synthetic LF digest-line maps (locked design) |
| CRLF WT digests ≠ LF git blob / manifest | **Discarded** — `caveman/SKILL.md`: WT 3253B (has CR) vs blob 3192B (LF-only) → same `hashFileBytes` digest `0daaea40…`; matches manifest |
| Post-verify still blesses failed local record | **Discarded** — `postVerifyAndWriteLocal` unchanged; write only on OK or `--force-integrity` |
| Abs-path `memory` skip regression | **Discarded** — no `pathParts.includes('memory')` in `bin/` |
| Package / footer / test tarball / manifest version drift | **Discarded** — all `0.0.65`; `npm run verify-integrity` OK |
| Incomplete EOL algorithm (lone CR / CRLF) | **Discarded** — unit parity + `canonicalizeForHash` equals LF buffer |

Retained Critical/Warning: **none**.

## MEMORY Review Patterns

`MEMORY.md` has no `## Review Patterns` section. Pattern sweep: N/A.

Applied related High traps:

- **Integrity — npm never packs .gitignore; skip runs/** — not regressed (enumeration/skip untouched).
- **Integrity — never bless failed post-verify with actual digests** — write gate intact.
- **Script/skill authoring preflight (CRLF)** — hasher is Node Buffer EOL normalize (correct for this bug class); no new `.sh` CRLF risk.
- **build-site bump must sync test tarball path** — `test/package.json` → `workflow-skills-0.0.65.tgz`.

## Invariants

| Check | Result |
|-------|--------|
| Tenancy / EF / i18n | N/A (stack) |
| Surgical scope vs refined plan | OK (hasher + regen + test + AGENTS + bump); incidental `cli.js` help only |
| Consumer-owned never hashed | OK (unchanged skip rules) |
| Fail-closed integrity | OK (`verify-integrity` exit 0; force semantics unchanged) |
| Commit `{plansDir}/` only at Step 8 | OK (review artifact local) |

---

## Critical

*(none)*

---

## Warning

*(none)*

---

## Nit

### N1 — Incidental CLI help line outside plan scope

- **path:** `bin/cli.js:L828`
- **score:** 1/10
- **Note:** Adds curl uninstall example to `--help`. Harmless README alignment; not required by us-90 ACs. No fix required for advance.

### N2 — Site blank-line churn in `docs/index.html`

- **path:** `docs/index.html` (build-site stamp)
- **score:** 1/10
- **Note:** Extra blank lines alongside footer `v0.0.65`. Cosmetic; ignore.

---

## Verdict

**Clean** — no Critical/Warning. Recommend **Advance to Step 7** (autoMode: no fix substep).

## Apply fixes?

**No** — nothing fixable at Critical/Warning. Nits optional; skip under auto.

## Evidence log

| Check | Result |
|-------|--------|
| HEAD / anchor | `58479c1` |
| `hashFileBytes` choke point | L60–62; used at L171, L207 only |
| Algorithm | `\r\n`→`\n`, then lone `\r`→`\n`; Buffer ops; no disk rewrite |
| EOL parity (buffers) | CRLF = LF = lone-CR |
| WT vs git blob same digest | yes (`caveman/SKILL.md`) |
| Manifest match | yes |
| `npm run verify-integrity` | OK v0.0.65 |
| Phase 11 EOL test | present `test/test-install.js` ~L1214–L1230 |
| AGENTS LF-canonical sentence | present § Upstream skill integrity regenerate |
