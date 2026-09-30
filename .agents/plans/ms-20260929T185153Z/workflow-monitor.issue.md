# ws-monitor: slug-scoped scan drops canonical runId-foldered `ws-spec-multi` batch state

## Failure class

Slug-scoped workflow discovery (`--slug`) does not return every run whose reported `slug` equals the filter, while the unfiltered scan and `--workflow-id` do. A canonical batch state file can be invisible to slug-scoped monitoring, so a scoped `--watch --until-terminal` can exit "finished" while a batch run it should observe is never reported.

## Reproduction (portable)

Given three multi-spec batch states that all report `slug: ws-spec-multi`:

1. Unfiltered scan lists all three:
   `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --json`
   → workflowCount includes `ms-20260927T130013Z`, `ms-20260928T010610Z`, `ms-20260929T185153Z` (all `slug: ws-spec-multi`).
2. Slug-scoped scan returns only two:
   `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug ws-spec-multi --json`
   → `ms-20260927T130013Z`, `ms-20260928T010610Z` only; `workflowCount: 2`.
3. Workflow-id scan returns the missing run:
   `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --workflow-id ms-20260929T185153Z --json`
   → `workflowCount: 1`, run found.

## Observed correlation (hypothesis, not yet confirmed)

The two runs returned by the slug filter live under a slug-named plan folder (`{plansDir}/ws-spec-multi/*.state.md`). The dropped run uses the canonical batch layout `{plansDir}/{runId}/{runId}.state.md` (per the `ws-spec-multi` artifact contract). The slug filter appears to match the plan folder name (or a slug derived from it) instead of the state file's reported `slug`, so runId-foldered batches are excluded.

## Expected contract

`--slug <value>` selects every discovered run whose state-derived `slug` equals `<value>`, independent of the plan folder name or state-file layout (slug-named folder, canonical runId folder, or legacy flat file).

## Impact

- Scoped `--watch --until-terminal` terminates as "already terminal" while the canonical batch is never in scope.
- Scoped reports (`--report`) silently omit a run, understating queue progress and findings.
- Batch runs written to the canonical layout are effectively unmonitorable by slug.

## Environment notes

- Observed on a snapshot where all three runs were `status: completed` (no active runs), so the drop is independent of run liveness.
- Monitor package version at observation time: see `ws-version` output in the maintainers' environment; no state files were modified while reproducing.

## Anonymization

Body contains only repo-relative harness paths and generic failure-class wording; no consumer repository names, absolute local paths, hostnames, transcript contents, or credentials.
