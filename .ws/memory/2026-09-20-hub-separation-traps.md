### [2026-09-20] CRLF file edits via single-line anchors

- **Layer:** Tests
- **Module:** ws-check-harness
- **Severity:** Medium
- **PathPattern:** `.agents/skills/ws-*/**`, `test/*.js`
- **Scenario / Context:** Tracked working-tree Markdown/JS files use CRLF. The file edit tool matches exact bytes, so any multi-line find with LF fails against CRLF files while single-line finds succeed.
- **DO NOT:** Retry multi-line replacements verbatim or rewrite whole files from shell one-liners when an edit fails to match.
- **INSTEAD DO:** Use unique single-line anchors (multi-line payloads allowed in replace); for 100+ line block moves use a CRLF-preserving Node splice script kept under /tmp (never committed) and verify with git diff.
### [2026-09-20] Hub pointers must be install-layout agnostic

- **Layer:** Application
- **Module:** ws-shared
- **Severity:** High
- **PathPattern:** `.agents/skills/ws-shared/runtime/*.md`
- **Scenario / Context:** Managed hub templates ship to `{sharedDir}/runtime/` in consumers. A relative link valid from the SoT path (e.g. `../../../../CATALOG.md`) resolves outside the repo after install, and check_harness_links only validates the SoT side, so CI stays green while installed hubs ship broken links.
- **DO NOT:** Add Markdown links in managed hub templates whose depth only resolves from the SoT tree; do not trust a green links gate for installed-layout validity.
- **INSTEAD DO:** Keep cross-layout pointers as prose-only (name the upstream file plus an authoring-only note); assert installed-path citations (e.g. `{sharedDir}/runtime/AGENTS.md`) in test-hub-separation.js.
