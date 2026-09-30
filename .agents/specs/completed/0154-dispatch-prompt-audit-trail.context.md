# Context — Dispatch prompt audit trail

Companion to `0154-dispatch-prompt-audit-trail.spec.md`. Gray area: durable prompt placement, filename shape, lite parity, and delivery treatment each had more than one valid product option.

## Feature Boundary

In: persisting the exact dispatched prompt bytes plus a budget/refs/hash manifest per step, linking both from dispatch provenance, surviving cleanup, and gating the next pre-advance on presence and integrity.

Out: worker responses (already in step outputs and handoffs), host transcript capture (`agentTranscripts`), backfill of historical runs, and default Step 8 commit of prompts.

## Implementation Decisions

- **Placement beside step artifacts (`step-{NN}-{slug}.prompt.md`), not `.runtime/`:** chosen because `.runtime/` scratch is volatile and outside the preserved set; step-adjacent files inherit existing discovery globs and survive cleanup. Rejected alternative: keep prompts only under `.runtime/` (fails the audit goal) and single `prompts.jsonl` (unreadable diffs, parallel-write conflicts).
- **Separate markdown plus JSON manifest, not one combined file:** chosen so humans read the prompt and machines verify the manifest without parsing frontmatter out of prompt bytes. Rejected alternative: YAML frontmatter inside the prompt markdown (risks corrupting exact-byte audit fidelity).
- **Per-node DAG filenames (`step-04-{slug}.prompt.{node}.md`):** chosen to prevent parallel workers overwriting one shared Step 4 prompt on a single worktree.
- **Lite inline parity with `dispatchMode: inline`:** chosen so both orchestrators share one audit contract and one pre-advance gate; skip markers keep skipped steps explicit instead of absent.
- **Fail-closed pre-advance on missing or mismatched pair:** chosen because a silent gap defeats an audit trail; the error names the step for fast repair.
- **Excluded from G2-code and default Step 8 delivery:** chosen to keep product commits and delivery diffs free of potentially large prompt mirrors; prompts remain local audit artifacts.

## Deferred Ideas

- Opt-in Step 8 delivery toggle (for example `includeDispatchPrompts`) if consumers want prompts on the delivery commit.
- Prompt diff view across re-dispatch revisions (prior shas are retained in telemetry for a future renderer).
- Retention policy for very long runs (rotation or compression of prompt pairs) once size data exists.
