### [2026-08-27] JSON state hub whitelist and memory sanitizer siblings

- **Layer:** harness
- **Module:** install-rules / workflow_state / ws-self-learning
- **Severity:** High
- **PathPattern:** bin/install-rules.js;**/workflow_state.cjs;**/self_learning.cjs;**/sanitize_memory.cjs
- **Scenario / Context:** JSON-primary `{workflow-id}.state.json` plus `ws-shared/schemas/handoff.schema.json` and a compile-time sanitizer. Install tree verification failed because the new hub directory was packed but not on `HUB_WHITELIST`. Hybrid compile failed because a fixture copied `self_learning.cjs` without sibling `sanitize_memory.cjs`. Idempotent `finish` hash checks on a shared fixture after later steps rewound `currentStep`.
- **DO NOT:** Add files under `ws-shared/` (new dirs such as `schemas/`) without listing that dir or file on `HUB_WHITELIST`. Require `./sanitize_memory.cjs` from `self_learning.cjs` then copy only the parent script in test scaffolds. Assert identical `finish` is hash-stable on a workflow that already advanced past that step. Wrap `{path-tokens}` in markdown backticks inside JavaScript template literals. Run `build-site:bump` after already incrementing `package.json`.
- **INSTEAD DO:** Keep copy and hash enumeration in lockstep: whitelist new hub dirs (`schemas` like `scripts`). Copy `sanitize_memory.cjs` next to `self_learning.cjs` in any isolated skill tree. Use a dedicated dispatch→finish→finish fixture for AC30. Use HTML `<code>` in `build-site.js` template strings. Bump version once (prefer `build-site:bump` from the previous patch).
