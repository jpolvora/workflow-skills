---
slug: us-90
title: "Fix skill integrity mismatch (EOL-canonical digests)"
status: "plan refined ok"
---

## 0. Summary & Business Rules

**Objective:** Make skill-integrity digests identical on Windows CRLF working trees, Linux/CI LF trees, GitHub source tarballs, and consumer `npx github:jpolvora/workflow-skills` installs, so install/update succeeds without `--force-integrity`.

**Root cause (verified; fold into fix):**

| Fact | Evidence |
|------|----------|
| Hasher uses raw on-disk bytes | `bin/skill-integrity-lib.js` L4: "Hash file bytes as stored (no EOL rewrite)." `enumerateSkillFiles` / `enumerateHubFiles` → `sha256Hex(fs.readFileSync(...))` |
| Windows `core.autocrlf=true` | Working-tree `.agents/skills/**/*.md` (and most text) are CRLF; git blobs / GitHub tarball are LF |
| `.gitattributes` does not cover hashed text | Repo `.gitattributes` only sets `eol=lf` for `*.sh` and `*.py`; hashed inventory is mostly `.md` / `.js` / `.json` / templates → autocrlf still rewrites them |
| False green on author machine | `npm run verify-integrity` passes on develop Windows WT (hashes CRLF) |
| False red for consumers / clean LF | Fresh checkout / GitHub tarball of `main` fails `--check` (LF ≠ CRLF-hashed manifest) |
| Symptom = issue 90 | Universal `digest-mismatch` before any skill copy |
| History | PR #88 shipped integrity; issue filed after merge when consumers still fail |

**Business / security rules:**

1. Canonical hash input = **LF-normalized file bytes** before SHA-256. Generate and verify share one function (no drift).
2. Fail closed on source/consumer digest mismatch unless `--force-integrity` (unchanged).
3. Enumeration / skip / hub whitelist rules stay as today (MEMORY: pack-align `hub.gitignore`, skip `runs/`; never bless failed post-verify by writing actual digests).
4. Manifest regenerate + commit in same change set as hasher fix; bump package when shipping package content (root `AGENTS.md` § Upstream PR version bump + integrity regenerate).
5. Do not treat "regenerate only" as the fix: regenerating on Windows without LF-canonicalization would re-poison the manifest for LF consumers.

**MEMORY applied:** Integrity pack alignment; never bless failed post-verify; regenerate after skill/hub changes; script/skill preflight (LF for `.sh`); Node for integrity logic; no silent managed-skill refactors beyond the integrity path; build-site bump must sync `test/package.json` tarball path.

## 1. Definition of Ready & Scope

**Assumptions (resolved):**

- Stack = Node 22 ESM CLI (`bin/cli.js`) + Markdown skills. No DB, no product frontend, no RBAC/tenancy/i18n product layers.
- `{plansDir}` = `specs` in this repo; plan/spec under `specs/us-90/` are workflow artifacts (do not `git add` `{plansDir}/` at ship).
- Issue listed no ACs; ACs below are the contract for Steps 4–7.
- Binary skill assets are not in the hashed set today (Glob under `.agents/skills`: zero `png|jpg|gif|wasm|bin|woff|ico`). LF normalize is safe for current inventory; if a true binary is later hashed, revisit (out of scope unless discovered).

**In scope:**

- LF-canonical hashing in `skill-integrity-lib.js` (single choke point used by generate, `--check`, install pre-copy, post-copy, `integrity` audit)
- Regenerate + commit `bin/skill-integrity.json`
- Regression test: same logical content with CRLF vs LF bytes → identical digests; LF tree `--check` green
- Doc touch: comment/header in lib; one sentence in root `AGENTS.md` § Upstream skill integrity regenerate that digests are LF-canonical (EOL-stable). Skip README edit for v1 (Safety already covers regenerate / fail-closed; Phase 0b markers live in `AGENTS.md`)
- Package bump + `test/package.json` tarball path sync if this PR ships package content
- Confirm existing fail-closed gates still run (`verify-integrity`, check-harness Phase 3, `verify.sh`, test Phase 0b / Phase 11)

**Out of scope:**

- Changing include/skip rules, hub whitelist, dependency graph, or `--force-integrity` semantics
- Re-hashing consumer-owned hub files
- Publisher signing / Sigstore
- Unrelated skill body refactors or host product names in skills
- Forcing git `autocrlf` / rewriting every skill file on disk to LF
- Tightening `.gitattributes` for `*.md` / `*.js` (optional hardening; **skipped for v1** — hashing fix is sufficient)
- Git blob hashing (**rejected for v1** — consumer tarball has no `.git`)

**Acceptance Criteria:**

| ID | Criterion |
|----|-----------|
| **AC1** | `npm run verify-integrity` / `generate-skill-integrity.js --check` succeeds on LF trees (Linux CI, GitHub tarball / clean checkout) **and** on Windows CRLF working trees, producing the **same** per-file and `fullPackageDigest` values for the same commit content. |
| **AC2** | Consumer install of published/packed source (no `--force-integrity`) completes source integrity verify and proceeds to copy. |
| **AC3** | `npm run generate-integrity` and `npm run verify-integrity` use the same LF-canonicalization (one shared helper; no generate-only vs check-only path). |
| **AC4** | CI / harness remain fail-closed on digest drift: Phase 0b `--check`, check-harness Phase 3, `verify.sh` integrity gate still exit ≠0 when manifest stale or tree tampered. |
| **AC5** | After hasher change: `bin/skill-integrity.json` regenerated and committed in the same change set; if packaging ships, `package.json` patch-bumped (`npm run build-site:bump`) and `test/package.json` tarball path synced. |

## 2. Technical Design & Architecture

### Layers (this repo)

| Layer | Path | Changes |
|-------|------|---------|
| **cli / integrity** | `bin/skill-integrity-lib.js` | Add `canonicalizeForHash(buf)` + `hashFileBytes(buf)`; route file-hash sites through it; update header comment |
| **generator** | `bin/generate-skill-integrity.js` | **No logic change** — only calls `buildUpstreamManifest` / `stableStringify` (confirmed) |
| **manifest** | `bin/skill-integrity.json` | Regenerate after hasher change (all per-file digests will change vs CRLF-poisoned baseline) |
| **installer** | `bin/cli.js` | **No behavioral change** — verify path uses lib `buildSkillEntry` / `buildHubEntry` / `verifyClosure` (same enumerate → hash) |
| **tests** | `test/test-install.js` (Phase 11 or adjacent) | EOL canonicalization regression |
| **docs** | `AGENTS.md` | One sentence: digests are LF-canonical / EOL-stable (keep existing Phase 0b marker strings) |
| **packaging** | `package.json`, `test/package.json`, `docs/index.html` | Bump + stamp when shipping |

**Frontend / DB / RBAC / i18n:** N/A.

### Design (locked)

```text
readFileSync → canonicalizeForHash (EOL→LF) → sha256Hex → files map / digests
```

**Canonicalization algorithm (locked):**

1. Replace `\r\n` → `\n`
2. Replace any remaining `\r` → `\n` (defense in depth for lone CR)
3. Do **not** rewrite files on disk; only the buffer used for hashing

**Choke-point placement (locked):**

- Export `canonicalizeForHash(buf)` → `Buffer` (UTF-8-safe byte replace; operate on `Buffer`, not string split).
- Export `hashFileBytes(buf)` = `sha256Hex(canonicalizeForHash(buf))`.
- Call `hashFileBytes` only at **file enumeration** sites (`enumerateSkillFiles` L142, `enumerateHubFiles` L178).
- Leave `sha256Hex` as raw crypto for `digestFromFilesMap` / `aggregateDigest` (those already build LF-only synthetic payloads from hex digests).
- Rationale: AC3 satisfied because generate + `--check` + install verify all go through `enumerate*` → `hashFileBytes`; aggregate digests stay pure; future binary via raw `sha256Hex` is not silently mutated.

**Comment update:** Replace "no EOL rewrite" with "canonicalize line endings to LF before hashing file bytes (EOL-stable digests)."

### Invariant checks (`config.json.invariants`)

Apply only repo-relevant invariants: no inventing product layers; keep surgical scope; do not commit `{plansDir}/` workflow artifacts at ship.

## 3. Step-by-Step Plan

### Step A — Hash canonicalize (cli)

- **Action:** In `bin/skill-integrity-lib.js`, add `canonicalizeForHash` + `hashFileBytes`; switch the two file-read hash call sites; update module header comment. Keep algorithm `sha256`, lowercase hex, stable JSON order.
- **Files:** `bin/skill-integrity-lib.js`
- **Checks:** `node --check bin/skill-integrity-lib.js`; unit assertion CRLF vs LF same digest; lone `\r` also matches LF.

### Step B — Regenerate manifest

- **Action:** `npm run generate-integrity` then `npm run verify-integrity` (must exit 0). Stage `bin/skill-integrity.json` with the hasher change.
- **Files:** `bin/skill-integrity.json`
- **Checks:** `--check` green on WT; fixture proves LF-equivalent digest matches committed file hashes for a sample path.

### Step C — Regression tests

- **Action:** Extend Phase 11 (or small helper test in `test-install.js`) with:
  1. `canonicalize` / `hashFileBytes`: identical content CRLF vs LF vs lone-CR → same hex.
  2. Existing AC11 / Phase 0b `--check` still green.
  3. Optional smoke: temp dir with LF copies vs committed manifest using lib verify → ok.
- **Files:** `test/test-install.js` (minimal edit)
- **Checks:** `npm run tests -- --local` (or targeted phase if available).

### Step D — Docs + fail-closed confirmation

- **Action:** Document LF-canonical digests in root `AGENTS.md` § Upstream skill integrity regenerate (one line adjacent to regenerate bullets). Confirm check-harness Phase 3 / `verify.sh` / Phase 0b still require `--check` (no gate removal). Do **not** edit README for v1.
- **Files:** `AGENTS.md`
- **Checks:** Grep markers already asserted by Phase 0b still present (`Upstream skill integrity regenerate`, `npm run generate-integrity`, `npm run verify-integrity`, `bin/skill-integrity.json`).

### Step E — Package bump (ship prep)

- **Action:** Because hashed install content + lib change: `npm run build-site:bump`; sync `test/package.json` `file:../workflow-skills-<ver>.tgz`; commit bump with the fix (at Step 8, not in this plan-only step).
- **Files:** `package.json`, `docs/index.html`, `test/package.json`
- **Checks:** Footer version == `package.json`; `npm run verify-integrity` after bump (manifest `packageVersion` refreshed by generate).

### Dependency order

A → B → C → D → E (E at ship; A–D in implement).

## 4. Permissions, Tenancy & i18n

N/A — no product RBAC, tenancy, or i18n surfaces. Install integrity is repo/CLI trust only (unsigned manifest boundary unchanged from PR #88).

## 5. Test Coverage

| AC | Test case / method | Proof |
|----|--------------------|-------|
| AC1 | `testEolCanonicalDigestParity` | Hash CRLF buffer == hash LF buffer == hash lone-CR buffer; `--check` green on CRLF WT; LF fixture tree verifies vs regenerated manifest |
| AC2 | `testSourceInstallWithoutForce` (existing Phase 11 pack/install path) | Install from packed/local source without `--force-integrity` exits 0 for source gate |
| AC3 | Shared `hashFileBytes` + generator idempotent | Generate twice identical; generate/check both call same enumerate → `hashFileBytes` |
| AC4 | Phase 0b `--check` + check-harness markers + tamper exit ≠0 (existing Phase 11) | Drift/tamper still fails; gates not weakened |
| AC5 | Manifest committed + version bump checklist | `skill-integrity.json` in same PR as lib; `packageVersion` matches `package.json` after bump |

## 6. Invariants (Do Not Violate)

- Surgical: touch integrity hash path + tests + minimal docs; no skill body rewrites, no installer redesign.
- Pack alignment preserved (`hub.gitignore`, skip `runs/`, consumer-owned exclusions).
- Never write `skill-integrity-local.json` from actual digests on failed post-verify.
- Do not `git add` `specs/` / `{plansDir}/` workflow artifacts at ship.
- Portability: no host product names in skill bodies if any skill file is touched (prefer not touching skills).
- Fail closed: no documenting `--force-integrity` as the upstream fix for this bug.

## 7. Pre-PR Checklist

- [ ] LF-canonical `hashFileBytes` in shared lib; comment updated.
- [ ] `bin/skill-integrity.json` regenerated and committed with hasher change.
- [ ] AC1–AC5 covered by tests / gates listed in §5.
- [ ] `npm run verify-integrity` exit 0; `npm run tests -- --local` green.
- [ ] Package bump + `test/package.json` tarball sync when shipping.
- [ ] No `{plansDir}/` / `specs/us-90/*` committed.
- [ ] Layer boundaries respected (cli/tests/docs only).
- [ ] N/A: schema migrations, authorization, i18n keys.

## 8. Open Questions

_None remaining — interview closed all items:_

| # | Question | Resolution |
|---|----------|------------|
| 1 | Lone `\r` normalization | **Accepted:** `\r\n` → `\n`, then remaining `\r` → `\n` |
| 2 | Git blob hashing | **Rejected for v1** (consumer tarball has no git; LF-canonicalize matches published LF) |
| 3 | Tighten `.gitattributes` | **Skip for v1** (hashing fix sufficient; note current attrs only cover `.sh`/`.py`) |

## Interview registry

| id | class | section | gap | recommendation | status | resolution | dependsOn |
|----|-------|---------|-----|----------------|--------|------------|-----------|
| G1 | blocking | §8 Q1 | Lone `\r` normalize ambiguity | `\r\n` then remaining `\r` → `\n` | resolved | Auto-accepted plan recommendation | |
| G2 | non-blocking | §8 Q2 | Git blob hashing alternative | Reject for v1 | resolved | Closed; consumer pack has no `.git` | |
| G3 | non-blocking | §8 Q3 | Further `.gitattributes` hardening | Skip for v1 | resolved | Auto-skip; `.gitattributes` today only `*.sh`/`*.py` — hashing fix closes AC1–AC2 | |
| G4 | blocking | §2 | Where to place canonicalize (`sha256Hex` vs file-only wrapper) | `hashFileBytes` at enumerate sites only | resolved | Code: only L142/L178 hash file bytes; aggregate uses synthetic LF — keep `sha256Hex` raw | |
| G5 | non-blocking | §1 | Binary hashed assets risk | Confirm inventory empty | resolved | Glob `.agents/skills` for binary extensions → 0 files; LF normalize safe | |
| G6 | non-blocking | §2 | Generator / CLI separate hash paths | Confirm single choke | resolved | `generate-skill-integrity.js` only `buildUpstreamManifest`; cli verify uses lib `build*Entry` / `verifyClosure` | |
| G7 | non-blocking | §3 D | README vs AGENTS doc touch | AGENTS.md only for v1 | resolved | Phase 0b markers in AGENTS; README Safety already adequate; skip README to stay surgical | |
| G8 | non-blocking | §0 | Why `.md`/`.js` still CRLF on Windows | Document attrs gap | resolved | Evidence folded into §0 root-cause table; out-of-scope to expand attrs in v1 | |
