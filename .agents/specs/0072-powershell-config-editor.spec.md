---
id: null
slug: powershell-config-editor
title: "PowerShell Windows Forms Config Editor for Workflow Skills"
source: local
specDate: 2026-09-09
---

# Specification — PowerShell Windows Forms Config Editor for Workflow Skills

## Description

In `workflow-skills`, project configuration resides in `{sharedDir}/config.json` ([`config-resolution.md`](file:///l:/source/workflow-skills/.agents/skills/ws-shared/runtime/config-resolution.md)). The configuration file dictates orchestrator FSM execution behavior, provider integrations (GitHub, Azure DevOps, Local), verification commands, test globs, model routing presets, guardrail rules, DAG task limits, and optional extensions (`specializedSubagents`, `specMemo`, `fable`).

Currently, developers must configure these settings through:
1. **Direct JSON text manipulation:** Error-prone, steep learning curve, easily produces invalid types (e.g. numbers as strings), breaks formatting, or accidentally discards inline `_comment_*` documentation.
2. **Terminal Interactive Wizard (`ws-configure-project` / `auto_configure.cjs`):** Useful during initial repository onboarding, but cumbersome when a developer merely wants to toggle a single flag (e.g. `defaults.verboseMode`, `defaults.enableDag`, `plans.enforceSpecPrefixOrdering`, `defaults.modelsPreset`), inspect descriptions, or change a model name.

For developers operating in Windows environments (e.g. using Cursor IDE, VS Code, or Windows Terminal), this specification introduces a native, self-contained **PowerShell Windows Forms GUI tool** located inside `ws-shared` (`runtime/scripts/Edit-WorkflowSkillsConfig.ps1`). The tool leverages .NET `System.Windows.Forms` and `System.Drawing` to present an interactive, categorized, high-DPI desktop editor with rich controls, full Dark/Light theme support, automatic schema and comment inspection, real-time input validation, and atomic persistence.

### Reference Architecture & GUI Design Patterns

The GUI implementation is modeled directly after the proven architectural and styling patterns in [`L:\source\cursor-profile-manager\cursor-profile-manager.ps1`](file:///L:/source/cursor-profile-manager/cursor-profile-manager.ps1):
- **Windows Forms Foundation:** Native `System.Windows.Forms` and `System.Drawing` assemblies without external package dependencies, compatible with Windows PowerShell 5.1 and modern PowerShell Core 7+.
- **DPI & Rendering:** Explicit `Application.EnableVisualStyles()` and `Application.SetCompatibleTextRenderingDefault($false)` with standard `Segoe UI` typography.
- **Dynamic Theming:** High-contrast Dark and Light theme color palettes (`BackColor`, `PanelColor`, `BorderColor`, `TextPrimary`, `TextMuted`, `Accent`, `AccentHover`, `InputBackColor`, `InputForeColor`), with automatic detection of the user's Windows system preference (`HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\AppsUseLightTheme`) and manual theme toggle.
- **Button Styling:** Custom `Set-ButtonFlatStyle` routine providing flat, bordered buttons with smooth mouse hover transitions, separating primary action buttons (accent background, white text) from secondary buttons.
- **Cue Banners:** Win32 `EM_SETCUEBANNER` integration (`TextBoxCue::SetCue`) providing elegant placeholder hints inside input boxes.

### Schema & Comment Inspection Architecture

To provide rich context without duplicating documentation:
1. **Schema Introspection:** The script parses `runtime/config.schema.json` to extract property types, default values, minimum/maximum bounds, and canonical descriptions.
2. **Comment Key Introspection:** In `workflow-skills`, documentation is embedded in `config.json` and `templates/config.json.example` as `_comment` (section summaries) and `_comment_<propName>` (option-specific documentation). The script inspects these keys to extract rich contextual explanations for options where schema descriptions are terse or absent.
3. **Control Taxonomy Mapping:**
   - **Boolean fields:** Rendered as `CheckBox` controls with an associated bold label and multi-line descriptive text.
   - **Enum / Finite choices:** Rendered as `ComboBox` (`DropDownList`) or `RadioButton` groups (e.g. `providers.active`, `providers.scm`, `defaults.gateGranularity`, `specMemo.mode`).
   - **Strings & Commands:** Rendered as styled `TextBox` controls with cue banners and optional validation patterns.
   - **Files & Directories:** Rendered with dedicated "Browse..." buttons invoking native `FolderBrowserDialog` or `OpenFileDialog`.
   - **Bounded Integers:** Rendered using `NumericUpDown` controls bounded by schema limits (e.g. `minVerifyScore` 1–10, `reviewJury.size` 1–3, `mutationThreshold` 0–100, `contextBudget` >= 18000).
   - **String Arrays:** Rendered as manageable list/multiline editors (e.g. `verification.testGlobs`, `tracking.canonicalFiles`).

### Persistence & Safety

When saving:
- Changes are applied atomically to `{sharedDir}/config.json`.
- A backup copy (`config.json.bak`) is created before writing.
- All existing `_comment` and `_comment_*` keys are preserved.
- Output is encoded in clean UTF-8 with standard 2-space indentation.
- An "Apply" button saves without closing; "Save" persists and closes; "Cancel" checks for unsaved dirty changes before exit.

---

## Acceptance Criteria

- AC1: The GUI tool is implemented as a self-contained PowerShell script located at `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1`, classified as managed runtime in `hub-layout.json`, and compatible with both Windows PowerShell 5.1 and modern PowerShell Core 7+.
- AC2: The script initializes Windows Forms using `Application.EnableVisualStyles()`, `Application.SetCompatibleTextRenderingDefault($false)`, and uses `Segoe UI` fonts with high-DPI scaling awareness.
- AC3: The tool provides Dark and Light theme palettes modeled after `cursor-profile-manager.ps1`, automatically detects the active Windows app theme via registry (`AppsUseLightTheme`), and includes an on-screen theme toggle dropdown/button.
- AC4: The script loads both `runtime/config.schema.json` and `templates/config.json.example` alongside the active `{sharedDir}/config.json`, resolving extended descriptions with precedence: `_comment_<prop>` → `schema.description` → built-in fallback dictionary.
- AC5: Boolean configuration options (including `enableDag`, `verboseMode`, `scoreAndRefine`, `skipTesting`, `skipMutationTesting`, `autoload`, `autoloadTaskLifecycle`, `useWorktrees`, `enforceSpecPrefixOrdering`, `specializedSubagents.enabled`, `featuresMdEnabled`, and `skipQualityGates`) are rendered as `CheckBox` controls with descriptive title labels and subtitle explanation text.
- AC6: Enumerated choice properties (including `providers.active` [`github`, `azure-devops`, `local`], `providers.scm` [`github`, `azure-devops`], `defaults.gateGranularity` [`step`, `phase`], `specMemo.mode` [`vault`, `hybrid`, `local`, `disabled`], `defaults.hostAdapter.mode`, and `fable.auditVerdictsBlockShip` [`refuted`, `caveats`, `false`]) are rendered as `ComboBox` (`DropDownList`) or `RadioButton` groups according to choice cardinality.
- AC7: Single-line string options and shell commands (including `project.name`, `project.baseBranch`, `project.workingBranch`, `project.repoUrl`, `verification.backendBuild`, `verification.backendTest`, `verification.frontendBuild`, `verification.frontendTest`, `preview.dryRunCommand`, and `preview.localReviewCommand`) are rendered as `TextBox` inputs with placeholder cues via `TextBoxCue::SetCue`.
- AC8: Path-based options (including `plans.dir`, `plans.specsDir`, `reviews.dir`, `rules.harness`, `rules.seniorDeveloper`, `rules.karpathyGuidelines`, and `rules.stackFile`) include an adjacent "Browse..." button triggering native `FolderBrowserDialog` or `OpenFileDialog`.
- AC9: Bounded integer options (including `defaults.minVerifyScore` [1..10], `defaults.reviewJury.size` [1..3], `verification.mutationThreshold` [0..100], `defaults.contextBudget` [min 18000], and `dagThresholds.*`) are rendered as `NumericUpDown` controls enforcing schema minimum and maximum values.
- AC10: Array options (including `verification.testGlobs` and `tracking.canonicalFiles`) are presented with an editable list or multiline textbox allowing addition, removal, and editing of items.
- AC11: Settings are organized into clear, navigable tabs or grouped scroll panels: `Project & Providers`, `Verification & Test`, `Execution & Defaults`, `Subagents & Models`, `Plans & Reviews`, `Rules & Invariants`, and `Integrations (Spec-Memo & Fable)`.
- AC12: The interface provides an instant search/filter text box at the top that filters settings across tabs and controls based on matched keywords in setting names, keys, or extended description text.
- AC13: The tool tracks in-memory modifications ("dirty state"), appending an asterisk (`*`) to the window title and enabling an "Apply" button when unsaved changes exist.
- AC14: The dialog includes a footer with "Save" (persist and exit), "Apply" (persist without exit), "Cancel" (exit without saving, with prompt if dirty), and "Reload / Reset" (re-read from disk).
- AC15: Persistence writes valid JSON with 2-space indentation and UTF-8 encoding, creating a backup copy (`config.json.bak`) before saving, and preserving all existing `_comment` and `_comment_*` keys.
- AC16: If executed on non-Windows platforms or in a headless terminal without a desktop display session, the script exits cleanly with an actionable warning directing the user to `auto_configure.cjs` or terminal CLI configuration.
- AC17: A root convenience launcher `.agents/skills/ws-shared/Edit-Config.bat` (and CLI alias `node bin/cli.js config-gui`) is provided to launch the script with execution policy bypass (`powershell -ExecutionPolicy Bypass -File ...`).
- AC18: An automated test script (`test/test-powershell-config-editor.js` or PowerShell test) verifies that the script parses validly, initializes data bindings correctly, and serializes JSON with comment preservation.

---

## Original Issue Context

User prompt requesting a detailed specification / brainstorming for a PowerShell Windows Forms script inside `ws-shared` to configure `config.json` options, displaying controls suited to option types (checkboxes, descriptions, dropdowns, radio buttons), inspecting schema options for `_comment_*`, referencing `L:\source\cursor-profile-manager` for the `.ps1` Windows Forms pattern, and including Save/Apply/Cancel persistence.

---

## Notes

### Prior Work Sweep

- [`L:\source\cursor-profile-manager\cursor-profile-manager.ps1`](file:///L:/source/cursor-profile-manager/cursor-profile-manager.ps1): Established reference implementation for PowerShell WinForms application featuring DPI scaling, light/dark themes, flat styled buttons, cue banners, folder browsers, and process handling.
- [`runtime/config.schema.json`](file:///l:/source/workflow-skills/.agents/skills/ws-shared/runtime/config.schema.json): Canonical JSON schema defining properties, types, defaults, and constraints.
- [`templates/config.json.example`](file:///l:/source/workflow-skills/.agents/skills/ws-shared/templates/config.json.example): Canonical reference file containing `_comment` and `_comment_<prop>` annotations.
- [`ws-configure-project/scripts/auto_configure.cjs`](file:///l:/source/workflow-skills/.agents/skills/ws-configure-project/scripts/auto_configure.cjs): Interactive CLI terminal configuration engine. The PowerShell GUI provides a visual complement on Windows desktop environments.
- [`runtime/hub-layout.json`](file:///l:/source/workflow-skills/.agents/skills/ws-shared/runtime/hub-layout.json): Classifies files under `runtime/scripts/` as `managed` (maintained upstream and copied on install/update).

### Design Intent

This is a greenfield desktop utility script for Windows users of `workflow-skills`. It does not replace the CLI configuration wizard (`auto_configure.cjs`), but provides a rich, visual, zero-dependency alternative for exploring and managing the extensive configuration options available across the pipeline.

### UI Structure & Layout Mockup

```
+-------------------------------------------------------------------------+
| [O] Workflow Skills Config Editor - .agents/skills/ws-shared/config.json|
+-------------------------------------------------------------------------+
| Filter settings: [ Search options, keys, or descriptions...        [x] ]|
| Theme: [ System Default (Dark) v ]   Target: [.agents/skills/ws-shared] |
+-------------------------------------------------------------------------+
| [ Project & Providers | Verification | Defaults & DAG | Models | Rules ]|
+-------------------------------------------------------------------------+
|                                                                         |
|  [X] Enable DAG (defaults.enableDag)                                    |
|      Break execution plans into multiple parallel tasks executed       |
|      concurrently by subagents. When false (default), execute serially. |
|                                                                         |
|  [X] Verbose Mode (defaults.verboseMode)                                |
|      Prints a reasoned start-of-step preview before invoking tools.    |
|                                                                         |
|  Gate Granularity (defaults.gateGranularity):                           |
|      (o) Step (prompt at every step)  ( ) Phase (milestone gates only)  |
|                                                                         |
|  Minimum Verify Score (defaults.minVerifyScore):                        |
|      [ 9 ] (Range: 1 - 10, default: 9)                                  |
|      Minimum ledger score required to advance Step 5 check.            |
|                                                                         |
|  Active Spec Provider (providers.active):                               |
|      [ local               v ] (Options: github, azure-devops, local)   |
|                                                                         |
|  Plans Directory (plans.dir):                                           |
|      [ .agents/plans                       ] [ Browse... ]              |
|                                                                         |
+-------------------------------------------------------------------------+
| Status: Ready. 52 options loaded from config.json and schema.           |
| [ Reset Defaults ]                       [ Apply ]  [ Save ]  [ Cancel ]|
+-------------------------------------------------------------------------+
```

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native Linux / macOS GTK/Cocoa GUI | Windows Forms runs exclusively on Windows (and Wine). Cross-platform users use `ws-configure-project` CLI or manual JSON editing. |
| Direct remote Git push or PR creation from the GUI | The editor is strictly scoped to local `config.json` configuration and schema inspection. |
| Rewriting `config.json` into YAML or TOML | `config.json` is the established, mandatory format across all workflow-skills tooling and orchestrators. |
| Modifying upstream `.agents/skills/ws-*` skill instructions | The tool manages consumer repository settings, not upstream skill bodies. |

---

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Script location | `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` | Managed runtime file distributed automatically by the installer and classified under `hub-layout.json`. | y |
| Theming approach | Light and Dark palettes matching `cursor-profile-manager.ps1` | Delivers consistent, polished styling and eliminates eye strain in dark-themed IDEs like Cursor. | y |
| Schema & comment extraction | Inspect `runtime/config.schema.json` + `templates/config.json.example` + active `config.json` | Ensures options that lack schema `description` but have `_comment_<prop>` retain rich documentation in the UI. | y |
| Backup behavior | Write `config.json.bak` on save | Prevents data loss in case of unexpected termination during file write. | y |
| Non-Windows execution | N/A because non-Windows environments use `ws-configure-project` CLI | Only Windows desktop sessions initialize the WinForms GUI. | y |

---

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Implementation confined to new script `runtime/scripts/Edit-WorkflowSkillsConfig.ps1`, launcher helper, and test fixture. | Review git diff ensuring core orchestrator FSM and existing scripts are untouched. |
| Neutrality & Portability | The script relies strictly on built-in .NET Windows Forms and PowerShell 5.1+, with no host IDE coupling. | Code review confirming absence of host-private dependencies. |
| Comment Preservation | Saving via the GUI preserves all existing `_comment` and `_comment_*` keys. | Automated test comparing input and output JSON keys and comment structures. |
| High-DPI & Aesthetics | Form displays correctly at 100%, 125%, and 150% scaling without clipped text or overlapping controls. | Manual UI smoke test on Windows desktop. |
| Authoring Validation | Specification complies with canonical schema and passes authoring validation. | Run `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring`. |

---

## Validation & Observation Notes

### Telemetry & Observable Signals

- Script console startup logs:
  - `[ConfigEditor] Loaded config from: .agents/skills/ws-shared/config.json`
  - `[ConfigEditor] Schema inspection: 48 properties indexed from config.schema.json`
  - `[ConfigEditor] Comment inspection: 26 _comment_* entries extracted`
  - `[ConfigEditor] Theme applied: Dark (system detected)`
- Persistence logs:
  - `[ConfigEditor] Backup written: .agents/skills/ws-shared/config.json.bak`
  - `[ConfigEditor] Saved config: 348 lines, 0 schema errors`
- Automated test command:
  - `node test/test-powershell-config-editor.js`

### Negative & Failing Test Scenarios

- **Scenario 1 (Headless / Non-Windows execution):** Running the script in a headless terminal or non-Windows OS must not throw an unhandled WinForms crash; it must detect lack of GUI support, print an actionable warning suggesting `ws-configure-project`, and exit with code 0 or 1 without corrupting `config.json`.
- **Scenario 2 (Invalid JSON syntax in target config):** If `config.json` contains malformed JSON syntax prior to launch, the tool must display an informative error dialog showing the parse exception and line number, offering to open the `.bak` file or load `config.json.example` as a template, rather than crashing silently.
- **Scenario 3 (Preservation of unmodeled / custom JSON fields):** If a user has custom properties or extensions in `config.json` not explicitly represented by a dedicated UI control, saving from the GUI must not prune or drop those keys; they must be retained in the serialized output.
- **Scenario 4 (Preservation of all `_comment` and `_comment_*` tags):** When modifying a boolean setting (e.g. toggling `enableDag` from `false` to `true`) and clicking Save, all `_comment_enableDag` and section `_comment` entries must remain intact in the resulting file with exact wording.
- **Scenario 5 (Unsaved changes cancellation guard):** If the user modifies any setting and clicks "Cancel" or the window close button (`[X]`), a modal confirmation dialog ("You have unsaved changes. Discard changes?") must appear, preventing accidental loss of edits.
