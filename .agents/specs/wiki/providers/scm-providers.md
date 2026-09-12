# SCM Providers (`providers`)

## Feature Overview

Three provider skills own all tracker and PR intents behind one parity contract, so orchestrators never embed host CLI names: `ws-spec-provider-github` (issues → specs, PR ops), `ws-spec-provider-azure-devops` (work items → specs, PR ops), and `ws-spec-provider-local` (hand-written `*.spec.md` detection, normalization, registration). Exactly one provider is active per project (`providers.active`); the PR/thread host (`providers.scm`) may differ, supporting hybrid local-specs plus remote-PRs. `fetch-to-spec` downloads tracker images and attachments identically on both remotes.

## Business Rules & Logic

- **Intent parity**: GitHub and Azure DevOps implement the same required intents (`fetch-to-spec`, `validate-auth`, `create-pr`, `list/resolve-thread`, `merge-pr`); only URL discovery may differ, and one-sided behavior fails closed.
- **Local registration first**: local writes stay `source: local` and must register `{specsDir}/{slug}.spec.md` before any `{plansDir}` copy; the working branch is never deleted by default.
- **Attachment tolerance**: per-file 404/403/timeout, size caps, and disallowed hosts/types are tolerated per file; auth failures STOP the fetch.
- **Thread resolution is explicit**: posting a fix reply never marks a thread resolved — the `resolveReviewThread` GraphQL mutation (with `threadId` from the `reviewThreads` node) must run after reply/commit verification, with graceful fallback when the id is unavailable.

## Technical Architecture

- **Contract**: `ws-shared/runtime/scm-provider-contract.md` is the normative intent surface; converters are provider-local, ingestion helpers are shared under `ws-shared/scripts`.
- **Artifacts**: `{specStem}.assets/{NN}-{kind}-{stem}{ext}` plus `manifest.json`, a `## Visual References` spec section, and a `{us-dir}/attachments` register copy.
- **CLI**: `gh api graphql ... resolveReviewThread(input:{threadId})`, `register_local_spec.cjs --source`, `validate-auth` preflight in ship/fix flows.
- **Provenance**: living synthesis of specs 0001, 0006 (thread resolve), and 0060.
