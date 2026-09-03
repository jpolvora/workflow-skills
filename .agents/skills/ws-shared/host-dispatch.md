# Host Environment Detection & Subagent Dispatch Adapter

**Audience: Agents and Orchestrators**
**Role:** Canonical guide and execution adapter for dispatching subagents across diverse host agent environments (multi-agent hosts, single-session interactive hosts, and headless CLI runners).

---

## 1. Architectural Philosophy: Neutrality & Context Pointers

Shipped skills in this harness are **agent- and IDE-neutral**. Core workflows define *what* needs to be executed; the host adapter resolves *how* the host environment executes sub-tasks.

### Core Principles

1. **Portable Vocabulary:** Workflows call the portable capability aliases `dispatch-agent` and `user-gate` (defined in [`tools.md`](tools.md)). Skills never name host products.
2. **Context Pointers Architecture (Zero Transcript Dumping):**
   - Communication between the orchestrator and subagents must be **sparse**.
   - The orchestrator does **not** dump entire conversation histories or transcripts into subagents.
   - The orchestrator communicates primarily through **discrete file pointers** (`{us-dir}/step-00-{slug}.spec.md`, `{us-dir}/plan.index.json`, `{us-dir}/ac-ledger.json`, `{us-dir}/handoff/step-{NN}.json`).
3. **Orchestrator Immutability (with isolated-mode exception):** The orchestrator session stays on the active session model (`currentModel`) and never edits application product files directly, except when operating under Inline Isolated Execution where the session model temporarily adopts the step persona (see §3 Tier 3). All other file modifications are delegated to subagents.

---

## 2. Host Capability Discovery (neutral matrix)

Orchestrators inspect the active session tool palette and environment signals at bootstrap (and before first dispatch) to resolve three neutral flags. Config override `defaults.hostAdapter.mode` wins over auto-discovery when set to `native-tool` | `cli-command` | `inline-isolated`.

| Capability flag | Discovery signal | Meaning |
|---|---|---|
| `hasStructuredChoiceTool` | A modal choice tool accepting structured options and blocking execution until user submission is declared in the session tool palette | `user-gate` binds to that modal tool; else markdown fallback with strict turn-yielding per [`gates.md`](gates.md) |
| `hasSubagentTool` | A native subagent dispatch tool is declared in the session tool palette | `dispatch-agent` uses Tier 1; else Tier 2 / Tier 3 |
| `hasBrowserTool` | A browser verification tool is declared | Step 7 delegates browser verification to that tool via portable `browser-mcp`; else skip per test-surface probe |

Log `host-capability-detect | subagent={mode} | gate={mode} | ISO` to step telemetry JSONL during Step 0. Record `user-gate-modal` or `user-gate-fallback` in gate history per [`gates.md`](gates.md).

### Resolution Rules

1. **`mode: "auto"` (Default):** Use the discovery table above to pick the best available mechanism (Tier 1 → Tier 2 → Tier 3).
2. **`mode: "native-tool"`:** Force invocation of the host native subagent tool, even when a CLI runner also exists.
3. **`mode: "cli-command"`:** Execute the formatted `cliTemplate` via `run_command` as a background task, even when a native tool exists.
4. **`mode: "inline-isolated"`:** Force inline execution with clean context pointers (never rely on host subagent tools).

---

## 3. Subagent Execution Tiers (normative)

### Tier 1 — Native subagent tool

- **When:** `hasSubagentTool` is true and resolved mode is `auto` or `native-tool`.
- **How:** Dispatch via the native tool with `description: "STP step {N} — {Label}"`, model hint from `defaults.modelsPreset` / `stepModels` when the tool supports it, and discrete context pointers only (see §5).
- **Telemetry:** standard dispatch/finish events.

### Tier 2 — Background CLI runner

- **When:** no native tool is declared but a CLI subagent runner is configured (`defaults.hostAdapter.cliTemplate`) or available in PATH, and resolved mode is `auto` or `cli-command`.
- **How:** Launch the step as a background task via `run_command` using the configured CLI template, passing the same context-pointer payload as Tier 1. The template receives `{prompt}`, `{cwd}`, and `{slug}` substitutions.
- **Example template shape (neutral):**
  ```text
  {cli} run --prompt "{prompt}" --working-dir "{cwd}"
  ```

### Tier 3 — Inline Isolated Execution (Clean Context Pointer Mode)

- **When:** neither a native tool nor a CLI runner is available, or resolved mode is `inline-isolated`.
- **How:** The session model temporarily adopts the specific step persona (e.g. Coder for Step 4, Reviewer for Step 6) within a strict context boundary:
  1. Load **only** the pointed artifacts (`{us-dir}/handoff/step-{NN-1}.json`, `plan.index.json`, `ac-ledger.json`, spec/plan of record).
  2. Execute the step actions (reading, modifying via native file tools, running configured verification).
  3. Emit the structured `step-output` block (`status`, `files_touched`, `notes`, `next_step_ready`).
  4. Call `node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs finish --step {N} ...`.
- **Telemetry:** log `inline-isolated-step | step {N} | ISO`.
- **Invariant reconciliation:** while the orchestrator persona never edits code, the session model executing under the step temporary persona IS authorized to edit product files with native file tools in this tier only.

### Browser verification (Step 7)

- When `hasBrowserTool` is true, delegate browser UI verification via portable `browser-mcp` in normal, non-dry-run, gated runs.
- Otherwise follow the `ws-testing` test-surface probe (skip only on `skipTesting` or no surface).

---

## 4. Configurable Host Dispatch Adapter (`config.json`)

Projects can configure and customize subagent dispatch behavior in `.agents/skills/ws-shared/config.json` under `defaults.hostAdapter`:

```json
{
  "defaults": {
    "hostAdapter": {
      "mode": "auto",
      "_comment_mode": "Supported modes: auto | native-tool | cli-command | inline-isolated",
      "cliTemplate": "",
      "_comment_cliTemplate": "Optional CLI template for custom subagent execution, e.g.: \"{cli} run --prompt \\\"{prompt}\\\" --cwd \\\"{cwd}\\\"\"",
      "browserTool": "browser-mcp",
      "stepOverrides": {
        "7": {
          "browserTool": "browser-mcp"
        }
      }
    }
  }
}
```

Legacy named host values (if present in older configs) resolve to neutral tiers: native-capable hosts → `native-tool`, runner-capable hosts → `cli-command`, otherwise → `inline-isolated`. New configs MUST use only the four neutral modes.

---

## 5. Context Pointers Dispatch Protocol

When constructing the prompt for any subagent dispatch (or isolated step execution), follow this exact structure:

```text
=== TASK DISPATCH: Step {N} ({Label}) ===
Workflow ID: {workflow-id}
Target Slug: {slug}
Role / Model: {resolvedModel}

CONTEXT POINTERS:
- Spec: {resolvedSpecPath}  # from `node {skillsRoot}/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug {slug}`
- Context (optional): {resolvedContextPath}  # same helper with --context
- Plan Index: {us-dir}/plan.index.json
- AC Ledger: {us-dir}/ac-ledger.json
- Prior Handoff: {us-dir}/handoff/step-{NN-1}.json

INSTRUCTIONS:
1. Read the referenced context pointers. Do not request or expect full conversation history.
2. Execute the actions required for Step {N} per {skillsRoot}/ws-spec-to-pr/STEP-DISPATCH.md.
3. Validate changes against configured verification commands.
4. Output a parseable step-output block upon completion.

OUTPUT FORMAT:
```json
{
  "status": "completed | failed | skipped",
  "files_touched": ["..."],
  "notes": "...",
  "next_step_ready": true
}
```
========================================
```

---

## 6. Integration Checklist for Skills

When creating or modifying workflow skills:
- [ ] Use `dispatch-agent` as the standard alias in skill tables.
- [ ] Pass file paths via tokens (`{us-dir}`, `{specsDir}`, `{skillsRoot}`) rather than inlined file contents.
- [ ] Never hardcode host-specific slash commands or product names into skill bodies.
- [ ] Allow `hostAdapter` in `config.json` to customize or override subagent dispatch.
- [ ] Support native-tool, CLI-runner, and inline-isolated hosts seamlessly via the tier ladder.
