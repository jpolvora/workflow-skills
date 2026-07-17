## Code Review

**Branch:** `develop`
**Stack:** Node 22 CLI + docs/tests (STACK.md / config stack: workflow-skills installer)
**Base:** `main` (+ uncommitted US 56 working tree)
**Files (US 56 primary):** 7
**Model:** cursor-grok-4.5
**Workflow:** spec-to-pr-lite · workflowMode: true

### Scope checked
- `--yes` / non-TTY behavior (`parseInstallArgs`, `confirmOverwriteExisting`, `runInstall`, interactive one-shot)
- `config.json` preservation (`copyDirPreservingConfig`, hub whitelist)
- Docs no longer recommend `github:…@latest` / `@main`
- `update --include-new` still documented + Phase 2 coverage
- Security: no silent mass overwrite on bare non-TTY `install` without `--yes`
- MEMORY pattern sweep: no `## Review Patterns` section in skill MEMORY.md (N/A)
- Invariants: plan files uncommitted; no EF/tenancy/i18n surface

### Critical
_(none)_

### Warning
_(none)_

### Suggestion (Info)
- **`bin/cli.js:702-704`**: SUGGESTION — Default interactive still starts when argv is not `install`/`update` (e.g. bare `--yes`). Non-TTY agents that omit `install … --yes` can still enter the menu loop; overwrite path now hard-fails, but EOF mid-menu can stall. (Score: 5/10)
  Analysis:
  1. Evidence: `main()` else → `runInteractive`; smoke `node bin/cli.js --yes` from `test/` opened the menu. `confirmOverwriteExisting` exits only after selection + existing dests.
  2. Failure: `printf '' | npx github:jpolvora/workflow-skills` (or mistaken top-level `--yes`) → menu questions on closed stdin.
  3. Missing protection: no early `!stdin.isTTY` bail on default interactive; only `install` parse + overwrite confirm.
  4. Discards: not a regression of the reported `f`+`y`+per-skill overwrite hang (that path now errors with install `--yes` guidance). Preferred CI path is covered.
  Sibling: none required.
  Suggestion: optional early exit in `runInteractive` when `!process.stdin.isTTY` pointing to `install --full|--package|--skills --yes`.

- **`test/test-install.js` Phase 8**: SUGGESTION — `--full --yes` success path not asserted (only `--package workflows --yes`, `--skills … --yes`, and `--full` without `--yes` negative). (Score: 4/10)
  Analysis: plan AC3 table listed `--full --yes`; coverage is partial but equivalent package path exercises overwrite + config preserve.

- **Docs consistency**: SUGGESTION — A few shipped strings still show `npx github:jpolvora/workflow-skills` without `npx --yes` (README contrib blurb ~L79/L84, `docs/index.html` badge/packages prose, `runUpdate` hints L717/L730). Not `@latest`; low risk. (Score: 3/10)

### Nit
- **`bin/cli.js:585`**: overwrite prompt embeds the name preview inside the `(y/n):` line; readable but slightly awkward vs list-below prompt.
- Top-level unknown flags (including `--yes`) silently mean “interactive” rather than “unknown argument”.

---
**Apply fixes?** Orch gate — this review did **not** apply fixes.
**Verdict:** No Critical / Warning. Safe to proceed; Info/Nit optional.
