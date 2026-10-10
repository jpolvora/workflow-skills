---
id: 497
slug: us-497-link-integrity
title: "Link integrity across install scopes: scope-aware gate classification and complete installer autoload link rewriting"
source: github
specDate: 2026-10-09
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/497"
---

# Specification — Link integrity across install scopes

**State:** open

## Description

This specification restores **one link-integrity contract across install scopes**: the deterministic Phase 5a link gate must fail only on links that are genuinely broken in the layout it is auditing, and the installer must not ship a broken link in the first place. The two root causes are the two halves of that contract, and fixing one half must not cancel the other.

- **False red in the gate (#496).** `check_harness_links.cjs` resolves every plain relative target as `path.resolve(path.dirname(file), decoded)`. The root-anchored fallback is gated by `TOP_LEVEL`, which lists `.agents`, `.github`, `bin`, `docs`, `scripts`, `specs`, and `test` but not `.ws`, so a project-hub literal has no second resolution root. The `analyze()` pass keeps only `context.skillsRoot` from `resolveConsumerContext()` and never reads `context.executionScope` or project-hub presence. Hub-routing literals such as `../../../.ws/AGENTS.md`, `../../../../.ws/config.json`, and the seeded `ws-shared/STACK.md -> AGENTS.md` therefore land in `brokenLinks`; because `findings` is the sum of five buckets and `ok` is `total === 0`, a global-only install can never reach exit 0.
- **Genuine breakage in the installed artifact (#493).** `.agents/skills/ws-shared/runtime/autoload.md` links its runtime sibling with the bare target `](host-capability-tokens.md)` at lines 13 and 48 — a valid same-directory link at the source path, where both files sit inside `runtime/`. The installer relocates that file to the hub root and rewrites bare targets through a hardcoded runtime-filename allow-list (`AGENTS.md`, `CROSS-PLATFORM.md`, `config-resolution.md`, `gates.md`, `host-dispatch.md`, `scm-provider-contract.md`, `setup.md`, `tools.md`); `host-capability-tokens.md` is not in it, while `{skillsRoot}/ws-shared/runtime/host-capability-tokens.md` does ship. The bare target survives relocation and resolves to nothing.

**The boundary this merge must make explicit.** #496 asks the gate to tolerate hub-routing literals on a global-only install; #493 requires a genuinely broken link to keep failing the gate. A rule that suppresses an unresolvable link inside the installed `ws-shared/autoload.md` satisfies #496's wording while destroying #493's defect. The merged rule separates two classes that are never interchangeable:

| Class | Example | Required outcome |
|-------|---------|------------------|
| Hub-routing literal naming a depth-1 hub binding file that resolves in either resolved hub directory (the project hub `{sharedDir}` or the resolved skills install's `ws-shared` hub) | `../../../.ws/AGENTS.md`, `ws-shared/STACK.md -> AGENTS.md` | Install-layout note only while `installScope` is global and the project hub is absent; never under `findings.brokenLinks` once the target resolves, in any layout |
| Any other unresolvable target, including a runtime sibling the installer left unrewritten | `ws-shared/autoload.md -> host-capability-tokens.md` until the installer fix lands | Broken link and exit 1; the installer must rewrite it so it resolves, and the gate must never exempt it |

The exemption is never a prefix rule on `.ws/...` or `ws-shared/...` link text: it is decided from the resolved consumer context by containment against the resolved hub directories, it stops at depth 1 of those directories, and it is gated on `installScope` being global **and** the project hub being absent. Targets below that level (`ws-shared/runtime/missing.md`) stay broken links, so the gate cannot go false-clean.

### Affected modules

| Module | Role in this change |
|--------|---------------------|
| `.agents/skills/ws-check-harness/scripts/check_harness_links.cjs` | Behavior change: scope-aware link-target classification plus an informational, non-failing findings bucket and the absent-project-hub warning. |
| `.agents/skills/ws-shared/runtime/autoload.md` (lines 13, 48) | Shipped source carrying the two bare sibling links; it keeps that form because the target resolves at the source path. |
| `bin/cli.js` (`renderConsumerAutoloadText()`, `managedRuntimeLinkPrefixFor()`) | Installer relocation renderer; its hardcoded filename list omits `host-capability-tokens.md`. |
| `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs` (`renderConsumerAutoload()`, `runtimePrefixFor()`) | Second, near-identical renderer with the same hardcoded list, writing the project-hub autoload. |
| `test/test-check-harness-links.js` | Fixtures: global-only hub-layout literal, project-scope hub validation, hybrid layout, and the genuine-broken-link regression. |
| `test/test-install.js`, `test/test-autoload-configure.js`, `test/test-ws-shared-layout.js`, `test/test-doc-sync.js` | Installer/autoload regression suites for the rewrite, both install scopes, and source-mirror doc sync. |
| `.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs` | Read-only dependency: `resolveConsumerContext()` returns `executionScope`, `skillsRoot`, `sharedDir`, `configSource`; `inside()` and `consumerHubExists()` are exported helpers. |
| `.agents/skills/ws-check-harness/PHASES.md` | Contract of record for the gate (`§ Hub resolution details (Phase 0)`, `§ Phase 5a`). |

**System boundary.** In scope: link-target classification in `check_harness_links.cjs` (plus its informational bucket and absent-project-hub warning), the autoload relocation rewrite in both renderers, and the regression coverage for both. Out of scope: the shipped hub layout and the deliberate omission of `{globalSkillsRoot}/ws-shared/AGENTS.md` in global scope, the shipped source form of `runtime/autoload.md`, the runtime file inventory, the other Phase 5a gates, the non-link finding classes (`absolutePaths`, `tokenInLinkTargets`, `shorthand`, `unrouted`), and the install-mode detection defect itself.

**Sequencing dependency (install-mode reporting).** The scope-aware gate consumes the install-scope value published by `detect_install_mode.cjs` as Phase 0 evidence. The sibling "install-mode reporting" spec (`.agents/specs/pending/0172-us-498-install-mode-reporting.spec.md`, consolidating the install-mode reporting defects #494 + #495) records that this detector currently reports a false `hybrid` when the local and global skills roots resolve to the same directory. That reporting work must land first, or in the same change, so the exemption in this spec is never keyed off a wrong scope; the gate must not compensate by inventing its own scope detection. See `## Notes`, `## Out of Scope`, and `## Definition of Ready (DoR)`.

## Acceptance Criteria

- AC1: The consumer autoload renderer shall rewrite every bare link target that names a runtime sibling shipped beside the autoload source, including `host-capability-tokens.md`.
- AC2: When the installer writes the hub-root `autoload.md` at the skills-install scope, the consumer autoload renderer shall emit `runtime/host-capability-tokens.md` as the link target.
- AC3: When the installer writes the project-hub `autoload.md`, the consumer autoload renderer shall emit a hub-relative link into the managed runtime directory that resolves from the consumer hub.
- AC4: When a fresh install completes, the installed `autoload.md` shall contain zero link targets that do not resolve inside the installed hub tree.
- AC5: If a bare link target names a runtime file that is not present in the resolved runtime directory, then the installer shall leave that target untranslated.
- AC6: The autoload renderer shall be idempotent, leaving an already rewritten autoload body byte-identical on a repeat run.
- AC7: When `update` refreshes an existing autoload whose body still carries the bare sibling target, the installer shall rewrite that target with the same prefix rule as a fresh install.
- AC8: If a bare link target names project-owned hub content rather than a runtime sibling, then the renderer shall leave that target untouched.
- AC9: The installer and the project-hub configurator shall rewrite the same set of runtime filenames, so no filename entry is added to only one of the two lists.
- AC10: The shipped source `.agents/skills/ws-shared/runtime/autoload.md` shall keep its bare same-directory sibling link, because that target resolves at the source path.
- AC11: When the deterministic link gate runs against a fresh scratch-scope install, the link gate shall report zero broken-link findings whose file is the installed `autoload.md`.
- AC12: While the resolved install scope is global and the project hub is absent, the link gate shall classify a link target that names a depth-1 binding file inside either resolved hub directory as an install-layout note instead of a broken link.
- AC13: If a global-only audit produces install-layout notes and no other finding, then the link gate shall exit 0.
- AC14: When the link gate records an install-layout note, the link gate shall emit that note outside `findings.brokenLinks` and include a `ws-configure-project` remediation pointer.
- AC15: While a project hub is present, the link gate shall validate a link target that resolves inside that hub as a normal link and report a missing target under `findings.brokenLinks`.
- AC16: If a link target outside the install-layout class does not resolve, then the link gate shall exit 1 with that target listed under `findings.brokenLinks` in project-scope, global-only, and hybrid layouts.
- AC17: When the project hub is absent, the link gate shall report a warning that names `ws-configure-project` and is not counted as a broken link.
- AC18: The link gate shall derive the hub directories it exempts from the resolved consumer context instead of assuming the literal `.ws` path.
- AC19: While the link gate runs at the upstream package root, the link gate shall report zero findings.
- AC20: The link gate shall report a link target that resolves below a hub directory's binding-file level as a broken link.
- AC21: The link gate shall restrict the install-layout exemption to depth-1 hub binding files resolvable in either resolved hub directory, and shall never exempt a target by its `.ws/...` or `ws-shared/...` prefix.
- AC22: If a link target that names a runtime sibling such as `host-capability-tokens.md` resolves to no installed file, then the link gate shall report it under `findings.brokenLinks` and exit 1 in every install layout.
- AC23: If a depth-1 hub binding literal resolves inside either resolved hub directory, then the link gate shall not list it under `findings.brokenLinks` in any install layout.
- AC24: Where install-mode reporting is corrected for the same-directory skills-root case, the link gate shall apply the install-layout exemption from the corrected global-only scope.

## Original Issue Context

### Issue #493 — Installed `ws-shared/autoload.md` has broken links (`host-capability-tokens.md` not rewritten to `runtime/` on install)

- **Issue URL:** https://github.com/jpolvora/workflow-skills/issues/493

## Summary
After install/update, the consumer hub file `ws-shared/autoload.md` contains broken relative links to the canonical skill-load procedure. The link target is `host-capability-tokens.md`, but the file lives one level down at `ws-shared/runtime/host-capability-tokens.md`.

`check_harness_links.cjs` flags this on every consumer install:

```
.brokenLinks[] = [
  { file: "ws-shared/autoload.md", target: "host-capability-tokens.md" },   // line 13
  { file: "ws-shared/autoload.md", target: "host-capability-tokens.md" },   // line 48
]
```

## Environment
- workflow-skills **0.5.35**
- Consumer install (global-only scope), Windows 11, Node v22.22.2
- Command: `npx --yes github:jpolvora/workflow-skills update --include-new --global`

## Evidence
```
Test-Path ws-shared/autoload.md                       -> True
Test-Path ws-shared/host-capability-tokens.md         -> False
Test-Path ws-shared/runtime/host-capability-tokens.md -> True
```

Installed `ws-shared/autoload.md`:
- L13: ``...load each listed skill every prompt via `{skillLoader}` ([canonical skill-load procedure](host-capability-tokens.md); ...``
- L48: ``...load via `{skillLoader}` ([canonical skill-load procedure](host-capability-tokens.md)) when present...``

## Root cause
In the upstream package the source file is `ws-shared/runtime/autoload.md`, sitting **in the same directory** as `ws-shared/runtime/host-capability-tokens.md`, so the bare link `](host-capability-tokens.md)` is valid upstream.

The installer relocates that file to the hub root (`ws-shared/autoload.md`) and is supposed to rewrite bare runtime links to `](runtime/<file>)`. `renderConsumerAutoloadText()` in `bin/cli.js` rewrites a **hardcoded** filename list, and `host-capability-tokens.md` is missing from it:

```js
// bin/cli.js:296-307
for (const runtimeFile of [
  'AGENTS.md',
  'CROSS-PLATFORM.md',
  'config-resolution.md',
  'gates.md',
  'host-dispatch.md',
  'scm-provider-contract.md',
  'setup.md',
  'tools.md',
]) {
  text = text.split(`](${runtimeFile})`).join(`](${managedRuntimeLinkPrefixFor(runtimeFile)}${runtimeFile})`);
}
```

Because `host-capability-tokens.md` is not in the list, the bare link survives relocation and breaks.

## Impact
`ws-shared/autoload.md` is the Always-applied hub file that the root `AGENTS.md` points to on every prompt. Every consumer install (project and global) ships with two broken links to the canonical skill-load procedure referenced in the session-start flow. Deterministic `check_harness_links.cjs` gate fails (exit 1) on a fresh install.

## Suggested fix
Add `'host-capability-tokens.md'` to the runtime-file list in `renderConsumerAutoloadText()` (`bin/cli.js:296-307`) and regenerate `bin/skill-integrity.json`. (Alternatively, render the link from the same runtime-file registry that tracks `host-capability-tokens.md` so future runtime files cannot be forgotten.)

### Prior Work Sweep

**Issue #493.**

- Command: `node .agents/skills/ws-spec-provider-github/scripts/sweep_prior_work.cjs --issue 493 --keywords autoload broken links host-capability-tokens install rewrite` → `status: ok`, `commits: []`, one related merged PR: [#270](https://github.com/jpolvora/workflow-skills/pull/270) (`release: develop to main (multi-host global targets, site revamp, host binding v2)`, MERGED) — a release train that happens to match the keywords, not a fix for this defect.
- Same-issue open PR check: GitHub search for open PRs referencing issue 493 returned `total_count: 0`. **No open PR for issue #493 exists**; no reuse/stop gate applies.
- Related but distinct: [#496](https://github.com/jpolvora/workflow-skills/issues/496) is open and names this defect explicitly — "(Only the two `ws-shared/autoload.md -> host-capability-tokens.md` findings are genuine mode-independent defects — filed separately as #493.)". Issue #496's false positives are consolidated with this defect in the present grouped spec; the two halves stay separated by the suppression-versus-genuine-breakage boundary in `## Description` and AC21–AC23.
- Repository history on the touched paths (`git log --oneline -n 20 -- bin/cli.js .agents/skills/ws-configure-project/scripts/configure_autoload.cjs .agents/skills/ws-shared/runtime/autoload.md`): the most recent entries are the issue-#488 spec-to-issue work, `0d2337df feat(us-439)`, `e79c96dc feat(ws-spec-to-pr-distributed)`, `34f49a75` (versioning/orchestration), `38ef12c1 feat(0137)`, and `0373a45d feat(0136): skillLoader host capability and unified skill-load procedure`. None touch the bare-filename rewrite list.

### Design Intent

**Issue #493.**

- The bare-filename rewrite list is **intentional**, not accidental: it keeps the relocation rewrite bounded, so only links naming known runtime siblings of the shipped `autoload.md` become hub-relative or `runtime/` links, and unrelated markdown targets are never rewritten. The defect is an accidental gap in that intentional allow-list.
- Provenance of the gap: `git log -S "](host-capability-tokens.md)" -- .agents/skills/ws-shared/runtime/autoload.md` → `0373a45d feat(0136): skillLoader host capability and unified skill-load procedure` introduced both bare links. The runtime file itself was added earlier by `git log --diff-filter=A -- .agents/skills/ws-shared/runtime/host-capability-tokens.md` → `6edf5be8 feat(us-348): verified implementation`, which did **not** touch `bin/cli.js` (`git show 6edf5be8 -- bin/cli.js` is empty). The relocation list predates the new sibling link: `git log -S "host-dispatch.md" -- bin/cli.js` → `86955346 fix: harden hybrid hub and handoff runtime`. So a later commit added a runtime-sibling link without extending the installer allow-list — intentional constraint plus accidental gap.
- The same allow-list is duplicated in `bin/cli.js` (`managedRuntimeLinkPrefixFor` / `renderConsumerAutoloadText`) and in `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs` (`renderConsumerAutoload`). Both write hub-root autoload files for different scopes, so a fix that touches only one list leaves the other scope broken; the acceptance criteria deliberately cover both.
- Per-file fail-closed scope handling is also intentional and must be preserved: the existing per-file existence checks (`managedRuntimeLinkPrefixFor` in `bin/cli.js`, `runtimePrefixFor` in `configure_autoload.cjs`) keep the `{globalSkillsRoot}` token whenever the specific runtime file is missing from the local tree, so a partial-hybrid install never gets a link to a file that does not exist.

### Live Evidence

**Issue #493** (pre-fix, global full install into a scratch HOME, reproduced from this working tree).

- Installed `ws-shared/autoload.md` was 19,387 bytes, contained `](host-capability-tokens.md)` exactly twice, and did **not** contain `](runtime/host-capability-tokens.md)`.
- Running the packaged gate (`node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs --repo-root <scratch>`) printed `brokenLinks: .agents/skills/ws-shared/autoload.md host-capability-tokens.md` twice, and the `--json` form reported `"ok": false, "total": 12` with exactly two `{ "file": ".agents/skills/ws-shared/autoload.md", "target": "host-capability-tokens.md", "how": "relative" }` entries — the two autoload targets at lines 13 and 48.
- `Test-Path ws-shared/runtime/host-capability-tokens.md` was true while `Test-Path ws-shared/host-capability-tokens.md` was false: the runtime file ships, the rewrite entry does not exist.

### Issue #496 — `check_harness_links.cjs` is not scope-aware: false `brokenLinks` for project-hub `.ws/...` paths on global-only installs

- **Issue URL:** https://github.com/jpolvora/workflow-skills/issues/496

## Summary
`check_harness_links.cjs` is not scope-aware. On a **global-only consumer** install it exits 1 with ~8 “broken links” that point at the *project* hub (`../../../.ws/AGENTS.md`, `../../../../.ws/config.json`, and `ws-shared/STACK.md -> AGENTS.md`). Those paths are healthy in a project-scope install but cannot exist in a global install, so the deterministic gate can never pass.

## Environment
- workflow-skills **0.5.35**
- Consumer install, **global-only** scope (`installScope: global` from an empty repo-root)
- Windows 11, Node v22.22.2

## Repro
```
node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs --json --repo-root %USERPROFILE%
# exit 1
```
Findings include:
```
brokenLinks:
  ws-check-harness/PHASES.md                 -> ../../../.ws/AGENTS.md
  ws-ship-pr/PREPARE-CHECKLIST.md            -> ../../../.ws/AGENTS.md
  ws-spec-format/SKILL.md                    -> ../../../.ws/AGENTS.md
  ws-spec-to-issue/SKILL.md                  -> ../../../.ws/AGENTS.md
  ws-spec-to-pr/README.md                    -> ../../../.ws/AGENTS.md
  ws-spec-write/SKILL.md                     -> ../../../.ws/AGENTS.md
  ws-spec-to-pr/docs/faq.md                  -> ../../../../.ws/config.json
  ws-shared/STACK.md                         -> AGENTS.md
```
(Only the two `ws-shared/autoload.md -> host-capability-tokens.md` findings are genuine mode-independent defects — filed separately as #493.)

## Expected behavior (per shipped docs)
`ws-check-harness/PHASES.md` § Hub resolution / Scan:
> Global-only scope: project hub may be absent; resolve the primary hub from `{globalSkillsRoot}/ws-shared/AGENTS.md` … and treat hub routing literals as install-layout tokens. … missing project hub → **warning** (`ws-configure-project`), not a broken-link finding.

## Root cause
`check_harness_links.cjs` resolves every relative link unconditionally and has no `installScope`/project-hub guard (it only imports the consumer context resolver). Project-hub literals therefore fail closed in global scope.

## Impact
- `check_harness_links.cjs` (and therefore the Phase 5a gate chain, and the `ws-check-harness` DoD that requires exit 0) fails on every global-only install — a false red.
- Mask the genuine findings (the autoload links) in the noise.

## Suggested fix
Make the gate scope-aware: when `installScope` resolves to `global` and no project hub exists, treat links whose expanded target resolves under the project `{sharedDir}` (`.ws/…`) as install-layout tokens — report them as informational `ws-configure-project` notes, not `brokenLinks`. Keep failing on links that are genuinely broken in any layout.

### Prior Work Sweep

**Issue #496.**

- **Sweep command:** `node .agents/skills/ws-spec-provider-github/scripts/sweep_prior_work.cjs --issue 496 --keywords scope-aware "broken links" installScope global` → `status: ok` (exit 0), `provider: github`.
- **Same-issue open PR: none.** The sweep returned no open pull request for issue #496. No blocker for implementation.
- **Merged PRs matching only on the `#496` text reference:** #300 "fix: resolve workflow runtime issues and add monitor" (MERGED) and #350 "feat: step-level baton handoffs for multi-CLI workflow runs" (MERGED). Neither addresses scope-aware link classification; no commit rows were returned.
- **Related in-repo history (not a duplicate fix):** the PR #377 review-thread commits `170718f5` and `abdfb6fb` made the Phase 5a gates scope-aware about *which tree is audited* for global-only consumers, but their diff to `check_harness_links.cjs` is limited to package membership (`externalSkillIds`, `packageRoots`); link-target classification was left unconditional.
- **Existing coverage gap:** `test/test-check-harness-links.js` → `testGlobalOnlySkillsRootAudited` already asserts that a genuine broken link in a global-only install exits 1, but no fixture seeds a hub-layout literal, so the reported false red is uncovered.
- **Duplicate risk:** low. The two `ws-shared/autoload.md → host-capability-tokens.md` findings in the same report are tracked as issue #493 and consolidated with this defect in the present grouped spec as the genuine-breakage half of the contract.

### Design Intent

**Issue #496.**

- **History of the file** (`git log --oneline -n 20 -- .agents/skills/ws-check-harness/scripts/check_harness_links.cjs`): `9728b8ef` (0.4.74 path-token sync), `170718f5` and `abdfb6fb` (#377 review threads), `54510fc9` (#376), `9f04f146` (resolve managed `ws-shared` from the skills install), `29308d41` (relocate the consumer hub to project `.ws` root), `8c597a04` (#346), `32241f80` (#339), `a8f5e515` (manifest parsing and link decoding), `67e7f081` (install-mode detection and upstream clean-audit invariant).
- **Symbol archaeology** (`git log -p -S "installScope" -- .agents/skills/ws-check-harness/scripts/check_harness_links.cjs`): **no output** — no commit ever added or removed a scope guard in this file. There is no intentional constraint being reverted, so the failing behavior is an accidental gap rather than a designed rule.
- **Where the intent is actually committed:** `.agents/skills/ws-check-harness/PHASES.md` § Hub resolution details states the global-only contract (hub routing literals are install-layout tokens; a missing project hub is a warning naming `ws-configure-project`, not a broken-link finding), and § Phase 5a states the gate contract. `detect_install_mode.cjs` publishes `installScope` as Phase 0 evidence that the gate chain never consumes for link classification.
- **Why the gap cannot be closed by editing skill bodies:** `.ws/` targets point at a consumer-owned directory that does not exist in a global-only install, so no file inside the skills tree can make them resolve there. The gate is the only correct place to classify them.
- **Why the `ws-shared/STACK.md -> AGENTS.md` finding is layout, not content:** the installer seeds `{globalSkillsRoot}/ws-shared/STACK.md` from `templates/STACK.md.example` (whose line 77 links a sibling `AGENTS.md`) while deliberately not shipping or seeding `{globalSkillsRoot}/ws-shared/AGENTS.md` in global scope.
- **Conclusion:** accidental gap; the intended behavior is the one already documented in `PHASES.md`, and this spec makes the gate implement it.

### Live Evidence

**Issue #496** (reproduced false red on a global-only install).

- The repro command above exits 1 on a global-only consumer install while listing only project-hub literals plus the two `ws-shared/autoload.md` sibling targets; `installScope: global` resolves from the empty repo-root.
- Of the reported findings, the `../../../.ws/AGENTS.md` and `../../../../.ws/config.json` entries and the seeded `ws-shared/STACK.md -> AGENTS.md` entry are install-layout literals: the first two point at a consumer-owned project hub that cannot exist in this layout, and the third points at a sibling entrypoint the installer deliberately does not seed in global scope.
- The two `ws-shared/autoload.md` entries are the genuine #493 breakage and are separated from the false red by AC21–AC23: after the installer rewrite they resolve, and no gate exemption is permitted for them.

## Notes

- **What consumes what.** The scope-aware gate consumes the install-scope value that `detect_install_mode.cjs` publishes as Phase 0 evidence. The sibling "install-mode reporting" spec (`.agents/specs/pending/0172-us-498-install-mode-reporting.spec.md`, consolidating #494 + #495) records that this detector currently reports a false `hybrid` when the local and global skills roots resolve to the same directory. That reporting correction must land first, or in the same change; otherwise the exemption is keyed off a wrong scope. The gate must not add its own scope detection to compensate (AC24 records the corrected-value contract).
- `ok` is `total === 0` over all five findings buckets (`brokenLinks`, `absolutePaths`, `tokenInLinkTargets`, `shorthand`, `unrouted`), so the informational bucket must be excluded from `total`; otherwise the exit code cannot change no matter how the note is recorded.
- `TOP_LEVEL` omits `.ws`, so project-hub literals have no root-anchored fallback and are resolved purely relative to the citing file's directory.
- `resolveConsumerContext()` already returns `executionScope` (`global` | `project-local`), `sharedDir` (relocatable; the explicit `WORKFLOW_SKILLS_SHARED_DIR` override wins), `skillsRoot`, and `configSource`; `inside()` and `consumerHubExists()` are exported from the same module and are the intended containment/presence helpers.
- The seeded global hub entrypoint is absent by design in global scope while `ws-shared/STACK.md` is seeded, so the sibling binding link cannot resolve there.
- The gate is synchronous and read-only (`fs.readdirSync` / `fs.readFileSync` via `walk()`); no network, no state mutation, no streams.
- Upstream invariant: `test/test-harness-clean.js` runs this checker as a Phase 2/4 gate and the package root must report zero findings.
- The two bare targets live at lines 13 and 48 of `.agents/skills/ws-shared/runtime/autoload.md`. Lines 5 (`tools.md`) and 23 (`AGENTS.md`) are already-covered bare siblings, which is why the current gate reports exactly two autoload findings rather than four.
- This repository's own project mirror `.ws/autoload.md` is kept byte-identical to `.agents/skills/ws-shared/runtime/autoload.md` (asserted by `test/test-doc-sync.js`), so the source file intentionally keeps the bare same-directory form; the rewrite belongs in the install-time renderer only.
- Existing coverage relevant to the installer defect: `test/test-install.js` asserts the refreshed autoload link targets exist on disk for `../.agents/skills/ws-*/SKILL.md` shapes and asserts idempotency of a second `update`; `test/test-autoload-configure.js` asserts project-local vs global autoload link forms; `test/test-ws-shared-layout.js` covers hub layout and installed autoload placement. None of them currently asserts that every bare runtime-sibling target in the installed autoload was rewritten, which is why the defect reached a release.
- `bin/skill-integrity.json` covers `bin/cli.js`; when hashed install content changes, `npm run generate-integrity` + `npm run verify-integrity` are the repository obligations (see `.ws/STACK.md` and root `AGENTS.md`).
- Merged-spec bookkeeping: 21 source acceptance criteria (9 from #496, 12 from #493) are carried as AC1–AC20. The only genuine duplication was #493's per-file fail-closed pair (its AC5 and AC9, both "leave the target untranslated when the runtime file is not present"), which is now AC5. AC21–AC23 state the suppression-versus-genuine-breakage boundary explicitly, and AC24 records the install-mode sequencing contract.
- Both source specs' human issue text is preserved verbatim under `## Original Issue Context`; the two single-issue spec files are superseded by this grouped spec of record, and both issue URLs stay discoverable above.
- Ship closers: the delivery PR must carry `Closes #496` and `Closes #493`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Exempting the `ws-shared/autoload.md -> host-capability-tokens.md` targets instead of rewriting them | These targets are unresolvable in the installed layout: the runtime file ships at `ws-shared/runtime/host-capability-tokens.md`. Rewriting them is the fix; the install-layout exemption is never allowed to cover them (AC21, AC22). |
| Correcting `detect_install_mode.cjs` itself (false `hybrid` when the local and global skills roots are the same directory) | Owned by the sibling install-mode reporting spec (consolidating #494 + #495), which must land first or in the same change; this spec only consumes the corrected install-scope value. |
| Changing the installer or the global hub layout (for example seeding `{globalSkillsRoot}/ws-shared/AGENTS.md`) | `bin/cli.js` deliberately omits that pointer in global scope; this spec makes the gate classify the literal instead of altering hub layout. |
| Rewriting shipped `.ws/` hub literals inside skill bodies | They are the install-layout contract; the gate tolerates them in global-only scope instead. |
| Rewriting the sibling `AGENTS.md` link in `ws-shared/templates/STACK.md.example` | Recorded as a deferred idea in the companion; not required once the gate classifies the literal. |
| Renaming, moving, or reorganizing `host-capability-tokens.md` or any other runtime file | The runtime file ships correctly; only the install-time link target is wrong. |
| Rewriting arbitrary bare markdown links in the shipped autoload source | The bounded allow-list is intentional (see `### Design Intent`); broad rewriting would risk unrelated targets. |
| Changing skill-loading behavior, the Always-applied membership set, or hub routing prose | No behavioral change is requested by either issue. |
| Extending `bin/skill-integrity.json` to new file classes | Not required by either defect; repository integrity commands already cover `bin/cli.js`. |
| Changing `.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs` | Read-only dependency: `resolveConsumerContext()`, `inside()`, and `consumerHubExists()` are consumed as they are. |
| Other Phase 5a gates (`check_duplicates.cjs`, `check_unique_runtime.cjs`, `check_shell_quoting.cjs`, `check_hub_separation.cjs`, and peers) | Already scope-aware through the resolved skills root; unchanged by these defects. |
| Non-link finding classes (`absolutePaths`, `tokenInLinkTargets`, `shorthand`, `unrouted`) | Outside both reported defects; behavior intentionally unchanged. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Width of the hub-literal exemption | Binding files only: a file directly inside a resolved hub directory (project `{sharedDir}` or the resolved skills install's `ws-shared` hub) | A subtree-wide exemption would turn the gate false-clean for real defects under hub subdirectories such as `ws-shared/runtime/*`; the two tolerated literal classes are both binding files. Alternative recorded in the companion (Option A vs Option B). | n |
| Status of an unresolvable runtime sibling under a hub directory | Never exempt: it stays a broken link and the installer owns the rewrite | This is the boundary between #496 (false red) and #493 (genuine breakage); AC21–AC23 make it testable in both directions. | n |
| How the tolerated findings surface | A dedicated informational bucket in the `--json` payload, excluded from `total`/`ok`, printed on the human path even when the gate passes | `findings.brokenLinks` must keep only genuine breaks so CI evidence stays actionable, while the note stays observable. | n |
| Handling of the seeded `ws-shared/STACK.md -> AGENTS.md` link | Keep the shipped template link and classify it as a hub binding literal in global scope | The installer deliberately omits the sibling entrypoint in global scope, so a source rewrite would change shipped hub content beyond this defect; the alternative is a deferred idea in the companion. | n |
| Whether to gate the exemption on install scope only, or on hub absence in any scope | Gate on global scope combined with an absent project hub | Matches the shipped contract in `PHASES.md` § Hub resolution details and the issue's suggested fix; broadening it to project-local installs is a separate product decision. | n |
| Installer fix mechanism (add the missing filename entry vs. derive the list from a runtime registry) | The plan may choose either, as long as both renderers agree | The issue suggests both; the acceptance criteria are behavior-level, so either implementation satisfies them. | n |
| Whether a fix must also repair already-installed hubs without a reinstall | Yes for the `update` refresh path only (AC7); no out-of-band repair command is required | The installer already refreshes an existing hub-root autoload on `update`. | n |
| Sequencing with install-mode reporting | The install-mode reporting correction lands first or in the same change; the gate consumes the corrected value and adds no scope detection of its own | A false `hybrid` report for same-directory skills roots would otherwise decide whether the exemption applies; AC24 states the corrected-value contract. | n |
| Data lifecycle, concurrency, external-dependency, and auth-boundary dimensions of the gate | N/A because the checker is a synchronous, read-only local file walk with no network calls, no state mutation, no TTL/archival, and no privileged operation | The implicit-requirement dimensions that do not apply are collapsed into this single row rather than invented as acceptance criteria. | y |
| Concurrency, retry, and dedup dimensions of the installer | N/A because the installer is a local, synchronous, single-process file writer with no shared mutable state or remote calls | Collapsed absent dimension — no concurrent writer or retry surface exists to specify. | y |
| Auth boundaries and rate limits | N/A because the installer runs with the invoking user's own filesystem permissions and performs no network or privilege operation | Collapsed absent dimension. | y |
| Data lifecycle and expiry | N/A because link rewriting creates no persisted record with a TTL, retention, or archival rule | Collapsed absent dimension. | y |
| Renderer input validation surface | N/A because the renderer's input is the package's own shipped markdown, not an external/untrusted payload | Collapsed absent dimension; the fail-closed per-file existence checks are covered by AC5 instead. | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only the link gate, the two autoload renderers, and their regression coverage change; no hub-layout, runtime-file, sibling-gate, or install-mode-detection change | `git diff --stat` limited to `check_harness_links.cjs`, `bin/cli.js`, `configure_autoload.cjs`, the link/install/autoload/layout/doc-sync test files, and integrity data |
| Atomic criteria | AC1–AC24 each assert one observable behavior of the installer or the gate, in one EARS pattern | `validate_spec.cjs --mode=authoring` exits 0 plus one named test assertion per AC |
| Failure modes covered in both directions | The #493 class (unrewritten runtime sibling) and the #496 class (valid hub literal) each have a positive and a negative criterion | `node test/test-check-harness-links.js` plus the installer and autoload suites, traced to AC21–AC23 |
| Observation telemetry | The `--json` report exposes the informational bucket, `brokenLinks`, and the exit code; the installed `autoload.md` target set is inspectable | `node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs --json --repo-root .` and a scratch-install link scan |
| Install-mode prerequisite | The install-mode reporting correction for the same-directory skills-root case lands first or in the same change | `node .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs --json --repo-root .` on the same-directory fixture, feeding AC12 and AC24 evidence |
| Two-renderer wiring guard | Any change to the runtime-filename rewrite set lands in both renderers | An assertion that both filename sets are equal, red when only one list is edited (AC9) |
| Tests and harness gates | Whole-suite and harness gates stay green, and each changed script parses | `npm run test` exit 0, `node test/test-harness-clean.js` 0 findings, `node --check` on each changed script |
| Integrity regenerated | Hashed install content is refreshed in the same change and verified | `npm run generate-integrity` then `npm run verify-integrity` |
| Node 22 / stack invariants | Changes stay CommonJS `.cjs`/`.js` under `bin/` and `.agents/skills/**/scripts/` with no unchecked `any`, no floating promise, and no new `.py` file | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` plus `node --check` on each changed script |
| Injection and path-traversal containment (stack `typescript-node` § 4) | Hub classification resolves the target and proves containment with `inside()`; rewrite prefixes resolve under the resolved hub or runtime directory; link text is never compared with string prefixes and no untrusted input is concatenated into a path | Code review of the classification and rewrite branches plus negative scenarios NS3 and NS9 |
| Boundary input validation (stack `typescript-node` § 3) | Link targets are percent-decoded and normalized before classification, and the existing unknown-argument guard is preserved | `node test/test-check-harness-links.js` (percent-target case) and NS4 |
| Async, concurrency, and resource lifecycle (stack `typescript-node` § 2 and § 5) | No new asynchronous call, floating promise, stream, socket, or long-lived handle; the gate stays a synchronous read-only walk and the installer stays a synchronous single-process writer | `node --check` on each changed script plus diff review |
| Zero open blockers | No same-issue open PR, no unresolved product decision, and the install-mode prerequisite sequenced | `### Prior Work Sweep` above plus a re-run of `sweep_prior_work.cjs --issue 493` and `--issue 496` before implementation |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs --json --repo-root .` — exit code plus the `findings` buckets; at the upstream package root the report must stay `ok: true` with zero findings.
- `node test/test-check-harness-links.js` — prints `All check-harness link gate tests passed.` on success.
- `node test/test-harness-clean.js` — runs this checker as the Phase 2/4 gate and must report 0 findings at the package root.
- `npm run test` (`verification.backendTest` per `.ws/STACK.md`) — whole-suite exit 0.
- `node .agents/skills/ws-check-harness/scripts/detect_install_mode.cjs --json --repo-root .` — Phase 0 `installScope` evidence that the gate's classification must agree with; the same-directory skills-root case is the fixture for AC24.
- `node --check .agents/skills/ws-check-harness/scripts/check_harness_links.cjs` — syntax gate for the changed script.
- #496 reproduced false red: on a global-only consumer install the checker exits 1 listing only project-hub literals (`../../../.ws/AGENTS.md`, `../../../../.ws/config.json`, and the seeded `ws-shared/STACK.md -> AGENTS.md`) plus the two genuine `ws-shared/autoload.md` targets. The first three must become install-layout notes; the last two must be fixed by the installer.
- #493 pre-fix red baseline (scratch global install of this working tree): the gate printed `brokenLinks: .agents/skills/ws-shared/autoload.md host-capability-tokens.md` twice, and the `--json` form reported `"ok": false, "total": 12` with two `{ "file": ".agents/skills/ws-shared/autoload.md", "target": "host-capability-tokens.md", "how": "relative" }` entries.
- #493 same probe: installed `ws-shared/autoload.md` was 19,387 bytes and contained `](host-capability-tokens.md)` twice with zero occurrences of `](runtime/host-capability-tokens.md)`; `Test-Path ws-shared/runtime/host-capability-tokens.md` was true and `Test-Path ws-shared/host-capability-tokens.md` was false — the issue's evidence reproduced exactly.
- #493 post-fix signal to observe: the same `--json` run against a fresh scratch install reports zero `findings.brokenLinks` entries whose `file` ends in `ws-shared/autoload.md`.
- #493 scope separation signal: the rendered project-local autoload uses hub-relative runtime links, while the skills-install-scope autoload uses `runtime/<file>`; a text comparison of the two installed bodies verifies AC2 and AC3 independently.
- #493 regression suites to run and cite with exit codes: `npm run test` (covers `test/test-install.js`, `test/test-autoload-configure.js`, `test/test-ws-shared-layout.js`, `test/test-doc-sync.js`), plus `npm run generate-integrity` and `npm run verify-integrity`.

### Negative & Failing Test Scenarios

- NS1: A global-only fixture (no project hub) whose global skill links `does-not-exist.md` exits 1 with the target listed under `findings.brokenLinks`; the install-layout exemption must not swallow it (extends the existing `testGlobalOnlySkillsRootAudited` case).
- NS2: A project-scope fixture with `.ws/config.json` present whose skill links `../../../.ws/missing.md` exits 1, because a present hub means hub targets are validated normally.
- NS3 (stack `typescript-node` § 4, traversal containment): A crafted target such as `../../../.ws/../../outside.md` or `..%2F..%2Foutside.md` is not exempted as a hub binding literal; containment refuses it and the run still reports deterministically without crashing.
- NS4 (stack `typescript-node` § 3, boundary input): An empty or unknown extra argument to the checker exits 1 with the existing `ERROR:` message instead of classifying links from unvalidated input.
- NS5: A global-only fixture whose global skill links `ws-shared/runtime/missing.md` exits 1, proving the exemption stops at hub binding files and does not extend to the hub subtree.
- NS6: A global-only fixture whose seeded `ws-shared/STACK.md` carries `[AGENTS.md](AGENTS.md)` with no sibling `AGENTS.md` exits 0 and reports an install-layout note naming `ws-configure-project`.
- NS7 (suppression direction, #493 class): A global-only fixture whose installed `ws-shared/autoload.md` still carries the unrewritten bare `](host-capability-tokens.md)` reports that target under `findings.brokenLinks` and exits 1 — the exemption must never absorb the genuine break that #493 reports.
- NS8 (false-red direction, #496 class): A global-only fixture whose skill links `../../../.ws/AGENTS.md` with no project hub reports no `findings.brokenLinks` entry for that target and exits 0.
- NS9 (hybrid layout): A hybrid fixture (skills install resolved globally, project hub present) validates a `.ws/` target inside that hub normally and still reports an unresolvable `ws-shared/runtime/missing.md` as a broken link with exit 1.
- NS10 (red-first reproduction for the installer): Before the fix, install into a scratch scope and assert the installed `autoload.md` contains no bare `](host-capability-tokens.md)` and does contain a resolvable runtime-qualified target — this assertion fails on the current tree (two occurrences), proving the test exercises the defect.
- NS11 (missing-rewrite regression): Assert the installed autoload has zero link targets naming a runtime sibling of the shipped source that does not exist at the hub root; the pre-fix install fails with exactly two such targets.
- NS12 (wiring guard, fail-first asymmetry): Assert both the installer renderer and the project-hub configurator rewrite the same runtime-filename set; a fix applied to only one list must fail this assertion in the untouched scope.
- NS13 (invented-target guard): Feed the renderer a bare target that names a runtime file absent from the resolved runtime directory and assert the output does not become a hub-relative path to a non-existent file (the fail-closed token or untouched target is retained).
- NS14 (non-runtime target guard): Feed the renderer a bare project-owned target (hub content such as the on-demand catalog file, not a runtime sibling) and assert the renderer leaves it unchanged.
- NS15 (idempotency check): Run the renderer over its own generated output and assert byte equality; a second `update` must not alter `autoload.md` (the existing installer idempotency assertion must stay green).
- NS16 (stack-invariant negative check): `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` must report no new critical findings for the changed scripts (no unchecked `any`, no floating promise introduced by the rewrite path or the classification branch).
- NS17 (cross-class confusion guard): Do not treat the global-scope findings for depth-1 hub literals as failures of the installer defect, and do not exempt the autoload runtime sibling to make a gate green; the two classes are separated by AC21–AC23 and by NS7/NS8.
