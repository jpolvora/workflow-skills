---
id: 469
slug: us-469
title: "ws-doctor: path-error section reports widespread false positives (citation base, link text, prose)"
source: github
specDate: 2026-09-30
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/469"
labels:
  - bug
step: 0
workflowId: us-469
status: completed
startedAt: "2026-09-30T18:49:03.785Z"
endedAt: "2026-09-30T18:49:03.785Z"
acRefs: []
---
# Specification — ws-doctor: path-error section reports widespread false positives (citation base, link text, prose)

**State:** open
**Labels:** bug

## Description

`ws-doctor` (read-only diagnostic) reports roughly 200 "path errors" on a healthy install, drowning the signal. Spot-verification showed effectively zero real broken paths in the triaged sample; every checked row was an expansion-base or scanning artifact. A doctor whose Path-errors section cries wolf on every run cannot distinguish broken installs from prose.

The observed false-positive classes are: repo-root-relative citations expanded against the citing file's directory instead of the project root; Markdown link display text scanned instead of the href; home/shell/placeholder tokens treated as paths; optional brace-token fallbacks reported as missing even when documented alternatives exist; own-directory citations expanded one level too deep; and archived run artifacts scanned as live citations.

The fix is a set of resolution and skip rules in the doctor's path scanner so citations resolve the way the installer and hub resolve them, and non-path prose is not treated as a path. Real broken paths must stay visible.

### Design Intent

The scanner was built to catch broken install paths by expanding text references. It assumed citing-file-relative bases and did not model how skill docs actually write repo-root-relative citations, Markdown hrefs, or example placeholders. The intended contract is that the scanner mirrors the project's real resolution order, not a naive per-file expansion.

## Acceptance Criteria

- AC1: The path scanner shall resolve repo-root-relative citations against the project root before falling back to the citing file's directory.
- AC2: When the scanner checks a Markdown link, the scanner shall validate the link href instead of the backticked display text.
- AC3: The scanner shall skip fenced code blocks, example placeholders, shell redirects, home-relative paths, and prose fragments.
- AC4: When a brace token has a documented alternative, the scanner shall treat the citation as resolvable if any alternative path exists.
- AC5: When a hub file cites its own directory, the scanner shall expand the citation relative to that directory exactly once.
- AC6: The scanner shall exclude archived run and example trees from live citations or report them in a separate low-severity bucket.
- AC7: When a citation resolves to an existing path at the project root, the scanner shall not report a path error for it.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing non-path diagnostic sections | The failure class is the Path-errors section |
| Reporting only real breaks with no severity buckets | A separate `info` bucket is acceptable per AC6 |
| Modifying consumer repositories | The scanner is read-only |
| Changing hub install layout | Resolution must follow the existing layout |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Resolution order | Project root first, then citing-file-relative for explicit relative links | Matches the Configuration section and hub resolution | y |
| Prose detection | Skip fenced blocks and placeholder patterns | Matches the enumerated false-positive classes | y |
| Fallback tokens | Resolvable when any documented alternative exists | Matches "skip if neither path exists" wording | y |
| Input validation, auth, concurrency, data lifecycle, idempotency | N/A because the scanner is a read-only local text/fs scan | Those dimensions do not apply | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Path-error detection and severity buckets only | Spec Out of Scope + diff review |
| Atomic criteria | AC1–AC7 each have a pass/fail observation | Authoring validator + implementation check |
| Failure modes | Unresolvable real paths stay reported; non-paths skip | AC1, AC3, AC7 |
| Stack invariant | Read-only Node helper, launched with `node`, no writes | `ws-check-harness` + read-only contract |
| Observation telemetry | Named Path-errors row set before/after the change | Validation notes below |
| Open blockers | None | Prior-work sweep found no open PR for issue 469 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- A healthy install's Path-errors row count drops to the real-break set.
- Rows for repo-root-relative citations that exist at the project root disappear.
- Markdown link rows are validated against their hrefs.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on this spec exits 0 before register.

### Negative & Failing Test Scenarios

- Cite a repo-root-relative path that exists at the project root from a skill doc: the scanner must not report a path error.
- Add a deliberately broken real path reference: the scanner must still report it.
- Include `2>/dev/null`, `~/x`, and `path/to/feature.spec.md` as example snippets: the scanner must not report them as broken paths.

## Original Issue Context

# ws-doctor: path-error section reports widespread false positives (base resolution + link text + prose)

## Failure class

`ws-doctor` (read-only diagnostic) reports ~200 "path errors" on a healthy install, drowning the signal. Spot-verification shows effectively **zero real broken paths** in the sample triaged — every checked row was an expansion-base or scanning artifact. A doctor whose Path-errors section cries wolf on every run cannot distinguish broken installs from prose.

## Observed classes (all reproduced in one run)

1. **Citation base is the citing file, not the project root.** Skill docs cite repo-root-relative paths (`.ws/config.json`, `.ws/STACK.md`, `.agents/plans/…`) as prose. The engine expands them against the citing file's directory, yielding `.agents/skills/<id>/.ws/config.json`, then reports a break — while the repo-root path exists and the same run loads it successfully in the Configuration section.
2. **Markdown link display text scanned instead of the href.** Table rows like `` [`../ws-spec-to-pr/ARTIFACTS.md`](../../ws-spec-to-pr/ARTIFACTS.md) `` are flagged on the backticked display path (`../ws-spec-to-pr/…` resolves to a non-existent `ws-shared/ws-spec-to-pr/…`), while the actual href (`../../ws-spec-to-pr/…`) resolves and exists. Example source: `ws-shared/runtime/gates.md`, `ws-shared/runtime/AGENTS.md`.
3. **Home/shell/placeholder tokens treated as paths.** `~/…`, `2>/dev/null`, `>/dev/null`, `IDE/agent`, `{true/false}`, `(relative/path)`, `path/to/feature.spec.md`, `src/auth.ts:42`, `db/migrations/…` (example snippets) are reported as unresolvable paths.
4. **Optional brace-token fallbacks reported as missing.** `{skillsRoot}/ws-memo/SKILL.md` / `ws-session-tracking/SKILL.md` are documented external skills with an explicit `{globalSkillsRoot}` fallback (`skip if neither path exists`); the local-skill-tree scan flags them although the global install exists and the consumer hub documents the fallback.
5. **Own-directory citation expanded one level too deep.** A hub file citing its own directory (`.ws/AGENTS.md` → `.ws/`) expands to `.ws/.ws`.
6. **Archived run artifacts scanned as live citations.** Markdown under `ws-fix-pr/runs/pr-*/` (historic gate reports citing example files, other repos' sources, `ws-memo/scripts/helper.py`) is treated as current skill references.

## Expected contract

- Resolve repo-root-relative citations against the project root first (the Configuration section already knows it), falling back to citing-file-relative only for explicit relative links.
- For Markdown links, validate the **href**; treat backticked display text inside a link as prose unless it is the sole path reference.
- Skip fenced code blocks, example placeholders (`path/to/…`, `(…)`), shell redirects, `~/` home paths, and prose like `IDE/agent`.
- External/fallback tokens (`{skillsRoot}` OR `{globalSkillsRoot}` alternatives, "skip if missing") count as resolvable when **any** documented alternative exists.
- Archive/example trees (`*/runs/pr-*/`, `examples.md` fixtures) are excluded by default or reported in a separate low-severity `info` bucket.

## Impact

The headline Path-errors table becomes unusable on healthy installs; real breaks (if any) are invisible in noise. Downstream agents told to "act on doctor findings" would chase phantom paths.

## Reproduction

Run the doctor with no flags against a fresh install and compare Path-errors rows against actual existence at the project root; also compare link-text rows against their hrefs.

## Anonymization

Repo-relative harness paths and generic failure-class wording only; no consumer repository names, absolute local paths, hostnames, transcripts, or credentials.

### Prior Work Sweep

No open pull request references issue 469. Keyword search (`ws-doctor`, `path errors`) returned only merged PRs (#191 the doctor skill, #206 a prior false-positive fix). None address this expansion-base and scanning class. Design-intent note: the scanner lacked a model of repo-root-relative citations, Markdown hrefs, and example prose.

## Notes

Lookup: `ws-doctor` path scanning is under `.agents/skills/ws-doctor/scripts/`. Stack file is the Node 22 skill package. MEMORY had no trap that changes this fix.
