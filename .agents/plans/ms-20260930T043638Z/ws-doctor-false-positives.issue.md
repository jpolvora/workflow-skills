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
