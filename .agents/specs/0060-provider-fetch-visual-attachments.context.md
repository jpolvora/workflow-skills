# Feature Boundary

Inbound `fetch-to-spec` for GitHub issues and Azure DevOps work items currently keeps remote image URLs (or strips HTML `<img>` tags) and never downloads AttachedFile relations. Screenshots and mockups that authors embed as examples or templates never become local, inspectable inputs for spec reformulation, planning, or implementation.

This spec extends the **existing** SCM `fetch-to-spec` behavioral guarantee so both [`ws-spec-provider-github`](../.agents/skills/ws-spec-provider-github/SKILL.md) and [`ws-spec-provider-azure-devops`](../.agents/skills/ws-spec-provider-azure-devops/SKILL.md) download visual attachments, rename them, and surface them in the spec of record. Callers keep using the intent name only. Host CLI/API recipes stay inside each `INTENTS.md`.

In scope:

- Parity-first change to `fetch-to-spec` on **both** SCM implementers in the same ship (contract + SKILL tables + INTENTS headings + converters).
- Shared on-disk shape (`{stem}.assets/`, `manifest.json`, `## Visual References`) so GitHub vs ADO output is interchangeable downstream.
- Agent Read of downloaded images during `ws-spec-write` reformulation and later plan/implement steps.
- Register copy of assets into `{us-dir}/attachments/` via `ws-spec-provider-local` (not an SCM implementer).

Out of scope:

- A new SCM intent id, or a GitHub-only / ADO-only attachment intent (would fail `test/test-provider-parity.js` unless allowlisted; allowlist stays empty).
- Changing the other eight required intents (`validate-auth`, `create-pr`, threads, sweep, comment, merge).
- Making `ws-spec-provider-local` fetch remote tracker binaries.

# Implementation Decisions

1. **Chosen contract shape: extend `fetch-to-spec`, do not add an intent**
   - *Rationale:* [`scm-provider-contract.md`](../.agents/skills/ws-shared/scm-provider-contract.md) requires identical intent ids and behavioral guarantees. Attachment ingest is inbound fetch, not a new PR/thread operation. Shared rule 6: new intents must land on both implementers or take an allowlist row; extending the existing guarantee avoids a tenth intent and keeps callers intent-name only.

2. **Chosen storage: spec-of-record sidecar `{specsDir}/{specStem}.assets/`**
   - *Rationale:* `{us-dir}` is cleaned with the plan; screenshots used as templates must survive next to the spec of record. `{specStem}` matches the spec filename without `.spec.md` so prefix-ordered names (`NNNN-us-123.spec.md`) stay paired. Register copies that directory to `{us-dir}/attachments/` for workflow convenience.

3. **Chosen analysis split: scripts download; agents Read images**
   - *Rationale:* Python converters cannot reliably interpret UI mockups. Shared ingest writes files + manifest. `ws-spec-write` (and later plan/implement skills) Read each `ok` image and fold visible constraints into prose/ACs. Non-image allowed files are linked, not vision-analyzed.

4. **Chosen shared helper for naming and manifest**
   - *Rationale:* "Host mapping differs; behavior does not." URL discovery stays per provider (markdown/comments vs HTML/relations/WIT comments). One `ws-shared` ingest helper owns allowlist download, `{NN}-{kind}-{stem}{ext}` names, sha256, and `manifest.json` so GitHub and ADO cannot drift.

# Deferred Ideas

- OCR / structured UI-tree extraction from screenshots (vision Read is enough for v1).
- Uploading local assets back to the tracker.
- Config toggle to disable ingest (always on during `fetch-to-spec`; converters may take `--skip-assets` for offline fixtures only).
- SVG ingest (rejected in v1 as `disallowed-type` because of scriptable content).
