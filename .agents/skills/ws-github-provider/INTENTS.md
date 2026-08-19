# ws-github-provider — Intent procedures

Load when executing an intent from [`SKILL.md`](SKILL.md). Expand `{plansDir}` (`plans.dir`, default `.agents/plans`) and `{specsDir}` (`plans.specsDir`, default `.agents/specs`) from config. Resolve `{owner}/{repo}` from config — never literals.

## `validate-auth`

```bash
gh auth status
```

- Exit 0 → pass for CLI issue/PR flows.
- Non-zero → instruct `gh auth login` (or fix `GH_TOKEN` / host); **STOP**.
- For `list-threads` / `resolve-thread`, also require a token in `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN`, `GITHUB_TOKEN`, or `GH_TOKEN`. If missing, print the scripts’ token hint and **STOP**.

## `fetch-to-spec`

Entry: `{n}`, `US {n}`, or GitHub issue URL → slug `us-{n}`.

**Three ordered phases — fetch snapshot, reformulate & enhance via `ws-write-spec` to `{specsDir}`, then register workflow copy in `{plansDir}` via `ws-local-spec-provider`.** Never write `step-00` directly from the converter.

```bash
mkdir -p {plansDir}/us-{n}
# 1. Fetch raw issue snapshot
gh issue view {n} --json number,title,body,state,labels,assignees,comments,url \
  > {plansDir}/us-{n}/step-00-us-{n}.issue.json

# 2. Spec of record → {specsDir}/us-{n}.spec.md (enhanced via ws-write-spec; resolves plans.specsDir)
# Base converter or ws-write-spec parses the snapshot and builds an agentic-enhanced spec:
python .agents/skills/ws-github-provider/scripts/github-issue-to-spec.py \
  --input {plansDir}/us-{n}/step-00-us-{n}.issue.json \
  --repo {owner}/{repo}

# 3. Workflow copy → {plansDir}/us-{n}/step-00-us-{n}.spec.md (keeps source: github)
python .agents/skills/ws-local-spec-provider/scripts/register_local_spec.py \
  --input {specsDir}/us-{n}.spec.md --source github
```

| Note | Detail |
|------|--------|
| Raw `*.issue.json` | Audit snapshot only — stays a plan artifact under `{us-dir}`; downstream steps never read it |
| Agentic Reformulation | `ws-write-spec` reformulates and enhances raw issue descriptions into unambiguous, testable ACs while preserving human text in `## Original Issue Context` |
| Re-fetch over an existing run | The converter (Step 2) refuses first when the spec of record differs (`--force` on the converter), and Step 3 refuses when `step-00` differs (`--force` on register); re-run with `--force` after confirming |
| Explicit paths | `--output` (converter) / `--specs-dir` / `--plans-dir` (register) override the config-resolved defaults |
| Promotion owner | `register_local_spec.py` from [ws-local-spec-provider](../ws-local-spec-provider/SKILL.md) is the single promotion primitive for every provider |


## `create-pr`

```bash
gh pr create --head {head} --base {base} --title "{title}" --body-file {plansDir}/pr-body.md
```

On Windows / PowerShell prefer `--body-file` (or single-quoted body) to avoid backtick escape mangling. Reuse an existing open PR for the same head→base when present. Capture PR number and URL for the caller (`ws-ship-pr`).

## `list-threads`

```bash
node .agents/skills/ws-github-provider/scripts/fetch_threads.cjs {PR_ID} [--json]
```

Return structured threads (`threadId`, path, line, comments) to `ws-fix-pr` / `ws-goal-fix-pr`.

## `check-pr-status`

```bash
gh pr checks {PR_ID}
```

- Evaluates CI checks and automated code-review action status.
- Finished when all checks/runs have completed status (none `pending`, `in_progress`, or `queued`).

## `resolve-thread`

```bash
node .agents/skills/ws-github-provider/scripts/resolve_thread.cjs {THREAD_ID} "{resolution note}"
```

> **IMPORTANT**: Never call `addPullRequestReviewThreadReply` alone. Always use `resolve_thread.cjs`, which calls both `addPullRequestReviewThreadReply` AND `resolveReviewThread` atomically in one GraphQL mutation. Posting the `<!-- resolution-reply -->` marker comment without the `resolveReviewThread` mutation is **not** a resolved thread — `isResolved` will remain `false` until the mutation fires.

Skip remote mutation when the parent skill is in `dry-run`.

## `merge-pr`

```bash
gh pr checks {PR_ID} --watch
gh pr merge {PR_ID} --merge
```

Do **not** add `--delete-branch` for the configured working branch (`project.workingBranch`, default `develop`).
