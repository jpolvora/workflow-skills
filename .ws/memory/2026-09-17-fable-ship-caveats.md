### [2026-09-17] Fable caveats on docs-only ship tree (0091 website revamp)

- **Layer**: `devops`
- **Module**: `ship audit / ws-fable-judge`
- **Severity**: `High`
- **PathPattern**: `docs/**;.agents/skills/ws-shared/CHANGELOG.md`
- **Scenario / Context**: `VERIFIED WITH CAVEATS` audit of a static-site-only
  change (new sidebar/TOC/drawer markup plus stylesheet block; content,
  anchors, and metadata byte-identical to base). No test files touched, full
  suite green on the final tree, leak scan clean.
- **DO NOT**: Ship a tree containing another session's uncommitted hunks
  without naming them in the report and PR body, or present a headless
  structural check as a rendered visual/keyboard pass.
- **INSTEAD DO**: Ground every claim in `git diff` plus re-run exit codes;
  label the browser viewport/keyboard pass UNVERIFIABLE from a headless shell
  and keep it as a reviewer checklist item; disclose foreign hunks (here: a
  prior ship's uncommitted `CHANGELOG.md` entry) explicitly so the merge
  reviewer can confirm they belong.
