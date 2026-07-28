# Implementation Plan — US 156: ws-check-harness: false broken-link reports for bare relative targets (e.g. docs/faq.md)

## Summary
Add explicit Phase 2 resolution guidance and check-table rules in `.agents/skills/ws-check-harness/PHASES.md` to prevent scanners and auditors from reporting false positive broken-link findings when relative link targets (e.g., `docs/faq.md`) appear inside nested skill folders.

## User Review Required
No breaking changes. Documentation / harness rules clarification only.

## Open Questions
None.

## Proposed Changes

### Harness Audit Rules (`ws-check-harness`)

#### [MODIFY] [PHASES.md](file:///l:/source/workflow-skills/.agents/skills/ws-check-harness/PHASES.md)
- Update Phase 2 check table to add an explicit check row for `Bare relative link resolution`.
- Ensure guidance clearly states that bare relative link targets (such as `docs/faq.md`) resolve relative to the directory of the containing file, not the repository root.

## Verification Plan

### Automated Tests
- Run `node bin/build-site.js` to ensure documentation site rebuilds cleanly.
- Run `npm run tests -- --local` to verify installation and harness tests pass.

### Manual Verification
- Review updated `PHASES.md` for clarity and consistency with existing harness phase documentation.
