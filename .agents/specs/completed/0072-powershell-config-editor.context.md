# Context & Design Decisions — PowerShell Windows Forms Config Editor

This companion document captures the architectural background, trade-off analysis, control taxonomy, and UX design decisions for the PowerShell Windows Forms configuration tool in `workflow-skills`.

---

## 1. Feature Boundary

### Purpose & User Problem
Configuring `config.json` in `workflow-skills` is a prerequisite for project setup and fine-tuning. Today, users have two primary mechanisms:
1. **Manual JSON Editing:** High cognitive load, prone to syntax errors, missing optional keys, and lack of immediate schema feedback. While `templates/config.json.example` documents keys with `_comment_*` strings, navigating 350+ lines of dense JSON is intimidating.
2. **Terminal Interactive Wizard (`ws-configure-project` / `auto_configure.cjs`):** Great for bootstrapping, but linear, sequential, and cumbersome when a developer merely wants to toggle a single setting (e.g., `verboseMode`, `modelsPreset`, `enableDag`, `specializedSubagents`).

On Windows environments (especially for developers working in Cursor IDE, Visual Studio, or Windows Terminal), a lightweight, native, zero-dependency GUI tool using standard Windows Forms (`System.Windows.Forms`) provides an instant, visual, categorized settings editor that:
- Categorizes all 15+ sections of `config.json` into navigable tabs/groups.
- Renders appropriate UI control widgets based on data type (Checkboxes for booleans, ComboBoxes/RadioButtons for enums, NumericUpDown for integers/ranges, Path-picker textboxes with Browse buttons for files/directories).
- Extracts and surfaces extended descriptions from `config.schema.json` and `_comment_*` keys directly in the UI.
- Validates inputs before persisting.
- Safely updates `config.json` while preserving comments and backing up the original file.

### Reference Architecture: `cursor-profile-manager`
The GUI design, theming system, and control patterns are modeled after [`L:\source\cursor-profile-manager\cursor-profile-manager.ps1`](file:///L:/source/cursor-profile-manager/cursor-profile-manager.ps1):
- Uses native .NET Windows Forms (`System.Windows.Forms`) and GDI+ Drawing (`System.Drawing`).
- Compatible with Windows PowerShell 5.1 and modern PowerShell Core 7+.
- Full Dark and Light theme palettes with automatic Windows theme detection (`AppsUseLightTheme` registry query).
- Modern FlatStyle buttons with hover states (`Set-ButtonFlatStyle`).
- Native Win32 Cue text on TextBoxes (`TextBoxCue::SetCue`).
- Safe ASCII-encoded glyphs and resilient event loop handling.

---

## 2. Implementation Decisions

### Decision 1: Managed Script Placement in `ws-shared` Hub
- **Options Considered:**
  1. Root repository script (e.g. `./edit-config.ps1`).
  2. Sub-skill script inside `ws-configure-project/scripts/`.
  3. Managed runtime script inside `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` with an optional launcher alias.
- **Chosen Option:** Option 3.
- **Rationale:** Under `hub-layout.json`, everything in `runtime/` is classified as `managed`, ensuring the script is distributed to consumer projects during `npx workflow-skills install` or `update`, without polluting consumer project roots. A thin launcher or CLI command (`node bin/cli.js config-gui` or npm script) can invoke it seamlessly.

### Decision 2: Schema Reflection vs Structured Categorized UI
- **Options Considered:**
  1. *Pure Dynamic Reflection:* Dynamically parse `config.schema.json` and render a generic flat property grid.
  2. *Static Handcrafted Forms:* Hardcode every control with static positions.
  3. *Hybrid Model-Driven Layout:* Define strongly typed, organized categories (Tabs / Sidebar groups) with declarative field definitions that bind to JSON paths, pulling live descriptions, enum constraints, and defaults from `config.schema.json` and `config.json.example`.
- **Chosen Option:** Option 3 (Hybrid Model-Driven Layout).
- **Rationale:** Pure dynamic reflection yields an awkward, unordered list of fields that does not reflect workflow concepts (e.g. pairing `plannerModel` with `executionModel`, or grouping `providers.active` with `providers.scm`). Static forms become stale when schema expands. The hybrid approach gives a polished, user-friendly Tabbed/Grouped UX while dynamically pulling descriptions, enum values, and defaults from `config.schema.json` and `_comment_*` tags.

### Decision 3: Comment Extraction and Preservation Strategy
- **Context:** JSON does not natively support comments. `workflow-skills` embeds documentation directly in `config.json` and `config.json.example` using:
  - `_comment`: Block-level notes for sections (e.g. `plans._comment`, `providers._comment`).
  - `_comment_<prop>`: Property-specific documentation (e.g. `_comment_minVerifyScore`, `_comment_enableDag`, `_comment_specializedSubagents`).
- **Strategy:**
  1. When loading `config.json`, the editor also inspects `config.schema.json` and `templates/config.json.example`.
  2. Description priority:
     - Priority 1: `_comment_<prop>` from active `config.json` or `config.json.example`.
     - Priority 2: `description` field from `config.schema.json`.
     - Priority 3: Built-in contextual fallback dictionary.
  3. When saving `config.json`, all existing `_comment` and `_comment_*` keys are preserved in their respective objects. If new options are toggled on, their corresponding `_comment_<prop>` from `config.json.example` can be automatically retained.

### Decision 4: Control Taxonomy Mapping

| Schema / JSON Type | Config Example | WinForms Control | UX Details |
|---|---|---|---|
| **Boolean** | `enableDag`, `verboseMode`, `scoreAndRefine`, `useWorktrees` | `System.Windows.Forms.CheckBox` | Clear label, auto-syncs boolean, tooltip or sub-caption with description. |
| **Enum (<= 4 values)** | `gateGranularity` (`step`\|`phase`), `specMemo.mode`, `providers.scm` | `System.Windows.Forms.RadioButton` group or `ComboBox` | Instant single-click selection with distinct visual labels. |
| **Enum (> 4 values)** | `hostAdapter.mode`, `modelsPreset` | `System.Windows.Forms.ComboBox` (`DropDownList`) | Clean dropdown menu with curated option list. |
| **String (Single-line)** | `project.name`, `project.baseBranch`, `preview.dryRunCommand` | `System.Windows.Forms.TextBox` | Segoe UI text input, placeholder cue via `TextBoxCue`. |
| **Folder Path** | `plans.dir`, `plans.specsDir`, `reviews.dir` | `System.Windows.Forms.TextBox` + `Button` ("Browse...") | FolderBrowserDialog with default path set to current value. |
| **File Path** | `rules.harness`, `rules.seniorDeveloper`, `rules.stackFile` | `System.Windows.Forms.TextBox` + `Button` ("Browse...") | OpenFileDialog filtering for `*.md`, `*.json`, `*.*`. |
| **Bounded Integer** | `minVerifyScore` (1-10), `reviewJury.size` (1-3), `mutationThreshold` (0-100) | `System.Windows.Forms.NumericUpDown` or Slider | Up/down spinner enforcing `minimum` and `maximum` constraints. |
| **String Array** | `verification.testGlobs`, `tracking.canonicalFiles` | Multiline `TextBox` or Editable ListBox | One entry per line or add/remove buttons. |
| **Nested Sub-Objects** | `deliveryCommitArtifacts` (6 booleans) | GroupBox with multiple CheckBoxes | Grouped clearly in a bordered container. |

---

## 3. Deferred Ideas & Future Extensions

- **Linux / macOS Cross-Platform Web GUI:** A lightweight local webview or web-based UI (`npx workflow-skills config-web`) for non-Windows developers. Windows Forms covers the immediate high-demand Windows / Cursor IDE audience.
- **Direct Schema Hot-Reload:** Automatic schema download from remote URL if local schema file is corrupted or missing.
- **Model Preset Selector Integration:** Live query of available local/host models from Cursor / OpenCode / Ollama to populate model dropdowns dynamically.
