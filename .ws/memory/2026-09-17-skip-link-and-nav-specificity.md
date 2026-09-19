### [2026-09-17] Skip link viewport anchoring and themed nav reset specificity

- **Layer**: `application`
- **Module**: `docs styling / a11y & theme resets`
- **Severity**: `Medium`
- **PathPattern**: `docs/assets/css/style.css`
- **Scenario / Context**: During the docs layout revamp (PR #341), the skip link was positioned with `position: absolute` inside a `relative` body, causing it to scroll away off-screen when focused while scrolled down. In the same change, the reset `.sidebar-nav, .toc-nav { background: none; }` had specificity (0,1,0), which lost to `[data-theme="light"] nav` (0,1,1) in light theme, painting an unwanted background on sub-navs.
- **DO NOT**: Use `position: absolute` for skip links whose visibility must remain fixed to the viewport on focus (WCAG 2.4.7/2.4.11), or use low-specificity class-only resets (`.sub-nav`) for elements whose parent type selector has higher-specificity theme variants (`[data-theme="..."] nav`).
- **INSTEAD DO**: Anchor skip links with `position: fixed` so `:focus` moves them into the visible viewport regardless of page scroll. Qualify semantic element resets with the tag name (e.g. `nav.sidebar-nav, nav.toc-nav`) to tie or exceed the specificity of theme-scoped tag selectors (`[data-theme] nav`).
