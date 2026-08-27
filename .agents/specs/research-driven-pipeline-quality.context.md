# Context — Research-driven spec-to-pr pipeline quality

Gray-area product choices for `research-driven-pipeline-quality.spec.md`. Not a plan artifact.

## Feature Boundary

This program upgrades **how** `ws-spec-to-pr` and `ws-spec-to-pr-lite` plus shared pipeline skills persist state, prune context, hand off between steps, and optionally deepen review. It does **not** reopen shipped work in `harness-efficiency-and-verifiability.spec.md` (contextBudget, compact step outputs, ac-ledger, run.json as compact live snapshot, parallelVerifyReview). It does **not** replace portable `AGENTS.md` / `ws-shared` with host-private rule files.

In scope: RESEARCH.md §5 strategies 1–4, §2 session-bridge mapped onto existing `ac-ledger.json`, §2.4 memory sanitization, §6 authoring gaps, and a dual-mode handoff contract so the pack behaves as one production pipeline.

Out of scope: RESEARCH.md Strategy 5 (host `.cursor/rules` as shipped contract), new orchestrator FSM steps, new SCM intents, weakening fail-closed gates.

## Implementation Decisions

**1. One umbrella spec vs five per-strategy specs**

- **Chosen:** one program spec with independently shippable child workstreams (W1–W8).
- **Rejected:** five unrelated specs with no integration contract.
- **Why:** the user asked for pack-wide integration and production quality. Isolated JSON-state or prune work without a shared handoff schema would not make skills work as one system.

**2. JSON-primary state vs tighten Markdown-only validation**

- **Chosen:** `{workflow-id}.state.json` is the machine SoT; `.state.md` is a rendered human view written by the same Node writer. `run.json` stays a derived compact live snapshot hashed to that JSON.
- **Rejected:** leave `.state.md` as the only writer SoT and only add more Markdown validators.
- **Why:** RESEARCH.md §2.3 / Strategy 1; the package already mutates machine artifacts as JSON (`ac-ledger.json`, `plan.index.json`, `run.json`). Completing inversion avoids a third competing SoT. Human orch boards keep a Markdown view.

**3. Review jury default**

- **Chosen:** `defaults.reviewJury.size` default `1` (current single `reviewerModel` dispatch). Size `2`–`3` is opt-in for standard orch only.
- **Rejected:** default multi-judge on every consumer run.
- **Why:** extra review cost and merge complexity; production quality already has ledger score, fable, sabotage, and minVerifyScore. Jury is test-time compute for high-stakes repos.

**4. Background verbose-step dispatch**

- **Chosen:** default blocking `dispatch-agent` (today). Optional `defaults.contextHygiene.backgroundVerboseSteps` falls back to blocking when the host has no async job API. No product-branded subagent directories in skill bodies.
- **Rejected:** require background jobs as the shipped contract.
- **Why:** portability. Isolation value is the **consolidated handoff payload**, not the host scheduler.

## Deferred Ideas

- Host-native `clear_tool_uses` / thinking-prune APIs when a consumer host exposes them; orch protocol stays file-based handoff until then.
- Auto-enabling jury from `ws-classify-complexity` profiles (could follow in a later spec).
- Merging `run.json` into `state.json` as a single file (kept separate so existing ARTIFACTS and validate_state hash checks stay stable).
- Shipping upstream-only `.cursor/rules` mirrors (RESEARCH Strategy 5) as a separate dogfood task, never as consumer install content.
