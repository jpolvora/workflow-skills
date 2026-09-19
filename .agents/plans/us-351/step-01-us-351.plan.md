---
slug: us-351
title: "change/update/move ws-shared folder location to {projectRoot}/.ws"
status: "plan to be refined"
---

## 0. Summary & Migration Shape (plan-owned)

Spec AC1–AC5 move the consumer shared-data hub root from `{projectRoot}/.agents/skills/ws-shared`
to `{projectRoot}/.ws` with an identical relative tree. Two spec-delegated decisions are fixed here:

1. **Clean cut, no silent dual-path fallback.** Runtime resolution recognizes exactly one project
   default (`.ws`) plus the pre-existing explicit override (`pathTokens.sharedDir` /
   `WORKFLOW_SKILLS_SHARED_DIR`, which stays a configured value, not a fallback). No reader
   probes the legacy path when the new one is absent. Evidence: the harness portability rule
   ("no legacy path aliases, migration shims, or dual defaults") plus spec Design Intent
   ("silent dual-path support is not the default").
2. **One-time installer relocation assist (single documented behavior).** On install/update, when
   a legacy project-local `.agents/skills/ws-shared/` hub holds consumer files and `.ws/` does
   not exist yet, the installer moves the hub file set (consumer-owned + generated-local, same
   list below) to `.ws/` and logs each move. When `.ws/` already exists, the legacy dir is left
   untouched and the installer logs a manual-cleanup note. This is a migrate-once step owned by
   the installer, not a runtime fallback.
3. **SoT stays.** `.agents/skills/ws-shared/` remains the authoring/packaging source of truth for
   managed content (`runtime/`, `templates/`); relative `../ws-shared/…` cross-links between skill
   bodies stay valid and are out of the sweep. Only consumer-hub-denoting references move. The
   upstream repo dogfoods the consumer move: its own hub files relocate to `.ws/` (same file
   list the installer moves), while `runtime/` + `templates/` SoT stay in place.
4. **Committable by default.** The installed `.ws/.gitignore` keeps the current file-level ignore
   list (managed copies, installer metadata, caches, memory/history); the folder itself is never
   ignored (no `.ws` entry in root `.gitignore`, hub template, or installer output).

Rejected: permanent dual-path reads (forbidden by harness rules); pointer-file shim at the old
root (same prohibition, plus AC2 requires a clean grep); moving skill bodies or the SoT tree
(explicitly out of scope in the spec).

## 1. Definition of Ready & Scope

In scope (spec System boundaries): `pathTokens.sharedDir` default, `runtime/hub-layout.json`
prose that names the old root, `config-resolution.md`, `tools.md` path tokens, installer
(`bin/cli.js`, `install-skills.sh` banner text), integrity generation/verification, config GUI
editor (`Edit-WorkflowSkillsConfig.ps1`), the consumer-hub reference sweep across skill bodies /
scripts / docs / site sources, upstream dogfood relocation, and ignore-policy files.

Out of scope (per spec): moving skill bodies (`ws-*`) out of `.agents/skills`; permanent
dual-path support; config schema keys or skill-contract changes (path relocation only).

Measurable ACs: AC1 fixture configure run lists the `.ws` tree; AC2 sweep test asserts zero
non-allowlisted old-path references; AC3 hybrid-matrix install tests resolve the hub from `.ws`;
AC4 `git status` shows `.ws/` as candidate changes and no installer output ignores it; AC5
`npm run generate-integrity` + `npm run verify-integrity` + `test/test-harness-clean.js` exit 0.

## 2. Technical Design & Architecture

Layer edits (config.json layers: skills-sot, installer-cli, tests, docs-site):

- **A. Token defaults (AC2).** `runtime/tools.md` § Path tokens: `{sharedDir}` default
  `{skillsRoot}/ws-shared` → `.ws`; rule 7 ("fixed install layout") reworded so the *default*
  is the new root while the token contract stays fixed-shape; effective-resolution precedence
  stated per the 2026-09-18 token-contract trap. `runtime/config-resolution.md`: Config path
  code fence, Global-execution gate paths, harness-fallback ordered list, precedence matrix
  ranks 1/3/4, path-token table, SCM/Fable sections' config paths → `.ws/...`; global
  `{globalSkillsRoot}/ws-shared/...` fallbacks UNCHANGED. `runtime/config.schema.json` +
  `templates/config.json.example` `pathTokens.sharedDir` default → `.ws`.
- **B. Resolver scripts (AC2/AC3).** `runtime/scripts/resolve_consumer_root.cjs`:
  `HUB_REL` → `.ws`; prose naming the old hub → new root; global-hub join
  (`globalSkillsRoot, 'ws-shared'`) unchanged. Same edit in the pre-existing
  `resolve_consumer_root.py` mirror in place (no new twin per the 2026-08-26 dual-script trap).
- **C. Installer (AC1/AC3/AC4).** `bin/cli.js`: project-hub root constant (`HUB_DIR` mechanics
  and every `path.join(<projectRoot>, '.agents','skills','ws-shared', …)` consumer-hub join)
  retargeted to `.ws`; package-SoT reads (`packageRoot/.agents/skills/ws-shared/runtime/…`)
  UNCHANGED (allowlisted SoT self-reference); hub ensure/seed/migrate/pointer/prune routines
  operate under `.ws/`; one-time `relocateLegacyHub()` step (moves consumer-owned:
  `config.json`, `STACK.md`, `backend.md`, `frontend.md`; generated-local: `AGENTS.md`,
  `autoload.md`, `MEMORY.md`, `memory/`, `CHANGELOG.md`, `config.json.bak`; installer metadata:
  `installed-skills.json`, `skill-integrity-local.json`, `host-capabilities.json`) + log lines;
  console prose (`ws-shared/…` → `.ws/…`). `install-skills.sh` banner text updated.
  `templates/hub.gitignore` content UNCHANGED (file-level ignores), installed as `.ws/.gitignore`.
- **D. Hub manifest (AC2).** `runtime/hub-layout.json`: prose/`hub` naming that binds the hub to
  the old root updated to the new root; root-relative category paths unchanged (they are
  hub-root-relative by design). `installed-skills.json` location follows the hub (`.ws/`).
- **E. Upstream dogfood relocation (AC1/AC2).** `git mv` the 147 tracked consumer hub files
  (hub-root 9: `AGENTS.md`, `autoload.md`, `backend.md`, `CHANGELOG.md`, `config.json`,
  `frontend.md`, `MEMORY.md`, `STACK.md`; `memory/` 138) from `.agents/skills/ws-shared/` to
  `.ws/`; `runtime/` (46) + `templates/` (5) SoT stay. Root `.gitignore` probe-cache line
  `.agents/skills/ws-shared/host-capabilities.json` → `.ws/host-capabilities.json`. This repo's
  own subsequent resolution (config, memory fallback, changelog) follows the new default with
  no override.
- **F. Reference sweep (AC2).** Every live-source consumer-hub-denoting literal
  `.agents/skills/ws-shared` → `.ws` across skill bodies, `bin/`, `scripts/`, root docs
  (`AGENTS.md` layers/resolution tables, `README.md`, `CATALOG.md`, `install-skills.sh`),
  `Edit-WorkflowSkillsConfig.ps1`, `ws-configure-project`, `ws-check-harness` (doc map +
  executable TOKENS mirror together per the token trap), `ws-doctor`, site sources
  (`bin/build-site.js` refs; `docs/index.html` via rebuild, never hand-edited). Untouched:
  relative `../ws-shared/` SoT links; `{globalSkillsRoot}/ws-shared` fallbacks; history
  (`.agents/plans/`, `.agents/specs/`, changelogs, `ws-shared/MEMORY.md` content lines now
  living under `.ws/memory/`); the relocation code's own legacy-path constant. Residual hits
  recorded with path + reason in the sweep report (retired-sweep trap convention).
- **G. Tests (AC1–AC5).** Update path assertions in `test/test-install.js`,
  `test/test-autoload-configure.js`, `test/test-runtime-portability.js`,
  `test/test-workflow-state-contract.js`, `test/test-wiki.js`, `test/test-ac-ledger.js`,
  `test/test-external-companion-skills.js`, `test/test-harness-benchmark.js`,
  `test/test-research-pipeline-quality.js`, `test/test-ws-doctor.js`, `test/test-doc-sync.js`,
  `test/test-min-verify-score.js`, `test/test-convergence-gates.js`, and any other failing
  surface; `test/.agents/` fixtures regenerate through the installer under test (no hand-built
  `.ws` fixtures); new/updated sweep test encodes the AC2 allowlist (stale-reference negative,
  global-only-resolving-old-path negative, installer-ignores-`.ws` negative).
- **H. Site + version (ship).** `node bin/build-site.js` rebuild (docs card/install sections
  touching the hub path); `package.json` version bump per the ship rule (branch version must
  exceed merge-base) with `packageVersion` alignment in `bin/skill-dependencies.json`;
  `npm run generate-integrity` + `npm run verify-integrity` from a clean tree (integrity trap:
  untracked skill-tree files moved aside first).
- **I. Interviews/compat notes.** `ws-spec-memo` INTEGRATION.md + `ws-configure-project`
  `--section specMemo` paths that name the old hub; `.cursor/` local authoring refs only where
  they denote the consumer hub (never as shipped defaults).

No provider or SCM intent changes. No new network/auth surface.

## 3. Step-by-Step Plan

1. Init `ac-ledger.json`; build `.runtime/plan.index.json`. Check: pre-advance 1 passes.
2. Layers A–B (token defaults + resolvers). Check: grep new default present in all five files.
3. Layer C–D (installer relocation + manifest). Check: fixture install writes `.ws/` tree (AC1
   signal) and relocates a legacy-hub fixture (migration signal).
4. Layer E (dogfood `git mv` + root `.gitignore` line). Check: `git status` shows renames;
   repo config still loads from `.ws/config.json`.
5. Layer F (mechanical sweep + allowlist report). Check: sweep script zero non-allowlisted hits.
6. Layer G (tests green incl. new sweep negatives). Check: touched-area `npm run test` subset.
7. Layer H (site rebuild, version bump, integrity regen from clean tree). Check: AC5 triple
   green (`generate-integrity`, `verify-integrity`, `test-harness-clean.js` exit 0).
8. Steps 5–8: verify report (score), review + fix loop, testing report, delivery commit + PR.

## 4. Permissions, Tenancy & i18n

N/A — no RBAC, no tenant data, no UI strings. Installer relocation moves local files only
(never deletes: legacy dir left in place when `.ws/` pre-exists); en-us prose throughout.
Destructive-file risk is bounded by move-not-delete plus the logged manual-cleanup note.

## 5. Test Coverage

- AC1 → fixture configure/install run lists `.ws/` tree (config + runtime + templates present);
  relocation sub-case: legacy-hub fixture ends with consumer files under `.ws/`.
- AC2 → sweep test: repo-wide grep for old project-path segments returns only the committed
  allowlist (SoT self-refs, global-hub contexts, relocation constant, history).
- AC3 → hybrid matrix (local-only, global-only, both): hub resolves from `.ws`; project hub
  wins whenever present; absent project hub falls back to global only.
- AC4 → installer output contains no `.ws` ignore; `git status --porcelain` on a fixture shows
  `.ws/` as candidate changes; installed `.ws/.gitignore` still ignores generated files.
- AC5 → `generate-integrity` + `verify-integrity` + `test-harness-clean.js` exit 0 on new layout.
- Negatives (spec §): non-allowlisted old-path reference fails the sweep; global-only install
  resolving a project hub from the old location fails; installer run that git-ignores `.ws`
  fails; integrity verification against the old manifest fails after regeneration.

## 6. Stack & Security Invariants Verification Plan

Touched framework boundaries: Node installer/CLI (`bin/cli.js`) and resolver helpers
(`resolve_consumer_root.cjs/.py`) — sync fs moves/copies only, no new network calls, no auth
endpoints, no DTOs, no subscriptions, no migrations. Invariants from config.json.invariants:
all false except `commitPlanFilesOnlyAtStep8` (honored: product files G2 after Step 5/6, plan
artifacts only at Step 8 delivery). Script hygiene per tools.md: explicit `node` launcher for
every managed-script invocation; no shell-outs added (relocation uses fs ops inside `cli.js`);
relocation input (legacy dir listing) treated as data — allowlisted filename set, no eval, no
path traversal outside the two hub roots. Powershell edits obey the shell-file-ops trap (file
editing tools only, `;` chaining). `scan_stack_invariants.cjs` runs at implement time.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (SoT `runtime/`+`templates/` unmoved; consumer hub under `.ws/`).
- [ ] No permanent dual-path reads or pointer shims (clean-cut + one-time relocation only).
- [ ] File-level ignore split preserved (generated content still ignored, folder committable).
- [ ] Global-hub fallback paths unchanged; hybrid precedence intact.
- [ ] Stack & security invariants verified (§6).
- [ ] Test cases cover all ACs incl. negatives (§5).
- [ ] Version bump + integrity regen from clean tree (§3 step 7).

## 8. Open Questions

- Relocation collision: legacy hub present AND `.ws/` present — default is leave-both + log
  manual-cleanup note (no auto-merge, no delete). Interview to confirm or push back.
- Global hub (`{globalSkillsRoot}/ws-shared`) unchanged — default yes; interview to confirm.
- Dogfood move includes tracked `memory/` history (138 files) — default yes (preserves legacy
  fallback chain under the new root); interview to confirm.
- `docs/index.html` regenerated by build-site (never hand-edited) — default yes; confirm.
