---
slug: us-90
title: "Fix skill integrity mismatch (EOL-canonical digests)"
status: "plan to be refined"
---

## 0. Summary & Business Rules

**Objective:** Make skill-integrity digests identical on Windows CRLF working trees, Linux/CI LF trees, GitHub source tarballs, and consumer `npx github:jpolvora/workflow-skills` installs, so install/update succeeds without `--force-integrity`.

**Root cause (verified; fold into fix):**

| Fact | Evidence |
|------|----------|
| Hasher uses raw on-disk bytes | `bin/skill-integrity-lib.js` header: "Hash file bytes as stored (no EOL rewrite)." `sha256Hex(fs.readFileSync(...))` |
| Windows `core.autocrlf=true` | Working-tree `.agents/skills/**/*.md` are CRLF; git blobs / GitHub tarball are LF |
| False green on author machine | `npm run verify-integrity` passes on develop Windows WT (hashes CRLF) |
| False red for consumers / clean LF | Fresh checkout / GitHub tarball of `main` fails `--check` (LF ≠ CRLF-hashed manifest); same `fullPackageDigest` on develop+main manifests |
| Symptom = issue 90 | Universal `digest-mismatch` before any skill copy |
| History | PR #88 shipped integrity; issue filed after merge when consumers still fail |

**Business / security rules:**

1. Canonical hash input = **LF-normalized file bytes** (replace `\r\n` → `\n` before SHA-256). Generate and verify share one function (no drift).
2. Fail closed on source/consumer digest mismatch unless `--force-integrity` (unchanged).
3. Enumeration / skip / hub whitelist rules stay as today (MEMORY: pack-align `hub.gitignore`, skip `runs/`; never bless failed post-verify by writing actual digests).
4. Manifest regenerate + commit in same change set as hasher fix; bump package when shipping package content (root `AGENTS.md` § Upstream PR version bump + integrity regenerate).
5. Do not treat "regenerate only" as the fix: regenerating on Windows without LF-canonicalization would re-poison the manifest for LF consumers.

**MEMORY applied:** Integrity pack alignment; never bless failed post-verify; regenerate after skill/hub changes; script/skill preflight (LF for `.sh`); Node for integrity logic; no silent managed-skill refactors beyond the integrity path.

## 1. Definition of Ready & Scope

**Assumptions (resolved):**

- Stack = Node 22 ESM CLI (`bin/cli.js`) + Markdown skills. No DB, no product frontend, no RBAC/tenancy/i18n product layers.
- `{plansDir}` = `specs` in this repo; plan/spec under `specs/us-90/` are workflow artifacts (do not `git add` `{plansDir}/` at ship).
- Issue listed no ACs; proposed ACs below become the contract for Steps 4–7.
- Binary skill assets are not in the hashed set today (text: `.md`, `.js`, `.cjs`, `.py`, `.json`, `.yaml`, templates). LF normalize is safe for current inventory; if a true binary is later hashed, revisit (out of scope unless discovered).

**In scope:**

- LF-canonical hashing in `skill-integrity-lib.js` (single choke point used by generate, `--check`, install pre-copy, post-copy, `integrity` audit)
- Regenerate + commit `bin/skill-integrity.json`
- Regression test: same logical content with CRLF vs LF bytes → identical digests; LF tree `--check` green
- Doc touch: comment/header in lib; brief note in root `AGENTS.md` integrity section and/or README Safety that digests are LF-canonical (EOL-stable)
- Package bump + `test/package.json` tarball path sync if this PR ships package content
- Confirm existing fail-closed gates still run (`verify-integrity`, check-harness Phase 3, `verify.sh`, test Phase 0b / Phase 11)

**Out of scope:**

- Changing include/skip rules, hub whitelist, dependency graph, or `--force-integrity` semantics
- Re-hashing consumer-owned hub files
- Publisher signing / Sigstore
- Unrelated skill body refactors or host product names in skills
- Forcing git `autocrlf` / rewriting every skill file on disk to LF (hashing fix is enough; `.gitattributes` already aims at LF for managed text)

**Acceptance Criteria (proposed; issue had none):**

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
| **cli / integrity** | `bin/skill-integrity-lib.js` | Add `canonicalizeForHash(buf)` → LF; route all hash sites through it; update file comment |
| **generator** | `bin/generate-skill-integrity.js` | No logic change if it only calls lib (confirm) |
| **manifest** | `bin/skill-integrity.json` | Regenerate after hasher change |
| **installer** | `bin/cli.js` | No behavioral change if it uses lib verify helpers |
| **tests** | `test/test-install.js` (Phase 11 or adjacent) | EOL canonicalization regression |
| **docs** | `AGENTS.md` (± README Safety) | One sentence: digests are LF-canonical / EOL-stable |
| **packaging** | `package.json`, `test/package.json`, `docs/index.html` | Bump + stamp when shipping |

**Frontend / DB / RBAC / i18n:** N/A.

### Design (surgical)

```text
readFileSync → canonicalizeForHash (CRLF→LF) → sha256Hex → files map / digests
```

- Prefer implementing canonicalize **inside** `sha256Hex` or a thin wrapper used by both `enumerateSkillFiles` and `enumerateHubFiles` so CLI and generator cannot diverge (AC3).
- Do **not** rewrite files on disk; only normalize the buffer used for hashing.
- Replace PR #88 locked phrase "no EOL rewrite" with "canonicalize line endings to LF before hash (EOL-stable digests)."
- After code change: `npm run generate-integrity` then `npm run verify-integrity` on the author machine (CRLF WT) must pass; then validate LF equivalence via unit fixture (Buffer with `\r\n` vs `\n`).

### Invariant checks (`config.json.invariants`)

Apply only repo-relevant invariants: no inventing product layers; keep surgical scope; do not commit `{plansDir}/` workflow artifacts at ship.

## 3. Step-by-Step Plan

### Step A — Hash canonicalize (cli)

- **Action:** In `bin/skill-integrity-lib.js`, normalize `\r\n` → `\n` on buffers before SHA-256 (all enumerate/hash call sites). Update module header comment. Keep algorithm `sha256`, lowercase hex, stable JSON order.
- **Files:** `bin/skill-integrity-lib.js`
- **Checks:** `node --check bin/skill-integrity-lib.js`; unit assertion CRLF vs LF same digest.

### Step B — Regenerate manifest

- **Action:** `npm run generate-integrity` then `npm run verify-integrity` (must exit 0). Stage `bin/skill-integrity.json` with the hasher change.
- **Files:** `bin/skill-integrity.json`
- **Checks:** `--check` green on WT; fixture proves LF-equivalent digest matches committed file hashes for a sample path.

### Step C — Regression tests

- **Action:** Extend Phase 11 (or small helper test in `test-install.js`) with:
  1. `canonicalize` / hash: identical content CRLF vs LF → same hex.
  2. Existing AC11 / Phase 0b `--check` still green.
  3. Optional smoke: pack or simulate GitHub-LF tree (temp dir with LF copies) vs committed manifest using lib verify → ok.
- **Files:** `test/test-install.js` (minimal edit)
- **Checks:** `npm run tests -- --local` (or targeted phase if available).

### Step D — Docs + fail-closed confirmation

- **Action:** Document LF-canonical digests in root `AGENTS.md` § Upstream skill integrity regenerate (one line). Confirm check-harness Phase 3 / `verify.sh` / Phase 0b still require `--check` (no gate removal). Optionally one README Safety sentence if integrity subsection exists.
- **Files:** `AGENTS.md` (± `README.md`)
- **Checks:** Grep markers already asserted by Phase 0b still present; add EOL mention only if it does not break existing string asserts (prefer `AGENTS.md` wording adjacent to regenerate bullets).

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
| AC1 | `testEolCanonicalDigestParity` | Hash CRLF buffer == hash LF buffer; `--check` green on CRLF WT; LF fixture tree verifies vs regenerated manifest |
| AC2 | `testSourceInstallWithoutForce` (existing Phase 11 pack/install path) | Install from packed/local source without `--force-integrity` exits 0 for source gate |
| AC3 | Shared helper coverage + generator idempotent | Generate twice identical; generate/check both call same `sha256Hex`/`canonicalize` |
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

- [ ] LF-canonical hash in shared lib; comment updated.
- [ ] `bin/skill-integrity.json` regenerated and committed with hasher change.
- [ ] AC1–AC5 covered by tests / gates listed in §5.
- [ ] `npm run verify-integrity` exit 0; `npm run tests -- --local` green.
- [ ] Package bump + `test/package.json` tarball sync when shipping.
- [ ] No `{plansDir}/` / `specs/us-90/*` committed.
- [ ] Layer boundaries respected (cli/tests/docs only).
- [ ] N/A: schema migrations, authorization, i18n keys.

## 8. Open Questions

1. **Lone `\r` (old Mac):** Normalize only `\r\n` → `\n`, or also strip remaining `\r`? **Recommendation:** replace `\r\n` then remaining `\r` → `\n` for defense in depth (still text-safe). Confirm in interview if preferred narrower.
2. **Git blob hashing instead of WT normalize?** Rejected for v1: consumer tarball has no git; LF-canonicalize matches published LF bytes without requiring git.
3. **Should `.gitattributes` be tightened further?** Optional hardening only; not required to close AC1–AC2 if hashing is LF-canonical.
