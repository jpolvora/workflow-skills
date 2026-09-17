### [2026-09-17] Off-canvas drawer needs visibility + focus + scroll management

- **Layer**: `application`
- **Module**: `docs site drawer / accessibility`
- **Severity**: `High`
- **PathPattern**: `docs/index.html;docs/assets/css/style.css`
- **Scenario / Context**: The first version of the mobile docs-nav drawer hid
  the closed sidebar with `transform` only and left focus/scroll unmanaged, so
  invisible links stayed in the tab order and background content stayed
  interactive. A PR reviewer flagged it as a WARNING before merge.
- **DO NOT**: Ship an off-canvas panel that relies on `transform` alone, moves
  no focus on open, restores no focus on close, or leaves body scroll unlocked.
- **INSTEAD DO**: Pair the off-canvas transform with `visibility` (hidden until
  open, so links leave the tab order and accessibility tree), move focus to the
  first panel link on open, restore the opener on close, lock
  `document.body.style.overflow` while open, and give each `nav` exactly one
  accessible name (no duplicate `aria-label` on wrapping `aside`).
