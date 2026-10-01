---
step: 1
slug: us-469
workflowId: us-469-20261001T024600Z
status: completed
acRefs: []
title: "ws-doctor: resolve path citations like the hub, skip prose (AC1–AC7)"
startedAt: "2026-10-01T02:46:14Z"
endedAt: "2026-10-01T02:52:00Z"
---
## 0. Summary & Business Rules

`ws-doctor` reports ~205 "path errors" on a healthy upstream install. Spot-checking each row
shows they are expansion-base and scanning artifacts, not broken installs: repo-root-relative
citations expanded against the citing file, Markdown link display text checked instead of the
href, shell/home/placeholder prose treated as filesystem paths, external `{skillsRoot}` fallbacks
flagged despite a `{globalSkillsRoot}` install, own-directory citations expanded one level too
deep, and archived `runs/pr-*` fixtures scanned as live references.

Deliverable = a resolution + skip model inside `.agents/skills/ws-doctor/scripts/doctor.js` so
citations resolve the way the installer and hub resolve them, prose is not a path, and genuine
broken references stay visible. Coverage extends `test/test-ws-doctor.js`.

Business rules:
- Read-only: the scanner never writes skill, hub, or config files (existing contract).
- AC1: repo-root-relative citations (`.ws/`, `.agents/`, `.github/`, `$PWD/…`, root files) resolve
  against the project root before falling back to the citing file directory.
- AC2: a Markdown link is validated by its **href**; backticked display text inside a link is
  prose unless the href is not itself a path reference. Anchors/fragments are stripped before the
  existence check.
- AC3: fenced code blocks, shell redirects, `~/`/`$HOME` home paths, `(…)`, `{a/b}`, `path/to/…`,
  `origin/{ref}`, `src/file.ts:42`, `/route` examples, and regex-literal prose are skipped.
- AC4: a `{skillsRoot}/…` citation with a documented `{globalSkillsRoot}/…` alternative is resolvable
  when either path exists (`skip if neither path exists`).
- AC5: a hub file citing its own directory expands exactly once (root-first; never `.ws/.ws`).
- AC6: archived run/example trees are excluded from live citations.
- AC7: any citation that resolves to an existing path at the project root is not a path error.
- Node-only; no `.py`; harness must stay green.

## 1. Definition of Ready & Scope

**Resolved assumptions (spec, Confirmed = y):** project root first then citing-file-relative for
explicit relative links; prose = fenced blocks + placeholder patterns; fallback tokens resolvable
when any documented alternative exists; input validation/auth/concurrency/data-lifecycle/idempotency
are N/A for a read-only local text/fs scan.

**Measurable ACs:** AC1–AC7 from `step-00-us-469.spec.md`.

**In scope:**
- `.agents/skills/ws-doctor/scripts/doctor.js` resolution/skip rules.
- `test/test-ws-doctor.js` fixture coverage for AC1–AC7 + NS1–NS3.
- Integrity regenerate + one version bump at ship.

**Out of scope (spec table):** non-path diagnostic sections; reporting real breaks without buckets;
consumer repositories; hub install layout changes.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 / JavaScript). Layers touched:

| Layer | Path | Role |
|-------|------|------|
| skills-sot | `.agents/skills/ws-doctor/scripts/doctor.js` | scanner resolution + skip rules |
| tests | `test/test-ws-doctor.js` | fixture coverage for AC1–AC7 / NS1–NS3 |
| installer-cli | `bin` / site | integrity + version bump (ship only) |

**Resolution model in `resolveCitedPath` (AC1/AC5/AC7):**
1. Strip `$PWD`/`${PWD}` prefixes and treat them as project-root relative; strip link anchors and
   query fragments before existence checks.
2. Add the repo-root prefix set beyond the current list: `.ws/`, `.github/`, `.git/`, `.opencode/`,
   `.cursor/`, `.vscode/`, `.assets/`, `.system_generated/`, `.well-known/`, `.aws/`, `scripts/`,
   `install-skills.sh`, plus the existing `.agents/`, `bin/`, `docs/` (non-skill), `specs/`, `test/`,
   `AGENTS.md`, `README.md`, `ws-*/`.
3. For backtick/prose citations that are not explicit relative (`./`, `../`) and not a Markdown link
   target, try the project root first; only fall back to the citing-file directory when the root path
   does not exist (AC7). Markdown links keep their file-relative contract so skill-local companion
   links stay strict (existing tests `testSkillFolderDocs*`).

**Skip model (AC3/AC6):**
- `fencedRanges(content)` marks ```` ``` ```` / `~~~` blocks; all extraction skips matches inside them.
- `isProseOrPlaceholder(value)` rejects shell redirects (`2>/dev/null`, `>/dev/null`), `~/` and
  `$HOME/` home paths, `(…)` fragments, braces containing `/`, `|`, `.`, or `,` (`{true/false}`,
  `{specMemo.cli}`, `{skillsRoot|globalSkillsRoot}`), `path/to/…`, `origin/{ref}`, `<…>` placeholders,
  `src/file.ext:42` source refs, leading `/route` examples, and `/regex/` literals.
- `collectMarkdownFiles` skips `**/runs/pr-*/**` and `examples.md` (AC6).

**Fallback model (AC4):** when a `{skillsRoot}/ws-<id>/…` citation is missing at the local skills
root, resolve the `{globalSkillsRoot}` counterpart; if it exists, the citation is resolvable.
Documented optional hub files with a global counterpart follow the same rule.

**Not touched:** non-path sections (tool diagnostics, configuration), report shape, launchers.

## 3. Step-by-Step Plan

1. **Resolution base** — add root-relative prefixes, `$PWD` handling, anchor/query strip, root-first
   fallback for backtick/prose citations. → AC1, AC5, AC7
2. **Markdown href** — skip display-text backticks when the href is path-like; validate the href. → AC2
3. **Prose/placeholder guards** — fenced-block ranges, redirects, home paths, parenthesized and
   brace/route/source refs. → AC3
4. **External fallback** — `{globalSkillsRoot}` alternative for `{skillsRoot}` citations. → AC4
5. **Archive/example exclusion** — skip `runs/pr-*/` and `examples.md` markdown sources. → AC6
6. **Tests** — extend `test/test-ws-doctor.js` with AC1–AC7 + NS1–NS3 fixtures. → AC1–AC7, NS1–NS3
7. **Harness / integrity / bump (ship hygiene)** — `npm run test`, `ws-check-harness`,
   `npm run build-site:bump` once, `npm run generate-integrity` + `verify-integrity`. → ship hygiene

## 4. Permissions, Tenancy & i18n

N/A — local text/fs reads only, no RBAC/tenancy/authZ, en-us output.

## 5. Test Coverage

| AC / NS | Named check / test | Expected files |
|---------|--------------------|----------------|
| AC1 | `testRootRelativeCitationResolvesAtProjectRoot` — `.ws/config.json` from a skill resolves, not reported | `doctor.js` |
| AC2 | `testMarkdownLinkUsesHrefNotDisplayText` — link with wrong display text but valid href passes | `doctor.js` |
| AC3 | `testProseAndPlaceholdersSkipped` — `2>/dev/null`, `~/x`, `{true/false}`, `path/to/f.spec.md` not reported | `doctor.js` |
| AC4 | `testBraceFallbackToGlobalSkillsRoot` — local-missing `{skillsRoot}` citation with global copy passes | `doctor.js` |
| AC5 | `testOwnDirectoryCitationExpandsOnce` — hub file citing `.ws/` is not reported as `.ws/.ws` | `doctor.js` |
| AC6 | `testArchiveAndExampleTreesExcluded` — a `runs/pr-*/` markdown file is not scanned as a live citation | `doctor.js` |
| AC7 | `testExistingProjectRootPathNotReported` — a citation resolving at the project root is not an error | `doctor.js` |
| NS1 | broken real `.agents/...` path is still reported | `doctor.js` |
| NS2 | deliberately broken token/root path is still reported | `doctor.js` |
| NS3 | `2>/dev/null`, `~/x`, `path/to/feature.spec.md` are not reported as broken paths | `doctor.js` |

## 6. Stack & Security Invariants Verification Plan

| Invariant | Verification check | Expected files |
|-----------|--------------------|----------------|
| Read-only scanner | no `writeFileSync`/`mkdirSync` on product paths during scan; existing read-only test stays green | `doctor.js`, `test-ws-doctor.js` |
| Node-only runtime | `node --check doctor.js`; no `.py` introduced | `doctor.js` |
| Portable resolution | no hardcoded host/consumer paths; uses token map + project root | `doctor.js` |
| Fail-closed keep | genuine broken references remain in Path errors (NS1/NS2) | `doctor.js` |
| Report contract | `--json` still emits one object with the four sections | `doctor.js`, `test-ws-doctor.js` |

## 7. Risks & Rollback

| Risk | Mitigation |
|------|------------|
| Over-skipping hides a real break | NS1/NS2 assert real breaks still surface; keep report shape |
| Breaking strict skill-local markdown links | Markdown links keep file-relative resolution; existing `testSkillFolderDocs*` stay green |
| Glob drift in integrity | regenerate integrity in the same commit |

Rollback = revert the single scanner commit; no schema or layout change.

## 8. Open Questions

None blocking. External-fallback semantics for optional hub files follow "skip if neither exists".
