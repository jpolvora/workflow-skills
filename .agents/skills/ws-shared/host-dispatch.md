# Host Environment Detection & Subagent Dispatch Adapter

**Audience: Agents and Orchestrators**  
**Role:** Canonical guide and execution adapter for dispatching subagents across diverse host IDEs and agent platforms (Antigravity IDE / Gemini, Cursor IDE, OpenCode, Claude Code, Codex, and headless CLI runners).

---

## 1. Architectural Philosophy: Neutrality & Context Pointers

Shipped skills in this harness are **agent- and IDE-neutral**. Core workflows define *what* needs to be executed; the host adapter resolves *how* the host environment executes sub-tasks.

### Core Principles

1. **Portable Vocabulary:** Workflows call the portable capability alias `dispatch-agent` (defined in [`tools.md`](tools.md)).
2. **Context Pointers Architecture (Zero Transcript Dumping):**
   - As established in spec-driven patterns (e.g. `mattpocock/skills` #998 `implement-spec`), communication between the orchestrator and subagents must be **sparse**.
   - The orchestrator does **not** dump entire conversation histories or transcripts into subagents.
   - The orchestrator communicates primarily through **discrete file pointers** (`{us-dir}/step-00-{slug}.spec.md`, `{us-dir}/plan.index.json`, `{us-dir}/ac-ledger.json`, `{us-dir}/handoff/step-{NN}.json`).
3. **Orchestrator Immutability:** The orchestrator session stays on the active session model (`currentModel`) and never edits application product files directly. All file modifications are delegated to subagents or isolated step execution.

---

## 2. Host Environment Detection Matrix

Orchestrators detect the runtime environment by inspecting available host tools, environment variables, or workspace indicators, then select the optimal subagent dispatch strategy:

| Host Environment | Detection Signals / Signatures | Primary Dispatch Mechanism | Fallback Mechanism |
|---|---|---|---|
| **Google Antigravity / Gemini IDE** | Presence of `browser_subagent`, `manage_task`, `schedule`, `agy` CLI in PATH, or active `.gemini/` workspace metadata. | **1.** `browser_subagent` for Step 7 browser verification.<br>**2.** Background tasks via `run_command` (`agy` CLI / Python SDK).<br>**3.** **Inline Isolated Sub-Context** (Clean Context Pointer mode). | Inline isolated execution with structured prompt boundaries. |
| **Cursor IDE (Composer)** | Active Composer session, `@agent` / Composer subagent delegation tools. | Native `dispatch-agent` / Composer subagent tool. | Background agent task. |
| **OpenCode** | OpenCode environment, `opencode-go` CLI in PATH. | `opencode-go` subagent dispatch CLI command. | Background process (`run_command`). |
| **Claude Code** | Claude Code environment, native `Task` tool. | Native `Task` subagent tool. | `/plugin` slash command. |
| **Codex / Headless CLI** | Terminal CLI environment, headless runner. | CLI subprocess / background task. | Sub-shell command. |

---

## 3. Subagent Execution Patterns by Platform

### A. Google Antigravity & Gemini IDE

Antigravity IDE provides multiple avenues for executing subagent workflows:

1. **Browser Testing Subagent (Native Tool):**
   - In Step 7 (`ws-testing`), Antigravity IDE natively provides the `browser_subagent` tool.
   - Orchestrator delegates browser UI verification, navigation, and visual regression checks directly to `browser_subagent`.

2. **Background CLI / Task Execution:**
   - In environments where the Antigravity CLI (`agy`) or Antigravity Python SDK (`google-antigravity`) is available:
   - Orchestrator can launch subagents as background tasks using `run_command` with `manage_task` or `schedule`:
     ```bash
     agy run --prompt "{prompt}" --working-dir "{cwd}"
     ```

3. **Inline Isolated Execution (Clean Context Pointer Mode):**
   - When running inside interactive sidebar chat without a dedicated multi-turn subagent tool:
   - The orchestrator executes the step within a **strict mental context boundary**:
     - Load **only** the pointed artifacts (`{us-dir}/handoff/step-{NN}.json`, `plan.index.json`, etc.).
     - Execute the step actions (reading, modifying, running tests).
     - Emit the structured `step-output` block.
     - Call `node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs finish --step {N} ...`.

### B. Cursor IDE

1. **Native `dispatch-agent`:**
   - Cursor natively maps `dispatch-agent` to subagent composer threads.
   - Passes model hints (e.g. `Model: {modelName}` from `modelPresets`).

### C. OpenCode & Claude Code

1. **OpenCode:**
   - Dispatches via `opencode-go` CLI or OpenCode subagent protocol with specified model parameters (`deepseek-v4-pro`, `deepseek-v4-flash`, etc.).
2. **Claude Code:**
   - Dispatches via native `Task` tool with role-specific system prompts.

---

## 4. Configurable Host Dispatch Adapter (`config.json`)

Projects can configure and customize subagent dispatch behavior in `.agents/skills/ws-shared/config.json` under `defaults.hostAdapter`:

```json
{
  "defaults": {
    "hostAdapter": {
      "mode": "auto",
      "_comment_mode": "Supported modes: auto | native-tool | cli-command | inline-isolated | antigravity | cursor | opencode | claude",
      "cliTemplate": "",
      "_comment_cliTemplate": "Optional CLI template for custom subagent execution, e.g.: agy run --prompt \"{prompt}\" --cwd \"{cwd}\"",
      "browserTool": "browser_subagent",
      "stepOverrides": {
        "7": {
          "browserTool": "browser_subagent"
        }
      }
    }
  }
}
```

### Resolution Rules

1. **`mode: "auto"` (Default):** The orchestrator uses the detection matrix in Section 2 to pick the best available mechanism.
2. **`mode: "native-tool"`:** Force invocation of the host's native subagent tool (`dispatch-agent`, `Task`).
3. **`mode: "cli-command"`:** Execute the formatted `cliTemplate` via `run_command` as a background task.
4. **`mode: "inline-isolated"`:** Force inline execution with clean context pointers (never relying on host subagent tools).

---

## 5. Context Pointers Dispatch Protocol (Matt Pocock Pattern)

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
- [ ] Never hardcode IDE-specific slash commands or product names into skill bodies.
- [ ] Allow `hostAdapter` in `config.json` to customize or override subagent dispatch.
- [ ] Support both true subagent hosts (Cursor, Claude Code) and inline/task-based hosts (Antigravity IDE, CLI) seamlessly.
