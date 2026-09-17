### [2026-09-17] Subdued text tokens and dark theme WCAG contrast

- **Layer**: `application`
- **Module**: `docs styling / accessibility`
- **Severity**: `Medium`
- **PathPattern**: `docs/assets/css/style.css`
- **Scenario / Context**: When styling small auxiliary labels and headings (e.g. `.sidebar-group-heading`, `.toc-heading` at 0.72rem), using `--text-dim` (#64748b) passed contrast on light theme (4.76:1) but failed WCAG AA minimum 4.5:1 on dark theme against `--bg-card` (3.76:1) and `--bg-body` (4.08:1).
- **DO NOT**: Use `--text-dim` for small (<18.66px bold / <24px regular) readable text or navigational labels on dark theme surfaces without verifying the contrast ratio against dark backgrounds.
- **INSTEAD DO**: Use `--text-muted` (#94a3b8, ~7:1 contrast on both `--bg-card` and `--bg-body`) for subdued or auxiliary navigation headings so they maintain hierarchical subtlety while strictly satisfying WCAG AA 4.5:1 across all themes.
