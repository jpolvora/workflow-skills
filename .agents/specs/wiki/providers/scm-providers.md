# SCM Providers (`providers`)

> Provenance: `.agents/skills/ws-shared/runtime/scm-provider-contract.md`, `.agents/skills/ws-spec-provider-github/SKILL.md`, `.agents/skills/ws-spec-provider-azure-devops/SKILL.md`, `.agents/skills/ws-spec-provider-local/SKILL.md`, `test/test-provider-parity.js`, living synthesis of specs 0001, 0006, 0060, 0084.

## Feature

Three provider skills own all tracker and pull-request intents behind one parity contract so orchestrators never embed host CLI names directly. `ws-spec-provider-github` converts GitHub issues to specs and performs PR operations. `ws-spec-provider-azure-devops` converts Azure DevOps work items to specs with the same intent surface. `ws-spec-provider-local` detects hand-written `*.spec.md` files, normalizes them, and registers them into the workflow tree. Exactly one provider is active per project through `providers.active`, while the PR and review-thread host (`providers.scm`) may differ, supporting hybrid flows such as local specs with GitHub pull requests. Shared `fetch-to-spec` behavior downloads tracker images and attachments identically on both remote providers.

## How it works

GitHub and Azure DevOps must implement the same required intents: `validate-auth`, `fetch-to-spec`, `create-issue`, `create-pr`, `list-threads`, `sweep-prior-work`, `check-pr-status`, `resolve-thread`, `comment-issue`, `close-issue`, and `merge-pr`. `create-issue` opens a new tracker item from an anonymized defect report (failure class, contract to change, evidence, reproduction shape) and returns its URL and id. Dry-run prints the payload. `validate-auth` runs before the mutation. The monitor stall and defect observer uses this intent when `--open-issue` is set. Only URL discovery may differ; one-sided behavior fails closed in `test/test-provider-parity.js`. `comment-issue` posts a comment and never changes work-item state. `close-issue` is the explicit transition: GitHub runs `gh issue close`, and Azure DevOps patches the work item to Closed (Done only when the process rejects Closed). Callers invoke it after merge when threads are zero, including when the pull request base is not the repository default branch, because `Closes #N` in the PR body auto-closes only on that default branch. A null or non-numeric id exits 0 with status `skipped`. Dry-run prints the planned close and does not call the host. Authentication failure stops with `validate-auth` and does not fall through to the other provider. Local provider writes stay `source: local` and must register `{specsDir}/{slug}.spec.md` before any `{plansDir}` copy is created. The working branch is never deleted after merge.

Attachment ingestion tolerates per-file 404, 403, timeout, size caps, and disallowed hosts or MIME types without aborting the entire fetch, but authentication failures STOP the run. Files land in `{specStem}.assets/` with a `manifest.json`, patch a `## Visual References` section into the spec, and copy the sidecar to `{us-dir}/attachments/` at register time.

Thread resolution is explicit: posting a fix reply never marks a thread resolved. The `resolveReviewThread` GraphQL mutation (GitHub) or equivalent ADO procedure must run after reply and commit verification using the `threadId` from structured thread listings. Dry-run callers skip remote mutation. Resolution comments must describe the correction, not hash-only or filler text.

Local provider delegates PR intents to `providers.scm`; `scm: "local"` is rejected for PR, thread, and merge operations. Step skills hold no provider resolution tables of their own: `ws-fix-pr`, `ws-goal-fix-pr`, and `ws-ship-pr` call intents by name and point at `config-resolution.md` plus this contract, and raw `gh` or `az` command literals are banned from skill bodies.

## Backend

The normative contract lives in `ws-shared/runtime/scm-provider-contract.md`. Converters are provider-local; shared ingestion helpers live under `ws-shared/scripts`. Registration uses `register_local_spec.cjs --source` after `ws-spec-write` produces the specs-of-record file. Ship and fix flows run `validate-auth` preflight before mutating remotes.

CLI examples include GitHub GraphQL `resolveReviewThread(input:{threadId})` and ADO WIT comment APIs at documented preview versions. Parity verification is `node test/test-provider-parity.js`, also wired into `npm run test`.

## Third-party services

GitHub and Azure DevOps are the supported SCM backends for authentication, issue or work-item fetch, pull-request creation, review-thread listing and resolution, CI status checks, and merge operations. Orchestrators call intents by name; host-specific CLI recipes (`gh`, `az`, REST, or GraphQL) stay inside each provider's `INTENTS.md`. Switching providers without user confirmation is forbidden when auth or SCM resolution fails.
